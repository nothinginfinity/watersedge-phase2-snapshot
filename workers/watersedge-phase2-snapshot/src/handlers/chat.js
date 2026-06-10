// src/handlers/chat.js — watersedge-phase2-snapshot
// Demo chat backend. Works without a customer-specific AI backend.
// Later, set CHAT_BACKEND_URL to forward messages to a custom restaurant brain.
import { j, now } from '../utils.js';
import { dbRun, loadSection, defaultContact, defaultServices, defaultMenu } from '../db.js';

function pickField(text, re) {
  const m = String(text || '').match(re);
  return m ? String(m[1] || '').trim() : '';
}

function extractEmail(text) {
  const m = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : '';
}

function extractPhone(text) {
  const m = String(text || '').match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
  return m ? m[0] : '';
}

function wantsContact(text) {
  const s = String(text || '').toLowerCase();
  return /contact|call me|text me|email me|reach out|reservation|reserve|book|private event|event|couple|wedding|party|catering|future/.test(s);
}

function wantsMenu(text) {
  const s = String(text || '').toLowerCase();
  return /menu|food|dish|eat|special|drink|wine|cocktail|dinner|lunch|brunch|seafood|steak|dessert|recommend|order|vegetarian|pasta|burger|salmon|halibut|ahi|scallop|lobster/.test(s);
}

function wantsHours(text) {
  const s = String(text || '').toLowerCase();
  return /hour|open|close|today|tonight|tomorrow/.test(s);
}

function wantsLocation(text) {
  const s = String(text || '').toLowerCase();
  return /where|address|location|directions|parking/.test(s);
}

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

function scoreItem(item, terms) {
  const hay = (item.menu + ' ' + item.category + ' ' + item.name + ' ' + item.description + ' ' + item.tags.join(' ')).toLowerCase();
  let score = 0;
  terms.forEach(function(term) {
    if (term && hay.indexOf(term) !== -1) score += 2;
  });
  return score;
}

function termsForMessage(text) {
  const s = String(text || '').toLowerCase();
  let terms = s.split(/[^a-z0-9]+/).filter(function(x) { return x.length > 2; });
  if (/seafood|fish|ocean|coastal/.test(s)) terms = terms.concat(['seafood', 'salmon', 'halibut', 'ahi', 'shrimp', 'scallop', 'mussel', 'cioppino', 'lobster']);
  if (/brunch|breakfast|morning|benedict|eggs/.test(s)) terms = terms.concat(['brunch', 'breakfast', 'benedict', 'eggs', 'avocado', 'waffle', 'chilaquiles']);
  if (/date|romantic|anniversary|special|couple/.test(s)) terms = terms.concat(['filet', 'steak', 'scallops', 'risotto', 'short', 'signature']);
  if (/steak|beef/.test(s)) terms = terms.concat(['steak', 'filet', 'sirloin', 'flat', 'short rib']);
  if (/dessert|sweet/.test(s)) terms = terms.concat(['dessert', 'pastry', 'croissant']);
  if (/share|app|starter|small/.test(s)) terms = terms.concat(['shared', 'bites', 'starter', 'lumpia', 'calamari', 'brussel']);
  return terms;
}

function findMenuMatches(menu, message, limit) {
  const items = flattenMenu(menu);
  const terms = termsForMessage(message);
  return items.map(function(item) {
    return { item: item, score: scoreItem(item, terms) };
  }).filter(function(x) { return x.score > 0; }).sort(function(a, b) { return b.score - a.score; }).slice(0, limit).map(function(x) { return x.item; });
}

function formatItems(items) {
  if (!items.length) return '';
  return items.map(function(item) {
    const desc = item.description ? ' — ' + item.description : '';
    const price = item.price ? ' (' + item.price + ')' : '';
    return '• ' + item.name + price + desc;
  }).join('\n');
}

function serviceList(services) {
  const arr = Array.isArray(services) ? services : [];
  return arr.slice(0, 4).map(function(s) { return s.name || s.title || ''; }).filter(Boolean).join(', ');
}

async function forwardToCustomBackend(request, env, payload) {
  if (!env.CHAT_BACKEND_URL) return null;
  try {
    const r = await fetch(env.CHAT_BACKEND_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

export async function handleChat(request, env, slug) {
  const body = await request.json().catch(function() { return {}; });
  const message = String(body.message || body.text || '').trim();
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  if (!message) return j({ ok: false, error: 'message required' }, 400);

  const contact = await loadSection(env, slug, 'contact', defaultContact());
  const services = await loadSection(env, slug, 'services', defaultServices());
  const menu = await loadSection(env, slug, 'menu', defaultMenu());
  const menuMatches = findMenuMatches(menu, message, 5);

  const custom = await forwardToCustomBackend(request, env, { slug: slug, message: message, history: history, contact: contact, services: services, menu: menu, menu_matches: menuMatches });
  if (custom && (custom.reply || custom.response)) return j({ ok: true, mode: 'custom_backend', reply: custom.reply || custom.response, raw: custom });

  const company = contact.company || 'the restaurant';
  const phone = contact.phone || '';
  const address = contact.address || '';
  const hours = contact.hours || '';
  const offerings = serviceList(services);
  const email = extractEmail(message);
  const phoneFromMessage = extractPhone(message);
  const name = pickField(message, /(?:my name is|i am|i'm|this is)\s+([a-z ,.'-]{2,40})/i);
  const shouldCapture = wantsContact(message) || email || phoneFromMessage;

  if (shouldCapture) {
    await dbRun(env,
      'INSERT INTO demo_leads (slug,name,email,phone,message,created_at) VALUES (?,?,?,?,?,?)',
      [slug, name || body.name || '', email || body.email || '', phoneFromMessage || body.phone || '', '[chat] ' + message, now()]
    );
  }

  let reply = '';
  let next = '';
  if (wantsMenu(message)) {
    if (menuMatches.length) {
      reply = 'Here are a few Waters Edge menu ideas that match your question:\n' + formatItems(menuMatches);
      next = 'I can also help narrow this down for seafood, brunch, date night, steak, starters, or private events. If you want to reserve or be contacted, send your phone or email.';
    } else {
      reply = offerings ? company + ' can help with ' + offerings + '. I also have Waters Edge dinner and brunch highlights loaded for seafood, brunch, shared bites, house favorites, steaks, and desserts.' : company + ' can help walk guests through dinner and brunch highlights.';
      next = 'Try asking: “What seafood do you recommend?” or “What are good brunch options?”';
    }
  } else if (wantsHours(message)) {
    reply = hours ? company + ' hours: ' + String(hours) + '.' : 'I do not have structured hours loaded yet, but I can still capture your info for follow-up.';
    next = phone ? 'You can also call ' + phone + '.' : 'Share your phone or email and the team can follow up.';
  } else if (wantsLocation(message)) {
    reply = address ? company + ' is listed at ' + address + '.' : 'I do not have a location loaded yet.';
    next = 'Need help planning a visit, reservation, or event inquiry?';
  } else if (shouldCapture) {
    reply = 'Got it — I captured this chat as a lead for ' + company + '.';
    next = 'For the paid customer version, this can route reservations, private events, couples inquiries, catering, and future-event interest into a custom CRM or inbox.';
  } else {
    reply = 'Hi! I am the Waters Edge demo chat. I can help with menu recommendations, brunch, seafood, reservations, hours, location, private events, and capturing contact info for follow-up.';
    next = 'Try: “What seafood do you recommend?” or “Can I book a table for Friday?”';
  }

  return j({
    ok: true,
    mode: env.CHAT_BACKEND_URL ? 'fallback_after_backend' : 'menu_aware_demo',
    reply: reply,
    next: next,
    captured_lead: shouldCapture,
    menu_matches: menuMatches.map(function(item) { return { name: item.name, category: item.category, menu: item.menu, price: item.price }; }),
    contact: { company: company, phone: phone, address: address },
    timestamp: now()
  });
}
