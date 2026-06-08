import Decimal from 'decimal.js';
export interface Formula {
    id: string;
    name: string;
    expression: string;
    dependencies: string[];
}
export interface CalculationContext {
    [key: string]: Decimal | number;
}
export interface CacheEntry {
    value: Decimal;
    timestamp: number;
    dependencies: Set<string>;
}
export declare class CircularDependencyError extends Error {
    constructor(cycle: string[]);
}
export declare class UndefinedDependencyError extends Error {
    constructor(dependency: string, formula: string);
}
export declare class CalculationEngine {
    private formulas;
    private cache;
    private precision;
    private evaluationOrder;
    private dependencyGraph;
    constructor(precision?: number);
    registerFormula(formula: Formula): void;
    updateFormula(formula: Formula): void;
    private detectCircularDependencies;
    private topologicalSort;
    private extractDependenciesFromExpression;
    private validateDependencies;
    private evaluateExpression;
    calculate(formulaId: string, context: CalculationContext): Decimal;
    calculateMultiple(context: CalculationContext): Map<string, Decimal>;
    private getCacheKey;
    private isCacheValid;
    invalidateCache(formulaId?: string): void;
    private invalidateDependents;
    getFormula(formulaId: string): Formula | undefined;
    removeFormula(formulaId: string): boolean;
    getDependencyGraph(): Map<string, Set<string>>;
    getFormulaIds(): string[];
    getEvaluationOrder(): string[];
}
