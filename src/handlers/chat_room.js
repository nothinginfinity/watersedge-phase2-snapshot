// src/handlers/chat_room.js - watersedge-demo-feature-lab
// Phase 2: participant identity, client_message_id dedup, bullet replies, richer summary-lead.
import { j, now } from '../utils.js';
import { dbRun, dbFirst, dbAll, loadSection, defaultContact, defaultMenu } from '../db.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function flattenMenu(menu) {
  var out = [];
  var menus = menu && Array.isArray(menu.menus) ? menu.menus : [];
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
  var hay = (item.menu + ' ' + item.category + ' ' + item.name + ' ' + item.description + ' ' + item.tags.join(' ')).toLowerCase();
  var score = 0;
  terms.forEach(function(term) {
    if (term && hay.indexOf(term) !== -1) score += 2;
  });
  return score;
}

function termsForMessage(text) {
  var s = String(text || '').toLowerCase();
  var terms = s.split(/[^a-z0-9]+/).filter(function(x) { return x.length > 2; });
  if (/seafood|fish|ocean|coastal/.test(s)) terms = terms.concat(['seafood', 'salmon', 'halibut', 'ahi', 'shrimp', 'scallop', 'mussel', 'cioppino', 'lobster']);
  if (/brunch|breakfast|morning|benedict|eggs/.test(s)) terms = terms.concat(['brunch', 'breakfast', 'benedict', 'eggs', 'avocado', 'waffle', 'chilaquiles']);
  if (/date|romantic|anniversary|special|couple/.test(s)) terms = terms.concat(['filet', 'steak', 'scallops', 'risotto', 'short', 'signature']);
  if (/steak|beef/.test(s)) terms = terms.concat(['steak', 'filet', 'sirloin', 'flat', 'short rib']);
  if (/dessert|sweet/.test(s)) terms = terms.concat(['dessert', 'pastry', 'croissant']);
  if (/share|app|starter|small/.test(s)) terms = terms.concat(['shared', 'bites', 'starter', 'lumpia', 'calamari', 'brussel']);
  return terms;
}

function findMenuMatches(menu, message, limit) {
  var items = flattenMenu(menu);
  var terms = termsForMessage(message);
  return items.map(function(item) {
    return { item: item, score: scoreItem(item, terms) };
  }).filter(function(x) { return x.score > 0; }).sort(function(a, b) { return b.score - a.score; }).slice(0, limit || 5).map(function(x) { return x.item; });
}

function bulletItem(item) {
  var desc = item.description ? ' \u2014 ' + item.description : '';
  var price = item.price ? ' (' + item.price + ')' : '';
  return '\u2022 ' + item.name + price + desc;
}

function detectIntent(messages) {
  var combined = messages.map(function(m) { return m.message || ''; }).join(' ').toLowerCase();
  var intents = [];
  if (/brunch|benedict|waffle|chilaquile|avocado toast/.test(combined)) intents.push('brunch');
  if (/dinner|date night|evening|romantic/.test(combined)) intents.push('date night');
  if (/private event|corporate|party|wedding|rehearsal|buyout/.test(combined)) intents.push('private event');
  if (/seafood|salmon|halibut|ahi|scallop|cioppino|lobster/.test(combined)) intents.push('seafood');
  if (/reservation|book|reserve|table/.test(combined)) intents.push('reservation');
  return intents.length ? intents.join(', ') : 'general inquiry';
}

function buildAssistantReply(message, roomMessages, menuMatches, contact) {
  var s = String(message || '').toLowerCase();
  var company = (contact && contact.company) || 'Waters Edge';
  var phone = (contact && contact.phone) || '';

  if (/brunch|breakfast|benedict|waffle|morning/.test(s)) {
    return 'For brunch at ' + company + ', here are some top picks:\n' +
      '\u2022 Avocado Benedict\n' +
      '\u2022 Lobster Benedict\n' +
      '\u2022 Chicken & Waffles\n' +
      '\u2022 Chorizo Chilaquiles\n' +
      '\u2022 Breakfast Burrito\n' +
      '\u2022 Salmon Burger\n' +
      '\u2022 Steak & Eggs\n\n' +
      'Want to invite your friend into this room or send a reservation request?';
  }

  if (/seafood|fish|salmon|halibut|ahi|scallop|lobster|cioppino/.test(s)) {
    var lines = menuMatches.length
      ? menuMatches.map(bulletItem).join('\n')
      : '\u2022 Grilled Atlantic Salmon\n\u2022 Pacific Halibut Fish N Chips\n\u2022 Seared Ahi Steak\n\u2022 Seafood Risotto\n\u2022 Bacon Jam Scallops\n\u2022 Cioppino';
    return 'For a seafood-focused experience at ' + company + ':\n\n' + lines + '\n\nIf this is date night, Seafood Risotto + Bacon Jam Scallops make a strong shared plan. Want me to help turn this into a reservation request?';
  }

  if (/date night|romantic|anniversary/.test(s)) {
    return 'For date night at ' + company + ', here are the top picks:\n\n' +
      '\u2022 Filet Mignon\n' +
      '\u2022 Seafood Risotto\n' +
      '\u2022 Bacon Jam Scallops\n' +
      '\u2022 Slow Braised Short Rib\n\n' +
      'Start with Shrimp Lumpia or Blackened Ahi Tostada Bites. Want to send a reservation request or invite a friend to plan together?';
  }

  if (/steak|filet|sirloin|beef/.test(s)) {
    return 'For steak at ' + company + ':\n\n' +
      '\u2022 Filet Mignon \u2014 premium cut for a special dinner\n' +
      '\u2022 Top Sirloin Steak\n' +
      '\u2022 Flat Iron Steak\n' +
      '\u2022 Slow Braised Short Rib\n\n' +
      'Want to add seafood picks or build a reservation request?';
  }

  if (/private event|corporate|party|wedding|catering|buyout/.test(s)) {
    return company + ' hosts private events, corporate gatherings, and special occasions.\n\nTo explore availability, I can capture your info and send it to the team.' + (phone ? ' Or call ' + phone + ' directly.' : '') + '\n\nWant to send an inquiry now?';
  }

  if (/reservation|book|reserve|table/.test(s)) {
    return 'Happy to help with a reservation at ' + company + '.\n\nShare your name, party size, and preferred date/time and I can capture that as a request for the team.' + (phone ? ' Or call ' + phone + '.' : '');
  }

  if (menuMatches.length) {
    return 'Here are some ' + company + ' menu ideas for your question:\n\n' +
      menuMatches.map(bulletItem).join('\n') +
      '\n\nI can also help with brunch, seafood, date night, or private event inquiries. Want to build a reservation request?';
  }

  return 'I am the ' + company + ' planning assistant.\n\nI can help with:\n\u2022 Menu picks (brunch, seafood, date night, steaks)\n\u2022 Reservation requests\n\u2022 Private event inquiries\n\nWhat are you planning?';
}

export async function handleRoomCreate(request, env, slug) {
  var body = await request.json().catch(function() { return {}; });
  var intent = String(body.intent || '').trim();
  var roomId = uid();
  var ts = now();
  var title = intent ? intent : 'Planning Room';

  await dbRun(env,
    'INSERT INTO chat_rooms (id, slug, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [roomId, slug, title, 'open', ts, ts]
  );

  var welcomeMsg = 'Welcome to your Waters Edge planning room! Share this link with a friend to plan together. I can help with menu picks, brunch, date night, seafood, reservations, and private events.';
  await dbRun(env,
    'INSERT INTO chat_messages (id, room_id, slug, role, name, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [uid(), roomId, slug, 'assistant', 'Waters Edge', welcomeMsg, null, ts]
  );

  var shareUrl = 'https://watersedge-demo-feature-lab.jaredtechfit.workers.dev/chat-room?id=' + roomId;
  return j({ ok: true, room_id: roomId, title: title, share_url: shareUrl, created_at: ts });
}

export async function handleRoomMessages(request, env, slug) {
  var url = new URL(request.url);
  var roomId = url.searchParams.get('id') || '';
  if (!roomId) return j({ ok: false, error: 'room id required' }, 400);
  var room = await dbFirst(env, 'SELECT * FROM chat_rooms WHERE id=? AND slug=?', [roomId, slug]);
  if (!room) return j({ ok: false, error: 'room not found' }, 404);
  var messages = await dbAll(env, 'SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at ASC LIMIT 100', [roomId]);
  return j({ ok: true, room_id: roomId, title: room.title, status: room.status, messages: messages });
}

export async function handleRoomMessage(request, env, slug) {
  var body = await request.json().catch(function() { return {}; });
  var roomId = String(body.room_id || '').trim();
  var message = String(body.message || '').trim();
  var name = String(body.name || 'Guest').trim();
  var color = String(body.color || '').trim();
  var participantId = String(body.participant_id || '').trim();
  var clientMsgId = String(body.client_message_id || '').trim();
  if (!roomId || !message) return j({ ok: false, error: 'room_id and message required' }, 400);
  var room = await dbFirst(env, 'SELECT * FROM chat_rooms WHERE id=? AND slug=?', [roomId, slug]);
  if (!room) return j({ ok: false, error: 'room not found' }, 404);
  var msgId = uid();
  var ts = now();
  var meta = JSON.stringify({ color: color, participant_id: participantId, client_message_id: clientMsgId });
  await dbRun(env,
    'INSERT INTO chat_messages (id, room_id, slug, role, name, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [msgId, roomId, slug, 'user', name, message, meta, ts]
  );
  await dbRun(env, 'UPDATE chat_rooms SET updated_at=? WHERE id=?', [ts, roomId]);
  return j({ ok: true, message_id: msgId, client_message_id: clientMsgId, room_id: roomId, created_at: ts });
}

export async function handleRoomAssistant(request, env, slug) {
  var body = await request.json().catch(function() { return {}; });
  var roomId = String(body.room_id || '').trim();
  var message = String(body.message || '').trim();
  if (!roomId) return j({ ok: false, error: 'room_id required' }, 400);
  var room = await dbFirst(env, 'SELECT * FROM chat_rooms WHERE id=? AND slug=?', [roomId, slug]);
  if (!room) return j({ ok: false, error: 'room not found' }, 404);
  var roomMessages = await dbAll(env, 'SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at ASC LIMIT 20', [roomId]);
  var menu = await loadSection(env, slug, 'menu', defaultMenu());
  var contact = await loadSection(env, slug, 'contact', defaultContact());
  var menuMatches = findMenuMatches(menu, message, 5);
  var reply = buildAssistantReply(message, roomMessages, menuMatches, contact);
  var ts = now();
  var msgId = uid();
  await dbRun(env,
    'INSERT INTO chat_messages (id, room_id, slug, role, name, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [msgId, roomId, slug, 'assistant', 'Waters Edge', reply, null, ts]
  );
  await dbRun(env, 'UPDATE chat_rooms SET updated_at=? WHERE id=?', [ts, roomId]);
  return j({ ok: true, reply: reply, message_id: msgId, menu_matches: menuMatches.map(function(i) { return { name: i.name, category: i.category, price: i.price }; }) });
}

export async function handleRoomSummaryLead(request, env, slug) {
  var body = await request.json().catch(function() { return {}; });
  var roomId = String(body.room_id || '').trim();
  var name = String(body.name || 'Chat Room Guest').trim();
  var email = String(body.email || '').trim();
  var phone = String(body.phone || '').trim();
  var partySize = String(body.party_size || '').trim();
  var prefDate = String(body.preferred_date || '').trim();
  var prefTime = String(body.preferred_time || '').trim();
  var occasion = String(body.occasion || '').trim();
  if (!roomId) return j({ ok: false, error: 'room_id required' }, 400);
  var room = await dbFirst(env, 'SELECT * FROM chat_rooms WHERE id=? AND slug=?', [roomId, slug]);
  if (!room) return j({ ok: false, error: 'room not found' }, 404);
  var messages = await dbAll(env, 'SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at ASC LIMIT 50', [roomId]);
  var intent = detectIntent(messages);
  var userMsgs = messages.filter(function(m) { return m.role === 'user'; }).slice(-5);
  var excerpt = userMsgs.map(function(m) { return (m.name || 'Guest') + ': ' + m.message; }).join(' | ');
  var parts = ['[chat-room]', 'Room: ' + roomId, 'Intent: ' + intent, 'Title: ' + (room.title || ''), 'Name: ' + name];
  if (email) parts.push('Email: ' + email);
  if (phone) parts.push('Phone: ' + phone);
  if (partySize) parts.push('Party size: ' + partySize);
  if (prefDate) parts.push('Date: ' + prefDate);
  if (prefTime) parts.push('Time: ' + prefTime);
  if (occasion) parts.push('Occasion: ' + occasion);
  parts.push('Excerpt: ' + excerpt);
  var summary = parts.join(' | ');
  var ts = now();
  await dbRun(env, 'INSERT INTO demo_leads (slug, name, email, phone, message, created_at) VALUES (?, ?, ?, ?, ?, ?)', [slug, name, email, phone, summary, ts]);
  return j({ ok: true, intent: intent, summary: summary, created_at: ts });
}
