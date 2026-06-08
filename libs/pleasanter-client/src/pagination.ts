import { PaginationOptions, PaginatedResponse } from './types.js';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 1000;

export class Paginator {
  static readonly DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE;
  static readonly MAX_PAGE_SIZE = MAX_PAGE_SIZE;

  static validateOptions(options?: PaginationOptions): PaginationOptions {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

    if (page < 1) {
      throw new Error('Page must be >= 1');
    }

    if (pageSize < 1) {
      throw new Error('Page size must be >= 1');
    }

    if (pageSize > MAX_PAGE_SIZE) {
      throw new Error(`Page size cannot exceed ${MAX_PAGE_SIZE}`);
    }

    return { page, pageSize };
  }

  static createResponse<T>(
    data: T[],
    page: number,
    pageSize: number,
    total: number
  ): PaginatedResponse<T> {
    return {
      data,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  static buildQueryParams(options?: PaginationOptions): Record<string, number> {
    const validated = this.validateOptions(options);
    return {
      page: validated.page ?? 1,
      pageSize: validated.pageSize ?? DEFAULT_PAGE_SIZE,
    };
  }

  static *generatePages(total: number, pageSize: number = DEFAULT_PAGE_SIZE): Generator<number> {
    let page = 1;
    while ((page - 1) * pageSize < total) {
      yield page;
      page++;
    }
  }
}
