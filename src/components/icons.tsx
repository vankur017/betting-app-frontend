import { useId } from 'react';

export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  const gradient = `brand-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8af5c8" />
          <stop offset="0.55" stopColor="#16c784" />
          <stop offset="1" stopColor="#0e7f86" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill={`url(#${gradient})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="9.5" fill="none" stroke="#fff" strokeOpacity="0.25" />
      <path
        d="M8 22V10l8 7 8-7v12"
        fill="none"
        stroke="#05080f"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CoinIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="7" fill="#16c784" />
      <circle cx="8" cy="8" r="4.5" fill="none" stroke="#070b14" strokeWidth="1.5" />
    </svg>
  );
}

export function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" focusable="false">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
