/**
 * @file types/api.ts
 * @description Standard API response envelope types
 * @module @polaris/shared/types
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** Meta shape for list endpoints (matches backend: total, limit, offset) */
export interface PaginatedMeta {
  total:  number;
  limit:  number;
  offset: number;
}

export interface ApiSuccessPaginated<T> {
  success: true;
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
export type ApiResponsePaginated<T> = ApiSuccessPaginated<T> | ApiError;
