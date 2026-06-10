// src/render/menu_preview.js — watersedge-phase2-snapshot
import { esc } from '../utils.js';

function flattenMenu(menu) {
  const out = [];
  const menus = menu && Array.isArray(menu.menus) ? menu.menus : [];
  menus.forEach(function(m) {
    (m.categories || []).forEach(function(c) {
      (c.items || []).forEach(function(item) {
        out.push({
          menu: m.name || '',
          category: c.name || '',
          name: item.name || '',
          description: item.description || '',
          price: item.price || '',
          tags: Array.isArray(item.tags) ? item.tags : []
        });
      });
    });
  });
  return out;
}

function pick(items, terms, limit) {
  const hits = [];
  items.forEach(function(item) {
    const hay = (item.name + ' ' + item.description + ' ' + item.category + ' ' + item.menu + ' ' + item.tags.join(' ')).toLowerCase();
    for (let i = 0; i < terms.length; i++) {
      if (hay.indexOf(terms[i]) !== -1) {
        hits.push(item);
        return;
      }
    }
  });
  return hits.slice(0, limit);
}

function cards(items) {
  return items.map(function(item) {
    return '<article class="menu-item-card">' +
      '<div><span>' + esc(item.menu || item.category || 'Menu') + '</span><h3>' + esc(item.name) + '</h3><p>' + esc(item.description || 'Ask the chat for details, pairing ideas, or reservation help.') + '</p></div>' +
      (item.price ? '<strong>' + esc(item.price) + '</strong>' : '') +
      '</article>';
  }).join('');
}

export function renderMenuPreview(menu) {
  const items = flattenMenu(menu);
  if (!items.length) return '';
  let seafood = pick(items, ['seafood', 'salmon', 'halibut', 'ahi', 'shrimp', 'scallop', 'mussel', 'cioppino', 'lobster'], 4);
  let brunch = pick(items, ['brunch', 'breakfast', 'benedict', 'waffle', 'eggs', 'avocado', 'chilaquiles'], 4);
  let dateNight = pick(items, ['filet', 'steak', 'short rib', 'risotto', 'scallop', 'signature', 'date night'], 4);
  if (!seafood.length) seafood = items.slice(0, 4);
  if (!brunch.length) brunch = items.slice(4, 8);
  if (!dateNight.length) dateNight = items.slice(8, 12);

  const css = '<style>' +
    '.menu-preview{max-width:1180px;margin:auto;padding:4.25rem 1.25rem}.menu-preview-shell{border:1px solid var(--line,rgba(20,17,13,.12));border-radius:34px;background:linear-gradient(135deg,var(--ink,#14110d),#24302b);color:var(--paper,#fff8ee);box-shadow:var(--shadow,0 22px 70px rgba(44,30,16,.14));overflow:hidden}.menu-preview-head{padding:2rem;display:grid;grid-template-columns:1.1fr .9fr;gap:1rem;align-items:end}.menu-preview-head span{display:inline-flex;width:max-content;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);border-radius:999px;padding:.35rem .7rem;text-transform:uppercase;letter-spacing:.18em;font-size:.68rem;font-weight:900;color:#f2b489;margin-bottom:1rem}.menu-preview-head h2{font-size:clamp(2rem,4.8vw,4.25rem);line-height:.9;letter-spacing:-.065em;font-weight:950}.menu-preview-head p{color:rgba(255,248,238,.72);font-size:1rem}.menu-groups{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.12)}.menu-group{background:rgba(255,248,238,.96);color:#14110d;padding:1rem}.menu-group h3{font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;color:#0b8f86;margin-bottom:.75rem}.menu-item-card{display:flex;justify-content:space-between;gap:.75rem;border-top:1px solid rgba(20,17,13,.1);padding:.9rem 0}.menu-item-card:first-of-type{border-top:0}.menu-item-card span{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.12em;color:#74685f;font-weight:900;margin-bottom:.25rem}.menu-item-card h3{font-size:1rem;letter-spacing:-.03em;color:#14110d;margin:0 0 .25rem}.menu-item-card p{font-size:.84rem;line-height:1.45;color:#74685f}.menu-item-card strong{white-space:nowrap;color:#0b8f86}.menu-chat-note{padding:1.15rem 2rem;border-top:1px solid rgba(255,255,255,.12);display:flex;justify-content:space-between;gap:1rem;align-items:center;color:rgba(255,248,238,.78);font-size:.92rem}.menu-chat-note button{border:0;border-radius:999px;background:#0b8f86;color:#fff;padding:.75rem 1rem;font-weight:950;cursor:pointer}@media(max-width:900px){.menu-preview-head,.menu-groups{grid-template-columns:1fr}.menu-preview-head{padding:1.5rem}.menu-chat-note{align-items:flex-start;flex-direction:column;padding:1.25rem 1.5rem}}' +
    '</style>';

  return css + '<section class="menu-preview" id="menu-preview"><div class="menu-preview-shell">' +
    '<div class="menu-preview-head"><div><span>Menu-aware demo</span><h2>Explore Waters Edge favorites.</h2></div><p>These highlights now power both the homepage and the chat assistant, so guests can ask about seafood, brunch, date night picks, reservations, and private events.</p></div>' +
    '<div class="menu-groups">' +
    '<div class="menu-group"><h3>Seafood Favorites</h3>' + cards(seafood) + '</div>' +
    '<div class="menu-group"><h3>Brunch Picks</h3>' + cards(brunch) + '</div>' +
    '<div class="menu-group"><h3>Date Night / Dinner</h3>' + cards(dateNight) + '</div>' +
    '</div><div class="menu-chat-note"><span>Want a recommendation? Tap Chat / Reserve and ask: “What should I order for seafood?” or “Can I book brunch?”</span><button type="button" onclick="document.querySelector(\'.sticky-cta a\')&&document.querySelector(\'.sticky-cta a\').click()">Ask the chat</button></div>' +
    '</div></section>';
}
