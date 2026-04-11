import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useNFTs(traitFilters: Record<string, string> = {}, page = 1) {
  const params: Record<string, string> = { page: String(page), per_page: '100' };
  for (const [k, v] of Object.entries(traitFilters)) {
    if (v) params[`trait_${k}`] = v;
  }
  return useQuery({
    queryKey: ['nfts', traitFilters, page],
    queryFn: () => api.nfts.list(params),
    });
}

export function useNFT(tokenId: number | null) {
  return useQuery({
    queryKey: ['nft', tokenId],
    queryFn: () => api.nfts.get(tokenId!),
    enabled: tokenId !== null,
    });
}

export function useNFTTraits() {
  return useQuery({
    queryKey: ['nft-traits'],
    queryFn: () => api.nfts.traits(),
    staleTime: 5 * 60 * 1000, // traits rarely change
    });
}
