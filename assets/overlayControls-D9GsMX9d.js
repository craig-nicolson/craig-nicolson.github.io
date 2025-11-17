(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const s of i.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function t(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(o){if(o.ep)return;o.ep=!0;const i=t(o);fetch(o.href,i)}})();class b{constructor(){this.modules=new Map,this.globalConfig={},this.autoConfig=new Map}registerModule(e,t,n={}){return this.modules.set(e,{object:t,metadata:n,instance:null}),this.scanForConfigVars(e,t,n),this}scanForConfigVars(e,t,n={}){const o=[];for(const[i,s]of Object.entries(t))if(this.isConfigObject(s)){const a=n[i]||{};o.push({name:i,key:i,config:s,...a})}o.length>0&&this.autoConfig.set(e,o)}isConfigObject(e){return e&&typeof e=="object"&&!Array.isArray(e)&&e.type&&typeof e.value<"u"}getOverlaySections(){const e=[];for(const[t,n]of this.autoConfig){if(n.length===0)continue;this.modules.get(t);const o=n.filter(s=>!0).map(s=>({type:s.config.type,name:`${t}.${s.name}`,label:s.config.label||s.name,value:s.config.value,min:s.config.min,max:s.config.max,step:s.config.step,options:s.config.options,section:s.config.section||"General"})),i={};o.forEach(s=>{const a=s.section||"General";i[a]||(i[a]=[]),i[a].push(s)}),Object.entries(i).forEach(([s,a])=>{a.length>0&&e.push({title:s,fields:a})})}for(const[t,n]of this.modules){const{definition:o}=n;if(o)if(o.getSections){const i=o.getSections(n.instance);e.push(...i)}else o.sections&&e.push(...o.sections)}return e}getOnChangeHandler(){return(e,t)=>{const[n,o]=e.split(".");if(this.autoConfig.has(n)){const s=this.autoConfig.get(n).find(a=>a.name===o);if(s){const a=this.modules.get(n);if(a&&a.object)return a.object[s.key].value=t,a.metadata.onChange&&a.metadata.onChange(o,t,a.instance),this.refreshModule(n),!0}}for(const[i,s]of this.modules){const{definition:a,instance:c}=s;if(a&&a.onChange&&a.onChange(e,t,c))return!0}return!1}}refreshModule(e){const t=this.modules.get(e);t&&t.instance&&(typeof t.instance.updateConfig=="function"?t.instance.updateConfig(this.getModuleConfig(e)):typeof t.instance.refresh=="function"&&t.instance.refresh())}setModuleInstance(e,t){return this.modules.has(e)&&(this.modules.get(e).instance=t),this}getModuleConfig(e){const t=this.modules.get(e);if(!t)return{};const n={};return this.autoConfig.has(e)&&this.autoConfig.get(e).forEach(i=>{n[i.name]=t.object[i.key].value}),t.definition&&t.definition.getCurrentValues&&Object.assign(n,t.definition.getCurrentValues(t.instance)),n}updateModuleConfig(e,t){const n=this.modules.get(e);if(n){if(this.autoConfig.has(e)){const o=this.autoConfig.get(e);Object.entries(t).forEach(([i,s])=>{const a=o.find(c=>c.name===i);a&&(n.object[a.key].value=s)})}n.definition&&n.definition.updateConfig&&n.definition.updateConfig(t,n.instance),this.refreshModule(e)}}}const d=new b;class x{constructor(){this.overlayEl=null,this.open=!1,this.fpsEnabled=!1,this.fpsEl=null,this.lastFpsSample=performance.now(),this.frames=0,this.smoothFps=null,this.boundLoop=null,this.initialized=!1,this.title="Configuration"}init(){this.initialized||(this.ensureOverlayElement(),this.setupGlobalHotkeys(),this.startFpsLoop(),this.initialized=!0)}configure(e){this.title=e.title||"Configuration",this.updateOverlayContent(),this.setupConfigForm()}updateOverlayContent(){if(!this.overlayEl)return;const e=this.overlayEl.querySelector("#config-content");if(!e)return;const t=d.getOverlaySections();e.innerHTML=this.generateConfigHTML(t)}generateConfigHTML(e){return!e||e.length===0?"<p>No configuration options available</p>":e.map(t=>{const n=t.fields.map(o=>this.generateFieldHTML(o)).join("");return`
        <fieldset>
          <legend>${t.title}</legend>
          ${n}
        </fieldset>
      `}).join("")}generateFieldHTML(e){const{type:t,name:n,label:o,value:i,min:s,max:a,step:c,options:h}=e,f=`field-${n}`;switch(t){case"range":return`
          <label>
            ${o}
            <input type="range" name="${n}" id="${f}" min="${s||0}" max="${a||100}" step="${c||1}" value="${i||50}" data-val />
          </label>
        `;case"color":return`
          <label>
            ${o}
            <input type="color" name="${n}" id="${f}" value="${i||"#00ff6a"}" />
          </label>
        `;case"checkbox":return`
          <label>
            <input type="checkbox" name="${n}" id="${f}" ${i?"checked":""} />
            ${o}
          </label>
        `;case"select":const m=h?h.map(p=>`<option value="${p.value}" ${p.value===i?"selected":""}>${p.label}</option>`).join(""):"";return`
          <label>
            ${o}
            <select name="${n}" id="${f}">${m}</select>
          </label>
        `;case"number":return`
          <label>
            ${o}
            <input type="number" name="${n}" id="${f}" min="${s||0}" max="${a||100}" step="${c||1}" value="${i||0}" />
          </label>
        `;default:return""}}setupGlobalHotkeys(){document.addEventListener("keydown",e=>{e.altKey&&!e.ctrlKey&&e.code==="KeyC"&&(e.preventDefault(),e.stopPropagation(),this.toggleOverlay()),e.altKey&&!e.ctrlKey&&e.code==="KeyP"&&(e.preventDefault(),e.stopPropagation(),this.toggleFps())},{passive:!1})}toggleOverlay(e){this.open=typeof e=="boolean"?e:!this.open,this.overlayEl&&(this.overlayEl.style.display=this.open?"flex":"none")}toggleFps(){this.fpsEnabled=!this.fpsEnabled,this.fpsEl&&(this.fpsEl.style.display=this.fpsEnabled?"block":"none")}startFpsLoop(){this.boundLoop||(this.fpsEl=document.getElementById("fps-counter")||this.createFloatingFps(),this.fpsEl.style.display="none",this.boundLoop=e=>{if(this.frames++,e-this.lastFpsSample>1e3){const t=this.frames*1e3/(e-this.lastFpsSample);this.frames=0,this.lastFpsSample=e,this.smoothFps=this.smoothFps?this.smoothFps*.7+t*.3:t,this.fpsEnabled&&(this.fpsEl.textContent="FPS: "+this.smoothFps.toFixed(0))}requestAnimationFrame(this.boundLoop)},requestAnimationFrame(this.boundLoop))}createFloatingFps(){const e=document.createElement("div");return e.id="fps-counter",e.textContent="FPS: --",e.style.position="fixed",e.style.top="58px",e.style.right="12px",e.style.zIndex="1000",e.style.font="12px Roboto, monospace",e.style.padding="4px 8px",e.style.background="rgba(0,0,0,0.4)",e.style.border="1px solid rgba(0,255,106,0.35)",e.style.borderRadius="6px",e.style.color="var(--accent)",document.body.appendChild(e),e}setupConfigForm(){if(!this.overlayEl)return;const e=this.overlayEl.querySelector("#config-form");e&&(e.querySelectorAll("[data-bound]").forEach(t=>{t.dataset.bound=""}),e.querySelectorAll("input[type=range][data-val]").forEach(t=>{if(!t.parentElement.querySelector(".val")){const n=document.createElement("span");n.className="val",n.textContent=t.value,t.parentElement.appendChild(n)}if(!t.dataset.bound){const n=t.parentElement.querySelector(".val");t.addEventListener("input",()=>{n.textContent=t.value,this.applyChange(t.name,t.value)}),t.dataset.bound="1"}}),e.querySelectorAll("input[type=color]").forEach(t=>{t.dataset.bound||(t.addEventListener("input",()=>this.applyChange(t.name,t.value)),t.dataset.bound="1")}),e.querySelectorAll("input[type=checkbox]").forEach(t=>{t.dataset.bound||(t.addEventListener("change",()=>this.applyChange(t.name,t.checked)),t.dataset.bound="1")}),e.querySelectorAll("select").forEach(t=>{t.dataset.bound||(t.addEventListener("change",()=>this.applyChange(t.name,t.value)),t.dataset.bound="1")}),e.querySelectorAll("input[type=number]").forEach(t=>{t.dataset.bound||(t.addEventListener("input",()=>this.applyChange(t.name,parseFloat(t.value))),t.dataset.bound="1")}))}applyChange(e,t){const n=d.getOnChangeHandler();n&&n(e,t)}ensureOverlayElement(){if(this.overlayEl)return;const e=document.createElement("div");e.id="config-overlay",e.innerHTML=this.overlayHTML(),document.body.appendChild(e),this.overlayEl=e;const t=e.querySelector("[data-close]");t&&t.addEventListener("click",()=>this.toggleOverlay(!1)),e.style.display="none"}overlayHTML(){return`
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
    `}}const u=new x;function v(r){u.init(),u.configure(r)}function C(r,e,t={}){return d.registerModule(r,e,t),d}function E(r,e){return d.setModuleInstance(r,e),d}function $(){u.updateOverlayContent(),u.setupConfigForm()}const y="config-style",g=`/* Generic Config Overlay (update-safe) */
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
@media (max-width: 680px){#config-overlay .config-scroll{width:94vw;}}`;let l=document.getElementById(y);l?l.textContent!==g&&(l.textContent=g):(l=document.createElement("style"),l.id=y,l.textContent=g,document.head.appendChild(l));export{$ as a,d as b,v as c,C as r,E as s};
