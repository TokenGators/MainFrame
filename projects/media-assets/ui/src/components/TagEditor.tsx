import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, Plus } from 'lucide-react';
import { useTaxonomyTags } from '../hooks/useTags';
import { usePatchAsset } from '../hooks/useAssets';
import { TAG_TIER_COLORS } from '../lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { AssetType } from '../lib/utils';

// Tier membership lookup — built from taxonomy tags response
function getTagClass(
  tag: string,
  isAI: boolean,
  tierMap: Record<string, string>,
  currentEditTags?: string[]
) {
  if (isAI) return TAG_TIER_COLORS.ai;
  const tier = tierMap[tag];
  if (tier) {
    return TAG_TIER_COLORS[tier as keyof typeof TAG_TIER_COLORS];
  }
  return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
}

interface TagEditorProps {
  asset: any;
  edits?: Record<string, any>;
  setEdits?: (edits: Record<string, any>) => void;
}

export function TagEditor({ asset, edits, setEdits }: TagEditorProps) {
  const { data: taxonomyTags = [] } = useTaxonomyTags();
  const patchAsset = usePatchAsset();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>(asset.tags || []);

  // Update local state when edits change (for editor mode)
  if (edits?.tags && setEdits && edits.tags !== localTags) {
    setLocalTags(edits.tags);
  }

  const isAITagged = asset.flagged_by === 'ai';
  const tagSet = new Set(localTags);

  // Build tier map from taxonomy response
  const tierMap: Record<string, string> = {};
  taxonomyTags.forEach((t: any) => {
    tierMap[t.tag] = t.tier || 'tier2';
  });

  const handleSaveTags = async () => {
    try {
      await patchAsset.mutateAsync({
        id: asset.id,
        fields: { tags: localTags },
      });
      setEdits?.({ ...edits, tags: localTags });
      toast({ description: 'Tags saved successfully' });
    } catch {
      toast({ description: 'Failed to save tags', variant: 'destructive' });
    }
  };

  const removeTag = (tag: string) => {
    const newTags = localTags.filter((t) => t !== tag);
    setLocalTags(newTags);
    setEdits?.({ ...edits, tags: newTags });
  };

  const addTag = (tag: string) => {
    if (!tagSet.has(tag)) {
      const newTags = [...localTags, tag];
      setLocalTags(newTags);
      setEdits?.({ ...edits, tags: newTags });
    }
    setOpen(false);
  };

  const approveAll = () => {
    patchAsset.mutateAsync({
      id: asset.id,
      fields: { flagged_by: 'human', flagged_at: new Date().toISOString() },
    });
    toast({ description: 'Approved as human-reviewed' });
  };

  const approveTag = (tag: string) => {
    patchAsset.mutateAsync({
      id: asset.id,
      fields: { flagged_by: 'human', flagged_at: new Date().toISOString() },
    });
    toast({ description: `Approved tag "${tag}"` });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Tags</span>
        {isAITagged && (
          <Button size="sm" variant="outline" onClick={approveAll} className="text-xs h-7">
            Approve all
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {localTags.length === 0 ? (
          <span className="text-xs text-muted-foreground py-1">No tags applied</span>
        ) : (
          localTags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${getTagClass(
                tag,
                isAITagged,
                tierMap,
                localTags
              )}`}
            >
              {tag}
              {isAITagged && (
                <button
                  onClick={() => approveTag(tag)}
                  className="hover:text-green-600 transition-colors"
                  title="Approve AI tag"
                >
                  <Check className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-red-500 transition-colors"
                title="Remove tag"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add tag
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList className="max-h-64">
                {taxonomyTags.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading taxonomy...</div>
                ) : (
                  taxonomyTags
                    .filter((t: any) => !tagSet.has(t.tag))
                    .map((t: any) => (
                      <CommandItem
                        key={t.tag}
                        onSelect={() => addTag(t.tag)}
                        className="cursor-pointer"
                      >
                        <span className="font-medium">{t.tag}</span>
                        <span className="ml-2 text-muted-foreground text-xs truncate flex-1">
                          {t.description}
                        </span>
                      </CommandItem>
                    ))
                )}
                {taxonomyTags.filter((t: any) => !tagSet.has(t.tag)).length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">
                    No more tags to add
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
