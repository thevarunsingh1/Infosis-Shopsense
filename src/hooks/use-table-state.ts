import { useMemo, useState } from "react";

export function useTableState<T>(rows: T[], searchFields: (row: T) => string, pageSize = 8) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => searchFields(row).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);

  return {
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    page: current,
    setPage,
    pageCount,
    total: filtered.length,
    rows: paged,
  };
}
