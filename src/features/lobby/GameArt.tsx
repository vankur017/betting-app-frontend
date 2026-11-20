import { useId } from 'react';
import type { GameId } from '../../api/types';
import { GAME_THEMES } from '../games/theme';

const BUCKET_COLORS = ['#f43f5e', '#f59e0b', '#3ee6a0', '#475569', '#3ee6a0', '#f59e0b', '#f43f5e'];

/** Original decorative artwork for each game. Hidden from assistive technology. */
export function GameArt({ game, className = 'h-28 w-44' }: { game: GameId; className?: string }) {
  // SVG ids must be unique on the page and safe inside url(#...).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const accent = GAME_THEMES[game].accent;
  const glow = `${uid}-glow`;
  const fade = `${uid}-fade`;
  const tile = `${uid}-tile`;
  const common = {
    viewBox: '0 0 160 100',
    className,
    'aria-hidden': true,
    focusable: false,
  } as const;

  const defs = (
    <defs>
      <filter id={glow} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={accent} stopOpacity="0.5" />
        <stop offset="1" stopColor={accent} stopOpacity="0" />
      </linearGradient>
      <linearGradient id={tile} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#334166" />
        <stop offset="1" stopColor="#1f2a47" />
      </linearGradient>
    </defs>
  );

  switch (game) {
    case 'crash':
      return (
        <svg {...common}>
          {defs}
          {[28, 50, 72].map((y) => (
            <line key={y} x1="12" x2="150" y1={y} y2={y} stroke="#fff" strokeOpacity="0.07" />
          ))}
          <path d="M12 90 C60 88 100 72 138 20 L138 90 Z" fill={`url(#${fade})`} />
          <path
            d="M12 90 C60 88 100 72 138 20"
            fill="none"
            stroke={accent}
            strokeWidth="4"
            strokeLinecap="round"
            filter={`url(#${glow})`}
          />
          <circle cx="138" cy="20" r="7" fill="#fff" filter={`url(#${glow})`} />
          <circle cx="138" cy="20" r="3.5" fill={accent} />
          <rect x="86" y="8" width="38" height="17" rx="8.5" fill="#fff" fillOpacity="0.12" />
          <text x="105" y="20" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
            2.41x
          </text>
        </svg>
      );
    case 'plinko':
      return (
        <svg {...common}>
          {defs}
          {[0, 1, 2, 3, 4].flatMap((row) =>
            Array.from({ length: row + 3 }, (_, i) => (
              <circle
                key={`${row}-${i}`}
                cx={80 - (row + 2) * 9 + i * 18}
                cy={10 + row * 14}
                r="2.6"
                fill="#fff"
                fillOpacity="0.6"
              />
            )),
          )}
          <path
            d="M80 2 L80 18 L89 24 L80 38 L89 52 L98 66"
            fill="none"
            stroke={accent}
            strokeOpacity="0.5"
            strokeWidth="1.5"
            strokeDasharray="2 3"
          />
          <circle cx="98" cy="66" r="5.5" fill={accent} filter={`url(#${glow})`} />
          {BUCKET_COLORS.map((color, i) => (
            <rect
              key={i}
              x={17 + i * 18.5}
              y="82"
              width="15"
              height="10"
              rx="3"
              fill={color}
              fillOpacity={i === 4 ? 1 : 0.75}
              stroke={i === 4 ? '#fff' : 'none'}
              strokeWidth="1.5"
            />
          ))}
        </svg>
      );
    case 'mines':
      return (
        <svg {...common}>
          {defs}
          {Array.from({ length: 15 }, (_, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const x = 22 + col * 24;
            const y = 12 + row * 26;
            const gem = i === 6;
            const opened = i === 2 || i === 12;
            const mine = i === 9;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width="20"
                  height="22"
                  rx="5"
                  fill={gem ? accent : opened ? '#0f2a3d' : mine ? '#3a1622' : `url(#${tile})`}
                  stroke={gem ? '#fff' : opened ? accent : 'none'}
                  strokeOpacity={gem ? 0.8 : 0.4}
                  filter={gem ? `url(#${glow})` : undefined}
                />
                {gem || opened ? (
                  <path
                    d={`M${x + 6} ${y + 9} l4 -4 l4 4 l-4 6 z`}
                    fill={gem ? '#fff' : accent}
                    fillOpacity={gem ? 1 : 0.6}
                  />
                ) : null}
                {mine ? <circle cx={x + 10} cy={y + 11} r="4.5" fill="#f43f5e" /> : null}
              </g>
            );
          })}
        </svg>
      );
    case 'dice':
      return (
        <svg {...common}>
          {defs}
          <ellipse cx="82" cy="88" rx="44" ry="6" fill={accent} fillOpacity="0.18" />
          <g transform="rotate(-12 64 50)">
            <rect x="38" y="24" width="52" height="52" rx="12" fill={accent} filter={`url(#${glow})`} />
            {[
              [51, 37],
              [77, 37],
              [64, 50],
              [51, 63],
              [77, 63],
            ].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.5" fill="#1a1205" />
            ))}
          </g>
          <g transform="rotate(14 112 58)">
            <rect x="94" y="40" width="36" height="36" rx="9" fill="#f8fafc" />
            {[
              [103, 49],
              [112, 58],
              [121, 67],
            ].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" fill="#0b1120" />
            ))}
          </g>
        </svg>
      );
  }
}
