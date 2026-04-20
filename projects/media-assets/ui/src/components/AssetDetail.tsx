import { useEffect, useState } from 'react';
import { X, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TagEditor } from './TagEditor';
import { ExternalLinksEditor } from './ExternalLinksEditor';
import { LinkedAssetsPanel } from './LinkedAssetsPanel';
import { PlatformBadge } from './PlatformBadge';
import { useAsset, usePatchAsset } from '../hooks/useAssets';
import { cn, TYPE_COLORS } from '../lib/utils';
import { detectPlatform, stripUrls } from '../lib/platforms';

interface AssetDetailProps {
  assetId: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

const sectionLabel = 'text-[10px] font-bold uppercase tracking-widest text-[#33ff33] mb-2';
const TWEET_TYPES = new Set(['post', 'retweet', 'quote-tweet']);

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#33ff33]/12 bg-[#28272a]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#33ff33]/5 transition-colors duration-200"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#33ff33]/70">{title}</span>
        {open ? <ChevronDown className="h-3 w-3 text-[#33ff33]/40" /> : <ChevronRight className="h-3 w-3 text-[#33ff33]/40" />}
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

export function AssetDetail({ assetId, onClose, onNavigate }: AssetDetailProps) {
  const { toast } = useToast();
  const patchAsset = usePatchAsset();
  const { data: asset, isLoading } = useAsset(assetId);
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Record<string, any>>({});

  useEffect(() => {
    if (assetId && asset) {
      setEdits({ text: asset.text, visual_summary: asset.visual_summary, tags: asset.tags });
      setEditMode(false);
    }
  }, [assetId, asset]);

  const handleSave = async () => {
    try {
      await patchAsset.mutateAsync({
        id: asset!.id,
        fields: { text: edits.text, visual_summary: edits.visual_summary, tags: edits.tags },
      });
      setEditMode(false);
      toast({ description: 'Asset updated' });
    } catch {
      toast({ variant: 'destructive', description: 'Failed to update asset' });
    }
  };

  const typeColor = TYPE_COLORS[asset?.type as string] || TYPE_COLORS.image;
  const isTweet = TWEET_TYPES.has(asset?.type || '');
  const isNFT = asset?.type === 'nft';
  const displayText = isTweet && asset?.text ? stripUrls(asset.text) : asset?.text;

  if (!assetId) return null;

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 w-[580px] z-40',
        'bg-[#1e1d20] border-l border-[#33ff33]/20',
        'shadow-[-8px_0_40px_rgba(0,0,0,0.5)]',
        'transform transition-transform duration-300 ease-in-out',
        assetId ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#33ff33]/20 bg-[#28272a]">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase shrink-0 ${typeColor}`}>
            {asset?.type}
          </span>
          <span className="text-xs text-[#33ff33]/40 font-mono truncate">{asset?.id}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Source platform badges in header */}
          {asset?.source_url && (
            <PlatformBadge url={asset.source_url} platform={detectPlatform(asset.source_url)} size="sm" />
          )}
          {asset?.source_tweet_url && asset.source_tweet_url !== asset?.source_url && (
            <PlatformBadge url={asset.source_tweet_url} platform={detectPlatform(asset.source_tweet_url)} size="sm" />
          )}
          {(asset?.external_links || []).map((l: any, i: number) => (
            <PlatformBadge key={i} url={l.url} platform={l.platform} size="sm" />
          ))}
          <button
            onClick={onClose}
            className="p-1 ml-1 text-[#33ff33]/50 hover:text-[#33ff33] border border-transparent hover:border-[#33ff33]/30 hover:bg-[#33ff33]/5 transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto h-[calc(100vh-49px)] px-5 py-4 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-3 bg-[#33ff33]/8 rounded" />
            ))}
          </div>
        ) : (
          <>
            {/* Content / text */}
            {(displayText || editMode) && (
              <div>
                <p className={sectionLabel}>Content</p>
                {editMode ? (
                  <textarea
                    value={edits.text || ''}
                    onChange={(e) => setEdits({ ...edits, text: e.target.value })}
                    className={[
                      'w-full min-h-[100px] px-3 py-2 text-xs',
                      'bg-[#28272a] text-[#E0E0E0]',
                      'border border-[#33ff33]/30 focus:border-[#33ff33]/70',
                      'focus:outline-none resize-y transition-colors duration-200',
                    ].join(' ')}
                    placeholder="Text content..."
                  />
                ) : (
                  <p className="text-xs text-[#E0E0E0] whitespace-pre-wrap leading-relaxed">
                    {displayText || <span className="text-[#33ff33]/30 italic">No content</span>}
                  </p>
                )}
              </div>
            )}

            {/* Tweet media gallery */}
            {isTweet && asset?.media?.length > 0 && (
              <div>
                <p className={sectionLabel}>Media ({asset.media.length})</p>
                <div className={`grid gap-1 ${asset.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {asset.media.map((m: any, i: number) => {
                    const isVideo = m.type === 'video' || m.type === 'animated_gif';
                    const src = m.preview_image_url || m.url;
                    if (!src) return null;
                    return (
                      <div key={i} className="relative group">
                        <img
                          src={src}
                          alt={m.alt_text || `Media ${i + 1}`}
                          className="w-full object-cover border border-[#33ff33]/15"
                          style={{ maxHeight: asset.media.length === 1 ? '320px' : '160px' }}
                          loading="lazy"
                        />
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <span className="text-2xl">▶</span>
                          </div>
                        )}
                        {m.url && (
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-end justify-end p-1 bg-black/20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] bg-black/70 text-white px-1.5 py-0.5">
                              {isVideo ? 'VIDEO' : `${m.width}×${m.height}`}
                            </span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Image asset preview */}
            {asset?.type === 'image' && (asset?.url || asset?.preview_image_url) && (
              <div>
                <p className={sectionLabel}>Image</p>
                <img
                  src={asset.url || asset.preview_image_url}
                  alt={asset.name || asset.alt_text || 'Image'}
                  className="w-full border border-[#33ff33]/15"
                  loading="lazy"
                />
                {asset.width && asset.height && (
                  <p className="text-[10px] text-[#33ff33]/40 mt-1 font-mono">
                    {asset.width} × {asset.height}
                  </p>
                )}
              </div>
            )}

            {/* NFT image */}
            {isNFT && (asset?.gateway_image_url || asset?.id) && (
              <div>
                <p className={sectionLabel}>NFT Image</p>
                <img
                  src={`/api/assets/${asset.id}/image`}
                  alt={asset.name || 'NFT'}
                  className="w-full border border-[#33ff33]/15"
                  loading="lazy"
                  onError={(e) => {
                    if (asset.gateway_image_url) {
                      (e.target as HTMLImageElement).src = asset.gateway_image_url;
                    }
                  }}
                />
              </div>
            )}

            {/* NFT Traits */}
            {isNFT && asset?.traits?.length > 0 && (
              <div>
                <p className={sectionLabel}>Traits ({asset.traits.length})</p>
                <div className="grid grid-cols-2 gap-1">
                  {asset.traits.map((t: any, i: number) => (
                    <div
                      key={i}
                      className="flex flex-col px-2 py-1.5 bg-[#28272a] border border-[#33ff33]/15"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#33ff33]/50">
                        {t.trait_type}
                      </span>
                      <span className="text-xs text-[#E0E0E0] mt-0.5">{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visual summary */}
            {!isNFT && (asset?.visual_summary || asset?.gateway_image_url) && (
              <div>
                <p className={sectionLabel}>Visual Summary</p>
                {asset?.gateway_image_url && (
                  <img
                    src={asset.gateway_image_url}
                    alt="Asset visual"
                    className="w-full mb-2 border border-[#33ff33]/15"
                    loading="lazy"
                  />
                )}
                {editMode ? (
                  <input
                    value={edits.visual_summary || ''}
                    onChange={(e) => setEdits({ ...edits, visual_summary: e.target.value })}
                    className={[
                      'w-full px-3 py-1.5 text-xs',
                      'bg-[#28272a] text-[#E0E0E0]',
                      'border border-[#33ff33]/30 focus:border-[#33ff33]/70',
                      'focus:outline-none transition-colors duration-200',
                    ].join(' ')}
                    placeholder="Visual summary..."
                  />
                ) : (
                  <p className="text-xs text-[#33ff33]/60 leading-relaxed">
                    {asset?.visual_summary}
                  </p>
                )}
              </div>
            )}

            {/* Video metadata */}
            {asset?.type === 'video' && (
              <div className="space-y-1.5">
                <p className={sectionLabel}>Video Analysis</p>

                {/* Platform tags — separate row, always visible */}
                {asset.platform_tags?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#33ff33]/40 mb-1.5">Platform Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {asset.platform_tags.map((tag: string) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 border border-[#33ff33]/20 text-[#33ff33]/60 bg-[#33ff33]/5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {asset.tone_and_energy && (
                  <Collapsible title="Tone & Energy" defaultOpen>
                    <p className="text-xs text-[#E0E0E0]/80 leading-relaxed">{asset.tone_and_energy}</p>
                  </Collapsible>
                )}

                {asset.brand_signals && (
                  <Collapsible title="Brand Signals">
                    {Object.entries(asset.brand_signals).map(([key, val]: [string, any]) => (
                      <div key={key} className="mb-2 last:mb-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#33ff33]/40 mb-1">
                          {key.replace(/_/g, ' ')}
                        </p>
                        {Array.isArray(val) ? (
                          <div className="flex flex-wrap gap-1">
                            {val.map((v: string) => (
                              <span key={v} className="text-[10px] px-1.5 py-0.5 border border-[#33ff33]/15 text-[#E0E0E0]/70">{v}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#E0E0E0]/80 leading-relaxed">{String(val)}</p>
                        )}
                      </div>
                    ))}
                  </Collapsible>
                )}

                {asset.memorable_moments?.length > 0 && (
                  <Collapsible title={`Memorable Moments (${asset.memorable_moments.length})`}>
                    <div className="space-y-2">
                      {asset.memorable_moments.map((m: any, i: number) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-[10px] font-mono text-[#33ff33]/50 shrink-0 mt-0.5">{m.timestamp}</span>
                          <p className="text-xs text-[#E0E0E0]/80 leading-relaxed">{m.description}</p>
                        </div>
                      ))}
                    </div>
                  </Collapsible>
                )}

                {asset.aesthetic_notes && (
                  <Collapsible title="Aesthetic Notes">
                    {Object.entries(asset.aesthetic_notes).map(([key, val]: [string, any]) => (
                      <div key={key} className="mb-2 last:mb-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#33ff33]/40 mb-1">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-[#E0E0E0]/80 leading-relaxed">{String(val)}</p>
                      </div>
                    ))}
                  </Collapsible>
                )}

                {asset.transcript && (
                  <Collapsible title="Transcript">
                    {Array.isArray(asset.transcript) ? (
                      <div className="space-y-1">
                        {asset.transcript.map((line: any, i: number) => (
                          <p key={i} className="text-xs text-[#E0E0E0]/80 font-mono leading-relaxed">{typeof line === 'string' ? line : JSON.stringify(line)}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#E0E0E0]/80 font-mono leading-relaxed whitespace-pre-wrap">{asset.transcript}</p>
                    )}
                  </Collapsible>
                )}

                {asset.featured_gators?.length > 0 && (
                  <Collapsible title={`Featured Gators (${asset.featured_gators.length})`}>
                    <div className="flex flex-wrap gap-1">
                      {asset.featured_gators.map((g: string) => (
                        <span key={g} className="text-[10px] px-1.5 py-0.5 border border-[#33ff33]/20 text-[#33ff33]/70 bg-[#33ff33]/5">{g}</span>
                      ))}
                    </div>
                  </Collapsible>
                )}
              </div>
            )}

            {/* Metadata */}
            <div>
              <p className={sectionLabel}>Metadata</p>
              <div className="space-y-1.5 text-xs">
                {[
                  ['Type',       asset?.type],
                  ['Created',    asset?.created_at ? new Date(asset.created_at).toLocaleString() : null],
                  ['Author',     asset?.author_handle ? `@${asset.author_handle}` : null],
                  ['Token',      asset?.token_id !== undefined ? `#${asset.token_id}` : null],
                  ['Rarity',     asset?.rarity_rank ? `Rank ${asset.rarity_rank}` : null],
                  ['Reviewed by', asset?.flagged_by === 'ai' ? 'AI (pending)' : asset?.flagged_by === 'human' ? 'Human ✓' : null],
                ].filter(([, val]) => val).map(([label, val]) => (
                  <div key={label as string} className="flex justify-between gap-4">
                    <span className="text-[#33ff33]/50 shrink-0">{label}</span>
                    <span className="text-[#E0E0E0] text-right truncate">{val}</span>
                  </div>
                ))}
                {asset?.stats && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#33ff33]/50 shrink-0">Stats</span>
                    <span className="text-[#E0E0E0]">
                      ♥ {asset.stats.likes}  ↺ {asset.stats.retweets}  ↩ {asset.stats.replies}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* External Links */}
            {asset && (
              <div className="border-t border-[#33ff33]/12 pt-4">
                <ExternalLinksEditor asset={asset} />
              </div>
            )}

            {/* Linked Assets */}
            {asset && (
              <div className="border-t border-[#33ff33]/12 pt-4">
                <LinkedAssetsPanel asset={asset} onNavigate={onNavigate} />
              </div>
            )}

            {/* Tags */}
            {asset && (
              <div className="border-t border-[#33ff33]/12 pt-4">
                <TagEditor asset={asset} />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 pb-6 border-t border-[#33ff33]/12">
              {editMode ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={patchAsset.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#28272a] bg-[#33ff33] hover:bg-[#33ff33]/90 disabled:opacity-50 transition-colors duration-200"
                  >
                    <Save className="h-3 w-3" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 text-xs font-bold text-[#33ff33]/70 border border-[#33ff33]/30 hover:text-[#33ff33] hover:border-[#33ff33]/60 hover:bg-[#33ff33]/5 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-3 py-1.5 text-xs font-bold text-[#33ff33]/70 border border-[#33ff33]/30 hover:text-[#33ff33] hover:border-[#33ff33]/60 hover:bg-[#33ff33]/5 transition-all duration-200"
                >
                  Edit
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
