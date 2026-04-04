import type { Asset, PaginatedResponse, TaxonomyTag } from './types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export interface AssetFilters {
  type?: string;
  tags?: string[];
  tag_op?: 'and' | 'or';
  q?: string;
  flagged?: 'ai' | 'human' | 'untagged';
  sort?: 'created_at' | 'id' | 'likes';
  page?: number;
  per_page?: number;
}

export const api = {
  assets: {
    list: (filters: AssetFilters = {}): Promise<PaginatedResponse<Asset>> => {
      const params = new URLSearchParams();
      if (filters.type) params.set('type', filters.type);
      if (filters.tags?.length) params.set('tags', filters.tags.join(','));
      if (filters.tag_op) params.set('tag_op', filters.tag_op);
      if (filters.q) params.set('q', filters.q);
      if (filters.flagged) params.set('flagged', filters.flagged);
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.per_page) params.set('per_page', String(filters.per_page));
      return request<PaginatedResponse<Asset>>(`/assets?${params}`);
    },
    get: (id: string): Promise<Asset> => request<Asset>(`/assets/${id}`),
    patch: (id: string, fields: Record<string, unknown>): Promise<Asset> =>
      request<Asset>(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }),
  },
  nfts: {
    list: (params: Record<string, string> = {}): Promise<PaginatedResponse<Asset>> => {
      const qs = new URLSearchParams(params);
      return request<PaginatedResponse<Asset>>(`/nfts?${qs}`);
    },
    get: (tokenId: number): Promise<Asset> => request<Asset>(`/nfts/${tokenId}`),
    traits: (): Promise<Record<string, Record<string, number>>> =>
      request<Record<string, Record<string, number>>>('/nfts/traits'),
  },
  tags: {
    list: (): Promise<TaxonomyTag[]> => request<TaxonomyTag[]>('/tags'),
  },
  status: (): Promise<Record<string, unknown>> => request<Record<string, unknown>>('/status'),
};
