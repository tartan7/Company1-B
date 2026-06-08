// VBA Lexer/Tokenizer

export type TokenKind =
  | 'Identifier' | 'Keyword' | 'StringLiteral' | 'NumberLiteral' | 'DateLiteral'
  | 'Operator' | 'Comma' | 'Dot' | 'Colon' | 'LParen' | 'RParen'
  | 'Newline' | 'Continuation' | 'Comment' | 'EOF';

export const VBA_KEYWORDS = new Set([
  'And', 'As', 'Boolean', 'ByRef', 'ByVal', 'Call', 'Case', 'Class', 'Const',
  'Currency', 'Date', 'Declare', 'Dim', 'Do', 'Double', 'Each', 'Else',
  'ElseIf', 'Empty', 'End', 'Enum', 'Error', 'Event', 'Exit', 'False',
  'For', 'Friend', 'Function', 'Get', 'GoSub', 'GoTo', 'If', 'Implements',
  'In', 'Integer', 'Is', 'Let', 'Like', 'Long', 'Loop', 'Me', 'Mod',
  'Module', 'New', 'Next', 'Not', 'Nothing', 'Null', 'Object', 'On', 'Option',
  'Optional', 'Or', 'ParamArray', 'Preserve', 'Private', 'Property', 'Public',
  'RaiseEvent', 'ReDim', 'Resume', 'Return', 'Select', 'Set', 'Single',
  'Static', 'Step', 'Stop', 'String', 'Sub', 'Then', 'To', 'True', 'Type',
  'TypeOf', 'Until', 'Variant', 'Wend', 'While', 'With', 'Xor',
]);

export interface Token {
  kind: TokenKind;
  value: string;
  line: number;
  col: number;
}

export class Lexer {
  private src: string;
  private pos = 0;
  private line = 1;
  private col = 1;
  private tokens: Token[] = [];
  private index = 0;

  constructor(source: string) {
    this.src = source;
    this.tokenize();
  }

  private ch(): string { return this.src[this.pos] ?? ''; }
  private peek(offset = 1): string { return this.src[this.pos + offset] ?? ''; }

  private advance(): string {
    const c = this.ch();
    this.pos++;
    if (c === '\n') { this.line++; this.col = 1; } else { this.col++; }
    return c;
  }

  private addToken(kind: TokenKind, value: string, line: number, col: number) {
    this.tokens.push({ kind, value, line, col });
  }

  private tokenize() {
    while (this.pos < this.src.length) {
      this.skipWhitespace();
      if (this.pos >= this.src.length) break;

      const startLine = this.line;
      const startCol = this.col;
      const c = this.ch();

      // Line continuation
      if (c === '_' && (this.peek() === '\n' || (this.peek() === '\r' && this.peek(2) === '\n'))) {
        this.advance();
        this.addToken('Continuation', '_', startLine, startCol);
        continue;
      }

      // Comment
      if (c === '\'' || (c === 'R' && this.src.startsWith('Rem ', this.pos))) {
        const comment = this.readToEOL();
        this.addToken('Comment', comment, startLine, startCol);
        continue;
      }

      // Newline
      if (c === '\n' || c === '\r') {
        if (c === '\r' && this.peek() === '\n') this.advance();
        this.advance();
        this.addToken('Newline', '\n', startLine, startCol);
        continue;
      }

      // String literal
      if (c === '"') {
        const str = this.readString();
        this.addToken('StringLiteral', str, startLine, startCol);
        continue;
      }

      // Date literal
      if (c === '#') {
        const date = this.readDateLiteral();
        this.addToken('DateLiteral', date, startLine, startCol);
        continue;
      }

      // Number literal
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(this.peek()))) {
        const num = this.readNumber();
        this.addToken('NumberLiteral', num, startLine, startCol);
        continue;
      }

      // Hex literal
      if (c === '&' && (this.peek() === 'H' || this.peek() === 'h')) {
        const hex = this.readHexLiteral();
        this.addToken('NumberLiteral', hex, startLine, startCol);
        continue;
      }

      // Identifier or keyword
      if (/[a-zA-Z_]/.test(c)) {
        const ident = this.readIdentifier();
        const kind: TokenKind = VBA_KEYWORDS.has(ident) ? 'Keyword' : 'Identifier';
        this.addToken(kind, ident, startLine, startCol);
        continue;
      }

      // Single char tokens
      switch (c) {
        case '(': this.advance(); this.addToken('LParen', '(', startLine, startCol); break;
        case ')': this.advance(); this.addToken('RParen', ')', startLine, startCol); break;
        case ',': this.advance(); this.addToken('Comma', ',', startLine, startCol); break;
        case '.': this.advance(); this.addToken('Dot', '.', startLine, startCol); break;
        case ':':
          this.advance();
          // Colon used in statement separator, not label unless at line start context
          this.addToken('Colon', ':', startLine, startCol);
          break;
        default: {
          const op = this.readOperator();
          if (op) this.addToken('Operator', op, startLine, startCol);
          else this.advance(); // skip unknown char
        }
      }
    }
    this.addToken('EOF', '', this.line, this.col);
  }

  private skipWhitespace() {
    while (this.pos < this.src.length && (this.ch() === ' ' || this.ch() === '\t')) {
      this.advance();
    }
  }

  private readToEOL(): string {
    let result = '';
    while (this.pos < this.src.length && this.ch() !== '\n' && this.ch() !== '\r') {
      result += this.advance();
    }
    return result;
  }

  private readString(): string {
    this.advance(); // consume opening "
    let result = '';
    while (this.pos < this.src.length) {
      if (this.ch() === '"') {
        this.advance();
        if (this.ch() === '"') { // escaped quote
          result += '"';
          this.advance();
        } else {
          break;
        }
      } else {
        result += this.advance();
      }
    }
    return result;
  }

  private readDateLiteral(): string {
    this.advance(); // consume #
    let result = '';
    while (this.pos < this.src.length && this.ch() !== '#' && this.ch() !== '\n') {
      result += this.advance();
    }
    if (this.ch() === '#') this.advance();
    return result.trim();
  }

  private readNumber(): string {
    let result = '';
    while (/[0-9._]/.test(this.ch())) result += this.advance();
    // Scientific notation
    if (this.ch() === 'E' || this.ch() === 'e') {
      result += this.advance();
      if (this.ch() === '+' || this.ch() === '-') result += this.advance();
      while (/[0-9]/.test(this.ch())) result += this.advance();
    }
    // Type suffix: L, S, D, @, %, &, !, #
    if (/[LSDs@%&!#]/.test(this.ch())) result += this.advance();
    return result;
  }

  private readHexLiteral(): string {
    let result = this.advance() + this.advance(); // & H
    while (/[0-9a-fA-F]/.test(this.ch())) result += this.advance();
    return result;
  }

  private readIdentifier(): string {
    let result = '';
    while (/[a-zA-Z0-9_]/.test(this.ch())) result += this.advance();
    return result;
  }

  private readOperator(): string {
    const c = this.ch();
    const next = this.peek();
    if (c === '<' && next === '=') { this.advance(); this.advance(); return '<='; }
    if (c === '>' && next === '=') { this.advance(); this.advance(); return '>='; }
    if (c === '<' && next === '>') { this.advance(); this.advance(); return '<>'; }
    if ('+-*/\\^=<>&!'.includes(c)) { this.advance(); return c; }
    return '';
  }

  // Public API
  current(): Token { return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1]; }
  peek1(): Token { return this.tokens[this.index + 1] ?? this.tokens[this.tokens.length - 1]; }
  peek2(): Token { return this.tokens[this.index + 2] ?? this.tokens[this.tokens.length - 1]; }

  advance1(): Token {
    const t = this.current();
    // skip comments and continuations
    do { this.index++; } while (
      this.index < this.tokens.length &&
      (this.tokens[this.index].kind === 'Comment' || this.tokens[this.index].kind === 'Continuation')
    );
    return t;
  }

  skipNewlines() {
    while (this.current().kind === 'Newline') this.advance1();
  }

  expectNewlineOrColon() {
    if (this.current().kind === 'Newline' || this.current().kind === 'Colon') {
      this.advance1();
    }
  }

  is(kind: TokenKind, value?: string): boolean {
    const t = this.current();
    return t.kind === kind && (value === undefined || t.value.toLowerCase() === value.toLowerCase());
  }

  isKeyword(kw: string): boolean { return this.is('Keyword', kw) || this.is('Identifier', kw); }

  consume(kind: TokenKind, value?: string): Token {
    const t = this.current();
    if (t.kind !== kind || (value !== undefined && t.value.toLowerCase() !== value.toLowerCase())) {
      throw new Error(`Expected ${kind}${value ? ' ' + value : ''} at ${t.line}:${t.col}, got ${t.kind} '${t.value}'`);
    }
    return this.advance1();
  }
}
