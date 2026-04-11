# Cycle B — Tech Spec

**Project:** media-assets (Gatorpedia)  
**Cycle:** B  

---

## Additional Dependencies

Install in `ui/`:
```bash
npx shadcn-ui@latest init   # if not already done
npx shadcn-ui@latest add sheet dialog command badge table card input textarea select checkbox separator skeleton toast button scroll-area popover
npm install @tanstack/react-virtual lucide-react clsx tailwind-merge
```

---

## ui/src/lib/utils.ts

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AssetType = 'tweet' | 'video' | 'gator-nft' | 'image' | 'gif' | 'article' | 'audio';

export const TYPE_COLORS: Record<AssetType, string> = {
  tweet: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  video: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  'gator-nft': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  image: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  gif: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  article: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  audio: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
};

export const TAG_TIER_COLORS = {
  tier2: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
  tier3: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
  tier4: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
  ai: 'bg-amber-50 text-amber-700 border-amber-300 border-dashed dark:bg-amber-950 dark:text-amber-300',
};
```

---

## ui/src/lib/api.ts (update from Cycle A)

```typescript
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
```

---

## ui/src/hooks/useAssets.ts

```typescript
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
```

---

## ui/src/hooks/useNFTs.ts

```typescript
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
```

---

## ui/src/hooks/useTags.ts

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useTaxonomyTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list(),
    staleTime: 60 * 1000,
  });
}
```

---

## ui/src/components/layout/NavBar.tsx

```typescript
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function NavBar() {
  const { pathname } = useLocation();
  const [dark, setDark] = useState(() =>
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors hover:text-foreground/80 ${pathname === to ? 'text-foreground' : 'text-foreground/60'}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="flex h-14 items-center px-6 gap-6">
        <span className="text-lg font-bold">🐊 Gatorpedia</span>
        <nav className="flex gap-4">
          {navLink('/', 'Browse')}
          {navLink('/nfts', 'NFTs')}
          {navLink('/review', 'Review Queue')}
        </nav>
        <div className="ml-auto">
          <Button variant="ghost" size="icon" onClick={() => setDark(d => !d)}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
```

---

## ui/src/components/TagEditor.tsx

```typescript
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, Plus } from 'lucide-react';
import { useTaxonomyTags } from '../hooks/useTags';
import { usePatchAsset } from '../hooks/useAssets';
import { TAG_TIER_COLORS } from '../lib/utils';
import { useToast } from '@/components/ui/use-toast';

// Tier membership lookup — built from taxonomy tags response
// Tags in the response include a `tier` field we'll add to the API
function getTagClass(tag: string, isAI: boolean, tierMap: Record<string, string>) {
  if (isAI) return TAG_TIER_COLORS.ai;
  const tier = tierMap[tag];
  return TAG_TIER_COLORS[tier as keyof typeof TAG_TIER_COLORS] || TAG_TIER_COLORS.tier2;
}

interface TagEditorProps {
  asset: any;
}

export function TagEditor({ asset }: TagEditorProps) {
  const { data: taxonomyTags = [] } = useTaxonomyTags();
  const patchAsset = usePatchAsset();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isAITagged = asset.flagged_by === 'ai';
  const tagSet = new Set(asset.tags || []);

  // Build tier map from taxonomy response
  const tierMap: Record<string, string> = {};
  taxonomyTags.forEach((t: any) => { tierMap[t.tag] = t.tier || 'tier2'; });

  const patch = async (fields: Record<string, unknown>) => {
    try {
      await patchAsset.mutateAsync({ id: asset.id, fields });
      toast({ description: 'Saved', duration: 1500 });
    } catch {
      toast({ description: 'Save failed', variant: 'destructive' });
    }
  };

  const removeTag = (tag: string) => {
    patch({ tags: asset.tags.filter((t: string) => t !== tag) });
  };

  const addTag = (tag: string) => {
    if (!tagSet.has(tag)) {
      patch({ tags: [...(asset.tags || []), tag] });
    }
    setOpen(false);
  };

  const approveAll = () => {
    patch({ flagged_by: 'human', flagged_at: new Date().toISOString() });
  };

  const approveTag = (tag: string) => {
    // Approving a single tag just promotes the whole record for now
    patch({ flagged_by: 'human', flagged_at: new Date().toISOString() });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Tags</span>
        {isAITagged && (
          <Button size="sm" variant="outline" onClick={approveAll} className="text-xs h-7">
            Approve all
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(asset.tags || []).map((tag: string) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${getTagClass(tag, isAITagged, tierMap)}`}
          >
            {tag}
            {isAITagged && (
              <button onClick={() => approveTag(tag)} className="hover:text-green-600">
                <Check className="h-3 w-3" />
              </button>
            )}
            <button onClick={() => removeTag(tag)} className="hover:text-red-500 ml-0.5">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed text-muted-foreground hover:text-foreground">
              <Plus className="h-3 w-3" /> Add tag
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList className="max-h-64">
                {taxonomyTags
                  .filter((t: any) => !tagSet.has(t.tag))
                  .map((t: any) => (
                    <CommandItem key={t.tag} onSelect={() => addTag(t.tag)}>
                      <span className="font-medium">{t.tag}</span>
                      <span className="ml-2 text-muted-foreground text-xs truncate">{t.description}</span>
                    </CommandItem>
                  ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
```

---

## ui/src/components/AssetCard.tsx

```typescript
import { cn, TYPE_COLORS, AssetType } from '../lib/utils';

interface AssetCardProps {
  asset: any;
  onClick: () => void;
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
  const typeColor = TYPE_COLORS[asset.type as AssetType] || TYPE_COLORS.image;
  const isAIPending = asset.flagged_by === 'ai' && asset.tags?.length > 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border bg-card p-3 cursor-pointer hover:shadow-md transition-shadow',
        isAIPending && 'border-amber-300 dark:border-amber-700'
      )}
    >
      {/* Type chip */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}>
          {asset.type}
        </span>
        {isAIPending && (
          <span className="text-xs text-amber-600 dark:text-amber-400">needs review</span>
        )}
      </div>

      {/* NFT image */}
      {asset.type === 'gator-nft' && asset.gateway_image_url && (
        <img
          src={asset.gateway_image_url}
          alt={asset.name}
          className="w-full h-28 object-cover rounded mb-2"
          loading="lazy"
        />
      )}

      {/* Content preview */}
      <div className="text-sm text-foreground line-clamp-2 mb-2">
        {asset.text || asset.visual_summary || asset.filename || asset.name || asset.id}
      </div>

      {/* Meta */}
      <div className="text-xs text-muted-foreground mb-2">
        {asset.type === 'tweet' && asset.author_handle && `@${asset.author_handle}`}
        {asset.type === 'gator-nft' && `#${asset.token_id}`}
        {asset.created_at && (
          <span className="ml-2">
            {new Date(asset.created_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Stats for tweets */}
      {asset.type === 'tweet' && asset.stats && (
        <div className="text-xs text-muted-foreground mb-2 flex gap-3">
          {asset.stats.likes > 0 && <span>💙 {asset.stats.likes.toLocaleString()}</span>}
          {asset.stats.retweets > 0 && <span>🔁 {asset.stats.retweets}</span>}
        </div>
      )}

      {/* Tags */}
      {asset.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {asset.tags.slice(0, 3).map((tag: string) => (
            <span key={tag} className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {asset.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{asset.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## ui/src/components/FilterSidebar.tsx

```typescript
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useTaxonomyTags } from '../hooks/useTags';
import { AssetFilters } from '../lib/api';

const ASSET_TYPES = ['tweet', 'video', 'gator-nft', 'image', 'gif', 'article', 'audio'];
const REVIEW_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'ai', label: 'Needs Review' },
  { value: 'human', label: 'Approved' },
  { value: 'untagged', label: 'Untagged' },
];

interface FilterSidebarProps {
  filters: AssetFilters;
  onChange: (filters: AssetFilters) => void;
}

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const { data: tags = [] } = useTaxonomyTags();
  const [tagSearch, setTagSearch] = useState('');

  const toggleType = (type: string) => {
    onChange({ ...filters, type: filters.type === type ? undefined : type, page: 1 });
  };

  const toggleTag = (tag: string) => {
    const current = filters.tags || [];
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    onChange({ ...filters, tags: next.length ? next : undefined, page: 1 });
  };

  const clearAll = () => onChange({ page: 1 });

  const hasFilters = !!(filters.type || filters.tags?.length || filters.flagged || filters.q);

  return (
    <aside className="w-56 shrink-0 space-y-4 pr-4 border-r">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Filters</span>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
            Clear all
          </Button>
        )}
      </div>

      {/* Asset Type */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Type</p>
        <div className="space-y-1.5">
          {ASSET_TYPES.map(type => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.type === type}
                onCheckedChange={() => toggleType(type)}
              />
              <span className="text-sm capitalize">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Tags */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Tags</p>
        <input
          placeholder="Search tags..."
          value={tagSearch}
          onChange={e => setTagSearch(e.target.value)}
          className="w-full text-sm border rounded px-2 py-1 mb-2 bg-background"
        />
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {tags
            .filter((t: any) => t.tag.includes(tagSearch.toLowerCase()))
            .map((t: any) => (
              <label key={t.tag} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(filters.tags || []).includes(t.tag)}
                  onCheckedChange={() => toggleTag(t.tag)}
                />
                <span className="text-sm">{t.tag}</span>
                {t.count > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">{t.count}</span>
                )}
              </label>
            ))}
        </div>
      </div>

      <Separator />

      {/* Review Status */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Status</p>
        <div className="space-y-1.5">
          {REVIEW_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="flagged"
                checked={(filters.flagged || '') === opt.value}
                onChange={() => onChange({ ...filters, flagged: opt.value as any || undefined, page: 1 })}
                className="accent-primary"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
```

---

## ui/src/components/ReviewQueue.tsx — Key Logic

```typescript
// Keyboard handler — attach to document when component is mounted
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'a' || e.key === 'A') approveAll(focused);
    if (e.key === 's' || e.key === 'S') skip(focused);
    if (e.key === 'r' || e.key === 'R') rejectAll(focused);
    if (e.key === 'ArrowDown' || e.key === 'j') setFocused(i => Math.min(i + 1, assets.length - 1));
    if (e.key === 'ArrowUp' || e.key === 'k') setFocused(i => Math.max(i - 1, 0));
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [focused, assets]);
```

---

## NFT Virtual Scrolling

Use `@tanstack/react-virtual` for the NFT grid. Load all 4,000 NFTs in pages and virtualise the DOM:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const COLUMNS = 5; // adjust based on container width
const ROW_HEIGHT = 200;

const rowVirtualizer = useVirtualizer({
  count: Math.ceil(nfts.length / COLUMNS),
  getScrollElement: () => parentRef.current,
  estimateSize: () => ROW_HEIGHT,
  overscan: 3,
});
```

---

## Taxonomy API Update (Backend)

The `GET /api/tags` response needs a `tier` field so the frontend can color tags correctly. Update `src/routes/tags.js`:

```javascript
// Add tier mapping from taxonomy parser
const { getAllTags, getTagsByTier } = require('../taxonomy');

router.get('/', (req, res) => {
  const tier2 = getTagsByTier('tier2');
  const tier3 = getTagsByTier('tier3');
  const tier4 = getTagsByTier('tier4');

  // Count usage
  const counts = {};
  const allAssets = registry.getAll({ perPage: 10000 }).data;
  for (const asset of allAssets) {
    for (const tag of (asset.tags || [])) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }

  const result = [
    ...Object.entries(tier2).map(([tag, desc]) => ({ tag, description: desc, tier: 'tier2', count: counts[tag] || 0 })),
    ...Object.entries(tier3).map(([tag, desc]) => ({ tag, description: desc, tier: 'tier3', count: counts[tag] || 0 })),
    ...Object.entries(tier4).map(([tag, desc]) => ({ tag, description: desc, tier: 'tier4', count: counts[tag] || 0 })),
  ];

  res.json(result);
});
```

---

## Commit Message

```
feat[media-assets] cycle B - full Gatorpedia UI
```
