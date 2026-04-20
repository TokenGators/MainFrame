import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { HolderFilters } from '../lib/types';

export function useHolders(filters: HolderFilters = {}) {
  return useQuery({
    queryKey: ['holders', filters],
    queryFn: () => api.holders.list(filters),
    staleTime: 60 * 1000,
  });
}

export function useHolderStats() {
  return useQuery({
    queryKey: ['holder-stats'],
    queryFn: () => api.holders.stats(),
    staleTime: 5 * 60 * 1000,
  });
}
