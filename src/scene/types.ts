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
}
