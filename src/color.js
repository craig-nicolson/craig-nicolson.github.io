// Color utility helpers shared across single and multi entry.
// Provides consistent hex -> rgba conversions and array helpers for WebGL uniforms.

/**
 * Convert a hex color (3 or 6 digit) + alpha to an rgba CSS string.
 * @param {string} hex - Color like '#00ff6a'.
 * @param {number} a - Alpha 0..1.
 * @returns {string}
 */
export function hexA(hex, a){
  if (!hex) return `rgba(0,255,106,${a})`;
  let h = hex.replace('#','');
  if (h.length === 3) h = h.split('').map(c=>c+c).join('');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Convert a hex color to a float array [r,g,b,a].
 * @param {string} hex - '#rrggbb' or '#rgb'.
 * @param {number} a - alpha 0..1.
 * @returns {number[]}
 */
export function hexToArray(hex, a){
  let h = hex.replace('#','');
  if(h.length === 3) h = h.split('').map(c=>c+c).join('');
  const r = parseInt(h.slice(0,2),16)/255;
  const g = parseInt(h.slice(2,4),16)/255;
  const b = parseInt(h.slice(4,6),16)/255;
  return [r,g,b,a];
}
