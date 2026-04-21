import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/',        label: 'BROWSE'   },
  { to: '/nfts',    label: 'NFTS'     },
  { to: '/holders', label: 'HOLDERS'  },
  { to: '/market',  label: 'MARKET'   },
  { to: '/review',  label: 'REVIEW'   },
];

export function NavBar() {
  const { pathname } = useLocation();

  return (
    <header className="fixed top-0 z-30 w-full bg-[#1e1d20] border-b border-[#33ff33]/20">
      <div className="flex h-[45px] items-center px-4 gap-6">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 text-[#33ff33] font-bold text-lg leading-none shrink-0 hover:text-[#33ff33]/80 transition-colors duration-300"
        >
          🐊 <span>GATORPEDIA</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={[
                  'px-3 py-1 text-sm font-bold transition-all duration-300',
                  active
                    ? 'text-[#33ff33] border border-[#33ff33]/40 bg-[#33ff33]/10'
                    : 'text-[#33ff33]/70 border border-transparent hover:text-[#33ff33] hover:border-[#33ff33]/30 hover:bg-[#33ff33]/5',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Status dot */}
        <div className="ml-auto flex items-center gap-2 text-xs text-[#33ff33]/50">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#33ff33] animate-pulse" />
          <span className="hidden sm:inline">INTERNAL TOOL</span>
        </div>
      </div>
    </header>
  );
}
