import Phaser from 'phaser';
import { formatRoll } from '../../lib/dice';
import {
  markerValue,
  rollProgress,
  TRACK_PADDING,
  TRACK_Y_RATIO,
  type DiceVisualState,
} from './diceVisualState';

const COLORS = {
  win: 0x16c784,
  lose: 0xf43f5e,
  handle: 0xe8ecf4,
  marker: 0xffffff,
  outline: 0x05080f,
};
const TEXT = { idle: '#a3aec6', rolling: '#ffffff', won: '#8af5c8', lost: '#fb7185' };
const DISPLAY_FONT = '"Space Grotesk", Inter, ui-sans-serif, system-ui, sans-serif';
const FONT = 'Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif';
const TICKS = [0, 25, 50, 75, 100];

/** Draws the 0-100 track, the winning range and the server's roll. It never decides anything. */
export class DiceScene extends Phaser.Scene {
  private readonly diceState: DiceVisualState;
  private graphics?: Phaser.GameObjects.Graphics;
  private valueLabel?: Phaser.GameObjects.Text;
  private captionLabel?: Phaser.GameObjects.Text;
  private markerLabel?: Phaser.GameObjects.Text;
  private tickLabels: Phaser.GameObjects.Text[] = [];
  private fontSize = 0;
  private valueColor = '';

  constructor(state: DiceVisualState) {
    super({ key: 'dice' });
    this.diceState = state;
  }

  create(): void {
    const resolution = Math.min(window.devicePixelRatio || 1, 2);
    this.graphics = this.add.graphics();
    this.valueLabel = this.add
      .text(0, 0, '', { fontFamily: DISPLAY_FONT, fontStyle: 'bold', color: TEXT.idle, resolution })
      .setOrigin(0.5);
    this.captionLabel = this.add
      .text(0, 0, '', { fontFamily: FONT, color: TEXT.idle, resolution })
      .setOrigin(0.5);
    // Above the track and the marker tag.
    this.markerLabel = this.add
      .text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', color: '#05080f', resolution })
      .setOrigin(0.5)
      .setDepth(2);
    this.tickLabels = TICKS.map((tick) =>
      this.add
        .text(0, 0, String(tick), { fontFamily: FONT, color: '#6b7a99', resolution })
        .setOrigin(0.5, 0),
    );
  }

  update(): void {
    const graphics = this.graphics;
    const valueLabel = this.valueLabel;
    const captionLabel = this.captionLabel;
    const markerLabel = this.markerLabel;
    if (!graphics || !valueLabel || !captionLabel || !markerLabel) return;

    const state = this.diceState;
    const width = this.scale.width;
    const height = this.scale.height;
    const left = TRACK_PADDING;
    const right = width - TRACK_PADDING;
    const trackWidth = Math.max(1, right - left);
    const trackHeight = Math.round(Math.max(12, Math.min(20, height * 0.06)));
    const trackY = height * TRACK_Y_RATIO;
    const trackTop = trackY - trackHeight / 2;
    const toX = (x100: number) => left + (x100 / state.rollSpan) * trackWidth;

    // Font size re-renders the text textures, so only change it when the canvas resizes.
    const size = Math.round(Math.max(36, Math.min(84, Math.min(width, height) * 0.24)));
    const smallSize = Math.max(12, Math.round(size * 0.22));
    if (size !== this.fontSize) {
      this.fontSize = size;
      valueLabel.setFontSize(size);
      captionLabel.setFontSize(smallSize);
      markerLabel.setFontSize(Math.max(12, Math.round(size * 0.2)));
      for (const label of this.tickLabels) label.setFontSize(Math.max(11, Math.round(size * 0.17)));
    }

    const roll = state.roll;
    const progress = roll ? rollProgress(roll, performance.now()) : 0;
    const landed = roll !== null && progress >= 1;

    graphics.clear();

    // Track: green where the bet wins, red where it loses, with rounded ends and a dark rim.
    const targetX = toX(state.target);
    const underWins = state.direction === 'under';
    const r = trackHeight / 2;
    graphics.fillStyle(COLORS.outline, 0.9);
    graphics.fillRoundedRect(left - 4, trackTop - 4, trackWidth + 8, trackHeight + 8, r + 4);
    graphics.fillStyle(underWins ? COLORS.win : COLORS.lose, 1);
    graphics.fillRoundedRect(left, trackTop, Math.max(r * 2, targetX - left), trackHeight, {
      tl: r,
      bl: r,
      tr: 0,
      br: 0,
    });
    graphics.fillStyle(underWins ? COLORS.lose : COLORS.win, 1);
    graphics.fillRoundedRect(targetX, trackTop, Math.max(r * 2, right - targetX), trackHeight, {
      tl: 0,
      bl: 0,
      tr: r,
      br: r,
    });

    // Target handle: drag it (the page lays an input over the track).
    graphics.fillStyle(COLORS.outline, 1);
    graphics.fillRoundedRect(targetX - 6, trackY - trackHeight - 2, 12, trackHeight * 2 + 4, 5);
    graphics.fillStyle(COLORS.handle, 1);
    graphics.fillRoundedRect(targetX - 4, trackY - trackHeight, 8, trackHeight * 2, 4);

    this.tickLabels.forEach((label, index) => {
      label.setPosition(toX((TICKS[index] * state.rollSpan) / 100), trackY + trackHeight + 10);
    });

    // Roll marker: a tag above the track pointing at the roll. White while moving, then the
    // result colour. A dark outline keeps it readable over both zones.
    if (roll) {
      const value = markerValue(roll, progress);
      const x = toX(value);
      const fill = !landed ? COLORS.marker : roll.won ? COLORS.win : COLORS.lose;
      const tagWidth = Math.max(56, smallSize * 4.4);
      const tagHeight = Math.max(26, smallSize * 1.9);
      const tagX = Math.min(right - tagWidth / 2, Math.max(left + tagWidth / 2, x));
      const tipY = trackTop - 6;
      const tagY = tipY - 8 - tagHeight;

      graphics.fillStyle(COLORS.outline, 1);
      graphics.fillRoundedRect(tagX - tagWidth / 2 - 1.5, tagY - 1.5, tagWidth + 3, tagHeight + 3, 8);
      graphics.fillTriangle(x - 7.5, tagY + tagHeight, x + 7.5, tagY + tagHeight, x, tipY + 1.5);
      graphics.fillStyle(fill, 1);
      graphics.fillRoundedRect(tagX - tagWidth / 2, tagY, tagWidth, tagHeight, 8);
      graphics.fillTriangle(x - 6, tagY + tagHeight, x + 6, tagY + tagHeight, x, tipY);

      markerLabel
        .setVisible(true)
        .setText(formatRoll(Math.round(value)))
        .setPosition(tagX, tagY + tagHeight / 2);
    } else {
      markerLabel.setVisible(false);
    }

    // Big readout above the track.
    const side = `${state.direction} ${formatRoll(state.target)}`;
    let text: string;
    let color: string;
    let caption: string;
    if (!roll) {
      text = formatRoll(state.target);
      color = TEXT.idle;
      caption = `Roll ${side} to win · drag the bar to change`;
    } else if (!landed) {
      text = formatRoll(Math.round(markerValue(roll, progress)));
      color = TEXT.rolling;
      caption = 'Rolling…';
    } else {
      text = formatRoll(roll.to);
      color = roll.won ? TEXT.won : TEXT.lost;
      caption = roll.won ? `Win · needed ${side}` : `Miss · needed ${side}`;
    }
    if (color !== this.valueColor) {
      this.valueColor = color;
      valueLabel.setColor(color);
    }
    valueLabel.setText(text).setPosition(width / 2, height * 0.31);
    captionLabel.setText(caption).setPosition(width / 2, height * 0.31 + size * 0.62);
  }
}
