import Decimal from 'decimal.js';
export class CircularDependencyError extends Error {
    constructor(cycle) {
        super(`Circular dependency detected: ${cycle.join(' -> ')}`);
        this.name = 'CircularDependencyError';
    }
}
export class UndefinedDependencyError extends Error {
    constructor(dependency, formula) {
        super(`Undefined dependency '${dependency}' in formula '${formula}'`);
        this.name = 'UndefinedDependencyError';
    }
}
export class CalculationEngine {
    constructor(precision = 2) {
        this.formulas = new Map();
        this.cache = new Map();
        this.precision = 2; // ¥0.01
        this.evaluationOrder = [];
        this.dependencyGraph = new Map();
        this.precision = precision;
        Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
    }
    registerFormula(formula) {
        if (this.formulas.has(formula.id)) {
            throw new Error(`Formula with id '${formula.id}' already exists`);
        }
        this.formulas.set(formula.id, formula);
        this.dependencyGraph.set(formula.id, new Set(formula.dependencies));
        this.invalidateCache(formula.id);
    }
    updateFormula(formula) {
        if (!this.formulas.has(formula.id)) {
            throw new Error(`Formula with id '${formula.id}' not found`);
        }
        this.formulas.set(formula.id, formula);
        this.dependencyGraph.set(formula.id, new Set(formula.dependencies));
        this.invalidateCache(formula.id);
        this.invalidateDependents(formula.id);
    }
    detectCircularDependencies() {
        const visited = new Set();
        const recursionStack = new Set();
        const cycle = [];
        const dfs = (nodeId) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            cycle.push(nodeId);
            const dependencies = this.dependencyGraph.get(nodeId) || new Set();
            for (const dep of dependencies) {
                if (!visited.has(dep)) {
                    if (dfs(dep))
                        return true;
                }
                else if (recursionStack.has(dep)) {
                    const cycleStart = cycle.indexOf(dep);
                    throw new CircularDependencyError(cycle.slice(cycleStart));
                }
            }
            recursionStack.delete(nodeId);
            cycle.pop();
            return false;
        };
        for (const nodeId of this.formulas.keys()) {
            if (!visited.has(nodeId)) {
                try {
                    dfs(nodeId);
                }
                catch (error) {
                    if (error instanceof CircularDependencyError) {
                        throw error;
                    }
                    throw error;
                }
            }
        }
    }
    topologicalSort() {
        this.detectCircularDependencies();
        const visited = new Set();
        const sorted = [];
        const dfs = (nodeId) => {
            if (visited.has(nodeId))
                return;
            visited.add(nodeId);
            const dependencies = this.dependencyGraph.get(nodeId) || new Set();
            for (const dep of dependencies) {
                if (this.formulas.has(dep)) {
                    dfs(dep);
                }
            }
            sorted.push(nodeId);
        };
        for (const nodeId of this.formulas.keys()) {
            dfs(nodeId);
        }
        return sorted;
    }
    extractDependenciesFromExpression(expr) {
        const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        const matches = new Set();
        let match;
        while ((match = variableRegex.exec(expr)) !== null) {
            const variable = match[1];
            if (!['Math', 'Number', 'parseFloat', 'parseInt'].includes(variable)) {
                matches.add(variable);
            }
        }
        return Array.from(matches);
    }
    validateDependencies(formulaId, declaredDeps) {
        for (const dep of declaredDeps) {
            if (!this.formulas.has(dep)) {
                throw new UndefinedDependencyError(dep, formulaId);
            }
        }
    }
    evaluateExpression(expression, context) {
        const safeContext = {};
        for (const [key, value] of Object.entries(context)) {
            if (value instanceof Decimal) {
                safeContext[key] = value.toNumber();
            }
            else {
                safeContext[key] = typeof value === 'number' ? value : parseFloat(String(value));
            }
        }
        try {
            const fn = new Function(...Object.keys(safeContext), `return ${expression}`);
            const result = fn(...Object.values(safeContext));
            return new Decimal(result);
        }
        catch (error) {
            throw new Error(`Failed to evaluate expression '${expression}': ${error}`);
        }
    }
    calculate(formulaId, context) {
        const cacheKey = this.getCacheKey(formulaId, context);
        const cached = this.cache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
            return cached.value;
        }
        const formula = this.formulas.get(formulaId);
        if (!formula) {
            throw new Error(`Formula '${formulaId}' not found`);
        }
        this.validateDependencies(formulaId, formula.dependencies);
        const evaluationContext = { ...context };
        for (const dep of formula.dependencies) {
            if (this.formulas.has(dep)) {
                evaluationContext[dep] = this.calculate(dep, context);
            }
        }
        const result = this.evaluateExpression(formula.expression, evaluationContext);
        const rounded = result.toDecimalPlaces(this.precision);
        const entry = {
            value: rounded,
            timestamp: Date.now(),
            dependencies: new Set(formula.dependencies),
        };
        this.cache.set(cacheKey, entry);
        return rounded;
    }
    calculateMultiple(context) {
        const results = new Map();
        const evaluationOrder = this.topologicalSort();
        const fullContext = { ...context };
        for (const formulaId of evaluationOrder) {
            const result = this.calculate(formulaId, fullContext);
            results.set(formulaId, result);
            fullContext[formulaId] = result;
        }
        return results;
    }
    getCacheKey(formulaId, context) {
        const contextStr = Object.entries(context)
            .sort()
            .map(([k, v]) => `${k}:${v}`)
            .join('|');
        return `${formulaId}|${contextStr}`;
    }
    isCacheValid(entry) {
        const cacheExpiry = 5 * 60 * 1000; // 5 minutes
        return Date.now() - entry.timestamp < cacheExpiry;
    }
    invalidateCache(formulaId) {
        if (formulaId) {
            const keysToDelete = [];
            for (const [key] of this.cache.entries()) {
                if (key.startsWith(formulaId)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => this.cache.delete(key));
        }
        else {
            this.cache.clear();
        }
    }
    invalidateDependents(formulaId) {
        const dependents = new Set();
        const findDependents = (id) => {
            for (const [fId, deps] of this.dependencyGraph.entries()) {
                if (deps.has(id) && !dependents.has(fId)) {
                    dependents.add(fId);
                    findDependents(fId);
                }
            }
        };
        findDependents(formulaId);
        for (const dep of dependents) {
            this.invalidateCache(dep);
        }
    }
    getFormula(formulaId) {
        return this.formulas.get(formulaId);
    }
    removeFormula(formulaId) {
        if (this.formulas.delete(formulaId)) {
            this.dependencyGraph.delete(formulaId);
            this.invalidateCache(formulaId);
            return true;
        }
        return false;
    }
    getDependencyGraph() {
        return new Map(this.dependencyGraph);
    }
    getFormulaIds() {
        return Array.from(this.formulas.keys());
    }
    getEvaluationOrder() {
        return this.topologicalSort();
    }
}
