const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const api = {
  assets: {
    list: (filters: AssetFilters = {}) => {
      const params = new URLSearchParams();
      if (filters.type) params.set('type', filters.type);
      if (filters.tags?.length) params.set('tags', filters.tags.join(','));
      if (filters.tag_op) params.set('tag_op', filters.tag_op);
      if (filters.q) params.set('q', filters.q);
      if (filters.flagged) params.set('flagged', filters.flagged);
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.per_page) params.set('per_page', String(filters.per_page));
      return request<PaginatedResponse<any>>(`/assets?${params}`);
    },
    get: (id: string) => request<any>(`/assets/${id}`),
    patch: (id: string, fields: Record<string, unknown>) =>
      request<any>(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }),
  },
  nfts: {
    list: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params);
      return request<PaginatedResponse<any>>(`/nfts?${qs}`);
    },
    get: (tokenId: number) => request<any>(`/nfts/${tokenId}`),
    traits: () => request<Record<string, Record<string, number>>>('/nfts/traits'),
  },
  tags: {
    list: () => request<{ tag: string; description: string; count: number }[]>('/tags'),
  },
  export: (body: Record<string, unknown>) =>
    fetch(`${BASE}/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  status: () => request<any>('/status'),
};
