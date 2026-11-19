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
      backgroundColor: '#0c1220',
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

  // The canvas is decorative; the page shows the same status as text.
  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="h-64 w-full overflow-hidden rounded-2xl border border-night-800 bg-night-900 sm:h-80 lg:h-[420px]"
    />
  );
}
