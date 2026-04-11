import { useState, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Filter, Shuffle } from 'lucide-react';
import { api } from '../lib/api';
import { useNFTs, useNFTTraits } from '../hooks/useNFTs';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { TYPE_COLORS } from '../lib/utils';

const COLUMNS = 5;
const ROW_HEIGHT = 220;
const ITEM_PADDING = 16;

interface NFTExplorerProps {
  initialFilters?: Record<string, string>;
}

export function NFTExplorer({ initialFilters = {} }: NFTExplorerProps) {
  const { toast } = useToast();
  const [filterText, setFilterText] = useState('');
  const [traitFilters, setTraitFilters] = useState<Record<string, string>>(initialFilters);
  const [page, setPage] = useState(1);
  const parentRef = useRef<HTMLDivElement>(null);

  const { data: nfts, isLoading, isFetching } = useNFTs(traitFilters, page);
  const { data: traits, isLoading: traitsLoading } = useNFTTraits();

  // Reset to page 1 when trait filters change significantly
  const handleTraitChange = (trait: string, value: string | null) => {
    setTraitFilters((prev) => {
      const next = { ...prev };
      if (value) {
        next[trait] = value;
      } else {
        delete next[trait];
      }
      return next;
    });
    setPage(1);
  };

  // Virtual scroll setup
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil((nfts?.data?.length || 0) / COLUMNS) || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  // Filter traits by search
  const filteredTraits = traits
    ? Object.entries(traits).reduce((acc, [trait, values]) => {
        if (trait.toLowerCase().includes(filterText.toLowerCase())) {
          acc[trait] = values;
        }
        return acc;
      }, {} as Record<string, Record<string, number>>)
    : {};

  // Clear all filters
  const clearFilters = () => {
    setTraitFilters({});
    setFilterText('');
    setPage(1);
  };

  // Shuffle NFTs
  const shuffle = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('/api/nfts/shuffle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(traitFilters),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Shuffle failed');
      }

      const result = await response.json();
      toast({ description: `${result.shuffle || nfts?.data.length} NFTs shuffled` });
    } catch {
      toast({ variant: 'destructive', description: 'Failed to shuffle NFTs' });
    }
  };

  // Virtualized rows
  const rows = [];
  for (let i = 0; i < rowVirtualizer.getVirtualItems().length; i++) {
    const virtualRow = rowVirtualizer.getVirtualItems()[i];
    const startIndex = virtualRow?.start || 0;
    const endIndex = Math.min(startIndex + COLUMNS, (nfts?.data?.length || 0));

    for (let idx = startIndex; idx < endIndex; idx++) {
      const nft = nfts?.data?.[idx];
      if (!nft) continue;

      const row = Math.floor(idx / COLUMNS);
      const col = idx % COLUMNS;

      rows.push({
        key: nft.token_id,
        nft,
        row,
        col,
        virtualIndex: virtualRow?.index || 0,
        start: virtualRow?.start || 0,
      });
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'gator-nft':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'gator-unique':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* Traits sidebar */}
      <aside className="w-64 shrink-0 border-r overflow-y-auto">
        <div className="p-4 border-b space-y-4">
          <h2 className="text-lg font-semibold">NFT Explorer</h2>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search traits..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8"
            />
          </div>

          {(Object.keys(traitFilters).length > 0 || filterText) && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
              Clear all
            </Button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {traitsLoading || !traits ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          ) : (
            Object.entries(filteredTraits).map(([trait, values]) => (
              <div key={trait} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {trait}
                </h3>
                <div className="space-y-1">
                  {Object.entries(values).map(([value, count]) => (
                    <label
                      key={value}
                      className="flex items-center justify-between text-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={traitFilters[trait] === value}
                          onChange={(e) =>
                            handleTraitChange(trait, e.target.checked ? value : null)
                          }
                          className="rounded border-gray-300"
                        />
                        <span>{value}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {count.toLocaleString()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* NFT grid */}
      <main className="flex-1 overflow-hidden p-6">
        {/* Header controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground">
            {nfts?.total ? (
              <>
                Showing{' '}
                {((page - 1) * 100 + 1).toLocaleString()}-
                {Math.min(page * 100, nfts.total).toLocaleString()} of{' '}
                {nfts.total.toLocaleString()} NFTs
              </>
            ) : (
              'Loading NFTs...'
            )}
          </div>
          
          <Button variant="outline" size="sm" onClick={shuffle}>
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle
          </Button>
        </div>

        {/* NFT container with virtual scroll */}
        <div
          ref={parentRef}
          className="h-[calc(100vh-14rem)] overflow-y-auto"
        >
          {nfts?.data?.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No NFTs found matching your filters.
            </div>
          ) : (
            <div
              className="min-h-[500px]"
              style={{
                height: rowVirtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {isFetching && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10" />
              )}
              
              {rows.map(({ key, nft, row, col, start }) => (
                <div
                  key={key}
                  className="absolute"
                  style={{
                    transform: `translateY(${start}px) translateX(${
                      col * (200 + ITEM_PADDING)
                    }px)`,
                    width: 200,
                  }}
                >
                  <Card className="p-2 hover:shadow-lg transition-shadow cursor-pointer bg-card">
                    {/* NFT type badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(
                          nft.type || 'gator-nft'
                        )}`}
                      >
                        {nft.type || 'Gator NFT'}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        #{nft.token_id}
                      </span>
                    </div>

                    {/* NFT image */}
                    {nft.gateway_image_url ? (
                      <img
                        src={nft.gateway_image_url}
                        alt={`${nft.name || 'Gator NFT'} #${nft.token_id}`}
                        className="w-full h-28 object-cover rounded"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-28 bg-muted rounded flex items-center justify-center">
                        <span className="text-2xl">🐊</span>
                      </div>
                    )}

                    {/* NFT name */}
                    <div className="mt-2">
                      <p className="text-sm font-medium truncate">
                        {nft.name || 'Gator #'}#{nft.token_id}
                      </p>
                    </div>

                    {/* Traits preview */}
                    {nft.trait_counts && Object.keys(nft.trait_counts).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(nft.trait_counts)
                          .slice(0, 3)
                          .map(([trait, value]) => (
                            <div key={`${trait}-${value}`} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground truncate">{trait}:</span>
                              <span className="font-medium truncate">{String(value)}</span>
                            </div>
                          ))}
                        {Object.keys(nft.trait_counts).length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{Object.keys(nft.trait_counts).length - 3} more
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                      <span>{nft.created_at ? new Date(nft.created_at).getFullYear() : '?'}</span>
                      {nft.owner && <span>@{nft.owner}</span>}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {nfts?.pages && nfts.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, nfts.pages) }, (_, i) => {
                const pageNum = nfts.pages <= 5 ? i + 1 : 
                                i === 0 ? 1 :
                                i === 4 ? nfts.pages :
                                page - 2 + i;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    disabled={isFetching}
                    className="min-w-[2.5rem]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(nfts.pages, p + 1))}
              disabled={page === nfts.pages || isFetching}
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
