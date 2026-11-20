import Phaser from 'phaser';
import {
  ballAt,
  bucketOffset,
  bucketTone,
  compactMultiplier,
  type BucketTone,
} from '../../lib/plinko';
import { dropProgress, settleDrops, type PlinkoVisualState } from './plinkoVisualState';

const PEG_COLOR = 0xc9d2e6;
const BALL_COLOR = 0xffffff;
const BALL_OUTLINE = 0x05080f;
const TRAIL_COLOR = 0x3ee6a0;
const HIT_OUTLINE = 0xffffff;
const FONT = 'Inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif';
const NARROW_WIDTH = 480;
const LANDING_FLASH_MS = 450;
/** How long the latest bucket stays highlighted (others dimmed) after a landing. */
const LANDING_HOLD_MS = 1400;
/** Trail positions behind the ball, as a share of the whole drop. */
const TRAIL = [0.012, 0.024, 0.036];

// Original palette: slate below 1x, mint, amber, then rose for the rare edges.
const TONE_FILL: Record<BucketTone, number> = {
  below: 0x26324f,
  low: 0x16c784,
  mid: 0xf59e0b,
  high: 0xf43f5e,
};
const TONE_TEXT: Record<BucketTone, string> = {
  below: '#a3aec6',
  low: '#04140d',
  mid: '#1a1205',
  high: '#1f0509',
};

interface Layout {
  spacing: number;
  rowHeight: number;
  pegRadius: number;
  ballRadius: number;
  bucketWidth: number;
  bucketHeight: number;
  toX: (offset: number) => number;
  toY: (level: number) => number;
}

/** Fits the triangle of pegs plus the bucket row into the canvas, centred. */
function computeLayout(width: number, height: number, rows: number): Layout {
  // Phones get every pixel of width so the bucket labels stay readable.
  const padding = width < NARROW_WIDTH ? 4 : 14;
  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);
  // The last peg row is rows + 1 spacings wide; leave half a spacing either side.
  let spacing = usableWidth / (rows + 1.4);
  let rowHeight = spacing * 0.9;
  // Levels run from -1 (drop point) to rows (buckets), plus half a bucket below.
  const maxRowHeight = usableHeight / (rows + 1.8);
  if (rowHeight > maxRowHeight) {
    rowHeight = maxRowHeight;
    spacing = rowHeight / 0.9;
  }
  const bucketHeight = rowHeight * 0.85;
  const boardHeight = (rows + 1) * rowHeight + bucketHeight / 2;
  const top = (height - boardHeight) / 2;
  const centreX = width / 2;
  return {
    spacing,
    rowHeight,
    pegRadius: Math.max(2.2, spacing * 0.1),
    ballRadius: Math.max(5, spacing * 0.28),
    bucketWidth: spacing * 0.95,
    bucketHeight,
    toX: (offset) => centreX + offset * spacing,
    toY: (level) => top + (level + 1) * rowHeight,
  };
}

/** Draws the board and replays the server's paths. It never decides anything. */
export class PlinkoScene extends Phaser.Scene {
  private readonly plinkoState: PlinkoVisualState;
  private graphics?: Phaser.GameObjects.Graphics;
  /** Separate layer above the board and the bucket labels, so nothing can cover a ball. */
  private ballGraphics?: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private labelKey = '';

  constructor(state: PlinkoVisualState) {
    super({ key: 'plinko' });
    this.plinkoState = state;
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.ballGraphics = this.add.graphics().setDepth(2);
  }

  /** Bucket labels are text textures, so they are rebuilt only when the board or size changes. */
  private syncLabels(layout: Layout): void {
    const { rows, multipliersX100 } = this.plinkoState;
    // Narrow buckets drop the "x" so the number itself can be larger.
    const compact = layout.bucketWidth < 34;
    const fontSize = Math.round(Math.min(14, Math.max(9, layout.bucketWidth * (compact ? 0.34 : 0.27))));
    const key = `${rows}|${multipliersX100.join(',')}|${fontSize}|${compact}`;
    if (key === this.labelKey) return;
    this.labelKey = key;

    for (const label of this.labels) label.destroy();
    const resolution = Math.min(window.devicePixelRatio || 1, 2);
    this.labels = multipliersX100.map((x100) =>
      this.add
        .text(0, 0, compact ? compactMultiplier(x100).replace(/x$/, '') : compactMultiplier(x100), {
          fontFamily: FONT,
          fontStyle: 'bold',
          fontSize: `${fontSize}px`,
          color: TONE_TEXT[bucketTone(x100)],
          resolution,
        })
        .setOrigin(0.5)
        .setDepth(1),
    );
  }

  update(): void {
    const graphics = this.graphics;
    const ballGraphics = this.ballGraphics;
    if (!graphics || !ballGraphics) return;
    const state = this.plinkoState;
    const now = performance.now();
    settleDrops(state, now);
    const { rows, multipliersX100, drops, lastLanding, reducedMotion } = state;
    const layout = computeLayout(this.scale.width, this.scale.height, rows);

    graphics.clear();
    ballGraphics.clear();

    // Pegs: row i has i + 3 pegs.
    graphics.fillStyle(PEG_COLOR, 0.85);
    for (let row = 0; row < rows; row += 1) {
      const y = layout.toY(row);
      for (let peg = 0; peg < row + 3; peg += 1) {
        graphics.fillCircle(layout.toX(peg - (row + 2) / 2), y, layout.pegRadius);
      }
    }

    // Buckets. Right after a landing, its bucket is outlined and the others dim briefly.
    this.syncLabels(layout);
    const sinceLanded = lastLanding ? now - lastLanding.at : Infinity;
    const highlighted = lastLanding && sinceLanded < LANDING_HOLD_MS ? lastLanding.bucket : null;
    const bucketY = layout.toY(rows);
    const radius = Math.min(6, layout.bucketHeight * 0.25, layout.bucketWidth * 0.25);

    multipliersX100.forEach((x100, index) => {
      const x = layout.toX(bucketOffset(index, rows));
      const hit = index === highlighted;
      const flashing = hit && !reducedMotion && sinceLanded < LANDING_FLASH_MS;
      const lift = flashing
        ? -Math.sin((sinceLanded / LANDING_FLASH_MS) * Math.PI) * layout.rowHeight * 0.2
        : 0;
      const left = x - layout.bucketWidth / 2;
      const top = bucketY - layout.bucketHeight / 2 + lift;
      const dimmed = highlighted !== null && !hit;

      graphics.fillStyle(TONE_FILL[bucketTone(x100)], dimmed ? 0.45 : 1);
      graphics.fillRoundedRect(left, top, layout.bucketWidth, layout.bucketHeight, radius);
      if (hit) {
        graphics.lineStyle(2, HIT_OUTLINE, 0.9);
        graphics.strokeRoundedRect(left, top, layout.bucketWidth, layout.bucketHeight, radius);
      }

      const label = this.labels[index];
      if (label) {
        label.setPosition(x, bucketY + lift);
        label.setAlpha(dimmed ? 0.6 : 1);
        // Shrink a label that is wider than its bucket (narrow screens, 16 rows).
        const maxWidth = layout.bucketWidth * 0.92;
        label.setScale(label.width > maxWidth ? maxWidth / label.width : 1);
      }
    });

    // Falling balls, each with a short trail. A dark outline keeps them visible over buckets.
    const r = layout.ballRadius;
    for (const drop of drops) {
      if (drop.path.length === 0) continue;
      const progress = dropProgress(drop, now);
      if (!reducedMotion) {
        TRAIL.forEach((lag, i) => {
          const point = ballAt(drop.path, Math.max(0, progress - lag));
          ballGraphics.fillStyle(TRAIL_COLOR, 0.22 - i * 0.06);
          ballGraphics.fillCircle(layout.toX(point.offset), layout.toY(point.level), r * (0.9 - i * 0.15));
        });
      }
      const point = ballAt(drop.path, progress, !reducedMotion);
      const x = layout.toX(point.offset);
      const y = layout.toY(point.level);
      ballGraphics.fillStyle(BALL_OUTLINE, 1);
      ballGraphics.fillCircle(x, y, r + 1.5);
      ballGraphics.fillStyle(BALL_COLOR, 1);
      ballGraphics.fillCircle(x, y, r);
    }
  }
}
