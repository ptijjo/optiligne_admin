export const ROUTES_PER_PAGE = 8;

export function paginate<T>(items: T[], page: number, perPage: number): {
  items: T[];
  page: number;
  pageCount: number;
} {
  const pageCount = Math.max(1, Math.ceil(items.length / perPage) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: safePage,
    pageCount,
  };
}
