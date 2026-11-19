import Phaser from 'phaser';
import { elapsedForMultiplier, formatMultiplier, multiplierAt } from '../../lib/crash';
import type { CrashVisualState } from './crashVisualState';

const COLORS = { grid: 0x1c2740, running: 0x16c784, crashed: 0xf43f5e, cashout: 0x7ff0c0 };
const TEXT_COLORS = { idle: '#a9b4cc', running: '#e6eaf2', crashed: '#fb7185', cashedOut: '#7ff0c0' };
const FONT = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif';
const PADDING = 20;
const MIN_VISIBLE_MS = 8000;
const CURVE_SAMPLES = 64;

interface Frame {
  curveElapsedMs: number;
  displayX100: number;
  color: number;
  textColor: string;
  caption: string;
  markerX100: number | null;
}

function describeFrame(state: CrashVisualState, now: number): Frame {
  const growth = state.growthPerMs;
  switch (state.phase) {
    case 'running': {
      const elapsed = state.reducedMotion
        ? state.polledElapsedMs
        : Math.max(0, now - state.localStartMs);
      return {
        curveElapsedMs: elapsed,
        displayX100: multiplierAt(elapsed, growth),
        color: COLORS.running,
        textColor: TEXT_COLORS.running,
        caption: 'Cash out before it crashes',
        markerX100: null,
      };
    }
    case 'crashed': {
      const crash = state.crashX100 ?? 100;
      return {
        curveElapsedMs: elapsedForMultiplier(crash, growth),
        displayX100: crash,
        color: COLORS.crashed,
        textColor: TEXT_COLORS.crashed,
        caption: 'Crashed',
        markerX100: null,
      };
    }
    case 'cashed_out': {
      const crash = state.crashX100 ?? 100;
      const cashout = state.cashoutX100 ?? 100;
      return {
        curveElapsedMs: elapsedForMultiplier(crash, growth),
        displayX100: cashout,
        color: COLORS.running,
        textColor: TEXT_COLORS.cashedOut,
        caption: `Cashed out · crashed at ${formatMultiplier(crash)}`,
        markerX100: cashout,
      };
    }
    case 'idle':
      return {
        curveElapsedMs: 0,
        displayX100: 100,
        color: COLORS.running,
        textColor: TEXT_COLORS.idle,
        caption: 'Waiting for a round',
        markerX100: null,
      };
  }
}

/** Draws the multiplier curve. It never decides anything; it only renders `state`. */
export class CrashScene extends Phaser.Scene {
  private readonly crashState: CrashVisualState;
  private curveGraphics?: Phaser.GameObjects.Graphics;
  private multiplierLabel?: Phaser.GameObjects.Text;
  private captionLabel?: Phaser.GameObjects.Text;
  private labelSize = 0;
  private labelColor = '';

  constructor(state: CrashVisualState) {
    super({ key: 'crash' });
    this.crashState = state;
  }

  create(): void {
    const resolution = Math.min(window.devicePixelRatio || 1, 2);
    this.curveGraphics = this.add.graphics();
    this.multiplierLabel = this.add
      .text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', color: TEXT_COLORS.idle, resolution })
      .setOrigin(0.5);
    this.captionLabel = this.add
      .text(0, 0, '', { fontFamily: FONT, color: '#a9b4cc', resolution })
      .setOrigin(0.5);
  }

  update(): void {
    const graphics = this.curveGraphics;
    const multiplierLabel = this.multiplierLabel;
    const captionLabel = this.captionLabel;
    if (!graphics || !multiplierLabel || !captionLabel) return;

    const width = this.scale.width;
    const height = this.scale.height;
    const growth = this.crashState.growthPerMs;
    const frame = describeFrame(this.crashState, performance.now());

    const left = PADDING;
    const right = width - PADDING;
    const top = PADDING;
    const bottom = height - PADDING;
    const plotWidth = Math.max(1, right - left);
    const plotHeight = Math.max(1, bottom - top);

    const xMax = Math.max(MIN_VISIBLE_MS, frame.curveElapsedMs * 1.15);
    const yMax = Math.max(200, 100 * Math.exp(growth * frame.curveElapsedMs) * 1.15);
    const toX = (ms: number) => left + (ms / xMax) * plotWidth;
    const toY = (x100: number) => bottom - ((x100 - 100) / (yMax - 100)) * plotHeight;

    graphics.clear();
    graphics.lineStyle(1, COLORS.grid, 1);
    for (let i = 0; i <= 4; i += 1) {
      const y = top + (plotHeight * i) / 4;
      graphics.lineBetween(left, y, right, y);
    }

    if (frame.curveElapsedMs > 0) {
      const points: Array<{ x: number; y: number }> = [];
      for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
        const ms = (frame.curveElapsedMs * i) / CURVE_SAMPLES;
        points.push({ x: toX(ms), y: toY(100 * Math.exp(growth * ms)) });
      }
      const head = points[points.length - 1];

      graphics.fillStyle(frame.color, 0.12);
      graphics.fillPoints([{ x: toX(0), y: bottom }, ...points, { x: head.x, y: bottom }], true);
      graphics.lineStyle(4, frame.color, 1);
      graphics.strokePoints(points, false);
      graphics.fillStyle(frame.color, 1);
      graphics.fillCircle(head.x, head.y, 6);

      if (frame.markerX100 !== null) {
        const x = toX(elapsedForMultiplier(frame.markerX100, growth));
        const y = toY(frame.markerX100);
        graphics.lineStyle(2, COLORS.cashout, 0.6);
        graphics.lineBetween(x, y, x, bottom);
        graphics.fillStyle(COLORS.cashout, 1);
        graphics.fillCircle(x, y, 7);
      }
    }

    // Font size and color re-render the text texture, so only change them when needed.
    const size = Math.round(Math.max(28, Math.min(width, height) * 0.2));
    if (size !== this.labelSize) {
      this.labelSize = size;
      multiplierLabel.setFontSize(size);
      captionLabel.setFontSize(Math.max(12, Math.round(size * 0.22)));
    }
    if (frame.textColor !== this.labelColor) {
      this.labelColor = frame.textColor;
      multiplierLabel.setColor(frame.textColor);
    }
    multiplierLabel.setText(formatMultiplier(frame.displayX100)).setPosition(width / 2, height * 0.4);
    captionLabel.setText(frame.caption).setPosition(width / 2, height * 0.4 + size * 0.75);
  }
}
