const dt="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20665.19684%20283.46457'%3e%3c!--%20Extended%20baseline%20left%20(+120%20units)%20and%20right%20(+120%20units)%20around%20original%20waveform%20--%3e%3cpath%20d='M%200,212.91825%20L%20120,212.91825%20L%20127.994723,212.91825%20L%20170.295515,212.96707%20C%20170.845515,212.56298%20173.366592,209.70567%20174.432211,207.61251%20C%20176.856071,202.85141%20187.517198,192.00825%20190.761002,190.44424%20C%20193.077648,189.32726%20196.961291,190.229%20199.110464,191.3083%20C%20203.295033,193.40975%20211.684885,201.48277%20216.711179,208.07369%20L%20221.6534,212.96707%20L%20242.07837,212.91825%20L%20244.8981,219.16825%20C%20252.38138,235.75509%20253.17959,236.81027%20255.82894,233.618%20C%20256.77263,232.48092%20260.99472,136.34104%20260.99472,115.98961%20C%20260.99472,99.631005%20262.17373,115.52793%20265.47388,176.38366%20C%20267.70186,217.46813%20269.45992,242.77385%20270.14341,243.59741%20C%20270.74632,244.32387%20271.81084,244.91825%20272.509,244.91825%20C%20273.20717,244.91825%20277.61499,237.07638%20282.30415,227.49188%20L%20290.82991,210.06551%20L%20295.16232,209.50926%20C%20299.09064,209.00489%20333.09981,206.18407%20334.7929,206.19593%20C%20335.1842,206.19867%20337.39478,204.14626%20337.97796,201.98049%20C%20340.16036,193.87568%20352.73129,181.80678%20364.99472,176.04268%20C%20369.75712,173.80423%20372.12563,173.40792%20382.6558,173.08752%20C%20402.32457,172.48905%20411.59185,175.356%20422.92465,185.54516%20C%20428.83349,190.85772%20437.35747,203.28768%20438.56003,205.71063%20C%20440.98729,210.60115%20443.88177,210.44532%20447.73276,210.63559%20C%20452.44569,210.86845%20457.55213,208.80775%20460.72341,207.33241%20C%20463.14974,206.20363%20472.82566,201.84404%20478.06891,201.22306%20C%20483.54219,200.57483%20488.4693,201.66908%20498.67185,208.45172%20L%20505.46389,212.96707%20L%20534.69492,212.96707%20L%20545.19684,212.96707%20L%20665.19684,212.91825'%20fill='none'%20stroke='%2300ff00'%20stroke-width='4.25'%20stroke-linecap='round'%20stroke-linejoin='round'%20/%3e%3c/svg%3e";let Y=!1,k=null,X=[],O=null,tt=0,rt=null;const ut=3200;function U(l,e){if(!l)return`rgba(0,255,106,${e})`;let t=l.replace("#","");t.length===3&&(t=t.split("").map(s=>s+s).join(""));const a=parseInt(t.substring(0,2),16),o=parseInt(t.substring(2,4),16),i=parseInt(t.substring(4,6),16);return`rgba(${a},${o},${i},${e})`}async function ht({sampleResolution:l=ut}={}){if(!Y)return k||(k=(async()=>{const t=await(await fetch(dt)).text(),o=new DOMParser().parseFromString(t,"image/svg+xml");if(O=o.querySelector("path"),!O)throw new Error("Path not found in SVG");tt=O.getTotalLength();const i=o.querySelector("svg").getAttribute("viewBox").split(" ").map(Number);rt={x:i[0],y:i[1],width:i[2],height:i[3]},X=[];for(let s=0;s<=l;s++){const r=s/l,f=O.getPointAtLength(r*tt);X.push({x:f.x,y:f.y,norm:r})}Y=!0})(),k)}function yt(l,e){const t=l.getContext("2d");if(!t)return;const a=l.parentElement,o=a?a.getBoundingClientRect():null,i=o?o.width:l.clientWidth||l.width,s=o?o.height:l.clientHeight||l.height,r=window.devicePixelRatio||1;(l.width!==i*r||l.height!==s*r)&&(l.width=i*r,l.height=s*r,l.style.width=i+"px",l.style.height=s+"px"),t.setTransform(r,0,0,r,0,0),t.clearRect(0,0,i,s);const{rows:f=1,cols:d=1,gridSize:n=100,gridColorMajor:c="#00ff6a",gridColorPanel:h="#00ff6a",showGridOuterBox:b=!0,showGridLines:y=!0,showGridBackground:x=!0,gridGapPercent:F=4,viewportHorizontalPadding:M=.05,viewportVerticalPadding:E=.05}=e;t.fillStyle="#0d0d0d",t.fillRect(0,0,i,s);const P=i,L=P*M,R=P*E,T=i-2*L,I=s-2*R,W=T/d,S=(f===1&&d===1?0:F)/100,Z=W*S,Q=W*S,st=Z*(d-1),lt=Q*(f-1),g=(T-st)/d,_=(I-lt)/f,J=n,$=Math.max(1,Math.round(g/J)),B=Math.max(1,Math.round(_/J)),z=g/$,G=_/B,D=5,ct=z/D,ft=G/D;for(let j=0;j<f;j++)for(let N=0;N<d;N++){const m=L+N*(g+Z),v=R+j*(_+Q);if(t.save(),t.beginPath(),t.rect(m,v,g,_),t.clip(),y){t.strokeStyle=U(c,.12),t.lineWidth=1;for(let u=0;u<$;u++)for(let p=1;p<D;p++){const C=m+u*z+p*ct;C>=m+g-.5||(t.beginPath(),t.moveTo(C,v),t.lineTo(C,v+_),t.stroke())}for(let u=0;u<B;u++)for(let p=1;p<D;p++){const C=v+u*G+p*ft;C>=v+_-.5||(t.beginPath(),t.moveTo(m,C),t.lineTo(m+g,C),t.stroke())}t.strokeStyle=U(c,.12),t.lineWidth=1;for(let u=1;u<$;u++){const p=m+u*z;p>=m+g-.5||(t.beginPath(),t.moveTo(p,v),t.lineTo(p,v+_),t.stroke())}for(let u=1;u<B;u++){const p=v+u*G;p>=v+_-.5||(t.beginPath(),t.moveTo(m,p),t.lineTo(m+g,p),t.stroke())}}if(t.restore(),x){const u=t.createRadialGradient(m+g*.55,v+_*.5,0,m+g*.55,v+_*.5,Math.max(g,_)*.45);u.addColorStop(0,"rgba(0,255,106,0.055)"),u.addColorStop(.45,"rgba(0,255,106,0.015)"),u.addColorStop(1,"rgba(0,255,106,0)"),t.fillStyle=u,t.fillRect(m,v,g,_)}b&&(t.strokeStyle=U(h,.24),t.lineWidth=.75,t.strokeRect(m+.35,v+.35,g-.7,_-.7))}}async function xt(l){await ht(l||{})}function pt(){return{sampled:X,viewBox:rt}}function et(){return Y}const H=300,ot=3,A=H*ot,gt=`#version 300 es
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
uniform float u_viewportHorizontalPadding; // Horizontal padding as fraction of horizontal grid size
uniform float u_viewportVerticalPadding; // Vertical padding as fraction of horizontal grid size
uniform float u_edgeFade;
uniform float u_beatInterval[${H}];
uniform int u_runTraceIndex[${A}];
uniform float u_runStart[${A}];
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
  
  // Calculate viewport padding as percentage of horizontal grid size
  float paddingX = u_t_canvasW * u_viewportHorizontalPadding;
  float paddingY = u_t_canvasW * u_viewportVerticalPadding;
  float gridW = u_t_canvasW - 2.0 * paddingX;
  float gridH = u_t_canvasH - 2.0 * paddingY;
  float cellW = gridW / float(u_t_cols);
  float cellH = gridH / float(u_t_rows);
  
  // Calculate effective cell dimensions (matching grid drawing logic)
  // For single cell mode, use zero grid gap
  float gridGapPercentValue = (u_t_rows == 1 && u_t_cols == 1) ? 0.0 : 0.04; // 4% grid gap for multi mode
  float spacingW = cellW * gridGapPercentValue;
  float spacingH = cellW * gridGapPercentValue; // Use horizontal size for consistent spacing
  float totalSpacingW = spacingW * (float(u_t_cols) - 1.0);
  float totalSpacingH = spacingH * (float(u_t_rows) - 1.0);
  float effectiveCellW = (gridW - totalSpacingW) / float(u_t_cols);
  float effectiveCellH = (gridH - totalSpacingH) / float(u_t_rows);
  
  // Calculate scale to fit trace in effective cell
  float scale = min(effectiveCellW / u_t_pathW, effectiveCellH / u_t_pathH);
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
  // Position in effective cell with offset from center, offset by viewport padding and cell spacing
  float x0 = paddingX + float(col) * (effectiveCellW + spacingW) + (effectiveCellW - u_t_pathW*scale)/2.0;
  float y0 = paddingY + float(row) * (effectiveCellH + spacingH) + (effectiveCellH - u_t_pathH*scale)/2.0;
  pos += vec2(x0, y0);
  // Compute UV inside effective cell
  v_cellUV = (pos - vec2(paddingX + float(col) * (effectiveCellW + spacingW), paddingY + float(row) * (effectiveCellH + spacingH)))/vec2(effectiveCellW, effectiveCellH);
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
}`,_t=`#version 300 es
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
}`;function at(l,e,t){const a=l.createShader(e);if(l.shaderSource(a,t),l.compileShader(a),!l.getShaderParameter(a,l.COMPILE_STATUS))throw new Error(l.getShaderInfoLog(a));return a}function mt(l,e,t){const a=l.createProgram();if(l.attachShader(a,at(l,35633,e)),l.attachShader(a,at(l,35632,t)),l.linkProgram(a),!l.getProgramParameter(a,35714))throw new Error(l.getProgramInfoLog(a));return a}class Ct{constructor(e,t){if(this.canvas=e,this.gl=e.getContext("webgl2",{antialias:!0,premultipliedAlpha:!1}),!this.gl)throw new Error("WebGL2 required");this.cfg=Object.assign({rows:8,cols:10,heartRateMean:85,heartRateStd:30,heartRateMin:48,heartRateMax:185,overlapPercent:15,trailLifePercent:65,maxRunsPerTrace:ot,lineWidth:4,headDotRadius:10,colorCore:[0,1,0,.95],edgeSpatialFade:.06,edgeFeather:.22,viewportHorizontalPadding:.05,viewportVerticalPadding:.05,heartRateDrift:!0,heartRateDriftRange:2,heartRateDriftMinMs:6e3,heartRateDriftMaxMs:14e3,heartRateMode:"auto",manualHeartRate:85,gridSize:100,showGrid:!0,gridColor:"#00ff6a",renderWidth:null,renderHeight:null},t||{}),this._colorCore=new Float32Array(this.cfg.colorCore),this.dpr=window.devicePixelRatio||1,this.traces=[],this.runs=[],this.lastSpawnTimes=new Float64Array(H),this._buildPrograms(),this._cacheUniforms(),this._buildGeometry(),this._initTraces(),this._u_runStart=new Float32Array(A),this._u_runTraceIndex=new Int32Array(A),this._u_beatIntervals=new Float32Array(H)}setHeartRateMode(e){(e==="auto"||e==="manual")&&(this.cfg.heartRateMode=e,e==="manual"&&this.setManualHeartRate(this.cfg.manualHeartRate))}setManualHeartRate(e){if(this.cfg.manualHeartRate=Math.max(this.cfg.heartRateMin,Math.min(this.cfg.heartRateMax,e)),this.cfg.heartRateMode==="manual")for(const t of this.traces)t.baseHeartRate=this.cfg.manualHeartRate,t.heartRate=this.cfg.manualHeartRate,t.beatInterval=6e4/this.cfg.manualHeartRate,t.driftStart=0}getCurrentHeartRate(){return this.cfg.heartRateMode==="manual"?this.cfg.manualHeartRate:this.traces.length===0?this.cfg.heartRateMean:this.traces.reduce((t,a)=>t+a.heartRate,0)/this.traces.length}updateConfig(e){const t={...this.cfg};Object.assign(this.cfg,e),e.colorCore&&(this._colorCore=new Float32Array(this.cfg.colorCore)),e.heartRateMode!==void 0&&e.heartRateMode!==t.heartRateMode&&this.setHeartRateMode(e.heartRateMode),e.manualHeartRate!==void 0&&this.cfg.heartRateMode==="manual"&&this.setManualHeartRate(e.manualHeartRate),(e.rows!==void 0&&e.rows!==t.rows||e.cols!==void 0&&e.cols!==t.cols)&&this._rebuildTraces()}updateDimensions(e,t){this.cfg.renderWidth=e,this.cfg.renderHeight=t,this.resize()}_rebuildTraces(){this.traces=[],this.runs=[],this.lastSpawnTimes=new Float64Array(H),this._initTraces(),this._seeded=!1}_randn(){let e=0,t=0;for(;!e;)e=Math.random();for(;!t;)t=Math.random();return Math.sqrt(-2*Math.log(e))*Math.cos(2*Math.PI*t)}_initTraces(){const e=this.cfg,t=e.rows*e.cols;for(let a=0;a<t;a++){const o=this._randn();let i=e.heartRateMean+o*e.heartRateStd;i=Math.min(e.heartRateMax,Math.max(e.heartRateMin,i)),this.traces.push({initialBaseHeartRate:i,baseHeartRate:i,heartRate:i,beatInterval:6e4/i,beatCount:0,driftFrom:i,driftTo:i,driftStart:0,driftDuration:1})}}_scheduleNextDrift(e,t){const a=this.cfg,o=a.heartRateDriftRange||0,i=e.baseHeartRate-o,s=e.baseHeartRate+o;let r;do r=i+Math.random()*(s-i);while(Math.abs(r-e.heartRate)<.15);e.driftFrom=e.heartRate,e.driftTo=r,e.driftStart=t;const f=a.heartRateDriftMinMs+Math.random()*(a.heartRateDriftMaxMs-a.heartRateDriftMinMs);e.driftDuration=Math.max(1e3,f)}_updateHeartRateDrift(e){if(!(!this.cfg.heartRateDrift||this.cfg.heartRateMode!=="auto"))for(const t of this.traces){t.driftStart||this._scheduleNextDrift(t,e);const a=(e-t.driftStart)/t.driftDuration;if(a>=1)t.heartRate=t.driftTo,t.beatInterval=6e4/t.heartRate,this._scheduleNextDrift(t,e);else if(a>=0){const o=a*a*(3-2*a);t.heartRate=t.driftFrom+(t.driftTo-t.driftFrom)*o,t.beatInterval=6e4/t.heartRate}}}_initPhases(){for(const e of this.traces)e.phaseShift=Math.random()*e.beatInterval,e.phaseProgress=e.phaseShift,e._lastBeatEvalTime=0}ensureInitialRuns(e){if(!this._seeded){for(let t=0;t<this.traces.length;t++)this.runs.push({traceIndex:t,startTime:e,counted:!1});this._seeded=!0}}resize(){const e=this.cfg.renderWidth||this.canvas.clientWidth||window.innerWidth,t=this.cfg.renderHeight||this.canvas.clientHeight||window.innerHeight;(this.canvas.width!==e*this.dpr||this.canvas.height!==t*this.dpr)&&(this.canvas.width=e*this.dpr,this.canvas.height=t*this.dpr,this.canvas.style.width=e+"px",this.canvas.style.height=t+"px",this.canvas.style.display="block")}_buildPrograms(){const e=this.gl;this.progTrace=mt(e,gt,_t)}_cacheUniforms(){const e=this.gl,t=this.progTrace,a=["u_time","u_t_cols","u_t_rows","u_t_canvasW","u_t_canvasH","u_t_cellMargin","u_t_pathW","u_t_pathH","u_edgeFade","u_trailVisibleFrac","u_trailFadeFrac","u_t_flipY","u_edgeFeather","u_noiseAmp","u_beatInterval","u_runStart","u_runTraceIndex","u_colCore","u_isHeadPass","u_lineHalfWidth","u_viewportHorizontalPadding","u_viewportVerticalPadding"];this._uloc={};for(const o of a)this._uloc[o]=e.getUniformLocation(t,o)}_buildGeometry(){if(!et())return;const{sampled:e,viewBox:t}=pt();this.pathBox=t;const a=e.length,o=new Float32Array(a*2*7);let i=0;for(let n=0;n<a;n++){const c=e[n],h=e[n&&n-1],b=e[n<a-1?n+1:n];let y=c.x-h.x,x=c.y-h.y;const F=Math.hypot(y,x)||1;y/=F,x/=F;let M=b.x-c.x,E=b.y-c.y;const P=Math.hypot(M,E)||1;M/=P,E/=P;const L=Math.min(1,Math.hypot(M-y,E-x)*.5);let R=b.x-h.x,T=b.y-h.y;const I=Math.hypot(R,T)||1;R/=I,T/=I;const W=-T,K=R;for(let S=-1;S<=1;S+=2)o[i++]=c.x,o[i++]=c.y,o[i++]=c.norm,o[i++]=S,o[i++]=W,o[i++]=K,o[i++]=L}const s=new Uint16Array((a-1)*6);for(let n=0,c=0;n<a-1;n++){const h=2*n,b=2*n+1,y=2*(n+1),x=2*(n+1)+1;s[c++]=h,s[c++]=b,s[c++]=y,s[c++]=b,s[c++]=x,s[c++]=y}this.vertCount=a*2,this.indexType=this.gl.UNSIGNED_SHORT,this.indexCount=s.length;const r=this.gl;this.vaoTrace=r.createVertexArray(),r.bindVertexArray(this.vaoTrace),this.vboTrace=r.createBuffer(),r.bindBuffer(r.ARRAY_BUFFER,this.vboTrace),r.bufferData(r.ARRAY_BUFFER,o,r.STATIC_DRAW);const f=28;let d=0;r.enableVertexAttribArray(0),r.vertexAttribPointer(0,2,r.FLOAT,!1,f,d),d+=8,r.enableVertexAttribArray(1),r.vertexAttribPointer(1,1,r.FLOAT,!1,f,d),d+=4,r.enableVertexAttribArray(2),r.vertexAttribPointer(2,1,r.FLOAT,!1,f,d),d+=4,r.enableVertexAttribArray(3),r.vertexAttribPointer(3,2,r.FLOAT,!1,f,d),d+=8,r.enableVertexAttribArray(4),r.vertexAttribPointer(4,1,r.FLOAT,!1,f,d),this.ibo=r.createBuffer(),r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,this.ibo),r.bufferData(r.ELEMENT_ARRAY_BUFFER,s,r.STATIC_DRAW),r.bindVertexArray(null)}_spawnRuns(e){const t=this.cfg;for(let a=0;a<this.traces.length;a++){const o=this.traces[a],i=Math.max(0,Math.min(100,t.overlapPercent||0)),s=o.beatInterval*(1-i/100);this.lastSpawnTimes[a]||(this.lastSpawnTimes[a]=e),(e-this.lastSpawnTimes[a]>=s||!this._traceHasActive(a,e))&&(this._addRun(a,e),this.lastSpawnTimes[a]=e)}}_traceHasActive(e,t){for(const a of this.runs)if(a.traceIndex===e){const o=this.traces[e],i=o.beatInterval+this._trailDur(o)+this._trailFade(o);if(t-a.startTime<i)return!0}return!1}_addRun(e,t){let a=0,o=-1,i=1/0;for(let s=0;s<this.runs.length;s++){const r=this.runs[s];r.traceIndex===e&&(a++,r.startTime<i&&(i=r.startTime,o=s))}a>=this.cfg.maxRunsPerTrace&&o>=0&&this.runs.splice(o,1),this.runs.push({traceIndex:e,startTime:t,counted:!1})}_trailDur(e){return this.cfg.trailLifePercent/100*e.beatInterval*(350/650)}_trailFade(e){return this.cfg.trailLifePercent/100*e.beatInterval-this._trailDur(e)}step(e){if(!et())return;this.vertCount||this._buildGeometry(),this.resize(),this.ensureInitialRuns(e),this.startTime||(this.startTime=e,this._phased||(this._initPhases(),this._phased=!0)),this._updateHeartRateDrift(e),this._spawnRuns(e);for(let n=this.runs.length-1;n>=0;n--){const c=this.runs[n],h=this.traces[c.traceIndex],b=h.beatInterval+this._trailDur(h)+this._trailFade(h);e-c.startTime>b&&this.runs.splice(n,1)}for(const n of this.traces){n._lastBeatEvalTime||(n._lastBeatEvalTime=e);let c=e-n._lastBeatEvalTime;for(c<0&&(c=0),n.phaseProgress+=c;n.phaseProgress>=n.beatInterval;)n.phaseProgress-=n.beatInterval,n.beatCount++;n._lastBeatEvalTime=e}const t=this.gl;t.viewport(0,0,this.canvas.width,this.canvas.height),t.disable(t.DEPTH_TEST),t.enable(t.BLEND),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT);const a=this.cfg,o=Math.min(this.runs.length,A);for(let n=0;n<o;n++){const c=this.runs[n];this._u_runStart[n]=c.startTime,this._u_runTraceIndex[n]=c.traceIndex}for(let n=o;n<A;n++)this._u_runStart[n]=0,this._u_runTraceIndex[n]=0;for(let n=0;n<this.traces.length;n++)this._u_beatIntervals[n]=this.traces[n].beatInterval;for(let n=this.traces.length;n<H;n++)this._u_beatIntervals[n]=0;t.useProgram(this.progTrace),t.bindVertexArray(this.vaoTrace);const i=n=>this._uloc[n];t.uniform1f(i("u_time"),e),t.uniform1i(i("u_t_cols"),a.cols),t.uniform1i(i("u_t_rows"),a.rows),t.uniform1f(i("u_t_canvasW"),this.canvas.width),t.uniform1f(i("u_t_canvasH"),this.canvas.height),t.uniform1f(i("u_t_cellMargin"),4),t.uniform1f(i("u_t_pathW"),this.pathBox.width),t.uniform1f(i("u_t_pathH"),this.pathBox.height),t.uniform1f(i("u_viewportHorizontalPadding"),a.viewportHorizontalPadding),t.uniform1f(i("u_viewportVerticalPadding"),a.viewportVerticalPadding),t.uniform1f(i("u_edgeFade"),a.edgeSpatialFade);const s=Math.min(.95,Math.max(.05,this.cfg.trailLifePercent/100)),r=s*(350/650),f=Math.max(1e-4,s-r);t.uniform1f(i("u_trailVisibleFrac"),r),t.uniform1f(i("u_trailFadeFrac"),f),t.uniform1i(i("u_t_flipY"),1),t.uniform1f(i("u_edgeFeather"),a.edgeFeather),t.uniform1f(i("u_noiseAmp"),.35),t.uniform1fv(i("u_beatInterval"),this._u_beatIntervals),t.uniform1fv(i("u_runStart"),this._u_runStart),t.uniform1iv(i("u_runTraceIndex"),this._u_runTraceIndex),t.uniform4fv(i("u_colCore"),this._colorCore),t.blendFunc(t.SRC_ALPHA,t.ONE_MINUS_SRC_ALPHA),t.uniform1i(i("u_isHeadPass"),0),t.uniform1f(i("u_lineHalfWidth"),a.lineWidth*.5),t.drawElementsInstanced(t.TRIANGLES,this.indexCount,this.indexType,0,o),t.blendFunc(t.SRC_ALPHA,t.ONE),t.uniform1i(i("u_isHeadPass"),1),t.uniform1f(i("u_lineHalfWidth"),(a.headDotRadius||a.lineWidth*1.4)*.5),t.drawArraysInstanced(t.POINTS,0,this.vertCount,o),t.bindVertexArray(null);const d=t.getError();d!==t.NO_ERROR&&console.warn("[MultiECGBatchGL] glError",d.toString(16))}totalBeats(){return this.traces.reduce((e,t)=>e+t.beatCount,0)}dispose(){const e=this.gl;if(e)try{this.vboTrace&&e.deleteBuffer(this.vboTrace),this.ibo&&e.deleteBuffer(this.ibo),this.vaoTrace&&e.deleteVertexArray(this.vaoTrace),this.progTrace&&e.deleteProgram(this.progTrace)}catch(t){console.warn("dispose error",t)}}}class wt{constructor(e){this.batch=e,this._running=!1,this._loop=this._loop.bind(this)}start(){this._running||(this._running=!0,requestAnimationFrame(this._loop))}stop(){this._running=!1}_loop(e){this._running&&(this.batch.step(e),requestAnimationFrame(this._loop))}}function Rt(l,e){let t=l.replace("#","");t.length===3&&(t=t.split("").map(s=>s+s).join(""));const a=parseInt(t.slice(0,2),16)/255,o=parseInt(t.slice(2,4),16)/255,i=parseInt(t.slice(4,6),16)/255;return[a,o,i,e]}class vt{constructor(){this.modules=new Map,this.globalConfig={},this.autoConfig=new Map}registerModule(e,t,a={}){return this.modules.set(e,{object:t,metadata:a,instance:null}),this.scanForConfigVars(e,t,a),this}scanForConfigVars(e,t,a={}){const o=[];for(const[i,s]of Object.entries(t))if(this.isConfigObject(s)){const r=a[i]||{};o.push({name:i,key:i,config:s,...r})}o.length>0&&this.autoConfig.set(e,o)}isConfigObject(e){return e&&typeof e=="object"&&!Array.isArray(e)&&e.type&&typeof e.value<"u"}inferMetadata(e,t){const a={type:this.inferType(t)};return e.includes("size")||e.includes("width")||e.includes("height")?(a.min=.5,a.max=e.includes("size")?60:200,a.step=e.includes("size")?1:2):e.includes("percent")||e.includes("trail")||e.includes("overlap")?(a.min=0,a.max=e.includes("percent")?100:200,a.step=1):e.includes("rate")||e.includes("heart")?(a.min=30,a.max=200,a.step=1):e.includes("padding")||e.includes("margin")?(a.min=0,a.max=.2,a.step=.01):(e.includes("glow")||e.includes("feather")||e.includes("fade"))&&(a.min=0,a.max=e.includes("glow")?24:1,a.step=e.includes("glow")?.5:.01),a}inferType(e){return typeof e=="boolean"?"checkbox":typeof e=="number"?"range":typeof e=="string"&&e.startsWith("#")?"color":Array.isArray(e)?"select":"text"}getOverlaySections(){const e=[];for(const[t,a]of this.autoConfig){if(a.length===0)continue;const o=a.map(i=>({type:i.config.type,name:`${t}.${i.name}`,label:i.config.label||this.formatLabel(i.name),value:i.config.value,min:i.config.min,max:i.config.max,step:i.config.step,options:i.config.options}));e.push({title:this.formatLabel(t),fields:o})}for(const[t,a]of this.modules){const{definition:o}=a;if(o)if(o.getSections){const i=o.getSections(a.instance);e.push(...i)}else o.sections&&e.push(...o.sections)}return e}formatLabel(e){return e.replace(/([A-Z])/g," $1").replace(/^./,t=>t.toUpperCase()).replace(/([a-z])([A-Z])/g,"$1 $2").trim()}getOnChangeHandler(){return(e,t)=>{const[a,o]=e.split(".");if(this.autoConfig.has(a)){const s=this.autoConfig.get(a).find(r=>r.name===o);if(s){const r=this.modules.get(a);if(r&&r.object)return r.object[s.key].value=t,r.metadata.onChange&&r.metadata.onChange(o,t,r.instance),this.refreshModule(a),!0}}for(const[i,s]of this.modules){const{definition:r,instance:f}=s;if(r&&r.onChange&&r.onChange(e,t,f))return!0}return!1}}refreshModule(e){const t=this.modules.get(e);t&&t.instance&&(typeof t.instance.updateConfig=="function"?t.instance.updateConfig(this.getModuleConfig(e)):typeof t.instance.refresh=="function"&&t.instance.refresh())}setModuleInstance(e,t){return this.modules.has(e)&&(this.modules.get(e).instance=t),this}getModuleConfig(e){const t=this.modules.get(e);if(!t)return{};const a={};return this.autoConfig.has(e)&&this.autoConfig.get(e).forEach(i=>{a[i.name]=t.object[i.key].value}),t.definition&&t.definition.getCurrentValues&&Object.assign(a,t.definition.getCurrentValues(t.instance)),a}updateModuleConfig(e,t){const a=this.modules.get(e);if(a){if(this.autoConfig.has(e)){const o=this.autoConfig.get(e);Object.entries(t).forEach(([i,s])=>{const r=o.find(f=>f.name===i);r&&(a.object[r.key].value=s)})}a.definition&&a.definition.updateConfig&&a.definition.updateConfig(t,a.instance),this.refreshModule(e)}}}const V=new vt;class bt{constructor(){this.overlayEl=null,this.open=!1,this.fpsEnabled=!1,this.fpsEl=null,this.lastFpsSample=performance.now(),this.frames=0,this.smoothFps=null,this.boundLoop=null,this.initialized=!1,this.title="Configuration"}init(){this.initialized||(this.ensureOverlayElement(),this.setupGlobalHotkeys(),this.startFpsLoop(),this.initialized=!0)}configure(e){this.title=e.title||"Configuration",this.updateOverlayContent(),this.setupConfigForm()}updateOverlayContent(){if(!this.overlayEl)return;const e=this.overlayEl.querySelector("#config-content");if(!e)return;const t=V.getOverlaySections();e.innerHTML=this.generateConfigHTML(t)}generateConfigHTML(e){return!e||e.length===0?"<p>No configuration options available</p>":e.map(t=>{const a=t.fields.map(o=>this.generateFieldHTML(o)).join("");return`
        <fieldset>
          <legend>${t.title}</legend>
          ${a}
        </fieldset>
      `}).join("")}generateFieldHTML(e){const{type:t,name:a,label:o,value:i,min:s,max:r,step:f,options:d}=e,n=`field-${a}`;switch(t){case"range":return`
          <label>
            ${o}
            <input type="range" name="${a}" id="${n}" min="${s||0}" max="${r||100}" step="${f||1}" value="${i||50}" data-val />
          </label>
        `;case"color":return`
          <label>
            ${o}
            <input type="color" name="${a}" id="${n}" value="${i||"#00ff6a"}" />
          </label>
        `;case"checkbox":return`
          <label>
            <input type="checkbox" name="${a}" id="${n}" ${i?"checked":""} />
            ${o}
          </label>
        `;case"select":const c=d?d.map(h=>`<option value="${h.value}" ${h.value===i?"selected":""}>${h.label}</option>`).join(""):"";return`
          <label>
            ${o}
            <select name="${a}" id="${n}">${c}</select>
          </label>
        `;case"number":return`
          <label>
            ${o}
            <input type="number" name="${a}" id="${n}" min="${s||0}" max="${r||100}" step="${f||1}" value="${i||0}" />
          </label>
        `;default:return""}}setupGlobalHotkeys(){document.addEventListener("keydown",e=>{e.altKey&&(e.code==="KeyP"&&(e.preventDefault(),e.stopPropagation(),this.toggleFps()),e.code==="KeyC"&&(e.preventDefault(),e.stopPropagation(),this.toggleOverlay()))},{passive:!1})}toggleOverlay(e){this.open=typeof e=="boolean"?e:!this.open,this.overlayEl&&(this.overlayEl.style.display=this.open?"flex":"none")}toggleFps(){this.fpsEnabled=!this.fpsEnabled,this.fpsEl&&(this.fpsEl.style.display=this.fpsEnabled?"block":"none")}startFpsLoop(){this.boundLoop||(this.fpsEl=document.getElementById("fps-counter")||this.createFloatingFps(),this.fpsEl.style.display="none",this.boundLoop=e=>{if(this.frames++,e-this.lastFpsSample>1e3){const t=this.frames*1e3/(e-this.lastFpsSample);this.frames=0,this.lastFpsSample=e,this.smoothFps=this.smoothFps?this.smoothFps*.7+t*.3:t,this.fpsEnabled&&(this.fpsEl.textContent="FPS: "+this.smoothFps.toFixed(0))}requestAnimationFrame(this.boundLoop)},requestAnimationFrame(this.boundLoop))}createFloatingFps(){const e=document.createElement("div");return e.id="fps-counter",e.textContent="FPS: --",e.style.position="fixed",e.style.top="58px",e.style.right="12px",e.style.zIndex="1000",e.style.font="12px Roboto, monospace",e.style.padding="4px 8px",e.style.background="rgba(0,0,0,0.4)",e.style.border="1px solid rgba(0,255,106,0.35)",e.style.borderRadius="6px",e.style.color="var(--accent)",document.body.appendChild(e),e}setupConfigForm(){if(!this.overlayEl)return;const e=this.overlayEl.querySelector("#config-form");e&&(e.querySelectorAll("[data-bound]").forEach(t=>{t.dataset.bound=""}),e.querySelectorAll("input[type=range][data-val]").forEach(t=>{if(!t.parentElement.querySelector(".val")){const a=document.createElement("span");a.className="val",a.textContent=t.value,t.parentElement.appendChild(a)}if(!t.dataset.bound){const a=t.parentElement.querySelector(".val");t.addEventListener("input",()=>{a.textContent=t.value,this.applyChange(t.name,t.value)}),t.dataset.bound="1"}}),e.querySelectorAll("input[type=color]").forEach(t=>{t.dataset.bound||(t.addEventListener("input",()=>this.applyChange(t.name,t.value)),t.dataset.bound="1")}),e.querySelectorAll("input[type=checkbox]").forEach(t=>{t.dataset.bound||(t.addEventListener("change",()=>this.applyChange(t.name,t.checked)),t.dataset.bound="1")}),e.querySelectorAll("select").forEach(t=>{t.dataset.bound||(t.addEventListener("change",()=>this.applyChange(t.name,t.value)),t.dataset.bound="1")}),e.querySelectorAll("input[type=number]").forEach(t=>{t.dataset.bound||(t.addEventListener("input",()=>this.applyChange(t.name,parseFloat(t.value))),t.dataset.bound="1")}))}applyChange(e,t){const a=V.getOnChangeHandler();a&&a(e,t)}ensureOverlayElement(){if(this.overlayEl)return;const e=document.createElement("div");e.id="config-overlay",e.innerHTML=this.overlayHTML(),document.body.appendChild(e),this.overlayEl=e;const t=e.querySelector("[data-close]");t&&t.addEventListener("click",()=>this.toggleOverlay(!1)),e.style.display="none"}overlayHTML(){return`
      <div class="config-header">
        <h3>${this.title}</h3>
        <div class="buttons">
          <button data-close title="Close (Alt+C)">✕</button>
        </div>
      </div>
      <div class="config-scroll">
        <form id="config-form" autocomplete="off">
          <div id="config-content">
            <!-- Dynamic content will be inserted here -->
          </div>
          <div class="foot">Hotkeys: <kbd>Alt+C</kbd> config, <kbd>Alt+P</kbd> FPS</div>
        </form>
      </div>
    `}}const it=new bt;function Tt(l){it.init(),it.configure(l)}function St(l,e,t={}){return V.registerModule(l,e,t),V}const nt="config-style",q=`/* Generic Config Overlay (update-safe) */
#config-overlay{position:fixed;top:0;left:0;display:flex;align-items:stretch;justify-content:flex-start;pointer-events:none;z-index:1500;font:16px Roboto,system-ui,sans-serif;line-height:1.25;}
#config-overlay .config-scroll{width:360px;max-width:92vw;height:100vh;overflow:auto;background:#121212f2;border-right:1px solid rgba(0,255,106,0.4);box-shadow:8px 0 28px -6px rgba(0,0,0,0.7);padding:22px 20px 92px;pointer-events:auto;}
#config-overlay h3{margin:0;font-weight:600;letter-spacing:.85px;color:var(--accent);font-size:21px;text-shadow:0 0 10px rgba(0,255,106,.65);}
#config-overlay fieldset{border:1px solid rgba(0,255,106,0.28);border-radius:12px;margin:16px 0 26px;padding:14px 16px 16px;display:flex;flex-direction:column;gap:14px;}
#config-overlay legend{padding:0 9px;font-size:14px;letter-spacing:.75px;color:var(--accent-soft);}
#config-overlay label{display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--text-dim);}
#config-overlay input[type=range]{width:100%;}
#config-overlay .val{font-family:monospace;color:var(--accent);font-size:13px;}
#config-overlay .config-header{position:fixed;top:0;left:0;width:360px;display:flex;align-items:center;justify-content:space-between;padding:16px 20px 14px;background:linear-gradient(180deg,#141414,#121212cc);box-shadow:0 4px 12px -6px rgba(0,0,0,0.55);pointer-events:auto;}
#config-overlay .buttons button{background:#161616;border:1px solid rgba(0,255,106,0.6);color:var(--accent);cursor:pointer;font-size:15px;padding:7px 12px;border-radius:8px;line-height:1;transition:background .15s;}
#config-overlay .buttons button:hover{background:#242424;}
#config-overlay form{margin-top:70px;}
#config-overlay .foot{font-size:13px;color:var(--text-dim);margin-top:10px;opacity:.95;}
#config-overlay kbd{background:#222;border:1px solid rgba(255,255,255,0.22);border-radius:5px;padding:3px 6px;font-size:12px;margin:0 2px;box-shadow:0 0 0 1px #000;}
#config-overlay select{width:100%;padding:4px 8px;border:1px solid rgba(0,255,106,0.3);border-radius:4px;background:#161616;color:var(--text-dim);}
#config-overlay input[type=number]{width:100%;padding:4px 8px;border:1px solid rgba(0,255,106,0.3);border-radius:4px;background:#161616;color:var(--text-dim);}
@media (max-width: 680px){#config-overlay .config-scroll{width:94vw;}}`;let w=document.getElementById(nt);w?w.textContent!==q&&(w.textContent=q):(w=document.createElement("style"),w.id=nt,w.textContent=q,document.head.appendChild(w));export{wt as B,Ct as M,Tt as c,yt as d,xt as e,Rt as h,St as r};
