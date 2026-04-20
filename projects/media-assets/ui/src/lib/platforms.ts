export type Platform = 'twitter' | 'instagram' | 'giphy' | 'opensea' | 'tiktok' | 'youtube' | 'link';

export interface ExternalLink {
  platform: Platform;
  url: string;
  label?: string;
}

export interface PlatformConfig {
  label: string;
  abbr: string;       // short display label
  textClass: string;
  bgClass: string;
  borderClass: string;
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  twitter:   { label: 'X / Twitter', abbr: 'X',     textClass: 'text-white',          bgClass: 'bg-zinc-900',       borderClass: 'border-zinc-600/60' },
  instagram: { label: 'Instagram',   abbr: 'IG',    textClass: 'text-pink-300',        bgClass: 'bg-pink-900/40',    borderClass: 'border-pink-600/50' },
  giphy:     { label: 'Giphy',       abbr: 'GIPHY', textClass: 'text-green-300',       bgClass: 'bg-green-900/40',   borderClass: 'border-green-600/50' },
  opensea:   { label: 'OpenSea',     abbr: 'OS',    textClass: 'text-blue-300',        bgClass: 'bg-blue-900/40',    borderClass: 'border-blue-600/50' },
  tiktok:    { label: 'TikTok',      abbr: 'TT',    textClass: 'text-cyan-300',        bgClass: 'bg-cyan-900/40',    borderClass: 'border-cyan-600/50' },
  youtube:   { label: 'YouTube',     abbr: 'YT',    textClass: 'text-red-300',         bgClass: 'bg-red-900/40',     borderClass: 'border-red-600/50' },
  link:      { label: 'Link',        abbr: '↗',     textClass: 'text-[#33ff33]/70',   bgClass: 'bg-[#33ff33]/5',    borderClass: 'border-[#33ff33]/25' },
};

export function detectPlatform(url: string): Platform {
  if (!url) return 'link';
  const u = url.toLowerCase();
  if (u.includes('x.com') || u.includes('twitter.com')) return 'twitter';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('giphy.com')) return 'giphy';
  if (u.includes('opensea.io')) return 'opensea';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return 'link';
}

/** Strip all URLs from tweet text for clean display */
export function stripUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').trim();
}
