export interface PleasanterConfig {
    baseUrl: string;
    apiKey: string;
    tenantId?: string;
}
export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}
export interface PaginationOptions {
    page?: number;
    pageSize?: number;
}
export interface PaginatedResponse<T> {
    data: T[];
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
}
export interface Organization {
    id: string;
    name: string;
    code?: string;
    tenantId?: string;
}
export interface User {
    id: string;
    name: string;
    email?: string;
    departmentId?: string;
    tenantId?: string;
}
export interface Department {
    id: string;
    name: string;
    parentId?: string;
    tenantId?: string;
}
export interface PleasanterError extends Error {
    statusCode?: number;
    responseData?: unknown;
}
//# sourceMappingURL=types.d.ts.map