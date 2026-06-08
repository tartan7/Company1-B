// VBA Parser — produces AST from token stream

import { Lexer } from './lexer';
import type {
  VBAType, ModuleNode, FunctionNode, ParameterNode, DeclarationNode,
  StatementNode, ExpressionNode,
  DimDeclarationNode, ConstDeclarationNode, AssignmentNode, CallStatementNode,
  IfStatementNode, ElseIfClauseNode, ForStatementNode, ForEachStatementNode,
  WhileStatementNode, DoStatementNode, SelectStatementNode, CaseClauseNode,
  ExitStatementNode, WithStatementNode, OnErrorStatementNode, ReturnStatementNode,
  BinaryExpressionNode, UnaryExpressionNode, CallExpressionNode,
  MemberExpressionNode, IndexExpressionNode, LiteralNode, IdentifierNode,
} from './ast';

export class Parser {
  private lex: Lexer;

  constructor(source: string) {
    this.lex = new Lexer(source);
  }

  parse(): ModuleNode {
    const declarations: DeclarationNode[] = [];
    this.lex.skipNewlines();

    // Skip Option statements
    while (this.lex.isKeyword('Option')) {
      while (!this.lex.is('Newline') && !this.lex.is('EOF')) this.lex.advance1();
      this.lex.skipNewlines();
    }

    while (!this.lex.is('EOF')) {
      this.lex.skipNewlines();
      if (this.lex.is('EOF')) break;
      const decl = this.parseDeclaration();
      if (decl) declarations.push(decl);
      this.lex.skipNewlines();
    }

    return { kind: 'Module', name: '', declarations };
  }

  private parseDeclaration(): DeclarationNode | null {
    let isPublic = true;
    let isStatic = false;

    if (this.lex.isKeyword('Private')) { isPublic = false; this.lex.advance1(); }
    else if (this.lex.isKeyword('Public')) { isPublic = true; this.lex.advance1(); }
    else if (this.lex.isKeyword('Friend')) { isPublic = true; this.lex.advance1(); }

    if (this.lex.isKeyword('Static')) { isStatic = true; this.lex.advance1(); }

    if (this.lex.isKeyword('Function')) return this.parseFunctionOrSub('Function', isPublic, isStatic);
    if (this.lex.isKeyword('Sub')) return this.parseFunctionOrSub('Sub', isPublic, isStatic);
    if (this.lex.isKeyword('Property')) return this.parseProperty(isPublic, isStatic);
    if (this.lex.isKeyword('Dim') || this.lex.isKeyword('Const') || this.lex.isKeyword('ReDim')) {
      return this.parseDimOrConst();
    }

    // Skip unknown declaration-level lines
    while (!this.lex.is('Newline') && !this.lex.is('EOF')) this.lex.advance1();
    return null;
  }

  private parseFunctionOrSub(kind: 'Function' | 'Sub', isPublic: boolean, isStatic: boolean): FunctionNode {
    this.lex.advance1(); // consume Function/Sub keyword
    const name = this.lex.advance1().value;
    const params = this.parseParamList();
    let returnType: VBAType | undefined;
    if (this.lex.isKeyword('As')) {
      this.lex.advance1();
      returnType = this.parseType();
    }
    this.lex.expectNewlineOrColon();
    const body = this.parseBody(kind === 'Function' ? 'Function' : 'Sub');
    return { kind, name, params, returnType, body, isPublic, isStatic };
  }

  private parseProperty(isPublic: boolean, isStatic: boolean): FunctionNode {
    this.lex.advance1(); // consume Property
    const accessKind = this.lex.advance1().value; // Get/Let/Set
    const name = this.lex.advance1().value;
    const params = this.parseParamList();
    let returnType: VBAType | undefined;
    if (this.lex.isKeyword('As')) { this.lex.advance1(); returnType = this.parseType(); }
    this.lex.expectNewlineOrColon();
    const body = this.parseBody('Property');
    return { kind: 'Property', name: `${name}_${accessKind}`, params, returnType, body, isPublic, isStatic };
  }

  private parseParamList(): ParameterNode[] {
    const params: ParameterNode[] = [];
    if (!this.lex.is('LParen')) return params;
    this.lex.advance1();
    while (!this.lex.is('RParen') && !this.lex.is('EOF')) {
      params.push(this.parseParam());
      if (this.lex.is('Comma')) this.lex.advance1();
    }
    if (this.lex.is('RParen')) this.lex.advance1();
    return params;
  }

  private parseParam(): ParameterNode {
    let byRef = true;
    let optional = false;
    let paramArray = false;

    if (this.lex.isKeyword('Optional')) { optional = true; this.lex.advance1(); }
    if (this.lex.isKeyword('ByVal')) { byRef = false; this.lex.advance1(); }
    else if (this.lex.isKeyword('ByRef')) { byRef = true; this.lex.advance1(); }
    if (this.lex.isKeyword('ParamArray')) { paramArray = true; this.lex.advance1(); }

    const name = this.lex.advance1().value;
    let type: VBAType | undefined;
    if (this.lex.isKeyword('As')) { this.lex.advance1(); type = this.parseType(); }
    let defaultValue: ExpressionNode | undefined;
    if (this.lex.is('Operator', '=')) { this.lex.advance1(); defaultValue = this.parseExpression(); }

    return { name, type, byRef, optional, paramArray, defaultValue };
  }

  private parseType(): VBAType {
    const name = this.lex.advance1().value;
    if (this.lex.is('LParen')) {
      // Array type
      this.lex.advance1();
      let dimensions = 1;
      while (this.lex.is('Comma')) { dimensions++; this.lex.advance1(); }
      if (this.lex.is('RParen')) this.lex.advance1();
      const elementType = this.parseSimpleType(name);
      return { kind: 'Array', elementType, dimensions };
    }
    return this.parseSimpleType(name);
  }

  private parseSimpleType(name: string): VBAType {
    const normalized: Record<string, VBAType> = {
      Integer: 'Integer', Long: 'Long', Single: 'Single', Double: 'Double',
      String: 'String', Boolean: 'Boolean', Date: 'Date', Variant: 'Variant',
      Object: 'Object', Currency: 'Currency', Byte: 'Byte', LongLong: 'LongLong',
    };
    return normalized[name] ?? { kind: 'UserDefined', name };
  }

  private parseDimOrConst(): DimDeclarationNode | ConstDeclarationNode {
    const isConst = this.lex.isKeyword('Const');
    this.lex.advance1(); // consume Dim/Const/ReDim
    const isStatic = false;
    const name = this.lex.advance1().value;
    // Array bounds — skip for now
    if (this.lex.is('LParen')) {
      let depth = 1; this.lex.advance1();
      while (depth > 0 && !this.lex.is('EOF')) {
        if (this.lex.is('LParen')) depth++;
        if (this.lex.is('RParen')) depth--;
        this.lex.advance1();
      }
    }
    let type: VBAType | undefined;
    if (this.lex.isKeyword('As')) { this.lex.advance1(); type = this.parseType(); }
    let initializer: ExpressionNode | undefined;
    if (this.lex.is('Operator', '=')) { this.lex.advance1(); initializer = this.parseExpression(); }

    if (isConst) {
      return { kind: 'ConstDeclaration', name, type, value: initializer!, isStatic };
    }
    return { kind: 'DimDeclaration', name, type, initializer, isStatic };
  }

  private parseBody(endKind: 'Function' | 'Sub' | 'Property'): StatementNode[] {
    const stmts: StatementNode[] = [];
    while (!this.lex.is('EOF')) {
      this.lex.skipNewlines();
      if (this.lex.isKeyword('End')) {
        const next = this.lex.peek1();
        if (next.value === endKind || next.value === 'Function' || next.value === 'Sub' || next.value === 'Property') {
          this.lex.advance1(); this.lex.advance1(); // consume End Function/Sub/Property
          break;
        }
      }
      const stmt = this.parseStatement();
      if (stmt) stmts.push(stmt);
    }
    return stmts;
  }

  private parseStatement(): StatementNode | null {
    const t = this.lex.current();

    if (t.kind === 'Newline' || t.kind === 'Comment') { this.lex.advance1(); return null; }
    if (t.kind === 'EOF') return null;

    if (this.lex.isKeyword('If')) return this.parseIf();
    if (this.lex.isKeyword('For')) return this.parseFor();
    if (this.lex.isKeyword('While')) return this.parseWhile();
    if (this.lex.isKeyword('Do')) return this.parseDo();
    if (this.lex.isKeyword('Select')) return this.parseSelect();
    if (this.lex.isKeyword('With')) return this.parseWith();
    if (this.lex.isKeyword('Dim') || this.lex.isKeyword('Static') || this.lex.isKeyword('ReDim')) {
      const d = this.parseDimOrConst();
      this.lex.expectNewlineOrColon();
      return d;
    }
    if (this.lex.isKeyword('Const')) {
      const d = this.parseDimOrConst();
      this.lex.expectNewlineOrColon();
      return d;
    }
    if (this.lex.isKeyword('Exit')) return this.parseExit();
    if (this.lex.isKeyword('On')) return this.parseOnError();
    if (this.lex.isKeyword('Return')) {
      this.lex.advance1();
      let value: ExpressionNode | undefined;
      if (!this.lex.is('Newline') && !this.lex.is('EOF') && !this.lex.is('Colon')) {
        value = this.parseExpression();
      }
      this.lex.expectNewlineOrColon();
      return { kind: 'ReturnStatement', value } as ReturnStatementNode;
    }
    if (this.lex.isKeyword('Call')) {
      this.lex.advance1();
      const expr = this.parseExpression();
      this.lex.expectNewlineOrColon();
      return { kind: 'CallStatement', expression: expr } as CallStatementNode;
    }
    if (this.lex.isKeyword('Set') || this.lex.isKeyword('Let')) {
      const isSet = this.lex.isKeyword('Set');
      this.lex.advance1();
      return this.parseAssignment(isSet);
    }

    // Skip GoTo, Resume labels, end-of-block keywords handled by callers
    if (this.lex.isKeyword('GoTo') || this.lex.isKeyword('GoSub') || this.lex.isKeyword('Resume') || this.lex.isKeyword('Stop')) {
      while (!this.lex.is('Newline') && !this.lex.is('EOF')) this.lex.advance1();
      this.lex.expectNewlineOrColon();
      return null;
    }

    // Could be assignment or call
    if (t.kind === 'Identifier' || t.kind === 'Keyword') {
      return this.parseAssignmentOrCall();
    }

    // Unknown — skip line
    while (!this.lex.is('Newline') && !this.lex.is('EOF')) this.lex.advance1();
    this.lex.expectNewlineOrColon();
    return null;
  }

  private parseAssignmentOrCall(): StatementNode | null {
    // Lookahead: if after LHS we see '=' it's assignment, else call
    const expr = this.parseExpression();
    if (this.lex.is('Operator', '=')) {
      this.lex.advance1();
      const value = this.parseExpression();
      this.lex.expectNewlineOrColon();
      return { kind: 'Assignment', target: expr, value, setKeyword: false } as AssignmentNode;
    }
    this.lex.expectNewlineOrColon();
    return { kind: 'CallStatement', expression: expr } as CallStatementNode;
  }

  private parseAssignment(setKeyword: boolean): AssignmentNode {
    const target = this.parseExpression();
    this.lex.consume('Operator', '=');
    const value = this.parseExpression();
    this.lex.expectNewlineOrColon();
    return { kind: 'Assignment', target, value, setKeyword };
  }

  private parseIf(): IfStatementNode {
    this.lex.advance1(); // If
    const condition = this.parseExpression();
    this.lex.consume('Keyword', 'Then');

    // Single-line If
    if (!this.lex.is('Newline') && !this.lex.is('EOF')) {
      const thenStmt = this.parseStatement();
      const thenBranch: StatementNode[] = thenStmt ? [thenStmt] : [];
      let elseBranch: StatementNode[] | undefined;
      if (this.lex.isKeyword('Else')) {
        this.lex.advance1();
        const elseStmt = this.parseStatement();
        elseBranch = elseStmt ? [elseStmt] : [];
      }
      return { kind: 'IfStatement', condition, thenBranch, elseIfClauses: [], elseBranch };
    }

    this.lex.expectNewlineOrColon();
    const thenBranch: StatementNode[] = [];
    const elseIfClauses: ElseIfClauseNode[] = [];
    let elseBranch: StatementNode[] | undefined;

    outer: while (!this.lex.is('EOF')) {
      this.lex.skipNewlines();
      if (this.lex.isKeyword('ElseIf')) {
        this.lex.advance1();
        const elseIfCond = this.parseExpression();
        this.lex.consume('Keyword', 'Then');
        this.lex.expectNewlineOrColon();
        const elseIfBody: StatementNode[] = [];
        while (!this.lex.is('EOF')) {
          this.lex.skipNewlines();
          if (this.lex.isKeyword('ElseIf') || this.lex.isKeyword('Else') || this.lex.isKeyword('End')) break;
          const s = this.parseStatement();
          if (s) elseIfBody.push(s);
        }
        elseIfClauses.push({ kind: 'ElseIfClause', condition: elseIfCond, body: elseIfBody });
        continue;
      }
      if (this.lex.isKeyword('Else')) {
        this.lex.advance1();
        this.lex.expectNewlineOrColon();
        elseBranch = [];
        while (!this.lex.is('EOF')) {
          this.lex.skipNewlines();
          if (this.lex.isKeyword('End')) break;
          const s = this.parseStatement();
          if (s) elseBranch.push(s);
        }
        break outer;
      }
      if (this.lex.isKeyword('End')) {
        break;
      }
      const s = this.parseStatement();
      if (s) thenBranch.push(s);
    }

    if (this.lex.isKeyword('End')) { this.lex.advance1(); this.lex.consume('Keyword', 'If'); }
    this.lex.expectNewlineOrColon();
    return { kind: 'IfStatement', condition, thenBranch, elseIfClauses, elseBranch };
  }

  private parseFor(): ForStatementNode | ForEachStatementNode {
    this.lex.advance1(); // For
    if (this.lex.isKeyword('Each')) {
      this.lex.advance1();
      const variable = this.lex.advance1().value;
      this.lex.consume('Keyword', 'In');
      const collection = this.parseExpression();
      this.lex.expectNewlineOrColon();
      const body = this.parseLoopBody('For');
      return { kind: 'ForEachStatement', variable, collection, body };
    }
    const variable = this.lex.advance1().value;
    this.lex.consume('Operator', '=');
    const from = this.parseExpression();
    this.lex.consume('Keyword', 'To');
    const to = this.parseExpression();
    let step: ExpressionNode | undefined;
    if (this.lex.isKeyword('Step')) { this.lex.advance1(); step = this.parseExpression(); }
    this.lex.expectNewlineOrColon();
    const body = this.parseLoopBody('For');
    return { kind: 'ForStatement', variable, from, to, step, body };
  }

  private parseLoopBody(endKind: 'For' | 'While' | 'Do'): StatementNode[] {
    const stmts: StatementNode[] = [];
    while (!this.lex.is('EOF')) {
      this.lex.skipNewlines();
      if (endKind === 'For' && this.lex.isKeyword('Next')) {
        this.lex.advance1();
        if (!this.lex.is('Newline') && !this.lex.is('EOF')) this.lex.advance1();
        this.lex.expectNewlineOrColon();
        break;
      }
      if (endKind === 'While' && this.lex.isKeyword('Wend')) { this.lex.advance1(); this.lex.expectNewlineOrColon(); break; }
      if (endKind === 'Do' && this.lex.isKeyword('Loop')) { this.lex.advance1(); this.lex.expectNewlineOrColon(); break; }
      const s = this.parseStatement();
      if (s) stmts.push(s);
    }
    return stmts;
  }

  private parseWhile(): WhileStatementNode {
    this.lex.advance1();
    const condition = this.parseExpression();
    this.lex.expectNewlineOrColon();
    const body = this.parseLoopBody('While');
    return { kind: 'WhileStatement', condition, body };
  }

  private parseDo(): DoStatementNode {
    this.lex.advance1();
    let condition: ExpressionNode | undefined;
    let whileOrUntil: 'While' | 'Until' = 'While';
    if (this.lex.isKeyword('While') || this.lex.isKeyword('Until')) {
      whileOrUntil = this.lex.isKeyword('While') ? 'While' : 'Until';
      this.lex.advance1();
      condition = this.parseExpression();
    }
    this.lex.expectNewlineOrColon();
    const body = this.parseLoopBody('Do');
    let conditionAtEnd = false;
    if (!condition) {
      // Condition may follow Loop keyword
      if (this.lex.isKeyword('While') || this.lex.isKeyword('Until')) {
        whileOrUntil = this.lex.isKeyword('While') ? 'While' : 'Until';
        this.lex.advance1();
        condition = this.parseExpression();
        conditionAtEnd = true;
      }
    }
    this.lex.expectNewlineOrColon();
    return { kind: 'DoStatement', condition, conditionAtEnd, whileOrUntil, body };
  }

  private parseSelect(): SelectStatementNode {
    this.lex.advance1(); // Select
    this.lex.consume('Keyword', 'Case');
    const expression = this.parseExpression();
    this.lex.expectNewlineOrColon();
    const cases: CaseClauseNode[] = [];

    while (!this.lex.is('EOF')) {
      this.lex.skipNewlines();
      if (this.lex.isKeyword('End')) break;
      if (this.lex.isKeyword('Case')) {
        this.lex.advance1();
        let values: ExpressionNode[] | 'Else';
        if (this.lex.isKeyword('Else')) { this.lex.advance1(); values = 'Else'; }
        else {
          values = [this.parseExpression()];
          while (this.lex.is('Comma')) { this.lex.advance1(); values.push(this.parseExpression()); }
        }
        this.lex.expectNewlineOrColon();
        const body: StatementNode[] = [];
        while (!this.lex.is('EOF')) {
          this.lex.skipNewlines();
          if (this.lex.isKeyword('Case') || this.lex.isKeyword('End')) break;
          const s = this.parseStatement();
          if (s) body.push(s);
        }
        cases.push({ kind: 'CaseClause', values, body });
      } else {
        this.lex.advance1();
      }
    }
    if (this.lex.isKeyword('End')) { this.lex.advance1(); this.lex.consume('Keyword', 'Select'); }
    this.lex.expectNewlineOrColon();
    return { kind: 'SelectStatement', expression, cases };
  }

  private parseWith(): WithStatementNode {
    this.lex.advance1();
    const object = this.parseExpression();
    this.lex.expectNewlineOrColon();
    const body: StatementNode[] = [];
    while (!this.lex.is('EOF')) {
      this.lex.skipNewlines();
      if (this.lex.isKeyword('End')) break;
      const s = this.parseStatement();
      if (s) body.push(s);
    }
    if (this.lex.isKeyword('End')) { this.lex.advance1(); this.lex.consume('Keyword', 'With'); }
    this.lex.expectNewlineOrColon();
    return { kind: 'WithStatement', object, body };
  }

  private parseExit(): ExitStatementNode {
    this.lex.advance1();
    const target = this.lex.advance1().value as ExitStatementNode['target'];
    this.lex.expectNewlineOrColon();
    return { kind: 'ExitStatement', target };
  }

  private parseOnError(): OnErrorStatementNode {
    this.lex.advance1(); // On
    this.lex.consume('Keyword', 'Error');
    if (this.lex.isKeyword('GoTo')) {
      this.lex.advance1();
      const label = this.lex.advance1().value;
      this.lex.expectNewlineOrColon();
      if (label === '0') return { kind: 'OnErrorStatement', kind2: 'GoTo0' };
      return { kind: 'OnErrorStatement', kind2: 'GoToLabel', label };
    }
    if (this.lex.isKeyword('Resume')) {
      this.lex.advance1(); this.lex.advance1(); // Resume Next
      this.lex.expectNewlineOrColon();
      return { kind: 'OnErrorStatement', kind2: 'Resume' };
    }
    while (!this.lex.is('Newline') && !this.lex.is('EOF')) this.lex.advance1();
    this.lex.expectNewlineOrColon();
    return { kind: 'OnErrorStatement', kind2: 'GoTo0' };
  }

  // Expression parsing with precedence climbing
  private parseExpression(): ExpressionNode {
    return this.parseOr();
  }

  private parseOr(): ExpressionNode {
    let left = this.parseAnd();
    while (this.lex.isKeyword('Or') || this.lex.isKeyword('Xor')) {
      const op = this.lex.advance1().value;
      const right = this.parseAnd();
      left = { kind: 'BinaryExpression', operator: op, left, right } as BinaryExpressionNode;
    }
    return left;
  }

  private parseAnd(): ExpressionNode {
    let left = this.parseNot();
    while (this.lex.isKeyword('And')) {
      this.lex.advance1();
      const right = this.parseNot();
      left = { kind: 'BinaryExpression', operator: 'And', left, right } as BinaryExpressionNode;
    }
    return left;
  }

  private parseNot(): ExpressionNode {
    if (this.lex.isKeyword('Not')) {
      this.lex.advance1();
      const operand = this.parseComparison();
      return { kind: 'UnaryExpression', operator: 'Not', operand } as UnaryExpressionNode;
    }
    return this.parseComparison();
  }

  private parseComparison(): ExpressionNode {
    let left = this.parseConcat();
    const compOps = ['=', '<>', '<', '>', '<=', '>='];
    while (compOps.includes(this.lex.current().value) ||
           this.lex.isKeyword('Is') || this.lex.isKeyword('Like')) {
      const op = this.lex.advance1().value;
      const right = this.parseConcat();
      left = { kind: 'BinaryExpression', operator: op, left, right } as BinaryExpressionNode;
    }
    return left;
  }

  private parseConcat(): ExpressionNode {
    let left = this.parseAddSub();
    while (this.lex.is('Operator', '&')) {
      this.lex.advance1();
      const right = this.parseAddSub();
      left = { kind: 'BinaryExpression', operator: '&', left, right } as BinaryExpressionNode;
    }
    return left;
  }

  private parseAddSub(): ExpressionNode {
    let left = this.parseMulDiv();
    while (this.lex.is('Operator', '+') || this.lex.is('Operator', '-')) {
      const op = this.lex.advance1().value;
      const right = this.parseMulDiv();
      left = { kind: 'BinaryExpression', operator: op, left, right } as BinaryExpressionNode;
    }
    return left;
  }

  private parseMulDiv(): ExpressionNode {
    let left = this.parseUnary();
    while (this.lex.is('Operator', '*') || this.lex.is('Operator', '/') ||
           this.lex.is('Operator', '\\') || this.lex.isKeyword('Mod')) {
      const op = this.lex.advance1().value;
      const right = this.parseUnary();
      left = { kind: 'BinaryExpression', operator: op, left, right } as BinaryExpressionNode;
    }
    return left;
  }

  private parseUnary(): ExpressionNode {
    if (this.lex.is('Operator', '-') || this.lex.is('Operator', '+')) {
      const op = this.lex.advance1().value;
      const operand = this.parsePower();
      return { kind: 'UnaryExpression', operator: op, operand } as UnaryExpressionNode;
    }
    return this.parsePower();
  }

  private parsePower(): ExpressionNode {
    let left = this.parsePostfix();
    if (this.lex.is('Operator', '^')) {
      this.lex.advance1();
      const right = this.parseUnary();
      left = { kind: 'BinaryExpression', operator: '^', left, right } as BinaryExpressionNode;
    }
    return left;
  }

  private parsePostfix(): ExpressionNode {
    let expr = this.parsePrimary();
    while (true) {
      if (this.lex.is('Dot')) {
        this.lex.advance1();
        const member = this.lex.advance1().value;
        if (this.lex.is('LParen')) {
          const args = this.parseArgList();
          expr = { kind: 'MemberExpression', object: expr, member, args } as MemberExpressionNode;
        } else {
          expr = { kind: 'MemberExpression', object: expr, member } as MemberExpressionNode;
        }
      } else if (this.lex.is('LParen')) {
        // Could be array index or function call on variable
        const args = this.parseArgList();
        expr = { kind: 'IndexExpression', object: expr, indices: args } as IndexExpressionNode;
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): ExpressionNode {
    const t = this.lex.current();

    if (t.kind === 'StringLiteral') {
      this.lex.advance1();
      return { kind: 'Literal', value: t.value, rawType: 'String' } as LiteralNode;
    }
    if (t.kind === 'NumberLiteral') {
      this.lex.advance1();
      const v = parseFloat(t.value.replace(/[LSD@%&!#]$/, ''));
      return { kind: 'Literal', value: isNaN(v) ? 0 : v, rawType: Number.isInteger(v) ? 'Integer' : 'Double' } as LiteralNode;
    }
    if (t.kind === 'DateLiteral') {
      this.lex.advance1();
      return { kind: 'Literal', value: t.value, rawType: 'Date' } as LiteralNode;
    }
    if (this.lex.isKeyword('True')) { this.lex.advance1(); return { kind: 'Literal', value: true, rawType: 'Boolean' } as LiteralNode; }
    if (this.lex.isKeyword('False')) { this.lex.advance1(); return { kind: 'Literal', value: false, rawType: 'Boolean' } as LiteralNode; }
    if (this.lex.isKeyword('Nothing') || this.lex.isKeyword('Null') || this.lex.isKeyword('Empty')) {
      this.lex.advance1();
      return { kind: 'Literal', value: null, rawType: 'Null' } as LiteralNode;
    }
    if (this.lex.is('LParen')) {
      this.lex.advance1();
      const expr = this.parseExpression();
      if (this.lex.is('RParen')) this.lex.advance1();
      return { kind: 'ParenExpression', expression: expr } as any;
    }
    if (t.kind === 'Identifier' || t.kind === 'Keyword') {
      this.lex.advance1();
      if (this.lex.is('LParen')) {
        const args = this.parseArgList();
        return { kind: 'CallExpression', callee: t.value, args } as CallExpressionNode;
      }
      return { kind: 'Identifier', name: t.value } as IdentifierNode;
    }
    // Fallback
    this.lex.advance1();
    return { kind: 'Identifier', name: t.value } as IdentifierNode;
  }

  private parseArgList(): ExpressionNode[] {
    const args: ExpressionNode[] = [];
    if (this.lex.is('LParen')) this.lex.advance1();
    while (!this.lex.is('RParen') && !this.lex.is('Newline') && !this.lex.is('EOF')) {
      if (this.lex.is('Comma')) { args.push({ kind: 'Literal', value: null, rawType: 'Empty' } as LiteralNode); this.lex.advance1(); continue; }
      args.push(this.parseExpression());
      if (this.lex.is('Comma')) this.lex.advance1();
    }
    if (this.lex.is('RParen')) this.lex.advance1();
    return args;
  }
}
