import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTaxonomyTags } from '../hooks/useTags';
import { AssetFilters } from '../lib/api';

const ASSET_TYPES = [
  { value: 'post',         label: 'Original Post' },
  { value: 'retweet',      label: 'Retweet'       },
  { value: 'quote-tweet',  label: 'Quote Tweet'   },
  { value: 'nft',          label: 'NFT'           },
  { value: 'image',        label: 'Image'         },
  { value: 'video',        label: 'Video'         },
  { value: 'gif',          label: 'GIF'           },
  { value: 'article',      label: 'Article'       },
  { value: 'audio',        label: 'Audio'         },
];

const TWEET_TYPES = new Set(['post', 'retweet', 'quote-tweet']);

const MEDIA_TYPES = [
  { value: 'image', label: 'Has image'  },
  { value: 'video', label: 'Has video'  },
  { value: 'gif',   label: 'Has GIF'    },
  { value: 'none',  label: 'No media'   },
];
const REVIEW_OPTIONS = [
  { value: '',         label: 'All'         },
  { value: 'ai',       label: 'Needs Review' },
  { value: 'human',    label: 'Approved'    },
  { value: 'untagged', label: 'Untagged'    },
];

interface FilterSidebarProps {
  filters: AssetFilters;
  onChange: (filters: AssetFilters) => void;
}

// Shared section header style — uppercase, green, small caps feel
const sectionHeader = 'text-xs font-bold uppercase tracking-widest text-[#33ff33] mb-2';

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const { data: tags = [] } = useTaxonomyTags();
  const [tagSearch, setTagSearch] = useState('');

  const toggleType = (value: string) => {
    const current = filters.types || (filters.type ? [filters.type] : []);
    const next = current.includes(value) ? current.filter(t => t !== value) : [...current, value];
    onChange({ ...filters, type: undefined, types: next.length ? next : undefined, page: 1 });
  };

  const isTypeActive = (value: string) =>
    (filters.types || (filters.type ? [filters.type] : [])).includes(value);

  const hasTweetType = (filters.types || (filters.type ? [filters.type] : [])).some(t => TWEET_TYPES.has(t));

  const toggleMediaType = (value: string) => {
    onChange({ ...filters, media_type: filters.media_type === value ? undefined : value, page: 1 });
  };

  const toggleTag = (tag: string) => {
    const current = filters.tags || [];
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    onChange({ ...filters, tags: next.length ? next : undefined, page: 1 });
  };

  const clearAll = () => onChange({ page: 1 });

  const hasFilters = !!(filters.type || filters.types?.length || filters.media_type || filters.linked_count || filters.tags?.length || filters.flagged || filters.q || filters.has_linked);

  return (
    <aside className="w-56 shrink-0 bg-[#1e1d20] border-r border-[#33ff33]/18 overflow-y-auto flex flex-col">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#33ff33]/18">
        <span className="text-sm font-bold text-[#33ff33] uppercase tracking-widest">FILTER</span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-[#33ff33]/60 hover:text-[#33ff33] transition-colors duration-300"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 space-y-0 overflow-y-auto">
        {/* Asset Type */}
        <div className="px-4 py-3 border-b border-[#33ff33]/12">
          <p className={sectionHeader}>Type</p>
          <div className="space-y-1">
            {ASSET_TYPES.map(({ value, label }) => {
              const active = isTypeActive(value);
              return (
                <label
                  key={value}
                  className={[
                    'flex items-center gap-2 cursor-pointer px-2 py-1 transition-colors duration-200',
                    active
                      ? 'text-[#33ff33] bg-[#33ff33]/10'
                      : 'text-[#33ff33]/60 hover:text-[#33ff33] hover:bg-[#33ff33]/5',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleType(value)}
                    className="accent-[#33ff33] w-3 h-3"
                  />
                  <span className="text-xs">{label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Tweet media sub-filter — only shown when a tweet type is selected */}
        {hasTweetType && (
          <div className="px-4 py-3 border-b border-[#33ff33]/12">
            <p className={sectionHeader}>Tweet Media</p>
            <div className="space-y-1">
              {MEDIA_TYPES.map(({ value, label }) => {
                const active = filters.media_type === value;
                return (
                  <label
                    key={value}
                    className={[
                      'flex items-center gap-2 cursor-pointer px-2 py-1 transition-colors duration-200',
                      active
                        ? 'text-[#33ff33] bg-[#33ff33]/10'
                        : 'text-[#33ff33]/60 hover:text-[#33ff33] hover:bg-[#33ff33]/5',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleMediaType(value)}
                      className="accent-[#33ff33] w-3 h-3"
                    />
                    <span className="text-xs">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="px-4 py-3 border-b border-[#33ff33]/12">
          <p className={sectionHeader}>Tags</p>
          <input
            placeholder="Search tags..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className={[
              'w-full text-xs px-2 py-1 mb-2',
              'bg-[#28272a] text-[#E0E0E0]',
              'border border-[#33ff33]/20',
              'placeholder-[#33ff33]/30',
              'focus:outline-none focus:border-[#33ff33]/60',
              'transition-colors duration-200',
            ].join(' ')}
          />
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {tags
              .filter((t: any) => t.tag.toLowerCase().includes(tagSearch.toLowerCase()))
              .map((t: any) => {
                const active = (filters.tags || []).includes(t.tag);
                return (
                  <label
                    key={t.tag}
                    className={[
                      'flex items-center gap-1.5 cursor-pointer px-1 py-0.5 transition-colors duration-200',
                      active
                        ? 'text-[#33ff33] bg-[#33ff33]/10'
                        : 'text-[#33ff33]/60 hover:text-[#33ff33] hover:bg-[#33ff33]/5',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleTag(t.tag)}
                      className="accent-[#33ff33] w-3 h-3 shrink-0"
                    />
                    <span className="text-xs truncate flex-1">{t.tag}</span>
                    {t.count > 0 && (
                      <span className="text-[10px] text-[#33ff33]/40 shrink-0">{t.count}</span>
                    )}
                  </label>
                );
              })}
            {tags.length === 0 && (
              <span className="text-xs text-[#33ff33]/40">Loading tags...</span>
            )}
          </div>
        </div>

        {/* Connections */}
        <div className="px-4 py-3 border-b border-[#33ff33]/12">
          <p className={sectionHeader}>Connections</p>
          <div className="space-y-1">
            {([
              { value: 'none',     label: 'No linked assets'       },
              { value: 'one',      label: 'One linked asset'        },
              { value: 'multiple', label: 'Multiple linked assets'  },
            ] as const).map(({ value, label }) => {
              const active = filters.linked_count === value;
              return (
                <label
                  key={value}
                  className={[
                    'flex items-center gap-2 cursor-pointer px-2 py-1 transition-colors duration-200',
                    active
                      ? 'text-[#33ff33] bg-[#33ff33]/10'
                      : 'text-[#33ff33]/60 hover:text-[#33ff33] hover:bg-[#33ff33]/5',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() =>
                      onChange({ ...filters, has_linked: undefined, linked_count: active ? undefined : value, page: 1 })
                    }
                    className="accent-[#33ff33] w-3 h-3"
                  />
                  <span className="text-xs">{label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Review Status */}
        <div className="px-4 py-3">
          <p className={sectionHeader}>Status</p>
          <div className="space-y-1">
            {REVIEW_OPTIONS.map((opt) => {
              const active = (filters.flagged || '') === opt.value;
              return (
                <label
                  key={opt.value}
                  className={[
                    'flex items-center gap-2 cursor-pointer px-2 py-1 transition-colors duration-200',
                    active
                      ? 'text-[#33ff33] bg-[#33ff33]/10'
                      : 'text-[#33ff33]/60 hover:text-[#33ff33] hover:bg-[#33ff33]/5',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="flagged"
                    checked={active}
                    onChange={() =>
                      onChange({ ...filters, flagged: (opt.value as any) || undefined, page: 1 })
                    }
                    className="accent-[#33ff33] w-3 h-3"
                  />
                  <span className="text-xs">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
