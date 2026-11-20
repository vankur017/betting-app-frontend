/*
 * Game sounds, synthesised with the Web Audio API: no audio files and no dependencies.
 * Sounds only follow what the server already decided; nothing here affects a game.
 * Browsers block audio until the player interacts with the page, so the audio context is created
 * on the first click or key press (see installSoundUnlock) and every sound fails silently.
 */

export type SoundName =
  | 'click'
  | 'bet'
  | 'drop'
  | 'peg'
  | 'land'
  | 'win'
  | 'bigWin'
  | 'lose'
  | 'cashout'
  | 'crash'
  | 'milestone'
  | 'gem'
  | 'bomb'
  | 'roll';

export interface SoundOptions {
  /** Pitch input: Plinko row (0-1), Mines safe tile count, Crash whole multiplier. */
  step?: number;
  /** Length of the Dice roll animation, so the rattle slows down with the marker. */
  durationMs?: number;
}

export interface SoundSettings {
  muted: boolean;
  /** 0 to 1. */
  volume: number;
}

const STORAGE_KEY = 'mintline:sound';
export const DEFAULT_SOUND_SETTINGS: SoundSettings = { muted: false, volume: 0.7 };

export function readSoundSettings(storage: Storage | undefined): SoundSettings {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SOUND_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    const volume =
      typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1
        ? parsed.volume
        : DEFAULT_SOUND_SETTINGS.volume;
    return { muted: parsed.muted === true, volume };
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

// ---- Pure helpers (unit tested) ----

/** Mines: each safe tile rings a semitone higher, up to 19 steps. */
export function gemFrequency(safeReveals: number): number {
  const step = Math.min(Math.max(safeReveals, 1) - 1, 19);
  return 660 * 2 ** (step / 12);
}

/** Crash: pitch of the rising tone for a multiplier, capped so it never gets shrill. */
export function riseFrequency(x100: number): number {
  const multiplier = Math.max(1, x100 / 100);
  return Math.min(1100, 140 * multiplier ** 0.6);
}

/** Which sound a settled return deserves: 5x or more is a big win. */
export function outcomeSound(stake: number, virtualReturn: number): 'bigWin' | 'win' | 'lose' {
  if (virtualReturn > stake && virtualReturn >= stake * 5) return 'bigWin';
  if (virtualReturn > stake) return 'win';
  return 'lose';
}

/**
 * Dice: rattle tick times (seconds). Ticks are evenly spaced along the marker's path, and the
 * marker slows down (ease-out cubic), so the ticks spread out towards the end.
 */
export function rollTickTimes(durationMs: number, count = 12): number[] {
  if (durationMs <= 0) return [0];
  return Array.from({ length: count }, (_, i) => (durationMs / 1000) * (1 - (1 - i / count) ** (1 / 3)));
}

// ---- Synthesis ----

interface ToneSpec {
  freq: number;
  /** Glide to this frequency by the end. */
  to?: number;
  type?: OscillatorType;
  /** Start, seconds from now. */
  at?: number;
  dur?: number;
  gain?: number;
  attack?: number;
}

interface NoiseSpec {
  at?: number;
  dur?: number;
  gain?: number;
  filter?: BiquadFilterType;
  freq?: number;
  to?: number;
  q?: number;
}

interface Kit {
  tone: (spec: ToneSpec) => void;
  noise: (spec: NoiseSpec) => void;
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.5;
const G6 = 1568;
const C7 = 2093;

const RECIPES: Record<SoundName, (kit: Kit, options: SoundOptions) => void> = {
  click: (k) => k.tone({ freq: 1600, type: 'triangle', dur: 0.04, gain: 0.04 }),
  bet: (k) => {
    k.noise({ dur: 0.05, gain: 0.12, filter: 'bandpass', freq: 3200, q: 2 });
    k.tone({ freq: 520, to: 780, dur: 0.09, gain: 0.1 });
    k.tone({ freq: 780, type: 'triangle', at: 0.06, dur: 0.12, gain: 0.07 });
  },
  drop: (k) => k.tone({ freq: 700, to: 1100, dur: 0.07, gain: 0.06 }),
  peg: (k, o) => {
    const step = o.step ?? 0.5;
    const jitter = 0.97 + Math.random() * 0.06;
    k.tone({ freq: (820 + 520 * step) * jitter, type: 'triangle', dur: 0.035, gain: 0.035 });
  },
  land: (k) => {
    k.tone({ freq: 190, to: 110, dur: 0.14, gain: 0.14 });
    k.noise({ dur: 0.07, gain: 0.08, filter: 'lowpass', freq: 900 });
  },
  win: (k) => {
    [C5, E5, G5].forEach((freq, i) =>
      k.tone({ freq, type: 'triangle', at: i * 0.08, dur: 0.22, gain: 0.1 }),
    );
    k.tone({ freq: C6, type: 'triangle', at: 0.24, dur: 0.4, gain: 0.11 });
  },
  bigWin: (k) => {
    [C5, E5, G5, C6, E6, G6, C7].forEach((freq, i) =>
      k.tone({ freq, type: 'triangle', at: i * 0.06, dur: 0.25, gain: 0.09 }),
    );
    [C5, E5, G5, C6].forEach((freq) => k.tone({ freq, at: 0.45, dur: 1.1, gain: 0.045, attack: 0.03 }));
    k.noise({ at: 0.42, dur: 0.6, gain: 0.05, filter: 'highpass', freq: 7000 });
  },
  lose: (k) => {
    k.tone({ freq: 330, to: 220, dur: 0.26, gain: 0.08 });
    k.tone({ freq: 247, to: 165, at: 0.12, dur: 0.32, gain: 0.065 });
  },
  cashout: (k) => {
    [E6, G6, C7, 2637].forEach((freq, i) => {
      k.tone({ freq, type: 'triangle', at: i * 0.05, dur: 0.16, gain: 0.07 });
      k.noise({ at: i * 0.05, dur: 0.04, gain: 0.04, filter: 'highpass', freq: 6000 });
    });
  },
  crash: (k) => {
    k.noise({ dur: 0.75, gain: 0.32, filter: 'lowpass', freq: 1400, to: 90 });
    k.tone({ freq: 220, to: 50, type: 'square', dur: 0.5, gain: 0.05 });
  },
  milestone: (k, o) => {
    const freq = Math.min(1600, 600 + (o.step ?? 2) * 60);
    k.tone({ freq, dur: 0.07, gain: 0.05 });
    k.tone({ freq: freq * 1.5, at: 0.05, dur: 0.09, gain: 0.04 });
  },
  gem: (k, o) => {
    const freq = gemFrequency(o.step ?? 1);
    k.tone({ freq, type: 'triangle', dur: 0.16, gain: 0.09 });
    k.tone({ freq: freq * 1.5, type: 'triangle', at: 0.045, dur: 0.22, gain: 0.07 });
    k.noise({ at: 0.02, dur: 0.09, gain: 0.03, filter: 'highpass', freq: 7500 });
  },
  bomb: (k) => {
    k.noise({ dur: 0.9, gain: 0.42, filter: 'lowpass', freq: 2200, to: 70 });
    k.tone({ freq: 130, to: 38, dur: 0.65, gain: 0.28 });
  },
  roll: (k, o) => {
    const times = rollTickTimes(o.durationMs ?? 0);
    times.forEach((at, i) =>
      k.noise({
        at,
        dur: 0.025,
        gain: 0.1 * (1 - i / (times.length * 1.5)),
        filter: 'bandpass',
        freq: 2400 + Math.random() * 800,
        q: 3,
      }),
    );
  },
};

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  // `typeof window` (Window & typeof globalThis) includes the AudioContext global;
  // plain `Window` does not, which fails `tsc -b` on Vercel.
  const w = window as typeof window & { webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function envelope(
  ctx: AudioContext,
  out: AudioNode,
  start: number,
  attack: number,
  dur: number,
  peak: number,
): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(dur, attack + 0.01));
  gain.connect(out);
  return gain;
}

interface RiseNodes {
  osc: OscillatorNode;
  octave: OscillatorNode;
  gain: GainNode;
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private rise: RiseNodes | null = null;
  private settings: SoundSettings;
  private readonly listeners = new Set<() => void>();
  private readonly storage: Storage | undefined;

  constructor(storage?: Storage) {
    this.storage = storage;
    this.settings = readSoundSettings(storage);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSettings = (): SoundSettings => this.settings;

  setMuted(muted: boolean): void {
    this.update({ ...this.settings, muted });
  }

  setVolume(volume: number): void {
    this.update({ ...this.settings, volume: Math.min(1, Math.max(0, volume)) });
  }

  private update(next: SoundSettings): void {
    this.settings = next;
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode). The setting still applies for this visit.
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(next.muted ? 0 : next.volume, this.ctx.currentTime, 0.02);
    }
    this.listeners.forEach((listener) => listener());
  }

  /** Creates or resumes the audio context. Works only after the player has interacted. */
  unlock(): AudioContext | null {
    if (!this.ctx) {
      const Ctor = audioContextCtor();
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings.muted ? 0 : this.settings.volume;
      this.master.connect(this.ctx.destination);
      // Silence everything while the tab is in the background.
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend().catch(() => undefined);
        else void this.ctx.resume().catch(() => undefined);
      });
    }
    if (this.ctx.state === 'suspended' && !document.hidden) {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  play(name: SoundName, options: SoundOptions = {}): void {
    if (this.settings.muted) return;
    const ctx = this.unlock();
    if (!ctx || !this.master) return;
    try {
      RECIPES[name](this.kit(ctx, this.master), options);
    } catch {
      // Sound is never essential to playing.
    }
  }

  /** Crash: a quiet tone that climbs with the multiplier while a round runs. */
  startRise(): void {
    const ctx = this.unlock();
    if (!ctx || !this.master || this.rise) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.25);
    gain.connect(this.master);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = riseFrequency(100);
    osc.connect(gain);

    const octave = ctx.createOscillator();
    octave.frequency.value = riseFrequency(100) * 2;
    octave.detune.value = 6;
    const octaveGain = ctx.createGain();
    octaveGain.gain.value = 0.35;
    octave.connect(octaveGain).connect(gain);

    osc.start(now);
    octave.start(now);
    this.rise = { osc, octave, gain };
  }

  setRise(x100: number): void {
    if (!this.rise || !this.ctx) return;
    const freq = riseFrequency(x100);
    const now = this.ctx.currentTime;
    this.rise.osc.frequency.setTargetAtTime(freq, now, 0.08);
    this.rise.octave.frequency.setTargetAtTime(freq * 2, now, 0.08);
  }

  stopRise(): void {
    if (!this.rise || !this.ctx) return;
    const { osc, octave, gain } = this.rise;
    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0.0001, now, 0.04);
    osc.stop(now + 0.3);
    octave.stop(now + 0.3);
    this.rise = null;
  }

  private noiseSource(ctx: AudioContext): AudioBufferSourceNode {
    if (!this.noiseBuffer) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    return source;
  }

  private kit(ctx: AudioContext, out: AudioNode): Kit {
    return {
      tone: ({ freq, to, type = 'sine', at = 0, dur = 0.15, gain = 0.2, attack = 0.005 }) => {
        const start = ctx.currentTime + at;
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (to) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
        osc.connect(envelope(ctx, out, start, attack, dur, gain));
        osc.start(start);
        osc.stop(start + dur + 0.05);
      },
      noise: ({ at = 0, dur = 0.2, gain = 0.2, filter = 'bandpass', freq = 1000, to, q = 1 }) => {
        const start = ctx.currentTime + at;
        const source = this.noiseSource(ctx);
        const biquad = ctx.createBiquadFilter();
        biquad.type = filter;
        biquad.frequency.setValueAtTime(freq, start);
        if (to) biquad.frequency.exponentialRampToValueAtTime(to, start + dur);
        biquad.Q.value = q;
        source.connect(biquad).connect(envelope(ctx, out, start, 0.003, dur, gain));
        source.start(start);
        source.stop(start + dur + 0.05);
      },
    };
  }
}

function safeLocalStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** The app's one sound engine. */
export const sound = new SoundEngine(safeLocalStorage());

/** Unlocks audio on the player's first click or key press anywhere in the app. */
export function installSoundUnlock(engine: SoundEngine = sound): void {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    if (!engine.getSettings().muted) engine.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
