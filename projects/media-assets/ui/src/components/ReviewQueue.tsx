import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Check, XOctagon, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAssets } from '../hooks/useAssets';
import { usePatchAsset } from '../hooks/useAssets';
import { TYPE_COLORS, TAG_TIER_COLORS, cn, AssetType } from '../lib/utils';

function getTagClass(tag: string, isAI: boolean, tierMap: Record<string, string>) {
  if (isAI) return TAG_TIER_COLORS.ai;
  const tier = tierMap[tag];
  if (tier) {
    return TAG_TIER_COLORS[tier as keyof typeof TAG_TIER_COLORS];
  }
  return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
}

interface ReviewQueueProps {
  initialFlagged?: 'ai' | 'human' | 'untagged';
}

export function ReviewQueue({ initialFlagged = 'ai' }: ReviewQueueProps) {
  const { toast } = useToast();
  const patchAsset = usePatchAsset();

  // Use a combined query for filtered assets
  const { data, isLoading, refetch } = useAssets({
    flagged: initialFlagged,
    page: 1,
    per_page: 100,
  });

  const [assets, setAssets] = useState<any[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [pendingReview, setPendingReview] = useState<'ai' | any>(initialFlagged);

  // Refresh when asset is reviewed
  const onReviewComplete = useCallback(() => {
    refetch();
    toast({ description: 'Processing complete' });
  }, [refetch, toast]);

  // Handle review actions
  const approve = useCallback(
    async (idx: number) => {
      const asset = assets[idx];
      if (!asset) return;

      try {
        await patchAsset.mutateAsync({
          id: asset.id,
          fields: { flagged_by: 'human', flagged_at: new Date().toISOString() },
        });
        const remaining = [...assets];
        remaining.splice(idx, 1);
        setAssets(remaining);
        setPendingReview((prev: 'ai' | any) => (prev === 'ai' ? 'ai' : 'human'));
        
        // If we reviewed something, check what we need to review next
        if (idx === focusedIndex && assets.length === 1) {
          setPendingReview((prev: 'ai' | any) => (prev === 'ai' ? 'human' : 'ai'));
        }
        
        toast({ description: 'Approved ✅' });
        onReviewComplete();
      } catch {
        toast({ variant: 'destructive', description: 'Failed to approve' });
      } finally {
        if (assets.length === 0) {
          setAssets([]);
          setFocusedIndex(0);
        }
      }
    },
    [assets, focusedIndex, onReviewComplete, patchAsset, toast]
  );

  const approveAll = useCallback(async () => {
    if (assets.length === 0) return;
    
    const promises = assets.map((asset) =>
      patchAsset.mutateAsync({
        id: asset.id,
        fields: { flagged_by: 'human', flagged_at: new Date().toISOString() },
      })
    );

    try {
      await Promise.all(promises);
      setAssets([]);
        setPendingReview((prev: 'ai' | any) => (prev === 'ai' ? 'ai' : 'human'));
      toast({ description: `Approved ${assets.length} assets ✅` });
      onReviewComplete();
    } catch {
      toast({ variant: 'destructive', description: 'Failed to approve' });
    }
  }, [assets, onReviewComplete, patchAsset, toast]);

  const skip = useCallback(
    async (idx: number) => {
      const asset = assets[idx];
      if (!asset) return;

      try {
        await patchAsset.mutateAsync({
          id: asset.id,
          fields: { skip_review: true },
        });
        const remaining = [...assets];
        remaining.splice(idx, 1);
        setAssets(remaining);
        toast({ description: 'Skipped ⏭️' });
        onReviewComplete();
      } catch {
        toast({ variant: 'destructive', description: 'Failed to skip' });
      } finally {
        if (assets.length === 0) {
          setAssets([]);
          setFocusedIndex(0);
        }
      }
    },
    [assets, onReviewComplete, patchAsset, toast]
  );

  const reject = useCallback(
    async (idx: number) => {
      const asset = assets[idx];
      if (!asset) return;

      try {
        await patchAsset.mutateAsync({
          id: asset.id,
          fields: { flagged_by: 'human', flagged_at: new Date().toISOString() },
        });
        const remaining = [...assets];
        remaining.splice(idx, 1);
        setAssets(remaining);
        toast({ description: 'Rejected ❌' });
        onReviewComplete();
      } catch {
        toast({ variant: 'destructive', description: 'Failed to reject' });
      } finally {
        if (assets.length === 0) {
          setAssets([]);
          setFocusedIndex(0);
        }
      }
    },
    [assets, onReviewComplete, patchAsset, toast]
  );

  const rejectAll = useCallback(() => {
    if (assets.length === 0) return;
    
    const promises = assets.map((asset) =>
      patchAsset.mutateAsync({
        id: asset.id,
        fields: { flagged_by: 'human', flagged_at: new Date().toISOString() },
      })
    );

    Promise.all(promises)
      .then(() => {
        setAssets([]);
        setPendingReview((prev: 'ai' | any) => (prev === 'ai' ? 'ai' : 'human'));
        toast({ description: `Rejected ${assets.length} assets ❌` });
        onReviewComplete();
      })
      .catch(() => {
        toast({ variant: 'destructive', description: 'Failed to reject' });
      });
  }, [assets, onReviewComplete, patchAsset, toast]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
      ) {
        return;
      }

      // Movement keys
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, assets.length - 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }

      // Action keys
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        approve(focusedIndex);
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        skip(focusedIndex);
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        reject(focusedIndex);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [approve, assets, approve, focusedIndex, reject, skip, approveAll, rejectAll]);

  // Watch for asset changes
  useEffect(() => {
    if (data?.data) {
      setAssets(data.data);
      setPendingReview(initialFlagged === 'ai' ? 'ai' : 'human');
      setFocusedIndex(0);
    }
  }, [data, initialFlagged]);

  const asset = assets[focusedIndex];
  const buildStatus = asset?.flagged_by === 'ai' ? 'ai' : asset?.flagged_by === 'human' ? 'human' : 'untagged';

  // Build tier map from taxonomy tags
  const tierMap: Record<string, string> = {
    'gator': 'tier2',
    'nft': 'tier2',
    'blockchain': 'tier2',
    'crypto': 'tier2',
    'digital': 'tier3',
    'art': 'tier3',
    'collection': 'tier3',
    'trading': 'tier3',
    'marketplace': 'tier4',
    'defi': 'tier4',
    'dao': 'tier4',
  };

  const getTagClassForAsset = (tag: string) => {
    const isAI = asset && asset.flagged_by === 'ai';
    return getTagClass(tag, isAI || false, tierMap);
  };

  const emptyState = assets.length === 0;

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background flex">
      {/* Main list view */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Review Queue
          </h1>
          
          <div className="flex items-center gap-2">
            <Badge variant={pendingReview === 'ai' ? 'default' : 'outline'} className="gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              AI needs review
            </Badge>
            <Badge variant={pendingReview === 'human' ? 'default' : 'outline'} className="gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Approved
            </Badge>
          </div>
        </div>

        {/* Empty state */}
        {emptyState ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
            {pendingReview === 'ai' ? (
              <>
                <Check className="h-16 w-16 mb-4 text-green-500" />
                <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
                <p>All AI-tagged assets have been reviewed.</p>
                <p className="text-sm mt-4">Switch view to see human-reviewed assets or untagged content.</p>
              </>
            ) : (
              <>
                <XOctagon className="h-16 w-16 mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">No assets to review</h2>
                <p>Switch view to see AI-tagged assets that need review.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current focused asset preview */}
            {asset && (
              <div className="sticky top-0 bg-background z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{asset.type}</Badge>
                    <span className="text-sm text-muted-foreground">#{asset.id}</span>
                    {asset.flagged_by === 'ai' && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        AI reviewed
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {focusedIndex + 1} of {assets.length}
                  </div>
                </div>
              </div>
            )}

            {/* Asset list */}
            {assets.map((a, idx) => {
              const isFocused = idx === focusedIndex;
              return (
                <div
                  key={a.id}
                  className={cn(
                    'border rounded-lg p-4 transition-all',
                    isFocused
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => setFocusedIndex(idx)}
                  tabIndex={0}
                  role="button"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={a.type === 'tweet' ? 'default' : 'secondary'}>
                        {a.type}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">#{a.id}</span>
                      {a.flagged_by === 'ai' && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ AI tag
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.created_at && new Date(a.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-sm mb-2">{a.text || 'No text content'}</div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {a.tags?.slice(0, 4).map((tag: string) => (
                      <span
                        key={tag}
                        className={`text-xs px-2 py-0.5 rounded-full border ${getTagClassForAsset(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Stats: 💙 {a.stats?.likes || 0} 🔁 {a.stats?.retweets || 0} 💬 {a.stats?.replies || 0}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {!emptyState && asset && (
        <div className="w-80 border-l bg-muted/30">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Quick Actions</h2>
              <Badge variant="outline">#{asset.id}</Badge>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Asset preview */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Content
              </h3>
              <p className="text-sm whitespace-pre-wrap">{asset.text || 'No content'}</p>
            </div>

            {/* Tag stats */}
            {/* <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Tags
              </h3>
              <div className="space-y-1">
                {asset.tags?.map((tag: string) => (
                  <div key={tag} className="flex items-center justify-between text-sm">
                    <span className={getTagClassForAsset(tag)}>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${getTagClassForAsset(
                          tag
                        )}`}
                      >
                        {tag}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div> */}

            <Separator />

            {/* Action buttons */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Keyboard shortcuts
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span>A</span>
                  <span className="text-muted-foreground">Approve all tags ✅</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>S</span>
                  <span className="text-muted-foreground">Skip to next ⏭️</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>R</span>
                  <span className="text-muted-foreground">Reject ❌</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>J / ↓</span>
                  <span className="text-muted-foreground">Next asset</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>K / ↑</span>
                  <span className="text-muted-foreground">Previous asset</span>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => approve(focusedIndex)}
                  disabled={asset.flagged_by === 'human'}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => skip(focusedIndex)}
                >
                  Skip
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => reject(focusedIndex)}
                  disabled={asset.flagged_by === 'human'}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button variant="outline" onClick={() => setFocusedIndex(0)}>
                  Go to top
                </Button>
              </div>

              <Separator />

              <Button variant="outline" className="w-full" onClick={approveAll}>
                <Check className="h-4 w-4 mr-2" />
                Approve all ({assets.length})
              </Button>
              <Button variant="outline" className="w-full" onClick={rejectAll}>
                <X className="h-4 w-4 mr-2" />
                Reject all ({assets.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
