import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SOUND_SETTINGS,
  gemFrequency,
  outcomeSound,
  readSoundSettings,
  riseFrequency,
  rollTickTimes,
  SoundEngine,
} from './sound';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };
}

describe('sound settings', () => {
  it('falls back to defaults for missing or bad data', () => {
    expect(readSoundSettings(undefined)).toEqual(DEFAULT_SOUND_SETTINGS);
    expect(readSoundSettings(memoryStorage({ 'mintline:sound': 'not json' }))).toEqual(
      DEFAULT_SOUND_SETTINGS,
    );
    expect(
      readSoundSettings(memoryStorage({ 'mintline:sound': '{"muted":true,"volume":7}' })),
    ).toEqual({ muted: true, volume: DEFAULT_SOUND_SETTINGS.volume });
  });

  it('remembers mute and volume, and notifies listeners', () => {
    const storage = memoryStorage();
    const engine = new SoundEngine(storage);
    let calls = 0;
    const unsubscribe = engine.subscribe(() => {
      calls += 1;
    });
    engine.setMuted(true);
    engine.setVolume(2);
    expect(engine.getSettings()).toEqual({ muted: true, volume: 1 });
    expect(calls).toBe(2);
    expect(new SoundEngine(storage).getSettings()).toEqual({ muted: true, volume: 1 });
    unsubscribe();
  });

  it('never throws when the browser has no Web Audio', () => {
    const engine = new SoundEngine(memoryStorage());
    expect(() => {
      engine.play('win');
      engine.startRise();
      engine.setRise(250);
      engine.stopRise();
    }).not.toThrow();
  });
});

describe('sound helpers', () => {
  it('picks the outcome sound from the settled return', () => {
    expect(outcomeSound(1000, 0)).toBe('lose');
    expect(outcomeSound(1000, 1000)).toBe('lose');
    expect(outcomeSound(1000, 1500)).toBe('win');
    expect(outcomeSound(1000, 5000)).toBe('bigWin');
  });

  it('raises the Mines chime a semitone per safe tile', () => {
    expect(gemFrequency(1)).toBe(660);
    expect(gemFrequency(13)).toBeCloseTo(1320);
    expect(gemFrequency(50)).toBe(gemFrequency(20));
  });

  it('climbs with the Crash multiplier but stays capped', () => {
    expect(riseFrequency(100)).toBe(140);
    expect(riseFrequency(1000)).toBeGreaterThan(riseFrequency(200));
    expect(riseFrequency(100000)).toBe(1100);
  });

  it('spreads the Dice rattle out as the marker slows', () => {
    expect(rollTickTimes(0)).toEqual([0]);
    const times = rollTickTimes(700);
    expect(times[0]).toBe(0);
    expect(times[times.length - 1]).toBeLessThan(0.7);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    gaps.slice(1).forEach((gap, i) => expect(gap).toBeGreaterThan(gaps[i]));
  });
});
