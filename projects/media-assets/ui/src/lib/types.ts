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

export interface Holder {
  wallet: string;
  ens: string | null;
  twitter: string | null;
  twitter_display_name: string | null;
  discord: string | null;
  farcaster: string | null;
  farcaster_display_name: string | null;
  opensea: string | null;
  name: string | null;
  current_count: number;
  eth_count: number;
  ape_count: number;
  minted_count: number;
  total_ever_held: number;
  total_sold: number;
  still_holding: boolean;
  first_acquired: string | null;
  last_activity: string | null;
  holding_since: string | null;
  presale: boolean;
  presale_quantity: number | null;
  sources: Record<string, string>;
  // cluster fields
  cluster_id?: number | null;
  wallet_count?: number;
  all_wallets?: string[];
  cluster_signal?: string | null;
}

export interface HolderStats {
  stillHolding: number;
  currentPersons: number;
  minters: number;
  presaleCount: number;
  withEns: number;
  totalTokens: number;
  onEth: number;
  onApe: number;
  identifiedCurrent: number;
  currentHoldersTotal: number;
  newWallets7d: number;
  newWallets30d: number;
  newWallets90d: number;
  newPersons7d: number;
  newPersons30d: number;
  newPersons90d: number;
}

export interface HolderFilters {
  q?: string;
  status?: 'all' | 'holding' | 'sold';
  chain?: 'all' | 'eth' | 'ape' | 'both';
  minter?: boolean;
  sort?: 'current' | 'ever_held' | 'sold' | 'minted' | 'first_acquired' | 'holding_since' | 'last_activity';
  order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  view?: 'wallets' | 'persons';
  presale?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ActivityEvent {
  type: 'mint' | 'sale' | 'transfer' | 'bridge_out' | 'bridge_in';
  token_id: number;
  from: string;
  to: string;
  from_name: string;
  to_name: string;
  timestamp: string;
  chain: 'eth' | 'ape';
  tx_hash: string;
  explorer_url: string;
  marketplace?: string;
  price_native?: number;
  price_currency?: string;
}

export interface CollectorNft {
  token_id: number;
  name: string;
  gateway_image_url?: string;
  rarity_rank?: number | null;
  traits?: Trait[];
  chain?: 'eth' | 'ape' | null;
}

export interface CollectorProfile extends Holder {
  identity: Record<string, unknown>;
  sources: Record<string, string>;
  cluster: { cluster_id: number; signal: string; peers: { wallet: string; current_count: number; ens: string | null }[] } | null;
  nfts: {
    current: CollectorNft[];
    minted:  CollectorNft[];
    sold:    CollectorNft[];
  };
  activity: {
    total:  number;
    recent: ActivityEvent[];
  };
  mentions: {
    count:   number;
    samples: { id: string; text: string; created_at: string; post_type?: string }[];
  };
}

export interface MarketNftThumb {
  token_id: number;
  name: string;
  gateway_image_url: string | null;
  rarity_rank: number | null;
}

export interface MarketListing {
  token_id: number;
  chain: 'eth' | 'ape';
  lister: string;
  price_native: number;
  price_currency: 'ETH' | 'APE';
  marketplace: string;
  listed_at: string | null;
  expires_at: string | null;
  seen_at: string;
  order_hash: string;
  nft: MarketNftThumb;
  lister_summary: { wallet: string; name: string | null } | null;
}

export interface MarketSale {
  token_id: number;
  chain: 'eth' | 'ape';
  price_native: number | null;
  price_currency: string | null;
  marketplace: string | null;
  timestamp: string;
  tx_hash: string;
  explorer_url: string;
  from: string;
  to: string;
  from_name: string | null;
  to_name: string | null;
  nft: MarketNftThumb;
}

export interface MarketResponse {
  summary: {
    active_total: number;
    active_after_filter: number;
    eth_listed: number;
    ape_listed: number;
    spam_suppressed_tokens: number;
    floor_eth: number | null;
    floor_ape: number | null;
  };
  listings: MarketListing[];
  sales: MarketSale[];
}

export interface NftHolderSummary {
  wallet: string;
  ens: string | null;
  twitter: string | null;
  twitter_display_name: string | null;
  farcaster: string | null;
  current_count: number;
}

export interface NftSalesSummary {
  count: number;
  eth_total: number;
  ape_total: number;
  highest_eth: number;
  highest_ape: number;
}

export interface NftProfile extends GatorNFT {
  appearances: any[];
  current_owner: NftHolderSummary | null;
  current_chain: 'eth' | 'ape' | null;
  minter: NftHolderSummary | null;
  past_owners: NftHolderSummary[];
  history: ActivityEvent[];
  sales_summary: NftSalesSummary;
}

export interface TaxonomyTag {
  tag: string;
  description: string;
  tier: 'tier2' | 'tier3' | 'tier4';
  count: number;
}
