(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&a(d)}).observe(document,{childList:!0,subtree:!0});function t(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(i){if(i.ep)return;i.ep=!0;const o=t(i);fetch(i.href,o)}})();const $="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20665.19684%20283.46457'%3e%3c!--%20Extended%20baseline%20left%20(+120%20units)%20and%20right%20(+120%20units)%20around%20original%20waveform%20--%3e%3cpath%20d='M%200,212.91825%20L%20120,212.91825%20L%20127.994723,212.91825%20L%20170.295515,212.96707%20C%20170.845515,212.56298%20173.366592,209.70567%20174.432211,207.61251%20C%20176.856071,202.85141%20187.517198,192.00825%20190.761002,190.44424%20C%20193.077648,189.32726%20196.961291,190.229%20199.110464,191.3083%20C%20203.295033,193.40975%20211.684885,201.48277%20216.711179,208.07369%20L%20221.6534,212.96707%20L%20242.07837,212.91825%20L%20244.8981,219.16825%20C%20252.38138,235.75509%20253.17959,236.81027%20255.82894,233.618%20C%20256.77263,232.48092%20260.99472,136.34104%20260.99472,115.98961%20C%20260.99472,99.631005%20262.17373,115.52793%20265.47388,176.38366%20C%20267.70186,217.46813%20269.45992,242.77385%20270.14341,243.59741%20C%20270.74632,244.32387%20271.81084,244.91825%20272.509,244.91825%20C%20273.20717,244.91825%20277.61499,237.07638%20282.30415,227.49188%20L%20290.82991,210.06551%20L%20295.16232,209.50926%20C%20299.09064,209.00489%20333.09981,206.18407%20334.7929,206.19593%20C%20335.1842,206.19867%20337.39478,204.14626%20337.97796,201.98049%20C%20340.16036,193.87568%20352.73129,181.80678%20364.99472,176.04268%20C%20369.75712,173.80423%20372.12563,173.40792%20382.6558,173.08752%20C%20402.32457,172.48905%20411.59185,175.356%20422.92465,185.54516%20C%20428.83349,190.85772%20437.35747,203.28768%20438.56003,205.71063%20C%20440.98729,210.60115%20443.88177,210.44532%20447.73276,210.63559%20C%20452.44569,210.86845%20457.55213,208.80775%20460.72341,207.33241%20C%20463.14974,206.20363%20472.82566,201.84404%20478.06891,201.22306%20C%20483.54219,200.57483%20488.4693,201.66908%20498.67185,208.45172%20L%20505.46389,212.96707%20L%20534.69492,212.96707%20L%20545.19684,212.96707%20L%20665.19684,212.91825'%20fill='none'%20stroke='%2300ff00'%20stroke-width='4.25'%20stroke-linecap='round'%20stroke-linejoin='round'%20/%3e%3c/svg%3e";let O=!1,S=null,k=[],E=null,N=0,U=null;const Q=3200;async function J({sampleResolution:r=Q}={}){if(!O)return S||(S=(async()=>{const t=await(await fetch($)).text(),i=new DOMParser().parseFromString(t,"image/svg+xml");if(E=i.querySelector("path"),!E)throw new Error("Path not found in SVG");N=E.getTotalLength();const o=i.querySelector("svg").getAttribute("viewBox").split(" ").map(Number);U={x:o[0],y:o[1],width:o[2],height:o[3]},k=[];for(let d=0;d<=r;d++){const c=d/r,f=E.getPointAtLength(c*N);k.push({x:f.x,y:f.y,norm:c})}O=!0})(),S)}async function fe(r){await J(r||{})}function Z(){return{sampled:k,viewBox:U}}function z(){return O}const C=300,q=3,y=C*q,ee=`#version 300 es
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
uniform float u_beatInterval[${C}];
uniform int u_runTraceIndex[${y}];
uniform float u_runStart[${y}];
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
}`,te=`#version 300 es
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
}`;function V(r,e,t){const a=r.createShader(e);if(r.shaderSource(a,t),r.compileShader(a),!r.getShaderParameter(a,r.COMPILE_STATUS))throw new Error(r.getShaderInfoLog(a));return a}function ae(r,e,t){const a=r.createProgram();if(r.attachShader(a,V(r,35633,e)),r.attachShader(a,V(r,35632,t)),r.linkProgram(a),!r.getProgramParameter(a,35714))throw new Error(r.getProgramInfoLog(a));return a}class ue{constructor(e,t){if(this.canvas=e,this.gl=e.getContext("webgl2",{antialias:!0,premultipliedAlpha:!1}),!this.gl)throw new Error("WebGL2 required");this.cfg=Object.assign({rows:8,cols:10,heartRateMean:85,heartRateStd:30,heartRateMin:48,heartRateMax:185,overlapPercent:15,trailLifePercent:65,maxRunsPerTrace:q,lineWidth:4,headDotRadius:10,colorCore:[0,1,0,.95],edgeSpatialFade:.06,edgeFeather:.22,heartRateDrift:!0,heartRateDriftRange:2,heartRateDriftMinMs:6e3,heartRateDriftMaxMs:14e3},t||{}),this._colorCore=new Float32Array(this.cfg.colorCore),this.dpr=window.devicePixelRatio||1,this.traces=[],this.runs=[],this.lastSpawnTimes=new Float64Array(C),this._buildPrograms(),this._cacheUniforms(),this._buildGeometry(),this._initTraces(),this._u_runStart=new Float32Array(y),this._u_runTraceIndex=new Int32Array(y),this._u_beatIntervals=new Float32Array(C)}_randn(){let e=0,t=0;for(;!e;)e=Math.random();for(;!t;)t=Math.random();return Math.sqrt(-2*Math.log(e))*Math.cos(2*Math.PI*t)}_initTraces(){const e=this.cfg,t=e.rows*e.cols;for(let a=0;a<t;a++){const i=this._randn();let o=e.heartRateMean+i*e.heartRateStd;o=Math.min(e.heartRateMax,Math.max(e.heartRateMin,o)),this.traces.push({initialBaseHeartRate:o,baseHeartRate:o,heartRate:o,beatInterval:6e4/o,beatCount:0,driftFrom:o,driftTo:o,driftStart:0,driftDuration:1})}}_scheduleNextDrift(e,t){const a=this.cfg,i=a.heartRateDriftRange||0,o=e.baseHeartRate-i,d=e.baseHeartRate+i;let c,f=0;do c=o+Math.random()*(d-o),f++;while(Math.abs(c-e.heartRate)<.15&&f<8);e.driftFrom=e.heartRate,e.driftTo=c,e.driftStart=t;const x=a.heartRateDriftMinMs+Math.random()*(a.heartRateDriftMaxMs-a.heartRateDriftMinMs);e.driftDuration=Math.max(1e3,x)}_updateHeartRateDrift(e){if(this.cfg.heartRateDrift)for(const a of this.traces){a.driftStart||this._scheduleNextDrift(a,e);const i=(e-a.driftStart)/a.driftDuration;if(i>=1)a.heartRate=a.driftTo,a.beatInterval=6e4/a.heartRate,this._scheduleNextDrift(a,e);else if(i>=0){const o=i*i*(3-2*i);a.heartRate=a.driftFrom+(a.driftTo-a.driftFrom)*o,a.beatInterval=6e4/a.heartRate}}}_initPhases(){for(const e of this.traces)e.phaseShift=Math.random()*e.beatInterval,e.phaseProgress=e.phaseShift,e._lastBeatEvalTime=0}ensureInitialRuns(e){if(!this._seeded){for(let t=0;t<this.traces.length;t++)this.runs.push({traceIndex:t,startTime:e,counted:!1});this._seeded=!0}}resize(){let e=this.canvas.clientWidth||this.canvas.parentElement&&this.canvas.parentElement.clientWidth||window.innerWidth,t=this.canvas.clientHeight||this.canvas.parentElement&&this.canvas.parentElement.clientHeight||window.innerHeight-80;(e===0||t===0)&&(e=window.innerWidth,t=window.innerHeight-80),(this.canvas.width!==e*this.dpr||this.canvas.height!==t*this.dpr)&&(this.canvas.width=e*this.dpr,this.canvas.height=t*this.dpr,this.canvas.style.width=e+"px",this.canvas.style.height=t+"px",this.canvas.style.display="block"),this.w=e,this.h=t}_buildPrograms(){const e=this.gl;this.progTrace=ae(e,ee,te)}_cacheUniforms(){const e=this.gl,t=this.progTrace,a=["u_time","u_t_cols","u_t_rows","u_t_canvasW","u_t_canvasH","u_t_cellMargin","u_t_pathW","u_t_pathH","u_edgeFade","u_trailVisibleFrac","u_trailFadeFrac","u_t_flipY","u_edgeFeather","u_noiseAmp","u_beatInterval","u_runStart","u_runTraceIndex","u_colCore","u_isHeadPass","u_lineHalfWidth"];this._uloc={};for(const i of a)this._uloc[i]=e.getUniformLocation(t,i)}_buildGeometry(){if(!z())return;const{sampled:e,viewBox:t}=Z();this.pathBox=t;const a=e.length,i=2,o=7,d=a*i,c=new Float32Array(d*o);let f=0;for(let u=0;u<a;u++){const g=e[u],m=e[u&&u-1],v=e[u<a-1?u+1:u];let w=g.x-m.x,A=g.y-m.y,B=Math.hypot(w,A)||1;w/=B,A/=B;let F=v.x-g.x,R=v.y-g.y,G=Math.hypot(F,R)||1;F/=G,R/=G;let P=Math.hypot(F-w,R-A);P=Math.min(1,P*.5);let M=v.x-m.x,L=v.y-m.y,W=Math.hypot(M,L)||1;M/=W,L/=W;const X=-L,K=M;for(let I=-1;I<=1;I+=2)c[f++]=g.x,c[f++]=g.y,c[f++]=g.norm,c[f++]=I,c[f++]=X,c[f++]=K,c[f++]=P}const x=a-1,T=x*6,s=new Uint16Array(T);let h=0;for(let u=0;u<x;u++){const g=2*u,m=2*u+1,v=2*(u+1),w=2*(u+1)+1;s[h++]=g,s[h++]=m,s[h++]=v,s[h++]=m,s[h++]=w,s[h++]=v}this.vertCount=d,this.indexType=this.gl.UNSIGNED_SHORT,this.indexCount=T;const l=this.gl;this.vaoTrace=l.createVertexArray(),l.bindVertexArray(this.vaoTrace),this.vboTrace=l.createBuffer(),l.bindBuffer(l.ARRAY_BUFFER,this.vboTrace),l.bufferData(l.ARRAY_BUFFER,c,l.STATIC_DRAW);const _=o*4;let p=0;l.enableVertexAttribArray(0),l.vertexAttribPointer(0,2,l.FLOAT,!1,_,p),p+=8,l.enableVertexAttribArray(1),l.vertexAttribPointer(1,1,l.FLOAT,!1,_,p),p+=4,l.enableVertexAttribArray(2),l.vertexAttribPointer(2,1,l.FLOAT,!1,_,p),p+=4,l.enableVertexAttribArray(3),l.vertexAttribPointer(3,2,l.FLOAT,!1,_,p),p+=8,l.enableVertexAttribArray(4),l.vertexAttribPointer(4,1,l.FLOAT,!1,_,p),this.ibo=l.createBuffer(),l.bindBuffer(l.ELEMENT_ARRAY_BUFFER,this.ibo),l.bufferData(l.ELEMENT_ARRAY_BUFFER,s,l.STATIC_DRAW),l.bindVertexArray(null)}_spawnRuns(e){const a=this.cfg.overlapPercent/100;for(let i=0;i<this.traces.length;i++){const d=this.traces[i].beatInterval*(1-a);this.lastSpawnTimes[i]||(this.lastSpawnTimes[i]=e),(e-this.lastSpawnTimes[i]>=d||!this._traceHasActive(i,e))&&(this._addRun(i,e),this.lastSpawnTimes[i]=e)}}_traceHasActive(e,t){this.cfg;for(const a of this.runs)if(a.traceIndex===e){const i=this.traces[e],o=i.beatInterval+this._trailDur(i)+this._trailFade(i);if(t-a.startTime<o)return!0}return!1}_addRun(e,t){let a=0,i=-1,o=1/0;for(let d=0;d<this.runs.length;d++){const c=this.runs[d];c.traceIndex===e&&(a++,c.startTime<o&&(o=c.startTime,i=d))}a>=this.cfg.maxRunsPerTrace&&i>=0&&this.runs.splice(i,1),this.runs.push({traceIndex:e,startTime:t,counted:!1})}_trailDur(e){return this.cfg.trailLifePercent/100*e.beatInterval*(350/650)}_trailFade(e){return this.cfg.trailLifePercent/100*e.beatInterval-this._trailDur(e)}step(e){if(!z())return;this.vertCount||this._buildGeometry(),this.resize(),this.ensureInitialRuns(e),this.startTime||(this.startTime=e,this._phased||(this._initPhases(),this._phased=!0)),this._updateHeartRateDrift(e),this._spawnRuns(e);for(let s=this.runs.length-1;s>=0;s--){const h=this.runs[s],l=this.traces[h.traceIndex],_=l.beatInterval+this._trailDur(l)+this._trailFade(l);e-h.startTime>_&&this.runs.splice(s,1)}for(const s of this.traces){s._lastBeatEvalTime||(s._lastBeatEvalTime=e);let h=e-s._lastBeatEvalTime;for(h<0&&(h=0),s.phaseProgress+=h;s.phaseProgress>=s.beatInterval;)s.phaseProgress-=s.beatInterval,s.beatCount++;s._lastBeatEvalTime=e}const t=this.gl;t.viewport(0,0,this.canvas.width,this.canvas.height),t.disable(t.DEPTH_TEST),t.enable(t.BLEND),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT);const a=this.cfg,i=Math.min(this.runs.length,y);for(let s=0;s<i;s++)this._u_runStart[s]=this.runs[s].startTime,this._u_runTraceIndex[s]=this.runs[s].traceIndex;for(let s=i;s<y;s++)this._u_runStart[s]=0,this._u_runTraceIndex[s]=0;for(let s=0;s<this.traces.length;s++)this._u_beatIntervals[s]=this.traces[s].beatInterval;for(let s=this.traces.length;s<C;s++)this._u_beatIntervals[s]=0;t.useProgram(this.progTrace),t.bindVertexArray(this.vaoTrace);const o=s=>this._uloc[s];t.uniform1f(o("u_time"),e),t.uniform1i(o("u_t_cols"),a.cols),t.uniform1i(o("u_t_rows"),a.rows),t.uniform1f(o("u_t_canvasW"),this.canvas.width),t.uniform1f(o("u_t_canvasH"),this.canvas.height),t.uniform1f(o("u_t_cellMargin"),4),t.uniform1f(o("u_t_pathW"),this.pathBox.width),t.uniform1f(o("u_t_pathH"),this.pathBox.height),t.uniform1f(o("u_edgeFade"),a.edgeSpatialFade);const d=this.cfg.trailLifePercent/100,c=Math.min(.95,Math.max(.05,d)),f=c*(350/650),x=Math.max(1e-4,c-f);t.uniform1f(o("u_trailVisibleFrac"),f),t.uniform1f(o("u_trailFadeFrac"),x),t.uniform1i(o("u_t_flipY"),1),t.uniform1f(o("u_edgeFeather"),a.edgeFeather),t.uniform1f(o("u_noiseAmp"),.35),t.uniform1fv(o("u_beatInterval"),this._u_beatIntervals),t.uniform1fv(o("u_runStart"),this._u_runStart),t.uniform1iv(o("u_runTraceIndex"),this._u_runTraceIndex),t.uniform4fv(o("u_colCore"),this._colorCore),t.blendFunc(t.SRC_ALPHA,t.ONE_MINUS_SRC_ALPHA),t.uniform1i(o("u_isHeadPass"),0),t.uniform1f(o("u_lineHalfWidth"),a.lineWidth*.5),t.drawElementsInstanced(t.TRIANGLES,this.indexCount,this.indexType,0,i),t.blendFunc(t.SRC_ALPHA,t.ONE),t.uniform1i(o("u_isHeadPass"),1),t.uniform1f(o("u_lineHalfWidth"),(a.headDotRadius||a.lineWidth*1.4)*.5),t.drawArraysInstanced(t.POINTS,0,this.vertCount,i),t.bindVertexArray(null);const T=t.getError();T!==t.NO_ERROR&&console.warn("[MultiECGBatchGL] glError",T.toString(16))}totalBeats(){return this.traces.reduce((e,t)=>e+t.beatCount,0)}dispose(){const e=this.gl;if(e)try{this.vboTrace&&e.deleteBuffer(this.vboTrace),this.ibo&&e.deleteBuffer(this.ibo),this.vaoTrace&&e.deleteVertexArray(this.vaoTrace),this.progTrace&&e.deleteProgram(this.progTrace)}catch(t){console.warn("dispose error",t)}}}class he{constructor(e){this.batch=e,this._running=!1,this._loop=this._loop.bind(this)}start(){this._running||(this._running=!0,requestAnimationFrame(this._loop))}stop(){this._running=!1}_loop(e){this._running&&(this.batch.step(e),requestAnimationFrame(this._loop))}}const n={overlayEl:null,open:!1,fpsEnabled:!1,fpsEl:null,lastFpsSample:performance.now(),frames:0,smoothFps:null,boundLoop:null,target:null,initialized:!1};function pe(r){n.target=r,n.initialized||(oe(),document.addEventListener("keydown",re,{passive:!1}),se(),n.initialized=!0),ce()}function re(r){r.altKey&&(r.code==="KeyP"&&(r.preventDefault(),ne()),r.code==="KeyC"&&(r.preventDefault(),j()))}function oe(){if(n.overlayEl)return;const r=document.createElement("div");r.id="ecg-config-overlay",r.innerHTML=ie(),document.body.appendChild(r),n.overlayEl=r,r.querySelector("[data-close]").addEventListener("click",()=>j(!1)),r.style.display="none"}function ie(){return`
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
  </div>`}function j(r){n.open=typeof r=="boolean"?r:!n.open,n.overlayEl.style.display=n.open?"flex":"none"}function ne(){n.fpsEnabled=!n.fpsEnabled,n.fpsEl&&(n.fpsEl.style.display=n.fpsEnabled?"block":"none")}function se(){n.boundLoop||(n.fpsEl=document.getElementById("fps-counter")||le(),n.fpsEl.style.display="none",n.boundLoop=r=>{if(n.frames++,r-n.lastFpsSample>1e3){const e=n.frames*1e3/(r-n.lastFpsSample);n.frames=0,n.lastFpsSample=r,n.smoothFps=n.smoothFps?n.smoothFps*.7+e*.3:e,n.fpsEnabled&&(n.fpsEl.textContent="FPS: "+n.smoothFps.toFixed(0))}requestAnimationFrame(n.boundLoop)},requestAnimationFrame(n.boundLoop))}function le(){const r=document.createElement("div");return r.id="fps-counter",r.textContent="FPS: --",r.style.position="fixed",r.style.top="8px",r.style.right="12px",r.style.zIndex="1000",r.style.font="12px Roboto, monospace",r.style.padding="4px 8px",r.style.background="rgba(0,0,0,0.4)",r.style.border="1px solid rgba(0,255,106,0.35)",r.style.borderRadius="6px",r.style.color="var(--accent)",document.body.appendChild(r),r}function ce(){const r=n.overlayEl.querySelector("#ecg-config-form");if(n.target.single,!r)return;r.querySelectorAll("input[type=range][data-val]").forEach(t=>{if(!t.parentElement.querySelector(".val")){const a=document.createElement("span");a.className="val",a.textContent=t.value,t.parentElement.appendChild(a)}if(!t.dataset.bound){const a=t.parentElement.querySelector(".val");t.addEventListener("input",()=>{a.textContent=t.value,H(t.name,t.value)}),t.dataset.bound="1"}}),r.querySelectorAll("input[type=color]").forEach(t=>{t.dataset.bound||(t.addEventListener("input",()=>H(t.name,t.value)),t.dataset.bound="1")});const e=r.querySelector("input[name=showGrid]");e&&!e.dataset.bound&&(e.addEventListener("change",()=>H("showGrid",e.checked)),e.dataset.bound="1")}function H(r,e,t){let a=n.target.batch;if(typeof a=="function"&&(a=a()),!!a)switch(r){case"overlap":a.cfg.overlapPercent=+e;break;case"trail":a.cfg.trailLifePercent=+e;break;case"coreWidth":a.cfg.lineWidth=+e;break;case"headSize":a.cfg.headDotRadius=+e;break;case"edgeFeather":a.cfg.edgeFeather=+e;break;case"edgeFade":a.cfg.edgeSpatialFade=+e;break;case"coreColor":a.cfg.colorCore=de(e,.95),a._colorCore=new Float32Array(a.cfg.colorCore);break;case"gridSize":n.target.redrawGrid&&n.target.redrawGrid(+e);break;case"gridColor":n.target.setGridColorMajor&&n.target.setGridColorMajor(e),n.target.setGridColorMinor&&n.target.setGridColorMinor(e);break;case"gridColorPanel":n.target.setGridColorPanel&&n.target.setGridColorPanel(e);break;case"gridColorMajor":n.target.setGridColorMajor&&n.target.setGridColorMajor(e);break;case"gridColorMinor":n.target.setGridColorMinor&&n.target.setGridColorMinor(e);break;case"showGrid":n.target.toggleGrid&&n.target.toggleGrid(!!e);break;case"textSize":n.target.updateText&&n.target.updateText({size:+e});break;case"textGlow":n.target.updateText&&n.target.updateText({glow:+e});break;case"textColor":n.target.updateText&&n.target.updateText({color:e});break;case"totalSize":n.target.updateText&&n.target.updateText({totalSize:+e});break}}function de(r,e){let t=r.replace("#","");return t.length===3&&(t=t.split("").map(a=>a+a).join("")),[parseInt(t.slice(0,2),16)/255,parseInt(t.slice(2,4),16)/255,parseInt(t.slice(4,6),16)/255,e]}const Y="ecg-config-style",D=`/* ECG Config Overlay (update-safe) */
#ecg-config-overlay{position:fixed;top:0;left:0;display:flex;align-items:stretch;justify-content:flex-start;pointer-events:none;z-index:1500;font:16px Roboto,system-ui,sans-serif;line-height:1.25;}
#ecg-config-overlay .ecg-config-scroll{width:360px;max-width:92vw;height:100vh;overflow:auto;background:#121212f2;border-right:1px solid rgba(0,255,106,0.4);box-shadow:8px 0 28px -6px rgba(0,0,0,0.7);padding:22px 20px 92px;pointer-events:auto;}
#ecg-config-overlay h3{margin:0;font-weight:600;letter-spacing:.85px;color:var(--accent);font-size:21px;text-shadow:0 0 10px rgba(0,255,106,.65);}
#ecg-config-overlay fieldset{border:1px solid rgba(0,255,106,0.28);border-radius:12px;margin:16px 0 26px;padding:14px 16px 16px;display:flex;flex-direction:column;gap:14px;}
#ecg-config-overlay legend{padding:0 9px;font-size:14px;letter-spacing:.75px;color:var(--accent-soft);}
#ecg-config-overlay label{display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--text-dim);}
#ecg-config-overlay input[type=range]{width:100%;}
#ecg-config-overlay .val{font-family:monospace;color:var(--accent);font-size:13px;}
#ecg-config-overlay .ecg-config-header{position:fixed;top:0;left:0;width:360px;display:flex;align-items:center;justify-content:space-between;padding:16px 20px 14px;background:linear-gradient(180deg,#141414,#121212cc);box-shadow:0 4px 12px -6px rgba(0,0,0,0.55);pointer-events:auto;}
#ecg-config-overlay .buttons button{background:#161616;border:1px solid rgba(0,255,106,0.6);color:var(--accent);cursor:pointer;font-size:15px;padding:7px 12px;border-radius:8px;line-height:1;transition:background .15s;}
#ecg-config-overlay .buttons button:hover{background:#242424;}
#ecg-config-overlay form{margin-top:70px;}
#ecg-config-overlay .foot{font-size:13px;color:var(--text-dim);margin-top:10px;opacity:.95;}
#ecg-config-overlay kbd{background:#222;border:1px solid rgba(255,255,255,0.22);border-radius:5px;padding:3px 6px;font-size:12px;margin:0 2px;box-shadow:0 0 0 1px #000;}
@media (max-width: 680px){#ecg-config-overlay .ecg-config-scroll{width:94vw;}}`;let b=document.getElementById(Y);b?b.textContent!==D&&(b.textContent=D):(b=document.createElement("style"),b.id=Y,b.textContent=D,document.head.appendChild(b));export{he as B,ue as M,fe as e,pe as i};
