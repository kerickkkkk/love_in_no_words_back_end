export interface Meta {
  pagination: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    nextPage: number | null;
    prevPage: number | null;
    from: number;
    to: number;
  };
}
