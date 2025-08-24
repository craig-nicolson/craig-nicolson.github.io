// Batched WebGL2 multi-trace ECG renderer (single context, shared geometry, instanced runs).
// Grid drawn once on 2D canvas beneath; WebGL layer draws animated core line + minimal head dot (no glow / highlight).

import { getSharedSampling, isLoaded } from './ecgCore.js';

const MAX_TRACES = 300; // adjust if more cells than rows*cols
const MAX_RUNS_PER_TRACE = 3;
const MAX_INSTANCES = MAX_TRACES * MAX_RUNS_PER_TRACE; // 900

// Vertex shader: expand path centerline into strip, place into per-trace cell.
// Includes curvature attribute, micro-jitter, head pulse size modulation.
const VS = `#version 300 es
layout(location=0) in vec2 a_position;
layout(location=1) in float a_t;
layout(location=2) in float a_side;
layout(location=3) in vec2 a_normal;
layout(location=4) in float a_curv; // curvature magnitude 0..1
uniform float u_time;
uniform int u_t_cols;
uniform int u_t_rows;
uniform float u_t_canvasW;
uniform float u_t_canvasH;
uniform float u_t_cellMargin; // pixels margin inside each cell
uniform float u_t_pathW;
uniform float u_t_pathH;
uniform float u_edgeFade;
uniform float u_beatInterval[${MAX_TRACES}];
uniform int u_runTraceIndex[${MAX_INSTANCES}];
uniform float u_runStart[${MAX_INSTANCES}];
// Normalized trail fractions behind head (path-relative, independent of beat duration)
uniform float u_trailVisibleFrac; // portion of path behind head at full alpha
uniform float u_trailFadeFrac;    // following portion that eases to zero
uniform float u_lineHalfWidth; // varies per pass
uniform bool u_isHeadPass; // minimal head dot pass flag
uniform bool u_t_flipY;
uniform float u_noiseAmp; // micro jitter amplitude (pixels)
// (debug point uniform removed)
// (debug uniforms removed)
out float v_alpha;
out float v_side;
out float v_t;
out vec2 v_cellUV; // for grid pass (0..1 in cell)
flat out int v_traceIndex;
flat out float v_head; // head position fraction (0..1)
out float v_curv; // curvature to fragment

// Time/age based alpha identical conceptually to single-trace renderer so end segment actually fades.
// u_trailVisibleFrac / u_trailFadeFrac are interpreted as fractions of beatDur (time), not path length.
float temporalAlpha(float tNorm, float start, float beatDur){
  // Point time along current run
  float pointTime = start + tNorm * beatDur;
  float age = u_time - pointTime;
  if(age < 0.0) return 0.0; // not yet reached
  float visTime = u_trailVisibleFrac * beatDur;
  float fadeTime = u_trailFadeFrac * beatDur;
  if(age <= visTime) return 1.0;
  float fadeAge = age - visTime;
  if(fadeAge >= fadeTime) return 0.0;
  float f = clamp(fadeAge / fadeTime, 0.0, 1.0);
  float eased = 1.0 - (1.0 - f)*(1.0 - f); // easeOutQuad
  return 1.0 - eased;
}

void main(){
  int inst = gl_InstanceID;
  int traceIndex = u_runTraceIndex[inst];
  v_traceIndex = traceIndex;
  float beatDur = u_beatInterval[traceIndex];
  float start = u_runStart[inst];
  float a = temporalAlpha(a_t, start, beatDur);
  // edge fade along path
  float e = u_edgeFade;
  if(e>0.0){
    if(a_t < e){ float k=a_t/e; a*=k*k; }
    else if(a_t > 1.0 - e){ float k=(1.0 - a_t)/e; a*=k*k; }
  }
  // Layer attenuation & debug force-alpha removed for simplicity
  v_alpha = a;
  v_side = a_side;
  v_t = a_t;
  // Head position still uses beat progress (fraction of path) so visual head moves uniformly; alpha now time-age based per point.
  float headNow = clamp((u_time - start)/beatDur, 0.0, 1.0);
  v_head = headNow;
  v_curv = a_curv;
  // Per trace cell placement
  int col = traceIndex % u_t_cols;
  int row = traceIndex / u_t_cols;
  float cellW = u_t_canvasW / float(u_t_cols);
  float cellH = u_t_canvasH / float(u_t_rows);
  float availW = cellW - 2.0*u_t_cellMargin;
  float availH = cellH - 2.0*u_t_cellMargin;
  float scale = min(availW / u_t_pathW, availH / u_t_pathH);
  vec2 base = a_position;
  // Expand thickness
  vec2 pos = base;
  if(!u_isHeadPass){
    pos += a_normal * a_side * (u_lineHalfWidth / scale);
  } else {
    // Keep only one side vertex near current head position to emit a single point
    if(a_side > 0.0 || abs(a_t - headNow) > (1.0/2048.0)){
      gl_Position = vec4(-2.0,-2.0,0.0,1.0); return;
    }
  }
  // Translate so path origin at top-left of its box (already relative)
  // Scale
  pos *= scale;
  if(!u_isHeadPass && u_noiseAmp > 0.0){
    float n = fract(sin(dot(a_position.xy, vec2(12.9898,78.233)) + u_time*0.00075) * 43758.5453);
    pos.y += (n - 0.5) * 2.0 * u_noiseAmp;
  }
  // Position in cell
  float x0 = float(col)*cellW + (cellW - u_t_pathW*scale)/2.0;
  float y0 = float(row)*cellH + (cellH - u_t_pathH*scale)/2.0;
  pos += vec2(x0, y0);
  // Compute UV inside cell
  v_cellUV = (pos - vec2(float(col)*cellW, float(row)*cellH))/vec2(cellW, cellH);
  // Convert to clip
  float clipX = (pos.x / u_t_canvasW)*2.0 - 1.0;
  float py = u_t_flipY ? (u_t_canvasH - pos.y) : pos.y;
  float clipY = (py / u_t_canvasH)*2.0 - 1.0;
  gl_Position = vec4(clipX, clipY, 0.0, 1.0);
  if(u_isHeadPass){
    float pulse = (v_head < 0.12) ? (1.0 - (v_head/0.12)) : 0.0;
    gl_PointSize = u_lineHalfWidth * 6.0 * (1.0 + 0.6*pulse);
  }
  // point size debug removed
}`;

// Fragment shader: phosphor core+halo, curvature brightness, head pulse brightness.
const FS_TRACE = `#version 300 es
precision highp float;
in float v_alpha;
in float v_side;
in vec2 v_cellUV;
in float v_t;
flat in int v_traceIndex;
flat in float v_head;
in float v_curv;
uniform bool u_isHeadPass;
uniform vec4 u_colCore;
uniform float u_time;
uniform float u_edgeFeather;
out vec4 o_color;
const float CORE_RADIUS = 0.25;
const float HALO_EXTENT = 0.35;
const float CORE_BOOST = 0.6;
const float HALO_BOOST = 0.22;
const float CURV_STRENGTH = 0.6;
void main(){
  float alpha = v_alpha;
  if(alpha <= 0.0) discard;
  vec4 base = u_colCore;
  if(u_isHeadPass){
    vec2 pc = gl_PointCoord*2.0 - 1.0;
    float r = length(pc);
    if(r>1.0) discard;
    float pulse = (v_head < 0.12) ? (1.0 - (v_head/0.12)) : 0.0;
    float fall = 1.0 - smoothstep(0.0,1.0,r);
    float lum = 1.0 + 0.5*pulse*(1.0 - r);
    alpha *= fall;
    o_color = vec4(base.rgb * lum, base.a * alpha);
    return;
  }
  float d = abs(v_side);
  float feather = clamp(u_edgeFeather, 0.0, 0.95);
  if(feather > 0.00005){
    float dist = d;
    float fw = fwidth(dist);
    float edgeStart = 1.0 - feather;
    float edge = smoothstep(edgeStart - fw, 1.0 + fw, dist);
    alpha *= (1.0 - edge);
  }
  float core = smoothstep(CORE_RADIUS, 0.0, d);
  float halo = 1.0 - smoothstep(1.0, 1.0 + HALO_EXTENT, d);
  float lum = 1.0 + CORE_BOOST * core + HALO_BOOST * halo;
  float curvBoost = 1.0 + CURV_STRENGTH * smoothstep(0.15, 0.9, clamp(v_curv,0.0,1.0));
  lum *= curvBoost;
  vec3 color = base.rgb * min(lum, 2.2);
  o_color = vec4(color, base.a * alpha);
}`;

// Removed grid shaders; grid now drawn once on a 2D canvas underneath for stability & zero per-frame cost.

function createShader(gl,type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function createProgram(gl,v,f){ const p=gl.createProgram(); gl.attachShader(p,createShader(gl,35633,v)); gl.attachShader(p,createShader(gl,35632,f)); gl.linkProgram(p); if(!gl.getProgramParameter(p,35714)) throw new Error(gl.getProgramInfoLog(p)); return p; }

export class MultiECGBatchGL {
  constructor(canvas, config){
  this.canvas=canvas; this.gl=canvas.getContext('webgl2',{antialias:true,premultipliedAlpha:false});
    if(!this.gl) throw new Error('WebGL2 required');
    this.cfg = Object.assign({
      rows:8, cols:10, heartRateMean:85, heartRateStd:30, heartRateMin:48, heartRateMax:185,
      overlapPercent:15, trailLifePercent:65, maxRunsPerTrace:MAX_RUNS_PER_TRACE,
  lineWidth:4.0,
  headDotRadius:10.0,
  colorCore:[0,1,0,0.95],
  edgeSpatialFade:0.06,
  edgeFeather:0.22,
  // Heart rate drift configuration (organic micro-variation)
  heartRateDrift:true,
  heartRateDriftRange:2,           // +/- BPM around each trace's initial baseline
  heartRateDriftMinMs:6000,        // min duration of a drift leg
  heartRateDriftMaxMs:14000        // max duration of a drift leg
    }, config||{});
    // Wrap colors once (avoid per-frame Float32Array allocations)
    this._colorCore = new Float32Array(this.cfg.colorCore);
  this.dpr=window.devicePixelRatio||1; this.traces=[]; this.runs=[]; this.lastSpawnTimes=new Float64Array(MAX_TRACES);
  this._buildPrograms(); this._cacheUniforms(); this._buildGeometry(); this._initTraces();
    // Preallocate uniform backing arrays (reused every frame) to avoid GC churn / periodic hiccups
    this._u_runStart = new Float32Array(MAX_INSTANCES);
    this._u_runTraceIndex = new Int32Array(MAX_INSTANCES);
    this._u_beatIntervals = new Float32Array(MAX_TRACES);
  }
  _randn(){ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
  _initTraces(){
    const c=this.cfg; const n=c.rows*c.cols;
    for(let i=0;i<n;i++){
      const z=this._randn();
      let hr=c.heartRateMean+z*c.heartRateStd; hr=Math.min(c.heartRateMax, Math.max(c.heartRateMin, hr));
      // Store baseline & drift state fields
      this.traces.push({
        initialBaseHeartRate:hr, // immutable original
        baseHeartRate:hr,
        heartRate:hr,
        beatInterval:60000/hr,
        beatCount:0,
        driftFrom:hr,
        driftTo:hr,
        driftStart:0,
        driftDuration:1
      });
    }
  }
  _scheduleNextDrift(tr, time){
    const c=this.cfg;
    const range=c.heartRateDriftRange||0;
    const minHR=tr.baseHeartRate - range;
    const maxHR=tr.baseHeartRate + range;
    // Pick a new target different enough from current
    let target;
    let attempts=0;
    do{ target = minHR + Math.random()*(maxHR-minHR); attempts++; }while(Math.abs(target - tr.heartRate) < 0.15 && attempts<8);
    tr.driftFrom = tr.heartRate;
    tr.driftTo = target;
    tr.driftStart = time;
    const span = c.heartRateDriftMinMs + Math.random()*(c.heartRateDriftMaxMs - c.heartRateDriftMinMs);
    tr.driftDuration = Math.max(1000, span);
  }
  _updateHeartRateDrift(time){
    const c=this.cfg; if(!c.heartRateDrift) return;
    for(const tr of this.traces){
      if(!tr.driftStart){ // initial schedule
        this._scheduleNextDrift(tr, time);
      }
      const t = (time - tr.driftStart)/tr.driftDuration;
      if(t >= 1){
        tr.heartRate = tr.driftTo;
        tr.beatInterval = 60000 / tr.heartRate;
        this._scheduleNextDrift(tr, time);
      } else if(t >= 0){
        // Smooth (ease in/out) interpolation
        const tt = t*t*(3 - 2*t); // smoothstep
        tr.heartRate = tr.driftFrom + (tr.driftTo - tr.driftFrom)*tt;
        tr.beatInterval = 60000 / tr.heartRate;
      }
    }
  }
  _initPhases(){
    // Assign a random phase progress (0..beatInterval) per trace so beats desynchronize.
    // Retain phaseShift for legacy run spawning separation if needed, but beat counting now uses phaseProgress.
    for(const t of this.traces){
      t.phaseShift = Math.random() * t.beatInterval; // kept for historical separation, not used for counting now
      t.phaseProgress = t.phaseShift; // start at random progress within current interval
      t._lastBeatEvalTime = 0; // will be set on first step
    }
  }
  ensureInitialRuns(time){
    // Guarantee at least one active run per trace so something is visible immediately.
    if(this._seeded) return;
    for(let i=0;i<this.traces.length;i++){
      this.runs.push({ traceIndex:i, startTime:time, counted:false });
    }
    this._seeded = true;
  }
  resize(){ let w=this.canvas.clientWidth|| (this.canvas.parentElement && this.canvas.parentElement.clientWidth) || window.innerWidth; let h=this.canvas.clientHeight|| (this.canvas.parentElement && this.canvas.parentElement.clientHeight) || (window.innerHeight - 80); if(w===0||h===0){ w=window.innerWidth; h=window.innerHeight-80; } if(this.canvas.width!==w*this.dpr||this.canvas.height!==h*this.dpr){ this.canvas.width=w*this.dpr; this.canvas.height=h*this.dpr; this.canvas.style.width=w+'px'; this.canvas.style.height=h+'px'; this.canvas.style.display='block'; } this.w=w; this.h=h; }
  _buildPrograms(){ const g=this.gl; this.progTrace=createProgram(g,VS,FS_TRACE); }
  _cacheUniforms(){
    const g=this.gl; const p=this.progTrace;
    const names = [
      'u_time','u_t_cols','u_t_rows','u_t_canvasW','u_t_canvasH','u_t_cellMargin','u_t_pathW','u_t_pathH','u_edgeFade',
    'u_trailVisibleFrac','u_trailFadeFrac','u_t_flipY','u_edgeFeather','u_noiseAmp',
  'u_beatInterval','u_runStart','u_runTraceIndex','u_colCore','u_isHeadPass','u_lineHalfWidth'
    ];
    this._uloc={};
    for(const n of names){ this._uloc[n]=g.getUniformLocation(p,n); }
  }
  // (fullscreen debug program and helpers removed)
  _buildGeometry(){
    if(!isLoaded()) return;
    const { sampled, viewBox } = getSharedSampling();
    this.pathBox = viewBox;
    const N = sampled.length;
    const vertsPerPoint = 2; // two sided (left/right) per center point
  const floatsPerVert = 2 + 1 + 1 + 2 + 1; // add curvature
    const V = N * vertsPerPoint;
    const data = new Float32Array(V * floatsPerVert);
    let o = 0;
    for(let i=0;i<N;i++){
      const s = sampled[i];
      const prev = sampled[i?i-1:i];
      const next = sampled[i < N-1 ? i+1 : i];
      // Direction vectors for curvature
      let dpx = s.x - prev.x, dpy = s.y - prev.y; let dpl = Math.hypot(dpx,dpy)||1.0; dpx/=dpl; dpy/=dpl;
      let dnx = next.x - s.x, dny = next.y - s.y; let dnl = Math.hypot(dnx,dny)||1.0; dnx/=dnl; dny/=dnl;
      let curv = Math.hypot(dnx - dpx, dny - dpy); // 0..2
      curv = Math.min(1.0, curv * 0.5);
      // Central diff normal
      let dx = next.x - prev.x, dy = next.y - prev.y; let len = Math.hypot(dx,dy)||1.0; dx/=len; dy/=len;
      const nx = -dy, ny = dx;
      for(let side=-1; side<=1; side+=2){
        data[o++] = s.x;
        data[o++] = s.y;
        data[o++] = s.norm;
        data[o++] = side;
        data[o++] = nx;
        data[o++] = ny;
        data[o++] = curv;
      }
    }
    // Indices: two triangles per segment (quad) using the 2-per-point layout.
    const segs = N - 1;
    const idxCount = segs * 6;
  const useUint32 = false; // force 16-bit indices for debugging reliability
  const indices = new Uint16Array(idxCount);
    let io = 0;
    for(let i=0;i<segs;i++){
      const i0 = 2*i;
      const i1 = 2*i + 1;
      const j0 = 2*(i+1);
      const j1 = 2*(i+1) + 1;
      // Triangle 1
      indices[io++] = i0; indices[io++] = i1; indices[io++] = j0;
      // Triangle 2
      indices[io++] = i1; indices[io++] = j1; indices[io++] = j0;
    }
    this.vertCount = V;
  this.indexType = this.gl.UNSIGNED_SHORT;
    this.indexCount = idxCount;
    const g = this.gl;
    this.vaoTrace = g.createVertexArray();
    g.bindVertexArray(this.vaoTrace);
    this.vboTrace = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, this.vboTrace);
    g.bufferData(g.ARRAY_BUFFER, data, g.STATIC_DRAW);
    const stride = floatsPerVert * 4;
    let off = 0;
    g.enableVertexAttribArray(0); g.vertexAttribPointer(0,2,g.FLOAT,false,stride,off); off+=8;
    g.enableVertexAttribArray(1); g.vertexAttribPointer(1,1,g.FLOAT,false,stride,off); off+=4;
    g.enableVertexAttribArray(2); g.vertexAttribPointer(2,1,g.FLOAT,false,stride,off); off+=4;
  g.enableVertexAttribArray(3); g.vertexAttribPointer(3,2,g.FLOAT,false,stride,off); off+=8;
  g.enableVertexAttribArray(4); g.vertexAttribPointer(4,1,g.FLOAT,false,stride,off);
    // Index buffer
    this.ibo = g.createBuffer();
    g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, this.ibo);
    g.bufferData(g.ELEMENT_ARRAY_BUFFER, indices, g.STATIC_DRAW);
  g.bindVertexArray(null);
  }
  // (grid geometry stage removed; grid drawn on 2D canvas externally)
  _spawnRuns(time){ const c=this.cfg; const overlapMs = (c.overlapPercent/100); for(let i=0;i<this.traces.length;i++){ const t=this.traces[i]; const spawnInt = t.beatInterval * (1 - overlapMs); if(!this.lastSpawnTimes[i]) this.lastSpawnTimes[i]=time; if(time - this.lastSpawnTimes[i] >= spawnInt || !this._traceHasActive(i,time)){ this._addRun(i,time); this.lastSpawnTimes[i]=time; } } }
  _traceHasActive(traceIndex,time){ const c=this.cfg; for(const r of this.runs){ if(r.traceIndex===traceIndex){ const t=this.traces[traceIndex]; const life = t.beatInterval + this._trailDur(t) + this._trailFade(t); if(time - r.startTime < life) return true; } } return false; }
  _addRun(traceIndex,time){
    // Manual scan (avoid Array.filter allocation) and remove oldest if exceeding per-trace capacity
    let count=0, oldestIdx=-1, oldestTime=Infinity;
    for(let i=0;i<this.runs.length;i++){
      const r=this.runs[i];
      if(r.traceIndex===traceIndex){
        count++;
        if(r.startTime < oldestTime){ oldestTime=r.startTime; oldestIdx=i; }
      }
    }
    if(count>=this.cfg.maxRunsPerTrace && oldestIdx>=0){ this.runs.splice(oldestIdx,1); }
    this.runs.push({ traceIndex, startTime:time, counted:false });
  }
  _trailDur(trace){ const total=(this.cfg.trailLifePercent/100)*trace.beatInterval; return total*(350/650); }
  _trailFade(trace){ const total=(this.cfg.trailLifePercent/100)*trace.beatInterval; return total - this._trailDur(trace); }
  step(time){
    if(!isLoaded()) return;
    if(!this.vertCount) this._buildGeometry();
    this.resize();
  this.ensureInitialRuns(time);
  if(!this.startTime){ this.startTime = time; if(!this._phased){ this._initPhases(); this._phased=true; } }
  // Apply gentle BPM drift before spawning runs so new runs adopt updated beat intervals
  this._updateHeartRateDrift(time);
  this._spawnRuns(time);
    // Cull expired runs + count beats
    for(let i=this.runs.length-1;i>=0;i--){
      const r=this.runs[i];
      const tr=this.traces[r.traceIndex];
      const life = tr.beatInterval + this._trailDur(tr) + this._trailFade(tr);
      if(time - r.startTime > life) this.runs.splice(i,1);
    }
    // Drift-aware incremental beat counting.
    // We advance each trace's phaseProgress by frame delta; when exceeding current (drifting) beatInterval
    // we emit one or more beats and subtract intervals. This preserves beats already emitted even if
    // the beatInterval changes due to drift (unlike prior floor(elapsed/interval) approach which could miscount).
    for(const tr of this.traces){
      if(!tr._lastBeatEvalTime) tr._lastBeatEvalTime = time; // initialize
      let dt = time - tr._lastBeatEvalTime;
      if(dt < 0) dt = 0; // guard clock skew
      tr.phaseProgress += dt;
      // Emit beats while progress exceeds current dynamic interval.
      // If interval shrinks mid-progress, this naturally allows multiple beats emission in one frame.
      while(tr.phaseProgress >= tr.beatInterval){
        tr.phaseProgress -= tr.beatInterval;
        tr.beatCount++;
      }
      tr._lastBeatEvalTime = time;
    }
  const g = this.gl;
    g.viewport(0,0,this.canvas.width,this.canvas.height);
    g.disable(g.DEPTH_TEST);
    g.enable(g.BLEND);
    // Transparent clear so 2D grid canvas beneath remains visible.
    g.clearColor(0,0,0,0);
    g.clear(g.COLOR_BUFFER_BIT);
  const c = this.cfg;
  // (Removed magenta fullscreen debug triangle)
  const instances = Math.min(this.runs.length, MAX_INSTANCES);
  // Populate preallocated arrays (no new allocations per frame)
  for(let i=0;i<instances;i++){ this._u_runStart[i]=this.runs[i].startTime; this._u_runTraceIndex[i]=this.runs[i].traceIndex; }
  for(let i=instances;i<MAX_INSTANCES;i++){ this._u_runStart[i]=0; this._u_runTraceIndex[i]=0; }
  for(let i=0;i<this.traces.length;i++) this._u_beatIntervals[i]=this.traces[i].beatInterval;
  for(let i=this.traces.length;i<MAX_TRACES;i++) this._u_beatIntervals[i]=0;
    g.useProgram(this.progTrace);
    g.bindVertexArray(this.vaoTrace);
  const loc = (n)=>this._uloc[n];
  g.uniform1f(loc('u_time'), time);
  g.uniform1i(loc('u_t_cols'), c.cols); g.uniform1i(loc('u_t_rows'), c.rows);
  g.uniform1f(loc('u_t_canvasW'), this.canvas.width); g.uniform1f(loc('u_t_canvasH'), this.canvas.height);
  g.uniform1f(loc('u_t_cellMargin'), 4.0);
  g.uniform1f(loc('u_t_pathW'), this.pathBox.width); g.uniform1f(loc('u_t_pathH'), this.pathBox.height);
  g.uniform1f(loc('u_edgeFade'), c.edgeSpatialFade);
  // Supply normalized trail fractions (independent of beat duration variability)
  // Convert config trail percentage into two time fractions (visible + fade) similar to single trace (350/650 ratio)
  const trailLifeFracRaw = (this.cfg.trailLifePercent/100.0);
  const trailLifeFrac = Math.min(0.95, Math.max(0.05, trailLifeFracRaw));
  const visibleFrac = trailLifeFrac * (350.0/650.0);
  const fadeFrac = Math.max(0.0001, trailLifeFrac - visibleFrac);
    g.uniform1f(loc('u_trailVisibleFrac'), visibleFrac);
    g.uniform1f(loc('u_trailFadeFrac'), fadeFrac);
  // (debug trail fraction logging removed for production cleanliness)
  g.uniform1i(loc('u_t_flipY'), 1);
  g.uniform1f(loc('u_edgeFeather'), c.edgeFeather);
  g.uniform1f(loc('u_noiseAmp'), 0.35); // subtle micro jitter strength
  // (removed unused uniforms u_minHeadFrac / u_forceFullAlpha)
  // debug points disabled
  g.uniform1fv(loc('u_beatInterval'), this._u_beatIntervals);
  g.uniform1fv(loc('u_runStart'), this._u_runStart);
  g.uniform1iv(loc('u_runTraceIndex'), this._u_runTraceIndex);
  // Set colors (reuse wrapped Float32Arrays)
  g.uniform4fv(loc('u_colCore'), this._colorCore);
  g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
  g.uniform1i(loc('u_isHeadPass'), 0);
  g.uniform1f(loc('u_lineHalfWidth'), c.lineWidth * 0.5);
  g.drawElementsInstanced(g.TRIANGLES, this.indexCount, this.indexType, 0, instances);
  // Head pass (simple point) additive for slight emphasis
  g.blendFunc(g.SRC_ALPHA, g.ONE);
  g.uniform1i(loc('u_isHeadPass'), 1);
  g.uniform1f(loc('u_lineHalfWidth'), (c.headDotRadius || (c.lineWidth*1.4)) * 0.5);
  g.drawArraysInstanced(g.POINTS, 0, this.vertCount, instances);
  // (Optional) point cloud debug removed now that lines are expected visible
  g.bindVertexArray(null);
  const err = g.getError();
  if(err!==g.NO_ERROR){ console.warn('[MultiECGBatchGL] glError', err.toString(16)); }
  }
  totalBeats(){ return this.traces.reduce((a,t)=>a+t.beatCount,0); }
  dispose(){
    const g=this.gl; if(!g) return;
    try{
      if(this.vboTrace) g.deleteBuffer(this.vboTrace);
      if(this.ibo) g.deleteBuffer(this.ibo);
      if(this.vaoTrace) g.deleteVertexArray(this.vaoTrace);
      if(this.progTrace) g.deleteProgram(this.progTrace);
    }catch(e){ console.warn('dispose error', e); }
  }
}

export class BatchAnimator { constructor(batch){ this.batch=batch; this._running=false; this._loop=this._loop.bind(this);} start(){ if(this._running) return; this._running=true; requestAnimationFrame(this._loop);} stop(){ this._running=false;} _loop(ts){ if(!this._running) return; this.batch.step(ts); requestAnimationFrame(this._loop);} }
