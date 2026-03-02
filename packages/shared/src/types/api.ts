/**
 * @file types/api.ts
 * @description Standard API response envelope types
 * @module @polaris/shared/types
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiSuccessPaginated<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
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
