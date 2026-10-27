import { Container, Graphics } from 'pixi.js';
import { NAVY, type DataType } from '../config';

// A simple waveform line icon, in units of the disc radius
const WAVE: [number, number][] = [
  [-0.56, 0.02],
  [-0.32, 0.02],
  [-0.2, -0.36],
  [-0.04, 0.42],
  [0.1, -0.2],
  [0.22, 0.02],
  [0.56, 0.02],
];

/** Icon disc: flat disc in the type colour with a round-capped line icon inside */
export function sourceDisc(type: DataType, r: number): Container {
  const c = new Container();
  const g = new Graphics();
  // A solid base first, so tracks starting underneath never show through a see-through disc
  g.circle(0, 0, r).fill({ color: NAVY });
  g.circle(0, 0, r).fill({ color: type.color, alpha: type.alpha });
  g.moveTo(WAVE[0][0] * r, WAVE[0][1] * r);
  for (let i = 1; i < WAVE.length; i++) g.lineTo(WAVE[i][0] * r, WAVE[i][1] * r);
  g.stroke({ width: Math.max(1.5, r * 0.1), color: type.iconColor, cap: 'round', join: 'round' });
  c.addChild(g);
  return c;
}

export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const TEX_RADIUS = 32;
