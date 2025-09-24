const nt="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20665.19684%20283.46457'%3e%3c!--%20Extended%20baseline%20left%20(+120%20units)%20and%20right%20(+120%20units)%20around%20original%20waveform%20--%3e%3cpath%20d='M%200,212.91825%20L%20120,212.91825%20L%20127.994723,212.91825%20L%20170.295515,212.96707%20C%20170.845515,212.56298%20173.366592,209.70567%20174.432211,207.61251%20C%20176.856071,202.85141%20187.517198,192.00825%20190.761002,190.44424%20C%20193.077648,189.32726%20196.961291,190.229%20199.110464,191.3083%20C%20203.295033,193.40975%20211.684885,201.48277%20216.711179,208.07369%20L%20221.6534,212.96707%20L%20242.07837,212.91825%20L%20244.8981,219.16825%20C%20252.38138,235.75509%20253.17959,236.81027%20255.82894,233.618%20C%20256.77263,232.48092%20260.99472,136.34104%20260.99472,115.98961%20C%20260.99472,99.631005%20262.17373,115.52793%20265.47388,176.38366%20C%20267.70186,217.46813%20269.45992,242.77385%20270.14341,243.59741%20C%20270.74632,244.32387%20271.81084,244.91825%20272.509,244.91825%20C%20273.20717,244.91825%20277.61499,237.07638%20282.30415,227.49188%20L%20290.82991,210.06551%20L%20295.16232,209.50926%20C%20299.09064,209.00489%20333.09981,206.18407%20334.7929,206.19593%20C%20335.1842,206.19867%20337.39478,204.14626%20337.97796,201.98049%20C%20340.16036,193.87568%20352.73129,181.80678%20364.99472,176.04268%20C%20369.75712,173.80423%20372.12563,173.40792%20382.6558,173.08752%20C%20402.32457,172.48905%20411.59185,175.356%20422.92465,185.54516%20C%20428.83349,190.85772%20437.35747,203.28768%20438.56003,205.71063%20C%20440.98729,210.60115%20443.88177,210.44532%20447.73276,210.63559%20C%20452.44569,210.86845%20457.55213,208.80775%20460.72341,207.33241%20C%20463.14974,206.20363%20472.82566,201.84404%20478.06891,201.22306%20C%20483.54219,200.57483%20488.4693,201.66908%20498.67185,208.45172%20L%20505.46389,212.96707%20L%20534.69492,212.96707%20L%20545.19684,212.96707%20L%20665.19684,212.91825'%20fill='none'%20stroke='%2300ff00'%20stroke-width='4.25'%20stroke-linecap='round'%20stroke-linejoin='round'%20/%3e%3c/svg%3e";let X=!1,D=null,Y=[],B=null,Q=0,tt=null;const st=3200;function U(s,e){if(!s)return`rgba(0,255,106,${e})`;let t=s.replace("#","");t.length===3&&(t=t.split("").map(l=>l+l).join(""));const i=parseInt(t.substring(0,2),16),n=parseInt(t.substring(2,4),16),a=parseInt(t.substring(4,6),16);return`rgba(${i},${n},${a},${e})`}async function lt({sampleResolution:s=st}={}){if(!X)return D||(D=(async()=>{const t=await(await fetch(nt)).text(),n=new DOMParser().parseFromString(t,"image/svg+xml");if(B=n.querySelector("path"),!B)throw new Error("Path not found in SVG");Q=B.getTotalLength();const a=n.querySelector("svg").getAttribute("viewBox").split(" ").map(Number);tt={x:a[0],y:a[1],width:a[2],height:a[3]},Y=[];for(let l=0;l<=s;l++){const o=l/s,u=B.getPointAtLength(o*Q);Y.push({x:u.x,y:u.y,norm:o})}X=!0})(),D)}function dt(s,e){const t=s.getContext("2d");if(!t)return;const i=s.parentElement,n=i?i.getBoundingClientRect():null,a=n?n.width:s.clientWidth||s.width,l=n?n.height:s.clientHeight||s.height,o=window.devicePixelRatio||1;(s.width!==a*o||s.height!==l*o)&&(s.width=a*o,s.height=l*o,s.style.width=a+"px",s.style.height=l+"px"),t.setTransform(o,0,0,o,0,0),t.clearRect(0,0,a,l);const{rows:u=1,cols:h=1,gridSize:r=100,gridColorMajor:c="#00ff6a",gridColorPanel:v="#00ff6a",showGridOuterBox:b=!0,showGridLines:R=!0,showGridBackground:T=!0,gridGapPercent:I=4,viewportHorizontalPadding:M=.05,viewportVerticalPadding:y=.05}=e;t.fillStyle="#0d0d0d",t.fillRect(0,0,a,l);const C=a,F=C*M,w=C*y,A=a-2*F,E=l-2*w,W=A/h,H=(u===1&&h===1?0:I)/100,$=W*H,q=W*H,at=$*(h-1),it=q*(u-1),_=(A-at)/h,g=(E-it)/u,K=r,V=Math.max(1,Math.round(_/K)),N=Math.max(1,Math.round(g/K)),O=_/V,G=g/N,L=5,rt=O/L,ot=G/L;for(let z=0;z<u;z++)for(let k=0;k<h;k++){const p=F+k*(_+$),m=w+z*(g+q);if(t.save(),t.beginPath(),t.rect(p,m,_,g),t.clip(),R){t.strokeStyle=U(c,.12),t.lineWidth=1;for(let f=0;f<V;f++)for(let d=1;d<L;d++){const x=p+f*O+d*rt;x>=p+_-.5||(t.beginPath(),t.moveTo(x,m),t.lineTo(x,m+g),t.stroke())}for(let f=0;f<N;f++)for(let d=1;d<L;d++){const x=m+f*G+d*ot;x>=m+g-.5||(t.beginPath(),t.moveTo(p,x),t.lineTo(p+_,x),t.stroke())}t.strokeStyle=U(c,.12),t.lineWidth=1;for(let f=1;f<V;f++){const d=p+f*O;d>=p+_-.5||(t.beginPath(),t.moveTo(d,m),t.lineTo(d,m+g),t.stroke())}for(let f=1;f<N;f++){const d=m+f*G;d>=m+g-.5||(t.beginPath(),t.moveTo(p,d),t.lineTo(p+_,d),t.stroke())}}if(t.restore(),T){const f=t.createRadialGradient(p+_*.55,m+g*.5,0,p+_*.55,m+g*.5,Math.max(_,g)*.45);f.addColorStop(0,"rgba(0,255,106,0.055)"),f.addColorStop(.45,"rgba(0,255,106,0.015)"),f.addColorStop(1,"rgba(0,255,106,0)"),t.fillStyle=f,t.fillRect(p,m,_,g)}b&&(t.strokeStyle=U(v,.24),t.lineWidth=.75,t.strokeRect(p+.35,m+.35,_-.7,g-.7))}}async function _t(s){await lt(s||{})}function ct(){return{sampled:Y,viewBox:tt}}function J(){return X}const P=300,et=3,S=P*et,ft=`#version 300 es
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
uniform float u_beatInterval[${P}];
uniform int u_runTraceIndex[${S}];
uniform float u_runStart[${S}];
// Normalized trail fractions behind head (path-relative, independent of beat duration)
uniform float u_trailVisibleFrac; // portion of path behind head at full alpha
uniform float u_trailFadeFrac;    // following portion that eases to zero
uniform float u_lineHalfWidth; // varies per pass
uniform bool u_isHeadPass; // minimal head dot pass flag
uniform bool u_t_flipY;
uniform float u_noiseAmp; // micro jitter amplitude (pixels)
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
}`,ht=`#version 300 es
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
}`;function Z(s,e,t){const i=s.createShader(e);if(s.shaderSource(i,t),s.compileShader(i),!s.getShaderParameter(i,s.COMPILE_STATUS))throw new Error(s.getShaderInfoLog(i));return i}function ut(s,e,t){const i=s.createProgram();if(s.attachShader(i,Z(s,35633,e)),s.attachShader(i,Z(s,35632,t)),s.linkProgram(i),!s.getProgramParameter(i,35714))throw new Error(s.getProgramInfoLog(i));return i}class gt{constructor(e,t){if(this.canvas=e,this.gl=e.getContext("webgl2",{antialias:!0,premultipliedAlpha:!1}),!this.gl)throw new Error("WebGL2 required");this.cfg=Object.assign({rows:8,cols:10,heartRateMean:85,heartRateStd:30,heartRateMin:48,heartRateMax:185,overlapPercent:15,trailLifePercent:65,maxRunsPerTrace:et,lineWidth:4,headDotRadius:10,colorCore:[0,1,0,.95],edgeSpatialFade:.06,edgeFeather:.22,viewportHorizontalPadding:.05,viewportVerticalPadding:.05,heartRateDrift:!0,heartRateDriftRange:2,heartRateDriftMinMs:6e3,heartRateDriftMaxMs:14e3,heartRateMode:"auto",manualHeartRate:85,gridSize:100,showGrid:!0,gridColor:"#00ff6a",activeTracePercentage:.85,renderWidth:null,renderHeight:null},t||{}),this._colorCore=new Float32Array(this.cfg.colorCore),this.dpr=window.devicePixelRatio||1,this.traces=[],this.runs=[],this.lastSpawnTimes=new Float64Array(P),this._buildPrograms(),this._cacheUniforms(),this._buildGeometry(),this._initTraces(),this._u_runStart=new Float32Array(S),this._u_runTraceIndex=new Int32Array(S),this._u_beatIntervals=new Float32Array(P)}setHeartRateMode(e){(e==="auto"||e==="manual")&&(this.cfg.heartRateMode=e,e==="manual"&&this.setManualHeartRate(this.cfg.manualHeartRate))}setManualHeartRate(e){if(this.cfg.manualHeartRate=Math.max(this.cfg.heartRateMin,Math.min(this.cfg.heartRateMax,e)),this.cfg.heartRateMode==="manual")for(const t of this.traces)t.baseHeartRate=this.cfg.manualHeartRate,t.heartRate=this.cfg.manualHeartRate,t.beatInterval=6e4/this.cfg.manualHeartRate,t.driftStart=0}getCurrentHeartRate(){return this.cfg.heartRateMode==="manual"?this.cfg.manualHeartRate:this.traces.length===0?this.cfg.heartRateMean:this.traces.reduce((t,i)=>t+i.heartRate,0)/this.traces.length}updateConfig(e){const t={...this.cfg};Object.assign(this.cfg,e),e.colorCore&&(this._colorCore=new Float32Array(this.cfg.colorCore)),e.heartRateMode!==void 0&&e.heartRateMode!==t.heartRateMode&&this.setHeartRateMode(e.heartRateMode),e.manualHeartRate!==void 0&&this.cfg.heartRateMode==="manual"&&this.setManualHeartRate(e.manualHeartRate),e.activeTracePercentage!==void 0&&e.activeTracePercentage!==t.activeTracePercentage&&this._rebuildTraces(),(e.rows!==void 0&&e.rows!==t.rows||e.cols!==void 0&&e.cols!==t.cols)&&this._rebuildTraces()}updateDimensions(e,t){this.cfg.renderWidth=e,this.cfg.renderHeight=t,this.resize()}_rebuildTraces(){this.traces=[],this.runs=[],this.lastSpawnTimes=new Float64Array(P),this._initTraces(),this._seeded=!1}_randn(){let e=0,t=0;for(;!e;)e=Math.random();for(;!t;)t=Math.random();return Math.sqrt(-2*Math.log(e))*Math.cos(2*Math.PI*t)}_initTraces(){const e=this.cfg,t=e.rows*e.cols;for(let i=0;i<t;i++){const n=this._randn();let a=e.heartRateMean+n*e.heartRateStd;a=Math.min(e.heartRateMax,Math.max(e.heartRateMin,a)),Math.random()<e.activeTracePercentage||(a=0),this.traces.push({initialBaseHeartRate:a,baseHeartRate:a,heartRate:a,beatInterval:a>0?6e4/a:Number.MAX_SAFE_INTEGER,beatCount:0,driftFrom:a,driftTo:a,driftStart:0,driftDuration:1})}}_scheduleNextDrift(e,t){if(e.beatInterval>=Number.MAX_SAFE_INTEGER/2)return;const i=this.cfg,n=i.heartRateDriftRange||0,a=Math.max(1,e.baseHeartRate-n),l=e.baseHeartRate+n;let o;do o=a+Math.random()*(l-a);while(Math.abs(o-e.heartRate)<.15);e.driftFrom=e.heartRate,e.driftTo=o,e.driftStart=t;const u=i.heartRateDriftMinMs+Math.random()*(i.heartRateDriftMaxMs-i.heartRateDriftMinMs);e.driftDuration=Math.max(1e3,u)}_updateHeartRateDrift(e){if(!(!this.cfg.heartRateDrift||this.cfg.heartRateMode!=="auto"))for(const t of this.traces){if(t.beatInterval>=Number.MAX_SAFE_INTEGER/2)continue;t.driftStart||this._scheduleNextDrift(t,e);const i=(e-t.driftStart)/t.driftDuration;if(i>=1)t.heartRate=t.driftTo,t.beatInterval=6e4/t.heartRate,this._scheduleNextDrift(t,e);else if(i>=0){const n=i*i*(3-2*i);t.heartRate=t.driftFrom+(t.driftTo-t.driftFrom)*n,t.beatInterval=6e4/t.heartRate}}}_initPhases(){for(const e of this.traces)e.phaseShift=Math.random()*e.beatInterval,e.phaseProgress=e.phaseShift,e._lastBeatEvalTime=0}ensureInitialRuns(e){if(!this._seeded){for(let t=0;t<this.traces.length;t++)this.runs.push({traceIndex:t,startTime:e,counted:!1});this._seeded=!0}}resize(){const e=this.cfg.renderWidth||this.canvas.clientWidth||window.innerWidth,t=this.cfg.renderHeight||this.canvas.clientHeight||window.innerHeight;(this.canvas.width!==e*this.dpr||this.canvas.height!==t*this.dpr)&&(this.canvas.width=e*this.dpr,this.canvas.height=t*this.dpr,this.canvas.style.width=e+"px",this.canvas.style.height=t+"px",this.canvas.style.display="block")}_buildPrograms(){const e=this.gl;this.progTrace=ut(e,ft,ht)}_cacheUniforms(){const e=this.gl,t=this.progTrace,i=["u_time","u_t_cols","u_t_rows","u_t_canvasW","u_t_canvasH","u_t_cellMargin","u_t_pathW","u_t_pathH","u_edgeFade","u_trailVisibleFrac","u_trailFadeFrac","u_t_flipY","u_edgeFeather","u_noiseAmp","u_beatInterval","u_runStart","u_runTraceIndex","u_colCore","u_isHeadPass","u_lineHalfWidth","u_viewportHorizontalPadding","u_viewportVerticalPadding"];this._uloc={};for(const n of i)this._uloc[n]=e.getUniformLocation(t,n)}_buildGeometry(){if(!J())return;const{sampled:e,viewBox:t}=ct();this.pathBox=t;const i=e.length,n=new Float32Array(i*2*7);let a=0;for(let r=0;r<i;r++){const c=e[r],v=e[r&&r-1],b=e[r<i-1?r+1:r];let R=c.x-v.x,T=c.y-v.y;const I=Math.hypot(R,T)||1;R/=I,T/=I;let M=b.x-c.x,y=b.y-c.y;const C=Math.hypot(M,y)||1;M/=C,y/=C;const F=Math.min(1,Math.hypot(M-R,y-T)*.5);let w=b.x-v.x,A=b.y-v.y;const E=Math.hypot(w,A)||1;w/=E,A/=E;const W=-A,j=w;for(let H=-1;H<=1;H+=2)n[a++]=c.x,n[a++]=c.y,n[a++]=c.norm,n[a++]=H,n[a++]=W,n[a++]=j,n[a++]=F}const l=new Uint16Array((i-1)*6);for(let r=0,c=0;r<i-1;r++){const v=2*r,b=2*r+1,R=2*(r+1),T=2*(r+1)+1;l[c++]=v,l[c++]=b,l[c++]=R,l[c++]=b,l[c++]=T,l[c++]=R}this.vertCount=i*2,this.indexType=this.gl.UNSIGNED_SHORT,this.indexCount=l.length;const o=this.gl;this.vaoTrace=o.createVertexArray(),o.bindVertexArray(this.vaoTrace),this.vboTrace=o.createBuffer(),o.bindBuffer(o.ARRAY_BUFFER,this.vboTrace),o.bufferData(o.ARRAY_BUFFER,n,o.STATIC_DRAW);const u=28;let h=0;o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,u,h),h+=8,o.enableVertexAttribArray(1),o.vertexAttribPointer(1,1,o.FLOAT,!1,u,h),h+=4,o.enableVertexAttribArray(2),o.vertexAttribPointer(2,1,o.FLOAT,!1,u,h),h+=4,o.enableVertexAttribArray(3),o.vertexAttribPointer(3,2,o.FLOAT,!1,u,h),h+=8,o.enableVertexAttribArray(4),o.vertexAttribPointer(4,1,o.FLOAT,!1,u,h),this.ibo=o.createBuffer(),o.bindBuffer(o.ELEMENT_ARRAY_BUFFER,this.ibo),o.bufferData(o.ELEMENT_ARRAY_BUFFER,l,o.STATIC_DRAW),o.bindVertexArray(null)}_spawnRuns(e){this.cfg;for(let t=0;t<this.traces.length;t++){const n=this.traces[t].beatInterval;this.lastSpawnTimes[t]||(this.lastSpawnTimes[t]=e),(e-this.lastSpawnTimes[t]>=n||!this._traceHasActive(t,e))&&(this._addRun(t,e),this.lastSpawnTimes[t]=e)}}_traceHasActive(e,t){for(const i of this.runs)if(i.traceIndex===e){const n=this.traces[e],a=n.beatInterval+this._trailDur(n)+this._trailFade(n);if(t-i.startTime<a)return!0}return!1}_addRun(e,t){let i=0,n=-1,a=1/0;for(let l=0;l<this.runs.length;l++){const o=this.runs[l];o.traceIndex===e&&(i++,o.startTime<a&&(a=o.startTime,n=l))}i>=this.cfg.maxRunsPerTrace&&n>=0&&this.runs.splice(n,1),this.runs.push({traceIndex:e,startTime:t,counted:!1})}_trailDur(e){return this.cfg.trailLifePercent/100*e.beatInterval*(350/650)}_trailFade(e){return this.cfg.trailLifePercent/100*e.beatInterval-this._trailDur(e)}step(e){if(!J())return;this.vertCount||this._buildGeometry(),this.resize(),this.ensureInitialRuns(e),this.startTime||(this.startTime=e,this._phased||(this._initPhases(),this._phased=!0)),this._updateHeartRateDrift(e),this._spawnRuns(e);for(let r=this.runs.length-1;r>=0;r--){const c=this.runs[r],v=this.traces[c.traceIndex],b=v.beatInterval+this._trailDur(v)+this._trailFade(v);e-c.startTime>b&&this.runs.splice(r,1)}for(const r of this.traces){r._lastBeatEvalTime||(r._lastBeatEvalTime=e);let c=e-r._lastBeatEvalTime;for(c<0&&(c=0),r.phaseProgress+=c;r.phaseProgress>=r.beatInterval;)r.phaseProgress-=r.beatInterval,r.beatCount++;r._lastBeatEvalTime=e}const t=this.gl;t.viewport(0,0,this.canvas.width,this.canvas.height),t.disable(t.DEPTH_TEST),t.enable(t.BLEND),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT);const i=this.cfg,n=Math.min(this.runs.length,S);for(let r=0;r<n;r++){const c=this.runs[r];this._u_runStart[r]=c.startTime,this._u_runTraceIndex[r]=c.traceIndex}for(let r=n;r<S;r++)this._u_runStart[r]=0,this._u_runTraceIndex[r]=0;for(let r=0;r<this.traces.length;r++)this._u_beatIntervals[r]=this.traces[r].beatInterval;for(let r=this.traces.length;r<P;r++)this._u_beatIntervals[r]=0;t.useProgram(this.progTrace),t.bindVertexArray(this.vaoTrace);const a=r=>this._uloc[r];t.uniform1f(a("u_time"),e),t.uniform1i(a("u_t_cols"),i.cols),t.uniform1i(a("u_t_rows"),i.rows),t.uniform1f(a("u_t_canvasW"),this.canvas.width),t.uniform1f(a("u_t_canvasH"),this.canvas.height),t.uniform1f(a("u_t_cellMargin"),4),t.uniform1f(a("u_t_pathW"),this.pathBox.width),t.uniform1f(a("u_t_pathH"),this.pathBox.height),t.uniform1f(a("u_viewportHorizontalPadding"),i.viewportHorizontalPadding),t.uniform1f(a("u_viewportVerticalPadding"),i.viewportVerticalPadding),t.uniform1f(a("u_edgeFade"),i.edgeSpatialFade);const l=Math.min(.95,Math.max(.05,this.cfg.trailLifePercent/100)),o=l*(350/650),u=Math.max(1e-4,l-o);t.uniform1f(a("u_trailVisibleFrac"),o),t.uniform1f(a("u_trailFadeFrac"),u),t.uniform1i(a("u_t_flipY"),1),t.uniform1f(a("u_edgeFeather"),i.edgeFeather),t.uniform1f(a("u_noiseAmp"),.35),t.uniform1fv(a("u_beatInterval"),this._u_beatIntervals),t.uniform1fv(a("u_runStart"),this._u_runStart),t.uniform1iv(a("u_runTraceIndex"),this._u_runTraceIndex),t.uniform4fv(a("u_colCore"),this._colorCore),t.blendFunc(t.SRC_ALPHA,t.ONE_MINUS_SRC_ALPHA),t.uniform1i(a("u_isHeadPass"),0),t.uniform1f(a("u_lineHalfWidth"),i.lineWidth*.5),t.drawElementsInstanced(t.TRIANGLES,this.indexCount,this.indexType,0,n),t.blendFunc(t.SRC_ALPHA,t.ONE),t.uniform1i(a("u_isHeadPass"),1),t.uniform1f(a("u_lineHalfWidth"),(i.headDotRadius||i.lineWidth*1.4)*.5),t.drawArraysInstanced(t.POINTS,0,this.vertCount,n),t.bindVertexArray(null);const h=t.getError();h!==t.NO_ERROR&&console.warn("[MultiECGBatchGL] glError",h.toString(16))}totalBeats(){return this.traces.reduce((e,t)=>e+t.beatCount,0)}dispose(){const e=this.gl;if(e)try{this.vboTrace&&e.deleteBuffer(this.vboTrace),this.ibo&&e.deleteBuffer(this.ibo),this.vaoTrace&&e.deleteVertexArray(this.vaoTrace),this.progTrace&&e.deleteProgram(this.progTrace)}catch(t){console.warn("dispose error",t)}}}class pt{constructor(e){this.batch=e,this._running=!1,this._loop=this._loop.bind(this)}start(){this._running||(this._running=!0,requestAnimationFrame(this._loop))}stop(){this._running=!1}_loop(e){this._running&&(this.batch.step(e),requestAnimationFrame(this._loop))}}function mt(s,e){let t=s.replace("#","");t.length===3&&(t=t.split("").map(l=>l+l).join(""));const i=parseInt(t.slice(0,2),16)/255,n=parseInt(t.slice(2,4),16)/255,a=parseInt(t.slice(4,6),16)/255;return[i,n,a,e]}export{pt as B,gt as M,dt as d,_t as e,mt as h};
