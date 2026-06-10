// ============================================================
// afo-demo-template  v1.1.0
// v1.1.0: adds /admin panel — password protected, leads,
//         content editor, publish, status dashboard.
// ADMIN_PASSWORD env var (default: "afo-admin")
// ============================================================

const VERSION = '1.1.0';
const WORKER  = 'afo-demo-template';

function esc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function j(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
  });
}
function h(body, status = 200) {
  return new Response(body, {
    status, headers: { 'content-type': 'text/html;charset=UTF-8', 'cache-control': 'no-store' }
  });
}
function now() { return new Date().toISOString(); }

async function dbFirst(env, sql, params = []) {
  return env.DEMO_DB.prepare(sql).bind(...params).first();
}
async function dbAll(env, sql, params = []) {
  const r = await env.DEMO_DB.prepare(sql).bind(...params).all();
  return r.results || [];
}
async function dbRun(env, sql, params = []) {
  return env.DEMO_DB.prepare(sql).bind(...params).run();
}

async function loadSection(env, slug, section, fallback = null) {
  const row = await dbFirst(env, 'SELECT data FROM demo_content WHERE slug=? AND section=?', [slug, section]);
  if (!row) return fallback;
  try { return JSON.parse(row.data); } catch { return row.data; }
}

async function loadAllContent(env, slug) {
  const rows = await dbAll(env, 'SELECT section, data FROM demo_content WHERE slug=?', [slug]);
  const content = {};
  for (const row of rows) {
    try { content[row.section] = JSON.parse(row.data); } catch { content[row.section] = row.data; }
  }
  return content;
}

function defaultContact() {
  return {
    company: 'Your Business Name', phone: '(555) 000-0000', address: 'City, State',
    email: '', hours: 'Mon-Fri 9am-5pm', website: '', tagline: 'A great place to do business.',
    primary_color: '#14110d', secondary_color: '#fff8ee', accent_color: '#b76532',
    hero_image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=75',
  };
}
function defaultServices() {
  return [
    { id: 's1', name: 'Service One',   desc: 'Description of your first service or offering.' },
    { id: 's2', name: 'Service Two',   desc: 'Description of your second service or offering.' },
    { id: 's3', name: 'Service Three', desc: 'Description of your third service or offering.' },
  ];
}
function defaultTestimonials() {
  return [
    { name: 'Happy Customer',  role: 'Client',       quote: 'Excellent service, highly recommend.' },
    { name: 'Satisfied Guest', role: 'Repeat Client', quote: 'Professional, reliable, and easy to work with.' },
  ];
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function checkAuth(request, env) {
  const pw = env.ADMIN_PASSWORD || 'afo-admin';
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7) === pw;
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp('(?:^|;)\\s*afo_admin=([^;]+)'));
  return match && match[1] === pw;
}

// ── Admin HTML ────────────────────────────────────────────────────────────────

function renderLogin(msg) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Admin Login</title>' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:Inter,system-ui,sans-serif;background:#0f0f0f;color:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:100vh}' +
    '.box{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:2.5rem;width:min(400px,90vw)}' +
    'h1{font-size:1.4rem;font-weight:800;margin-bottom:.25rem}' +
    'p{color:#888;font-size:.88rem;margin-bottom:1.75rem}' +
    'input{width:100%;padding:.75rem 1rem;background:#111;border:1px solid #333;border-radius:10px;color:#f0f0f0;font-size:.95rem;margin-bottom:1rem}' +
    'button{width:100%;padding:.8rem;background:#fff;color:#111;border:none;border-radius:10px;font-weight:700;font-size:.95rem;cursor:pointer}' +
    '.err{color:#f87171;font-size:.85rem;margin-top:.75rem;text-align:center}' +
    '</style></head><body>' +
    '<div class="box">' +
    '<h1>AFO Demo Admin</h1><p>Enter your admin password to continue.</p>' +
    '<input id="pw" type="password" placeholder="Password" onkeydown="if(event.key===\'Enter\')login()">' +
    '<button onclick="login()">Sign In</button>' +
    (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
    '</div>' +
    '<script>async function login(){' +
    'var pw=document.getElementById("pw").value;' +
    'var r=await fetch("/admin/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:pw})});' +
    'var d=await r.json();' +
    'if(d.ok){document.cookie="afo_admin="+pw+";path=/;max-age=86400";location.reload();}' +
    'else{document.querySelector(".err")||document.querySelector("button").insertAdjacentHTML("afterend","<p class=\\"err\\">Wrong password</p>");}' +
    '}</script>' +
    '</body></html>';
}

function renderAdmin(contact, services, testimonials, leads, snap, slug) {
  const co = contact.company || 'Your Business';
  const leadsRows = leads.map(function(l) {
    return '<tr><td>' + esc(l.name||'—') + '</td><td>' + esc(l.email||'—') + '</td><td>' + esc(l.phone||'—') + '</td><td>' + esc(l.message||'—') + '</td><td>' + esc((l.created_at||'').slice(0,10)) + '</td></tr>';
  }).join('');

  const snapAge = snap ? Math.round((Date.now() - new Date(snap.published_at).getTime()) / 60000) + 'm ago' : 'Never';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Admin — ' + esc(co) + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:Inter,sans-serif;background:#0f0f0f;color:#e8e8e8;line-height:1.5}' +
    'a{color:#60a5fa;text-decoration:none}' +
    '.topbar{background:#151515;border-bottom:1px solid #222;padding:.9rem 1.5rem;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10}' +
    '.topbar-left{display:flex;align-items:center;gap:1rem}' +
    '.topbar h1{font-size:1rem;font-weight:700;color:#f0f0f0}' +
    '.slug-badge{background:#222;border:1px solid #333;border-radius:999px;padding:.2rem .7rem;font-size:.75rem;color:#888}' +
    '.logout{font-size:.82rem;color:#888;cursor:pointer;background:none;border:none;color:#888}' +
    '.wrap{max-width:960px;margin:0 auto;padding:2rem 1.5rem}' +
    '.grid-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem}' +
    '.stat{background:#151515;border:1px solid #222;border-radius:14px;padding:1.1rem 1.25rem}' +
    '.stat-label{font-size:.75rem;color:#666;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem}' +
    '.stat-val{font-size:1.5rem;font-weight:800;color:#f0f0f0}' +
    '.stat-val.ok{color:#4ade80}.stat-val.warn{color:#fb923c}' +
    '.card{background:#151515;border:1px solid #222;border-radius:16px;margin-bottom:1.5rem;overflow:hidden}' +
    '.card-head{padding:1rem 1.25rem;border-bottom:1px solid #1e1e1e;display:flex;justify-content:space-between;align-items:center}' +
    '.card-head h2{font-size:.95rem;font-weight:700}' +
    '.card-body{padding:1.25rem}' +
    'label{display:block;font-size:.78rem;color:#888;margin-bottom:.3rem;margin-top:.9rem}' +
    'label:first-child{margin-top:0}' +
    'input[type=text],input[type=email],input[type=tel],input[type=url],textarea,select{width:100%;padding:.65rem .9rem;background:#111;border:1px solid #2a2a2a;border-radius:9px;color:#e8e8e8;font-family:inherit;font-size:.9rem}' +
    'textarea{height:90px;resize:vertical}' +
    '.row2{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}' +
    '.btn{border-radius:10px;padding:.65rem 1.25rem;font-weight:600;font-size:.88rem;cursor:pointer;border:none;transition:.15s}' +
    '.btn-primary{background:#2563eb;color:#fff}.btn-primary:hover{background:#1d4ed8}' +
    '.btn-green{background:#16a34a;color:#fff}.btn-green:hover{background:#15803d}' +
    '.btn-red{background:#dc2626;color:#fff;font-size:.8rem;padding:.4rem .8rem}' +
    '.btn-sm{padding:.4rem .85rem;font-size:.82rem}' +
    '.actions-bar{display:flex;gap:.75rem;margin-top:1rem;flex-wrap:wrap}' +
    '.msg{margin-top:.75rem;font-size:.85rem;padding:.5rem .8rem;border-radius:8px;display:none}' +
    '.msg.ok{background:#14532d;color:#4ade80;display:block}.msg.err{background:#450a0a;color:#f87171;display:block}' +
    'table{width:100%;border-collapse:collapse;font-size:.85rem}' +
    'th{text-align:left;padding:.5rem .75rem;color:#666;font-weight:600;border-bottom:1px solid #1e1e1e;font-size:.75rem;text-transform:uppercase;letter-spacing:.06em}' +
    'td{padding:.65rem .75rem;border-bottom:1px solid #1a1a1a;color:#ccc}' +
    'tr:last-child td{border-bottom:none}' +
    '.empty{color:#555;font-size:.88rem;padding:1rem 0;text-align:center}' +
    '.section-sep{margin:2rem 0 1rem;font-size:.75rem;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.1em}' +
    '.preview-link{font-size:.82rem;color:#60a5fa}' +
    '@media(max-width:640px){.grid-stats{grid-template-columns:1fr 1fr}.row2{grid-template-columns:1fr}}' +
    '</style></head><body>' +

    '<div class="topbar">' +
    '<div class="topbar-left">' +
    '<h1>AFO Demo Admin</h1>' +
    '<span class="slug-badge">' + esc(slug) + '</span>' +
    '</div>' +
    '<div style="display:flex;gap:1rem;align-items:center">' +
    '<a class="preview-link" href="/" target="_blank">View Site &rarr;</a>' +
    '<button class="logout" onclick="logout()">Sign Out</button>' +
    '</div>' +
    '</div>' +

    '<div class="wrap">' +

    /* Stats */
    '<div class="grid-stats">' +
    '<div class="stat"><div class="stat-label">Leads</div><div class="stat-val">' + leads.length + '</div></div>' +
    '<div class="stat"><div class="stat-label">Snapshot</div><div class="stat-val ' + (snap ? 'ok' : 'warn') + '">' + snapAge + '</div></div>' +
    '<div class="stat"><div class="stat-label">Sections</div><div class="stat-val">3</div></div>' +
    '<div class="stat"><div class="stat-label">Version</div><div class="stat-val" style="font-size:1rem">' + esc(VERSION) + '</div></div>' +
    '</div>' +

    /* Publish */
    '<div class="card">' +
    '<div class="card-head"><h2>Publish</h2></div>' +
    '<div class="card-body">' +
    '<p style="color:#888;font-size:.88rem;margin-bottom:1rem">Rebuild the cached homepage snapshot from current D1 content. Always publish after editing.</p>' +
    '<button class="btn btn-green" onclick="publish()">Publish Site Live</button>' +
    '<div id="pub-msg" class="msg"></div>' +
    '</div></div>' +

    /* Contact editor */
    '<div class="card">' +
    '<div class="card-head"><h2>Business Info</h2></div>' +
    '<div class="card-body">' +
    '<div class="row2">' +
    '<div><label>Business Name</label><input type="text" id="co-name" value="' + esc(contact.company||'') + '"></div>' +
    '<div><label>Tagline</label><input type="text" id="co-tag" value="' + esc(contact.tagline||'') + '"></div>' +
    '</div>' +
    '<div class="row2">' +
    '<div><label>Phone</label><input type="tel" id="co-phone" value="' + esc(contact.phone||'') + '"></div>' +
    '<div><label>Email</label><input type="email" id="co-email" value="' + esc(contact.email||'') + '"></div>' +
    '</div>' +
    '<label>Address</label><input type="text" id="co-addr" value="' + esc(contact.address||'') + '">' +
    '<label>Hours</label><input type="text" id="co-hours" value="' + esc(contact.hours||'') + '">' +
    '<label>Website</label><input type="url" id="co-web" value="' + esc(contact.website||'') + '">' +
    '<label>Hero Image URL</label><input type="url" id="co-hero" value="' + esc(contact.hero_image||'') + '">' +
    '<div class="row2" style="margin-top:.9rem">' +
    '<div><label>Primary Color</label><input type="text" id="co-pc" value="' + esc(contact.primary_color||'') + '"></div>' +
    '<div><label>Accent Color</label><input type="text" id="co-ac" value="' + esc(contact.accent_color||'') + '"></div>' +
    '</div>' +
    '<div class="actions-bar"><button class="btn btn-primary" onclick="saveContact()">Save Business Info</button></div>' +
    '<div id="contact-msg" class="msg"></div>' +
    '</div></div>' +

    /* Services editor */
    '<div class="card">' +
    '<div class="card-head"><h2>Services / Offerings</h2><button class="btn btn-primary btn-sm" onclick="addService()">+ Add</button></div>' +
    '<div class="card-body">' +
    '<div id="services-list">' +
    (Array.isArray(services) ? services : []).map(function(s, i) {
      return '<div class="service-item" data-i="' + i + '" style="border:1px solid #222;border-radius:12px;padding:1rem;margin-bottom:.75rem">' +
        '<div class="row2">' +
        '<div><label>Name</label><input type="text" class="svc-name" value="' + esc(s.name||s.title||'') + '"></div>' +
        '<div style="display:flex;align-items:flex-end;gap:.5rem"><button class="btn btn-red" onclick="removeService(this)">Remove</button></div>' +
        '</div>' +
        '<label>Description</label><textarea class="svc-desc">' + esc(s.desc||s.description||'') + '</textarea>' +
        '</div>';
    }).join('') +
    '</div>' +
    '<div class="actions-bar"><button class="btn btn-primary" onclick="saveServices()">Save Services</button></div>' +
    '<div id="services-msg" class="msg"></div>' +
    '</div></div>' +

    /* Testimonials editor */
    '<div class="card">' +
    '<div class="card-head"><h2>Testimonials / Reviews</h2><button class="btn btn-primary btn-sm" onclick="addTestimonial()">+ Add</button></div>' +
    '<div class="card-body">' +
    '<div id="testimonials-list">' +
    (Array.isArray(testimonials) ? testimonials : []).map(function(t, i) {
      return '<div class="testimonial-item" style="border:1px solid #222;border-radius:12px;padding:1rem;margin-bottom:.75rem">' +
        '<div class="row2">' +
        '<div><label>Name</label><input type="text" class="t-name" value="' + esc(t.name||'') + '"></div>' +
        '<div style="display:flex;align-items:flex-end;gap:.5rem"><div style="flex:1"><label>Role</label><input type="text" class="t-role" value="' + esc(t.role||'') + '"></div><button class="btn btn-red" onclick="removeTestimonial(this)">Remove</button></div>' +
        '</div>' +
        '<label>Quote</label><textarea class="t-quote">' + esc(t.quote||t.text||'') + '</textarea>' +
        '</div>';
    }).join('') +
    '</div>' +
    '<div class="actions-bar"><button class="btn btn-primary" onclick="saveTestimonials()">Save Testimonials</button></div>' +
    '<div id="testimonials-msg" class="msg"></div>' +
    '</div></div>' +

    /* Leads table */
    '<div class="section-sep">Leads (' + leads.length + ')</div>' +
    '<div class="card">' +
    '<div class="card-body">' +
    (leads.length ? (
      '<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Message</th><th>Date</th></tr></thead>' +
      '<tbody>' + leadsRows + '</tbody></table>'
    ) : '<p class="empty">No leads yet.</p>') +
    '</div></div>' +

    '</div>' + /* end .wrap */

    '<script>' +
    'function showMsg(id,ok,text){var el=document.getElementById(id);el.textContent=text;el.className="msg "+(ok?"ok":"err");}' +

    /* Auth */
    'async function logout(){document.cookie="afo_admin=;path=/;max-age=0";location.reload();}' +

    /* Publish */
    'async function publish(){' +
    'showMsg("pub-msg",true,"Publishing...");' +
    'try{var r=await fetch("/api/publish",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});' +
    'var d=await r.json();showMsg("pub-msg",d.ok,d.ok?"Published! Size: "+d.size+" bytes":"Error: "+(d.error||"unknown"));}' +
    'catch(e){showMsg("pub-msg",false,"Error: "+e.message);}' +
    '}' +

    /* Save contact */
    'async function saveContact(){' +
    'var data={company:document.getElementById("co-name").value,tagline:document.getElementById("co-tag").value,phone:document.getElementById("co-phone").value,email:document.getElementById("co-email").value,address:document.getElementById("co-addr").value,hours:document.getElementById("co-hours").value,website:document.getElementById("co-web").value,hero_image:document.getElementById("co-hero").value,primary_color:document.getElementById("co-pc").value,accent_color:document.getElementById("co-ac").value};' +
    'try{var r=await fetch("/admin/api/content",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({section:"contact",data:data})});' +
    'var d=await r.json();showMsg("contact-msg",d.ok,d.ok?"Saved! Remember to Publish.":"Error: "+(d.error||"unknown"));}' +
    'catch(e){showMsg("contact-msg",false,"Error: "+e.message);}' +
    '}' +

    /* Services */
    'function addService(){' +
    'var html=\'<div class="service-item" style="border:1px solid #222;border-radius:12px;padding:1rem;margin-bottom:.75rem"><div class="row2"><div><label>Name</label><input type="text" class="svc-name" value=""></div><div style="display:flex;align-items:flex-end"><button class="btn btn-red" onclick="removeService(this)">Remove</button></div></div><label>Description</label><textarea class="svc-desc"></textarea></div>\';' +
    'document.getElementById("services-list").insertAdjacentHTML("beforeend",html);' +
    '}' +
    'function removeService(btn){btn.closest(".service-item").remove();}' +
    'async function saveServices(){' +
    'var items=Array.from(document.querySelectorAll(".service-item")).map(function(el,i){return{id:"s"+(i+1),name:el.querySelector(".svc-name").value,desc:el.querySelector(".svc-desc").value};});' +
    'try{var r=await fetch("/admin/api/content",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({section:"services",data:items})});' +
    'var d=await r.json();showMsg("services-msg",d.ok,d.ok?"Saved! Remember to Publish.":"Error: "+(d.error||"unknown"));}' +
    'catch(e){showMsg("services-msg",false,"Error: "+e.message);}' +
    '}' +

    /* Testimonials */
    'function addTestimonial(){' +
    'var html=\'<div class="testimonial-item" style="border:1px solid #222;border-radius:12px;padding:1rem;margin-bottom:.75rem"><div class="row2"><div><label>Name</label><input type="text" class="t-name" value=""></div><div style="display:flex;align-items:flex-end;gap:.5rem"><div style="flex:1"><label>Role</label><input type="text" class="t-role" value=""></div><button class="btn btn-red" onclick="removeTestimonial(this)">Remove</button></div></div><label>Quote</label><textarea class="t-quote"></textarea></div>\';' +
    'document.getElementById("testimonials-list").insertAdjacentHTML("beforeend",html);' +
    '}' +
    'function removeTestimonial(btn){btn.closest(".testimonial-item").remove();}' +
    'async function saveTestimonials(){' +
    'var items=Array.from(document.querySelectorAll(".testimonial-item")).map(function(el){return{name:el.querySelector(".t-name").value,role:el.querySelector(".t-role").value,quote:el.querySelector(".t-quote").value};});' +
    'try{var r=await fetch("/admin/api/content",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({section:"testimonials",data:items})});' +
    'var d=await r.json();showMsg("testimonials-msg",d.ok,d.ok?"Saved! Remember to Publish.":"Error: "+(d.error||"unknown"));}' +
    'catch(e){showMsg("testimonials-msg",false,"Error: "+e.message);}' +
    '}' +
    '</script>' +
    '</body></html>';
}

// ── Public page renderer ──────────────────────────────────────────────────────

function renderPage(contact, services, testimonials, slug) {
  const co   = contact.company      || 'Your Business';
  const ph   = contact.phone        || '';
  const addr = contact.address      || '';
  const hrs  = contact.hours        || '';
  const tag  = contact.tagline      || '';
  const hero = (contact.hero_image  || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=75').replace(/"/g, '');
  const pc   = contact.primary_color   || '#14110d';
  const sc   = contact.secondary_color || '#fff8ee';
  const ac   = contact.accent_color    || '#b76532';
  const phUrl = ph ? 'tel:' + ph.replace(/\D/g,'').replace(/^(\d{10})$/,'+1$1') : '#';

  const serviceCards = (Array.isArray(services) ? services : []).map(function(s) {
    return '<article class="card"><div class="card-body"><h3>' + esc(s.name||s.title||'') + '</h3><p>' + esc(s.desc||s.description||'') + '</p></div></article>';
  }).join('');

  const testimonialCards = (Array.isArray(testimonials) ? testimonials : []).map(function(t) {
    return '<figure class="quote"><blockquote>' + esc(t.quote||t.text||'') + '</blockquote><figcaption>' + esc(t.name||'') + (t.role ? ' &middot; ' + esc(t.role) : '') + '</figcaption></figure>';
  }).join('');

  const css = ':root{--ink:' + pc + ';--paper:' + sc + ';--accent:' + ac + ';--muted:#74685f;--card:#fffdf8;--line:rgba(20,17,13,.12);--shadow:0 8px 40px rgba(0,0,0,.10)}' +
    '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,sans-serif;background:var(--paper);color:var(--ink);line-height:1.6}a{color:inherit;text-decoration:none}' +
    '.nav{position:sticky;top:0;z-index:10;background:rgba(255,248,238,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}' +
    '.nav-inner{max-width:1100px;margin:auto;padding:.9rem 1.5rem;display:flex;justify-content:space-between;align-items:center}' +
    '.brand{font-weight:900;font-size:1.1rem;letter-spacing:-.03em}.nav-phone{font-weight:700;color:var(--accent);font-size:.9rem}' +
    '.hero{min-height:500px;display:grid;align-items:end;padding:80px 0 50px;background:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.2)),url("' + hero + '") center/cover;border-radius:0 0 40px 40px;color:#fff}' +
    '.hero-inner{max-width:1100px;margin:auto;padding:0 1.5rem}' +
    '.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.72rem;font-weight:700;color:#e8a87c;margin-bottom:.5rem}' +
    '.hero h1{font-size:clamp(2.4rem,6vw,5.5rem);line-height:.92;letter-spacing:-.06em;margin-bottom:1rem;font-weight:900}' +
    '.hero p{font-size:1.05rem;opacity:.88;max-width:520px;margin-bottom:1.5rem}' +
    '.actions{display:flex;gap:.75rem;flex-wrap:wrap}' +
    '.btn{border-radius:999px;padding:.75rem 1.4rem;font-weight:700;font-size:.9rem;border:1px solid rgba(255,255,255,.3);color:#fff;background:rgba(255,255,255,.12)}' +
    '.btn.primary{background:#fff;color:var(--ink);border-color:#fff}' +
    '.section{max-width:1100px;margin:auto;padding:3rem 1.5rem}' +
    '.section-head{margin-bottom:1.75rem}.section-head .eyebrow{color:var(--accent)}' +
    '.section-head h2{font-size:clamp(1.8rem,3.5vw,3rem);font-weight:900;letter-spacing:-.05em;line-height:1}' +
    '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem}' +
    '.card{border:1px solid var(--line);border-radius:24px;background:var(--card);box-shadow:var(--shadow);overflow:hidden}' +
    '.card-body{padding:1.25rem}.card h3{font-size:1.1rem;font-weight:700;letter-spacing:-.02em;margin-bottom:.5rem}.card p{color:var(--muted);font-size:.92rem}' +
    '.quotes{display:flex;gap:1rem;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:.5rem}' +
    '.quote{min-width:260px;scroll-snap-align:start;border:1px solid var(--line);border-radius:20px;padding:1.25rem;background:var(--card);flex-shrink:0}' +
    '.quote blockquote{font-size:.95rem;margin-bottom:.75rem;font-style:italic}.quote figcaption{font-size:.8rem;font-weight:700;color:var(--muted)}' +
    '.info-panel{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}' +
    '.panel{border:1px solid var(--line);border-radius:24px;padding:1.5rem;background:var(--card);box-shadow:var(--shadow)}' +
    '.panel h3{font-size:1rem;font-weight:700;margin-bottom:.75rem}.panel p{color:var(--muted);font-size:.92rem;line-height:1.7}' +
    '.form-wrap{max-width:560px}.form-wrap input,.form-wrap textarea{width:100%;padding:.75rem 1rem;border:1px solid var(--line);border-radius:12px;font-family:inherit;font-size:.95rem;background:var(--card);color:var(--ink);margin-bottom:.75rem}' +
    '.form-wrap textarea{height:110px;resize:vertical}.btn-submit{background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:.8rem 1.8rem;font-weight:700;font-size:.95rem;cursor:pointer;width:100%}' +
    '#form-msg{margin-top:.75rem;font-size:.9rem;color:var(--accent)}' +
    '.sticky-cta{position:fixed;z-index:40;left:1rem;right:1rem;bottom:1rem;display:flex;justify-content:center}' +
    '.sticky-cta a{width:min(480px,100%);text-align:center;border-radius:999px;padding:.9rem 1.5rem;background:var(--ink);color:var(--paper);font-weight:700;font-size:.95rem;box-shadow:0 16px 50px rgba(0,0,0,.28)}' +
    'footer{text-align:center;padding:2rem 1rem 6rem;color:var(--muted);font-size:.82rem}' +
    '@media(max-width:768px){.grid,.info-panel{grid-template-columns:1fr}.hero h1{font-size:2.4rem}}';

  return '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(co) + '</title><meta name="description" content="' + esc(tag) + '">' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">' +
    '<style>' + css + '</style></head><body>' +
    '<nav class="nav"><div class="nav-inner"><a class="brand" href="/">' + esc(co) + '</a>' +
    (ph ? '<a class="nav-phone" href="' + esc(phUrl) + '">' + esc(ph) + '</a>' : '') + '</div></nav>' +
    '<section class="hero"><div class="hero-inner">' +
    '<p class="eyebrow">Welcome</p><h1>' + esc(co) + '</h1><p>' + esc(tag) + '</p>' +
    '<div class="actions"><a class="btn primary" href="#contact">Get in Touch</a>' +
    (ph ? '<a class="btn" href="' + esc(phUrl) + '">Call Now</a>' : '') +
    '</div></div></section>' +
    '<div class="section"><div class="section-head"><p class="eyebrow">What We Offer</p><h2>Services &amp; Offerings</h2></div>' +
    '<div class="grid">' + serviceCards + '</div></div>' +
    (testimonialCards ? '<div class="section"><div class="section-head"><p class="eyebrow">What People Say</p><h2>Reviews</h2></div><div class="quotes">' + testimonialCards + '</div></div>' : '') +
    '<div class="section"><div class="info-panel">' +
    '<div class="panel"><h3>Hours</h3><p>' + esc(hrs || 'Contact us for hours') + '</p></div>' +
    '<div class="panel"><h3>Location</h3><p>' + esc(addr || 'Contact us for location') + '</p></div>' +
    '</div></div>' +
    '<div class="section" id="contact"><div class="section-head"><p class="eyebrow">Reach Out</p><h2>Contact Us</h2></div>' +
    '<div class="form-wrap">' +
    '<input id="f-name" type="text" placeholder="Your Name">' +
    '<input id="f-email" type="email" placeholder="Email Address">' +
    '<input id="f-phone" type="tel" placeholder="Phone Number">' +
    '<textarea id="f-msg" placeholder="How can we help?"></textarea>' +
    '<button class="btn-submit" onclick="submitLead()">Send Message</button>' +
    '<p id="form-msg"></p></div></div>' +
    '<footer>' + esc(co) + (addr ? ' &nbsp;&bull;&nbsp; ' + esc(addr) : '') + (ph ? ' &nbsp;&bull;&nbsp; ' + esc(ph) : '') + '</footer>' +
    '<div class="sticky-cta"><a href="#contact">Contact ' + esc(co) + '</a></div>' +
    '<script>async function submitLead(){' +
    'var msg=document.getElementById("form-msg");' +
    'var body={name:document.getElementById("f-name").value,email:document.getElementById("f-email").value,phone:document.getElementById("f-phone").value,message:document.getElementById("f-msg").value};' +
    'if(!body.name&&!body.email){msg.textContent="Please enter your name and email.";return;}' +
    'msg.textContent="Sending...";' +
    'try{var r=await fetch("/api/lead",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});' +
    'var d=await r.json();msg.textContent=d.ok?"Thanks! We will be in touch soon.":"Error: "+(d.error||"unknown");}' +
    'catch(e){msg.textContent="Error: "+e.message;}}</script>' +
    '</body></html>';
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleHome(env, slug) {
  const snap = await dbFirst(env, 'SELECT html FROM demo_snapshots WHERE slug=?', [slug]);
  if (snap?.html) return h(snap.html);
  const contact      = await loadSection(env, slug, 'contact',      defaultContact());
  const services     = await loadSection(env, slug, 'services',     defaultServices());
  const testimonials = await loadSection(env, slug, 'testimonials', defaultTestimonials());
  return h(renderPage(contact, services, testimonials, slug));
}

async function handlePublish(env, slug) {
  const contact      = await loadSection(env, slug, 'contact',      defaultContact());
  const services     = await loadSection(env, slug, 'services',     defaultServices());
  const testimonials = await loadSection(env, slug, 'testimonials', defaultTestimonials());
  const html = renderPage(contact, services, testimonials, slug);
  await dbRun(env,
    'INSERT INTO demo_snapshots (slug,html,published_at) VALUES (?,?,?) ON CONFLICT(slug) DO UPDATE SET html=excluded.html,published_at=excluded.published_at',
    [slug, html, now()]
  );
  return j({ ok: true, slug, message: 'Demo published!', size: html.length, published_at: now() });
}

async function handleLead(request, env, slug) {
  const body = await request.json().catch(() => ({}));
  await dbRun(env,
    'INSERT INTO demo_leads (slug,name,email,phone,message,created_at) VALUES (?,?,?,?,?,?)',
    [slug, body.name||'', body.email||'', body.phone||'', body.message||'', now()]
  );
  return j({ ok: true, slug });
}

async function handleStatus(env, slug) {
  const tenant  = await dbFirst(env, 'SELECT * FROM tenants WHERE slug=?', [slug]);
  const contact = await loadSection(env, slug, 'contact', null);
  const snap    = await dbFirst(env, 'SELECT published_at FROM demo_snapshots WHERE slug=?', [slug]);
  const leads   = await dbFirst(env, 'SELECT COUNT(*) as c FROM demo_leads WHERE slug=?', [slug]);
  return j({ ok: true, worker: WORKER, version: VERSION, slug, tenant: tenant?.name||null, vertical: tenant?.vertical||'generic', has_contact: !!contact, has_snapshot: !!snap, snapshot_at: snap?.published_at||null, leads: leads?.c||0 });
}

async function handleContent(env, slug) {
  const content = await loadAllContent(env, slug);
  return j({ ok: true, slug, sections: Object.keys(content), content });
}

async function handleAdmin(request, env, slug) {
  if (!checkAuth(request, env)) return h(renderLogin(''), 401);
  const contact      = await loadSection(env, slug, 'contact',      defaultContact());
  const services     = await loadSection(env, slug, 'services',     defaultServices());
  const testimonials = await loadSection(env, slug, 'testimonials', defaultTestimonials());
  const leads        = await dbAll(env, 'SELECT * FROM demo_leads WHERE slug=? ORDER BY id DESC LIMIT 50', [slug]);
  const snap         = await dbFirst(env, 'SELECT published_at FROM demo_snapshots WHERE slug=?', [slug]);
  return h(renderAdmin(contact, services, testimonials, leads, snap, slug));
}

async function handleAdminAuth(request, env) {
  const body = await request.json().catch(() => ({}));
  const pw   = env.ADMIN_PASSWORD || 'afo-admin';
  return j({ ok: body.password === pw });
}

async function handleAdminContent(request, env, slug) {
  if (!checkAuth(request, env)) return j({ ok: false, error: 'unauthorized' }, 401);
  const body = await request.json().catch(() => ({}));
  if (!body.section) return j({ ok: false, error: 'section required' }, 400);
  const data = JSON.stringify(body.data);
  await dbRun(env,
    'INSERT INTO demo_content (slug,section,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(slug,section) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at',
    [slug, body.section, data, now()]
  );
  return j({ ok: true, slug, section: body.section });
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method;
    const slug   = env.DEMO_SLUG || 'default';

    if (method === 'OPTIONS') return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,Cookie' }
    });

    if (method === 'GET'  && path === '/')                  return handleHome(env, slug);
    if (method === 'POST' && path === '/api/publish')       return handlePublish(env, slug);
    if (method === 'POST' && path === '/api/lead')          return handleLead(request, env, slug);
    if (method === 'GET'  && path === '/api/status')        return handleStatus(env, slug);
    if (method === 'GET'  && path === '/api/content')       return handleContent(env, slug);
    if (method === 'GET'  && path === '/admin')             return handleAdmin(request, env, slug);
    if (method === 'POST' && path === '/admin/auth')        return handleAdminAuth(request, env);
    if (method === 'POST' && path === '/admin/api/content') return handleAdminContent(request, env, slug);
    return j({ ok: false, error: 'not_found', path }, 404);
  }
};
