// ECG core sampling utilities (GL-only build cleaned of legacy 2D renderer).

import qrsTracePathUrl from './qrs-trace-path.svg';

let _loaded = false;
let _loadingPromise = null;
let _sampled = [];
let _tracePathElement = null;
let _tracePathLength = 0;
let _pathViewBox = null;

const DEFAULT_SAMPLE_RES = 3200;
// Removed DEFAULT_EDGE_SPATIAL_FADE / trail ratios (handled in GL shaders)

function hexA(hex, a){
  if (!hex) return `rgba(0,255,106,${a})`;
  let h = hex.replace('#','');
  if (h.length === 3) h = h.split('').map(c=>c+c).join('');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

// spatialEnvelope removed (handled on GPU)

async function loadPath({ sampleResolution = DEFAULT_SAMPLE_RES } = {}){
  if (_loaded) return;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = (async () => {
    const response = await fetch(qrsTracePathUrl);
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    _tracePathElement = svgDoc.querySelector('path');
    if (!_tracePathElement) throw new Error('Path not found in SVG');
    _tracePathLength = _tracePathElement.getTotalLength();
    const vb = svgDoc.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);
    _pathViewBox = { x: vb[0], y: vb[1], width: vb[2], height: vb[3] };
    _sampled = [];
    for (let i=0; i<=sampleResolution; i++){
      const norm = i / sampleResolution;
      const pt = _tracePathElement.getPointAtLength(norm * _tracePathLength);
      _sampled.push({ x: pt.x, y: pt.y, norm });
    }
    _loaded = true;
  })();
  return _loadingPromise;
}

export async function ensureLoaded(opts){ await loadPath(opts || {}); }
export function getSharedSampling(){ return { sampled: _sampled, viewBox: _pathViewBox }; }
export function isLoaded(){ return _loaded; }
export { hexA };
