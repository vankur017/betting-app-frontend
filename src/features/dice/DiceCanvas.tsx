import Phaser from 'phaser';
import { useEffect, useRef, type ReactNode } from 'react';
import { DiceScene } from './DiceScene';
import type { DiceVisualState } from './diceVisualState';

/**
 * Hosts one Phaser game for the Dice track. `state` must be a stable object: the game is
 * created once per mount and destroyed on unmount, so re-renders never create duplicates.
 * `children` are laid over the canvas (the page's drag input for the track).
 */
export function DiceCanvas({ state, children }: { state: DiceVisualState; children?: ReactNode }) {
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

  return (
    <div className="relative h-64 w-full sm:h-80 lg:h-[440px]">
      {/* The canvas is decorative; the page shows the same result as text. */}
      <div ref={containerRef} aria-hidden="true" className="absolute inset-0" />
      {children}
    </div>
  );
}
