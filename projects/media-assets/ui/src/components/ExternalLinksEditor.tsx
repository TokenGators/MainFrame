import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { PlatformBadge } from './PlatformBadge';
import { detectPlatform, type ExternalLink } from '../lib/platforms';
import { usePatchAsset } from '../hooks/useAssets';
import { useToast } from '@/components/ui/use-toast';

interface ExternalLinksEditorProps {
  asset: any;
}

const sectionLabel = 'text-[10px] font-bold uppercase tracking-widest text-[#33ff33] mb-2';

export function ExternalLinksEditor({ asset }: ExternalLinksEditorProps) {
  const patchAsset = usePatchAsset();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [inputUrl, setInputUrl] = useState('');

  const links: ExternalLink[] = asset?.external_links || [];

  const save = async (next: ExternalLink[]) => {
    try {
      await patchAsset.mutateAsync({ id: asset.id, fields: { external_links: next } });
    } catch {
      toast({ variant: 'destructive', description: 'Failed to save links' });
    }
  };

  const addLink = () => {
    const url = inputUrl.trim();
    if (!url) return;
    // Avoid duplicates
    if (links.some((l) => l.url === url)) {
      toast({ description: 'Link already added' });
      setInputUrl('');
      setAdding(false);
      return;
    }
    const platform = detectPlatform(url);
    save([...links, { platform, url }]);
    setInputUrl('');
    setAdding(false);
  };

  const removeLink = (url: string) => {
    save(links.filter((l) => l.url !== url));
  };

  // Derive the built-in source links that come from the data itself
  const sourceLinks: ExternalLink[] = [];
  if (asset?.source_url) {
    sourceLinks.push({ platform: detectPlatform(asset.source_url), url: asset.source_url, label: 'Source' });
  }
  if (asset?.source_tweet_url && asset.source_tweet_url !== asset.source_url) {
    sourceLinks.push({ platform: detectPlatform(asset.source_tweet_url), url: asset.source_tweet_url, label: 'Tweet' });
  }

  const allLinks = [...sourceLinks, ...links];
  const hasLinks = allLinks.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className={sectionLabel} style={{ marginBottom: 0 }}>External Links</p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#33ff33]/50 hover:text-[#33ff33] border border-dashed border-[#33ff33]/25 hover:border-[#33ff33]/50 px-1.5 py-0.5 transition-all duration-200"
        >
          <Plus className="h-2.5 w-2.5" /> Add link
        </button>
      </div>

      {/* Add URL input */}
      {adding && (
        <div className="flex gap-1 mb-2">
          <input
            autoFocus
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addLink(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="https://..."
            className={[
              'flex-1 text-xs px-2 py-1',
              'bg-[#28272a] text-[#E0E0E0]',
              'border border-[#33ff33]/30 focus:border-[#33ff33]/70',
              'placeholder-[#33ff33]/25 focus:outline-none',
            ].join(' ')}
          />
          <button
            onClick={addLink}
            className="px-2 py-1 text-[10px] font-bold text-[#28272a] bg-[#33ff33] hover:bg-[#33ff33]/90 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setAdding(false); setInputUrl(''); }}
            className="px-2 py-1 text-[10px] font-bold text-[#33ff33]/50 border border-[#33ff33]/20 hover:text-[#33ff33] transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Links list */}
      {!hasLinks && !adding ? (
        <p className="text-[10px] text-[#33ff33]/25 italic">No external links</p>
      ) : (
        <div className="space-y-1">
          {/* Source links (read-only, derived from data) */}
          {sourceLinks.map((link) => (
            <div key={link.url} className="flex items-center gap-2">
              <PlatformBadge url={link.url} platform={link.platform} label={link.label} size="md" />
              <span className="text-[10px] text-[#33ff33]/35 font-mono truncate flex-1">{link.url}</span>
              <span className="text-[9px] text-[#33ff33]/25 italic shrink-0">auto</span>
            </div>
          ))}
          {/* Manually-added links */}
          {links.map((link) => (
            <div key={link.url} className="flex items-center gap-2">
              <PlatformBadge url={link.url} platform={link.platform} size="md" />
              <span className="text-[10px] text-[#33ff33]/50 font-mono truncate flex-1">{link.url}</span>
              <button
                onClick={() => removeLink(link.url)}
                className="text-[#33ff33]/30 hover:text-red-400 transition-colors shrink-0"
                title="Remove link"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
