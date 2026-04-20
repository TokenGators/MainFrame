import { useState, useRef, useEffect } from 'react';
import { X, Plus, Minus, Tag } from 'lucide-react';
import { useTaxonomyTags } from '../hooks/useTags';
import { usePatchAsset } from '../hooks/useAssets';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface BulkActionBarProps {
  selectedIds: string[];
  selectedAssets: any[];      // full asset objects for the selected ids
  onClearSelection: () => void;
}

export function BulkActionBar({ selectedIds, selectedAssets, onClearSelection }: BulkActionBarProps) {
  const { data: taxonomyTags = [] } = useTaxonomyTags();
  const patchAsset = usePatchAsset();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'add' | 'remove' | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode) setTimeout(() => inputRef.current?.focus(), 50);
  }, [mode]);

  const count = selectedIds.length;

  // Tags that appear on ALL selected assets (for remove suggestions)
  const commonTags = (() => {
    if (!selectedAssets.length) return [];
    const sets = selectedAssets.map(a => new Set<string>(a?.tags || []));
    const first = sets[0];
    return [...first].filter((t: string) => sets.every(s => s.has(t))).sort();
  })();

  // Add suggestions from taxonomy
  const addSuggestions = taxonomyTags
    .filter((t: any) => t.tag.toLowerCase().includes(inputVal.toLowerCase()))
    .slice(0, 8);

  // Remove suggestions = common tags filtered by input
  const removeSuggestions = commonTags
    .filter(t => t.toLowerCase().includes(inputVal.toLowerCase()))
    .slice(0, 8);

  const runBulkAdd = async (tag: string) => {
    tag = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag) return;
    setBusy(true);
    let ok = 0;
    for (const asset of selectedAssets) {
      const existing: string[] = asset?.tags || [];
      if (existing.includes(tag)) { ok++; continue; }
      const humanTags: string[] = [...(asset?.human_tags || []), tag];
      try {
        await patchAsset.mutateAsync({
          id: asset.id,
          fields: { tags: [...existing, tag], human_tags: humanTags },
        });
        ok++;
      } catch { /* continue */ }
    }
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    toast({ description: `Added "${tag}" to ${ok} assets` });
    setInputVal('');
    setMode(null);
    setBusy(false);
  };

  const runBulkRemove = async (tag: string) => {
    tag = tag.trim().toLowerCase();
    if (!tag) return;
    setBusy(true);
    let ok = 0;
    for (const asset of selectedAssets) {
      const existing: string[] = asset?.tags || [];
      if (!existing.includes(tag)) { ok++; continue; }
      try {
        await patchAsset.mutateAsync({
          id: asset.id,
          fields: {
            tags: existing.filter(t => t !== tag),
            human_tags: (asset?.human_tags || []).filter((t: string) => t !== tag),
          },
        });
        ok++;
      } catch { /* continue */ }
    }
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    toast({ description: `Removed "${tag}" from ${ok} assets` });
    setInputVal('');
    setMode(null);
    setBusy(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'add') runBulkAdd(inputVal);
      if (mode === 'remove') runBulkRemove(inputVal);
    }
    if (e.key === 'Escape') { setMode(null); setInputVal(''); }
  };

  const suggestions = mode === 'add' ? addSuggestions : removeSuggestions;

  return (
    <div className="fixed bottom-0 left-56 right-0 z-30 bg-[#1e1d20] border-t border-[#33ff33]/30 px-4 py-2.5 flex items-center gap-3">
      {/* Selection count */}
      <div className="flex items-center gap-2 shrink-0">
        <Tag className="h-3.5 w-3.5 text-[#33ff33]" />
        <span className="text-sm font-bold text-[#33ff33]">{count}</span>
        <span className="text-xs text-[#33ff33]/60">selected</span>
      </div>

      <div className="w-px h-5 bg-[#33ff33]/20" />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setMode(mode === 'add' ? null : 'add'); setInputVal(''); }}
          disabled={busy}
          className={[
            'flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border transition-all duration-200',
            mode === 'add'
              ? 'text-[#28272a] bg-[#33ff33] border-[#33ff33]'
              : 'text-[#33ff33]/70 border-[#33ff33]/30 hover:text-[#33ff33] hover:border-[#33ff33]/60 hover:bg-[#33ff33]/5',
          ].join(' ')}
        >
          <Plus className="h-3 w-3" /> Add tag
        </button>

        <button
          onClick={() => { setMode(mode === 'remove' ? null : 'remove'); setInputVal(''); }}
          disabled={busy || commonTags.length === 0}
          className={[
            'flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border transition-all duration-200',
            mode === 'remove'
              ? 'text-[#28272a] bg-red-400 border-red-400'
              : 'text-red-400/70 border-red-400/30 hover:text-red-400 hover:border-red-400/60 hover:bg-red-400/5',
            (busy || commonTags.length === 0) ? 'opacity-30 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <Minus className="h-3 w-3" />
          Remove tag
          {commonTags.length === 0 && mode !== 'remove' && (
            <span className="text-[10px] opacity-60 ml-1">(no common tags)</span>
          )}
        </button>
      </div>

      {/* Inline input when mode is active */}
      {mode && (
        <div className="relative flex items-center gap-1 flex-1 max-w-sm">
          <input
            ref={inputRef}
            value={inputVal}
            onChange={(e) => { setInputVal(e.target.value); setShowSuggestions(true); }}
            onKeyDown={handleKey}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={mode === 'add' ? 'Tag name...' : 'Tag to remove...'}
            className={[
              'flex-1 text-xs px-2 py-1',
              'bg-[#28272a] text-[#E0E0E0]',
              'border focus:outline-none transition-colors',
              mode === 'add'
                ? 'border-[#33ff33]/40 focus:border-[#33ff33]/80'
                : 'border-red-400/40 focus:border-red-400/80',
            ].join(' ')}
          />
          <button
            onMouseDown={() => mode === 'add' ? runBulkAdd(inputVal) : runBulkRemove(inputVal)}
            disabled={busy || !inputVal.trim()}
            className={[
              'px-2.5 py-1 text-xs font-bold transition-colors disabled:opacity-30',
              mode === 'add'
                ? 'text-[#28272a] bg-[#33ff33] hover:bg-[#33ff33]/80'
                : 'text-white bg-red-500 hover:bg-red-400',
            ].join(' ')}
          >
            {busy ? '…' : mode === 'add' ? 'Add' : 'Remove'}
          </button>

          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 w-full bg-[#1a191c] border border-[#33ff33]/30 max-h-40 overflow-y-auto z-50">
              {suggestions.map((t: any) => {
                const tag = typeof t === 'string' ? t : t.tag;
                const desc = typeof t === 'string' ? '' : t.description;
                return (
                  <button
                    key={tag}
                    onMouseDown={() => mode === 'add' ? runBulkAdd(tag) : runBulkRemove(tag)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-[#33ff33]/8 transition-colors"
                  >
                    <span className="text-xs font-bold text-[#E0E0E0]">{tag}</span>
                    {desc && <span className="text-[10px] text-[#33ff33]/35 truncate">{desc}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Deselect all */}
      <button
        onClick={onClearSelection}
        className="ml-auto flex items-center gap-1 text-xs text-[#33ff33]/40 hover:text-[#33ff33]/80 transition-colors"
      >
        <X className="h-3 w-3" /> Deselect all
      </button>
    </div>
  );
}
