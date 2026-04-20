import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AssetType = 'post' | 'retweet' | 'quote-tweet' | 'video' | 'nft' | 'image' | 'gif' | 'article' | 'audio';

// Type chips — colored text on the brand dark bg (#1e1d20 card surface)
export const TYPE_COLORS: Record<string, string> = {
  post:          'bg-blue-900/40   text-blue-300    border border-blue-700/50',
  retweet:       'bg-sky-900/40    text-sky-300     border border-sky-700/50',
  'quote-tweet': 'bg-indigo-900/40 text-indigo-300  border border-indigo-700/50',
  video:         'bg-violet-900/40 text-violet-300   border border-violet-700/50',
  nft:           'bg-[#33ff33]/10  text-[#33ff33]   border border-[#33ff33]/30',
  image:         'bg-slate-800/60  text-slate-300    border border-slate-600/50',
  gif:           'bg-pink-900/40   text-pink-300     border border-pink-700/50',
  article:       'bg-amber-900/40  text-amber-300    border border-amber-700/50',
  audio:         'bg-cyan-900/40   text-cyan-300     border border-cyan-700/50',
};

// Tag tier pills — PRD spec: tier2=blue, tier3=orange, tier4=purple, ai=amber dashed
export const TAG_TIER_COLORS = {
  tier2: 'bg-blue-900/30  text-blue-300   border border-blue-700/40',
  tier3: 'bg-amber-900/30 text-amber-300  border border-amber-700/40',
  tier4: 'bg-purple-900/30 text-purple-300 border border-purple-700/40',
  ai:    'bg-amber-900/20 text-amber-400  border border-amber-500/50 border-dashed',
};
