/**
 * API 请求 Hook
 * 元征 · 合伙人赋能平台
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { get, post, put, patch, del } from '@/api/client';
import { useUIStore } from '@/stores';

/**
 * GET 请求 Hook
 */
export function useGet<T>(
  key: string | string[],
  url: string,
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, Error>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: () => get<T>(url, params),
    ...options,
  });
}

/**
 * POST 请求 Hook
 */
export function usePost<T, TVariables = unknown>(
  url: string,
  options?: Omit<UseMutationOptions<T, Error, TVariables>, 'mutationFn'>
) {
  const { addToast } = useUIStore();
  
  return useMutation<T, Error, TVariables>({
    mutationFn: (variables) => post<T>(url, variables),
    onError: (error) => {
      addToast({
        type: 'error',
        message: error.message || '操作失败',
      });
    },
    ...options,
  });
}

/**
 * PUT 请求 Hook
 */
export function usePut<T, TVariables = unknown>(
  url: string,
  options?: Omit<UseMutationOptions<T, Error, TVariables>, 'mutationFn'>
) {
  const { addToast } = useUIStore();
  
  return useMutation<T, Error, TVariables>({
    mutationFn: (variables) => put<T>(url, variables),
    onError: (error) => {
      addToast({
        type: 'error',
        message: error.message || '操作失败',
      });
    },
    ...options,
  });
}

/**
 * PATCH 请求 Hook
 */
export function usePatch<T, TVariables = unknown>(
  url: string,
  options?: Omit<UseMutationOptions<T, Error, TVariables>, 'mutationFn'>
) {
  const { addToast } = useUIStore();
  
  return useMutation<T, Error, TVariables>({
    mutationFn: (variables) => patch<T>(url, variables),
    onError: (error) => {
      addToast({
        type: 'error',
        message: error.message || '操作失败',
      });
    },
    ...options,
  });
}

/**
 * DELETE 请求 Hook
 */
export function useDelete<T>(
  url: string,
  options?: Omit<UseMutationOptions<T, Error, void>, 'mutationFn'>
) {
  const { addToast } = useUIStore();
  
  return useMutation<T, Error, void>({
    mutationFn: () => del<T>(url),
    onError: (error) => {
      addToast({
        type: 'error',
        message: error.message || '操作失败',
      });
    },
    ...options,
  });
}






