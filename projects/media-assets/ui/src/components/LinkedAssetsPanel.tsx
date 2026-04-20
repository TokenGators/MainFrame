import { useState } from 'react';
import { ArrowRight, X, Plus, Heart, Repeat2, Eye, Clock } from 'lucide-react';
import { TYPE_COLORS } from '../lib/utils';
import { useAsset, usePatchAsset } from '../hooks/useAssets';
import { api } from '../lib/api';
import { stripUrls } from '../lib/platforms';
import { useToast } from '@/components/ui/use-toast';
import { useEffect, useRef } from 'react';

interface LinkedAssetsPanelProps {
  asset: any;
  onNavigate: (id: string) => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const TWEET_TYPES = new Set(['post', 'retweet', 'quote-tweet']);

function thumbUrl(a: any): string | null {
  if (!a) return null;
  if (a.type === 'nft') return `/api/assets/${a.id}/image`;
  if (a.type === 'image' || a.type === 'gif') {
    return a.url
      ? a.url.startsWith('/')
        ? `http://localhost:3001${a.url}`
        : a.url
      : null;
  }
  if (TWEET_TYPES.has(a.type)) {
    return a.media?.[0]?.url || null;
  }
  return null;
}

function fmtDate(iso: string | undefined) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function fmtNum(n: number | undefined) {
  if (!n) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ─── per-type card bodies ────────────────────────────────────────────────────

function TweetBody({ a }: { a: any }) {
  const text = stripUrls(a.text || '').trim();
  const stats = a.stats || {};
  const hasStats = stats.likes || stats.retweets || stats.impressions;
  const thumb = thumbUrl(a);

  return (
    <div className="flex gap-2 min-w-0">
      {thumb && (
        <img
          src={thumb}
          alt=""
          className="w-10 h-10 shrink-0 object-cover bg-black/30 border border-[#33ff33]/10"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          {a.author_handle && (
            <span className="text-[10px] text-[#33ff33]/60 font-mono">@{a.author_handle}</span>
          )}
          {a.created_at && (
            <span className="text-[10px] text-[#33ff33]/30">· {fmtDate(a.created_at)}</span>
          )}
        </div>
        {text && (
          <p className="text-xs text-[#E0E0E0]/90 leading-relaxed line-clamp-3">
            {text}
          </p>
        )}
        {hasStats && (
          <div className="flex items-center gap-3 mt-1.5">
            {stats.likes > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-[#33ff33]/40">
                <Heart className="h-2.5 w-2.5" /> {fmtNum(stats.likes)}
              </span>
            )}
            {stats.retweets > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-[#33ff33]/40">
                <Repeat2 className="h-2.5 w-2.5" /> {fmtNum(stats.retweets)}
              </span>
            )}
            {stats.impressions > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-[#33ff33]/40">
                <Eye className="h-2.5 w-2.5" /> {fmtNum(stats.impressions)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ImageBody({ a }: { a: any }) {
  const thumb = thumbUrl(a);
  const summary = a.visual_summary || a.alt_text || a.name || null;

  return (
    <div className="flex gap-2 min-w-0">
      {thumb && (
        <img
          src={thumb}
          alt=""
          className="w-12 h-12 shrink-0 object-contain bg-black/40 border border-[#33ff33]/10"
        />
      )}
      <div className="min-w-0 flex-1">
        {a.name && <p className="text-[10px] text-[#33ff33]/60 font-mono mb-0.5 truncate">{a.name}</p>}
        {summary && (
          <p className="text-xs text-[#E0E0E0]/80 leading-relaxed line-clamp-3">{summary}</p>
        )}
        {!thumb && !summary && (
          <p className="text-xs text-[#33ff33]/30 italic">{a.id}</p>
        )}
      </div>
    </div>
  );
}

function NftBody({ a }: { a: any }) {
  const thumb = thumbUrl(a);
  const traits = (a.traits || []).slice(0, 5);

  return (
    <div className="flex gap-2 min-w-0">
      {thumb && (
        <img
          src={thumb}
          alt=""
          className="w-12 h-12 shrink-0 object-contain bg-black/40 border border-[#33ff33]/10"
          onError={(e) => {
            if (a.gateway_image_url) (e.target as HTMLImageElement).src = a.gateway_image_url;
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#E0E0E0] font-medium mb-0.5 truncate">{a.name || `NFT #${a.token_id}`}</p>
        {traits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {traits.map((t: any) => (
              <span
                key={t.trait_type}
                className="text-[9px] px-1 py-0 bg-[#33ff33]/8 text-[#33ff33]/60 border border-[#33ff33]/15"
              >
                {t.trait_type}: {t.value}
              </span>
            ))}
          </div>
        )}
        {a.visual_summary && (
          <p className="text-[10px] text-[#E0E0E0]/60 mt-1 line-clamp-2">{a.visual_summary}</p>
        )}
      </div>
    </div>
  );
}

function VideoBody({ a }: { a: any }) {
  const dur = a.duration_seconds
    ? `${Math.floor(a.duration_seconds / 60)}:${String(a.duration_seconds % 60).padStart(2, '0')}`
    : null;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        {a.name || a.filename ? (
          <p className="text-xs text-[#E0E0E0] font-medium truncate">{a.name || a.filename}</p>
        ) : null}
        {dur && (
          <span className="flex items-center gap-0.5 text-[10px] text-[#33ff33]/40 shrink-0">
            <Clock className="h-2.5 w-2.5" /> {dur}
          </span>
        )}
      </div>
      {a.visual_summary && (
        <p className="text-xs text-[#E0E0E0]/70 leading-relaxed line-clamp-2">{a.visual_summary}</p>
      )}
    </div>
  );
}

function DefaultBody({ a }: { a: any }) {
  const label = a.name || a.text?.slice(0, 80) || a.id;
  return <p className="text-xs text-[#E0E0E0]/80 truncate">{label}</p>;
}

// ─── single linked asset card ────────────────────────────────────────────────

function LinkedAssetCard({
  id,
  onRemove,
  onNavigate,
}: {
  id: string;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const { data: linked, isLoading } = useAsset(id);

  if (isLoading) {
    return (
      <div className="px-3 py-2.5 bg-[#28272a] border border-[#33ff33]/10 animate-pulse">
        <div className="h-3 w-24 bg-[#33ff33]/10 rounded mb-1.5" />
        <div className="h-2 w-full bg-[#33ff33]/8 rounded" />
      </div>
    );
  }

  if (!linked) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#28272a] border border-red-900/30">
        <span className="text-[10px] text-red-400/50 font-mono truncate flex-1">{id}</span>
        <span className="text-[9px] text-red-400/40 italic">not found</span>
        <button onClick={onRemove} className="text-red-400/40 hover:text-red-400 transition-colors">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[linked.type as keyof typeof TYPE_COLORS] || TYPE_COLORS.image;

  const bodyEl = TWEET_TYPES.has(linked.type) ? (
    <TweetBody a={linked} />
  ) : linked.type === 'nft' ? (
    <NftBody a={linked} />
  ) : linked.type === 'image' || linked.type === 'gif' ? (
    <ImageBody a={linked} />
  ) : linked.type === 'video' ? (
    <VideoBody a={linked} />
  ) : (
    <DefaultBody a={linked} />
  );

  return (
    <div className="group bg-[#1e1d20] border border-[#33ff33]/12 hover:border-[#33ff33]/30 transition-all duration-200">
      {/* Card header row */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-0">
        <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider shrink-0 ${typeColor}`}>
          {linked.type}
        </span>
        <div className="flex-1" />
        <button
          onClick={onNavigate}
          title="Open this asset"
          className="text-[#33ff33]/20 hover:text-[#33ff33]/80 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRemove}
          title="Remove link"
          className="text-[#33ff33]/15 hover:text-red-400/70 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Card body */}
      <div
        className="px-3 pb-2.5 pt-1.5 cursor-pointer"
        onClick={onNavigate}
      >
        {bodyEl}
      </div>
    </div>
  );
}

// ─── main panel ──────────────────────────────────────────────────────────────

export function LinkedAssetsPanel({ asset, onNavigate }: LinkedAssetsPanelProps) {
  const patchAsset = usePatchAsset();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const linkedIds: string[] = asset?.linked_assets || [];

  // ── linked asset data for type chips ──────────────────────────────────────
  // We load all to derive available types for filter chips. Simple approach:
  // use what we know from existing cards (they self-load).
  // Derive from the list by fetching? Instead, just offer a simple set of known types.
  // The type chips will only show types that actually exist in the linked set.

  const save = async (next: string[]) => {
    try {
      await patchAsset.mutateAsync({ id: asset.id, fields: { linked_assets: next } });
    } catch {
      toast({ variant: 'destructive', description: 'Failed to save linked assets' });
    }
  };

  const removeLink = (id: string) => save(linkedIds.filter((l) => l !== id));
  const addLink = (id: string) => {
    if (linkedIds.includes(id)) return;
    save([...linkedIds, id]);
    setQuery('');
    setResults([]);
    setSearching(false);
  };

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const data = await api.assets.list({ q: query, per_page: 8 });
        setResults(
          (data.data || []).filter((r: any) => r.id !== asset.id && !linkedIds.includes(r.id))
        );
      } catch {
        setResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);
  }, [query]);

  if (linkedIds.length === 0 && !searching) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#33ff33]">
            Publishing History
          </p>
          <button
            onClick={() => setSearching(true)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#33ff33]/50 hover:text-[#33ff33] border border-dashed border-[#33ff33]/25 hover:border-[#33ff33]/50 px-1.5 py-0.5 transition-all duration-200"
          >
            <Plus className="h-2.5 w-2.5" /> Link asset
          </button>
        </div>
        {searching ? null : (
          <p className="text-[10px] text-[#33ff33]/25 italic">No linked assets yet</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#33ff33]">
          Publishing History
          <span className="ml-1.5 text-[#33ff33]/40">({linkedIds.length})</span>
        </p>
        <div className="flex-1" />
        <button
          onClick={() => setSearching((v) => !v)}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#33ff33]/50 hover:text-[#33ff33] border border-dashed border-[#33ff33]/25 hover:border-[#33ff33]/50 px-1.5 py-0.5 transition-all duration-200"
        >
          <Plus className="h-2.5 w-2.5" /> Link
        </button>
      </div>

      {/* Type filter chips — rendered by a sub-component that loads all assets */}
      <TypeFilterChips linkedIds={linkedIds} activeType={typeFilter} onSelect={setTypeFilter} />

      {/* Search input */}
      {searching && (
        <div className="mb-3 relative">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setSearching(false); setQuery(''); setResults([]); }
            }}
            placeholder="Search by ID or text…"
            className={[
              'w-full text-xs px-2 py-1.5',
              'bg-[#28272a] text-[#E0E0E0]',
              'border border-[#33ff33]/30 focus:border-[#33ff33]/70',
              'placeholder-[#33ff33]/25 focus:outline-none',
            ].join(' ')}
          />
          {results.length > 0 && (
            <div className="absolute z-50 w-full mt-0.5 bg-[#1a191c] border border-[#33ff33]/30 max-h-52 overflow-y-auto shadow-xl">
              {results.map((r: any) => {
                const typeColor = TYPE_COLORS[r.type as keyof typeof TYPE_COLORS] || TYPE_COLORS.image;
                const displayText =
                  r.name ||
                  stripUrls(r.text || '').trim().slice(0, 60) ||
                  r.id;
                const thumb = thumbUrl(r);
                return (
                  <button
                    key={r.id}
                    onClick={() => addLink(r.id)}
                    className="w-full flex items-center gap-2 px-2 py-2 text-left hover:bg-[#33ff33]/8 transition-colors border-b border-[#33ff33]/8 last:border-0"
                  >
                    {thumb && (
                      <img
                        src={thumb}
                        alt=""
                        className="w-7 h-7 shrink-0 object-cover bg-black/30"
                        onError={(e) => {
                          if (r.gateway_image_url) (e.target as HTMLImageElement).src = r.gateway_image_url;
                        }}
                      />
                    )}
                    <span className={`text-[9px] px-1 py-0 font-bold uppercase shrink-0 ${typeColor}`}>
                      {r.type}
                    </span>
                    <span className="text-[10px] text-[#E0E0E0] truncate flex-1">{displayText}</span>
                  </button>
                );
              })}
              {loadingSearch && (
                <div className="px-2 py-1.5 text-[10px] text-[#33ff33]/40">Searching…</div>
              )}
            </div>
          )}
          {query.length > 1 && !loadingSearch && results.length === 0 && (
            <div className="mt-0.5 px-2 py-1.5 text-[10px] text-[#33ff33]/30 bg-[#1a191c] border border-[#33ff33]/20">
              No results
            </div>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="space-y-1.5">
        <LinkedCardsList
          linkedIds={linkedIds}
          typeFilter={typeFilter}
          onRemove={removeLink}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

// ─── helper: renders all cards, applies type filter client-side ───────────────

function LinkedCardsList({
  linkedIds,
  typeFilter,
  onRemove,
  onNavigate,
}: {
  linkedIds: string[];
  typeFilter: string | null;
  onRemove: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  return (
    <>
      {linkedIds.map((id) => (
        <FilteredCard
          key={id}
          id={id}
          typeFilter={typeFilter}
          onRemove={() => onRemove(id)}
          onNavigate={() => onNavigate(id)}
        />
      ))}
    </>
  );
}

/** Loads the asset to check type before deciding whether to render */
function FilteredCard({
  id,
  typeFilter,
  onRemove,
  onNavigate,
}: {
  id: string;
  typeFilter: string | null;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const { data: linked } = useAsset(id);
  if (typeFilter && linked && linked.type !== typeFilter) return null;
  return (
    <LinkedAssetCard id={id} onRemove={onRemove} onNavigate={onNavigate} />
  );
}

// ─── type filter chips ────────────────────────────────────────────────────────

function TypeFilterChips({
  linkedIds,
  activeType,
  onSelect,
}: {
  linkedIds: string[];
  activeType: string | null;
  onSelect: (type: string | null) => void;
}) {
  // Collect types from loaded assets
  const types = useLinkedTypes(linkedIds);

  if (types.size <= 1) return null;

  const typeList = Array.from(types).sort();

  return (
    <div className="flex flex-wrap gap-1 mb-3">
      <button
        onClick={() => onSelect(null)}
        className={[
          'text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider transition-all duration-200',
          activeType === null
            ? 'bg-[#33ff33]/20 text-[#33ff33] border border-[#33ff33]/50'
            : 'bg-transparent text-[#33ff33]/40 border border-[#33ff33]/20 hover:border-[#33ff33]/40 hover:text-[#33ff33]/70',
        ].join(' ')}
      >
        All
      </button>
      {typeList.map((type) => {
        const colors = TYPE_COLORS[type as keyof typeof TYPE_COLORS] || TYPE_COLORS.image;
        const active = activeType === type;
        return (
          <button
            key={type}
            onClick={() => onSelect(active ? null : type)}
            className={[
              'text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider transition-all duration-200 border',
              active ? colors + ' opacity-100' : colors + ' opacity-40 hover:opacity-70',
            ].join(' ')}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}

/** Collect distinct types from a list of asset IDs */
function useLinkedTypes(ids: string[]): Set<string> {
  // We do individual useAsset calls — hook rules: fixed number of calls
  // Instead we collect from child renders. Workaround: use a stable ref approach.
  // Simpler: use a context or just load from the cache via a collector hook.
  // Here we use a pattern safe for hooks: map IDs to individual hooks.
  // React hooks can't be called in loops, so we cap at 20 and use a stable list.
  const capped = ids.slice(0, 20);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a0 = useAsset(capped[0] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a1 = useAsset(capped[1] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a2 = useAsset(capped[2] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a3 = useAsset(capped[3] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a4 = useAsset(capped[4] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a5 = useAsset(capped[5] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a6 = useAsset(capped[6] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a7 = useAsset(capped[7] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a8 = useAsset(capped[8] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a9 = useAsset(capped[9] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a10 = useAsset(capped[10] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a11 = useAsset(capped[11] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a12 = useAsset(capped[12] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a13 = useAsset(capped[13] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a14 = useAsset(capped[14] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a15 = useAsset(capped[15] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a16 = useAsset(capped[16] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a17 = useAsset(capped[17] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a18 = useAsset(capped[18] ?? null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const a19 = useAsset(capped[19] ?? null);

  const all = [a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15,a16,a17,a18,a19];
  const types = new Set<string>();
  all.forEach((q) => { if (q.data?.type) types.add(q.data.type); });
  return types;
}
