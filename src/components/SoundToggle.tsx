import { useSoundSettings } from '../hooks/useSoundSettings';
import { sound } from '../lib/sound';

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      {muted ? (
        <path
          d="M16 9.5l5 5M21 9.5l-5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/** Mutes or unmutes all game sounds. The choice is remembered in this browser. */
export function SoundToggle() {
  const { muted } = useSoundSettings();

  return (
    <button
      type="button"
      onClick={() => {
        sound.setMuted(!muted);
        if (muted) sound.play('click');
      }}
      aria-pressed={!muted}
      aria-label={muted ? 'Turn sound on' : 'Mute sound'}
      title={muted ? 'Sound off' : 'Sound on'}
      className="rounded-full p-2 text-night-300 transition hover:bg-white/5 hover:text-night-100"
    >
      <SpeakerIcon muted={muted} />
    </button>
  );
}
