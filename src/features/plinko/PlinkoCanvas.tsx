import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { PlinkoScene } from './PlinkoScene';
import type { PlinkoVisualState } from './plinkoVisualState';

/**
 * Hosts one Phaser game for the Plinko board. `state` must be a stable object: the game is
 * created once per mount and destroyed on unmount, so re-renders never create duplicates.
 */
export function PlinkoCanvas({ state }: { state: PlinkoVisualState }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      transparent: true,
      banner: false,
      audio: { noAudio: true },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: parent.clientWidth || 640,
        height: parent.clientHeight || 480,
      },
      scene: [new PlinkoScene(state)],
    });

    return () => game.destroy(true);
  }, [state]);

  // The canvas is decorative; the page shows the same result as text.
  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        background: `radial-gradient(70% 65% at 50% 40%, rgb(167 139 250 / 0.14), transparent 70%), linear-gradient(180deg, rgb(20 29 50 / 0.82), rgb(11 17 32 / 0.9))`,
      }}
      className="h-80 w-full overflow-hidden panel sm:h-[420px] lg:h-[480px]"
    />
  );
}
