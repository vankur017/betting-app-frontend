import { useSyncExternalStore } from 'react';
import { DEFAULT_SOUND_SETTINGS, sound, type SoundSettings } from '../lib/sound';

/** Current mute and volume settings; re-renders when they change. */
export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(sound.subscribe, sound.getSettings, () => DEFAULT_SOUND_SETTINGS);
}
