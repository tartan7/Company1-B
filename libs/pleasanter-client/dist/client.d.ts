import { PleasanterConfig, RateLimitConfig, PaginationOptions, PaginatedResponse, Organization, User, Department } from './types.js';
export declare class PleasanterClient {
    private auth;
    private httpClient;
    private rateLimiter;
    private baseUrl;
    private tenantId?;
    constructor(config: PleasanterConfig, rateLimitConfig?: Partial<RateLimitConfig>);
    private makeRequest;
    private handleError;
    testConnection(): Promise<boolean>;
    getOrganizations(options?: PaginationOptions): Promise<PaginatedResponse<Organization>>;
    getOrganizationById(organizationId: string): Promise<Organization>;
    getUsers(organizationId?: string, options?: PaginationOptions): Promise<PaginatedResponse<User>>;
    getUserById(userId: string): Promise<User>;
    getDepartments(organizationId?: string, options?: PaginationOptions): Promise<PaginatedResponse<Department>>;
    getDepartmentById(departmentId: string): Promise<Department>;
    getRecords(organizationId: string, options?: PaginationOptions): Promise<PaginatedResponse<Record<string, unknown>>>;
    getRecordById(organizationId: string, recordId: string): Promise<Record<string, unknown>>;
    getRemainingRequests(): number;
    resetRateLimit(): void;
    setTenantId(tenantId: string): void;
    getTenantId(): string | undefined;
    private mapToOrganization;
    private mapToUser;
    private mapToDepartment;
}
//# sourceMappingURL=client.d.ts.map