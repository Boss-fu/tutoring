/* 版本更新橫幅：偵測到已部署的新版本時，在頁面最上方顯示「有新版本可用／立即更新」。
   按「立即更新」會清掉快取＋更新 Service Worker，再以帶一次性參數的方式重新載入，
   確保連 HTML 本身都抓到最新，不用自己按 Ctrl+R。
   偵測方式：比對「本頁載入時的版本」(app-update.js?v=… 的版本戳) 與伺服器上最新的
   version.json.build（bump-version.py 每次部署會更新兩者）。 */
(function(){
  // 只在最上層頁面顯示（嵌入的 iframe 內不重複出現）。
  try{ if(window.top!==window.self) return; }catch(e){ return; }
  var me=document.currentScript;
  var myBuild=(function(){ try{ var m=(me&&me.src||'').match(/[?&]v=([^&]+)/); return m?m[1]:''; }catch(e){ return ''; } })();
  var shown=false;

  function banner(){
    if(shown||!document.body) return; shown=true;
    var bar=document.createElement('div');
    bar.id='appUpdateBar'; bar.setAttribute('role','status');
    bar.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;gap:12px;'+
      'align-items:center;justify-content:center;flex-wrap:wrap;padding:10px 14px;background:#850103;'+
      'color:#fff;font:600 14px/1.4 system-ui,-apple-system,"Noto Sans TC",sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.25)';
    bar.innerHTML='<span>🔔 有新版本可用</span>'+
      '<button id="appUpdateGo" style="border:0;border-radius:8px;background:#fff;color:#850103;padding:7px 16px;font-weight:800;cursor:pointer">立即更新</button>'+
      '<button id="appUpdateDismiss" aria-label="關閉" style="border:0;background:transparent;color:#fff;font-size:18px;line-height:1;cursor:pointer;padding:4px 8px">✕</button>';
    document.body.appendChild(bar);
    document.getElementById('appUpdateGo').onclick=doUpdate;
    document.getElementById('appUpdateDismiss').onclick=function(){ bar.remove(); };
  }

  function doUpdate(){
    var go=document.getElementById('appUpdateGo'); if(go){ go.textContent='更新中…'; go.disabled=true; }
    var jobs=[];
    try{ if('caches' in window){ jobs.push(caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k); })); }).catch(function(){})); } }catch(e){}
    try{ if(navigator.serviceWorker){ jobs.push(navigator.serviceWorker.getRegistrations().then(function(rs){ return Promise.all(rs.map(function(r){ try{ r.waiting&&r.waiting.postMessage({type:'SKIP_WAITING'}); }catch(e){} return r.update().catch(function(){}); })); }).catch(function(){})); } }catch(e){}
    Promise.all(jobs).then(reloadFresh,reloadFresh);
    setTimeout(reloadFresh,4000); // 保險：就算清快取卡住也一定會重載
  }
  function reloadFresh(){
    if(reloadFresh.done) return; reloadFresh.done=true;
    try{ var u=new URL(window.location.href); u.searchParams.set('_v',Date.now().toString(36)); window.location.replace(u.toString()); }
    catch(e){ window.location.reload(); }
  }

  function check(){
    if(shown||!myBuild) return;
    fetch('version.json?_='+Date.now(),{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(function(j){
      if(j&&j.build&&String(j.build)!==String(myBuild)) banner();
    }).catch(function(){});
  }

  // 更新後保持網址乾淨：清掉上一輪加的一次性參數。
  try{ var uu=new URL(window.location.href); if(uu.searchParams.has('_v')){ uu.searchParams.delete('_v'); window.history.replaceState(null,'',uu.pathname+(uu.search||'')+uu.hash); } }catch(e){}

  window.__bossfuCheckUpdate=check;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',check); else check();
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) check(); });
  window.addEventListener('focus',check);
  setInterval(check,5*60*1000);
})();
