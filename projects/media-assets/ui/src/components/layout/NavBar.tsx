import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function NavBar() {
  const { pathname } = useLocation();
  const [dark, setDark] = useState(() =>
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
   );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
   }, [dark]);

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors hover:text-foreground/80 ${pathname === to ? 'text-foreground' : 'text-foreground/60'}`}
     >
      {label}
     </Link>
   );

  return (
    <header className="border-b bg-background sticky top-0 z-50">
       <div className="flex h-14 items-center px-6 gap-6">
         <span className="text-lg font-bold">🐊 Gatorpedia</span>
         <nav className="flex gap-4">
           {navLink('/', 'Browse')}
           {navLink('/nfts', 'NFTs')}
           {navLink('/review', 'Review Queue')}
         </nav>
         <div className="ml-auto">
           <Button variant="ghost" size="icon" onClick={() => setDark(d => !d)}>
             {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
           </Button>
         </div>
       </div>
     </header>
   );
}
