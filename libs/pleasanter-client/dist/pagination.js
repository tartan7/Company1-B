export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 1000;
export class Paginator {
    static validateOptions(options) {
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
    static createResponse(data, page, pageSize, total) {
        return {
            data,
            page,
            pageSize,
            total,
            hasMore: page * pageSize < total,
        };
    }
    static buildQueryParams(options) {
        const validated = this.validateOptions(options);
        return {
            page: validated.page ?? 1,
            pageSize: validated.pageSize ?? DEFAULT_PAGE_SIZE,
        };
    }
    static *generatePages(total, pageSize = DEFAULT_PAGE_SIZE) {
        let page = 1;
        while ((page - 1) * pageSize < total) {
            yield page;
            page++;
        }
    }
}
Paginator.DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE;
Paginator.MAX_PAGE_SIZE = MAX_PAGE_SIZE;
//# sourceMappingURL=pagination.js.map