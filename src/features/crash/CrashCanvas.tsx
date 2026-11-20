import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { CrashScene } from './CrashScene';
import type { CrashVisualState } from './crashVisualState';

/**
 * Hosts one Phaser game for the Crash graph. `state` must be a stable object: the game is
 * created once per mount and destroyed on unmount, so re-renders never create duplicates.
 */
export function CrashCanvas({ state }: { state: CrashVisualState }) {
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
        height: parent.clientHeight || 360,
      },
      scene: [new CrashScene(state)],
    });

    return () => game.destroy(true);
  }, [state]);

  // The canvas is decorative; the page shows the same state as text.
  return (
    <div ref={containerRef} aria-hidden="true" className="h-72 w-full sm:h-96 lg:h-[460px]" />
  );
}
