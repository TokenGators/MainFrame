import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
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
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    onChange({ ...filters, tags: next.length ? next : undefined, page: 1 });
  };

  const clearAll = () => onChange({ page: 1 });

  const hasFilters = !!(filters.type || filters.tags?.length || filters.flagged || filters.q);

  return (
    <aside className="w-56 shrink-0 space-y-4 pr-4 border-r overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Filters</span>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Asset Type */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
          Type
        </p>
        <div className="space-y-1.5">
          {ASSET_TYPES.map((type) => (
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
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
          Tags
        </p>
        <input
          placeholder="Search tags..."
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          className="w-full text-sm border rounded px-2 py-1 mb-2 bg-background"
        />
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {tags
            .filter((t: any) => t.tag.toLowerCase().includes(tagSearch.toLowerCase()))
            .map((t: any) => (
              <label key={t.tag} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(filters.tags || []).includes(t.tag)}
                  onCheckedChange={() => toggleTag(t.tag)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate">{t.tag}</span>
                </div>
                {t.count > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">{t.count}</span>
                )}
              </label>
            ))}
          {tags.length === 0 && (
            <span className="text-sm text-muted-foreground">Loading tags...</span>
          )}
        </div>
      </div>

      <Separator />

      {/* Review Status */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
          Status
        </p>
        <div className="space-y-1.5">
          {REVIEW_OPTIONS.map((opt) => (
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

      <Separator />

      {/* Export hint */}
      <div className="text-xs text-muted-foreground">
        <p>Pro tip: Use the export feature to download filtered assets as JSON.</p>
      </div>
    </aside>
  );
}
