(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(o){if(o.ep)return;o.ep=!0;const i=t(o);fetch(o.href,i)}})();class m{constructor(){this.overlayEl=null,this.open=!1,this.fpsEnabled=!1,this.fpsEl=null,this.lastFpsSample=performance.now(),this.frames=0,this.smoothFps=null,this.boundLoop=null,this.currentConfig=null,this.initialized=!1}init(){this.initialized||(this.ensureOverlayElement(),this.setupGlobalHotkeys(),this.startFpsLoop(),this.initialized=!0)}configure(e){this.currentConfig=e,this.updateOverlayContent(),this.setupConfigForm()}ensureOverlayElement(){if(this.overlayEl)return;const e=document.createElement("div");e.id="config-overlay",e.innerHTML=this.overlayHTML(),document.body.appendChild(e),this.overlayEl=e,e.querySelector("[data-close]").addEventListener("click",()=>this.toggleOverlay(!1)),e.style.display="none"}overlayHTML(){return`
      <div class="config-header">
        <h3>${this.currentConfig?.title||"Configuration"}</h3>
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
    `}updateOverlayContent(){if(!this.overlayEl||!this.currentConfig)return;const e=this.overlayEl.querySelector("#config-content");e&&(e.innerHTML=this.generateConfigHTML())}generateConfigHTML(){return this.currentConfig?.sections?this.currentConfig.sections.map(e=>{const t=e.fields.map(n=>this.generateFieldHTML(n)).join("");return`
        <fieldset>
          <legend>${e.title}</legend>
          ${t}
        </fieldset>
      `}).join(""):""}generateFieldHTML(e){const{type:t,name:n,label:o,value:i,min:a,max:p,step:u,options:h}=e,l=`field-${n}`;switch(t){case"range":return`
          <label>
            ${o}
            <input type="range" name="${n}" id="${l}" min="${a||0}" max="${p||100}" step="${u||1}" value="${i||50}" data-val />
          </label>
        `;case"color":return`
          <label>
            ${o}
            <input type="color" name="${n}" id="${l}" value="${i||"#00ff6a"}" />
          </label>
        `;case"checkbox":return`
          <label>
            <input type="checkbox" name="${n}" id="${l}" ${i?"checked":""} />
            ${o}
          </label>
        `;case"select":const y=h.map(d=>`<option value="${d.value}" ${d.value===i?"selected":""}>${d.label}</option>`).join("");return`
          <label>
            ${o}
            <select name="${n}" id="${l}">${y}</select>
          </label>
        `;case"number":return`
          <label>
            ${o}
            <input type="number" name="${n}" id="${l}" min="${a||0}" max="${p||100}" step="${u||1}" value="${i||0}" />
          </label>
        `;default:return""}}setupGlobalHotkeys(){document.addEventListener("keydown",e=>{e.altKey&&(e.code==="KeyP"&&(e.preventDefault(),this.toggleFps()),e.code==="KeyC"&&(e.preventDefault(),this.toggleOverlay()))},{passive:!1})}toggleOverlay(e){this.open=typeof e=="boolean"?e:!this.open,this.overlayEl&&(this.overlayEl.style.display=this.open?"flex":"none")}toggleFps(){this.fpsEnabled=!this.fpsEnabled,this.fpsEl&&(this.fpsEl.style.display=this.fpsEnabled?"block":"none")}startFpsLoop(){this.boundLoop||(this.fpsEl=document.getElementById("fps-counter")||this.createFloatingFps(),this.fpsEl.style.display="none",this.boundLoop=e=>{if(this.frames++,e-this.lastFpsSample>1e3){const t=this.frames*1e3/(e-this.lastFpsSample);this.frames=0,this.lastFpsSample=e,this.smoothFps=this.smoothFps?this.smoothFps*.7+t*.3:t,this.fpsEnabled&&(this.fpsEl.textContent="FPS: "+this.smoothFps.toFixed(0))}requestAnimationFrame(this.boundLoop)},requestAnimationFrame(this.boundLoop))}createFloatingFps(){const e=document.createElement("div");return e.id="fps-counter",e.textContent="FPS: --",e.style.position="fixed",e.style.top="58px",e.style.right="12px",e.style.zIndex="1000",e.style.font="12px Roboto, monospace",e.style.padding="4px 8px",e.style.background="rgba(0,0,0,0.4)",e.style.border="1px solid rgba(0,255,106,0.35)",e.style.borderRadius="6px",e.style.color="var(--accent)",document.body.appendChild(e),e}setupConfigForm(){if(!this.overlayEl||!this.currentConfig)return;const e=this.overlayEl.querySelector("#config-form");e&&(e.querySelectorAll("[data-bound]").forEach(t=>{t.dataset.bound=""}),e.querySelectorAll("input[type=range][data-val]").forEach(t=>{if(!t.parentElement.querySelector(".val")){const n=document.createElement("span");n.className="val",n.textContent=t.value,t.parentElement.appendChild(n)}if(!t.dataset.bound){const n=t.parentElement.querySelector(".val");t.addEventListener("input",()=>{n.textContent=t.value,this.applyChange(t.name,t.value)}),t.dataset.bound="1"}}),e.querySelectorAll("input[type=color]").forEach(t=>{t.dataset.bound||(t.addEventListener("input",()=>this.applyChange(t.name,t.value)),t.dataset.bound="1")}),e.querySelectorAll("input[type=checkbox]").forEach(t=>{t.dataset.bound||(t.addEventListener("change",()=>this.applyChange(t.name,t.checked)),t.dataset.bound="1")}),e.querySelectorAll("select").forEach(t=>{t.dataset.bound||(t.addEventListener("change",()=>this.applyChange(t.name,t.value)),t.dataset.bound="1")}),e.querySelectorAll("input[type=number]").forEach(t=>{t.dataset.bound||(t.addEventListener("input",()=>this.applyChange(t.name,parseFloat(t.value))),t.dataset.bound="1")}))}applyChange(e,t){this.currentConfig?.onChange&&this.currentConfig.onChange(e,t)}}const f=new m;function b(s){f.init(),f.configure(s)}const g="config-style",c=`/* Generic Config Overlay (update-safe) */
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
@media (max-width: 680px){#config-overlay .config-scroll{width:94vw;}}`;let r=document.getElementById(g);r?r.textContent!==c&&(r.textContent=c):(r=document.createElement("style"),r.id=g,r.textContent=c,document.head.appendChild(r));export{b as c};
