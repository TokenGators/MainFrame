import { useState, useEffect } from 'react';
import { cn, TYPE_COLORS } from '../lib/utils';
import { stripUrls, detectPlatform } from '../lib/platforms';
import { PlatformBadge } from './PlatformBadge';

interface AssetCardProps {
  asset: any;
  onClick: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  selectMode?: boolean;
  selected?: boolean;
}

const TWEET_TYPES = new Set(['post', 'retweet', 'quote-tweet']);

// Image area height by size — taller as cards get bigger
const IMG_HEIGHT: Record<string, string> = {
  xs: 'h-28',
  sm: 'h-36',
  md: 'h-48',
  lg: 'h-64',
  xl: 'h-80',
};

export function AssetCard({ asset, onClick, size = 'md', selectMode = false, selected = false }: AssetCardProps) {
  const typeColor = TYPE_COLORS[asset.type] || TYPE_COLORS.image;
  const isAIPending = asset.flagged_by === 'ai' && asset.tags?.length > 0;
  const isTweet = TWEET_TYPES.has(asset.type);
  const imgH = IMG_HEIGHT[size];

  const displayText = isTweet && asset.text
    ? stripUrls(asset.text)
    : (asset.text || asset.visual_summary || asset.filename || asset.name || asset.id);

  // Resolve thumbnail URL
  const directThumb = (() => {
    if (asset.type === 'nft') return `/api/assets/${asset.id}/image`;
    if (asset.type === 'image') return asset.url || asset.preview_image_url;
    if (isTweet && asset.media?.length > 0) {
      const first = asset.media[0];
      return first.preview_image_url || first.url;
    }
    return null;
  })();

  // For videos with no direct thumbnail, fetch from the first linked tweet
  const linkedTweetId = !directThumb && asset.type === 'video'
    ? (asset.linked_assets || []).find((id: string) => id.startsWith('tweet-'))
    : null;
  const [linkedThumb, setLinkedThumb] = useState<string | null>(null);
  useEffect(() => {
    if (!linkedTweetId) return;
    fetch(`/api/assets/${linkedTweetId}`)
      .then(r => r.ok ? r.json() : null)
      .then(tweet => {
        if (!tweet) return;
        const url = tweet.media?.[0]?.preview_image_url || tweet.media?.[0]?.url || null;
        setLinkedThumb(url);
      })
      .catch(() => {});
  }, [linkedTweetId]);

  const thumbUrl = directThumb || linkedThumb;

  const isVideo = isTweet && asset.media?.[0]?.type === 'video';
  const isGif   = isTweet && asset.media?.[0]?.type === 'animated_gif';

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[#1e1d20] border cursor-pointer relative',
        'transition-all duration-200',
        selected
          ? 'border-[#33ff33] bg-[#33ff33]/8 ring-1 ring-[#33ff33]/40'
          : isAIPending
            ? 'border-amber-600/40 hover:border-amber-500/70 hover:bg-amber-900/10'
            : 'border-[#33ff33]/15 hover:border-[#33ff33]/50 hover:bg-[#33ff33]/5',
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Selection checkbox overlay */}
      {selectMode && (
        <div className={cn(
          'absolute top-2 right-2 z-10 w-4 h-4 border-2 transition-all duration-150',
          selected
            ? 'bg-[#33ff33] border-[#33ff33]'
            : 'bg-black/40 border-[#33ff33]/60 hover:border-[#33ff33]',
        )}>
          {selected && (
            <svg viewBox="0 0 10 10" className="w-full h-full p-0.5">
              <polyline points="1,5 4,8 9,2" stroke="#1e1d20" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
      {/* Image area — full width, contain so nothing is cropped */}
      {thumbUrl ? (
        <div className={cn('relative w-full bg-black/30 overflow-hidden', imgH)}>
          <img
            src={thumbUrl}
            alt={asset.name || asset.alt_text || asset.type}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              // If local NFT image fails, fall back to gateway URL
              if (asset.type === 'nft' && asset.gateway_image_url) {
                (e.target as HTMLImageElement).src = asset.gateway_image_url;
              }
            }}
          />
          {/* Video / GIF overlay */}
          {(isVideo || isGif || (asset.type === 'video' && linkedThumb)) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl bg-black/50 px-2.5 py-1 leading-none">
                {isGif ? 'GIF' : '▶'}
              </span>
            </div>
          )}
          {/* Multi-media badge */}
          {isTweet && asset.media?.length > 1 && (
            <span className="absolute top-1.5 right-1.5 text-[10px] bg-black/70 text-white px-1.5 py-0.5 font-bold">
              +{asset.media.length - 1}
            </span>
          )}
          {/* Platform badges overlay (bottom-left) */}
          <div className="absolute bottom-1.5 left-1.5 flex gap-1">
            {asset.source_url && (
              <PlatformBadge url={asset.source_url} platform={detectPlatform(asset.source_url)} size="sm" />
            )}
            {asset.source_tweet_url && asset.source_tweet_url !== asset.source_url && (
              <PlatformBadge url={asset.source_tweet_url} platform={detectPlatform(asset.source_tweet_url)} size="sm" />
            )}
            {(asset.external_links || []).slice(0, 2).map((l: any, i: number) => (
              <PlatformBadge key={i} url={l.url} platform={l.platform} size="sm" />
            ))}
          </div>
        </div>
      ) : (
        /* No image — type-colored placeholder */
        <div className={cn('w-full bg-[#28272a] flex items-center justify-center', imgH)}>
          <span className="text-3xl opacity-20">
            {asset.type === 'nft' ? '🐊' : asset.type === 'video' ? '▶' : asset.type === 'audio' ? '♪' : '◻'}
          </span>
        </div>
      )}

      {/* Card body */}
      <div className="p-2.5">
        {/* Type chip + AI badge */}
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase ${typeColor}`}>
            {asset.type}
          </span>
          <div className="flex items-center gap-1.5">
            {isAIPending && (
              <span className="text-[10px] text-amber-400 font-bold">AI</span>
            )}
            {asset.type === 'nft' && asset.token_id !== undefined && (
              <span className="text-[10px] text-[#33ff33]/50 font-mono">#{asset.token_id}</span>
            )}
          </div>
        </div>

        {/* Content preview — bigger text, more lines on larger sizes */}
        {displayText && (
          <p className={cn(
            'text-[#E0E0E0] leading-snug mb-1.5',
            size === 'xs' || size === 'sm' ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'
          )}>
            {displayText}
          </p>
        )}

        {/* Meta row */}
        <div className="text-xs text-[#33ff33]/50 flex items-center gap-2">
          {isTweet && asset.author_handle && (
            <span>@{asset.author_handle}</span>
          )}
          {asset.created_at && (
            <span className="ml-auto shrink-0">
              {new Date(asset.created_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Tweet stats */}
        {isTweet && asset.stats && (size === 'lg' || size === 'xl') && (
          <div className="text-xs text-[#33ff33]/40 mt-1 flex gap-3">
            {asset.stats.likes > 0 && <span>♥ {asset.stats.likes.toLocaleString()}</span>}
            {asset.stats.retweets > 0 && <span>↺ {asset.stats.retweets}</span>}
            {asset.stats.replies > 0 && <span>↩ {asset.stats.replies}</span>}
          </div>
        )}

        {/* Tags — only on larger sizes */}
        {asset.tags?.length > 0 && (size === 'md' || size === 'lg' || size === 'xl') && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {asset.tags.slice(0, size === 'xl' ? 6 : size === 'lg' ? 4 : 3).map((tag: string) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 border border-[#33ff33]/20 text-[#33ff33]/70 bg-[#33ff33]/5"
              >
                {tag}
              </span>
            ))}
            {asset.tags.length > 3 && size === 'md' && (
              <span className="text-[10px] text-[#33ff33]/40">+{asset.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
