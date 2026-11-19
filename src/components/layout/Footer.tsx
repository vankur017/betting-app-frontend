import { Link } from 'react-router-dom';
import { env } from '../../config/env';

export function Footer() {
  return (
    <footer className="border-t border-night-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-night-300 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-3xl">
          <strong className="text-night-100">{env.appName} is a play-money game.</strong> Coins are
          virtual, have no monetary value, and cannot be bought, sold, transferred, or redeemed.
        </p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link to="/help" className="hover:text-night-100">
            Help &amp; rules
          </Link>
          <Link to="/help#report" className="hover:text-night-100">
            Report a problem
          </Link>
        </nav>
      </div>
    </footer>
  );
}
