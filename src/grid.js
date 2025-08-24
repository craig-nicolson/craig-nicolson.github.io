// Grid rendering utilities for both single and multi views.
// Single view uses a simple uniform spacing grid; multi uses per-cell normalized spacing.

import { hexA } from './color.js';

/**
 * Draw a simple major/minor grid onto a 2D canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {number} majorSize - Pixel spacing for major lines.
 * @param {string} color - Base hex color.
 * @param {string} majorColor - Hex color for major lines.
 * @param {string} minorColor - Hex color for minor lines.
 */
export function drawSimpleGrid(canvas, majorSize, majorColor, minorColor){
  const ctx = canvas.getContext('2d');
  if(!ctx) return;
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  const dpr = window.devicePixelRatio || 1;
  if(canvas.width !== w*dpr || canvas.height !== h*dpr){
    canvas.width = w*dpr; canvas.height = h*dpr; canvas.style.width = w+'px'; canvas.style.height = h+'px';
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const major = majorSize;
  const minor = major/5;
  ctx.lineWidth = 1;
  // Minor lines
  ctx.strokeStyle = hexA(minorColor || majorColor,0.06);
  ctx.beginPath();
  for(let x=0;x<w;x+=minor){ ctx.moveTo(x,0); ctx.lineTo(x,h); }
  for(let y=0;y<h;y+=minor){ ctx.moveTo(0,y); ctx.lineTo(w,y); }
  ctx.stroke();
  // Major lines
  ctx.strokeStyle = hexA(majorColor,0.14);
  ctx.beginPath();
  for(let x=0;x<w;x+=major){ ctx.moveTo(x,0); ctx.lineTo(x,h); }
  for(let y=0;y<h;y+=major){ ctx.moveTo(0,y); ctx.lineTo(w,y); }
  ctx.stroke();
}
