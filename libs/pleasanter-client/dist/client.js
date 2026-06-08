import axios from 'axios';
import { PleasanterAuth } from './auth.js';
import { RateLimiter } from './rate-limiter.js';
import { Paginator, DEFAULT_PAGE_SIZE } from './pagination.js';
const DEFAULT_RATE_LIMIT = {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
};
export class PleasanterClient {
    constructor(config, rateLimitConfig) {
        this.auth = new PleasanterAuth(config.apiKey);
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.tenantId = config.tenantId;
        this.httpClient = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const rateLimitSettings = { ...DEFAULT_RATE_LIMIT, ...rateLimitConfig };
        this.rateLimiter = new RateLimiter(rateLimitSettings);
    }
    async makeRequest(method, path, data, params) {
        await this.rateLimiter.waitIfNeeded();
        try {
            const config = { params };
            const authPayload = this.auth.getAuthPayload();
            // Include auth in request body for POST/PUT, or as params for GET/DELETE
            if (method === 'get' || method === 'delete') {
                config.params = { ...(params || {}), ...authPayload };
            }
            else {
                const dataObj = (typeof data === 'object' && data !== null) ? data : {};
                data = { ...dataObj, ...authPayload };
            }
            const response = await this.httpClient[method](path, data, config);
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    handleError(error) {
        if (axios.isAxiosError(error)) {
            const pleError = new Error(error.message || 'Pleasanter API request failed');
            pleError.statusCode = error.response?.status;
            pleError.responseData = error.response?.data;
            return pleError;
        }
        return error;
    }
    async testConnection() {
        try {
            const response = await this.makeRequest('get', '/api/items/get', {});
            return !!response;
        }
        catch {
            return false;
        }
    }
    async getOrganizations(options) {
        const paginationParams = Paginator.buildQueryParams(options);
        const response = await this.makeRequest('get', '/api/sites/get', {}, paginationParams);
        return Paginator.createResponse(Array.isArray(response) ? response : [response], (options?.page ?? 1), (options?.pageSize ?? DEFAULT_PAGE_SIZE), Array.isArray(response) ? response.length : 1);
    }
    async getOrganizationById(organizationId) {
        const response = await this.makeRequest('get', `/api/items/${organizationId}`, {});
        return this.mapToOrganization(response);
    }
    async getUsers(organizationId, options) {
        const paginationParams = Paginator.buildQueryParams(options);
        const path = organizationId ? `/api/items/${organizationId}/users` : '/api/users/get';
        const response = await this.makeRequest('get', path, {}, paginationParams);
        return Paginator.createResponse(Array.isArray(response) ? response : [response], (options?.page ?? 1), (options?.pageSize ?? DEFAULT_PAGE_SIZE), Array.isArray(response) ? response.length : 1);
    }
    async getUserById(userId) {
        const response = await this.makeRequest('get', `/api/users/${userId}`, {});
        return this.mapToUser(response);
    }
    async getDepartments(organizationId, options) {
        const paginationParams = Paginator.buildQueryParams(options);
        const path = organizationId ? `/api/items/${organizationId}/departments` : '/api/departments/get';
        const response = await this.makeRequest('get', path, {}, paginationParams);
        return Paginator.createResponse(Array.isArray(response) ? response : [response], (options?.page ?? 1), (options?.pageSize ?? DEFAULT_PAGE_SIZE), Array.isArray(response) ? response.length : 1);
    }
    async getDepartmentById(departmentId) {
        const response = await this.makeRequest('get', `/api/departments/${departmentId}`, {});
        return this.mapToDepartment(response);
    }
    async getRecords(organizationId, options) {
        const paginationParams = Paginator.buildQueryParams(options);
        const response = await this.makeRequest('get', `/api/items/${organizationId}/records`, {}, paginationParams);
        return Paginator.createResponse(Array.isArray(response) ? response : [response], (options?.page ?? 1), (options?.pageSize ?? DEFAULT_PAGE_SIZE), Array.isArray(response) ? response.length : 1);
    }
    async getRecordById(organizationId, recordId) {
        return this.makeRequest('get', `/api/items/${organizationId}/records/${recordId}`, {});
    }
    getRemainingRequests() {
        return this.rateLimiter.getRemainingRequests();
    }
    resetRateLimit() {
        this.rateLimiter.resetWindow();
    }
    setTenantId(tenantId) {
        this.tenantId = tenantId;
    }
    getTenantId() {
        return this.tenantId;
    }
    mapToOrganization(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid organization data');
        }
        const org = data;
        return {
            id: String(org.id || ''),
            name: String(org.name || org.Title || ''),
            code: org.code ? String(org.code) : undefined,
            tenantId: this.tenantId,
        };
    }
    mapToUser(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid user data');
        }
        const user = data;
        return {
            id: String(user.id || user.UserId || ''),
            name: String(user.name || user.Name || ''),
            email: user.email ? String(user.email) : undefined,
            departmentId: user.departmentId ? String(user.departmentId) : undefined,
            tenantId: this.tenantId,
        };
    }
    mapToDepartment(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid department data');
        }
        const dept = data;
        return {
            id: String(dept.id || dept.DeptId || ''),
            name: String(dept.name || dept.DeptName || ''),
            parentId: dept.parentId ? String(dept.parentId) : undefined,
            tenantId: this.tenantId,
        };
    }
}
//# sourceMappingURL=client.js.map