/* Shazim - Sessions, Master, Control Center, Settings */
const VSess = {
  render(root){
    const rows=DB.sessions.slice();
    root.innerHTML='<div class="card"><h3>🗂️ '+t('sessions')+'</h3><div class="btn-row"><button class="btn btn-primary" onclick="VSess.create()">＋ '+t('newSession')+'</button></div></div>'+
    '<div id="sess-list">'+rows.map(s=>{
      const C=aggregate(s.id).counts;
      return '<div class="card'+(s.id===DB.activeSessionId?' hl':'')+'"><div class="r1"><b>'+esc(s.name)+'</b>'+(s.closedAt?'<span class="badge b-dup">'+t('sessionClosed')+'</span>':s.id===DB.activeSessionId?'<span class="badge b-ok">'+t('active')+'</span>':'')+'</div>'+
      '<div class="meta">📅 '+fmtTime(s.createdAt)+' • 👤 '+esc(s.operator||'Excel')+(s.imported?' • 🗃️ Excel':'')+'</div>'+
      '<div class="meta">🧾 '+fmtNum(C.total)+' • ✅ '+fmtNum((C.MATCHED||0)+(C.MANUAL||0))+' • ⛔ '+fmtNum(C.DUPLICATE||0)+' • ❓ '+fmtNum(C['NOT FOUND']||0)+'</div>'+
      '<div class="btn-row">'+(s.id!==DB.activeSessionId?'<button class="btn btn-primary btn-sm" onclick="App.switchSession(\''+s.id+'\')">▶ '+t('activate')+'</button>':'')+
      (isMgr()&&!s.closedAt?'<button class="btn btn-soft btn-sm" onclick="VSess.close(\''+s.id+'\')">🔒 '+t('closeSession')+'</button>':'')+
      '<button class="btn btn-white btn-sm" onclick="VSess.rename(\''+s.id+'\')">✏️</button>'+
      (isMgr()?'<button class="btn btn-white btn-sm" onclick="pinGate(()=>VSess.del(\''+s.id+'\'))">🗑️</button>':'')+'</div></div>';
    }).join('')+'</div>';
  },
  create(){
    openModal('<h3>＋ '+t('newSession')+'</h3><div class="field"><label>'+t('sessNamePh')+'</label><input id="ns-name" placeholder="Stock Take — Nov 2026"></div>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('cancel')+'</button><button class="btn btn-primary" onclick="VSess.doCreate()">'+t('create')+'</button></div>');
  },
  doCreate(){
    const name=(document.getElementById('ns-name').value||'').trim()||('Stock Take — '+new Date().toLocaleDateString());
    const s=createSession(name); s.operator=currentUser().name; saveDB();
    closeModal(); toast(t('created')); App.go('scan');
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
    const mgr=isMgr();
    root.innerHTML =
    '<div class="kpis"><div class="kpi"><div class="lb">📦 '+t('totalArt')+'</div><div class="vl">'+fmtNum(ARTICLES.length)+'</div></div>'+
    '<div class="kpi"><div class="lb">📂 '+t('totalCat')+'</div><div class="vl">'+VStock.cats().length+'</div></div></div>'+
    (mgr?'<div class="card"><h3>📥 '+t('importCSV')+'</h3><p style="color:var(--sub);font-size:13px">'+t('importDesc')+'</p>'+
      '<div class="field"><input type="file" id="imp-file" accept=".csv"></div>'+
      '<div class="btn-row"><button class="btn btn-soft" onclick="App.exportMasterCSV()">📤 '+t('exportCSV')+'</button><button class="btn btn-primary" onclick="VMas.doImport()">📥 '+t('importCSV')+'</button></div>'+
      '<div id="imp-out"></div></div>':'')+
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
    toast(t('savedMaster')+': '+fmtKey(normKey(art)));
    ['ma-art','ma-sys','ma-price','ma-cat','ma-extra'].forEach(id=>document.getElementById(id).value='');
  },
  async doImport(){
    if(!isMgr()){ toast(t('needManager')); return; }
    const f=document.getElementById('imp-file').files[0];
    if(!f){ toast('📁 —'); return; }
    const txt=await f.text();
    const out=importMasterCSV(txt);
    document.getElementById('imp-out').innerHTML='<div class="note">✅ '+t('importedN').replace('{n}',out.added)+' • '+t('updatedN').replace('{n}',out.updated)+'</div>';
    audit('master.import', out.added+'+'+out.updated); toast(t('saved'));
  }
};

/* ---------- CONTROL CENTER (manager only) ---------- */
const VCtl = {
  histOp:'ALL',
  render(root){
    if(!isMgr()){ root.innerHTML='<div class="empty"><div class="big">🔒</div><p>'+t('needManager')+'</p></div>'; return; }
    const ops=DB.users.filter(u=>u.role!=='manager');
    const s=activeSession(), A=s?aggregate(s.id):null, C=A?A.counts:{total:0};
    root.innerHTML =
    '<div class="kpis">'+
      '<div class="kpi orange"><div class="bar-top"></div><div class="lb">👥 '+t('opManage')+'</div><div class="vl">'+ops.filter(o=>o.active!==false).length+'/'+ops.length+'</div></div>'+
      '<div class="kpi amber"><div class="lb">🧾 '+t('totalScan')+'</div><div class="vl">'+fmtNum(C.total)+'</div></div>'+
      '<div class="kpi red"><div class="lb">📉 SHORT</div><div class="vl">'+(A?A.shorts.length:0)+'</div></div>'+
      '<div class="kpi green"><div class="lb">📈 EXCESS</div><div class="vl">'+(A?A.excess.length:0)+'</div></div>'+
    '</div>'+
    '<div class="card"><h3>👥 '+t('opManage')+'</h3><div id="ctl-ops">'+ops.map(o=>
      '<div class="set-row"><div class="ic">'+(o.active===false?'⚪':'👤')+'</div><div class="tx"><b>'+esc(o.name)+'</b><span>PIN: '+esc(o.pin)+' • '+(o.active===false?t('inactiveSt'):t('activeSt'))+' • '+t('opSince')+' '+fmtDate(o.createdAt||Date.now())+'</span></div>'+
      '<button class="btn btn-soft btn-sm" onclick="VCtl.pinModal(\''+o.id+'\')">🔑 '+t('resetPin')+'</button>'+
      '<button class="btn btn-white btn-sm" onclick="VCtl.toggleOp(\''+o.id+'\')">'+(o.active===false?t('activateUser'):t('deactivate'))+'</button></div>'
    ).join('')+'</div>'+
    '<div class="grid2" style="margin-top:8px"><div class="field"><label>'+t('name')+'</label><input id="co-name" placeholder="Rahim"></div>'+
    '<div class="field"><label>'+t('setPin')+' (4 '+t('qty')+')</label><input id="co-pin" inputmode="numeric" maxlength="4" placeholder="••••"></div></div>'+
    '<div class="btn-row"><button class="btn btn-primary" onclick="VCtl.addOp()">＋ '+t('addUser')+'</button></div></div>'+
    '<div class="card"><h3>🔐 '+t('managerPin')+'</h3><div class="grid2"><div class="field"><label>'+t('newPin')+'</label><input id="co-mpin" type="password" inputmode="numeric" maxlength="4" placeholder="••••"></div>'+
    '<div class="field"><label> </label><button class="btn btn-primary" style="margin-top:22px" onclick="pinGate(()=>VCtl.setMPin())">'+t('changePin')+'</button></div></div></div>'+
    '<div class="card"><h3>🏢 '+t('company')+'</h3><div class="addr-box"><b>'+esc(DB.company.name)+'</b><br>'+esc(DB.company.addr)+'<br>📞 '+esc(DB.company.phone)+'</div>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="VCtl.companyModal()">✏️ '+t('editCompany')+'</button></div></div>'+
    '<div class="card"><h3>📝 '+t('opHistory')+'</h3><div class="field"><label>'+t('opManage')+'</label><select onchange="VCtl.histOp=this.value;VCtl.histList()"><option value="ALL">'+t('all')+'</option>'+
      DB.users.map(u=>'<option value="'+esc(u.name)+'">'+esc(u.name)+'</option>').join('')+'</select></div><div id="ctl-hist" style="max-height:320px;overflow:auto"></div></div>'+
    '<div class="card"><h3>⚠️ '+t('danger')+'</h3><div class="btn-row"><button class="btn btn-soft" onclick="App.go(\'backup\')">💾 '+t('backup')+'</button><button class="btn btn-red" onclick="pinGate(()=>VSet.factory())">🧨 '+t('factory')+'</button></div></div>';
    this.histList();
  },
  histList(){
    const el=document.getElementById('ctl-hist'); if(!el) return;
    let rows=DB.audit.slice();
    if(this.histOp!=='ALL') rows=rows.filter(a=>a.by===this.histOp);
    rows=rows.slice(0,150);
    let lastDay='';
    el.innerHTML=rows.length?rows.map(a=>{
      const d=new Date(a.at).toLocaleDateString(); let h='';
      if(d!==lastDay){ lastDay=d; h='<div class="hist-day">'+d+'</div>'; }
      return h+'<div class="mrow"><small style="color:var(--sub)">'+fmtTime(a.at)+'</small><span style="flex:1"><b>'+esc(a.by)+'</b> • '+esc(a.action)+' '+esc(a.detail||'')+'</span></div>';
    }).join(''):'<div class="empty"><p>'+t('noActivity')+'</p></div>';
  },
  addOp(){
    const name=document.getElementById('co-name').value.trim(), pin=document.getElementById('co-pin').value.trim();
    if(!name){ toast(t('name')+' —'); return; }
    if(!/^\d{4}$/.test(pin)){ toast(t('wrongPin')); return; }
    if(DB.users.some(u=>u.pin===pin)){ toast(t('lockErr')); return; }
    DB.users.push({id:'u'+Date.now(), name:name, role:'operator', pin:pin, active:true, createdAt:Date.now()});
    saveDB(); audit('user.add',name); toast(t('saved')); App.refresh();
  },
  toggleOp(id){ const u=DB.users.find(x=>x.id===id); u.active=(u.active===false); saveDB(); audit(u.active?'user.on':'user.off', u.name); App.refresh(); },
  pinModal(id){
    const u=DB.users.find(x=>x.id===id);
    openModal('<h3>🔑 '+t('resetPin')+' — '+esc(u.name)+'</h3><div class="field"><label>'+t('setPin')+'</label><input id="cp-v" inputmode="numeric" maxlength="4" placeholder="••••" value="'+esc(u.pin)+'"></div>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('cancel')+'</button><button class="btn btn-primary" onclick="VCtl.doPin(\''+id+'\')">'+t('save')+'</button></div>');
  },
  doPin(id){
    const v=document.getElementById('cp-v').value.trim();
    if(!/^\d{4}$/.test(v)){ toast(t('wrongPin')); return; }
    if(DB.users.some(u=>u.id!==id&&u.pin===v)){ toast(t('lockErr')); return; }
    DB.users.find(x=>x.id===id).pin=v; saveDB(); audit('pin.reset', id); closeModal(); toast(t('saved')); App.refresh();
  },
  setMPin(){
    const v=document.getElementById('co-mpin').value.trim();
    if(!/^\d{4}$/.test(v)){ toast(t('wrongPin')); return; }
    DB.managerPin=v; const mg=DB.users.find(u=>u.role==='manager'); if(mg) mg.pin=v;
    saveDB(); audit('pin.change','manager'); toast(t('saved')); App.refresh();
  },
  companyModal(){
    const c=DB.company;
    openModal('<h3>🏢 '+t('editCompany')+'</h3><div class="field"><label>'+t('companyName')+'</label><input id="cc-n" value="'+esc(c.name)+'"></div>'+
    '<div class="field"><label>'+t('companyAddr')+'</label><input id="cc-a" value="'+esc(c.addr)+'"></div>'+
    '<div class="field"><label>'+t('companyPhone')+'</label><input id="cc-p" value="'+esc(c.phone)+'"></div>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('cancel')+'</button><button class="btn btn-primary" onclick="VCtl.doCompany()">'+t('save')+'</button></div>');
  },
  doCompany(){
    DB.company={name:document.getElementById('cc-n').value.trim()||DB.company.name, addr:document.getElementById('cc-a').value.trim(), phone:document.getElementById('cc-p').value.trim()};
    saveDB(); audit('company.edit',''); closeModal(); toast(t('saved')); App.refresh();
  }
};

const VUsr = { render(root){ VCtl.render(root); } };

const VMore = {
  render(root){
    const mgr=isMgr();
    const items=[
      ['⚠️','exceptions',()=>App.go('except')],['📄','reports',()=>App.go('reports')],['📊','insights',()=>App.go('insights')],
      ['🗂️','sessions',()=>App.go('sessions')],['📦','master',()=>App.go('master')],
    ];
    if(mgr){ items.push(['👥','users',()=>App.go('users')],[ '💾','backup',()=>App.go('backup')],['🛠️','control',()=>App.go('control')]); }
    items.push(['⚙️','settings',()=>App.go('settings')]);
    const c=DB.company;
    root.innerHTML='<div class="card">'+items.map((x,i)=>'<div class="set-row" onclick="VMore._go('+i+')"><div class="ic">'+x[0]+'</div><div class="tx"><b>'+t(x[1])+'</b></div><div style="color:var(--sub)">›</div></div>').join('')+'</div>'+
    '<div class="card" style="text-align:center"><b>'+esc(c.name)+'</b><div class="meta" style="margin-top:6px">🏬 '+esc(c.addr)+'</div><div class="meta">📞 '+esc(c.phone)+'</div></div>';
    VMore._fns=items.map(x=>x[2]);
  },
  _go(i){ VMore._fns[i](); }
};

const VBak = {
  render(root){
    if(!isMgr()){ root.innerHTML='<div class="empty"><div class="big">🔒</div><p>'+t('needManager')+'</p></div>'; return; }
    const size=Math.round((JSON.stringify(DB).length)/1024);
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

/* ---------- SETTINGS icon grid ---------- */
const VSet = {
  render(root){
    const L=DB.settings, mgr=isMgr();
    const tile=(ic,nm,fn,val,cls)=>'<div class="settile '+(cls||'')+'" onclick="'+fn+'"><div class="ic">'+ic+'</div><div class="nm">'+nm+'</div>'+(val?'<div class="vl">'+val+'</div>':'')+'</div>';
    root.innerHTML='<div class="setgrid">'+
      tile('🌐',t('gridLang'),'VSet.mLang()',L.lang==='bn'?'বাংলা':'English')+
      tile(L.theme==='dark'?'🌙':'☀️',t('gridTheme'),'toggleTheme()',L.theme==='dark'?t('darkMode'):t('lightMode'))+
      tile('🔊',t('gridSound'),'VSet.tg(\'sound\')',L.sound?'ON':'OFF')+
      tile('📳',t('gridVibrate'),'VSet.tg(\'vibrate\')',L.vibrate?'ON':'OFF')+
      tile('📷',t('gridScan'),'VSet.mScan()',(L.defMode==='cam'?'📷':L.defMode==='dev'?'⌨️':'✍️')+(L.continuous?' 🔁':''))+
      tile('❓',t('gridHelp'),'VSet.mHelp()','')+
      tile('📲',t('gridInstall'),'App.install()','')+
      (mgr?tile('🏢',t('gridCompany'),'VCtl.companyModal()','','mgr')+tile('🛠️',t('gridControl'),'App.go(\'control\')','','mgr')+tile('🧨',t('gridDanger'),'pinGate(()=>VSet.factory())','','mgr'):'')+
    '</div>'+
    '<div class="card" style="text-align:center"><b>Shazim</b> <span class="meta">v1.2 • offline-first</span><div class="meta">'+(mgr?'👑 '+t('managerMode'):'👤 '+t('operatorMode')+' — '+esc(currentUser().name))+'</div>'+
    '<div class="btn-row"><button class="btn btn-red btn-sm" onclick="lockNow()">🔒 '+t('lockNow')+'</button></div></div>';
  },
  tg(k){ DB.settings[k]=!DB.settings[k]; saveDB(); App.refresh(); },
  mLang(){
    openModal('<h3>🌐 '+t('language')+'</h3><div class="seg"><button class="'+(DB.settings.lang==='bn'?'on':'')+'" onclick="closeModal();toggleLang()">বাংলা</button><button class="'+(DB.settings.lang==='en'?'on':'')+'" onclick="closeModal();toggleLang()">English</button></div>'+
    '<div class="btn-row"><button class="btn btn-white" onclick="closeModal()">'+t('close')+'</button></div>');
  },
  mScan(){
    const L=DB.settings;
    openModal('<h3>📷 '+t('scanMode')+'</h3>'+
    '<div class="set-row" onclick="VSet.tg(\'continuous\');closeModal();VSet.mScan()"><div class="ic">'+(L.continuous?'🟢':'⚪')+'</div><div class="tx"><b>🔁 '+t('continuous')+'</b></div><div class="switch '+(L.continuous?'on':'')+'"><div class="knob"></div></div></div>'+
    '<div class="field" style="margin-top:8px"><label>'+t('defaultMode')+'</label><select onchange="VSet.defMode(this.value);closeModal()"><option value="cam"'+(L.defMode==='cam'?' selected':'')+'>📷 Camera</option><option value="dev"'+(L.defMode==='dev'?' selected':'')+'>⌨️ Scanner</option><option value="man"'+(L.defMode==='man'?' selected':'')+'>✍️ Manual</option></select></div>'+
    '<div class="btn-row"><button class="btn btn-white" onclick="closeModal()">'+t('close')+'</button></div>');
  },
  mHelp(){
    openModal('<h3>❓ '+t('help')+'</h3><div class="help">'+t('helpText')+'</div>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="VSet.tour()">👁️ '+t('tourAgain')+'</button><button class="btn btn-white" onclick="closeModal()">'+t('close')+'</button></div>');
  },
  defMode(m){ DB.settings.defMode=m; saveDB(); App.refresh(); },
  tour(){ try{localStorage.removeItem('shazim_tour');}catch(e){} location.reload(); },
  factory(){
    confirmBox(t('factory')+'?', ()=>{
      try{localStorage.removeItem('shazim_db_v3'); localStorage.removeItem('shazim_articles_v1');}catch(e){}
      location.reload();
    }, t('factory'));
  }
};
