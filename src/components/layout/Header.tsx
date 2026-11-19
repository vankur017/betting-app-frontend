import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { env } from '../../config/env';
import { cx } from '../../lib/cx';
import { messageOf } from '../../lib/errors';
import { BalanceBadge } from '../BalanceBadge';
import { BrandMark, MenuIcon } from '../icons';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { buttonClasses } from '../ui/buttonStyles';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  authOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Lobby', end: true },
  { to: '/history', label: 'History', authOnly: true },
  { to: '/wallet', label: 'Wallet', authOnly: true },
  { to: '/help', label: 'Help' },
];

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cx(
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-night-800 text-mint-300' : 'text-night-300 hover:bg-night-800 hover:text-night-100',
  );
}

export function Header() {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const authenticated = status === 'authenticated' && user !== null;
  const items = NAV_ITEMS.filter((item) => !item.authOnly || authenticated);
  const closeMenu = () => setMenuOpen(false);

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await logout();
      closeMenu();
      navigate('/');
    } catch (error) {
      setSignOutError(messageOf(error, 'Sign out failed. Please try again.'));
    } finally {
      setSigningOut(false);
    }
  }

  // No sign-in, sign-out or profile controls while auth is disabled.
  const accountActions = !env.authEnabled ? null : authenticated ? (
    <>
      <NavLink to="/profile" className={navLinkClass} onClick={closeMenu}>
        {user?.username}
      </NavLink>
      <Button variant="ghost" onClick={() => void handleSignOut()} loading={signingOut}>
        Sign out
      </Button>
    </>
  ) : status === 'loading' ? null : (
    <>
      <Link to="/login" className={buttonClasses('ghost')} onClick={closeMenu}>
        Sign in
      </Link>
      <Link to="/register" className={buttonClasses('primary')} onClick={closeMenu}>
        Create account
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-night-800 bg-night-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-lg" onClick={closeMenu}>
          <BrandMark />
          <span className="text-lg font-bold tracking-tight">{env.appName}</span>
        </Link>
        <span className="hidden rounded-full border border-mint-500/40 bg-mint-500/10 px-2 py-0.5 text-xs font-semibold text-mint-300 sm:inline">
          Play money
        </span>

        <nav aria-label="Main" className="ml-4 hidden gap-1 md:flex">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {authenticated ? <BalanceBadge /> : null}
          <div className="hidden items-center gap-1 md:flex">{accountActions}</div>
          <button
            type="button"
            className="rounded-lg p-2 text-night-300 hover:bg-night-800 hover:text-night-100 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      <div id="mobile-menu" hidden={!menuOpen} className="border-t border-night-800 px-4 pb-4 md:hidden">
        <nav aria-label="Mobile" className="flex flex-col gap-1 pt-3">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass} onClick={closeMenu}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {accountActions ? (
          <div className="mt-3 flex flex-col gap-2 border-t border-night-800 pt-3">{accountActions}</div>
        ) : null}
      </div>

      {signOutError ? (
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
          <Alert tone="error">{signOutError}</Alert>
        </div>
      ) : null}
    </header>
  );
}
