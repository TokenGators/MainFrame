import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import type { NftProfile, NftHolderSummary, ActivityEvent } from '../lib/types';

const NAMED_ADDRS = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x57e56ce08ae6f0aea6668fd898c52011fe853dc2',
  '0x75f7dbe5e4ee8e424a759f71ad725f8cdd0ff2d1',
]);
function isNamedAddress(a?: string | null) {
  return !!a && NAMED_ADDRS.has(a.toLowerCase());
}

function short(w: string) {
  return w ? `${w.slice(0, 6)}…${w.slice(-4)}` : '—';
}

function relativeDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const years = Math.floor(days / 365);
  const remDays = days % 365;
  if (years > 0) return remDays > 0 ? `${years}y ${remDays}d` : `${years}y`;
  return `${days}d`;
}

function holderName(h: NftHolderSummary) {
  return h.twitter_display_name
    || (h.twitter ? `@${h.twitter.replace('@', '')}` : '')
    || (h.farcaster ? `@${h.farcaster}` : '')
    || h.ens
    || short(h.wallet);
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

// ── Tile ─────────────────────────────────────────────────────────────────────

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col border border-[#33ff33]/15 bg-[#33ff33]/[0.03] px-4 py-2.5 min-w-[100px]">
      <span className="text-xl font-bold text-[#33ff33]">{value}</span>
      <span className="text-[9px] text-[#33ff33]/40 uppercase tracking-widest mt-0.5">{label}</span>
      {sub && <span className="text-[9px] text-[#33ff33]/25 mt-0.5">{sub}</span>}
    </div>
  );
}

// ── Wallet chip that links to collector page (or shows plain name for bridge) ─

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

// ── Holder card ──────────────────────────────────────────────────────────────

function HolderRow({ h, label }: { h: NftHolderSummary; label?: string }) {
  return (
    <Link
      to={`/collectors/${h.wallet}`}
      className="flex items-center gap-3 px-3 py-2 border border-[#33ff33]/15 hover:border-[#33ff33]/40 hover:bg-[#33ff33]/[0.03] bg-[#1e1d20]"
    >
      {label && (
        <span className="text-[9px] uppercase tracking-widest text-[#33ff33]/40 w-16">{label}</span>
      )}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm text-[#33ff33] truncate">{holderName(h)}</span>
        <span className="text-[10px] text-[#33ff33]/30 font-mono truncate">{h.wallet}</span>
      </div>
      <span className="text-[10px] text-[#33ff33]/40">{h.current_count} held</span>
    </Link>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function NFTDetailPage() {
  const { token_id } = useParams<{ token_id: string }>();

  const { data: p, isLoading, error } = useQuery({
    queryKey: ['nft-profile', token_id],
    queryFn: () => api.nfts.profile(token_id!),
    enabled: !!token_id,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return <div className="p-8 text-[#33ff33]/40">Loading NFT…</div>;
  }
  if (error || !p) {
    return (
      <div className="p-8">
        <div className="text-red-400/70 text-sm">NFT not found — #{token_id}</div>
        <Link to="/nfts" className="text-[#33ff33]/60 hover:text-[#33ff33] text-xs mt-3 inline-block">
          ← back to NFTs
        </Link>
      </div>
    );
  }

  const img = p.gateway_image_url;
  const sales = p.history.filter(h => h.type === 'sale');

  return (
    <div className="h-[calc(100vh-45px)] overflow-auto">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        <Link
          to="/nfts"
          className="text-[10px] text-[#33ff33]/40 hover:text-[#33ff33]/80 uppercase tracking-widest"
        >
          ← NFTs
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-[320px] flex-shrink-0">
            {img ? (
              <img
                src={img}
                alt={p.name}
                className="w-full border border-[#33ff33]/20 bg-black"
              />
            ) : (
              <div className="w-full aspect-square bg-[#1e1d20] border border-[#33ff33]/10 flex items-center justify-center text-4xl">
                🐊
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <div>
              <h1 className="text-3xl font-bold text-[#33ff33] leading-tight">
                {p.name || `TokenGator #${p.token_id}`}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[11px] text-[#33ff33]/40">#{p.token_id}</span>
                {p.rarity_rank != null && (
                  <span className="text-[10px] px-1.5 py-0.5 border border-[#33ff33]/25 text-[#33ff33]/70 uppercase tracking-widest">
                    Rank {p.rarity_rank}
                  </span>
                )}
                {p.current_chain && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 uppercase tracking-widest border ${
                      p.current_chain === 'ape'
                        ? 'text-purple-300 border-purple-400/40'
                        : 'text-blue-300 border-blue-400/40'
                    }`}
                  >
                    on {p.current_chain}
                  </span>
                )}
              </div>
            </div>

            {/* Sales summary tiles */}
            <div className="flex flex-wrap gap-2">
              <Tile label="Sales" value={p.sales_summary.count} />
              {p.sales_summary.eth_total > 0 && (
                <Tile
                  label="ETH Volume"
                  value={`${p.sales_summary.eth_total.toFixed(3)} Ξ`}
                  sub={`high ${p.sales_summary.highest_eth.toFixed(3)} Ξ`}
                />
              )}
              {p.sales_summary.ape_total > 0 && (
                <Tile
                  label="APE Volume"
                  value={`${p.sales_summary.ape_total.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}`}
                  sub={`high ${p.sales_summary.highest_ape.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}`}
                />
              )}
              <Tile label="Ever Owners" value={(p.past_owners.length + (p.current_owner ? 1 : 0))} />
            </div>

            {/* Owner / minter cards */}
            <div className="flex flex-col gap-2">
              {p.current_owner && <HolderRow h={p.current_owner} label="Owner" />}
              {p.minter && p.minter.wallet !== p.current_owner?.wallet && (
                <HolderRow h={p.minter} label="Minter" />
              )}
            </div>
          </div>
        </div>

        {/* Traits */}
        {p.traits && p.traits.length > 0 && (
          <Section title="Traits" count={p.traits.length}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              {p.traits.map(t => (
                <div
                  key={t.trait_type}
                  className="border border-[#33ff33]/15 bg-[#1e1d20] px-3 py-2"
                >
                  <div className="text-[9px] uppercase tracking-widest text-[#33ff33]/40">
                    {t.trait_type}
                  </div>
                  <div className="text-sm text-[#E0E0E0] truncate">{t.value}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Past owners */}
        {p.past_owners.length > 0 && (
          <Section title="Past Owners" count={p.past_owners.length} defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {p.past_owners.map(h => (
                <HolderRow key={h.wallet} h={h} />
              ))}
            </div>
          </Section>
        )}

        {/* Full history */}
        {p.history.length > 0 && (
          <Section title="Full History" count={p.history.length}>
            <div className="border border-[#33ff33]/15 divide-y divide-[#33ff33]/10">
              {p.history.map((ev: ActivityEvent, i: number) => {
                const typeMeta: Record<string, { label: string; cls: string }> = {
                  mint: { label: 'MINT', cls: 'text-emerald-400/80 border-emerald-400/30' },
                  sale: { label: 'SALE', cls: 'text-yellow-400/80 border-yellow-400/30' },
                  transfer: { label: 'TRANSFER', cls: 'text-[#33ff33]/50 border-[#33ff33]/20' },
                  bridge_out: { label: 'BRIDGE →', cls: 'text-blue-400/70 border-blue-400/30' },
                  bridge_in: { label: '→ BRIDGE', cls: 'text-purple-400/70 border-purple-400/30' },
                };
                const meta = typeMeta[ev.type] ?? {
                  label: ev.type.toUpperCase(),
                  cls: 'text-[#33ff33]/40 border-[#33ff33]/20',
                };
                return (
                  <div
                    key={`${ev.tx_hash}-${i}`}
                    className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-[#33ff33]/[0.03]"
                  >
                    <span className="text-[#33ff33]/30 w-16">{relativeDate(ev.timestamp)}</span>
                    <span className={`text-[10px] border px-1.5 py-0.5 ${meta.cls} min-w-[70px] text-center`}>
                      {meta.label}
                    </span>
                    <span className="text-[#33ff33]/50 min-w-[90px]">
                      {ev.price_native != null
                        ? ev.price_currency === 'APE'
                          ? `${ev.price_native.toLocaleString(undefined, { maximumFractionDigits: 0 })} APE`
                          : `${ev.price_native.toFixed(3)} Ξ`
                        : ''}
                    </span>
                    <span className="flex-1 truncate">
                      <WalletRef wallet={ev.from} name={ev.from_name} />
                      <span className="text-[#33ff33]/20 mx-1">→</span>
                      <WalletRef wallet={ev.to} name={ev.to_name} />
                    </span>
                    <span className="text-[9px] text-[#33ff33]/25 uppercase">{ev.chain}</span>
                    <a
                      href={ev.explorer_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[#33ff33]/30 hover:text-[#33ff33]/70 font-mono"
                    >
                      ↗
                    </a>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Sales only */}
        {sales.length > 0 && (
          <Section title="Sales Only" count={sales.length} defaultOpen={false}>
            <div className="border border-[#33ff33]/15 divide-y divide-[#33ff33]/10">
              {sales.map((ev, i) => (
                <div
                  key={`${ev.tx_hash}-s-${i}`}
                  className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-[#33ff33]/[0.03]"
                >
                  <span className="text-[#33ff33]/30 w-20">{relativeDate(ev.timestamp)}</span>
                  <span className="text-yellow-400/80 min-w-[90px]">
                    {ev.price_currency === 'APE'
                      ? `${(ev.price_native ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} APE`
                      : `${(ev.price_native ?? 0).toFixed(3)} Ξ`}
                  </span>
                  <span className="flex-1 truncate">
                    <WalletRef wallet={ev.from} name={ev.from_name} />
                    <span className="text-[#33ff33]/20 mx-1">→</span>
                    <WalletRef wallet={ev.to} name={ev.to_name} />
                  </span>
                  {ev.marketplace && (
                    <span className="text-[10px] text-[#33ff33]/30 uppercase">{ev.marketplace}</span>
                  )}
                  <a
                    href={ev.explorer_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#33ff33]/30 hover:text-[#33ff33]/70 font-mono"
                  >
                    ↗
                  </a>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Appearances */}
        {p.appearances && p.appearances.length > 0 && (
          <Section title="Appearances" count={p.appearances.length} defaultOpen={false}>
            <div className="text-[11px] text-[#33ff33]/50">
              Featured in {p.appearances.length} post{p.appearances.length === 1 ? '' : 's'}.
            </div>
          </Section>
        )}

        <div className="h-12" />
      </div>
    </div>
  );
}
