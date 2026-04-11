import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AssetType = 'tweet' | 'video' | 'gator-nft' | 'image' | 'gif' | 'article' | 'audio';

export const TYPE_COLORS: Record<AssetType, string> = {
  tweet: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  video: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  'gator-nft': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  image: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  gif: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  article: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  audio: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
};

export const TAG_TIER_COLORS = {
  tier2: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
  tier3: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
  tier4: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
  ai: 'bg-amber-50 text-amber-700 border-amber-300 border-dashed dark:bg-amber-950 dark:text-amber-300',
};
