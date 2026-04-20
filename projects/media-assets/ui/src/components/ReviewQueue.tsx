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

  const btnBase = 'px-3 py-1.5 text-xs font-bold border transition-all duration-200 flex items-center gap-1.5';
  const btnGreen  = `${btnBase} text-[#28272a] bg-[#33ff33] border-[#33ff33] hover:bg-[#33ff33]/90 disabled:opacity-30 disabled:cursor-not-allowed`;
  const btnOutline = `${btnBase} text-[#33ff33]/70 border-[#33ff33]/30 hover:text-[#33ff33] hover:border-[#33ff33]/60 hover:bg-[#33ff33]/5 disabled:opacity-30 disabled:cursor-not-allowed`;
  const btnRed    = `${btnBase} text-white bg-red-700 border-red-700 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed`;

  return (
    <div className="h-[calc(100vh-45px)] bg-background flex">
      {/* Main list */}
      <div className="flex-1 overflow-y-auto">
        {/* Page header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#33ff33]/18 bg-[#1e1d20] sticky top-0 z-10">
          <h1 className="text-sm font-bold text-[#33ff33] uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            REVIEW QUEUE
          </h1>
          <div className="flex items-center gap-3 text-xs">
            <span className={pendingReview === 'ai' ? 'text-amber-400 font-bold' : 'text-[#33ff33]/40'}>
              ● AI ({assets.length})
            </span>
            <span className="text-[#33ff33]/40">
              {focusedIndex + 1} of {assets.length}
            </span>
          </div>
        </div>

        {/* Empty state */}
        {emptyState ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-[#33ff33]/40">
            {pendingReview === 'ai' ? (
              <>
                <Check className="h-12 w-12 mb-4 text-[#33ff33]" />
                <p className="text-sm font-bold uppercase text-[#33ff33]">All caught up!</p>
                <p className="text-xs mt-2">All AI-tagged assets have been reviewed.</p>
              </>
            ) : (
              <>
                <XOctagon className="h-12 w-12 mb-4" />
                <p className="text-sm font-bold uppercase">No assets to review</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#33ff33]/10">
            {assets.map((a, idx) => {
              const isFocused = idx === focusedIndex;
              return (
                <div
                  key={a.id}
                  className={cn(
                    'px-5 py-3 cursor-pointer transition-all duration-200',
                    isFocused
                      ? 'bg-[#33ff33]/8 border-l-2 border-l-[#33ff33]'
                      : 'border-l-2 border-l-transparent hover:bg-[#33ff33]/5',
                  )}
                  onClick={() => setFocusedIndex(idx)}
                  role="button"
                  tabIndex={0}
                >
                  {/* Row header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 border border-[#33ff33]/30 text-[#33ff33]">
                        {a.type}
                      </span>
                      <span className="text-[10px] font-mono text-[#33ff33]/40">{a.id}</span>
                      {a.flagged_by === 'ai' && (
                        <span className="text-[10px] text-amber-400 font-bold">AI</span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#33ff33]/30">
                      {a.created_at && new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Content preview */}
                  <p className="text-xs text-[#E0E0E0] line-clamp-2 mb-2 leading-relaxed">
                    {a.text || a.visual_summary || 'No content'}
                  </p>

                  {/* Tag pills */}
                  <div className="flex flex-wrap gap-1">
                    {a.tags?.slice(0, 5).map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 border border-amber-600/40 text-amber-400 bg-amber-900/20"
                      >
                        {tag}
                      </span>
                    ))}
                    {(a.tags?.length || 0) > 5 && (
                      <span className="text-[10px] text-[#33ff33]/30">+{a.tags.length - 5}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right action panel */}
      {!emptyState && asset && (
        <div className="w-72 border-l border-[#33ff33]/18 bg-[#1e1d20] flex flex-col">
          {/* Panel header */}
          <div className="px-4 py-3 border-b border-[#33ff33]/18">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#33ff33]">
              Quick Actions
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Content preview */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#33ff33] mb-1.5">
                Content
              </p>
              <p className="text-xs text-[#E0E0E0] whitespace-pre-wrap leading-relaxed line-clamp-6">
                {asset.text || asset.visual_summary || 'No content'}
              </p>
            </div>

            <div className="border-t border-[#33ff33]/12 pt-3">
              {/* Keyboard shortcuts */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#33ff33] mb-2">
                Shortcuts
              </p>
              <div className="space-y-1 text-[10px]">
                {[
                  ['A', 'Approve'],
                  ['S', 'Skip'],
                  ['R', 'Reject'],
                  ['J / ↓', 'Next'],
                  ['K / ↑', 'Prev'],
                ].map(([key, action]) => (
                  <div key={key} className="flex justify-between">
                    <span className="font-bold text-[#33ff33] font-mono">{key}</span>
                    <span className="text-[#33ff33]/50">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#33ff33]/12 pt-3 space-y-2">
              {/* Single-asset actions */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  className={btnGreen}
                  onClick={() => approve(focusedIndex)}
                  disabled={asset.flagged_by === 'human'}
                >
                  <Check className="h-3 w-3" /> Approve
                </button>
                <button className={btnOutline} onClick={() => skip(focusedIndex)}>
                  Skip
                </button>
                <button
                  className={btnRed}
                  onClick={() => reject(focusedIndex)}
                  disabled={asset.flagged_by === 'human'}
                >
                  <X className="h-3 w-3" /> Reject
                </button>
                <button className={btnOutline} onClick={() => setFocusedIndex(0)}>
                  Top
                </button>
              </div>

              {/* Bulk actions */}
              <button className={`${btnOutline} w-full justify-center`} onClick={approveAll}>
                <Check className="h-3 w-3" /> Approve all ({assets.length})
              </button>
              <button
                className={`${btnBase} w-full justify-center text-red-400 border-red-700/40 hover:bg-red-900/20 hover:border-red-600/60`}
                onClick={rejectAll}
              >
                <X className="h-3 w-3" /> Reject all ({assets.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
