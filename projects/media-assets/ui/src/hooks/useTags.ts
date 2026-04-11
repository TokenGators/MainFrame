import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useTaxonomyTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list(),
    staleTime: 60 * 1000,
     });
}
