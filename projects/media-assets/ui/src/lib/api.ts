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
  type?: string;           // single type (legacy)
  types?: string[];        // multi-type filter
  media_type?: string;     // tweet media sub-filter: 'image' | 'video' | 'gif' | 'none'
  tags?: string[];
  tag_op?: 'and' | 'or';
  q?: string;
  flagged?: 'ai' | 'human' | 'untagged';
  has_linked?: boolean;
  linked_count?: 'none' | 'one' | 'multiple';
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
      if (filters.types?.length) params.set('types', filters.types.join(','));
      if (filters.media_type) params.set('media_type', filters.media_type);
      if (filters.tags?.length) params.set('tags', filters.tags.join(','));
      if (filters.tag_op) params.set('tag_op', filters.tag_op);
      if (filters.q) params.set('q', filters.q);
      if (filters.flagged) params.set('flagged', filters.flagged);
      if (filters.has_linked) params.set('has_linked', '1');
      if (filters.linked_count) params.set('linked_count', filters.linked_count);
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
    profile: (tokenId: number | string) => request<import('./types').NftProfile>(`/nfts/${tokenId}/profile`),
    traits: () => request<Record<string, Record<string, number>>>('/nfts/traits'),
  },
  holders: {
    list: (filters: import('./types').HolderFilters = {}) => {
      const params = new URLSearchParams();
      if (filters.q)       params.set('q', filters.q);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.chain  && filters.chain  !== 'all') params.set('chain',  filters.chain);
      if (filters.minter)  params.set('minter', '1');
      if (filters.sort)    params.set('sort',   filters.sort);
      if (filters.order)   params.set('order',  filters.order);
      if (filters.page)    params.set('page',   String(filters.page));
      if (filters.per_page) params.set('per_page', String(filters.per_page));
      if (filters.view)    params.set('view',   filters.view);
      if (filters.presale) params.set('presale', '1');
      return request<PaginatedResponse<import('./types').Holder>>(`/holders?${params}`);
    },
    stats: () => request<import('./types').HolderStats>('/holders/stats'),
    get: (wallet: string) => request<any>(`/holders/${wallet}`),
    profile: (wallet: string) => request<import('./types').CollectorProfile>(`/holders/${wallet}/profile`),
    updateIdentity: (wallet: string, fields: Record<string, string>) =>
      request<{ ok: boolean; updated: string[] }>(`/holders/${wallet}/identity`, {
        method: 'PATCH',
        body: JSON.stringify(fields),
      }),
  },
  tags: {
    list: () => request<{ tag: string; description: string; count: number }[]>('/tags'),
  },
  export: (body: Record<string, unknown>) =>
    fetch(`${BASE}/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  activity: {
    list: (params: { type?: string; chain?: string; wallet?: string; token_id?: number; page?: number; per_page?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.type)     qs.set('type',     params.type);
      if (params.chain)    qs.set('chain',    params.chain);
      if (params.wallet)   qs.set('wallet',   params.wallet);
      if (params.token_id !== undefined) qs.set('token_id', String(params.token_id));
      if (params.page)     qs.set('page',     String(params.page));
      if (params.per_page) qs.set('per_page', String(params.per_page));
      return request<import('./types').PaginatedResponse<import('./types').ActivityEvent>>(`/activity?${qs}`);
    },
    stats: () => request<{ total: number; mints: number; transfers: number; bridgeOut: number; bridgeIn: number; latest: string | null }>('/activity/stats'),
  },
  market: {
    get: () => request<import('./types').MarketResponse>('/market'),
  },
  sync: {
    start: () => request<{ status: string; startedAt: string }>('/sync', { method: 'POST' }),
    status: () => request<{
      running: boolean;
      lastStarted: string | null;
      lastCompleted: string | null;
      lastDuration: number | null;
      exitCode: number | null;
      log: string[];
    }>('/sync/status'),
  },
  status: () => request<any>('/status'),
  ingest: {
    url: (url: string) =>
      request<{ asset?: any; duplicate?: boolean }>('/ingest', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    pending: () => request<{ items: any[]; count: number }>('/ingest/pending'),
  },
};
