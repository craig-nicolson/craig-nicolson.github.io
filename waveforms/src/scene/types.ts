import type { Container } from 'pixi.js';

export interface StageLabel {
  name: string;
  share: string;
  x: number;
  y: number;
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
  /** Let a long name wrap within this width */
  maxWidth?: number;
  /** Titles for whole parts of the picture */
  tier?: boolean;
  /** Labels for a row of the picture, like "1 hour" */
  row?: boolean;
  /** Seconds into the entrance when the label fades in, with the part of the picture it labels */
  appear: number;
}

/** Where things are when a year completes: the year disc, and the slot the finished year lands in */
export interface FinaleStage {
  cx: number;
  cy: number;
  R: number;
  w: number;
  h: number;
  /** The canvas spans the window, wider than the picture: its left and right edges */
  x0: number;
  x1: number;
  dotR: number;
  /** The ring around the year, and the ringed slot in the dataset it is tied to */
  ring: number;
  slotR: number;
  tx: number;
  ty: number;
  tr: number;
  /** Finished years in the dataset, now including this one */
  years: number;
}

/** One hour of the finished year, as the scene drew it */
export interface FinaleDot {
  x: number;
  y: number;
  tint: number;
  alpha: number;
  type: number;
}

/** How the scene should draw the year's ring during a finale: how white it is, and any opening */
export interface RingLook {
  white: number;
  gap: { a0: number; a1: number; ccw: boolean } | null;
}

/**
 * An optional year-complete animation. The scene knows only this shape, and is
 * given a maker for it by the page, so finales can be switched off, or their
 * file deleted, without touching the core (see src/scene/celebration.ts).
 */
export interface Finale {
  readonly root: Container;
  /** Called once, when the finished year arrives in its slot */
  onLand: () => void;
  /** Returns false when the finale has ended */
  update(dt: number): boolean;
  ring(): RingLook;
  destroy(): void;
}

export type MakeFinale = (stage: FinaleStage, dots: FinaleDot[]) => Finale;
