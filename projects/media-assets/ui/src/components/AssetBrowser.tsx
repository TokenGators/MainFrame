import { useState } from 'react';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetFilters, PaginatedResponse } from '../lib/api';
import { useAssets } from '../hooks/useAssets';
import { AssetCard } from './AssetCard';
import { AssetDetail } from './AssetDetail';
import { FilterSidebar } from './FilterSidebar';
import { Skeleton } from '@/components/ui/skeleton';

export function AssetBrowser() {
  const [filters, setFilters] = useState<AssetFilters>({ page: 1, per_page: 24 });
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const { data, isLoading } = useAssets(filters);

  const sortedAssets = [...(data?.data || [])].sort((a, b) => {
    if (filters.sort === 'created_at') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    if (filters.sort === 'likes' && a.stats && b.stats) {
      return (b.stats.likes || 0) - (a.stats.likes || 0);
    }
    if (filters.sort === 'id') {
      return parseInt(b.id) - parseInt(a.id);
    }
    return 0;
  });

  const handleFilterChange = (newFilters: AssetFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      <FilterSidebar filters={filters} onChange={handleFilterChange} />
      
      <main className="flex-1 overflow-auto p-6">
        {/* Header with search and sort */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={filters.q || ''}
              onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
              className="pl-10"
            />
          </div>
          
          <Select
            value={filters.sort || 'created_at'}
            onValueChange={(value: any) => setFilters({ ...filters, sort: value, page: 1 })}
          >
            <SelectTrigger className="w-[180px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Newest First</SelectItem>
              <SelectItem value="id">ID</SelectItem>
              <SelectItem value="likes">Most Liked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Asset grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {sortedAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onClick={() => setSelectedAsset(asset.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                    const page = data.pages <= 5 ? i + 1 : 
                                i === 0 ? 1 :
                                i === 4 ? data.pages :
                                data.page - 2 + i;
                    return (
                      <Button
                        key={page}
                        variant={data.page === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="min-w-[2.5rem]"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page === data.pages}
                >
                  Next
                </Button>
              </div>
            )}

            {data && data.total === 0 && (
              <div className="text-center text-muted-foreground py-12">
                No assets found matching your filters.
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail panel */}
      <AssetDetail
        assetId={selectedAsset}
        onClose={() => setSelectedAsset(null)}
      />
    </div>
  );
}
