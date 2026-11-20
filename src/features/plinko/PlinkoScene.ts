import Phaser from 'phaser';
import {
  ballAt,
  bucketOffset,
  bucketTone,
  compactMultiplier,
  type BucketTone,
} from '../../lib/plinko';
import { dropProgress, type PlinkoVisualState } from './plinkoVisualState';

const PEG_COLOR = 0xdfe6f5;
const PEG_GLOW = 0xa78bfa;
const BALL_COLOR = 0xffffff;
const BALL_GLOW = 0x3ee6a0;
const BALL_OUTLINE = 0x070b14;
const HIT_OUTLINE = 0xffffff;
const FONT = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif';
const PADDING = 16;
const LANDING_FLASH_MS = 450;

// Original palette: grey below 1x, mint, amber, then rose for the rare edges.
const TONE_FILL: Record<BucketTone, number> = {
  below: 0x2a3755,
  low: 0x0fa36b,
  mid: 0xf59e0b,
  high: 0xf43f5e,
};
const TONE_TEXT: Record<BucketTone, string> = {
  below: '#a9b4cc',
  low: '#070b14',
  mid: '#070b14',
  high: '#070b14',
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
  const usableWidth = Math.max(1, width - PADDING * 2);
  const usableHeight = Math.max(1, height - PADDING * 2);
  // The last peg row is rows + 1 spacings wide; leave half a spacing either side.
  let spacing = usableWidth / (rows + 2);
  let rowHeight = spacing * 0.9;
  // Levels run from -1 (drop point) to rows (buckets), plus half a bucket below.
  const maxRowHeight = usableHeight / (rows + 1.8);
  if (rowHeight > maxRowHeight) {
    rowHeight = maxRowHeight;
    spacing = rowHeight / 0.9;
  }
  const bucketHeight = rowHeight * 0.8;
  const boardHeight = (rows + 1) * rowHeight + bucketHeight / 2;
  const top = (height - boardHeight) / 2;
  const centreX = width / 2;
  return {
    spacing,
    rowHeight,
    pegRadius: Math.max(2.2, spacing * 0.1),
    ballRadius: Math.max(5, spacing * 0.28),
    bucketWidth: spacing * 0.94,
    bucketHeight,
    toX: (offset) => centreX + offset * spacing,
    toY: (level) => top + (level + 1) * rowHeight,
  };
}

/** Draws the board and replays the server's path. It never decides anything. */
export class PlinkoScene extends Phaser.Scene {
  private readonly plinkoState: PlinkoVisualState;
  private graphics?: Phaser.GameObjects.Graphics;
  /** Separate layer above the board and the bucket labels, so nothing can cover the ball. */
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
    // Sized from the bucket so the widest label ("14.9x") fits without shrinking.
    const fontSize = Math.round(Math.min(14, Math.max(8, layout.bucketWidth * 0.27)));
    const key = `${rows}|${multipliersX100.join(',')}|${fontSize}`;
    if (key === this.labelKey) return;
    this.labelKey = key;

    for (const label of this.labels) label.destroy();
    const resolution = Math.min(window.devicePixelRatio || 1, 2);
    this.labels = multipliersX100.map((x100) =>
      this.add
        .text(0, 0, compactMultiplier(x100), {
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
    const { rows, multipliersX100, drop, reducedMotion } = state;
    const layout = computeLayout(this.scale.width, this.scale.height, rows);
    const now = performance.now();

    graphics.clear();
    ballGraphics.clear();

    // Pegs: row i has i + 3 pegs, each with a soft halo.
    for (let row = 0; row < rows; row += 1) {
      const y = layout.toY(row);
      for (let peg = 0; peg < row + 3; peg += 1) {
        const x = layout.toX(peg - (row + 2) / 2);
        graphics.fillStyle(PEG_GLOW, 0.12);
        graphics.fillCircle(x, y, layout.pegRadius * 2.4);
        graphics.fillStyle(PEG_COLOR, 0.85);
        graphics.fillCircle(x, y, layout.pegRadius);
      }
    }

    // Buckets. Once the ball lands, its bucket is outlined and the others dim.
    const progress = drop ? dropProgress(drop, now) : 0;
    const landedBucket = drop && progress >= 1 ? drop.bucket : null;
    const sinceLanded = drop ? now - (drop.startedAt + drop.durationMs) : Infinity;
    this.syncLabels(layout);

    const bucketY = layout.toY(rows);
    const radius = Math.min(6, layout.bucketHeight * 0.25, layout.bucketWidth * 0.25);
    multipliersX100.forEach((x100, index) => {
      const x = layout.toX(bucketOffset(index, rows));
      const hit = index === landedBucket;
      const flashing = hit && !reducedMotion && sinceLanded < LANDING_FLASH_MS;
      const lift = flashing
        ? -Math.sin((sinceLanded / LANDING_FLASH_MS) * Math.PI) * layout.rowHeight * 0.18
        : 0;
      const left = x - layout.bucketWidth / 2;
      const top = bucketY - layout.bucketHeight / 2 + lift;

      graphics.fillStyle(TONE_FILL[bucketTone(x100)], landedBucket === null || hit ? 1 : 0.45);
      graphics.fillRoundedRect(left, top, layout.bucketWidth, layout.bucketHeight, radius);
      if (hit) {
        graphics.lineStyle(2, HIT_OUTLINE, 0.9);
        graphics.strokeRoundedRect(left, top, layout.bucketWidth, layout.bucketHeight, radius);
      }

      const label = this.labels[index];
      if (label) {
        label.setPosition(x, bucketY + lift);
        label.setAlpha(landedBucket === null || hit ? 1 : 0.6);
        // Shrink a label that is wider than its bucket (narrow screens, 16 rows).
        const maxWidth = layout.bucketWidth * 0.92;
        label.setScale(label.width > maxWidth ? maxWidth / label.width : 1);
      }
    });

    // The ball, while it is still falling. A dark outline keeps it visible over coloured buckets.
    if (drop && progress < 1 && drop.path.length > 0) {
      const point = ballAt(drop.path, progress, !reducedMotion);
      const x = layout.toX(point.offset);
      const y = layout.toY(point.level);
      const r = layout.ballRadius;
      ballGraphics.fillStyle(BALL_GLOW, 0.3);
      ballGraphics.fillCircle(x, y, r * 1.8);
      ballGraphics.fillStyle(BALL_OUTLINE, 1);
      ballGraphics.fillCircle(x, y, r + 1.5);
      ballGraphics.fillStyle(BALL_COLOR, 1);
      ballGraphics.fillCircle(x, y, r);
    }
  }
}
