import type { GameId } from '../../api/types';

/** Original decorative artwork for each game card. Hidden from assistive technology. */
export function GameArt({ game }: { game: GameId }) {
  const common = { viewBox: '0 0 160 100', className: 'h-24 w-40', 'aria-hidden': true, focusable: false } as const;

  switch (game) {
    case 'crash':
      return (
        <svg {...common}>
          <path d="M10 90 H150 M10 90 V10" stroke="#2a3755" strokeWidth="2" />
          <path d="M12 88 C60 86 100 70 140 18" fill="none" stroke="#16c784" strokeWidth="4" strokeLinecap="round" />
          <circle cx="140" cy="18" r="6" fill="#7ff0c0" />
        </svg>
      );
    case 'plinko':
      return (
        <svg {...common}>
          {[0, 1, 2, 3, 4].flatMap((row) =>
            Array.from({ length: row + 2 }, (_, i) => (
              <circle key={`${row}-${i}`} cx={80 - (row + 1) * 10 + i * 20} cy={14 + row * 15} r="3" fill="#6b7a99" />
            )),
          )}
          <circle cx="90" cy="52" r="5" fill="#16c784" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={13 + i * 20} y="86" width="16" height="8" rx="2" fill={i === 3 ? '#16c784' : '#2a3755'} />
          ))}
        </svg>
      );
    case 'mines':
      return (
        <svg {...common}>
          {Array.from({ length: 12 }, (_, i) => {
            const x = 32 + (i % 4) * 25;
            const y = 8 + Math.floor(i / 4) * 30;
            return <rect key={i} x={x} y={y} width="21" height="26" rx="4" fill={i === 5 ? '#0fa36b' : '#2a3755'} />;
          })}
          <path d="M67 45 l5 -6 l5 6 l-5 7 z" fill="#7ff0c0" />
        </svg>
      );
    case 'dice':
      return (
        <svg {...common}>
          <rect x="52" y="22" width="56" height="56" rx="12" fill="#16c784" />
          {[
            [66, 36],
            [94, 36],
            [80, 50],
            [66, 64],
            [94, 64],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#070b14" />
          ))}
        </svg>
      );
  }
}
