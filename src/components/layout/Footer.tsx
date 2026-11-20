import { Link } from 'react-router-dom';
import { env } from '../../config/env';

export function Footer() {
  return (
    <footer className="mt-10 border-t border-white/5 bg-night-950/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-night-400 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-3xl leading-relaxed">
          <strong className="text-night-100">{env.appName} is a play-money game.</strong> Coins are
          virtual, have no monetary value, and cannot be bought, sold, transferred, or redeemed.
        </p>
        <nav aria-label="Footer" className="flex shrink-0 gap-5">
          <Link to="/help" className="transition hover:text-night-100">
            Help &amp; rules
          </Link>
          <Link to="/help#report" className="transition hover:text-night-100">
            Report a problem
          </Link>
        </nav>
      </div>
    </footer>
  );
}
