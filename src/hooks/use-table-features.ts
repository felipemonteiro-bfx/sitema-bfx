"use client";

import { useMemo, useState } from "react";

// Fuzzy search: matches characters in order (not necessarily adjacent)
function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

// Score: lower is better match (fewer gaps between matched chars)
function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let score = 0;
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return Infinity;
    score += idx - ti;
    ti = idx + 1;
  }
  // Bonus: exact substring match
  if (t.includes(q)) return -1000 + t.indexOf(q);
  return score;
}

export type SortDir = "asc" | "desc";

interface UseTableFeaturesOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  defaultSort?: keyof T;
  defaultSortDir?: SortDir;
  pageSize?: number;
}

export function useTableFeatures<T extends Record<string, unknown>>({
  data,
  searchFields,
  defaultSort,
  defaultSortDir = "asc",
  pageSize = 15,
}: UseTableFeaturesOptions<T>) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof T | undefined>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);
  const [page, setPage] = useState(1);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.trim();
    return data
      .filter((item) =>
        searchFields.some((field) => {
          const val = item[field];
          if (val == null) return false;
          return fuzzyMatch(String(val), q);
        })
      )
      .sort((a, b) => {
        const scoreA = Math.min(
          ...searchFields.map((f) =>
            a[f] != null ? fuzzyScore(String(a[f]), q) : Infinity
          )
        );
        const scoreB = Math.min(
          ...searchFields.map((f) =>
            b[f] != null ? fuzzyScore(String(b[f]), q) : Infinity
          )
        );
        return scoreA - scoreB;
      });
  }, [data, search, searchFields]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      let cmp = 0;
      if (typeof va === "string" && typeof vb === "string") {
        cmp = va.localeCompare(vb, "pt-BR");
      } else if (va instanceof Date && vb instanceof Date) {
        cmp = va.getTime() - vb.getTime();
      } else if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), "pt-BR");
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [filtered, sortField, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedData = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );

  const toggleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return {
    search,
    setSearch: handleSearch,
    sortField,
    sortDir,
    toggleSort,
    page: safePage,
    setPage,
    totalPages,
    totalFiltered: filtered.length,
    paginatedData,
  };
}
