import { useState } from 'react';
import { Search, CheckSquare } from 'lucide-react';
import { AssetFilters } from '../lib/api';
import { useAssets } from '../hooks/useAssets';
import { AssetCard } from './AssetCard';
import { AssetDetail } from './AssetDetail';
import { FilterSidebar } from './FilterSidebar';
import { BulkActionBar } from './BulkActionBar';
import { IngestBar } from './IngestBar';
import { Skeleton } from '@/components/ui/skeleton';

const SORT_OPTIONS = [
  { value: 'created_at', label: 'NEWEST' },
  { value: 'id',         label: 'ID'     },
  { value: 'likes',      label: 'LIKES'  },
];

const SIZE_PRESETS = [
  { key: 'xs', label: 'XS', cols: 'grid-cols-6', perPage: 48 },
  { key: 'sm', label: 'S',  cols: 'grid-cols-5', perPage: 40 },
  { key: 'md', label: 'M',  cols: 'grid-cols-4', perPage: 32 },
  { key: 'lg', label: 'L',  cols: 'grid-cols-3', perPage: 24 },
  { key: 'xl', label: 'XL', cols: 'grid-cols-2', perPage: 16 },
] as const;

type SizeKey = typeof SIZE_PRESETS[number]['key'];

export function AssetBrowser() {
  const [filters, setFilters]           = useState<AssetFilters>({ page: 1, per_page: 32 });
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [sizeKey, setSizeKey]           = useState<SizeKey>('md');
  const [selectMode, setSelectMode]     = useState(false);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());

  const { data, isLoading } = useAssets(filters);

  const sortedAssets = [...(data?.data || [])].sort((a, b) => {
    if (filters.sort === 'created_at')
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (filters.sort === 'likes' && a.stats && b.stats)
      return (b.stats.likes || 0) - (a.stats.likes || 0);
    if (filters.sort === 'id')
      return String(b.id).localeCompare(String(a.id));
    return 0;
  });

  const activePreset = SIZE_PRESETS.find(p => p.key === sizeKey) ?? SIZE_PRESETS[2];

  const handleSizeChange = (key: SizeKey) => {
    const preset = SIZE_PRESETS.find(p => p.key === key)!;
    setSizeKey(key);
    setFilters(f => ({ ...f, per_page: preset.perPage, page: 1 }));
  };

  const toggleSelectMode = () => {
    setSelectMode(v => !v);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCardClick = (id: string) => {
    if (selectMode) {
      toggleSelect(id);
    } else {
      setSelectedAsset(id);
    }
  };

  const selectedAssets = sortedAssets.filter(a => selectedIds.has(a.id));

  return (
    <div className="flex h-[calc(100vh-45px)] bg-background">
      <FilterSidebar filters={filters} onChange={setFilters} />

      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#33ff33]/18 bg-[#1e1d20] shrink-0 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#33ff33]/50" />
            <input
              placeholder="Search assets..."
              value={filters.q || ''}
              onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
              className={[
                'w-full pl-8 pr-3 py-1.5 text-xs',
                'bg-[#28272a] text-[#E0E0E0]',
                'border border-[#33ff33]/20',
                'placeholder-[#33ff33]/30',
                'focus:outline-none focus:border-[#33ff33]/60',
              ].join(' ')}
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[#33ff33]/40 uppercase mr-1">SORT</span>
            {SORT_OPTIONS.map((opt) => {
              const active = (filters.sort || 'created_at') === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilters({ ...filters, sort: opt.value as any, page: 1 })}
                  className={[
                    'px-2 py-1 text-[10px] font-bold border transition-all duration-200',
                    active
                      ? 'text-[#33ff33] border-[#33ff33]/60 bg-[#33ff33]/10'
                      : 'text-[#33ff33]/50 border-[#33ff33]/20 hover:text-[#33ff33] hover:border-[#33ff33]/40',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Size */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[#33ff33]/40 uppercase mr-1">SIZE</span>
            {SIZE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handleSizeChange(preset.key)}
                className={[
                  'w-7 py-1 text-[10px] font-bold border transition-all duration-200',
                  sizeKey === preset.key
                    ? 'text-[#33ff33] border-[#33ff33]/60 bg-[#33ff33]/10'
                    : 'text-[#33ff33]/50 border-[#33ff33]/20 hover:text-[#33ff33] hover:border-[#33ff33]/40',
                ].join(' ')}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Select mode toggle */}
          <button
            onClick={toggleSelectMode}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold border transition-all duration-200',
              selectMode
                ? 'text-[#33ff33] border-[#33ff33]/60 bg-[#33ff33]/10'
                : 'text-[#33ff33]/50 border-[#33ff33]/20 hover:text-[#33ff33] hover:border-[#33ff33]/40',
            ].join(' ')}
          >
            <CheckSquare className="h-3 w-3" />
            {selectMode
              ? selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Selecting'
              : 'Select'}
          </button>

          {/* Select all on current page */}
          {selectMode && (
            <button
              onClick={() => {
                const allIds = new Set(sortedAssets.map(a => a.id));
                const allSelected = sortedAssets.every(a => selectedIds.has(a.id));
                setSelectedIds(allSelected ? new Set() : allIds);
              }}
              className="text-[10px] font-bold text-[#33ff33]/50 hover:text-[#33ff33] transition-colors"
            >
              {sortedAssets.every(a => selectedIds.has(a.id)) ? 'Deselect page' : 'Select page'}
            </button>
          )}

          {/* Ingest */}
          <div className="ml-auto flex items-center gap-3">
            <IngestBar />
            {data && (
              <span className="text-xs text-[#33ff33]/50 shrink-0">
                {data.total.toLocaleString()} assets
              </span>
            )}
          </div>
        </div>

        {/* Asset grid */}
        <div className={`flex-1 overflow-auto p-4 ${selectedIds.size > 0 ? 'pb-16' : ''}`}>
          {isLoading ? (
            <div className={`grid ${activePreset.cols} gap-3`}>
              {Array.from({ length: activePreset.perPage }).map((_, i) => (
                <Skeleton key={i} className="bg-[#1e1d20] h-48" />
              ))}
            </div>
          ) : sortedAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#33ff33]/40">
              <span className="text-4xl mb-3">🐊</span>
              <p className="text-sm font-bold uppercase">No assets found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className={`grid ${activePreset.cols} gap-3 mb-4`}>
                {sortedAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    size={sizeKey}
                    selectMode={selectMode}
                    selected={selectedIds.has(asset.id)}
                    onClick={() => handleCardClick(asset.id)}
                  />
                ))}
              </div>

              {data && data.pages > 1 && (
                <div className="flex items-center justify-center gap-1 pb-4">
                  <button
                    onClick={() => setFilters(f => ({ ...f, page: f.page! - 1 }))}
                    disabled={data.page === 1}
                    className="px-3 py-1 text-xs font-bold border border-[#33ff33]/30 text-[#33ff33]/60 hover:text-[#33ff33] hover:border-[#33ff33]/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    ← PREV
                  </button>
                  {Array.from({ length: Math.min(7, data.pages) }, (_, i) => {
                    const page = data.pages <= 7 ? i + 1 : i === 0 ? 1 : i === 6 ? data.pages : data.page - 2 + i;
                    return (
                      <button
                        key={page}
                        onClick={() => setFilters(f => ({ ...f, page }))}
                        className={[
                          'min-w-[2rem] px-2 py-1 text-xs font-bold border transition-all',
                          data.page === page
                            ? 'text-[#33ff33] border-[#33ff33]/60 bg-[#33ff33]/10'
                            : 'text-[#33ff33]/50 border-[#33ff33]/20 hover:text-[#33ff33] hover:border-[#33ff33]/40',
                        ].join(' ')}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setFilters(f => ({ ...f, page: f.page! + 1 }))}
                    disabled={data.page === data.pages}
                    className="px-3 py-1 text-xs font-bold border border-[#33ff33]/30 text-[#33ff33]/60 hover:text-[#33ff33] hover:border-[#33ff33]/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    NEXT →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Detail panel */}
      <AssetDetail
        assetId={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onNavigate={(id) => setSelectedAsset(id)}
      />

      {/* Bulk action bar — only when assets are selected */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={[...selectedIds]}
          selectedAssets={selectedAssets}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
