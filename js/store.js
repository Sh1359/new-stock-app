/* Shazim Stock Management - data store + scan engine (offline-first, localStorage) */
const DB_KEY = 'shazim_db_v3';
const ART_KEY = 'shazim_articles_v1';

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function fmtKey(key){ key=String(key||''); return key.length===7 ? key.slice(0,3)+'-'+key.slice(3) : key; }
function normKey(s){ return String(s||'').replace(/\D/g,''); }
function isValidKey(k){ return /^\d{7}$/.test(k); }
function fmtNum(n){ n=Number(n)||0; return n.toLocaleString('en-US'); }
function fmtTk(n){ n=Number(n)||0; const neg=n<0; return (neg?'-':'')+'৳'+Math.abs(n).toLocaleString('en-US'); }
function fmtTime(ts){ try{ const d=new Date(ts); return d.toLocaleString(document.documentElement.lang==='en'?'en-GB':'bn-BD',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){ return ''; } }
function fmtDate(ts){ try{ const d=new Date(ts); return d.toLocaleDateString(document.documentElement.lang==='en'?'en-GB':'bn-BD',{day:'2-digit',month:'short',year:'numeric'});}catch(e){ return ''; } }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

let DB = null;
let ARTICLES = [];
let ART_MAP = {};

function defaultDB(){
  return {
    version: 3, seq: 0,
    sessions: [], scans: [], resolutions: {}, audit: [],
    users: [
      {id:'u-op1', name:'Operator 1', role:'operator'},
      {id:'u-mgr', name:'Manager', role:'manager'},
    ],
    currentUserId: 'u-op1', managerPin: '1234',
    settings: {lang:'bn', sound:true, vibrate:true, continuous:true},
    branches: [{id:'b-main', name:'Main Godown'}],
    activeSessionId: null, seeded: false, lastBackup: null,
  };
}
function saveDB(){ try{ localStorage.setItem(DB_KEY, JSON.stringify(DB)); }catch(e){ console.warn('save fail', e); } }
function loadDB(){
  try{ const raw = localStorage.getItem(DB_KEY); if(raw){ DB = JSON.parse(raw); } }catch(e){}
  if(!DB) DB = defaultDB();
  // migrate older shapes
  DB.settings = Object.assign({lang:'bn', sound:true, vibrate:true, continuous:true, defMode:'cam'}, DB.settings||{});
  DB.resolutions = DB.resolutions||{}; DB.audit = DB.audit||[];
  DB.users = (DB.users&&DB.users.length)?DB.users:defaultDB().users;
  if(!DB.currentUserId) DB.currentUserId = DB.users[0].id;
  DB.branches = (DB.branches&&DB.branches.length)?DB.branches:defaultDB().branches;
}
function fmtDateTime(ts){ return fmtDate(ts)+' '+fmtTime(ts).split(', ').slice(-1)[0]; }
function slug(s){ return String(s||'app').replace(/[^\u0980-\u09FFa-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'app'; }
function download(name, content, mime){
  const blob = content instanceof Blob ? content : new Blob([content], {type: mime||'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}
function importMasterCSV(text){
  const lines = String(text||'').split(/\r?\n/).filter(l=>l.trim());
  let added=0, updated=0;
  for(let i=0;i<lines.length;i++){
    const cells = lines[i].split(',').map(c=>c.trim().replace(/^"|"$/g,''));
    if(i===0 && /article/i.test(cells[0])) continue; // header
    const key = normKey(cells[0]);
    if(!isValidKey(key)) continue;
    const before = !!ART_MAP[key];
    upsertArticle(key, cells[1]||'', cells[3]||'0', cells[2]||'0', cells[4]||'');
    before?updated++:added++;
  }
  return {added, updated};
}
function loadArticles(){
  try{ const raw = localStorage.getItem(ART_KEY); if(raw){ ARTICLES = JSON.parse(raw); } }catch(e){ ARTICLES = []; }
  rebuildArtMap();
}
function saveArticles(){ try{ localStorage.setItem(ART_KEY, JSON.stringify(ARTICLES)); }catch(e){} rebuildArtMap(); }
function rebuildArtMap(){ ART_MAP = {}; ARTICLES.forEach(a=>{ ART_MAP[a.key]=a; }); }

function currentUser(){ return DB.users.find(u=>u.id===DB.currentUserId) || DB.users[0]; }
function activeSession(){ return DB.sessions.find(s=>s.id===DB.activeSessionId) || null; }
function audit(action, detail){
  DB.audit.unshift({at: Date.now(), by: currentUser()?currentUser().name:'?', action, detail: String(detail||'').slice(0,200)});
  if(DB.audit.length>500) DB.audit.length=500;
}

/* ---------- scan engine (Excel logic, exact replica) ---------- */
function seenBarcodes(sessionId){
  const s = new Set();
  for(const sc of DB.scans){ if(sc.sessionId===sessionId && sc.barcode) s.add(sc.barcode); }
  return s;
}
/* input: {barcode?, manual?, qty?} -> scan record (not saved) */
function engineClassify(sessionId, input){
  const seen = seenBarcodes(sessionId);
  let {barcode, manual, qty} = input;
  barcode = String(barcode||'').trim();
  manual = String(manual||'').trim();
  qty = parseInt(qty,10); if(!(qty>0)) qty = 1;
  if(qty>9999) qty=9999;
  if(barcode){
    if(seen.has(barcode)) return {status:'DUPLICATE', art:null, attKey:barcode.slice(0,7), qty:0, barcode, manual:null};
    const k = barcode.slice(0,7);
    if(isValidKey(k) && ART_MAP[k]) return {status:'MATCHED', art:ART_MAP[k].art, key:k, qty:1, barcode, manual:null};
    return {status:'NOT FOUND', art:null, attKey:k, qty:0, barcode, manual:null};
  }
  const k = normKey(manual);
  if(!isValidKey(k)) return {status:'INVALID', art:null, attKey:k||manual, qty:0, barcode:null, manual};
  if(ART_MAP[k]) return {status:'MANUAL', art:ART_MAP[k].art, key:k, qty, barcode:null, manual:k};
  return {status:'NOT FOUND', art:null, attKey:k, qty:0, barcode:null, manual:k};
}
function addScan(sessionId, input, extra){
  const c = engineClassify(sessionId, input);
  DB.seq += 1;
  const rec = {
    id: uid(), sessionId, n: DB.seq,
    barcode: c.barcode, manual: c.manual, qty: c.qty,
    status: c.status, art: c.art, key: c.key||null, attKey: c.attKey||null,
    time: Date.now(), operator: (extra&&extra.operator)||currentUser().name,
    notes: (extra&&extra.notes)||'', photo: (extra&&extra.photo)||null,
  };
  DB.scans.push(rec); saveDB();
  return rec;
}

/* ---------- aggregates ---------- */
function sessionScans(sessionId){ return DB.scans.filter(s=>s.sessionId===sessionId); }
function aggregate(sessionId){
  const scans = sessionScans(sessionId);
  const counts = {total:scans.length, MATCHED:0, MANUAL:0, DUPLICATE:0, 'NOT FOUND':0, INVALID:0};
  const phys = {}; // key -> qty
  const artScans = {}; // key -> [scans]
  const dupGroups = {}; // barcode -> count
  const notFounds = [];
  const opCount = {};
  for(const s of scans){
    counts[s.status]=(counts[s.status]||0)+1;
    opCount[s.operator]=(opCount[s.operator]||0)+1;
    if(s.status==='MATCHED'||s.status==='MANUAL'){
      phys[s.key]=(phys[s.key]||0)+s.qty;
      (artScans[s.key]=artScans[s.key]||[]).push(s);
    } else if(s.status==='DUPLICATE'){ dupGroups[s.barcode]=(dupGroups[s.barcode]||0)+1; }
    else if(s.status==='NOT FOUND'){ notFounds.push(s); }
  }
  let sysQ=0, phyQ=0, sysV=0, phyV=0, grossS=0, grossSV=0, excQ=0, excV=0;
  const rows = ARTICLES.map(a=>{
    const p = phys[a.key]||0, d = p - a.system;
    sysQ+=a.system; phyQ+=p; sysV+=a.system*a.price; phyV+=p*a.price;
    if(d<0){ grossS+=-d; grossSV+=-d*a.price; } else if(d>0){ excQ+=d; excV+=d*a.price; }
    return {a, p, d, st: d<0?'SHORT':(d>0?'EXCESS':'MATCH'), v:d*a.price, sv:a.system*a.price, pv:p*a.price};
  });
  const shorts = rows.filter(r=>r.d<0).sort((x,y)=>x.d-y.d);
  const excess = rows.filter(r=>r.d>0).sort((x,y)=>y.d-x.d);
  return {counts, phys, artScans, dupGroups, notFounds, opCount, rows, shorts, excess,
    sysQ, phyQ, sysV, phyV, netQ:phyQ-sysQ, netV:phyV-sysV, grossS, grossSV, excQ, excV};
}
function lookupArticleOrBarcode(sessionId, q){
  q = String(q||'').trim();
  if(!q) return null;
  const k = normKey(q).slice(0,7);
  const agg = aggregate(sessionId);
  if(isValidKey(k) && ART_MAP[k]){
    const a = ART_MAP[k], p = agg.phys[k]||0, d = p-a.system;
    return {type:'article', a, p, d, st:d<0?'SHORT':(d>0?'EXCESS':'MATCH'),
      scans:(agg.artScans[k]||[]).length, sysV:a.system*a.price, pv:p*a.price};
  }
  // try exact barcode in log
  const hit = sessionScans(sessionId).find(s=>s.barcode===q);
  if(hit) return {type:'barcode', scan:hit};
  return {type:'none', q};
}

/* ---------- sessions / master / users ---------- */
function createSession(name, branchId, zone, opts){
  const s = {id:uid(), name, branchId:branchId||DB.branches[0].id, zone:zone||'',
    createdAt:Date.now(), closedAt:0, imported:!!(opts&&opts.imported)};
  DB.sessions.unshift(s); DB.activeSessionId=s.id; saveDB();
  audit('session.create', name);
  return s;
}
function branchName(id){ const b=DB.branches.find(b=>b.id===id); return b?b.name:''; }
function upsertArticle(art, cat, price, system, extra){
  art = String(art||'').trim(); const key = normKey(art);
  if(!isValidKey(key)) return {error:'INVALID'};
  const ex = ART_MAP[key];
  if(ex){ ex.art=fmtKey(key); ex.cat=cat||ex.cat; ex.price=+price||0; ex.system=(+system||0); if(extra!=null) ex.extra=extra; }
  else { ARTICLES.push({sl:ARTICLES.length+1, art:fmtKey(key), key, cat:cat||'', price:+price||0, system:+system||0, extra:extra||''}); }
  saveArticles(); saveDB(); audit('master.upsert', fmtKey(key));
  return {ok:true, key};
}

/* ---------- local file loader (WebView-proof: fetch -> XHR -> native bridge) ---------- */
async function fetchLocalJSON(path){
  // 1) fetch with timeout
  try{
    let ctrl, to=null;
    try{ ctrl = new AbortController(); to=setTimeout(()=>ctrl.abort(), 8000); }catch(e){ ctrl=null; }
    const r = await fetch(path, ctrl?{signal:ctrl.signal}:undefined);
    if(to) clearTimeout(to);
    if(r && r.ok) return await r.json();
  }catch(e){ /* fall through */ }
  // 2) XHR (works on file:// where fetch fails; status 0 = success on file://)
  try{
    const txt = await new Promise((res, rej)=>{
      try{
        const x = new XMLHttpRequest();
        x.open('GET', path, true);
        try{ x.timeout = 10000; }catch(e){}
        x.onload = ()=> (x.status===0||x.status===200) ? res(x.responseText) : rej(new Error('xhr '+x.status));
        x.onerror = ()=>rej(new Error('xhr err'));
        x.ontimeout = ()=>rej(new Error('xhr timeout'));
        x.send();
      }catch(e){ rej(e); }
    });
    return JSON.parse(txt);
  }catch(e){ /* fall through */ }
  // 3) Android native bridge (APK: reads straight from assets, always works)
  try{
    if(typeof window!=='undefined' && window.ShazimNative && window.ShazimNative.readAsset){
      const p = String(path||'').replace(/^\.\//,'');
      const txt = window.ShazimNative.readAsset('www/'+p);
      if(txt) return JSON.parse(txt);
    }
  }catch(e){ /* fall through */ }
  throw new Error('load-fail '+path);
}

/* ---------- first-run seed ---------- */
async function ensureSeeded(progress){
  loadDB(); loadArticles();
  if(DB.seeded && ARTICLES.length) return {already:true};
  // 1. articles
  progress(10, 'Article লোড হচ্ছে…');
  ARTICLES = await fetchLocalJSON('data/articles.json');
  saveArticles();
  // 2. demo session + scans
  progress(30, 'সেশন তৈরি হচ্ছে…');
  const s = createSession('Oct-2026 • Excel Archive', DB.branches[0].id, '', {imported:true});
  progress(45, '১০,৬৭২টি স্ক্যান লোড হচ্ছে…');
  const seed = await fetchLocalJSON('data/seed.json');
  const seen = new Set();
  const T = new Date(seed.t).getTime();
  const batch = [];
  for(let i=0;i<seed.rows.length;i++){
    const [fb, ma, q, op, nt] = seed.rows[i];
    let status, art=null, key=null, attKey=null, qty=q||1;
    if(fb){
      if(seen.has(fb)){ status='DUPLICATE'; qty=0; attKey=fb.slice(0,7); }
      else{ seen.add(fb); const k=fb.slice(0,7);
        if(isValidKey(k)&&ART_MAP[k]){ status='MATCHED'; key=k; art=ART_MAP[k].art; qty=1; }
        else{ status='NOT FOUND'; attKey=k; qty=0; } }
    } else {
      const k=normKey(ma);
      if(!isValidKey(k)){ status='INVALID'; attKey=k||ma; qty=0; }
      else if(ART_MAP[k]){ status='MANUAL'; key=k; art=ART_MAP[k].art; }
      else{ status='NOT FOUND'; attKey=k; qty=0; }
    }
    DB.seq+=1;
    batch.push({id:'seed'+i, sessionId:s.id, n:DB.seq, barcode:fb, manual:fb?null:(isValidKey(normKey(ma))?normKey(ma):ma),
      qty, status, art, key, attKey, time:T, operator:op||'Excel', notes:nt||'', photo:null});
    if(i%2500===0) progress(45+Math.round(i/seed.rows.length*45), 'Scan '+fmtNum(i)+'...');
  }
  DB.scans = DB.scans.concat(batch);
  DB.seeded = true; saveDB();
  audit('seed.import', '10672 scans');
  progress(100, 'প্রস্তুত ✅');
  return {already:false};
}

/* ---------- backup ---------- */
function exportBackup(){
  const blob = new Blob([JSON.stringify({db:DB, articles:ARTICLES})], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'shazim-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  DB.lastBackup = Date.now(); saveDB();
}
function importBackup(obj){
  if(!obj || !obj.db || !obj.articles) throw new Error('bad file');
  DB = obj.db; ARTICLES = obj.articles;
  saveDB(); saveArticles();
}
