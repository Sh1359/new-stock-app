/* Shazim - UI helpers */
let toastTimer=null;
function toast(msg){
  const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200);
}
function openModal(html){
  const w=document.getElementById('modal-wrap'), m=document.getElementById('modal');
  m.innerHTML='<div class="grab"></div>'+html;
  w.classList.add('show');
  m.scrollTop=0;
}
function closeModal(){ document.getElementById('modal-wrap').classList.remove('show'); }
function confirmBox(msg, onYes, yesLabel){
  openModal('<h3 style="margin-bottom:8px">'+esc(msg)+'</h3>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('no')+'</button>'+
    '<button class="btn btn-red" id="cf-yes">'+esc(yesLabel||t('yes'))+'</button></div>');
  document.getElementById('cf-yes').onclick=()=>{ closeModal(); onYes&&onYes(); };
}

/* beep + vibrate */
let AC=null;
function beep(kind){
  if(!DB.settings.sound) return;
  try{
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(), g=AC.createGain();
    o.connect(g); g.connect(AC.destination);
    const now=AC.currentTime;
    if(kind==='ok'){ o.frequency.value=880; g.gain.setValueAtTime(.18,now); o.start(now); o.stop(now+.12); }
    else if(kind==='dup'){ o.frequency.value=220; g.gain.setValueAtTime(.22,now);
      o.start(now); o.stop(now+.14); o.start(now+.18); o.stop(now+.32); }
    else { o.frequency.value=160; g.gain.setValueAtTime(.22,now); o.start(now); o.stop(now+.3); }
  }catch(e){}
}
function buzz(ms){
  if(!DB.settings.vibrate) return;
  try{ navigator.vibrate && navigator.vibrate(ms||60); }catch(e){}
}

/* manager PIN gate */
function pinGate(cb){
  let pin='';
  openModal('<h3 style="text-align:center">🔐 '+t('pinTitle')+'</h3><p style="text-align:center;color:var(--sub);font-size:13px">'+t('enterPin')+'</p>'+
    '<div class="pin-dots" id="pin-dots"><i></i><i></i><i></i><i></i></div>'+
    '<div class="pin-pad" id="pin-pad"></div>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('cancel')+'</button></div>');
  const pad=document.getElementById('pin-pad'), dots=document.getElementById('pin-dots').children;
  const draw=()=>{ for(let i=0;i<4;i++) dots[i].className = i<pin.length?'f':''; };
  ['1','2','3','4','5','6','7','8','9','C','0','⌫'].forEach(k=>{
    const b=document.createElement('button'); b.textContent=k;
    b.onclick=()=>{
      if(k==='C') pin=''; else if(k==='⌫') pin=pin.slice(0,-1); else if(pin.length<4) pin+=k;
      draw();
      if(pin.length===4){
        if(pin===DB.managerPin){ closeModal(); cb&&cb(); }
        else { toast(t('wrongPin')); beep('err'); pin=''; draw(); }
      }
    };
    pad.appendChild(b);
  });
}

function applyLang(){
  const L=curLang();
  try{
    document.documentElement.lang = L==='en'?'en':'bn';
    document.title = (STR[L]&&STR[L].appName)||'Shazim Stock Management';
  }catch(e){}
}
function applyTheme(){
  let th='light';
  try{ if(typeof DB!=='undefined'&&DB&&DB.settings&&DB.settings.theme) th=DB.settings.theme; }catch(e){}
  try{
    document.documentElement.setAttribute('data-theme', th==='dark'?'dark':'light');
    const mc=document.querySelector('meta[name="theme-color"]');
    if(mc) mc.setAttribute('content', th==='dark'?'#101B19':'#146B5E');
  }catch(e){}
}
function toggleTheme(){ DB.settings.theme = DB.settings.theme==='dark'?'light':'dark'; saveDB(); applyTheme(); try{App.refresh();}catch(e){} }
function toggleLang(){ DB.settings.lang = curLang()==='bn'?'en':'bn'; saveDB(); audit('lang',curLang()); applyLang(); try{renderChrome(App.tab);}catch(e){} try{App.refresh();}catch(e){} }
/* role session: null=locked, {role:'manager'} or {role:'operator', id} */
let sessionRole=null;
function isMgr(){ return !!(sessionRole&&sessionRole.role==='manager'); }
function lockNow(){ sessionRole=null; try{flushSave();}catch(e){} showLock(); }
/* header + nav */
function statusBadge(st){
  const m={SHORT:'b-short',EXCESS:'b-excess',MATCH:'b-match',MATCHED:'b-ok',MANUAL:'b-man',DUPLICATE:'b-dup','NOT FOUND':'b-nf',INVALID:'b-inv'};
  const L={SHORT:t('short'),EXCESS:t('excess'),MATCH:t('match'),MATCHED:t('matched'),MANUAL:t('manual'),DUPLICATE:t('duplicate'),'NOT FOUND':t('notFound'),INVALID:t('invalid')};
  return '<span class="badge '+(m[st]||'b-match')+'">'+esc(L[st]||st)+'</span>';
}
function renderChrome(active){
  document.documentElement.lang = DB.settings.lang==='en'?'en':'bn';
  const u=currentUser(), s=activeSession();
  document.getElementById('app-header').className='top';
  document.getElementById('app-nav').className='bottom';
  let sessOpts = DB.sessions.map(x=>'<option value="'+x.id+'"'+(x.id===(s&&s.id)?' selected':'')+'>'+esc(x.name)+(x.closedAt?' ('+t('sessionClosed')+')':'')+'</option>').join('');
  document.getElementById('app-header').innerHTML =
    '<div class="row1"><img class="logo-sm" src="icons/icon-192.png" alt="logo">'+
    '<div><div class="app-name">Shazim</div><div class="app-sub">'+t('appName').replace('Shazim ','')+'</div></div>'+
    '<div class="spacer"></div>'+
    '<button class="user-chip" onclick="UI.openUser()">'+(isMgr()?'👑':'👤')+' '+esc(u.name)+'</button>'+
    '<div class="hdr-btns"><button class="icon-btn sm" onclick="toggleTheme()" title="'+t('theme')+'">'+(DB.settings.theme==='dark'?'☀️':'🌙')+'</button>'+
    '<button class="icon-btn sm" onclick="toggleLang()" title="'+t('language')+'">'+(curLang()==='bn'?'EN':'বাং')+'</button>'+
    '<button class="icon-btn sm" onclick="App.go(\'settings\')" title="'+t('settings')+'">⚙️</button></div></div>'+
    '<div class="session-pill">🗂️ <select onchange="App.switchSession(this.value)">'+sessOpts+'</select>'+
    '<button class="icon-btn" style="width:34px;height:34px" onclick="App.go(\'sessions\')" title="+">＋</button></div>';
  const nav=[['home','🏠',t('home')],['scan','📷',t('scan')],['stock','📦',t('stock')],['log','🧾',t('log')],['more','⋮',t('more')]];
  document.getElementById('app-nav').innerHTML = nav.map(n=>
    '<button class="'+(active===n[0]?'on':'')+(n[0]==='scan'?' scan-fab':'')+'" onclick="App.go(\''+n[0]+'\')"><span class="ic">'+n[1]+'</span><span>'+n[2]+'</span></button>'
  ).join('');
}

const UI = {
  openUser(){
    const me=currentUser();
    const badge=isMgr()?'<span class="role-badge mgr">👑 '+t('managerMode')+'</span>':'<span class="role-badge op">👤 '+t('operatorMode')+'</span>';
    if(!isMgr()){
      openModal('<div style="text-align:center"><div style="font-size:44px">👤</div><h3>'+esc(me.name)+'</h3><div>'+badge+'</div>'+
        '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('close')+'</button><button class="btn btn-red" onclick="closeModal();lockNow()">🔒 '+t('lockNow')+'</button></div></div>');
      return;
    }
    const list = DB.users.map(u=>'<div class="set-row" onclick="UI.pickUser(\''+u.id+'\')"><div class="ic">'+(u.role==='manager'?'👑':'👤')+'</div><div class="tx"><b>'+esc(u.name)+(u.id===DB.currentUserId?' • '+t('current'):'')+'</b><span>'+(u.role==='manager'?t('manager'):t('operatorR'))+(u.active===false?' • '+t('inactiveSt'):'')+'</span></div></div>').join('');
    openModal('<h3>👥 '+t('users')+'</h3>'+badge+'<p style="color:var(--sub);font-size:13px">'+t('selectUser')+'</p>'+list+
      '<div class="btn-row"><button class="btn btn-red" onclick="closeModal();lockNow()">🔒 '+t('lockNow')+'</button><button class="btn btn-primary" onclick="closeModal();App.go(\'control\')">🛠️ '+t('controlCenter')+'</button></div>');
  },
  pickUser(id){ DB.currentUserId=id; saveDB(); audit('user.switch', currentUser().name); closeModal(); toast(t('switched')+': '+currentUser().name); App.refresh(); },
};

/* simple canvas charts (theme-aware) */
function cssVar(n, fb){ try{ const v=getComputedStyle(document.documentElement).getPropertyValue(n); return (v&&v.trim())||fb; }catch(e){ return fb; } }
function chartInk(){ return cssVar('--ink','#22332F'); }
function chartSub(){ return cssVar('--sub','#6E8380'); }
function chartTrack(){ return cssVar('--primary-soft','#E7F3F0'); }
function drawDonut(cv, parts){
  const INK=chartInk(), SUB=chartSub();
  const dpr=window.devicePixelRatio||1, W=cv.clientWidth||300, H=170;
  cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px';
  const c=cv.getContext('2d'); c.scale(dpr,dpr); c.clearRect(0,0,W,H);
  const total=parts.reduce((s,p)=>s+p.v,0)||1;
  let a=-Math.PI/2; const cx=W/2-40, cy=H/2, R=Math.min(H/2-14,64), r=R*0.62;
  parts.forEach(p=>{ const a2=a+(p.v/total)*Math.PI*2;
    c.beginPath(); c.arc(cx,cy,R,a,a2); c.arc(cx,cy,r,a2,a,true); c.closePath();
    c.fillStyle=p.c; c.fill(); a=a2; });
  c.fillStyle=INK; c.font='800 20px sans-serif'; c.textAlign='center';
  c.fillText(fmtNum(total), cx, cy+2);
  c.font='11px sans-serif'; c.fillStyle=SUB; c.fillText(t('totalScan'), cx, cy+18);
  let y=26; c.textAlign='left';
  parts.forEach(p=>{ c.fillStyle=p.c; c.fillRect(W-108,y-9,10,10);
    c.fillStyle=INK; c.font='12px sans-serif'; c.fillText(p.l+' '+fmtNum(p.v), W-94, y); y+=24; });
}
function drawBars(cv, items){
  const INK=chartInk(), TRK=chartTrack();
  const dpr=window.devicePixelRatio||1, W=cv.clientWidth||300, H=30+items.length*34;
  cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px';
  const c=cv.getContext('2d'); c.scale(dpr,dpr); c.clearRect(0,0,W,H);
  const max=Math.max.apply(null, items.map(i=>i.v).concat([1]));
  items.forEach((it,i)=>{ const y=12+i*34;
    c.fillStyle=INK; c.font='700 12px sans-serif'; c.textAlign='left'; c.fillText(it.l, 4, y+11);
    const bw=(W-150)*(it.v/max);
    c.fillStyle=TRK; c.fillRect(96,y,W-150,16);
    const g=c.createLinearGradient(96,0,96+bw,0); g.addColorStop(0,it.c); g.addColorStop(1,it.c2||it.c);
    c.fillStyle=g; c.fillRect(96,y,Math.max(bw,2),16);
    c.fillStyle=INK; c.font='800 12px sans-serif'; c.textAlign='right'; c.fillText(fmtNum(it.v), W-4, y+12);
  });
}

/* ---------- PIN lock ---------- */
let _lockPin='';
function showLock(){
  _lockPin='';
  const el=document.getElementById('lock');
  el.innerHTML='<img class="logo" src="icons/icon-192.png" alt="logo"><h1>'+t('lockTitle')+'</h1>'+
    '<div class="sub">'+t('lockSub')+'</div>'+
    '<div class="pin-dots" id="lock-dots"><i></i><i></i><i></i><i></i></div>'+
    '<div class="err" id="lock-err"></div>'+
    '<div class="pin-pad" id="lock-pad"></div>'+
    '<div class="hint">'+t('lockHint')+'</div>';
  el.classList.add('show');
  const pad=document.getElementById('lock-pad');
  ['1','2','3','4','5','6','7','8','9','C','0','⌫'].forEach(k=>{
    const b=document.createElement('button'); b.textContent=k;
    b.onclick=()=>lockKey(k);
    pad.appendChild(b);
  });
  lockDraw();
}
function lockDraw(){
  const d=document.getElementById('lock-dots'); if(!d) return;
  const dots=d.children;
  for(let i=0;i<4;i++) dots[i].className = i<_lockPin.length?'f':'';
}
function lockKey(k){
  if(k==='C') _lockPin='';
  else if(k==='⌫') _lockPin=_lockPin.slice(0,-1);
  else if(_lockPin.length<4 && /[0-9]/.test(k)) _lockPin+=k;
  lockDraw();
  if(_lockPin.length===4) tryUnlock(_lockPin);
}
function tryUnlock(pin){
  // manager?
  if(pin===DB.managerPin){
    const mg=DB.users.find(u=>u.role==='manager');
    if(mg) DB.currentUserId=mg.id;
    sessionRole={role:'manager'};
    saveDB(); audit('unlock','manager');
    unlockOk(); return;
  }
  // operator?
  const op=DB.users.find(u=>u.role!=='manager'&&u.pin===pin&&u.active!==false);
  if(op){
    DB.currentUserId=op.id; sessionRole={role:'operator', id:op.id};
    saveDB(); audit('unlock',op.name);
    unlockOk(); return;
  }
  beep('err'); buzz(150);
  document.getElementById('lock-err').textContent=t('lockErr');
  _lockPin=''; setTimeout(lockDraw,50);
}
function unlockOk(){
  beep('ok');
  document.getElementById('lock').classList.remove('show');
  toast(t('unlockOk')+' — '+currentUser().name+(isMgr()?' 👑':''));
  const backTo=(DB.ui&&DB.ui.tab)||'home';
  App.hist=[];
  App.go(backTo, false);
  try{ showTour(); }catch(e){}
}

/* ---------- exit confirm ---------- */
function askExit(){
  openModal('<div style="text-align:center"><div style="font-size:44px">👋</div><h3>'+t('exitTitle')+'</h3>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('stayHere')+'</button>'+
    '<button class="btn btn-red" onclick="doExit()">'+t('exitYes')+'</button></div></div>');
}
function doExit(){
  try{flushSave();}catch(e){}
  closeModal();
  try{
    if(typeof window!=='undefined'&&window.ShazimNative&&window.ShazimNative.exitApp){ window.ShazimNative.exitApp(); return; }
  }catch(e){}
  try{ window.close(); }catch(e){}
  toast(t('exitYes'));
}
