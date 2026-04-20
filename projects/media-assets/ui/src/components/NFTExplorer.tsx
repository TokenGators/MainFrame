import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, ExternalLink } from 'lucide-react';
import { useNFTs, useNFTTraits } from '../hooks/useNFTs';
import { useToast } from '@/components/ui/use-toast';
import { TYPE_COLORS } from '../lib/utils';

const COLUMNS = 5;
const ROW_HEIGHT = 240;
const ITEM_PADDING = 12;
const CARD_WIDTH = 180;

interface NFTExplorerProps {
  initialFilters?: Record<string, string>;
}

const sectionHeader = 'text-[10px] font-bold uppercase tracking-widest text-[#33ff33] mb-2';

export function NFTExplorer({ initialFilters = {} }: NFTExplorerProps) {
  const { toast } = useToast();
  const [filterText, setFilterText] = useState('');
  const [traitFilters, setTraitFilters] = useState<Record<string, string>>(initialFilters);
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const parentRef = useRef<HTMLDivElement>(null);

  const { data: nfts, isLoading, isFetching } = useNFTs(traitFilters, page);
  const { data: traits, isLoading: traitsLoading } = useNFTTraits();

  const handleTraitChange = (trait: string, value: string | null) => {
    setTraitFilters((prev) => {
      const next = { ...prev };
      if (value) next[trait] = value;
      else delete next[trait];
      return next;
    });
    setPage(1);
  };

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil((nfts?.data?.length || 0) / COLUMNS),
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  const filteredTraitKeys = traits
    ? Object.keys(traits).filter((t) =>
        !filterText || t.toLowerCase().includes(filterText.toLowerCase())
      )
    : [];

  const clearFilters = () => {
    setTraitFilters({});
    setFilterText('');
    setPage(1);
  };

  const activeCount = Object.keys(traitFilters).length;

  return (
    <div className="flex h-[calc(100vh-45px)] bg-[#28272a]">
      {/* Traits sidebar */}
      <aside className="w-56 shrink-0 bg-[#1e1d20] border-r border-[#33ff33]/18 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#33ff33]/18">
          <span className="text-sm font-bold text-[#33ff33] uppercase tracking-widest">Traits</span>
          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#33ff33]/60 hover:text-[#33ff33] transition-colors"
            >
              Clear ({activeCount})
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-[#33ff33]/12">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#33ff33]/30" />
            <input
              placeholder="Filter traits..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className={[
                'w-full text-xs pl-6 pr-2 py-1',
                'bg-[#28272a] text-[#E0E0E0]',
                'border border-[#33ff33]/20',
                'placeholder-[#33ff33]/30',
                'focus:outline-none focus:border-[#33ff33]/60',
              ].join(' ')}
            />
          </div>
        </div>

        {/* Trait groups */}
        <div className="flex-1 overflow-y-auto">
          {traitsLoading || !traits ? (
            <div className="px-4 py-3 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-3 bg-[#33ff33]/8 rounded" />
              ))}
            </div>
          ) : (
            filteredTraitKeys.map((trait) => {
              const values = traits[trait] as Record<string, number>;
              const activeVal = traitFilters[trait];
              const isCollapsed = collapsed[trait];
              const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);

              return (
                <div key={trait} className="border-b border-[#33ff33]/10">
                  {/* Trait group header */}
                  <button
                    onClick={() => setCollapsed((p) => ({ ...p, [trait]: !p[trait] }))}
                    className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-[#33ff33]/5 transition-colors"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#33ff33]/80">
                      {trait}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {activeVal && (
                        <span className="text-[9px] text-[#33ff33] bg-[#33ff33]/10 px-1.5 py-0.5 border border-[#33ff33]/30">
                          {activeVal}
                        </span>
                      )}
                      <span className="text-[10px] text-[#33ff33]/30">{isCollapsed ? '▸' : '▾'}</span>
                    </div>
                  </button>

                  {/* Values */}
                  {!isCollapsed && (
                    <div className="pb-1">
                      {entries.map(([value, count]) => {
                        const active = activeVal === value;
                        return (
                          <label
                            key={value}
                            className={[
                              'flex items-center justify-between px-4 py-0.5 cursor-pointer transition-colors',
                              active
                                ? 'text-[#33ff33] bg-[#33ff33]/10'
                                : 'text-[#33ff33]/50 hover:text-[#33ff33] hover:bg-[#33ff33]/5',
                            ].join(' ')}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={(e) => handleTraitChange(trait, e.target.checked ? value : null)}
                                className="accent-[#33ff33] w-3 h-3"
                              />
                              <span className="text-xs">{value}</span>
                            </div>
                            <span className="text-[10px] text-[#33ff33]/30">{count.toLocaleString()}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* NFT grid */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#33ff33]/18 bg-[#1e1d20]">
          <span className="text-xs text-[#33ff33]/60 font-mono">
            {nfts?.total != null
              ? `${nfts.total.toLocaleString()} NFTs`
              : 'Loading...'}
            {activeCount > 0 && ` · ${activeCount} trait filter${activeCount > 1 ? 's' : ''}`}
          </span>
          {/* Pagination */}
          {nfts?.pages && nfts.pages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="px-2 py-0.5 text-xs text-[#33ff33]/60 border border-[#33ff33]/20 hover:border-[#33ff33]/50 hover:text-[#33ff33] disabled:opacity-30 transition-all"
              >
                ◀
              </button>
              <span className="text-xs text-[#33ff33]/50 font-mono px-2">
                {page} / {nfts.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(nfts.pages, p + 1))}
                disabled={page === nfts.pages || isFetching}
                className="px-2 py-0.5 text-xs text-[#33ff33]/60 border border-[#33ff33]/20 hover:border-[#33ff33]/50 hover:text-[#33ff33] disabled:opacity-30 transition-all"
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {/* Virtual grid */}
        <div ref={parentRef} className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${COLUMNS}, ${CARD_WIDTH}px)` }}>
              {[...Array(20)].map((_, i) => (
                <div key={i} className="h-[220px] bg-[#1e1d20] border border-[#33ff33]/10 animate-pulse" />
              ))}
            </div>
          ) : nfts?.data?.length === 0 ? (
            <div className="text-center text-[#33ff33]/40 py-12 font-mono text-sm">
              No NFTs match your trait filters.
            </div>
          ) : (
            <div
              style={{
                height: rowVirtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {isFetching && (
                <div className="absolute inset-0 bg-[#28272a]/50 z-10" />
              )}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowStart = virtualRow.index * COLUMNS;
                return (
                  <div
                    key={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: ROW_HEIGHT,
                      transform: `translateY(${virtualRow.start}px)`,
                      display: 'flex',
                      gap: ITEM_PADDING,
                    }}
                  >
                    {Array.from({ length: COLUMNS }, (_, col) => {
                      const nft = nfts?.data?.[rowStart + col];
                      if (!nft) return <div key={col} style={{ width: CARD_WIDTH }} />;
                      return (
                        <Link
                          key={nft.token_id}
                          to={`/nfts/${nft.token_id}`}
                          style={{ width: CARD_WIDTH, flexShrink: 0 }}
                          className="block bg-[#1e1d20] border border-[#33ff33]/15 hover:border-[#33ff33]/50 hover:bg-[#33ff33]/5 transition-all duration-300 p-2 cursor-pointer group"
                        >
                          {/* Token ID + link */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono text-[#33ff33]/60">
                              #{nft.token_id}
                            </span>
                            {nft.source_url && (
                              <a
                                href={nft.source_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[#33ff33]/20 hover:text-[#33ff33]/70 transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>

                          {/* NFT Image */}
                          {(nft.id || nft.gateway_image_url) ? (
                            <img
                              src={`/api/assets/${nft.id}/image`}
                              alt={nft.name || `NFT #${nft.token_id}`}
                              className="w-full object-cover border border-[#33ff33]/10"
                              style={{ height: 140 }}
                              loading="lazy"
                              onError={(e) => {
                                if (nft.gateway_image_url) (e.target as HTMLImageElement).src = nft.gateway_image_url;
                              }}
                            />
                          ) : (
                            <div
                              className="w-full bg-[#28272a] border border-[#33ff33]/10 flex items-center justify-center text-2xl"
                              style={{ height: 140 }}
                            >
                              🐊
                            </div>
                          )}

                          {/* Name */}
                          <p className="text-xs text-[#E0E0E0] truncate mt-1.5">
                            {nft.name || `TokenGator #${nft.token_id}`}
                          </p>

                          {/* Top traits */}
                          {nft.traits?.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {nft.traits.slice(0, 2).map((t: any) => (
                                <div key={t.trait_type} className="flex justify-between text-[10px]">
                                  <span className="text-[#33ff33]/40 truncate">{t.trait_type}</span>
                                  <span className="text-[#E0E0E0]/70 truncate ml-1">{t.value}</span>
                                </div>
                              ))}
                              {nft.traits.length > 2 && (
                                <span className="text-[10px] text-[#33ff33]/30">
                                  +{nft.traits.length - 2} traits
                                </span>
                              )}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
