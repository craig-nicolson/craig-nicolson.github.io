import './style.css';
import { ensureLoaded } from './ecgCore.js';
import { MultiECGBatchGL, BatchAnimator } from './multiBatchGL.js';
import { initOverlayControls } from './overlayControls.js';

// ===== Configuration Variables (Multi Page) =====
const CONFIG = {
  ROWS: 10,
  COLS: 8,
  OVERLAP_PERCENT: 15,
  TRAIL_LIFE_PERCENT: 65, // behind-the-scenes configurable (percentage of beat duration contributing to visible+fade trail)
  GRID_SIZE: 42,
  GRID_COLOR_PANEL: '#00ff6a',
  GRID_COLOR_MAJOR: '#00ff6a',
  GRID_COLOR_MINOR: '#00ff6a',
  OVERLAY_TEXT_SIZE: 18,
  OVERLAY_TEXT_COLOR: '#00ff6a',
  SAMPLE_RESOLUTION: 2400
};

// Removed BPM distribution helpers (batch renderer randomization handled internally if needed)

const gridEl = document.getElementById('multi-grid');
const totalCounter = document.getElementById('data-counter');
const fpsEl = document.getElementById('fps-counter');
// Hide FPS initially; overlay hotkey Alt+P will reveal
if(fpsEl) fpsEl.style.display='none';
let batch=null, batchAnimator=null;
let gridCanvasRef=null, glCanvasRef=null, overlayLayerRef=null;
let currentDrawGrid=null; // function reference for cheap redraw
let resizeHandlerAttached=false;
let overlays=[]; // per-cell overlays for bpm & beats

// Total beats now sourced directly from batch every HUD update.

// Removed legacy per-cell non-batched build (GL-only mode now always uses batch renderer).

// (CSS grid overlay helper removed; static canvas grid used exclusively)

// Removed legacy animate() loop (batch animator handles rendering + HUD updates)

function buildBatch(){
  // Stop existing animator & dispose old GL resources before rebuilding
  if(batchAnimator){ batchAnimator.stop(); }
  if(batch){ batch.dispose(); }
  const gridEl = document.getElementById('multi-grid');
  gridEl.innerHTML='';
  // Ensure container participates in flex layout with non-zero size
  gridEl.style.flex = '1 1 auto';
  gridEl.style.minHeight = '100px';
  gridEl.style.display = 'block'; // remove CSS grid layout to avoid zero-height with no children
  gridEl.style.position = 'relative';
  // Grid background canvas (static)
  const gridCanvas=document.createElement('canvas');
  const glCanvas=document.createElement('canvas');
  const overlayLayer=document.createElement('div');
  glCanvas.style.background = 'transparent';
  gridCanvas.style.position='absolute';
  glCanvas.style.position='absolute';
  overlayLayer.style.position='absolute';
  gridCanvas.style.top=glCanvas.style.top='0';
  gridCanvas.style.left=glCanvas.style.left='0';
  gridCanvas.style.width=glCanvas.style.width='100%';
  gridCanvas.style.height=glCanvas.style.height='100%';
  overlayLayer.style.top='0'; overlayLayer.style.left='0'; overlayLayer.style.width='100%'; overlayLayer.style.height='100%'; overlayLayer.style.pointerEvents='none';
  glCanvas.style.pointerEvents='none';
  gridEl.style.position='relative';
  gridEl.appendChild(gridCanvas);
  gridEl.appendChild(glCanvas);
  gridEl.appendChild(overlayLayer);
  // Build overlays once per build
  overlays.length=0; overlayLayer.innerHTML='';
  for(let i=0;i<CONFIG.ROWS*CONFIG.COLS;i++){
    const el=document.createElement('div');
    el.className='cell-overlay';
    el.innerHTML='<span class="ov bpm">BPM: --</span><span class="ov beats">Beat Count: 0</span>';
    overlayLayer.appendChild(el);
    overlays.push(el);
  }
  function positionOverlays(){
    const w=gridEl.clientWidth||gridEl.offsetWidth; const h=gridEl.clientHeight||gridEl.offsetHeight; if(!w||!h) return;
    const cellW=w/CONFIG.COLS, cellH=h/CONFIG.ROWS;
    for(let i=0;i<overlays.length;i++){
      const c=i%CONFIG.COLS; const r=Math.floor(i/CONFIG.COLS);
      const el=overlays[i];
  el.style.transform=`translate(${(c*cellW)+6}px, ${(r*cellH)+6}px)`;
    }
  }
  function drawStaticGrid(){
    let w=gridEl.clientWidth||gridEl.offsetWidth; let h=gridEl.clientHeight||gridEl.offsetHeight;
    if (w === 0 || h === 0){
      // Attempt a fallback sizing to viewport and retry next frame
      w = window.innerWidth; h = window.innerHeight - (document.querySelector('.multi-header')?.offsetHeight||0) - 10;
      gridEl.style.width = w + 'px';
      gridEl.style.height = h + 'px';
      if (w === 0 || h === 0){ requestAnimationFrame(drawStaticGrid); return; }
    }
    const dpr=window.devicePixelRatio||1; gridCanvas.width=w*dpr; gridCanvas.height=h*dpr; gridCanvas.style.width=w+'px'; gridCanvas.style.height=h+'px';
    const ctx=gridCanvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#0d0d0d'; ctx.fillRect(0,0,w,h);
  const cols=CONFIG.COLS, rows=CONFIG.ROWS; const cellW=w/cols, cellH=h/rows;
    // Normalized grid spacing (Option 4): compute an integer count of major intervals
    // per cell based on desired approximate major size (CONFIG.GRID_SIZE) then derive
    // minor spacing as 1/5 of each major interval. This guarantees uniform subdivision
    // and prevents gaps from skipped overlapping minor/major lines regardless of exact
    // cell pixel dimensions.
    const desiredMajor = CONFIG.GRID_SIZE;
    // Determine how many major intervals fit; ensure at least 1
    const majorCountX = Math.max(1, Math.round(cellW / desiredMajor));
    const majorCountY = Math.max(1, Math.round(cellH / desiredMajor));
    const majorSpacingX = cellW / majorCountX;
    const majorSpacingY = cellH / majorCountY;
    const minorDivisions = 5; // 5 minors per major
    const minorSpacingX = majorSpacingX / minorDivisions;
    const minorSpacingY = majorSpacingY / minorDivisions;
    // Clip per cell and draw grid inside to keep alignment per cell
  ctx.lineWidth=1; ctx.strokeStyle='rgba(0,255,0,0.05)';
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const x0=c*cellW, y0=r*cellH;
        ctx.save(); ctx.beginPath(); ctx.rect(x0,y0,cellW,cellH); ctx.clip();
        // Minor grid lines (internal only)
  ctx.strokeStyle=hexToRgba(CONFIG.GRID_COLOR_MINOR,0.12); ctx.lineWidth=1;
        for(let M=0; M<majorCountX; M++){
          for(let k=1;k<minorDivisions;k++){
            const x = x0 + M*majorSpacingX + k*minorSpacingX;
            if(x >= x0 + cellW - 0.5) continue; // skip right boundary
            ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y0+cellH); ctx.stroke();
          }
        }
        for(let M=0; M<majorCountY; M++){
          for(let k=1;k<minorDivisions;k++){
            const y = y0 + M*majorSpacingY + k*minorSpacingY;
            if(y >= y0 + cellH - 0.5) continue; // skip bottom boundary
            ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+cellW,y); ctx.stroke();
          }
        }
        // Major grid lines (internal only, skip outer boundaries to avoid double border weight)
  ctx.strokeStyle=hexToRgba(CONFIG.GRID_COLOR_MAJOR,0.12); ctx.lineWidth=1.0;
        for(let i=1;i<majorCountX;i++){
          const x = x0 + i*majorSpacingX;
          if(x >= x0 + cellW - 0.5) continue;
          ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y0+cellH); ctx.stroke();
        }
        for(let j=1;j<majorCountY;j++){
          const y = y0 + j*majorSpacingY;
          if(y >= y0 + cellH - 0.5) continue;
          ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+cellW,y); ctx.stroke();
        }
        ctx.restore();
    // Radial gradient glow (subtle)
    // Faster falloff radial gradient for subtle local emphasis
  const grad = ctx.createRadialGradient(x0+cellW*0.55, y0+cellH*0.5, 0, x0+cellW*0.55, y0+cellH*0.5, Math.max(cellW,cellH)*0.45);
  grad.addColorStop(0.0,'rgba(0,255,106,0.055)');
  grad.addColorStop(0.45,'rgba(0,255,106,0.015)');
  grad.addColorStop(1.0,'rgba(0,255,106,0)');
    ctx.fillStyle=grad; ctx.fillRect(x0,y0,cellW,cellH);
    // Cell border
  ctx.strokeStyle=hexToRgba(CONFIG.GRID_COLOR_PANEL,0.24); ctx.lineWidth=0.75; ctx.strokeRect(x0+0.35,y0+0.35,cellW-0.7,cellH-0.7);
      }
    }
  // Removed debug overlays to reduce overdraw and improve clarity
  }
  drawStaticGrid();
  currentDrawGrid = drawStaticGrid;
  gridCanvasRef = gridCanvas; glCanvasRef=glCanvas; overlayLayerRef=overlayLayer;
  if(!resizeHandlerAttached){
    window.addEventListener('resize', ()=>{ if(currentDrawGrid) currentDrawGrid(); if(overlays.length) positionOverlays(); if(batch) batch.resize(); });
    resizeHandlerAttached=true;
  }
  batch = new MultiECGBatchGL(glCanvas, {
    rows:CONFIG.ROWS,
    cols:CONFIG.COLS,
  overlapPercent:CONFIG.OVERLAP_PERCENT,
  trailLifePercent:CONFIG.TRAIL_LIFE_PERCENT,
  lineWidth:4.0,
  glow:false,
    colorCore:[0,1,0,0.9]
  });
  batchAnimator = new BatchAnimator(batch);
  batchAnimator.start();
  positionOverlays();
  // Apply current overlay text styling
  document.documentElement.style.setProperty('--overlay-text-size', CONFIG.OVERLAY_TEXT_SIZE + 'px');
  document.documentElement.style.setProperty('--overlay-text-color', CONFIG.OVERLAY_TEXT_COLOR);
  // Initialize text shadow variable
  // Text glow removed
  // Wire trail slider if present
  // (trail length UI removed; value fixed via CONFIG)
  // HUD
  let frames=0,last=performance.now(),smoothed=null;
  let lastOverlayUpdate = 0;
  function hud(ts){
    frames++;
    // Update FPS once per second
    if(ts-last>1000){
      const fps=frames*1000/(ts-last);
      frames=0; last=ts;
      smoothed=smoothed? smoothed*0.7+fps*0.3: fps;
      fpsEl.textContent = `FPS: ${smoothed.toFixed(0)}`;
    }
    // Throttle overlay DOM writes to ~16Hz (reduces layout / potential jank)
  if(batch && ts - lastOverlayUpdate > 60){
      lastOverlayUpdate = ts;
      totalCounter.textContent = `Total Beats: ${batch.totalBeats().toLocaleString()}`;
      for(let i=0;i<batch.traces.length && i<overlays.length;i++){
        const t = batch.traces[i];
        const el = overlays[i];
        // Cache elements once (store references) to avoid querySelector each update
        if(!el._bpmEl){ el._bpmEl = el.querySelector('.bpm'); el._beatsEl = el.querySelector('.beats'); }
        if(el._bpmEl) el._bpmEl.textContent = 'BPM: ' + Math.round(t.heartRate);
        if(el._beatsEl) el._beatsEl.textContent = 'Beat Count: ' + t.beatCount;
      }
    }
    requestAnimationFrame(hud);
  }
  requestAnimationFrame(hud);
  // Initialize overlay after batch constructed
  initOverlayControls({
    batch: batch,
    single: false,
    redrawGrid: (size)=>{ CONFIG.GRID_SIZE = size; if(currentDrawGrid) currentDrawGrid(); },
    toggleGrid: (show)=>{ if(gridCanvasRef) gridCanvasRef.style.display = show ? 'block':'none'; },
  setGridColorPanel: (col)=>{ CONFIG.GRID_COLOR_PANEL = col; if(currentDrawGrid) currentDrawGrid(); },
  setGridColorMajor: (col)=>{ CONFIG.GRID_COLOR_MAJOR = col; if(currentDrawGrid) currentDrawGrid(); },
  setGridColorMinor: (col)=>{ CONFIG.GRID_COLOR_MINOR = col; if(currentDrawGrid) currentDrawGrid(); },
  updateText: ({size, color, totalSize})=>{
      if(size){ CONFIG.OVERLAY_TEXT_SIZE = size; document.documentElement.style.setProperty('--overlay-text-size', size + 'px'); }
      if(color){
        CONFIG.OVERLAY_TEXT_COLOR = color; document.documentElement.style.setProperty('--overlay-text-color', color);
        const tc=document.getElementById('data-counter'); if(tc) tc.style.color = color;
      }
      if(totalSize){ const el=document.getElementById('data-counter'); if(el){ el.style.fontSize = totalSize + 'px'; }}
    }
  });
}

ensureLoaded({ sampleResolution: CONFIG.SAMPLE_RESOLUTION }).then(()=>{
  totalCounter.textContent = 'Total Beats: 0'; totalCounter.style.color = CONFIG.OVERLAY_TEXT_COLOR;
  buildBatch();
});

function hexToRgba(hex, a){ let h=hex.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`; }
// Removed text glow helpers
