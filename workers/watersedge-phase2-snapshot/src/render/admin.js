// src/render/admin.js — watersedge-phase2-snapshot
import { esc } from '../utils.js';

const VERSION = '1.1.0';

export function renderAdmin(contact, services, testimonials, leads, snap, slug) {
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
    '.logout{font-size:.82rem;cursor:pointer;background:none;border:none;color:#888}' +
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
    'input[type=text],input[type=email],input[type=tel],input[type=url],textarea{width:100%;padding:.65rem .9rem;background:#111;border:1px solid #2a2a2a;border-radius:9px;color:#e8e8e8;font-family:inherit;font-size:.9rem}' +
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

    '<div class="topbar"><div class="topbar-left">' +
    '<h1>AFO Demo Admin</h1><span class="slug-badge">' + esc(slug) + '</span>' +
    '</div><div style="display:flex;gap:1rem;align-items:center">' +
    '<a class="preview-link" href="/" target="_blank">View Site &rarr;</a>' +
    '<button class="logout" onclick="logout()">Sign Out</button>' +
    '</div></div>' +

    '<div class="wrap">' +

    '<div class="grid-stats">' +
    '<div class="stat"><div class="stat-label">Leads</div><div class="stat-val">' + leads.length + '</div></div>' +
    '<div class="stat"><div class="stat-label">Snapshot</div><div class="stat-val ' + (snap ? 'ok' : 'warn') + '">' + snapAge + '</div></div>' +
    '<div class="stat"><div class="stat-label">Sections</div><div class="stat-val">3</div></div>' +
    '<div class="stat"><div class="stat-label">Version</div><div class="stat-val" style="font-size:1rem">' + esc(VERSION) + '</div></div>' +
    '</div>' +

    '<div class="card"><div class="card-head"><h2>Publish</h2></div><div class="card-body">' +
    '<p style="color:#888;font-size:.88rem;margin-bottom:1rem">Rebuild the cached homepage snapshot from current D1 content. Always publish after editing.</p>' +
    '<button class="btn btn-green" onclick="publish()">Publish Site Live</button>' +
    '<div id="pub-msg" class="msg"></div></div></div>' +

    '<div class="card"><div class="card-head"><h2>Business Info</h2></div><div class="card-body">' +
    '<div class="row2"><div><label>Business Name</label><input type="text" id="co-name" value="' + esc(contact.company||'') + '"></div>' +
    '<div><label>Tagline</label><input type="text" id="co-tag" value="' + esc(contact.tagline||'') + '"></div></div>' +
    '<div class="row2"><div><label>Phone</label><input type="tel" id="co-phone" value="' + esc(contact.phone||'') + '"></div>' +
    '<div><label>Email</label><input type="email" id="co-email" value="' + esc(contact.email||'') + '"></div></div>' +
    '<label>Address</label><input type="text" id="co-addr" value="' + esc(contact.address||'') + '">' +
    '<label>Hours</label><input type="text" id="co-hours" value="' + esc(contact.hours||'') + '">' +
    '<label>Website</label><input type="url" id="co-web" value="' + esc(contact.website||'') + '">' +
    '<label>Hero Image URL</label><input type="url" id="co-hero" value="' + esc(contact.hero_image||'') + '">' +
    '<div class="row2" style="margin-top:.9rem">' +
    '<div><label>Primary Color</label><input type="text" id="co-pc" value="' + esc(contact.primary_color||'') + '"></div>' +
    '<div><label>Accent Color</label><input type="text" id="co-ac" value="' + esc(contact.accent_color||'') + '"></div></div>' +
    '<div class="actions-bar"><button class="btn btn-primary" onclick="saveContact()">Save Business Info</button></div>' +
    '<div id="contact-msg" class="msg"></div></div></div>' +

    '<div class="card"><div class="card-head"><h2>Services / Offerings</h2><button class="btn btn-primary btn-sm" onclick="addService()">+ Add</button></div>' +
    '<div class="card-body"><div id="services-list">' +
    (Array.isArray(services) ? services : []).map(function(s, i) {
      return '<div class="service-item" data-i="' + i + '" style="border:1px solid #222;border-radius:12px;padding:1rem;margin-bottom:.75rem">' +
        '<div class="row2"><div><label>Name</label><input type="text" class="svc-name" value="' + esc(s.name||s.title||'') + '"></div>' +
        '<div style="display:flex;align-items:flex-end;gap:.5rem"><button class="btn btn-red" onclick="removeService(this)">Remove</button></div></div>' +
        '<label>Description</label><textarea class="svc-desc">' + esc(s.desc||s.description||'') + '</textarea></div>';
    }).join('') +
    '</div><div class="actions-bar"><button class="btn btn-primary" onclick="saveServices()">Save Services</button></div>' +
    '<div id="services-msg" class="msg"></div></div></div>' +

    '<div class="card"><div class="card-head"><h2>Testimonials / Reviews</h2><button class="btn btn-primary btn-sm" onclick="addTestimonial()">+ Add</button></div>' +
    '<div class="card-body"><div id="testimonials-list">' +
    (Array.isArray(testimonials) ? testimonials : []).map(function(t, i) {
      return '<div class="testimonial-item" style="border:1px solid #222;border-radius:12px;padding:1rem;margin-bottom:.75rem">' +
        '<div class="row2"><div><label>Name</label><input type="text" class="t-name" value="' + esc(t.name||'') + '"></div>' +
        '<div style="display:flex;align-items:flex-end;gap:.5rem"><div style="flex:1"><label>Role</label><input type="text" class="t-role" value="' + esc(t.role||'') + '"></div>' +
        '<button class="btn btn-red" onclick="removeTestimonial(this)">Remove</button></div></div>' +
        '<label>Quote</label><textarea class="t-quote">' + esc(t.quote||t.text||'') + '</textarea></div>';
    }).join('') +
    '</div><div class="actions-bar"><button class="btn btn-primary" onclick="saveTestimonials()">Save Testimonials</button></div>' +
    '<div id="testimonials-msg" class="msg"></div></div></div>' +

    '<div class="section-sep">Leads (' + leads.length + ')</div>' +
    '<div class="card"><div class="card-body">' +
    (leads.length ? '<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Message</th><th>Date</th></tr></thead><tbody>' + leadsRows + '</tbody></table>' : '<p class="empty">No leads yet.</p>') +
    '</div></div></div>' +

    '<script>' +
    'function showMsg(id,ok,text){var el=document.getElementById(id);el.textContent=text;el.className="msg "+(ok?"ok":"err");}' +
    'async function logout(){document.cookie="afo_admin=;path=/;max-age=0";location.reload();}' +
    'async function publish(){showMsg("pub-msg",true,"Publishing...");try{var r=await fetch("/api/publish",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});var d=await r.json();showMsg("pub-msg",d.ok,d.ok?"Published! Size: "+d.size+" bytes":"Error: "+(d.error||"unknown"));}catch(e){showMsg("pub-msg",false,"Error: "+e.message);}}' +
    'async function saveContact(){var data={company:document.getElementById("co-name").value,tagline:document.getElementById("co-tag").value,phone:document.getElementById("co-phone").value,email:document.getElementById("co-email").value,address:document.getElementById("co-addr").value,hours:document.getElementById("co-hours").value,website:document.getElementById("co-web").value,hero_image:document.getElementById("co-hero").value,primary_color:document.getElementById("co-pc").value,accent_color:document.getElementById("co-ac").value};try{var r=await fetch("/admin/api/content",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({section:"contact",data:data})});var d=await r.json();showMsg("contact-msg",d.ok,d.ok?"Saved! Remember to Publish.":"Error: "+(d.error||"unknown"));}catch(e){showMsg("contact-msg",false,"Error: "+e.message);}}' +
    'function addService(){var html=\'<div class="service-item" style="border:1px solid #222;border-radius:12px;padding:1rem;margin-bottom:.75rem"><div class="row2"><div><label>Name</label><input type="text" class="svc-name" value=""></div><div style="display:flex;align-items:flex-end"><button class="btn btn-red" onclick="removeService(this)">Remove</button></div></div><label>Description</label><textarea class="svc-desc"></textarea></div>\';document.getElementById("services-list").insertAdjacentHTML("beforeend",html);}' +
    'function removeService(btn){btn.closest(".service-item").remove();}' +
    'async function saveServices(){var items=Array.from(document.querySelectorAll(".service-item")).map(function(el,i){return{id:"s"+(i+1),name:el.querySelector(".svc-name").value,desc:el.querySelector(".svc-desc").value};});try{var r=await fetch("/admin/api/content",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({section:"services",data:items})});var d=await r.json();showMsg("services-msg",d.ok,d.ok?"Saved! Remember to Publish.":"Error: "+(d.error||"unknown"));}catch(e){showMsg("services-msg",false,"Error: "+e.message);}}' +
    'function addTestimonial(){var html=\'<div class="testimonial-item" style="border:1px solid #222;border-radius:12px;padding:1rem;margin-bottom:.75rem"><div class="row2"><div><label>Name</label><input type="text" class="t-name" value=""></div><div style="display:flex;align-items:flex-end;gap:.5rem"><div style="flex:1"><label>Role</label><input type="text" class="t-role" value=""></div><button class="btn btn-red" onclick="removeTestimonial(this)">Remove</button></div></div><label>Quote</label><textarea class="t-quote"></textarea></div>\';document.getElementById("testimonials-list").insertAdjacentHTML("beforeend",html);}' +
    'function removeTestimonial(btn){btn.closest(".testimonial-item").remove();}' +
    'async function saveTestimonials(){var items=Array.from(document.querySelectorAll(".testimonial-item")).map(function(el){return{name:el.querySelector(".t-name").value,role:el.querySelector(".t-role").value,quote:el.querySelector(".t-quote").value};});try{var r=await fetch("/admin/api/content",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({section:"testimonials",data:items})});var d=await r.json();showMsg("testimonials-msg",d.ok,d.ok?"Saved! Remember to Publish.":"Error: "+(d.error||"unknown"));}catch(e){showMsg("testimonials-msg",false,"Error: "+e.message);}}' +
    '</script></body></html>';
}
