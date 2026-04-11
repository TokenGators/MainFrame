export type AssetType = 'tweet' | 'video' | 'image' | 'gif' | 'article' | 'audio' | 'gator-nft';

export interface BaseAsset {
  id: string;
  type: AssetType;
  created_at: string;
  source_url: string;
  tags: string[];
  collections: string[];
  flagged_by: 'human' | 'ai' | null;
  flagged_at: string | null;
  linked_assets: string[];
  metadata: Record<string, unknown>;
}

export interface TweetStats {
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
}

export interface TweetAsset extends BaseAsset {
  type: 'tweet';
  text: string;
  platform_post_id: string;
  author_handle: string;
  stats: TweetStats;
  hashtags: string[];
  mentions: string[];
  media_urls: string[];
  post_type: 'original' | 'retweet' | 'reply';
}

export interface BrandSignals {
  values: string[];
  themes: string[];
  language_patterns: string[];
}

export interface Moment {
  timestamp: string;
  description: string;
}

export interface AestheticNotes {
  color_palette: string;
  editing_style: string;
  production_quality: string;
  music_or_sound: string;
}

export interface VideoAsset extends BaseAsset {
  type: 'video';
  filename: string;
  duration_seconds: number;
  resolution: string;
  tools_used: string[];
  transcript: string;
  visual_summary: string;
  tone_and_energy: string;
  brand_signals: BrandSignals;
  memorable_moments: Moment[];
  aesthetic_notes: AestheticNotes;
  platform_tags: string[];
  featured_gators: string[];
}

export interface Trait {
  trait_type: string;
  value: string;
}

export interface GatorNFT extends BaseAsset {
  type: 'gator-nft';
  token_id: number;
  name: string;
  ipfs_metadata_uri: string;
  ipfs_image_uri: string;
  gateway_image_url: string;
  mml_url: string;
  traits: Trait[];
  rarity_rank: number | null;
  gator_appearances: string[];
}

export interface ImageAsset extends BaseAsset {
  type: 'image' | 'gif';
  filename: string;
  dimensions: string;
  format: string;
  alt_text: string;
  visual_summary: string;
  featured_gators: string[];
}

export interface ArticleAsset extends BaseAsset {
  type: 'article';
  title: string;
  author: string;
  publication: string;
  summary: string;
  full_text: string;
}

export type Asset = TweetAsset | VideoAsset | GatorNFT | ImageAsset | ArticleAsset | BaseAsset;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface TaxonomyTag {
  tag: string;
  description: string;
  tier: 'tier2' | 'tier3' | 'tier4';
  count: number;
}
