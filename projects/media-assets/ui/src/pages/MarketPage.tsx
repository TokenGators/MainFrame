import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import type { MarketListing, MarketSale, MarketNftThumb } from '../lib/types';

function relativeDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function priceStr(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return '—';
  if (currency === 'APE') return `${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} APE`;
  return `${amount.toFixed(3)} Ξ`;
}

// Section header with collapser + chain toggle
function Section({
  title,
  count,
  right,
  children,
}: {
  title: string;
  count?: number;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3 border-b border-[#33ff33]/20 pb-1">
        <button onClick={() => setOpen(v => !v)}
          className="flex items-baseline gap-3 flex-1 text-left hover:text-[#33ff33]">
          <span className="text-[10px] text-[#33ff33]/60 font-mono w-3">{open ? '▾' : '▸'}</span>
          <span className="text-sm uppercase tracking-[0.2em] text-[#33ff33]">{title}</span>
          {count !== undefined && (
            <span className="text-xs text-[#33ff33]/40">{count.toLocaleString()}</span>
          )}
        </button>
        {right}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

// Chain filter pill bar
function ChainFilter({
  value,
  onChange,
}: {
  value: 'all' | 'eth' | 'ape';
  onChange: (v: 'all' | 'eth' | 'ape') => void;
}) {
  return (
    <div className="flex border border-[#33ff33]/20 text-[10px] uppercase">
      {(['all', 'eth', 'ape'] as const).map(v => (
        <button key={v} onClick={() => onChange(v)}
          className={`px-2 py-0.5 tracking-widest ${
            value === v ? 'bg-[#33ff33]/15 text-[#33ff33]' : 'text-[#33ff33]/50 hover:text-[#33ff33]/80'
          }`}>
          {v}
        </button>
      ))}
    </div>
  );
}

function Thumb({
  nft,
  chain,
  badge,
  footer,
}: {
  nft: MarketNftThumb;
  chain?: 'eth' | 'ape';
  badge?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Link to={`/nfts/${nft.token_id}`}
      className="group flex flex-col border border-[#33ff33]/15 bg-[#1e1d20] hover:border-[#33ff33]/50 transition-colors">
      <div className="aspect-square bg-black overflow-hidden relative">
        {nft.gateway_image_url ? (
          <img src={nft.gateway_image_url} alt={nft.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🐊</div>
        )}
        {chain && (
          <span className={`absolute top-1 right-1 text-[8px] px-1.5 py-0.5 uppercase tracking-widest ${
            chain === 'ape'
              ? 'bg-black/70 text-purple-300 border border-purple-400/40'
              : 'bg-black/70 text-blue-300 border border-blue-400/40'
          }`}>{chain}</span>
        )}
        {badge && (
          <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 bg-black/75 text-[#33ff33] border border-[#33ff33]/40">
            {badge}
          </span>
        )}
      </div>
      <div className="px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#33ff33]/70 font-mono">#{nft.token_id}</span>
          {nft.rarity_rank != null && (
            <span className="text-[9px] text-[#33ff33]/30">rank {nft.rarity_rank}</span>
          )}
        </div>
        {footer && <div className="mt-0.5 text-[11px]">{footer}</div>}
      </div>
    </Link>
  );
}

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col border border-[#33ff33]/15 bg-[#33ff33]/[0.03] px-4 py-2.5 min-w-[100px]">
      <span className="text-xl font-bold text-[#33ff33]">{value}</span>
      <span className="text-[9px] text-[#33ff33]/40 uppercase tracking-widest mt-0.5">{label}</span>
      {sub && <span className="text-[9px] text-[#33ff33]/25 mt-0.5">{sub}</span>}
    </div>
  );
}

export function MarketPage() {
  const [listingChain, setListingChain] = useState<'all' | 'eth' | 'ape'>('all');
  const [saleChain,    setSaleChain]    = useState<'all' | 'eth' | 'ape'>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['market'],
    queryFn:  () => api.market.get(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  if (isLoading) return <div className="p-8 text-[#33ff33]/40">Loading market…</div>;
  if (error || !data) {
    return (
      <div className="p-8">
        <div className="text-red-400/70 text-sm">
          Market data unavailable. Run <code className="text-[#33ff33]/70">sync-listings.py</code> to populate.
        </div>
      </div>
    );
  }

  const listings: MarketListing[] = data.listings.filter(
    l => listingChain === 'all' || l.chain === listingChain
  );
  const sales: MarketSale[] = data.sales.filter(
    s => saleChain === 'all' || s.chain === saleChain
  );

  return (
    <div className="h-[calc(100vh-45px)] overflow-auto">
      <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#33ff33]">Market</h1>
          <div className="text-[10px] text-[#33ff33]/40 uppercase tracking-widest mt-0.5">
            Recently listed · recently sold
          </div>
        </div>

        {/* Summary tiles */}
        <div className="flex flex-wrap gap-2">
          <Tile
            label="Active Listings"
            value={data.summary.active_after_filter.toLocaleString()}
            sub={data.summary.spam_suppressed_tokens > 0
              ? `${data.summary.spam_suppressed_tokens} spam filtered`
              : undefined}
          />
          <Tile
            label="ETH Listed"
            value={data.summary.eth_listed}
            sub={data.summary.floor_eth != null ? `floor ${data.summary.floor_eth.toFixed(3)} Ξ` : undefined}
          />
          <Tile
            label="APE Listed"
            value={data.summary.ape_listed}
            sub={data.summary.floor_ape != null
              ? `floor ${data.summary.floor_ape.toLocaleString(undefined, { maximumFractionDigits: 0 })} APE`
              : undefined}
          />
          <Tile label="Recent Sales" value={sales.length} />
        </div>

        {/* Recently Listed */}
        <Section
          title="Recently Listed"
          count={listings.length}
          right={<ChainFilter value={listingChain} onChange={setListingChain} />}
        >
          {listings.length === 0 ? (
            <div className="text-[11px] text-[#33ff33]/30 py-8 text-center">
              No recent listings (or all filtered as spam).
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
              {listings.map(l => (
                <Thumb
                  key={`${l.chain}-${l.token_id}-${l.order_hash}`}
                  nft={l.nft}
                  chain={l.chain}
                  badge={priceStr(l.price_native, l.price_currency)}
                  footer={
                    <div className="flex justify-between text-[10px] text-[#33ff33]/40">
                      <span>{relativeDate(l.listed_at || l.seen_at)}</span>
                      {l.lister_summary?.name ? (
                        <span className="truncate ml-1">{l.lister_summary.name}</span>
                      ) : null}
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </Section>

        {/* Recently Sold */}
        <Section
          title="Recently Sold"
          count={sales.length}
          right={<ChainFilter value={saleChain} onChange={setSaleChain} />}
        >
          {sales.length === 0 ? (
            <div className="text-[11px] text-[#33ff33]/30 py-8 text-center">No recent sales.</div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
              {sales.map((s, i) => (
                <Thumb
                  key={`${s.tx_hash}-${s.token_id}-${i}`}
                  nft={s.nft}
                  chain={s.chain}
                  badge={priceStr(s.price_native, s.price_currency)}
                  footer={
                    <div className="flex justify-between text-[10px] text-[#33ff33]/40">
                      <span>{relativeDate(s.timestamp)}</span>
                      <span className="truncate ml-1">{s.to_name || '—'}</span>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </Section>

        <div className="h-12" />
      </div>
    </div>
  );
}
