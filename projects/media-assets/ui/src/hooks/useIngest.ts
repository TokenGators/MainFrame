import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useIngestUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.ingest.url(url),
    onSuccess: () => {
      // New asset will appear after the grid re-fetches
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function usePendingIngests() {
  return useQuery({
    queryKey: ['ingest', 'pending'],
    queryFn: () => api.ingest.pending(),
    refetchInterval: (query) => {
      // Poll every 3s while something is processing; stop when idle
      const count = query.state.data?.count ?? 0;
      return count > 0 ? 3000 : false;
    },
  });
}
