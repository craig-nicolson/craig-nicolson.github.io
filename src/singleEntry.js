import './style.css';
import { ensureLoaded } from './ecgCore.js';
import { MultiECGBatchGL, BatchAnimator } from './multiBatchGL.js';
import { hexToArray } from './color.js';
import { drawSimpleGrid } from './grid.js';
import { initOverlayControls } from './overlayControls.js';

// ===== Configuration Variables (Single Page) =====
// Adjust these to set initial defaults for the single ECG page.
const CONFIG = {
  HEART_RATE: 85,
  OVERLAP_PERCENT: 15,
  TRAIL_LIFE_PERCENT: 65,
  GRID_SIZE: 50,
  CORE_WIDTH: 4,
  COLORS: { trace: '#00ff6a', gridPanel: '#00ff6a', gridMajor: '#00ff6a', gridMinor: '#00ff6a' },
  SHOW_GRID: true,
  SAMPLE_RESOLUTION: 3200,
  OVERLAY_TEXT_SIZE: 18,
  OVERLAY_TEXT_COLOR: '#00ff6a',
  OVERLAY_TEXT_GLOW: 8,
  TOTAL_BEATS_SIZE: 22
};

// ===== DOM References =====
const gridCanvas = document.getElementById('single-grid-canvas');
const traceCanvas = document.getElementById('single-trace-canvas');
const bpmSpan = document.getElementById('single-bpm');
const beatSpan = document.getElementById('single-beats');

// Heart rate control only (other appearance handled by overlay)
const elHR = document.getElementById('cfg-hr');
const valHR = document.getElementById('val-hr');

let batch=null, animator=null, gridCtx=null;
let singleTraceRef=null; // reference to first (only) trace for BPM / beats

function drawGrid(){ if(CONFIG.SHOW_GRID) drawSimpleGrid(gridCanvas, CONFIG.GRID_SIZE, CONFIG.COLORS.gridMajor, CONFIG.COLORS.gridMinor); }

function init(){
  ensureLoaded({ sampleResolution: CONFIG.SAMPLE_RESOLUTION }).then(()=>{
    // Build a 1x1 batch instance using the multi renderer
    batch = new MultiECGBatchGL(traceCanvas, {
      rows:1,
      cols:1,
      overlapPercent: CONFIG.OVERLAP_PERCENT,
      trailLifePercent: CONFIG.TRAIL_LIFE_PERCENT,
  lineWidth: CONFIG.CORE_WIDTH,
  glow: false,
  colorCore: [0,1,0,0.95]
    });
    animator = new BatchAnimator(batch);
  animator.start();
    gridCtx = gridCanvas.getContext('2d');
  if(CONFIG.SHOW_GRID) drawGrid();
    // Reference to single trace
    singleTraceRef = batch.traces[0];
    bpmSpan.textContent = Math.round(singleTraceRef.heartRate);
    beatSpan.textContent = '0';
  // Apply initial text styling vars
  document.documentElement.style.setProperty('--overlay-text-size', CONFIG.OVERLAY_TEXT_SIZE + 'px');
  document.documentElement.style.setProperty('--overlay-text-color', CONFIG.OVERLAY_TEXT_COLOR);
  document.documentElement.style.setProperty('--overlay-text-shadow', buildTextShadow(CONFIG.OVERLAY_TEXT_COLOR, CONFIG.OVERLAY_TEXT_GLOW));
  const totalCounter = document.getElementById('data-counter'); if(totalCounter) totalCounter.style.color = CONFIG.OVERLAY_TEXT_COLOR;
  const total = document.getElementById('data-counter'); if(total) total.style.fontSize = CONFIG.TOTAL_BEATS_SIZE + 'px';
    // HUD updater for counters (throttled)
    let lastUpdate=0;
    (function hud(ts){
      if(ts - lastUpdate > 70 && singleTraceRef){
        lastUpdate = ts;
        bpmSpan.textContent = Math.round(singleTraceRef.heartRate);
        beatSpan.textContent = singleTraceRef.beatCount;
      }
      requestAnimationFrame(hud);
    })(performance.now());
  });
}

function bindControls(){
  if(!elHR) return;
  elHR.addEventListener('input', ()=>{
    const v=+elHR.value;
    if(singleTraceRef){
      singleTraceRef.baseHeartRate = v;
      singleTraceRef.heartRate = v;
      singleTraceRef.beatInterval = 60000/v;
      singleTraceRef.driftStart = 0;
    }
    valHR.textContent=v; bpmSpan.textContent=v;
  });
}

// Removed duplicate hexColorToArray (centralized in color.js)

bindControls();
init();
// Overlay controls (single)
initOverlayControls({
  batch: ()=>batch,
  single: true,
  redrawGrid: (size)=>{ CONFIG.GRID_SIZE=size; drawGrid(); },
  toggleGrid: (show)=>{ CONFIG.SHOW_GRID = show; if(show) drawGrid(); else gridCtx && gridCtx.clearRect(0,0,gridCanvas.width,gridCanvas.height); },
  updateText: ({size, color, totalSize, glow})=>{
    let shadowDirty=false;
    if(size){ CONFIG.OVERLAY_TEXT_SIZE = size; document.documentElement.style.setProperty('--overlay-text-size', size + 'px'); }
    if(color){ CONFIG.OVERLAY_TEXT_COLOR = color; document.documentElement.style.setProperty('--overlay-text-color', color); const t=document.getElementById('data-counter'); if(t) t.style.color = color; shadowDirty=true; }
    if(typeof glow === 'number'){ CONFIG.OVERLAY_TEXT_GLOW = glow; shadowDirty=true; }
    if(shadowDirty){ const shadow = CONFIG.OVERLAY_TEXT_GLOW>0 ? buildTextShadow(CONFIG.OVERLAY_TEXT_COLOR, CONFIG.OVERLAY_TEXT_GLOW) : 'none'; document.documentElement.style.setProperty('--overlay-text-shadow', shadow); }
    if(totalSize){ CONFIG.TOTAL_BEATS_SIZE = totalSize; const t=document.getElementById('data-counter'); if(t) t.style.fontSize = totalSize + 'px'; }
  }
});

function hexToRgb(hex){ let h=hex.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function buildTextShadow(color, glow){
  const [r,g,b] = hexToRgb(color);
  if(glow <= 0) return 'none';
  if(glow < 4) return `0 0 ${glow}px rgba(${r},${g},${b},0.65)`;
  const g1 = Math.round(glow*0.4);
  const g2 = Math.round(glow*0.75);
  return `0 0 ${g1}px rgba(${r},${g},${b},0.55), 0 0 ${g2}px rgba(${r},${g},${b},0.35), 0 0 ${glow}px rgba(${r},${g},${b},0.22)`;
}
