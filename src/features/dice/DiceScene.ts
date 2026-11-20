import Phaser from 'phaser';
import { formatRoll } from '../../lib/dice';
import { markerValue, rollProgress, type DiceVisualState } from './diceVisualState';

const COLORS = {
  win: 0x16c784,
  lose: 0xf43f5e,
  handle: 0xe6eaf2,
  marker: 0xffffff,
  outline: 0x070b14,
};
const TEXT = { idle: '#a9b4cc', rolling: '#e6eaf2', won: '#7ff0c0', lost: '#fb7185' };
const FONT = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif';
const PADDING = 28;
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
      .text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', color: TEXT.idle, resolution })
      .setOrigin(0.5);
    this.captionLabel = this.add
      .text(0, 0, '', { fontFamily: FONT, color: TEXT.idle, resolution })
      .setOrigin(0.5);
    // Above the track and the marker tag.
    this.markerLabel = this.add
      .text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', color: '#070b14', resolution })
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
    const left = PADDING;
    const right = width - PADDING;
    const trackWidth = Math.max(1, right - left);
    const trackHeight = Math.round(Math.max(10, Math.min(18, height * 0.05)));
    const trackY = height * 0.7;
    const trackTop = trackY - trackHeight / 2;
    const toX = (x100: number) => left + (x100 / state.rollSpan) * trackWidth;

    // Font size re-renders the text textures, so only change it when the canvas resizes.
    const size = Math.round(Math.max(28, Math.min(72, Math.min(width, height) * 0.22)));
    const smallSize = Math.max(12, Math.round(size * 0.24));
    if (size !== this.fontSize) {
      this.fontSize = size;
      valueLabel.setFontSize(size);
      captionLabel.setFontSize(smallSize);
      markerLabel.setFontSize(smallSize);
      for (const label of this.tickLabels) label.setFontSize(Math.max(11, Math.round(size * 0.2)));
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

    // Target handle.
    graphics.fillStyle(COLORS.outline, 1);
    graphics.fillRoundedRect(targetX - 4.5, trackY - trackHeight - 1.5, 9, trackHeight * 2 + 3, 4);
    graphics.fillStyle(COLORS.handle, 1);
    graphics.fillRoundedRect(targetX - 3, trackY - trackHeight, 6, trackHeight * 2, 3);

    this.tickLabels.forEach((label, index) => {
      label.setPosition(toX((TICKS[index] * state.rollSpan) / 100), trackY + trackHeight + 8);
    });

    // Roll marker: a tag above the track pointing at the roll. White while moving, then the
    // result colour. A dark outline keeps it readable over both zones.
    if (roll) {
      const value = markerValue(roll, progress);
      const x = toX(value);
      const fill = !landed ? COLORS.marker : roll.won ? COLORS.win : COLORS.lose;
      const tagWidth = smallSize * 4.4;
      const tagHeight = smallSize * 1.9;
      const tagX = Math.min(right - tagWidth / 2, Math.max(left + tagWidth / 2, x));
      const tipY = trackTop - 2;
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
      caption = `Roll ${side} to win`;
    } else if (!landed) {
      text = formatRoll(Math.round(markerValue(roll, progress)));
      color = TEXT.rolling;
      caption = 'Rolling…';
    } else {
      text = formatRoll(roll.to);
      color = roll.won ? TEXT.won : TEXT.lost;
      caption = roll.won ? `Win · rolled ${side}` : `Miss · needed ${side}`;
    }
    if (color !== this.valueColor) {
      this.valueColor = color;
      valueLabel.setColor(color);
    }
    valueLabel.setText(text).setPosition(width / 2, height * 0.3);
    captionLabel.setText(caption).setPosition(width / 2, height * 0.3 + size * 0.72);
  }
}
