import axios, { AxiosInstance } from 'axios';
import { PleasanterAuth } from './auth.js';
import { RateLimiter } from './rate-limiter.js';
import { Paginator, DEFAULT_PAGE_SIZE } from './pagination.js';
import {
  PleasanterConfig,
  RateLimitConfig,
  PaginationOptions,
  PaginatedResponse,
  Organization,
  User,
  Department,
  PleasanterError,
} from './types.js';

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
};

export class PleasanterClient {
  private auth: PleasanterAuth;
  private httpClient: AxiosInstance;
  private rateLimiter: RateLimiter;
  private baseUrl: string;
  private tenantId?: string;

  constructor(config: PleasanterConfig, rateLimitConfig?: Partial<RateLimitConfig>) {
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

  private async makeRequest<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    await this.rateLimiter.waitIfNeeded();

    try {
      const config: any = { params };
      const authPayload = this.auth.getAuthPayload();

      // Include auth in request body for POST/PUT, or as params for GET/DELETE
      if (method === 'get' || method === 'delete') {
        config.params = { ...(params || {}), ...authPayload };
      } else {
        const dataObj = (typeof data === 'object' && data !== null) ? data : {};
        data = { ...dataObj, ...authPayload };
      }

      const response = await this.httpClient[method]<T>(path, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): PleasanterError {
    if (axios.isAxiosError(error)) {
      const pleError = new Error(
        error.message || 'Pleasanter API request failed'
      ) as PleasanterError;
      pleError.statusCode = error.response?.status;
      pleError.responseData = error.response?.data;
      return pleError;
    }
    return error as PleasanterError;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>('get', '/api/items/get', {});
      return !!response;
    } catch {
      return false;
    }
  }

  async getOrganizations(
    options?: PaginationOptions
  ): Promise<PaginatedResponse<Organization>> {
    const paginationParams = Paginator.buildQueryParams(options);
    const response = await this.makeRequest<any>('get', '/api/sites/get', {}, paginationParams);

    return Paginator.createResponse(
      Array.isArray(response) ? response : [response],
      (options?.page ?? 1),
      (options?.pageSize ?? DEFAULT_PAGE_SIZE),
      Array.isArray(response) ? response.length : 1
    );
  }

  async getOrganizationById(organizationId: string): Promise<Organization> {
    const response = await this.makeRequest<any>(
      'get',
      `/api/items/${organizationId}`,
      {}
    );
    return this.mapToOrganization(response);
  }

  async getUsers(
    organizationId?: string,
    options?: PaginationOptions
  ): Promise<PaginatedResponse<User>> {
    const paginationParams = Paginator.buildQueryParams(options);
    const path = organizationId ? `/api/items/${organizationId}/users` : '/api/users/get';

    const response = await this.makeRequest<any>('get', path, {}, paginationParams);

    return Paginator.createResponse(
      Array.isArray(response) ? response : [response],
      (options?.page ?? 1),
      (options?.pageSize ?? DEFAULT_PAGE_SIZE),
      Array.isArray(response) ? response.length : 1
    );
  }

  async getUserById(userId: string): Promise<User> {
    const response = await this.makeRequest<any>('get', `/api/users/${userId}`, {});
    return this.mapToUser(response);
  }

  async getDepartments(
    organizationId?: string,
    options?: PaginationOptions
  ): Promise<PaginatedResponse<Department>> {
    const paginationParams = Paginator.buildQueryParams(options);
    const path = organizationId ? `/api/items/${organizationId}/departments` : '/api/departments/get';

    const response = await this.makeRequest<any>('get', path, {}, paginationParams);

    return Paginator.createResponse(
      Array.isArray(response) ? response : [response],
      (options?.page ?? 1),
      (options?.pageSize ?? DEFAULT_PAGE_SIZE),
      Array.isArray(response) ? response.length : 1
    );
  }

  async getDepartmentById(departmentId: string): Promise<Department> {
    const response = await this.makeRequest<any>('get', `/api/departments/${departmentId}`, {});
    return this.mapToDepartment(response);
  }

  async getRecords(
    organizationId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    const paginationParams = Paginator.buildQueryParams(options);
    const response = await this.makeRequest<any>(
      'get',
      `/api/items/${organizationId}/records`,
      {},
      paginationParams
    );

    return Paginator.createResponse(
      Array.isArray(response) ? response : [response],
      (options?.page ?? 1),
      (options?.pageSize ?? DEFAULT_PAGE_SIZE),
      Array.isArray(response) ? response.length : 1
    );
  }

  async getRecordById(
    organizationId: string,
    recordId: string
  ): Promise<Record<string, unknown>> {
    return this.makeRequest<Record<string, unknown>>(
      'get',
      `/api/items/${organizationId}/records/${recordId}`,
      {}
    );
  }

  getRemainingRequests(): number {
    return this.rateLimiter.getRemainingRequests();
  }

  resetRateLimit(): void {
    this.rateLimiter.resetWindow();
  }

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  getTenantId(): string | undefined {
    return this.tenantId;
  }

  private mapToOrganization(data: unknown): Organization {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid organization data');
    }

    const org = data as Record<string, unknown>;
    return {
      id: String(org.id || ''),
      name: String(org.name || org.Title || ''),
      code: org.code ? String(org.code) : undefined,
      tenantId: this.tenantId,
    };
  }

  private mapToUser(data: unknown): User {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid user data');
    }

    const user = data as Record<string, unknown>;
    return {
      id: String(user.id || user.UserId || ''),
      name: String(user.name || user.Name || ''),
      email: user.email ? String(user.email) : undefined,
      departmentId: user.departmentId ? String(user.departmentId) : undefined,
      tenantId: this.tenantId,
    };
  }

  private mapToDepartment(data: unknown): Department {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid department data');
    }

    const dept = data as Record<string, unknown>;
    return {
      id: String(dept.id || dept.DeptId || ''),
      name: String(dept.name || dept.DeptName || ''),
      parentId: dept.parentId ? String(dept.parentId) : undefined,
      tenantId: this.tenantId,
    };
  }
}
