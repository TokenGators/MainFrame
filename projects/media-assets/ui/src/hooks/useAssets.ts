import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, AssetFilters } from '../lib/api';

export function useAssets(filters: AssetFilters) {
  return useQuery({
    queryKey: ['assets', filters],
    queryFn: () => api.assets.list(filters),
    placeholderData: (prev) => prev, // keep previous data while loading
   });
}

export function useAsset(id: string | null) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => api.assets.get(id!),
    enabled: !!id,
   });
}

export function usePatchAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Record<string, unknown> }) =>
      api.assets.patch(id, fields),
    onSuccess: (updated) => {
      // Update single asset cache
      queryClient.setQueryData(['asset', updated.id], updated);
      // Invalidate list queries so counts/filters reflect the change
      queryClient.invalidateQueries({ queryKey: ['assets'] });
     },
   });
}
