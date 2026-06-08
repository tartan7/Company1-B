import { PaginationOptions, PaginatedResponse } from './types.js';
export declare const DEFAULT_PAGE_SIZE = 50;
export declare const MAX_PAGE_SIZE = 1000;
export declare class Paginator {
    static readonly DEFAULT_PAGE_SIZE = 50;
    static readonly MAX_PAGE_SIZE = 1000;
    static validateOptions(options?: PaginationOptions): PaginationOptions;
    static createResponse<T>(data: T[], page: number, pageSize: number, total: number): PaginatedResponse<T>;
    static buildQueryParams(options?: PaginationOptions): Record<string, number>;
    static generatePages(total: number, pageSize?: number): Generator<number>;
}
//# sourceMappingURL=pagination.d.ts.map