import { PLATFORM_CONFIGS, detectPlatform, type Platform } from '../lib/platforms';

interface PlatformBadgeProps {
  url: string;
  platform?: Platform;
  label?: string;
  size?: 'sm' | 'md';
  onClick?: (e: React.MouseEvent) => void;
}

/** A small colored badge/link for an external platform URL */
export function PlatformBadge({ url, platform, label, size = 'sm', onClick }: PlatformBadgeProps) {
  const p = platform ?? detectPlatform(url);
  const cfg = PLATFORM_CONFIGS[p];
  const display = label || cfg.abbr;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`${cfg.label}: ${url}`}
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      className={[
        'inline-flex items-center justify-center font-bold border transition-all duration-200',
        'hover:opacity-90 hover:scale-105 shrink-0',
        cfg.textClass, cfg.bgClass, cfg.borderClass,
        size === 'sm'
          ? 'text-[9px] px-1.5 py-0.5 min-w-[22px]'
          : 'text-[10px] px-2 py-1 min-w-[28px]',
      ].join(' ')}
    >
      {display}
    </a>
  );
}
