// VBA Abstract Syntax Tree Node Types

export type VBAType =
  | 'Integer' | 'Long' | 'Single' | 'Double' | 'String'
  | 'Boolean' | 'Date' | 'Variant' | 'Object' | 'Currency'
  | 'Byte' | 'LongLong' | 'Decimal' | 'Empty' | 'Null' | 'Error'
  | { kind: 'Array'; elementType: VBAType; dimensions: number }
  | { kind: 'UserDefined'; name: string };

export type NodeKind =
  | 'Module' | 'Function' | 'Sub' | 'Property'
  | 'IfStatement' | 'ElseIfClause' | 'ElseClause'
  | 'ForStatement' | 'ForEachStatement' | 'WhileStatement' | 'DoStatement'
  | 'SelectStatement' | 'CaseClause'
  | 'DimDeclaration' | 'ConstDeclaration' | 'Assignment'
  | 'CallStatement' | 'ReturnStatement' | 'ExitStatement'
  | 'WithStatement' | 'OnErrorStatement'
  | 'BinaryExpression' | 'UnaryExpression' | 'CallExpression'
  | 'MemberExpression' | 'IndexExpression' | 'ParenExpression'
  | 'Literal' | 'Identifier' | 'TypeCast';

export interface Position {
  line: number;
  column: number;
}

export interface BaseNode {
  kind: NodeKind;
  pos?: Position;
}

// Declarations
export interface ModuleNode extends BaseNode {
  kind: 'Module';
  name: string;
  declarations: DeclarationNode[];
}

export interface FunctionNode extends BaseNode {
  kind: 'Function' | 'Sub' | 'Property';
  name: string;
  params: ParameterNode[];
  returnType?: VBAType;
  body: StatementNode[];
  isPublic: boolean;
  isStatic: boolean;
}

export interface ParameterNode {
  name: string;
  type?: VBAType;
  byRef: boolean;
  optional: boolean;
  defaultValue?: ExpressionNode;
  paramArray: boolean;
}

export interface DimDeclarationNode extends BaseNode {
  kind: 'DimDeclaration';
  name: string;
  type?: VBAType;
  initializer?: ExpressionNode;
  isStatic: boolean;
}

export interface ConstDeclarationNode extends BaseNode {
  kind: 'ConstDeclaration';
  name: string;
  type?: VBAType;
  value: ExpressionNode;
}

export type DeclarationNode = FunctionNode | DimDeclarationNode | ConstDeclarationNode;

// Statements
export interface IfStatementNode extends BaseNode {
  kind: 'IfStatement';
  condition: ExpressionNode;
  thenBranch: StatementNode[];
  elseIfClauses: ElseIfClauseNode[];
  elseBranch?: StatementNode[];
}

export interface ElseIfClauseNode extends BaseNode {
  kind: 'ElseIfClause';
  condition: ExpressionNode;
  body: StatementNode[];
}

export interface ForStatementNode extends BaseNode {
  kind: 'ForStatement';
  variable: string;
  from: ExpressionNode;
  to: ExpressionNode;
  step?: ExpressionNode;
  body: StatementNode[];
}

export interface ForEachStatementNode extends BaseNode {
  kind: 'ForEachStatement';
  variable: string;
  collection: ExpressionNode;
  body: StatementNode[];
}

export interface WhileStatementNode extends BaseNode {
  kind: 'WhileStatement';
  condition: ExpressionNode;
  body: StatementNode[];
}

export interface DoStatementNode extends BaseNode {
  kind: 'DoStatement';
  condition?: ExpressionNode;
  conditionAtEnd: boolean;
  whileOrUntil: 'While' | 'Until';
  body: StatementNode[];
}

export interface SelectStatementNode extends BaseNode {
  kind: 'SelectStatement';
  expression: ExpressionNode;
  cases: CaseClauseNode[];
}

export interface CaseClauseNode extends BaseNode {
  kind: 'CaseClause';
  values: ExpressionNode[] | 'Else';
  body: StatementNode[];
}

export interface AssignmentNode extends BaseNode {
  kind: 'Assignment';
  target: ExpressionNode;
  value: ExpressionNode;
  setKeyword: boolean;
}

export interface CallStatementNode extends BaseNode {
  kind: 'CallStatement';
  expression: CallExpressionNode | MemberExpressionNode;
}

export interface ReturnStatementNode extends BaseNode {
  kind: 'ReturnStatement';
  value?: ExpressionNode;
}

export interface ExitStatementNode extends BaseNode {
  kind: 'ExitStatement';
  target: 'Function' | 'Sub' | 'For' | 'Do' | 'While' | 'Property';
}

export interface WithStatementNode extends BaseNode {
  kind: 'WithStatement';
  object: ExpressionNode;
  body: StatementNode[];
}

export interface OnErrorStatementNode extends BaseNode {
  kind: 'OnErrorStatement';
  kind2: 'GoTo0' | 'GoToLabel' | 'Resume';
  label?: string;
}

export type StatementNode =
  | IfStatementNode | ForStatementNode | ForEachStatementNode
  | WhileStatementNode | DoStatementNode | SelectStatementNode
  | DimDeclarationNode | ConstDeclarationNode | AssignmentNode
  | CallStatementNode | ReturnStatementNode | ExitStatementNode
  | WithStatementNode | OnErrorStatementNode;

// Expressions
export interface BinaryExpressionNode extends BaseNode {
  kind: 'BinaryExpression';
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryExpressionNode extends BaseNode {
  kind: 'UnaryExpression';
  operator: string;
  operand: ExpressionNode;
}

export interface CallExpressionNode extends BaseNode {
  kind: 'CallExpression';
  callee: string;
  args: ExpressionNode[];
}

export interface MemberExpressionNode extends BaseNode {
  kind: 'MemberExpression';
  object: ExpressionNode;
  member: string;
  args?: ExpressionNode[];
}

export interface IndexExpressionNode extends BaseNode {
  kind: 'IndexExpression';
  object: ExpressionNode;
  indices: ExpressionNode[];
}

export interface ParenExpressionNode extends BaseNode {
  kind: 'ParenExpression';
  expression: ExpressionNode;
}

export interface LiteralNode extends BaseNode {
  kind: 'Literal';
  value: string | number | boolean | null;
  rawType: 'String' | 'Integer' | 'Long' | 'Double' | 'Boolean' | 'Date' | 'Null' | 'Empty';
}

export interface IdentifierNode extends BaseNode {
  kind: 'Identifier';
  name: string;
}

export interface TypeCastNode extends BaseNode {
  kind: 'TypeCast';
  expression: ExpressionNode;
  targetType: VBAType;
}

export type ExpressionNode =
  | BinaryExpressionNode | UnaryExpressionNode | CallExpressionNode
  | MemberExpressionNode | IndexExpressionNode | ParenExpressionNode
  | LiteralNode | IdentifierNode | TypeCastNode;
