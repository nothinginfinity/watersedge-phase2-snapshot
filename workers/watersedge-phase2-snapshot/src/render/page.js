// src/render/page.js — watersedge-phase2-snapshot
// Public homepage renderer. Keep frontend JS as string concatenation only.
import { esc } from '../utils.js';

function cleanUrl(v, fallback) {
  const s = String(v || '').replace(/"/g, '').trim();
  return s || fallback;
}

function phoneUrl(phone) {
  if (!phone) return '#';
  return 'tel:' + String(phone).replace(/\D/g,'').replace(/^(\d{10})$/,'+1$1');
}

function splitHours(hours) {
  if (Array.isArray(hours)) return hours;
  if (hours && typeof hours === 'object') {
    return Object.keys(hours).map(function(k) { return { day: k, time: hours[k] }; });
  }
  const s = String(hours || '').trim();
  if (!s) return [];
  return s.split(/\n|;/).map(function(x) { return x.trim(); }).filter(Boolean);
}

export function renderPage(contact, services, testimonials, slug) {
  const co   = contact.company      || 'Your Business';
  const ph   = contact.phone        || '';
  const addr = contact.address      || '';
  const hrs  = contact.hours        || '';
  const tag  = contact.tagline      || 'A better local experience, built around care, craft, and quick response.';
  const hero = cleanUrl(contact.hero_image, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1800&q=80');
  const pc   = contact.primary_color   || '#14110d';
  const sc   = contact.secondary_color || '#fff8ee';
  const ac   = contact.accent_color    || '#b76532';
  const aboutText = contact.about || contact.story || contact.description || 'A local team focused on warm service, reliable communication, and details that make every visit feel easy.';
  const phUrl = phoneUrl(ph);
  const fallbackImages = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=75',
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=900&q=75',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=75'
  ];

  const serviceCards = (Array.isArray(services) ? services : []).map(function(s, i) {
    const img = cleanUrl(s.image || s.photo || s.img, fallbackImages[i % fallbackImages.length]);
    return '<article class="service-card">' +
      '<div class="service-img" style="background-image:url(&quot;' + esc(img) + '&quot;)"></div>' +
      '<div class="service-body"><span class="service-num">0' + (i + 1) + '</span><h3>' + esc(s.name||s.title||'') + '</h3><p>' + esc(s.desc||s.description||'') + '</p></div>' +
      '</article>';
  }).join('');

  const testimonialCards = (Array.isArray(testimonials) ? testimonials : []).map(function(t, i) {
    const avatar = cleanUrl(t.avatar || t.image || '', '');
    const initials = String(t.name || 'Guest').split(/\s+/).map(function(part) { return part.charAt(0); }).join('').slice(0,2).toUpperCase();
    return '<figure class="quote">' +
      '<div class="quote-top">' +
      (avatar ? '<img class="avatar" src="' + esc(avatar) + '" alt="' + esc(t.name||'Customer') + '">' : '<div class="avatar avatar-fallback">' + esc(initials || String(i + 1)) + '</div>') +
      '<figcaption><strong>' + esc(t.name||'Happy Guest') + '</strong>' + (t.role ? '<span>' + esc(t.role) + '</span>' : '') + '</figcaption>' +
      '</div>' +
      '<blockquote>“' + esc(t.quote||t.text||'Great service and a wonderful experience.') + '”</blockquote>' +
      '</figure>';
  }).join('');

  const hourItems = splitHours(hrs).map(function(row) {
    if (typeof row === 'string') return '<li><span>' + esc(row) + '</span></li>';
    return '<li><strong>' + esc(row.day || row.label || '') + '</strong><span>' + esc(row.time || row.hours || row.value || '') + '</span></li>';
  }).join('');

  const css = ':root{--ink:' + pc + ';--paper:' + sc + ';--accent:' + ac + ';--card:#fffdf7;--cream:#fbefd9;--muted:#74685f;--line:rgba(20,17,13,.12);--shadow:0 22px 70px rgba(44,30,16,.14)}' +
    '*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:radial-gradient(circle at top left,rgba(183,101,50,.16),transparent 32rem),var(--paper);color:var(--ink);line-height:1.6}a{color:inherit;text-decoration:none}' +
    '.nav{position:sticky;top:0;z-index:30;background:rgba(255,248,238,.82);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}' +
    '.nav-inner{max-width:1180px;margin:auto;padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem}.brand{font-weight:950;font-size:1rem;letter-spacing:-.04em}.nav-actions{display:flex;gap:.65rem;align-items:center}.nav-pill{border:1px solid var(--line);border-radius:999px;padding:.55rem .9rem;font-size:.82rem;font-weight:800;background:rgba(255,255,255,.42)}.nav-phone{background:var(--ink);color:var(--paper);border-color:var(--ink)}' +
    '.hero{max-width:1180px;margin:1.25rem auto 0;padding:0 1.25rem}.hero-card{min-height:650px;display:grid;grid-template-columns:1.05fr .95fr;gap:1.25rem;border:1px solid var(--line);border-radius:38px;overflow:hidden;background:linear-gradient(135deg,var(--card),var(--cream));box-shadow:var(--shadow)}' +
    '.hero-copy{padding:clamp(2rem,5vw,4.5rem);display:flex;flex-direction:column;justify-content:center}.kicker{display:inline-flex;width:max-content;border:1px solid rgba(183,101,50,.26);background:rgba(183,101,50,.1);color:var(--accent);border-radius:999px;padding:.35rem .7rem;text-transform:uppercase;letter-spacing:.18em;font-size:.68rem;font-weight:900;margin-bottom:1rem}.hero h1{font-size:clamp(3rem,7vw,6.7rem);line-height:.88;letter-spacing:-.075em;font-weight:950;max-width:760px}.hero p{font-size:clamp(1rem,1.6vw,1.25rem);color:var(--muted);max-width:570px;margin:1.25rem 0 1.7rem}.actions{display:flex;gap:.75rem;flex-wrap:wrap}.btn{border-radius:999px;padding:.85rem 1.25rem;font-weight:900;font-size:.92rem;border:1px solid var(--line);background:rgba(255,255,255,.46)}.btn.primary{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 14px 36px rgba(183,101,50,.25)}.hero-media{position:relative;min-height:420px;background:url("' + hero + '") center/cover}.hero-media:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent,rgba(20,17,13,.42))}.hero-badge{position:absolute;z-index:2;left:1.25rem;right:1.25rem;bottom:1.25rem;padding:1rem;border-radius:22px;background:rgba(255,253,247,.9);backdrop-filter:blur(12px);box-shadow:0 16px 46px rgba(0,0,0,.18)}.hero-badge strong{display:block;letter-spacing:-.03em}.hero-badge span{display:block;color:var(--muted);font-size:.86rem;margin-top:.15rem}' +
    '.section{max-width:1180px;margin:auto;padding:4.25rem 1.25rem}.section-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1.6rem}.section-head h2{font-size:clamp(2rem,4.8vw,4.25rem);line-height:.9;letter-spacing:-.065em;font-weight:950;max-width:720px}.section-head p{color:var(--muted);max-width:360px;font-size:.96rem}' +
    '.service-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.service-card{border:1px solid var(--line);border-radius:28px;background:var(--card);overflow:hidden;box-shadow:0 16px 50px rgba(44,30,16,.09);transition:transform .18s,box-shadow .18s}.service-card:hover{transform:translateY(-4px);box-shadow:var(--shadow)}.service-img{height:210px;background-size:cover;background-position:center}.service-body{padding:1.25rem}.service-num{display:inline-block;color:var(--accent);font-size:.72rem;font-weight:950;letter-spacing:.14em;margin-bottom:.65rem}.service-body h3{font-size:1.25rem;letter-spacing:-.035em;line-height:1.05;margin-bottom:.55rem}.service-body p{color:var(--muted);font-size:.93rem}' +
    '.about{display:grid;grid-template-columns:.8fr 1.2fr;gap:1rem;align-items:stretch}.about-card{border:1px solid var(--line);border-radius:30px;background:var(--ink);color:var(--paper);padding:2rem;box-shadow:var(--shadow)}.about-card .kicker{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18);color:#f2b489}.about-card h2{font-size:clamp(2rem,4vw,3.7rem);line-height:.94;letter-spacing:-.06em;margin-bottom:1rem}.about-card p{color:rgba(255,248,238,.76);font-size:1rem}.about-mini{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.mini{border:1px solid var(--line);border-radius:30px;background:var(--card);padding:1.5rem;box-shadow:0 16px 50px rgba(44,30,16,.08)}.mini strong{display:block;font-size:1.45rem;letter-spacing:-.04em}.mini span{color:var(--muted);font-size:.9rem}' +
    '.quotes{display:flex;gap:1rem;overflow-x:auto;scroll-snap-type:x mandatory;padding:.25rem 0 1rem}.quote{min-width:320px;max-width:360px;scroll-snap-align:start;border:1px solid var(--line);border-radius:28px;padding:1.25rem;background:var(--card);box-shadow:0 16px 48px rgba(44,30,16,.08);flex-shrink:0}.quote-top{display:flex;align-items:center;gap:.8rem;margin-bottom:1rem}.avatar{width:48px;height:48px;border-radius:999px;object-fit:cover;background:var(--cream)}.avatar-fallback{display:grid;place-items:center;background:var(--ink);color:var(--paper);font-weight:950}.quote figcaption strong{display:block;line-height:1}.quote figcaption span{display:block;color:var(--muted);font-size:.8rem;margin-top:.2rem}.quote blockquote{font-size:1.02rem;line-height:1.55;color:#2d251d}' +
    '.info-panel{display:grid;grid-template-columns:.95fr 1.05fr;gap:1rem}.panel{border:1px solid var(--line);border-radius:30px;padding:1.5rem;background:var(--card);box-shadow:0 16px 50px rgba(44,30,16,.08)}.panel h3{font-size:1.15rem;font-weight:950;letter-spacing:-.03em;margin-bottom:.85rem}.hours-list{list-style:none}.hours-list li{display:flex;justify-content:space-between;gap:1rem;border-top:1px solid var(--line);padding:.75rem 0;color:var(--muted)}.hours-list li:first-child{border-top:0}.hours-list strong{color:var(--ink)}.panel p{color:var(--muted)}' +
    '.contact-shell{display:grid;grid-template-columns:.85fr 1.15fr;gap:1rem;align-items:start}.contact-copy{padding:1rem 0}.contact-copy h2{font-size:clamp(2.2rem,4vw,4rem);line-height:.92;letter-spacing:-.06em;margin-bottom:1rem}.contact-copy p{color:var(--muted);max-width:420px}.form-wrap{border:1px solid var(--line);border-radius:30px;background:var(--card);box-shadow:var(--shadow);padding:1.25rem}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}.form-wrap input,.form-wrap textarea{width:100%;padding:.9rem 1rem;border:1px solid var(--line);border-radius:16px;font-family:inherit;font-size:.95rem;background:#fff;color:var(--ink);margin-bottom:.75rem}.form-wrap textarea{height:130px;resize:vertical}.btn-submit{background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:1rem 1.8rem;font-weight:950;font-size:.95rem;cursor:pointer;width:100%}#form-msg{margin-top:.75rem;font-size:.9rem;color:var(--accent);font-weight:800}.hp{position:absolute;left:-9999px;opacity:0}' +
    '.sticky-cta{position:fixed;z-index:50;left:1rem;right:1rem;bottom:1rem;display:flex;justify-content:center;pointer-events:none}.sticky-cta a{pointer-events:auto;width:min(520px,100%);text-align:center;border-radius:999px;padding:1rem 1.5rem;background:var(--ink);color:var(--paper);font-weight:950;font-size:.95rem;box-shadow:0 18px 60px rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.18)}footer{text-align:center;padding:2.25rem 1rem 6.5rem;color:var(--muted);font-size:.82rem}' +
    '@media(max-width:900px){.hero-card,.about,.info-panel,.contact-shell{grid-template-columns:1fr}.service-grid{grid-template-columns:1fr 1fr}.hero-card{min-height:auto}.hero-media{min-height:360px}.section-head{align-items:start;flex-direction:column}.about-mini{grid-template-columns:1fr 1fr}}' +
    '@media(max-width:640px){.nav-inner{padding:.8rem 1rem}.nav-pill:not(.nav-phone){display:none}.hero{padding:0 .75rem}.hero-card{border-radius:28px}.hero-copy{padding:2rem 1.25rem}.hero h1{font-size:3rem}.service-grid,.about-mini,.form-row{grid-template-columns:1fr}.section{padding:3.25rem 1rem}.service-img{height:190px}.quote{min-width:82vw}.sticky-cta{left:.75rem;right:.75rem;bottom:.75rem}}';

  return '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(co) + '</title><meta name="description" content="' + esc(tag) + '">' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">' +
    '<style>' + css + '</style></head><body>' +
    '<nav class="nav"><div class="nav-inner"><a class="brand" href="/">' + esc(co) + '</a><div class="nav-actions"><a class="nav-pill" href="#services">Menu</a><a class="nav-pill" href="#contact">Contact</a>' +
    (ph ? '<a class="nav-pill nav-phone" href="' + esc(phUrl) + '">' + esc(ph) + '</a>' : '') + '</div></div></nav>' +
    '<main>' +
    '<section class="hero"><div class="hero-card"><div class="hero-copy"><span class="kicker">Local favorite</span><h1>' + esc(co) + '</h1><p>' + esc(tag) + '</p><div class="actions"><a class="btn primary" href="#contact">Book / Contact</a>' +
    (ph ? '<a class="btn" href="' + esc(phUrl) + '">Call now</a>' : '') + '</div></div><div class="hero-media"><div class="hero-badge"><strong>Warm service. Memorable details.</strong><span>' + esc(addr || 'Serving our local community') + '</span></div></div></section>' +
    '<section class="section" id="services"><div class="section-head"><h2>Fresh reasons to stop by.</h2><p>Explore the highlights, signature offerings, and services that make ' + esc(co) + ' stand out.</p></div><div class="service-grid">' + serviceCards + '</div></section>' +
    '<section class="section"><div class="about"><div class="about-card"><span class="kicker">Our story</span><h2>Built for people who care about the experience.</h2><p>' + esc(aboutText) + '</p></div><div class="about-mini"><div class="mini"><strong>Fast</strong><span>Clear calls, quick replies, and an easy next step.</span></div><div class="mini"><strong>Local</strong><span>Made to feel specific to the neighborhood and business.</span></div><div class="mini"><strong>Polished</strong><span>Modern presentation with practical lead capture.</span></div><div class="mini"><strong>Live</strong><span>Content backed by the shared demo database.</span></div></div></div></section>' +
    (testimonialCards ? '<section class="section"><div class="section-head"><h2>Guests are talking.</h2><p>Real words, friendly proof, and a simple carousel that works beautifully on mobile.</p></div><div class="quotes">' + testimonialCards + '</div></section>' : '') +
    '<section class="section"><div class="info-panel"><div class="panel"><h3>Hours</h3>' + (hourItems ? '<ul class="hours-list">' + hourItems + '</ul>' : '<p>Contact us for current hours.</p>') + '</div><div class="panel"><h3>Location</h3><p>' + esc(addr || 'Contact us for location details.') + '</p>' + (ph ? '<p style="margin-top:.75rem"><strong>Phone:</strong> <a href="' + esc(phUrl) + '">' + esc(ph) + '</a></p>' : '') + '</div></div></section>' +
    '<section class="section" id="contact"><div class="contact-shell"><div class="contact-copy"><span class="kicker">Reach out</span><h2>Ready when you are.</h2><p>Send a note and the team can follow up with details, availability, or next steps.</p></div><div class="form-wrap">' +
    '<input class="hp" id="f-company" type="text" tabindex="-1" autocomplete="off">' +
    '<div class="form-row"><input id="f-name" type="text" placeholder="Your name"><input id="f-email" type="email" placeholder="Email address"></div>' +
    '<input id="f-phone" type="tel" placeholder="Phone number"><textarea id="f-msg" placeholder="How can we help?"></textarea>' +
    '<button id="f-submit" class="btn-submit" onclick="submitLead()">Send Message</button><p id="form-msg"></p></div></div></section>' +
    '</main>' +
    '<footer>' + esc(co) + (addr ? ' &nbsp;&bull;&nbsp; ' + esc(addr) : '') + (ph ? ' &nbsp;&bull;&nbsp; ' + esc(ph) : '') + '</footer>' +
    '<div class="sticky-cta"><a href="#contact">Contact ' + esc(co) + '</a></div>' +
    '<script>async function submitLead(){' +
    'var msg=document.getElementById("form-msg");var btn=document.getElementById("f-submit");' +
    'var body={name:document.getElementById("f-name").value,email:document.getElementById("f-email").value,phone:document.getElementById("f-phone").value,message:document.getElementById("f-msg").value,company:document.getElementById("f-company").value};' +
    'if(body.company){return;}if(!body.name||(!body.email&&!body.phone)){msg.textContent="Please enter your name and either email or phone.";return;}' +
    'msg.textContent="Sending...";btn.disabled=true;btn.textContent="Sending...";' +
    'try{var r=await fetch("/api/lead",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});var d=await r.json();' +
    'if(d.ok){msg.textContent="Thanks! We will be in touch soon.";document.getElementById("f-name").value="";document.getElementById("f-email").value="";document.getElementById("f-phone").value="";document.getElementById("f-msg").value="";}else{msg.textContent="Error: "+(d.error||"unknown");}}' +
    'catch(e){msg.textContent="Error: "+e.message;}btn.disabled=false;btn.textContent="Send Message";}</script>' +
    '</body></html>';
}
