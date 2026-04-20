import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import type { CollectorNft, CollectorProfile, ActivityEvent } from '../lib/types';

const NAMED_ADDRS = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x57e56ce08ae6f0aea6668fd898c52011fe853dc2',
  '0x75f7dbe5e4ee8e424a759f71ad725f8cdd0ff2d1',
]);
function isNamedAddress(a?: string | null) {
  return !!a && NAMED_ADDRS.has(a.toLowerCase());
}

function short(wallet: string) {
  return wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : '—';
}

function relativeDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const ms   = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60)  return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `${mins}m`;
  const hrs  = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24)   return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const years = Math.floor(days / 365);
  const remDays = days % 365;
  if (years > 0)  return remDays > 0 ? `${years}y ${remDays}d` : `${years}y`;
  return `${days}d`;
}

function primaryName(p: CollectorProfile): string {
  return (p.twitter_display_name as string) ||
         (p.twitter ? `@${p.twitter.replace('@', '')}` : '') ||
         (p.farcaster_display_name as string) ||
         (p.farcaster ? `@${p.farcaster}` : '') ||
         (p.ens as string) ||
         (p.opensea as string) ||
         short(p.wallet);
}

// ── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-baseline gap-3 mb-3 border-b border-[#33ff33]/20 pb-1 hover:border-[#33ff33]/40 transition-colors"
      >
        <span className="text-[10px] text-[#33ff33]/60 font-mono w-3">{open ? '▾' : '▸'}</span>
        <span className="text-sm uppercase tracking-[0.2em] text-[#33ff33]">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-[#33ff33]/40">{count.toLocaleString()}</span>
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// Address → link (unless it's a named bridge/mint address)
function WalletRef({ wallet, name }: { wallet: string; name: string }) {
  if (isNamedAddress(wallet)) {
    return <span className="text-[#33ff33]/40">{name}</span>;
  }
  return (
    <Link to={`/collectors/${wallet}`} className="text-[#33ff33]/70 hover:text-[#33ff33] hover:underline">
      {name}
    </Link>
  );
}

// ── NFT card ──────────────────────────────────────────────────────────────────

function NftCard({ nft }: { nft: CollectorNft }) {
  const img = nft.gateway_image_url;
  return (
    <Link to={`/nfts/${nft.token_id}`} className="flex flex-col border border-[#33ff33]/15 bg-[#1e1d20] hover:border-[#33ff33]/40 transition-colors group">
      <div className="aspect-square bg-black overflow-hidden relative">
        {img ? (
          <img src={img} alt={nft.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#33ff33]/20 text-xs">no image</div>
        )}
        {nft.chain && (
          <span className={`absolute top-1 right-1 text-[8px] px-1.5 py-0.5 uppercase tracking-widest ${
            nft.chain === 'ape'
              ? 'bg-black/70 text-purple-300 border border-purple-400/40'
              : 'bg-black/70 text-blue-300 border border-blue-400/40'
          }`}>{nft.chain}</span>
        )}
      </div>
      <div className="px-2 py-1.5 flex items-center justify-between">
        <span className="text-[11px] text-[#33ff33]/70 font-mono">#{nft.token_id}</span>
        {nft.rarity_rank != null && (
          <span className="text-[9px] text-[#33ff33]/40">rank {nft.rarity_rank}</span>
        )}
      </div>
    </Link>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col border border-[#33ff33]/15 bg-[#33ff33]/[0.03] px-4 py-2.5 min-w-[100px]">
      <span className="text-xl font-bold text-[#33ff33]">{value}</span>
      <span className="text-[9px] text-[#33ff33]/40 uppercase tracking-widest mt-0.5">{label}</span>
      {sub && <span className="text-[9px] text-[#33ff33]/25 mt-0.5">{sub}</span>}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function CollectorPage() {
  const { wallet } = useParams<{ wallet: string }>();

  const { data: p, isLoading, error } = useQuery({
    queryKey: ['collector-profile', wallet],
    queryFn:  () => api.holders.profile(wallet!),
    enabled:  !!wallet,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return <div className="p-8 text-[#33ff33]/40">Loading collector…</div>;
  }
  if (error || !p) {
    return (
      <div className="p-8">
        <div className="text-red-400/70 text-sm">Collector not found — {wallet}</div>
        <Link to="/holders" className="text-[#33ff33]/60 hover:text-[#33ff33] text-xs mt-3 inline-block">← back to holders</Link>
      </div>
    );
  }

  const name = primaryName(p);
  const isCurrentHolder = p.still_holding;

  return (
    <div className="h-[calc(100vh-45px)] overflow-auto">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">

        {/* ── Back link ── */}
        <Link to="/holders" className="text-[10px] text-[#33ff33]/40 hover:text-[#33ff33]/80 uppercase tracking-widest">
          ← holders
        </Link>

        {/* ── Header ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#33ff33] leading-tight">{name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <a href={`https://etherscan.io/address/${p.wallet}`} target="_blank" rel="noreferrer"
                  className="font-mono text-[11px] text-[#33ff33]/40 hover:text-[#33ff33]/80 hover:underline">
                  {p.wallet}
                </a>
                {p.presale && (
                  <span className="text-[9px] px-1.5 py-0.5 border border-yellow-400/40 text-yellow-400 uppercase tracking-widest">
                    Presale OG{p.presale_quantity ? ` ×${p.presale_quantity}` : ''}
                  </span>
                )}
                {!isCurrentHolder && (
                  <span className="text-[9px] px-1.5 py-0.5 border border-red-400/30 text-red-400/70 uppercase tracking-widest">
                    No longer holding
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Socials row ── */}
          <div className="flex flex-wrap gap-2 text-xs">
            {p.twitter && (
              <a href={`https://x.com/${p.twitter.replace('@', '')}`} target="_blank" rel="noreferrer"
                className="px-2.5 py-1 border border-[#33ff33]/20 text-[#33ff33]/70 hover:text-[#33ff33] hover:border-[#33ff33]/50">
                𝕏 @{p.twitter.replace('@', '')}
              </a>
            )}
            {p.farcaster && (
              <a href={`https://warpcast.com/${p.farcaster}`} target="_blank" rel="noreferrer"
                className="px-2.5 py-1 border border-purple-400/25 text-purple-400/80 hover:text-purple-400 hover:border-purple-400/60">
                ⬡ @{p.farcaster}
              </a>
            )}
            {p.discord && (
              <span className="px-2.5 py-1 border border-indigo-400/25 text-indigo-400/70"># {p.discord}</span>
            )}
            {p.opensea && (
              <a href={`https://opensea.io/${p.opensea}`} target="_blank" rel="noreferrer"
                className="px-2.5 py-1 border border-blue-400/25 text-blue-400/80 hover:text-blue-400 hover:border-blue-400/60">
                ⛵ {p.opensea}
              </a>
            )}
            {p.ens && (
              <span className="px-2.5 py-1 border border-[#33ff33]/20 text-[#33ff33]/70">◈ {p.ens}</span>
            )}
          </div>

          {/* ── Stat tiles ── */}
          <div className="flex flex-wrap gap-2">
            <Tile label="Holding" value={p.current_count} sub={`${p.eth_count ?? 0} ETH · ${p.ape_count ?? 0} APE`} />
            <Tile label="Minted"  value={p.minted_count} />
            <Tile label="Ever Held" value={p.total_ever_held} />
            <Tile label="Sold"    value={p.total_sold} />
            {p.holding_since && (
              <Tile label="Holding Since" value={relativeDate(p.holding_since)} sub={new Date(p.holding_since).toLocaleDateString()} />
            )}
            {p.first_acquired && (
              <Tile label="First Acquired" value={relativeDate(p.first_acquired)} sub={new Date(p.first_acquired).toLocaleDateString()} />
            )}
            {p.last_activity && (
              <Tile label="Last Activity" value={relativeDate(p.last_activity)} sub={new Date(p.last_activity).toLocaleDateString()} />
            )}
          </div>
        </div>

        {/* ── Cluster peers ── */}
        {p.cluster && p.cluster.peers.length > 0 && (
          <Section title="Wallet Cluster" count={p.cluster.peers.length + 1}>
            <div className="text-[10px] text-[#33ff33]/40 mb-2">
              Linked via <span className="text-[#33ff33]/70">{p.cluster.signal}</span> — totals above cover all wallets in the cluster.
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 text-[11px] border border-[#33ff33]/40 bg-[#33ff33]/10 text-[#33ff33] font-mono">
                {short(p.wallet)} (this)
              </span>
              {p.cluster.peers.map(peer => (
                <Link key={peer.wallet} to={`/collectors/${peer.wallet}`}
                  className="px-2.5 py-1 text-[11px] border border-[#33ff33]/20 text-[#33ff33]/60 font-mono hover:border-[#33ff33]/50 hover:text-[#33ff33]">
                  {peer.ens || short(peer.wallet)} · {peer.current_count}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* ── Currently holding ── */}
        {p.nfts.current.length > 0 && (
          <Section title="Currently Holding" count={p.nfts.current.length}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
              {p.nfts.current.map(nft => <NftCard key={nft.token_id} nft={nft} />)}
            </div>
          </Section>
        )}

        {/* ── Minted ── */}
        {p.nfts.minted.length > 0 && (
          <Section title="Minted" count={p.nfts.minted.length} defaultOpen={false}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
              {p.nfts.minted.slice(0, 40).map(nft => <NftCard key={nft.token_id} nft={nft} />)}
            </div>
            {p.nfts.minted.length > 40 && (
              <div className="text-[10px] text-[#33ff33]/30 mt-2">+{p.nfts.minted.length - 40} more minted</div>
            )}
          </Section>
        )}

        {/* ── Sold / no longer held ── */}
        {p.nfts.sold.length > 0 && (
          <Section title="Previously Held" count={p.nfts.sold.length} defaultOpen={false}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-1.5 opacity-60">
              {p.nfts.sold.slice(0, 50).map(nft => <NftCard key={nft.token_id} nft={nft} />)}
            </div>
            {p.nfts.sold.length > 50 && (
              <div className="text-[10px] text-[#33ff33]/30 mt-2">+{p.nfts.sold.length - 50} more</div>
            )}
          </Section>
        )}

        {/* ── Recent activity ── */}
        {p.activity.recent.length > 0 && (
          <Section title="Activity" count={p.activity.total}>
            <div className="border border-[#33ff33]/15 divide-y divide-[#33ff33]/10">
              {p.activity.recent.map((ev: ActivityEvent, i: number) => {
                const walletLc = p.wallet.toLowerCase();
                const isFromMe = ev.from?.toLowerCase() === walletLc;
                const isToMe   = ev.to?.toLowerCase()   === walletLc;

                // Determine action label with direction
                let label = ev.type.toUpperCase();
                let cls = 'text-[#33ff33]/40 border-[#33ff33]/20';
                if (ev.type === 'mint') {
                  label = 'MINT';
                  cls = 'text-emerald-400/80 border-emerald-400/30';
                } else if (ev.type === 'sale') {
                  label = isFromMe ? 'SELL' : isToMe ? 'BUY' : 'SALE';
                  cls = isFromMe
                    ? 'text-red-400/80 border-red-400/30'
                    : 'text-emerald-400/80 border-emerald-400/30';
                } else if (ev.type === 'transfer') {
                  label = isFromMe ? 'SENT' : isToMe ? 'RECEIVED' : 'TRANSFER';
                  cls = 'text-[#33ff33]/50 border-[#33ff33]/20';
                } else if (ev.type === 'bridge_out') {
                  label = 'BRIDGE →';
                  cls = 'text-blue-400/70 border-blue-400/30';
                } else if (ev.type === 'bridge_in') {
                  label = '→ BRIDGE';
                  cls = 'text-purple-400/70 border-purple-400/30';
                }

                return (
                  <div key={`${ev.tx_hash}-${i}`} className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-[#33ff33]/[0.03]">
                    <span className="text-[#33ff33]/30 w-16">{relativeDate(ev.timestamp)}</span>
                    <span className={`text-[10px] border px-1.5 py-0.5 ${cls} min-w-[80px] text-center`}>{label}</span>
                    <Link to={`/nfts/${ev.token_id}`} className="text-[#33ff33]/70 hover:text-[#33ff33] hover:underline font-mono w-16">
                      #{ev.token_id}
                    </Link>
                    <span className="text-[#33ff33]/50 min-w-[90px]">
                      {ev.price_native != null
                        ? ev.price_currency === 'APE'
                          ? `${ev.price_native.toLocaleString(undefined, {maximumFractionDigits: 0})} APE`
                          : `${ev.price_native.toFixed(3)} Ξ`
                        : ''}
                    </span>
                    <span className="flex-1 truncate text-[#33ff33]/40">
                      <WalletRef wallet={ev.from} name={ev.from_name} />
                      <span className="text-[#33ff33]/20 mx-1">→</span>
                      <WalletRef wallet={ev.to} name={ev.to_name} />
                    </span>
                    <span className="text-[9px] text-[#33ff33]/25 uppercase">{ev.chain}</span>
                    <a href={ev.explorer_url} target="_blank" rel="noreferrer"
                      className="text-[10px] text-[#33ff33]/30 hover:text-[#33ff33]/70 font-mono">↗</a>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Mentions ── */}
        {p.mentions.count > 0 && (
          <Section title={`Posts Mentioning @${p.twitter}`} count={p.mentions.count} defaultOpen={false}>
            <div className="flex flex-col gap-2">
              {p.mentions.samples.map(post => (
                <div key={post.id} className="border border-[#33ff33]/10 p-3 hover:border-[#33ff33]/30">
                  <div className="flex items-center gap-2 text-[10px] text-[#33ff33]/30 uppercase tracking-widest mb-1">
                    <span>{post.post_type || 'post'}</span>
                    <span>·</span>
                    <span>{relativeDate(post.created_at)}</span>
                  </div>
                  <div className="text-[#33ff33]/80 text-sm">{post.text}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="h-12" />
      </div>
    </div>
  );
}
