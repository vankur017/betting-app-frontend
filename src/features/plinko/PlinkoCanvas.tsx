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
      className="h-[340px] w-full sm:h-[440px] lg:h-[520px]"
    />
  );
}
