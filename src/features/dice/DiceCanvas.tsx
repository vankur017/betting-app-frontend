import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { DiceScene } from './DiceScene';
import type { DiceVisualState } from './diceVisualState';

/**
 * Hosts one Phaser game for the Dice track. `state` must be a stable object: the game is
 * created once per mount and destroyed on unmount, so re-renders never create duplicates.
 */
export function DiceCanvas({ state }: { state: DiceVisualState }) {
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
        height: parent.clientHeight || 320,
      },
      scene: [new DiceScene(state)],
    });

    return () => game.destroy(true);
  }, [state]);

  // The canvas is decorative; the page shows the same result as text.
  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        background: `radial-gradient(70% 65% at 50% 40%, rgb(251 191 36 / 0.14), transparent 70%), linear-gradient(180deg, rgb(20 29 50 / 0.82), rgb(11 17 32 / 0.9))`,
      }}
      className="h-60 w-full overflow-hidden panel sm:h-72 lg:h-80"
    />
  );
}
