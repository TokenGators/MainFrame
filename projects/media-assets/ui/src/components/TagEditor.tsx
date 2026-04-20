import { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { useTaxonomyTags } from '../hooks/useTags';
import { usePatchAsset } from '../hooks/useAssets';
import { useToast } from '@/components/ui/use-toast';

// Orange = AI-generated, Blue = human-added
const AI_TAG_CLASS    = 'bg-orange-900/40 text-orange-300 border border-orange-700/50';
const HUMAN_TAG_CLASS = 'bg-blue-900/40 text-blue-300 border border-blue-700/50';

interface TagEditorProps {
  asset: any;
}

export function TagEditor({ asset }: TagEditorProps) {
  const { data: taxonomyTags = [] } = useTaxonomyTags();
  const patchAsset = usePatchAsset();
  const { toast } = useToast();

  // Local state — reset whenever asset changes
  const [tags, setTags]           = useState<string[]>(asset?.tags || []);
  const [humanTags, setHumanTags] = useState<string[]>(asset?.human_tags || []);
  const [inputVal, setInputVal]   = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTags(asset?.tags || []);
    setHumanTags(asset?.human_tags || []);
    setInputVal('');
    setShowSuggestions(false);
  }, [asset?.id]);

  const tagSet = new Set(tags);

  const save = async (nextTags: string[], nextHumanTags: string[]) => {
    setTags(nextTags);
    setHumanTags(nextHumanTags);
    try {
      await patchAsset.mutateAsync({
        id: asset.id,
        fields: { tags: nextTags, human_tags: nextHumanTags },
      });
    } catch {
      // Rollback on error
      setTags(tags);
      setHumanTags(humanTags);
      toast({ variant: 'destructive', description: 'Failed to save tags' });
    }
  };

  const addTag = (tag: string) => {
    tag = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || tagSet.has(tag)) { setInputVal(''); return; }
    save([...tags, tag], [...humanTags, tag]);
    setInputVal('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    save(
      tags.filter(t => t !== tag),
      humanTags.filter(t => t !== tag),
    );
  };

  const humanTagSet = new Set(humanTags);
  const isAI = (tag: string) => asset?.flagged_by === 'ai' && !humanTagSet.has(tag);

  // Taxonomy suggestions filtered by input
  const suggestions = taxonomyTags
    .filter((t: any) => {
      if (tagSet.has(t.tag)) return false;
      if (!inputVal.trim()) return false;
      return t.tag.toLowerCase().includes(inputVal.toLowerCase());
    })
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#33ff33]">
          Tags
          {tags.length > 0 && (
            <span className="ml-1.5 text-[#33ff33]/40 normal-case font-normal">
              ({tags.length})
            </span>
          )}
        </span>
        <div className="flex items-center gap-2 text-[10px] text-[#33ff33]/30">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-orange-500/60 border border-orange-500 inline-block" />
            AI
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500/60 border border-blue-500 inline-block" />
            You
          </span>
        </div>
      </div>

      {/* Tag chips */}
      <div className="flex flex-wrap gap-1.5 min-h-[22px]">
        {tags.length === 0 && (
          <span className="text-xs text-[#33ff33]/25 italic">No tags yet</span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border ${
              isAI(tag) ? AI_TAG_CLASS : HUMAN_TAG_CLASS
            }`}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:text-red-400 transition-colors ml-0.5"
              title="Remove tag"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>

      {/* Add tag input */}
      <div className="relative">
        <div className="flex gap-1">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => { setInputVal(e.target.value); setShowSuggestions(true); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addTag(inputVal); }
                if (e.key === 'Escape') { setInputVal(''); setShowSuggestions(false); }
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Add tag... (type or pick from list)"
              className={[
                'w-full text-xs px-2 py-1',
                'bg-[#28272a] text-[#E0E0E0]',
                'border border-[#33ff33]/20 focus:border-[#33ff33]/60',
                'placeholder-[#33ff33]/20 focus:outline-none',
                'transition-colors duration-200',
              ].join(' ')}
            />
          </div>
          <button
            onClick={() => addTag(inputVal)}
            disabled={!inputVal.trim()}
            className="px-2 py-1 text-[10px] font-bold text-[#33ff33]/60 border border-[#33ff33]/20 hover:text-[#33ff33] hover:border-[#33ff33]/50 hover:bg-[#33ff33]/5 disabled:opacity-30 transition-all duration-200"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-0.5 bg-[#1a191c] border border-[#33ff33]/30 max-h-48 overflow-y-auto">
            {suggestions.map((t: any) => (
              <button
                key={t.tag}
                onMouseDown={() => addTag(t.tag)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-[#33ff33]/8 transition-colors"
              >
                <span className="text-xs font-bold text-[#E0E0E0]">{t.tag}</span>
                <span className="text-[10px] text-[#33ff33]/35 truncate flex-1">{t.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
