// Configuration overlay + hotkeys (Alt+P FPS, Alt+C panel)

const STATE = {
  overlayEl: null,
  open: false,
  fpsEnabled: false,
  fpsEl: null,
  lastFpsSample: performance.now(),
  frames: 0,
  smoothFps: null,
  boundLoop: null,
  target: null,
  initialized: false
};

export function initOverlayControls(context){
  // Always update target (batch may have been rebuilt)
  STATE.target = context; // expects { batch, single: boolean }
  if(!STATE.initialized){
    ensureOverlayElement();
    document.addEventListener('keydown', onKey, { passive:false });
    startFpsLoop();
    STATE.initialized = true;
  }
  // Always (re)run setup to bind inputs after hot-reload / rebuild
  setupConfigForm();
}

function onKey(e){
  if(!e.altKey) return;
  if(e.code === 'KeyP'){ e.preventDefault(); toggleFps(); }
  if(e.code === 'KeyC'){ e.preventDefault(); toggleOverlay(); }
}

function ensureOverlayElement(){
  if(STATE.overlayEl) return;
  const el = document.createElement('div');
  el.id = 'ecg-config-overlay';
  el.innerHTML = overlayHTML();
  document.body.appendChild(el);
  STATE.overlayEl = el;
  const closeBtn = el.querySelector('[data-close]');
  closeBtn.addEventListener('click', ()=> toggleOverlay(false));
  el.style.display = 'none';
}

function overlayHTML(){
  return `
  <div class="ecg-config-header">
    <h3>ECG Configuration</h3>
    <div class="buttons"><button data-close title="Close (Alt+C)">✕</button></div>
  </div>
  <div class="ecg-config-scroll">
    <form id="ecg-config-form" autocomplete="off">
      <fieldset><legend>Grid</legend>
        <label>Grid Size <input type="range" name="gridSize" min="20" max="160" step="2" value="50" data-val /></label>
    <label>Panel Grid Color <input type="color" name="gridColorPanel" value="#00ff6a" /></label>
    <label>Major Grid Color <input type="color" name="gridColorMajor" value="#00ff6a" /></label>
    <label>Minor Grid Color <input type="color" name="gridColorMinor" value="#00ff6a" /></label>
        <label><input type="checkbox" name="showGrid" checked /> Show Grid</label>
      </fieldset>
      <fieldset><legend>Trace</legend>
        <label>Core Width <input type="range" name="coreWidth" min="0.5" max="16" step="0.1" value="4" data-val /></label>
  <label>Head Dot Size <input type="range" name="headSize" min="2" max="28" step="0.5" value="10" data-val /></label>
  <label>Edge Feather <input type="range" name="edgeFeather" min="0" max="0.95" step="0.01" value="0.22" data-val /></label>
  <label>Edge Fade (Longitudinal) <input type="range" name="edgeFade" min="0" max="0.25" step="0.005" value="0.06" data-val /></label>
  <label>Trail % Beat <input type="range" name="trail" min="5" max="200" step="1" value="65" data-val /></label>
  <label>Overlap % <input type="range" name="overlap" min="0" max="80" step="1" value="15" data-val /></label>
  <label>Core Color <input type="color" name="coreColor" value="#00ff6a" /></label>
      </fieldset>
      <fieldset><legend>Text</legend>
        <label>Overlay Text Size <input type="range" name="textSize" min="8" max="28" step="1" value="18" data-val /></label>
        <label>Total Beats Size <input type="range" name="totalSize" min="10" max="60" step="1" value="22" data-val /></label>
        <label>Text Glow <input type="range" name="textGlow" min="0" max="24" step="0.5" value="8" data-val /></label>
        <label>Text Color <input type="color" name="textColor" value="#00ff6a" /></label>
      </fieldset>
      <div class="foot">Hotkeys: <kbd>Alt+C</kbd> config, <kbd>Alt+P</kbd> FPS</div>
    </form>
  </div>`;
}

function toggleOverlay(force){
  STATE.open = (typeof force === 'boolean') ? force : !STATE.open;
  STATE.overlayEl.style.display = STATE.open ? 'flex' : 'none';
}

function toggleFps(){
  STATE.fpsEnabled = !STATE.fpsEnabled;
  if(STATE.fpsEl){ STATE.fpsEl.style.display = STATE.fpsEnabled ? 'block' : 'none'; }
}

function startFpsLoop(){
  if(STATE.boundLoop) return;
  STATE.fpsEl = document.getElementById('fps-counter') || createFloatingFps();
  STATE.fpsEl.style.display = 'none'; // hidden by default
  STATE.boundLoop = (ts)=>{
    STATE.frames++;
    if(ts - STATE.lastFpsSample > 1000){
      const fps = STATE.frames * 1000 / (ts - STATE.lastFpsSample);
      STATE.frames = 0; STATE.lastFpsSample = ts;
      STATE.smoothFps = STATE.smoothFps ? STATE.smoothFps*0.7 + fps*0.3 : fps;
      if(STATE.fpsEnabled) STATE.fpsEl.textContent = 'FPS: ' + STATE.smoothFps.toFixed(0);
    }
    requestAnimationFrame(STATE.boundLoop);
  };
  requestAnimationFrame(STATE.boundLoop);
}

function createFloatingFps(){
  const el = document.createElement('div');
  el.id='fps-counter';
  el.textContent='FPS: --';
  el.style.position='fixed';
  el.style.top='8px';
  el.style.right='12px';
  el.style.zIndex='1000';
  el.style.font='12px Roboto, monospace';
  el.style.padding='4px 8px';
  el.style.background='rgba(0,0,0,0.4)';
  el.style.border='1px solid rgba(0,255,106,0.35)';
  el.style.borderRadius='6px';
  el.style.color='var(--accent)';
  document.body.appendChild(el);
  return el;
}

function setupConfigForm(){
  const form = STATE.overlayEl.querySelector('#ecg-config-form');
  const isSingle = STATE.target.single === true;
  if(!form) return;
  // Range inputs: add value span only once & bind once
  form.querySelectorAll('input[type=range][data-val]').forEach(inp=>{
    if(!inp.parentElement.querySelector('.val')){
      const span = document.createElement('span');
      span.className='val';
      span.textContent=inp.value;
      inp.parentElement.appendChild(span);
    }
    if(!inp.dataset.bound){
      const valSpan = inp.parentElement.querySelector('.val');
      inp.addEventListener('input', ()=>{ valSpan.textContent=inp.value; applyChange(inp.name, inp.value, isSingle); });
      inp.dataset.bound = '1';
    }
  });
  // Color pickers
  form.querySelectorAll('input[type=color]').forEach(inp=>{
    if(!inp.dataset.bound){
      inp.addEventListener('input', ()=> applyChange(inp.name, inp.value, isSingle));
      inp.dataset.bound='1';
    }
  });
  const showGrid = form.querySelector('input[name=showGrid]');
  if(showGrid && !showGrid.dataset.bound){
    showGrid.addEventListener('change', ()=> applyChange('showGrid', showGrid.checked, isSingle));
    showGrid.dataset.bound='1';
  }
}

function applyChange(name, value, isSingle){
  let batch = STATE.target.batch;
  if(typeof batch === 'function') batch = batch();
  if(!batch) return;
  switch(name){
    case 'overlap': batch.cfg.overlapPercent = +value; break;
    case 'trail': batch.cfg.trailLifePercent = +value; break;
    case 'coreWidth': batch.cfg.lineWidth = +value; break;
  case 'headSize': batch.cfg.headDotRadius = +value; break;
  case 'edgeFeather': batch.cfg.edgeFeather = +value; break;
  case 'edgeFade': batch.cfg.edgeSpatialFade = +value; break;
    case 'coreColor':
      batch.cfg.colorCore = hexToArray(value, 0.95); batch._colorCore = new Float32Array(batch.cfg.colorCore); break;
    case 'gridSize':
      if(STATE.target.redrawGrid) STATE.target.redrawGrid(+value);
      break;
    case 'gridColor':
        if(STATE.target.setGridColorMajor) STATE.target.setGridColorMajor(value);
        if(STATE.target.setGridColorMinor) STATE.target.setGridColorMinor(value);
      break;
      case 'gridColorPanel':
        if(STATE.target.setGridColorPanel) STATE.target.setGridColorPanel(value);
        break;
      case 'gridColorMajor':
        if(STATE.target.setGridColorMajor) STATE.target.setGridColorMajor(value);
        break;
      case 'gridColorMinor':
        if(STATE.target.setGridColorMinor) STATE.target.setGridColorMinor(value);
        break;
    case 'showGrid':
      if(STATE.target.toggleGrid) STATE.target.toggleGrid(!!value);
      break;
    case 'textSize':
      if(STATE.target.updateText) STATE.target.updateText({ size:+value });
      break;
    case 'textGlow':
      if(STATE.target.updateText) STATE.target.updateText({ glow:+value });
      break;
    case 'textColor':
      if(STATE.target.updateText) STATE.target.updateText({ color:value });
      break;
    case 'totalSize':
      if(STATE.target.updateText) STATE.target.updateText({ totalSize:+value });
      break;
  // rows / cols removed from UI; dynamic resize intentionally not exposed
  break;
  }
}

// Local copy to avoid circular imports
function hexToArray(hex, a){ let h=hex.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255, a]; }

// CSS injection (update-safe: always replace existing style block so HMR / reload applies)
const __CFG_STYLE_ID = 'ecg-config-style';
const NEW_OVERLAY_CSS = `/* ECG Config Overlay (update-safe) */\n#ecg-config-overlay{position:fixed;top:0;left:0;display:flex;align-items:stretch;justify-content:flex-start;pointer-events:none;z-index:1500;font:16px Roboto,system-ui,sans-serif;line-height:1.25;}\n#ecg-config-overlay .ecg-config-scroll{width:360px;max-width:92vw;height:100vh;overflow:auto;background:#121212f2;border-right:1px solid rgba(0,255,106,0.4);box-shadow:8px 0 28px -6px rgba(0,0,0,0.7);padding:22px 20px 92px;pointer-events:auto;}\n#ecg-config-overlay h3{margin:0;font-weight:600;letter-spacing:.85px;color:var(--accent);font-size:21px;text-shadow:0 0 10px rgba(0,255,106,.65);}\n#ecg-config-overlay fieldset{border:1px solid rgba(0,255,106,0.28);border-radius:12px;margin:16px 0 26px;padding:14px 16px 16px;display:flex;flex-direction:column;gap:14px;}\n#ecg-config-overlay legend{padding:0 9px;font-size:14px;letter-spacing:.75px;color:var(--accent-soft);}\n#ecg-config-overlay label{display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--text-dim);}\n#ecg-config-overlay input[type=range]{width:100%;}\n#ecg-config-overlay .val{font-family:monospace;color:var(--accent);font-size:13px;}\n#ecg-config-overlay .ecg-config-header{position:fixed;top:0;left:0;width:360px;display:flex;align-items:center;justify-content:space-between;padding:16px 20px 14px;background:linear-gradient(180deg,#141414,#121212cc);box-shadow:0 4px 12px -6px rgba(0,0,0,0.55);pointer-events:auto;}\n#ecg-config-overlay .buttons button{background:#161616;border:1px solid rgba(0,255,106,0.6);color:var(--accent);cursor:pointer;font-size:15px;padding:7px 12px;border-radius:8px;line-height:1;transition:background .15s;}\n#ecg-config-overlay .buttons button:hover{background:#242424;}\n#ecg-config-overlay form{margin-top:70px;}\n#ecg-config-overlay .foot{font-size:13px;color:var(--text-dim);margin-top:10px;opacity:.95;}\n#ecg-config-overlay kbd{background:#222;border:1px solid rgba(255,255,255,0.22);border-radius:5px;padding:3px 6px;font-size:12px;margin:0 2px;box-shadow:0 0 0 1px #000;}\n@media (max-width: 680px){#ecg-config-overlay .ecg-config-scroll{width:94vw;}}`;
let styleEl = document.getElementById(__CFG_STYLE_ID);
if(styleEl){
  if(styleEl.textContent !== NEW_OVERLAY_CSS) styleEl.textContent = NEW_OVERLAY_CSS;
} else {
  styleEl = document.createElement('style');
  styleEl.id = __CFG_STYLE_ID;
  styleEl.textContent = NEW_OVERLAY_CSS;
  document.head.appendChild(styleEl);
}
