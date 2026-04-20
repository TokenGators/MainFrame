import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useHolders, useHolderStats } from '../hooks/useHolders';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { HolderFilters, Holder, ActivityEvent } from '../lib/types';

// ── helpers ──────────────────────────────────────────────────────────────────

function shortWallet(wallet: string) {
  return wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : '—';
}

// Well-known addresses that shouldn't link to a collector page
const NAMED_ADDRS = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x57e56ce08ae6f0aea6668fd898c52011fe853dc2', // ETH Bridge
  '0x75f7dbe5e4ee8e424a759f71ad725f8cdd0ff2d1', // APE Bridge
]);
function isNamedAddress(addr: string) {
  return !addr || NAMED_ADDRS.has(addr.toLowerCase());
}

/**
 * Best human-readable primary name.
 * Returns { label, isAddress } — isAddress=true means the label IS the wallet
 * so there's no point showing a redundant secondary line.
 * Priority: X display name > Farcaster display name > ENS > Discord > short wallet
 */
function primaryName(h: Holder): { label: string; isAddress: boolean } {
  if (h.twitter_display_name)   return { label: h.twitter_display_name,               isAddress: false };
  if (h.twitter)                return { label: `@${h.twitter.replace('@', '')}`,      isAddress: false };
  if (h.farcaster_display_name) return { label: h.farcaster_display_name,              isAddress: false };
  if (h.farcaster)              return { label: `@${h.farcaster}`,                     isAddress: false };
  if (h.ens)                    return { label: h.ens,                                 isAddress: false };
  if (h.opensea)                return { label: h.opensea,                             isAddress: false };
  if (h.discord)                return { label: h.discord,                             isAddress: false };
  return { label: shortWallet(h.wallet), isAddress: true };
}

function relativeDate(iso: string | null) {
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

function Stat({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 min-w-[70px]">
      <span className={`text-lg font-bold ${accent ? 'text-yellow-400' : 'text-[#33ff33]'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <span className="text-[9px] text-[#33ff33]/40 uppercase tracking-widest mt-0.5 whitespace-nowrap">{label}</span>
      {sub && <span className="text-[9px] text-[#33ff33]/25 mt-0.5">{sub}</span>}
    </div>
  );
}

function StatGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col border border-[#33ff33]/15 bg-[#33ff33]/[0.03]">
      <div className="px-3 pt-1.5 pb-0.5 text-[8px] text-[#33ff33]/25 uppercase tracking-[0.15em] border-b border-[#33ff33]/10">
        {label}
      </div>
      <div className="flex divide-x divide-[#33ff33]/10">
        {children}
      </div>
    </div>
  );
}

function SortHeader({
  col, label, current, order, onSort,
}: {
  col: HolderFilters['sort'];
  label: string;
  current: HolderFilters['sort'];
  order: 'asc' | 'desc';
  onSort: (col: HolderFilters['sort']) => void;
}) {
  const active = current === col;
  return (
    <th
      className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50 cursor-pointer select-none hover:text-[#33ff33] whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      {label}
      <span className="ml-1 opacity-60">
        {active ? (order === 'desc' ? '▼' : '▲') : '⇅'}
      </span>
    </th>
  );
}

// Tiny clipboard copy button. Pass always=true inside tooltips/popovers where group-hover won't reach.
function CopyButton({ text, always = false }: { text: string; always?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={`ml-0.5 text-[9px] text-[#33ff33]/40 hover:text-[#33ff33] transition-all shrink-0 ${
        always ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
      title={`Copy ${text}`}
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
}

// Small tooltip for showing all wallets in a cluster
function WalletClusterTooltip({ wallets }: { wallets: string[] }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function open() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
  }

  return (
    <span className="inline-block">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={open}
        onMouseLeave={() => setPos(null)}
        onFocus={open}
        onBlur={() => setPos(null)}
        className="ml-1 text-[9px] border border-[#33ff33]/30 bg-[#33ff33]/10 text-[#33ff33]/60 px-1 py-0.5 cursor-default select-none hover:text-[#33ff33] hover:border-[#33ff33]/50"
      >
        {wallets.length}W
      </button>
      {pos && (
        <div
          className="fixed z-[9999] bg-[#1a1a1a] border border-[#33ff33]/30 p-2 min-w-[200px] shadow-lg"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={open}
          onMouseLeave={() => setPos(null)}
        >
          <div className="text-[9px] text-[#33ff33]/40 uppercase tracking-widest mb-1">All wallets</div>
          {wallets.map(w => (
            <div key={w} className="flex items-center gap-1 py-0.5">
              <a
                href={`https://etherscan.io/address/${w}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] text-[#33ff33]/60 hover:text-[#33ff33] hover:underline"
              >
                {shortWallet(w)}
              </a>
              <CopyButton text={w} always />
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

// Source label map
const SOURCE_LABELS: Record<string, string> = {
  opensea:                'linked on OpenSea',
  presale_list:           'presale data',
  farcaster_hub:          'Farcaster on-chain',
  opensea_handle_match:   'handle match — verify',
  farcaster_handle_match: 'handle match — verify',
};
function sourceLabel(src: string | undefined) {
  if (!src) return 'spreadsheet import';
  return SOURCE_LABELS[src] ?? src;
}

// ⓘ identity source tooltip
function IdentitySourceTooltip({ h }: { h: Holder }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const fields: { icon: string; value: string; field: string }[] = [
    ...(h.twitter  ? [{ icon: '𝕏', value: `@${h.twitter.replace('@','')}`,  field: 'twitter'  }] : []),
    ...(h.farcaster? [{ icon: '⬡', value: `@${h.farcaster}`,                field: 'farcaster_username' }] : []),
    ...(h.discord  ? [{ icon: '#', value: h.discord,                         field: 'discord'  }] : []),
    ...(h.opensea  ? [{ icon: '⛵', value: h.opensea,                        field: 'opensea_username'  }] : []),
    ...(h.ens      ? [{ icon: '◈', value: h.ens,                             field: 'ens'      }] : []),
  ];

  if (!fields.length) return null;

  function open() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
  }

  return (
    <span className="inline-block ml-1">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={open}
        onMouseLeave={() => setPos(null)}
        onFocus={open}
        onBlur={() => setPos(null)}
        className="text-[10px] text-[#33ff33]/25 hover:text-[#33ff33]/60 leading-none cursor-default select-none"
      >
        ⓘ
      </button>
      {pos && (
        <div
          className="fixed z-[9999] bg-[#1a1a1a] border border-[#33ff33]/30 p-2.5 min-w-[220px] shadow-lg"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={open}
          onMouseLeave={() => setPos(null)}
        >
          <div className="text-[9px] text-[#33ff33]/40 uppercase tracking-widest mb-2">Identity sources</div>
          <div className="flex flex-col gap-1.5">
            {fields.map(({ icon, value, field }) => (
              <div key={field} className="flex flex-col">
                <span className="text-[11px] text-[#33ff33]/80">{icon} {value}</span>
                <span className={`text-[9px] ml-3 ${
                  (h.sources?.[field] === 'opensea_handle_match' || h.sources?.[field] === 'farcaster_handle_match')
                    ? 'text-yellow-400/60'
                    : 'text-[#33ff33]/30'
                }`}>
                  {sourceLabel(h.sources?.[field])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

// ✏️ inline identity editor
const IDENTITY_FIELDS = [
  { key: 'twitter',              label: 'X handle',      placeholder: 'username (no @)' },
  { key: 'twitter_display_name', label: 'X display name', placeholder: 'Full Name' },
  { key: 'discord',              label: 'Discord',        placeholder: 'username' },
  { key: 'farcaster_username',   label: 'Farcaster',      placeholder: 'username' },
  { key: 'opensea_username',     label: 'OpenSea',        placeholder: 'username' },
  { key: 'name',                 label: 'Name',           placeholder: 'Display name' },
] as const;

function EditIdentityPopover({ h, onSaved }: { h: Holder; onSaved: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({
    twitter:              h.twitter || '',
    twitter_display_name: h.twitter_display_name || '',
    discord:              h.discord || '',
    farcaster_username:   h.farcaster || '',
    opensea_username:     h.opensea || '',
    name:                 h.name || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function openPanel() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // Open to the right if there's room, otherwise left
      const left = Math.min(r.right + 4, window.innerWidth - 260);
      setPos({ top: r.top, left });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.holders.updateIdentity(h.wallet, fields);
      setSaved(true);
      setTimeout(() => { setSaved(false); setPos(null); onSaved(); }, 800);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openPanel}
        className="opacity-0 group-hover:opacity-100 ml-1 text-[10px] text-[#33ff33]/30 hover:text-[#33ff33]/80 transition-opacity shrink-0"
        title="Edit identity"
      >
        ✏
      </button>
      {pos && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setPos(null)} />
          <div
            className="fixed z-[9999] bg-[#1a1a1a] border border-[#33ff33]/30 p-3 w-56 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="text-[9px] text-[#33ff33]/40 uppercase tracking-widest mb-2">
              Edit identity — {h.wallet.slice(0, 8)}…
            </div>
            <form onSubmit={save} className="flex flex-col gap-1.5">
              {IDENTITY_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <label className="text-[9px] text-[#33ff33]/40 uppercase tracking-widest">{label}</label>
                  <input
                    value={fields[key]}
                    onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="bg-[#111] border border-[#33ff33]/20 text-[#E0E0E0] text-[11px] px-2 py-1 focus:outline-none focus:border-[#33ff33]/50 placeholder:text-[#33ff33]/15"
                  />
                </div>
              ))}
              <div className="flex gap-1.5 mt-1">
                <button
                  type="submit"
                  disabled={saving || saved}
                  className="flex-1 py-1.5 text-[10px] border border-[#33ff33]/40 text-[#33ff33]/80 hover:text-[#33ff33] hover:border-[#33ff33]/70 disabled:opacity-50 transition-all"
                >
                  {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setPos(null)}
                  className="px-3 py-1.5 text-[10px] border border-[#33ff33]/15 text-[#33ff33]/30 hover:text-[#33ff33]/60"
                >
                  ✕
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const PER_PAGE = 50;
const ACTIVITY_PER_PAGE = 100;

type TopView = 'wallets' | 'persons' | 'activity';

export function HoldersExplorer() {
  const queryClient = useQueryClient();
  const [topView, setTopView] = useState<TopView>('wallets');
  const [view, setView] = useState<'wallets' | 'persons'>('wallets');
  const [filters, setFilters] = useState<HolderFilters>({
    status: 'all',
    chain: 'all',
    sort: 'current',
    order: 'desc',
    page: 1,
    per_page: PER_PAGE,
  });
  const [q, setQ] = useState('');

  // Activity filters
  const [activityType,  setActivityType]  = useState<string>('all');
  const [activityChain, setActivityChain] = useState<string>('all');
  const [activityPage,  setActivityPage]  = useState(1);

  // Merge view into filters for the API call
  const activeFilters: HolderFilters = { ...filters, view };

  const { data, isLoading } = useHolders(activeFilters);
  const { data: stats } = useHolderStats();

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['activity', activityType, activityChain, activityPage],
    queryFn: () => api.activity.list({
      type:     activityType === 'all' ? undefined : activityType,
      chain:    activityChain === 'all' ? undefined : activityChain,
      page:     activityPage,
      per_page: ACTIVITY_PER_PAGE,
    }),
    enabled: topView === 'activity',
    staleTime: 60 * 1000,
  });

  // ── Sync / refresh ──────────────────────────────────────────────────────────

  const [syncFlash, setSyncFlash]       = useState<'done' | 'error' | null>(null);
  const [showSyncLog, setShowSyncLog]   = useState(false);
  const wasRunning                      = useRef(false);

  const { data: syncStatus } = useQuery({
    queryKey: ['sync-status'],
    queryFn:  () => api.sync.status(),
    // Poll every 2s while running, otherwise every 30s just to stay current
    refetchInterval: (q) => (q.state.data?.running ? 2000 : 30_000),
    staleTime: 0,
  });

  const syncRunning = syncStatus?.running ?? false;

  useEffect(() => {
    if (wasRunning.current && !syncRunning && syncStatus?.lastCompleted) {
      // Pipeline just finished — refresh all data
      queryClient.invalidateQueries({ queryKey: ['holders'] });
      queryClient.invalidateQueries({ queryKey: ['holderStats'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      setSyncFlash(syncStatus.exitCode === 0 ? 'done' : 'error');
      setTimeout(() => setSyncFlash(null), 4000);
    }
    wasRunning.current = syncRunning;
  }, [syncRunning, syncStatus, queryClient]);

  async function startSync() {
    try {
      await api.sync.start();
      setShowSyncLog(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // 409 = already running — that's fine
      if (!msg.includes('409')) console.error('sync start error:', err);
      setShowSyncLog(true);
    }
    // Immediately invalidate the sync-status query so polling kicks in
    queryClient.invalidateQueries({ queryKey: ['sync-status'] });
  }

  // ── end sync ─────────────────────────────────────────────────────────────────

  function patch(update: Partial<HolderFilters>) {
    setFilters(f => ({ ...f, ...update, page: 1 }));
  }

  function onSort(col: HolderFilters['sort']) {
    if (filters.sort === col) {
      patch({ order: filters.order === 'desc' ? 'asc' : 'desc' });
    } else {
      patch({ sort: col, order: 'desc' });
    }
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    patch({ q: q.trim() || undefined });
  }

  function switchView(v: TopView) {
    setTopView(v);
    if (v !== 'activity') {
      setView(v as 'wallets' | 'persons');
      setFilters(f => ({ ...f, page: 1 }));
    }
  }

  const isPersons = view === 'persons';
  const isActivity = topView === 'activity';

  return (
    <div className="flex flex-col h-full gap-4 p-4">

      {/* ── Stats bar ── */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          <StatGroup label="Supply">
            <Stat label="Total"  value={stats.totalTokens} />
            <Stat label="On ETH" value={stats.onEth} />
            <Stat label="On APE" value={stats.onApe} />
          </StatGroup>

          <StatGroup label="Holders">
            <Stat label="Wallets" value={stats.total} />
            {stats.uniquePersons > 0 && stats.uniquePersons !== stats.total && (
              <Stat label="Persons" value={stats.uniquePersons} />
            )}
            <Stat label="Holding" value={stats.stillHolding} />
          </StatGroup>

          <StatGroup label="Origin">
            <Stat label="Minters" value={stats.minters} />
            {stats.presaleCount > 0 && (
              <Stat label="Presale" value={stats.presaleCount} accent />
            )}
          </StatGroup>

          <StatGroup label="Identity">
            <Stat label="With ENS" value={stats.withEns} />
            {stats.identifiedCurrent != null && stats.currentHoldersTotal > 0 && (
              <Stat
                label="ID'd"
                value={`${stats.identifiedCurrent} / ${stats.currentHoldersTotal}`}
                sub={`${Math.round(stats.identifiedCurrent / stats.currentHoldersTotal * 100)}%`}
              />
            )}
          </StatGroup>
        </div>
      )}

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* View toggle: WALLETS / PERSONS / ACTIVITY */}
        <div className="flex border border-[#33ff33]/20 mr-1">
          {(['wallets', 'persons', 'activity'] as const).map(v => (
            <button key={v} onClick={() => switchView(v)}
              className={`px-3 py-1.5 text-xs transition-all ${
                topView === v
                  ? 'bg-[#33ff33]/15 text-[#33ff33] border-[#33ff33]/50'
                  : 'text-[#33ff33]/40 hover:text-[#33ff33]/70'
              }`}>
              {v === 'wallets' ? 'WALLETS' : v === 'persons' ? 'PERSONS' : 'ACTIVITY'}
            </button>
          ))}
        </div>

        <span className="text-[#33ff33]/20 text-xs">|</span>

        {!isActivity && (<>
          {/* Search */}
          <form onSubmit={onSearch} className="flex gap-1">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="wallet / ens / twitter / farcaster…"
              className="bg-[#1e1d20] border border-[#33ff33]/30 text-[#E0E0E0] text-sm px-3 py-1.5 w-56 focus:outline-none focus:border-[#33ff33]/60 placeholder:text-[#33ff33]/20"
            />
            <button type="submit" className="px-3 py-1.5 text-xs border border-[#33ff33]/30 text-[#33ff33]/70 hover:text-[#33ff33] hover:border-[#33ff33]/60 bg-[#1e1d20]">
              SEARCH
            </button>
            {filters.q && (
              <button type="button" onClick={() => { setQ(''); patch({ q: undefined }); }}
                className="px-2 py-1.5 text-xs border border-[#33ff33]/20 text-[#33ff33]/50 hover:text-[#33ff33]/80 bg-[#1e1d20]">
                ✕
              </button>
            )}
          </form>

          {/* Status */}
          {(['all', 'holding', 'sold'] as const).map(s => (
            <button key={s} onClick={() => patch({ status: s })}
              className={`px-3 py-1.5 text-xs border transition-all ${
                filters.status === s
                  ? 'border-[#33ff33]/60 bg-[#33ff33]/10 text-[#33ff33]'
                  : 'border-[#33ff33]/20 text-[#33ff33]/50 hover:border-[#33ff33]/40 hover:text-[#33ff33]/80'
              }`}>
              {s.toUpperCase()}
            </button>
          ))}

          <span className="text-[#33ff33]/20 text-xs">|</span>

          {/* Chain */}
          {(['all', 'eth', 'ape', 'both'] as const).map(c => (
            <button key={c} onClick={() => patch({ chain: c })}
              className={`px-3 py-1.5 text-xs border transition-all ${
                filters.chain === c
                  ? 'border-[#33ff33]/60 bg-[#33ff33]/10 text-[#33ff33]'
                  : 'border-[#33ff33]/20 text-[#33ff33]/50 hover:border-[#33ff33]/40 hover:text-[#33ff33]/80'
              }`}>
              {c === 'both' ? 'BOTH CHAINS' : c.toUpperCase()}
            </button>
          ))}

          <span className="text-[#33ff33]/20 text-xs">|</span>

          {/* Minters toggle */}
          <button onClick={() => patch({ minter: filters.minter ? undefined : true })}
            className={`px-3 py-1.5 text-xs border transition-all ${
              filters.minter
                ? 'border-[#33ff33]/60 bg-[#33ff33]/10 text-[#33ff33]'
                : 'border-[#33ff33]/20 text-[#33ff33]/50 hover:border-[#33ff33]/40 hover:text-[#33ff33]/80'
            }`}>
            MINTERS
          </button>

          {/* Presale toggle */}
          <button onClick={() => patch({ presale: filters.presale ? undefined : true })}
            className={`px-3 py-1.5 text-xs border transition-all ${
              filters.presale
                ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-400'
                : 'border-[#33ff33]/20 text-[#33ff33]/50 hover:border-[#33ff33]/40 hover:text-[#33ff33]/80'
            }`}>
            PRESALE
          </button>
        </>)}

        {isActivity && (<>
          {/* Activity type filter */}
          {(['sale', 'transfer', 'mint', 'bridge_out', 'bridge_in', 'all'] as const).map(t => (
            <button key={t} onClick={() => { setActivityType(t); setActivityPage(1); }}
              className={`px-3 py-1.5 text-xs border transition-all ${
                activityType === t
                  ? 'border-[#33ff33]/60 bg-[#33ff33]/10 text-[#33ff33]'
                  : 'border-[#33ff33]/20 text-[#33ff33]/50 hover:border-[#33ff33]/40 hover:text-[#33ff33]/80'
              }`}>
              {t === 'bridge_out' ? 'BRIDGE OUT' : t === 'bridge_in' ? 'BRIDGE IN' : t.toUpperCase()}
            </button>
          ))}
          <span className="text-[#33ff33]/20 text-xs">|</span>
          {(['all', 'eth', 'ape'] as const).map(c => (
            <button key={c} onClick={() => { setActivityChain(c); setActivityPage(1); }}
              className={`px-3 py-1.5 text-xs border transition-all ${
                activityChain === c
                  ? 'border-[#33ff33]/60 bg-[#33ff33]/10 text-[#33ff33]'
                  : 'border-[#33ff33]/20 text-[#33ff33]/50 hover:border-[#33ff33]/40 hover:text-[#33ff33]/80'
              }`}>
              {c.toUpperCase()}
            </button>
          ))}
        </>)}

        {/* ── SYNC button (always visible, far right) ── */}
        <div className="ml-auto flex items-center gap-2">
          {syncStatus?.lastCompleted && !syncRunning && (
            <span className="text-[10px] text-[#33ff33]/25 whitespace-nowrap">
              synced {relativeDate(syncStatus.lastCompleted)} ago
            </span>
          )}
          <button
            onClick={() => syncRunning ? setShowSyncLog(v => !v) : startSync()}
            disabled={false}
            className={`px-3 py-1.5 text-xs border transition-all flex items-center gap-1.5 ${
              syncFlash === 'done'  ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-400' :
              syncFlash === 'error' ? 'border-red-400/60 bg-red-400/10 text-red-400' :
              syncRunning           ? 'border-[#33ff33]/40 bg-[#33ff33]/10 text-[#33ff33] cursor-pointer' :
                                     'border-[#33ff33]/30 text-[#33ff33]/60 hover:border-[#33ff33]/60 hover:text-[#33ff33]'
            }`}
          >
            <span className={syncRunning ? 'animate-spin inline-block' : ''}>↺</span>
            {syncFlash === 'done' ? 'SYNCED ✓' : syncFlash === 'error' ? 'SYNC FAILED' : syncRunning ? 'SYNCING…' : 'SYNC'}
          </button>
        </div>
      </div>

      {/* ── Sync log drawer ── */}
      {showSyncLog && syncStatus && (
        <div className="border border-[#33ff33]/20 bg-[#111] p-3 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#33ff33]/40 uppercase tracking-widest">
              {syncRunning ? '⟳ Sync in progress…' : `Sync complete — ${syncStatus.lastDuration}s`}
            </span>
            <button onClick={() => setShowSyncLog(false)}
              className="text-[10px] text-[#33ff33]/30 hover:text-[#33ff33]/70">✕</button>
          </div>
          <div className="font-mono text-[10px] text-[#33ff33]/50 max-h-48 overflow-y-auto flex flex-col gap-px">
            {syncStatus.log.slice(-60).map((line, i) => (
              <div key={i} className={
                line.startsWith('[stderr]') || line.startsWith('[error]') ? 'text-red-400/70' :
                line.startsWith('✓') || line.startsWith('[') ? 'text-[#33ff33]/70' : ''
              }>{line}</div>
            ))}
            {syncRunning && <div className="text-[#33ff33]/30 animate-pulse">▌</div>}
          </div>
        </div>
      )}

      {/* ── Activity Feed ── */}
      {isActivity && (
        <div className="flex-1 overflow-auto border border-[#33ff33]/20">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-[#1e1d20] border-b border-[#33ff33]/20 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">When</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">Type</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">Token</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">Price</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">Market</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">From</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">To</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">Chain</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">Tx</th>
              </tr>
            </thead>
            <tbody>
              {activityLoading && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#33ff33]/30 text-sm">Loading…</td></tr>
              )}
              {!activityLoading && !activityData?.data.length && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#33ff33]/30 text-sm">No activity</td></tr>
              )}
              {activityData?.data.map((ev: ActivityEvent, i: number) => {
                const typeMeta: Record<string, { label: string; cls: string }> = {
                  mint:       { label: 'MINT',     cls: 'text-emerald-400/80 border-emerald-400/30' },
                  sale:       { label: 'SALE',     cls: 'text-yellow-400/80 border-yellow-400/30' },
                  transfer:   { label: 'TRANSFER', cls: 'text-[#33ff33]/50 border-[#33ff33]/20' },
                  bridge_out: { label: 'BRIDGE →', cls: 'text-blue-400/70 border-blue-400/30' },
                  bridge_in:  { label: '→ BRIDGE', cls: 'text-purple-400/70 border-purple-400/30' },
                };
                const meta = typeMeta[ev.type] ?? { label: ev.type.toUpperCase(), cls: 'text-[#33ff33]/40 border-[#33ff33]/20' };
                return (
                  <tr key={`${ev.tx_hash}-${ev.token_id}-${i}`}
                    className="border-b border-[#33ff33]/5 hover:bg-[#33ff33]/5 transition-colors">
                    <td className="px-3 py-2 text-xs text-[#33ff33]/40 whitespace-nowrap">
                      {relativeDate(ev.timestamp)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] border px-1.5 py-0.5 ${meta.cls}`}>{meta.label}</span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">
                      <Link to={`/nfts/${ev.token_id}`} className="text-[#33ff33]/70 hover:text-[#33ff33] hover:underline">
                        #{ev.token_id}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {ev.price_native != null
                        ? <span className="text-[#33ff33]">
                            {ev.price_currency === 'APE'
                              ? <>{ev.price_native.toLocaleString(undefined, {maximumFractionDigits: 1})} <span className="text-[#33ff33]/40">APE</span></>
                              : <>{ev.price_native.toFixed(4)} <span className="text-[#33ff33]/40">Ξ</span></>
                            }
                          </span>
                        : <span className="text-[#33ff33]/20">—</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-[10px] text-[#33ff33]/40 whitespace-nowrap">
                      {ev.marketplace ?? <span className="text-[#33ff33]/20">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#33ff33]/60 whitespace-nowrap">
                      {ev.type === 'mint' ? (
                        <span className="text-[#33ff33]/20">—</span>
                      ) : isNamedAddress(ev.from) ? (
                        <span title={ev.from}>{ev.from_name}</span>
                      ) : (
                        <Link to={`/collectors/${ev.from}`} title={ev.from}
                          className="hover:text-[#33ff33] hover:underline">{ev.from_name}</Link>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#33ff33]/60 whitespace-nowrap">
                      {isNamedAddress(ev.to) ? (
                        <span title={ev.to}>{ev.to_name}</span>
                      ) : (
                        <Link to={`/collectors/${ev.to}`} title={ev.to}
                          className="hover:text-[#33ff33] hover:underline">{ev.to_name}</Link>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-[#33ff33]/30 uppercase">
                      {ev.chain}
                    </td>
                    <td className="px-3 py-2">
                      <a href={ev.explorer_url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-[#33ff33]/30 hover:text-[#33ff33]/70 font-mono">
                        {ev.tx_hash.slice(0, 8)}…
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {isActivity && activityData && activityData.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#33ff33]/50">
          <span>{((activityPage - 1) * ACTIVITY_PER_PAGE + 1)}–{Math.min(activityPage * ACTIVITY_PER_PAGE, activityData.total)} of {activityData.total.toLocaleString()} events</span>
          <div className="flex gap-1">
            <button disabled={activityPage <= 1} onClick={() => setActivityPage(p => p - 1)}
              className="px-3 py-1.5 border border-[#33ff33]/20 hover:border-[#33ff33]/50 disabled:opacity-20 disabled:cursor-not-allowed">← PREV</button>
            <span className="px-3 py-1.5 border border-[#33ff33]/10 text-[#33ff33]/30">{activityPage} / {activityData.pages}</span>
            <button disabled={activityPage >= activityData.pages} onClick={() => setActivityPage(p => p + 1)}
              className="px-3 py-1.5 border border-[#33ff33]/20 hover:border-[#33ff33]/50 disabled:opacity-20 disabled:cursor-not-allowed">NEXT →</button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {!isActivity && <><div className="flex-1 overflow-auto border border-[#33ff33]/20">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-[#1e1d20] border-b border-[#33ff33]/20 z-10">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50 w-10">#</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">
                {isPersons ? 'Person' : 'Wallet'}
              </th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">Identity</th>
              <SortHeader col="current"        label="Holding"      current={filters.sort} order={filters.order!} onSort={onSort} />
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">ETH / APE</th>
              <SortHeader col="minted"         label="Minted"       current={filters.sort} order={filters.order!} onSort={onSort} />
              <SortHeader col="ever_held"      label="Ever Held"    current={filters.sort} order={filters.order!} onSort={onSort} />
              <SortHeader col="sold"           label="Sold"         current={filters.sort} order={filters.order!} onSort={onSort} />
              <SortHeader col="first_acquired" label="First In"       current={filters.sort} order={filters.order!} onSort={onSort} />
              <SortHeader col="holding_since"  label="Holding Since" current={filters.sort} order={filters.order!} onSort={onSort} />
              <SortHeader col="last_activity"  label="Last Active"   current={filters.sort} order={filters.order!} onSort={onSort} />
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#33ff33]/50">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-[#33ff33]/30 text-sm">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && !data?.data.length && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-[#33ff33]/30 text-sm">
                  No holders found
                </td>
              </tr>
            )}
            {data?.data.map((h: Holder, i: number) => {
              const rowNum = ((filters.page ?? 1) - 1) * PER_PAGE + i + 1;
              const isCluster = isPersons
                ? (h.wallet_count ?? 1) > 1
                : !!(h.cluster_id);

              return (
                <tr key={h.wallet}
                  className={`border-b border-[#33ff33]/10 hover:bg-[#33ff33]/5 transition-colors group ${
                    !isPersons && isCluster ? 'bg-[#33ff33]/[0.02]' : ''
                  }`}>

                  {/* # */}
                  <td className="px-3 py-2 text-[#33ff33]/30 text-xs">{rowNum}</td>

                  {/* Wallet / Person */}
                  <td className="px-3 py-2 text-xs">
                    {(() => {
                      const { label, isAddress } = primaryName(h);
                      return (
                        <div className="flex flex-col gap-0.5">
                          {/* Primary name row — links to collector page */}
                          <div className="flex items-center gap-1">
                            <Link to={`/collectors/${h.wallet}`}
                              className={`${isAddress ? 'font-mono' : 'font-sans'} text-[#33ff33] hover:underline truncate max-w-[160px]`}
                              title={`View ${h.wallet} profile`}>
                              {label}
                            </Link>
                            {isAddress && <CopyButton text={h.wallet} />}
                            {isCluster && h.all_wallets && (
                              <WalletClusterTooltip wallets={h.all_wallets} />
                            )}
                          </div>
                          {/* Secondary wallet address — shown whenever the primary isn't already the address */}
                          {!isAddress && (
                            <div className="flex items-center gap-0.5">
                              <a href={`https://etherscan.io/address/${h.wallet}`} target="_blank" rel="noreferrer"
                                className="font-mono text-[10px] text-[#33ff33]/30 hover:text-[#33ff33]/60 hover:underline" title="View on Etherscan">
                                {shortWallet(h.wallet)}
                              </a>
                              <CopyButton text={h.wallet} />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Identity — show every signal found */}
                  <td className="px-3 py-2">
                    <div className="flex items-start gap-1">
                      <div className="flex flex-col gap-0.5">
                        {h.twitter && (
                          <a href={`https://x.com/${h.twitter.replace('@', '')}`} target="_blank" rel="noreferrer"
                            className="text-[10px] text-[#33ff33]/70 hover:text-[#33ff33] hover:underline">
                            𝕏 @{h.twitter.replace('@', '')}
                          </a>
                        )}
                        {h.farcaster && (
                          <a href={`https://warpcast.com/${h.farcaster}`} target="_blank" rel="noreferrer"
                            className="text-[10px] text-purple-400/70 hover:text-purple-400 hover:underline">
                            ⬡ @{h.farcaster}
                          </a>
                        )}
                        {h.discord && (
                          <span className="text-[10px] text-indigo-400/60"># {h.discord}</span>
                        )}
                        {h.opensea && (
                          <a href={`https://opensea.io/${h.opensea}`} target="_blank" rel="noreferrer"
                            className="text-[10px] text-blue-400/60 hover:text-blue-400 hover:underline">
                            ⛵ {h.opensea}
                          </a>
                        )}
                        {!h.twitter && !h.farcaster && !h.discord && !h.opensea && (
                          <span className="text-[10px] text-[#33ff33]/20">—</span>
                        )}
                      </div>
                      <IdentitySourceTooltip h={h} />
                      <EditIdentityPopover
                        h={h}
                        onSaved={() => queryClient.invalidateQueries({ queryKey: ['holders'] })}
                      />
                    </div>
                  </td>

                  {/* Holding count */}
                  <td className="px-3 py-2 text-center">
                    <span className={`text-sm font-bold ${h.current_count > 0 ? 'text-[#33ff33]' : 'text-[#33ff33]/20'}`}>
                      {h.current_count}
                    </span>
                  </td>

                  {/* ETH / APE split */}
                  <td className="px-3 py-2 text-xs text-[#33ff33]/50 text-center">
                    {h.current_count > 0
                      ? <><span className="text-[#33ff33]/70">{h.eth_count}</span><span className="text-[#33ff33]/20"> / </span><span className="text-[#33ff33]/70">{h.ape_count}</span></>
                      : <span className="text-[#33ff33]/20">—</span>
                    }
                  </td>

                  {/* Minted */}
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs ${h.minted_count > 0 ? 'text-[#33ff33]/80' : 'text-[#33ff33]/20'}`}>
                      {h.minted_count || '—'}
                    </span>
                  </td>

                  {/* Ever held */}
                  <td className="px-3 py-2 text-center text-xs text-[#33ff33]/60">
                    {h.total_ever_held}
                  </td>

                  {/* Sold */}
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs ${h.total_sold > 0 ? 'text-[#33ff33]/50' : 'text-[#33ff33]/20'}`}>
                      {h.total_sold || '—'}
                    </span>
                  </td>

                  {/* First in */}
                  <td className="px-3 py-2 text-xs text-[#33ff33]/40 whitespace-nowrap">
                    {relativeDate(h.first_acquired)}
                  </td>

                  {/* Holding since */}
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {h.still_holding && h.holding_since
                      ? (() => {
                          const sameAsFirst = h.holding_since === h.first_acquired;
                          return (
                            <span
                              className={sameAsFirst
                                ? 'text-[#33ff33]/40'
                                : 'text-[#33ff33]/70'}
                              title={sameAsFirst
                                ? 'Holding continuously since first purchase'
                                : `Re-entered after selling. First ever: ${h.first_acquired ? new Date(h.first_acquired).toLocaleDateString() : '?'}`}
                            >
                              {relativeDate(h.holding_since)}
                              {!sameAsFirst && <span className="ml-1 text-[9px] text-[#33ff33]/40">↺</span>}
                            </span>
                          );
                        })()
                      : <span className="text-[#33ff33]/20">—</span>
                    }
                  </td>

                  {/* Last active */}
                  <td className="px-3 py-2 text-xs text-[#33ff33]/40 whitespace-nowrap">
                    {relativeDate(h.last_activity)}
                  </td>

                  {/* Status badge */}
                  <td className="px-3 py-2">
                    {h.still_holding
                      ? <span className="text-[10px] border border-[#33ff33]/40 text-[#33ff33]/70 px-1.5 py-0.5">HOLDING</span>
                      : <span className="text-[10px] border border-[#33ff33]/10 text-[#33ff33]/20 px-1.5 py-0.5">SOLD</span>
                    }
                    {(h.minted_count > 0 || h.presale) && (
                      <span className="ml-1 text-[10px] border border-[#33ff33]/20 text-[#33ff33]/40 px-1.5 py-0.5">OG</span>
                    )}
                    {h.presale && (
                      <span className="ml-1 text-[10px] border border-yellow-400/30 text-yellow-400/60 px-1.5 py-0.5"
                        title={h.presale_quantity ? `${h.presale_quantity} presale tokens` : 'Presale recipient'}>
                        PRESALE
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#33ff33]/50">
          <span>
            {((filters.page ?? 1) - 1) * PER_PAGE + 1}–{Math.min((filters.page ?? 1) * PER_PAGE, data.total)} of {data.total.toLocaleString()} {isPersons ? 'persons' : 'holders'}
          </span>
          <div className="flex gap-1">
            <button
              disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
              className="px-3 py-1.5 border border-[#33ff33]/20 hover:border-[#33ff33]/50 disabled:opacity-20 disabled:cursor-not-allowed">
              ← PREV
            </button>
            <span className="px-3 py-1.5 border border-[#33ff33]/10 text-[#33ff33]/30">
              {filters.page ?? 1} / {data.pages}
            </span>
            <button
              disabled={(filters.page ?? 1) >= data.pages}
              onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
              className="px-3 py-1.5 border border-[#33ff33]/20 hover:border-[#33ff33]/50 disabled:opacity-20 disabled:cursor-not-allowed">
              NEXT →
            </button>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
