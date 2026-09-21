import { useEffect, useMemo, useState } from 'react';
import { TABLE_PAGE_SIZE } from '@/constants/table';

export function useClientPagination<T>(
  items: T[],
  pageSize: number = TABLE_PAGE_SIZE,
) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  return {
    page: safePage,
    setPage,
    totalPages,
    pageItems,
    pageSize,
  };
}
