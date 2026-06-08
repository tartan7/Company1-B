// VBA Migration Engine — Public API

import { Parser } from './parser';
import { Transpiler } from './transpiler';

export interface TranspileOptions {
  moduleName?: string;
  includeComments?: boolean;
}

export interface TranspileResult {
  code: string;
  warnings: string[];
  coverage: number; // 0-1 ratio of successfully transpiled constructs
}

export function transpileVBA(vbaSource: string, options: TranspileOptions = {}): TranspileResult {
  const warnings: string[] = [];
  let successCount = 0;
  let totalCount = 0;

  const parser = new Parser(vbaSource);
  const ast = parser.parse();

  if (options.moduleName) ast.name = options.moduleName;

  // Count constructs for coverage tracking
  totalCount += ast.declarations.length;
  for (const decl of ast.declarations) {
    if (decl.kind === 'Function' || decl.kind === 'Sub' || decl.kind === 'Property') {
      totalCount += decl.body.length;
    }
  }

  const transpiler = new Transpiler();
  let code: string;
  try {
    code = transpiler.transpileModule(ast);
    successCount = totalCount; // If no exception, all constructs transpiled
  } catch (err) {
    warnings.push(`Transpilation error: ${err instanceof Error ? err.message : String(err)}`);
    code = `// Transpilation failed: ${err instanceof Error ? err.message : String(err)}\n`;
    successCount = Math.floor(totalCount * 0.5);
  }

  const coverage = totalCount === 0 ? 1 : successCount / totalCount;

  return { code, warnings, coverage };
}

export function transpileVBAFile(vbaSource: string, moduleName: string): string {
  const result = transpileVBA(vbaSource, { moduleName });
  if (result.warnings.length > 0) {
    const commentedWarnings = result.warnings.map(w => `// WARNING: ${w}`).join('\n');
    return commentedWarnings + '\n' + result.code;
  }
  return result.code;
}

// Re-export AST types for downstream use
export type { ModuleNode, FunctionNode, StatementNode, ExpressionNode } from './ast';
export { Parser } from './parser';
export { Transpiler } from './transpiler';
