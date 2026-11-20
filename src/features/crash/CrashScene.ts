import Phaser from 'phaser';
import {
  elapsedForMultiplier,
  formatMultiplier,
  multiplierAt,
  multiplierTicks,
  timeTicks,
} from '../../lib/crash';
import { estimatePayout, formatCoins } from '../../lib/money';
import { compactMultiplier } from '../../lib/plinko';
import type { CrashPhase, CrashVisualState } from './crashVisualState';

const COLORS = {
  grid: 0xffffff,
  line: 0x3ee6a0,
  fill: 0x16c784,
  crashed: 0xf43f5e,
  cashout: 0x8af5c8,
  afterCashout: 0x6b7a99,
  head: 0xffffff,
};
const TEXT = {
  idle: '#a3aec6',
  running: '#ffffff',
  crashed: '#fb7185',
  cashedOut: '#8af5c8',
  axis: '#6b7a99',
  caption: '#a3aec6',
};
const DISPLAY_FONT = '"Space Grotesk", Inter, ui-sans-serif, system-ui, sans-serif';
const FONT = 'Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif';
const PAD = { left: 46, right: 18, top: 18, bottom: 30 };
const MIN_VISIBLE_MS = 10000;
const CURVE_SAMPLES = 80;
const Y_LABELS = 6;
const X_LABELS = 6;

interface Frame {
  /** Length of the curve to draw. */
  elapsedMs: number;
  /** Multiplier in the big readout. */
  displayX100: number;
  lineColor: number;
  textColor: string;
  caption: string;
  cashoutX100: number | null;
  ended: boolean;
}

function describeFrame(state: CrashVisualState, now: number): Frame {
  const growth = state.growthPerMs;
  switch (state.phase) {
    case 'running': {
      const elapsed = state.reducedMotion
        ? state.polledElapsedMs
        : Math.max(0, now - state.localStartMs);
      const x100 = multiplierAt(elapsed, growth);
      return {
        elapsedMs: elapsed,
        displayX100: x100,
        lineColor: COLORS.line,
        textColor: TEXT.running,
        caption:
          state.stake !== null
            ? `Cash out now for ${formatCoins(estimatePayout(state.stake, x100))} VC`
            : 'Cash out before it crashes',
        cashoutX100: null,
        ended: false,
      };
    }
    case 'crashed': {
      const crash = state.crashX100 ?? 100;
      return {
        elapsedMs: elapsedForMultiplier(crash, growth),
        displayX100: crash,
        lineColor: COLORS.crashed,
        textColor: TEXT.crashed,
        caption: 'Crashed',
        cashoutX100: null,
        ended: true,
      };
    }
    case 'cashed_out': {
      const crash = state.crashX100 ?? 100;
      const cashout = state.cashoutX100 ?? 100;
      return {
        elapsedMs: elapsedForMultiplier(crash, growth),
        displayX100: cashout,
        lineColor: COLORS.line,
        textColor: TEXT.cashedOut,
        caption: `Cashed out · round crashed at ${formatMultiplier(crash)}`,
        cashoutX100: cashout,
        ended: true,
      };
    }
    case 'idle':
      return {
        elapsedMs: 0,
        displayX100: 100,
        lineColor: COLORS.line,
        textColor: TEXT.idle,
        caption: state.idleCaption,
        cashoutX100: null,
        ended: false,
      };
  }
}

/**
 * Draws the multiplier graph with axes, the big readout and the round's state.
 * It never decides anything: it only renders what the server reported.
 */
export class CrashScene extends Phaser.Scene {
  private readonly crashState: CrashVisualState;
  private graphics?: Phaser.GameObjects.Graphics;
  private readout?: Phaser.GameObjects.Text;
  private caption?: Phaser.GameObjects.Text;
  private cashoutTag?: Phaser.GameObjects.Text;
  private yLabels: Phaser.GameObjects.Text[] = [];
  private xLabels: Phaser.GameObjects.Text[] = [];
  private readoutSize = 0;
  private readoutColor = '';
  private lastPhase: CrashPhase = 'idle';

  constructor(state: CrashVisualState) {
    super({ key: 'crash' });
    this.crashState = state;
  }

  create(): void {
    const resolution = Math.min(window.devicePixelRatio || 1, 2);
    const axisStyle = { fontFamily: FONT, fontSize: '11px', color: TEXT.axis, resolution };
    this.graphics = this.add.graphics();
    this.yLabels = Array.from({ length: Y_LABELS }, () =>
      this.add.text(0, 0, '', axisStyle).setOrigin(1, 0.5),
    );
    this.xLabels = Array.from({ length: X_LABELS }, () =>
      this.add.text(0, 0, '', axisStyle).setOrigin(0.5, 0),
    );
    this.cashoutTag = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '12px',
        color: '#05080f',
        backgroundColor: '#8af5c8',
        padding: { x: 6, y: 3 },
        resolution,
      })
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setVisible(false);
    // A soft shadow keeps the readout legible where it crosses the curve.
    this.readout = this.add
      .text(0, 0, '', { fontFamily: DISPLAY_FONT, fontStyle: 'bold', color: TEXT.idle, resolution })
      .setOrigin(0.5)
      .setShadow(0, 2, 'rgba(0,0,0,0.65)', 10, false, true)
      .setDepth(3);
    this.caption = this.add
      .text(0, 0, '', { fontFamily: FONT, color: TEXT.caption, resolution })
      .setOrigin(0.5)
      .setShadow(0, 1, 'rgba(0,0,0,0.6)', 6, false, true)
      .setDepth(3);
  }

  update(): void {
    const g = this.graphics;
    const readout = this.readout;
    const caption = this.caption;
    const cashoutTag = this.cashoutTag;
    if (!g || !readout || !caption || !cashoutTag) return;

    const state = this.crashState;
    const now = performance.now();
    const frame = describeFrame(state, now);
    const growth = state.growthPerMs;

    // A short shake when a round the player was watching crashes.
    if (state.phase !== this.lastPhase) {
      if (state.phase === 'crashed' && this.lastPhase === 'running' && !state.reducedMotion) {
        this.cameras.main.shake(280, 0.006);
      }
      this.lastPhase = state.phase;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const left = PAD.left;
    const right = width - PAD.right;
    const top = PAD.top;
    const bottom = height - PAD.bottom;
    const plotWidth = Math.max(1, right - left);
    const plotHeight = Math.max(1, bottom - top);

    const xMax = Math.max(MIN_VISIBLE_MS, frame.elapsedMs * 1.2);
    const peakX100 = 100 * Math.exp(growth * frame.elapsedMs);
    const yMax = Math.max(200, peakX100 * 1.25);
    const toX = (ms: number) => left + (ms / xMax) * plotWidth;
    const toY = (x100: number) => bottom - ((x100 - 100) / (yMax - 100)) * plotHeight;

    g.clear();

    // Horizontal gridlines with multiplier labels.
    const yTicks = multiplierTicks(yMax, Y_LABELS - 1);
    this.yLabels.forEach((label, index) => {
      const tick = yTicks[index];
      if (tick === undefined) {
        label.setVisible(false);
        return;
      }
      const y = toY(tick);
      g.lineStyle(1, COLORS.grid, index === 0 ? 0.14 : 0.05);
      g.lineBetween(left, y, right, y);
      label.setVisible(true).setText(compactMultiplier(tick)).setPosition(left - 8, y);
    });

    // Time labels along the bottom.
    const xTicks = timeTicks(xMax, X_LABELS - 1);
    this.xLabels.forEach((label, index) => {
      const tick = xTicks[index];
      if (tick === undefined) {
        label.setVisible(false);
        return;
      }
      const x = toX(tick);
      g.lineStyle(1, COLORS.grid, 0.12);
      g.lineBetween(x, bottom, x, bottom + 4);
      label.setVisible(true).setText(`${Math.round(tick / 1000)}s`).setPosition(x, bottom + 7);
    });

    if (frame.elapsedMs > 0) {
      const points = Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => {
        const ms = (frame.elapsedMs * i) / CURVE_SAMPLES;
        return { x: toX(ms), y: toY(100 * Math.exp(growth * ms)) };
      });
      const head = points[points.length - 1];

      g.fillStyle(frame.lineColor === COLORS.crashed ? COLORS.crashed : COLORS.fill, 0.1);
      g.fillPoints([{ x: toX(0), y: bottom }, ...points, { x: head.x, y: bottom }], true);

      const cashoutX100 = frame.cashoutX100;
      const cashoutMs = cashoutX100 !== null ? elapsedForMultiplier(cashoutX100, growth) : null;
      if (cashoutX100 !== null && cashoutMs !== null) {
        // Bright up to the cash-out, muted for the rest of the round the player sat out.
        const cut = Math.min(CURVE_SAMPLES, Math.floor((cashoutMs / frame.elapsedMs) * CURVE_SAMPLES));
        const cashPoint = { x: toX(cashoutMs), y: toY(cashoutX100) };
        const before = [...points.slice(0, cut + 1), cashPoint];
        const after = [cashPoint, ...points.slice(cut + 1)];
        g.lineStyle(4, COLORS.line, 1);
        g.strokePoints(before, false);
        if (after.length > 1) {
          g.lineStyle(3, COLORS.afterCashout, 0.55);
          g.strokePoints(after, false);
        }
        g.lineStyle(1.5, COLORS.cashout, 0.45);
        for (let y = cashPoint.y + 9; y < bottom; y += 8) {
          g.lineBetween(cashPoint.x, y, cashPoint.x, Math.min(y + 4, bottom));
        }
        g.fillStyle(COLORS.cashout, 1);
        g.fillCircle(cashPoint.x, cashPoint.y, 6);
        cashoutTag
          .setVisible(true)
          .setText(formatMultiplier(cashoutX100))
          .setPosition(cashPoint.x, cashPoint.y - 10);
      } else {
        g.lineStyle(4, frame.lineColor, 1);
        g.strokePoints(points, false);
        cashoutTag.setVisible(false);
      }

      if (frame.ended) {
        // Where the round crashed.
        const s = 7;
        g.lineStyle(3, COLORS.crashed, 1);
        g.lineBetween(head.x - s, head.y - s, head.x + s, head.y + s);
        g.lineBetween(head.x - s, head.y + s, head.x + s, head.y - s);
      } else {
        g.fillStyle(frame.lineColor, 0.25);
        g.fillCircle(head.x, head.y, 11);
        g.fillStyle(COLORS.head, 1);
        g.fillCircle(head.x, head.y, 5.5);
      }
    } else {
      cashoutTag.setVisible(false);
      // Waiting: a pulsing point at 1.00x.
      const pulse = state.reducedMotion ? 0.5 : (Math.sin(now / 320) + 1) / 2;
      const x = toX(0);
      const y = toY(100);
      g.fillStyle(COLORS.line, 0.12 + 0.18 * pulse);
      g.fillCircle(x, y, 9 + 5 * pulse);
      g.fillStyle(COLORS.head, 1);
      g.fillCircle(x, y, 5);
    }

    // Font size and colour re-render text textures, so only change them when needed.
    const size = Math.round(Math.max(40, Math.min(112, Math.min(width, height) * 0.22)));
    if (size !== this.readoutSize) {
      this.readoutSize = size;
      readout.setFontSize(size);
      caption.setFontSize(Math.max(13, Math.round(size * 0.19)));
    }
    if (frame.textColor !== this.readoutColor) {
      this.readoutColor = frame.textColor;
      readout.setColor(frame.textColor);
    }
    const centreX = left + plotWidth / 2;
    const centreY = top + plotHeight * 0.36;
    readout.setText(formatMultiplier(frame.displayX100)).setPosition(centreX, centreY);
    caption.setText(frame.caption).setPosition(centreX, centreY + size * 0.72);
  }
}
