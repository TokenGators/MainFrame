import { cn, TYPE_COLORS, AssetType } from '../lib/utils';

interface AssetCardProps {
  asset: any;
  onClick: () => void;
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
  const typeColor = TYPE_COLORS[asset.type as AssetType] || TYPE_COLORS.image;
  const isAIPending = asset.flagged_by === 'ai' && asset.tags?.length > 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border bg-card p-3 cursor-pointer hover:shadow-md transition-shadow',
        isAIPending && 'border-amber-300 dark:border-amber-700'
      )}
      role="button"
      tabIndex={0}
    >
      {/* Type chip */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}>
          {asset.type}
        </span>
        {isAIPending && (
          <span className="text-xs text-amber-600 dark:text-amber-400">needs review</span>
        )}
      </div>

      {/* NFT image */}
      {asset.type === 'gator-nft' && asset.gateway_image_url && (
        <img
          src={asset.gateway_image_url}
          alt={asset.name || 'Gator NFT'}
          className="w-full h-28 object-cover rounded mb-2"
          loading="lazy"
        />
      )}

      {/* Content preview */}
      <div className="text-sm text-foreground line-clamp-2 mb-2">
        {asset.text || asset.visual_summary || asset.filename || asset.name || asset.id}
      </div>

      {/* Meta */}
      <div className="text-xs text-muted-foreground mb-2">
        {asset.type === 'tweet' && asset.author_handle && (
          <span>@{asset.author_handle}</span>
        )}
        {asset.type === 'gator-nft' && asset.token_id !== undefined && (
          <span className="font-mono">#{asset.token_id}</span>
        )}
        {asset.created_at && (
          <span className="ml-2">
            {new Date(asset.created_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Stats for tweets */}
      {asset.type === 'tweet' && asset.stats && (
        <div className="text-xs text-muted-foreground mb-2 flex gap-3">
          {asset.stats.likes > 0 && (
            <span>💙 {asset.stats.likes.toLocaleString()}</span>
          )}
          {asset.stats.retweets > 0 && (
            <span>🔁 {asset.stats.retweets}</span>
          )}
          {asset.stats.replies > 0 && (
            <span>💬 {asset.stats.replies}</span>
          )}
        </div>
      )}

      {/* Tags */}
      {asset.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {asset.tags.slice(0, 3).map((tag: string) => (
            <span
              key={tag}
              className="text-xs bg-muted px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {asset.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{asset.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
