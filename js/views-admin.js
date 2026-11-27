/* Shazim - Sessions, Master, More/Settings */
const VSess = {
  render(root){
    const rows=DB.sessions.slice().reverse();
    root.innerHTML='<div class="card"><h3>🗂️ '+t('sessions')+'</h3><div class="btn-row"><button class="btn btn-primary" onclick="VSess.create()">＋ '+t('newSession')+'</button></div></div>'+
    '<div id="sess-list">'+rows.map(s=>{
      const C=countStatus(s.id);
      return '<div class="card'+(s.id===DB.activeSessionId?' hl':'')+'"><div class="r1"><b>'+esc(s.name)+'</b>'+(s.closedAt?'<span class="badge b-dup">'+t('sessionClosed')+'</span>':s.id===DB.activeSessionId?'<span class="badge b-ok">'+t('active')+'</span>':'')+'</div>'+
      '<div class="meta">📅 '+fmtTime(s.createdAt)+' • 👤 '+esc(s.operator)+(s.imported?' • 🗃️ Excel':'')+'</div>'+
      '<div class="meta">🧾 '+fmtNum(Object.keys(C).reduce((x,k)=>x+C[k],0)-(C.INVALID||0)+(C.INVALID||0))+' • ✅ '+fmtNum(C.MATCHED+C.MANUAL)+' • ⛔ '+fmtNum(C.DUPLICATE)+' • ❓ '+fmtNum(C['NOT FOUND'])+'</div>'+
      '<div class="btn-row">'+(s.id!==DB.activeSessionId?'<button class="btn btn-primary btn-sm" onclick="App.switchSession(\''+s.id+'\')">▶ '+t('activate')+'</button>':'')+
      (!s.closedAt?'<button class="btn btn-soft btn-sm" onclick="VSess.close(\''+s.id+'\')">🔒 '+t('closeSession')+'</button>':'')+
      '<button class="btn btn-white btn-sm" onclick="VSess.rename(\''+s.id+'\')">✏️</button>'+
      '<button class="btn btn-white btn-sm" onclick="pinGate(()=>VSess.del(\''+s.id+'\'))">🗑️</button></div></div>';
    }).join('')+'</div>';
  },
  create(){
    openModal('<h3>＋ '+t('newSession')+'</h3><div class="field"><label>'+t('sessNamePh')+'</label><input id="ns-name" placeholder="Stock Take — Nov 2026"></div>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('cancel')+'</button><button class="btn btn-primary" onclick="VSess.doCreate()">'+t('create')+'</button></div>');
  },
  doCreate(){
    const name=(document.getElementById('ns-name').value||'').trim()||('Stock Take — '+new Date().toLocaleDateString());
    const s={id:'s'+Date.now(), name, operator:currentUser().name, createdAt:Date.now(), imported:false, closedAt:0};
    DB.sessions.push(s); DB.activeSessionId=s.id; saveDB();
    audit('session.create', name); closeModal(); toast(t('created')); App.go('scan');
  },
  close(id){ const s=DB.sessions.find(x=>x.id===id); s.closedAt=Date.now(); saveDB(); audit('session.close',s.name); toast(t('sessionClosed')); App.refresh(); },
  rename(id){
    const s=DB.sessions.find(x=>x.id===id);
    openModal('<h3>✏️ '+t('sessNamePh')+'</h3><div class="field"><input id="rn-v" value="'+esc(s.name)+'"></div>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('cancel')+'</button><button class="btn btn-primary" onclick="VSess.doRename(\''+id+'\')">'+t('save')+'</button></div>');
  },
  doRename(id){ const s=DB.sessions.find(x=>x.id===id); s.name=document.getElementById('rn-v').value.trim()||s.name; saveDB(); closeModal(); App.refresh(); },
  del(id){
    const s=DB.sessions.find(x=>x.id===id);
    confirmBox('🗑️ '+s.name+'?', ()=>{
      DB.sessions=DB.sessions.filter(x=>x.id!==id);
      DB.scans=DB.scans.filter(x=>x.sessionId!==id);
      if(DB.activeSessionId===id) DB.activeSessionId=(DB.sessions[0]||{}).id||'';
      saveDB(); audit('session.delete',s.name); toast(t('deleted')); App.refresh();
    });
  }
};

const VMas = {
  render(root){
    root.innerHTML =
    '<div class="kpis"><div class="kpi orange"><div class="bar-top"></div><div class="lb">📦 '+t('totalArt')+'</div><div class="vl">'+fmtNum(ARTICLES.length)+'</div></div>'+
    '<div class="kpi amber"><div class="lb">📂 '+t('totalCat')+'</div><div class="vl">'+VStock.cats().length+'</div></div></div>'+
    '<div class="card"><h3>📥 '+t('importCSV')+'</h3><p style="color:var(--sub);font-size:13px">'+t('importDesc')+'</p>'+
      '<div class="field"><input type="file" id="imp-file" accept=".csv"></div>'+
      '<div class="btn-row"><button class="btn btn-soft" onclick="App.exportMasterCSV()">📤 '+t('exportCSV')+'</button><button class="btn btn-primary" onclick="VMas.doImport()">📥 '+t('importCSV')+'</button></div>'+
      '<div id="imp-out"></div></div>'+
    '<div class="card"><h3>＋ '+t('addEditArt')+'</h3>'+
      '<div class="grid2"><div class="field"><label>'+t('articleNo')+' *</label><input id="ma-art" inputmode="numeric" maxlength="8" placeholder="557-2212"></div>'+
      '<div class="field"><label>'+t('sysQty')+'</label><input id="ma-sys" type="number" placeholder="0"></div></div>'+
      '<div class="grid2"><div class="field"><label>'+t('unitPrice')+'</label><input id="ma-price" type="number" placeholder="0"></div>'+
      '<div class="field"><label>'+t('cat')+'</label><input id="ma-cat" maxlength="3" placeholder="52"></div></div>'+
      '<div class="field"><label>'+t('upsale')+'</label><input id="ma-extra" placeholder="..."></div>'+
      '<div class="btn-row"><button class="btn btn-primary" onclick="VMas.save()">💾 '+t('save')+'</button></div></div>';
  },
  prefill(key){
    const art=fmtKey(key);
    App.go('master');
    setTimeout(()=>{ const i=document.getElementById('ma-art'); if(i){ i.value=art; i.focus(); } toast(t('fillableNF')+': '+art); },150);
  },
  save(){
    const art=document.getElementById('ma-art').value, sys=+document.getElementById('ma-sys').value||0,
          price=+document.getElementById('ma-price').value||0, cat=document.getElementById('ma-cat').value||'',
          extra=document.getElementById('ma-extra').value||'';
    if(!normKey(art)){ toast(t('errInv')); return; }
    const r=upsertArticle(art, cat, price, sys, extra);
    if(r.error){ toast(t('errInv')); return; }
    audit('master.save', art); toast(t('savedMaster')+': '+fmtKey(normKey(art)));
    ['ma-art','ma-sys','ma-price','ma-cat','ma-extra'].forEach(id=>document.getElementById(id).value='');
  },
  async doImport(){
    const f=document.getElementById('imp-file').files[0];
    if(!f){ toast('📁 —'); return; }
    const txt=await f.text();
    const out=importMasterCSV(txt);
    document.getElementById('imp-out').innerHTML='<div class="note">✅ '+t('importedN').replace('{n}',out.added)+' • '+t('updatedN').replace('{n}',out.updated)+'</div>';
    audit('master.import', out.added+'+'+out.updated); toast(t('saved'));
  }
};

const VUsr = {
  render(root){
    root.innerHTML='<div class="card"><h3>👥 '+t('users')+'</h3>'+
    DB.users.map(u=>'<div class="set-row"><div class="ic">👤</div><div class="tx"><b>'+esc(u.name)+(u.id===DB.currentUserId?' • '+t('current'):'')+'</b><span>'+(u.role==='manager'?t('manager'):t('operatorR'))+'</span></div>'+
      (u.id!==DB.currentUserId?'<button class="btn btn-soft btn-sm" onclick="UI.pickUser(\''+u.id+'\')">'+t('selectUser')+'</button>':'')+
      (DB.users.length>1?'<button class="btn btn-white btn-sm" onclick="pinGate(()=>VUsr.del(\''+u.id+'\'))">🗑️</button>':'')+'</div>').join('')+'</div>'+
    '<div class="card"><h3>＋ '+t('addUser')+'</h3><div class="grid2"><div class="field"><label>'+t('name')+'</label><input id="nu-name" placeholder="..."></div>'+
    '<div class="field"><label>'+t('role')+'</label><select id="nu-role"><option value="operator">'+t('operatorR')+'</option><option value="manager">'+t('manager')+'</option></select></div></div>'+
    '<div class="btn-row"><button class="btn btn-primary" onclick="VUsr.add()">＋ '+t('addUser')+'</button></div></div>'+
    '<div class="card"><h3>🔐 '+t('managerPin')+'</h3><div class="grid2"><div class="field"><label>'+t('newPin')+'</label><input id="np-v" type="password" inputmode="numeric" maxlength="4" placeholder="••••"></div>'+
    '<div class="field"><label> </label><button class="btn btn-primary" style="margin-top:22px" onclick="pinGate(()=>VUsr.setPin())">'+t('changePin')+'</button></div></div></div>'+
    '<div class="card"><h3>📝 '+t('auditLog')+'</h3><div style="max-height:260px;overflow:auto">'+
      (DB.audit.slice().reverse().slice(0,80).map(a=>'<div class="mrow"><small style="color:var(--sub)">'+fmtTime(a.at)+'</small><span style="flex:1"><b>'+esc(a.by)+'</b> • '+esc(a.act)+' '+(a.ref?esc(a.ref):'')+'</span></div>').join('')||'<div class="empty"><p>—</p></div>')+'</div></div>';
  },
  add(){
    const name=document.getElementById('nu-name').value.trim(); if(!name) return;
    DB.users.push({id:'u'+Date.now(), name:name, role:document.getElementById('nu-role').value});
    saveDB(); audit('user.add',name); toast(t('saved')); App.refresh();
  },
  del(id){ DB.users=DB.users.filter(u=>u.id!==id); if(DB.currentUserId===id) DB.currentUserId=DB.users[0].id; saveDB(); toast(t('deleted')); App.refresh(); },
  setPin(){
    const v=document.getElementById('np-v').value.trim();
    if(!/^\d{4}$/.test(v)){ toast(t('wrongPin')); return; }
    DB.managerPin=v; saveDB(); audit('pin.change',''); toast(t('saved')); App.refresh();
  }
};

const VMore = {
  render(root){
    const items=[
      ['⚠️','exceptions',()=>App.go('except')],['📄','reports',()=>App.go('reports')],['📊','insights',()=>App.go('insights')],
      ['🗂️','sessions',()=>App.go('sessions')],['📦','master',()=>App.go('master')],['👥','users',()=>App.go('users')],
      ['💾','backup',()=>App.go('backup')],['⚙️','settings',()=>App.go('settings')],
    ];
    root.innerHTML='<div class="card">'+items.map((x,i)=>'<div class="set-row" onclick="VMore._go('+i+')"><div class="ic">'+x[0]+'</div><div class="tx"><b>'+t(x[1])+'</b></div><div style="color:var(--sub)">›</div></div>').join('')+'</div>'+
    '<div class="card" style="text-align:center"><b>Shazim</b> <span class="meta">v1.0 • offline-first PWA</span><div class="meta" style="margin-top:6px">🏬 House-1, Road-12, Sector-10, Uttara, Dhaka-1230</div><div class="meta">📞 02-48956768 • 📱 01711-570772</div></div>';
    VMore._fns=items.map(x=>x[2]);
  },
  _go(i){ VMore._fns[i](); }
};

const VBak = {
  render(root){
    const size=Math.round((JSON.stringify(DB).length+JSON.stringify({a:ARTICLES}).length)/1024);
    root.innerHTML =
    '<div class="card" style="text-align:center"><div style="font-size:44px">💾</div><h3>'+t('backup')+'</h3>'+
    '<p style="color:var(--sub);font-size:13px">'+t('backupDesc')+' (~'+size+' KB)</p>'+
    '<div class="btn-row"><button class="btn btn-primary" onclick="App.backup()">💾 '+t('backupNow')+'</button></div>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="App.backup(true)">🔄 '+t('autoBackup')+'</button></div></div>'+
    '<div class="card"><h3>📥 '+t('restore')+'</h3><div class="field"><input type="file" id="rs-file" accept=".json"></div>'+
    '<div class="btn-row"><button class="btn btn-primary" onclick="pinGate(()=>VBak.doRestore())">📥 '+t('restore')+'</button></div>'+
    '<div class="note">⚠️ '+t('restoreWarn')+'</div></div>';
  },
  async doRestore(){
    const f=document.getElementById('rs-file').files[0]; if(!f){ toast('📁 —'); return; }
    try{
      const d=JSON.parse(await f.text());
      importBackup(d);
      audit('restore', f.name); saveDB(); toast(t('restored')); App.go('home');
    }catch(e){ toast('❌ '+t('restoreFail')); }
  }
};

const VSet = {
  render(root){
    const L=DB.settings;
    const tg=(k,label)=>'<div class="set-row" onclick="VSet.tg(\''+k+'\')"><div class="ic">'+(L[k]?'🟢':'⚪')+'</div><div class="tx"><b>'+label+'</b></div><div class="switch '+(L[k]?'on':'')+'"><div class="knob"></div></div></div>';
    root.innerHTML =
    '<div class="card"><h3>🌐 '+t('language')+'</h3><div class="seg"><button class="'+(L.lang==='bn'?'on':'')+'" onclick="VSet.lang(\'bn\')">বাংলা</button><button class="'+(L.lang==='en'?'on':'')+'" onclick="VSet.lang(\'en\')">English</button></div></div>'+
    '<div class="card"><h3>🔔 '+t('soundVib')+'</h3>'+tg('sound','🔊 '+t('sound'))+tg('vibrate','📳 '+t('vibrate'))+'</div>'+
    '<div class="card"><h3>📷 '+t('scanMode')+'</h3>'+tg('continuous','🔁 '+t('continuous'))+
      '<div class="field" style="margin-top:8px"><label>'+t('defaultMode')+'</label><select onchange="VSet.defMode(this.value)"><option value="cam"'+(L.defMode==='cam'?' selected':'')+'>📷 Camera</option><option value="dev"'+(L.defMode==='dev'?' selected':'')+'>⌨️ Scanner</option><option value="man"'+(L.defMode==='man'?' selected':'')+'>✍️ Manual</option></select></div></div>'+
    '<div class="card"><h3>❓ '+t('help')+'</h3><div class="help">'+t('helpText')+'</div>'+
      '<div class="btn-row"><button class="btn btn-soft btn-sm" onclick="VSet.tour()">👁️ '+t('tourAgain')+'</button><button class="btn btn-soft btn-sm" onclick="App.install()">📲 '+t('install')+'</button></div></div>'+
    '<div class="card"><h3>⚠️ '+t('danger')+'</h3><div class="btn-row"><button class="btn btn-red" onclick="pinGate(()=>VSet.factory())">🧨 '+t('factory')+'</button></div></div>';
  },
  tg(k){ DB.settings[k]=!DB.settings[k]; saveDB(); App.refresh(); },
  lang(l){ DB.settings.lang=l; saveDB(); audit('lang',l); applyLang(); renderChrome(App.tab); App.refresh(); },
  defMode(m){ DB.settings.defMode=m; saveDB(); },
  tour(){ localStorage.removeItem('shazim_tour'); location.reload(); },
  factory(){
    confirmBox(t('factory')+'?', ()=>{
      localStorage.removeItem('shazim_db_v3'); localStorage.removeItem('shazim_articles_v1');
      location.reload();
    }, t('factory'));
  }
};
