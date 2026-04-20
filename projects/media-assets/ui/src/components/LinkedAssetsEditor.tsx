import { useState, useEffect, useRef } from 'react';
import { Plus, X, ArrowRight } from 'lucide-react';
import { TYPE_COLORS } from '../lib/utils';
import { useAsset, usePatchAsset } from '../hooks/useAssets';
import { api } from '../lib/api';
import { useToast } from '@/components/ui/use-toast';

interface LinkedAssetsEditorProps {
  asset: any;
  onNavigate: (id: string) => void;
}

const sectionLabel = 'text-[10px] font-bold uppercase tracking-widest text-[#33ff33]';

/** Mini card for a single linked asset */
function LinkedAssetRow({ id, onRemove, onNavigate }: { id: string; onRemove: () => void; onNavigate: () => void }) {
  const { data: linked, isLoading } = useAsset(id);
  const typeColor = TYPE_COLORS[linked?.type] || TYPE_COLORS.image;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-[#28272a] border border-[#33ff33]/10 animate-pulse">
        <div className="h-3 w-3 bg-[#33ff33]/10 rounded" />
        <div className="h-2 flex-1 bg-[#33ff33]/10 rounded" />
      </div>
    );
  }

  if (!linked) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-[#28272a] border border-red-900/30">
        <span className="text-[10px] text-red-400/60 font-mono truncate flex-1">{id}</span>
        <span className="text-[9px] text-red-400/40 italic">not found</span>
        <button onClick={onRemove} className="text-red-400/30 hover:text-red-400 transition-colors">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  const displayText = linked.name || linked.text?.replace(/https?:\/\/\S+/g, '').trim() || linked.id;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-[#28272a] border border-[#33ff33]/12 hover:border-[#33ff33]/30 transition-colors group">
      <span className={`text-[9px] px-1 py-0 font-bold uppercase shrink-0 ${typeColor}`}>
        {linked.type}
      </span>
      <span className="text-[10px] text-[#E0E0E0] truncate flex-1 leading-snug">
        {displayText.slice(0, 60)}{displayText.length > 60 ? '…' : ''}
      </span>
      {/* Navigate to linked asset */}
      <button
        onClick={onNavigate}
        className="text-[#33ff33]/20 hover:text-[#33ff33]/80 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
        title="Open this asset"
      >
        <ArrowRight className="h-3 w-3" />
      </button>
      <button
        onClick={onRemove}
        className="text-[#33ff33]/20 hover:text-red-400 transition-colors shrink-0"
        title="Remove link"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function LinkedAssetsEditor({ asset, onNavigate }: LinkedAssetsEditorProps) {
  const patchAsset = usePatchAsset();
  const { toast } = useToast();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching2, setSearching2] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const linkedIds: string[] = asset?.linked_assets || [];

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
      setSearching2(true);
      try {
        const data = await api.assets.list({ q: query, per_page: 8 });
        // Exclude self and already-linked
        setResults((data.data || []).filter((r: any) => r.id !== asset.id && !linkedIds.includes(r.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching2(false);
      }
    }, 300);
  }, [query]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className={sectionLabel}>
          Linked Assets
          {linkedIds.length > 0 && (
            <span className="ml-1.5 text-[#33ff33]/40">({linkedIds.length})</span>
          )}
        </p>
        <button
          onClick={() => setSearching((v) => !v)}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#33ff33]/50 hover:text-[#33ff33] border border-dashed border-[#33ff33]/25 hover:border-[#33ff33]/50 px-1.5 py-0.5 transition-all duration-200"
        >
          <Plus className="h-2.5 w-2.5" /> Link asset
        </button>
      </div>

      {/* Search input + results */}
      {searching && (
        <div className="mb-2 relative">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setSearching(false); setQuery(''); setResults([]); } }}
            placeholder="Search by ID or text..."
            className={[
              'w-full text-xs px-2 py-1',
              'bg-[#28272a] text-[#E0E0E0]',
              'border border-[#33ff33]/30 focus:border-[#33ff33]/70',
              'placeholder-[#33ff33]/25 focus:outline-none',
            ].join(' ')}
          />
          {results.length > 0 && (
            <div className="absolute z-50 w-full mt-0.5 bg-[#1a191c] border border-[#33ff33]/30 max-h-48 overflow-y-auto">
              {results.map((r: any) => {
                const typeColor = TYPE_COLORS[r.type] || TYPE_COLORS.image;
                const displayText = r.name || r.text?.replace(/https?:\/\/\S+/g, '').trim() || r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => addLink(r.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-[#33ff33]/8 transition-colors"
                  >
                    <span className={`text-[9px] px-1 py-0 font-bold uppercase shrink-0 ${typeColor}`}>{r.type}</span>
                    <span className="text-[10px] text-[#E0E0E0] truncate flex-1">
                      {displayText.slice(0, 55)}{displayText.length > 55 ? '…' : ''}
                    </span>
                  </button>
                );
              })}
              {searching2 && (
                <div className="px-2 py-1.5 text-[10px] text-[#33ff33]/40">Searching...</div>
              )}
            </div>
          )}
          {query.length > 1 && !searching2 && results.length === 0 && (
            <div className="mt-0.5 px-2 py-1.5 text-[10px] text-[#33ff33]/30 bg-[#1a191c] border border-[#33ff33]/20">
              No results
            </div>
          )}
        </div>
      )}

      {/* Linked asset rows */}
      {linkedIds.length === 0 && !searching ? (
        <p className="text-[10px] text-[#33ff33]/25 italic">No linked assets</p>
      ) : (
        <div className="space-y-1">
          {linkedIds.map((id) => (
            <LinkedAssetRow
              key={id}
              id={id}
              onRemove={() => removeLink(id)}
              onNavigate={() => onNavigate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
