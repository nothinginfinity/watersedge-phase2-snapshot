// src/handlers/chat_room.js - watersedge-phase2-snapshot
// Phase 3C: Room assistant wired to Vectorize retrieval.
// Flow: embed query -> Vectorize search -> D1 chunk fetch -> grounded reply.
// Falls back to defaultMenu() keyword matching if index is empty or AI unavailable.
import { j, now } from '../utils.js';
import { dbRun, dbFirst, dbAll, loadSection, defaultContact, defaultMenu } from '../db.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// -------------------------------------------------------
// Retrieval helpers
// -------------------------------------------------------

async function embedQuery(env, text) {
  if (!env.AI) return null;
  try {
    var result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [String(text).slice(0, 512)] });
    var data = result && result.data && result.data[0];
    return Array.isArray(data) ? data : null;
  } catch (e) {
    return null;
  }
}

async function vectorSearch(env, slug, queryVec, type, topK) {
  if (!env.DEMO_VECTOR || !queryVec) return [];
  try {
    var filter = type
      ? { slug: { $eq: slug }, type: { $eq: type } }
      : { slug: { $eq: slug } };
    var result = await env.DEMO_VECTOR.query(queryVec, {
      topK: topK || 6,
      returnMetadata: 'all',
      filter: filter
    });
    return (result && result.matches) ? result.matches : [];
  } catch (e) {
    return [];
  }
}

async function fetchChunks(env, ids) {
  var chunks = [];
  for (var i = 0; i < ids.length; i++) {
    try {
      var row = await dbFirst(env, 'SELECT id, type, title, body, metadata_json FROM knowledge_chunks WHERE id=?', [ids[i]]);
      if (row) chunks.push(row);
    } catch (e) {}
  }
  return chunks;
}

function parseMeta(row) {
  try { return row.metadata_json ? JSON.parse(row.metadata_json) : {}; } catch (e) { return {}; }
}

// -------------------------------------------------------
// Intent detection (for summary-lead and reply routing)
// -------------------------------------------------------

function detectQueryIntent(text) {
  var s = String(text || '').toLowerCase();
  if (/wine|pairing|bottle|glass|red|white|sparkling|ros[e\u00e9]|chardonnay|cab|pinot|malbec|sauv/.test(s)) return 'wine';
  if (/brunch|breakfast|benedict|waffle|morning|eggs|chilaquile/.test(s)) return 'brunch';
  if (/date night|romantic|anniversary/.test(s)) return 'date_night';
  if (/steak|filet|sirloin|beef|short rib/.test(s)) return 'steak';
  if (/seafood|fish|salmon|halibut|ahi|scallop|lobster|cioppino|shrimp|mussel/.test(s)) return 'seafood';
  if (/private event|corporate|party|wedding|catering|buyout/.test(s)) return 'event';
  if (/reservation|book|reserve|table/.test(s)) return 'reservation';
  if (/starter|appetizer|share|small plate|lumpia|calamari/.test(s)) return 'starters';
  if (/dessert|sweet/.test(s)) return 'dessert';
  return 'general';
}

function detectRoomIntent(messages) {
  var combined = messages.map(function(m) { return m.message || ''; }).join(' ').toLowerCase();
  var intents = [];
  if (/brunch|benedict|waffle|chilaquile/.test(combined)) intents.push('brunch');
  if (/dinner|date night|evening|romantic/.test(combined)) intents.push('date night');
  if (/private event|corporate|party|wedding|rehearsal|buyout/.test(combined)) intents.push('private event');
  if (/seafood|salmon|halibut|ahi|scallop|cioppino|lobster/.test(combined)) intents.push('seafood');
  if (/reservation|book|reserve|table/.test(combined)) intents.push('reservation');
  return intents.length ? intents.join(', ') : 'general inquiry';
}

// -------------------------------------------------------
// Grounded reply builder — uses retrieved chunks
// -------------------------------------------------------

function buildGroundedReply(intent, chunks, wineChunks, message, contact) {
  var company = (contact && contact.company) || 'Waters Edge';
  var phone = (contact && contact.phone) || '';
  var s = String(message || '').toLowerCase();

  // Format menu chunk as bullet
  function chunkBullet(chunk) {
    var meta = parseMeta(chunk);
    var name = meta.name || chunk.title || 'Item';
    var price = meta.price ? ' (' + meta.price + ')' : '';
    // Extract description from body: body format is "MenuName - Category: Name. Description. ..."
    var desc = '';
    var bodyParts = String(chunk.body || '').split('. ');
    if (bodyParts.length > 1) desc = ' \u2014 ' + bodyParts[1];
    return '\u2022 ' + name + price + desc;
  }

  function wineBullet(chunk) {
    var meta = parseMeta(chunk);
    var name = meta.name || chunk.title || 'Wine';
    var glass = meta.price_glass ? ' (' + meta.price_glass + '/glass)' : '';
    var bottle = meta.price_bottle ? ' or ' + meta.price_bottle + '/bottle' : '';
    var varietal = meta.varietal ? ' \u2014 ' + meta.varietal : '';
    if (meta.region) varietal += ', ' + meta.region;
    return '\u2022 ' + name + glass + bottle + varietal;
  }

  // Wine pairing reply
  if (intent === 'wine' || (wineChunks.length > 0 && /wine|pair|drink|bottle|glass/.test(s))) {
    var wineLines = wineChunks.slice(0, 5).map(wineBullet).join('\n');
    if (!wineLines) {
      return 'I can help with wine pairings once the wine list has been loaded. Try asking about a specific dish and I can suggest a pairing.';
    }
    var menuContext = chunks.length ? '\n\nFor the food, I would also look at:\n' + chunks.slice(0, 3).map(chunkBullet).join('\n') : '';
    return 'Here are some wine options from ' + company + ':\n\n' + wineLines + menuContext + '\n\nWant to build a reservation request or invite a friend to plan together?';
  }

  // Menu-grounded reply
  if (chunks.length > 0) {
    var intro = '';
    if (intent === 'brunch') intro = 'For brunch at ' + company + ', here are some top picks:';
    else if (intent === 'date_night') intro = 'For date night at ' + company + ', I would recommend:';
    else if (intent === 'steak') intro = 'For steak at ' + company + ':';
    else if (intent === 'seafood') intro = 'For a seafood-focused experience at ' + company + ':';
    else if (intent === 'starters') intro = 'For shared starters at ' + company + ':';
    else intro = 'Here are some ' + company + ' menu picks for your question:';

    var menuLines = chunks.slice(0, 6).map(chunkBullet).join('\n');

    // Add wine pairing suggestion if wine chunks available
    var wineNote = '';
    if (wineChunks.length > 0) {
      var topWine = parseMeta(wineChunks[0]);
      wineNote = '\n\nFor wine, ' + (topWine.name || 'a house selection') + ' pairs well with this style of meal.';
    }

    var cta = '';
    if (intent === 'date_night') cta = '\n\nShall I help turn this into a reservation request?';
    else if (intent === 'seafood') cta = '\n\nIf this is date night, Seafood Risotto + Bacon Jam Scallops make a strong shared plan. Want to build a reservation request?';
    else cta = '\n\nWant to build a reservation request or ask about something else?';

    return intro + '\n\n' + menuLines + wineNote + cta;
  }

  // No retrieval results — intent-based fallbacks
  if (intent === 'event') {
    return company + ' hosts private events, corporate gatherings, and special occasions.\n\nTo explore availability, I can capture your info and send it to the team.' + (phone ? ' Or call ' + phone + ' directly.' : '') + '\n\nWant to send an inquiry now?';
  }
  if (intent === 'reservation') {
    return 'Happy to help with a reservation at ' + company + '.\n\nShare your name, party size, and preferred date and time and I can capture that as a request for the team.' + (phone ? ' Or call ' + phone + '.' : '');
  }

  return 'I am the ' + company + ' planning assistant. I can help with menu picks, wine pairings, brunch, date night, seafood, steaks, reservations, and private events.\n\nWhat are you planning?';
}

// -------------------------------------------------------
// Legacy keyword fallback (used when Vectorize index empty)
// -------------------------------------------------------

function flattenMenu(menu) {
  var out = [];
  var menus = menu && Array.isArray(menu.menus) ? menu.menus : [];
  menus.forEach(function(m) {
    (m.categories || []).forEach(function(c) {
      (c.items || []).forEach(function(item) {
        out.push({ menu: m.name || '', category: c.name || '', name: item.name || '', description: item.description || '', price: item.price || '', tags: Array.isArray(item.tags) ? item.tags : [] });
      });
    });
  });
  return out;
}

function scoreItem(item, terms) {
  var hay = (item.menu + ' ' + item.category + ' ' + item.name + ' ' + item.description + ' ' + item.tags.join(' ')).toLowerCase();
  var score = 0;
  terms.forEach(function(term) { if (term && hay.indexOf(term) !== -1) score += 2; });
  return score;
}

function termsForMessage(text) {
  var s = String(text || '').toLowerCase();
  var terms = s.split(/[^a-z0-9]+/).filter(function(x) { return x.length > 2; });
  if (/seafood|fish|ocean|coastal/.test(s)) terms = terms.concat(['seafood', 'salmon', 'halibut', 'ahi', 'shrimp', 'scallop', 'mussel', 'cioppino', 'lobster']);
  if (/brunch|breakfast|morning|benedict|eggs/.test(s)) terms = terms.concat(['brunch', 'breakfast', 'benedict', 'eggs', 'avocado', 'waffle', 'chilaquiles']);
  if (/date|romantic|anniversary|special|couple/.test(s)) terms = terms.concat(['filet', 'steak', 'scallops', 'risotto', 'short', 'signature']);
  if (/steak|beef/.test(s)) terms = terms.concat(['steak', 'filet', 'sirloin', 'flat', 'short rib']);
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

function buildFallbackReply(message, menuMatches, contact) {
  var s = String(message || '').toLowerCase();
  var company = (contact && contact.company) || 'Waters Edge';
  var phone = (contact && contact.phone) || '';
  if (/brunch|breakfast|benedict|waffle|morning/.test(s)) {
    return 'For brunch at ' + company + ', here are some top picks:\n\u2022 Avocado Benedict\n\u2022 Lobster Benedict\n\u2022 Chicken & Waffles\n\u2022 Chorizo Chilaquiles\n\u2022 Breakfast Burrito\n\u2022 Steak & Eggs\n\nWant to invite your friend or send a reservation request?';
  }
  if (/seafood|fish|salmon|halibut|ahi|scallop|lobster|cioppino/.test(s)) {
    var lines = menuMatches.length ? menuMatches.map(bulletItem).join('\n') : '\u2022 Grilled Atlantic Salmon\n\u2022 Pacific Halibut Fish N Chips\n\u2022 Seared Ahi Steak\n\u2022 Seafood Risotto\n\u2022 Bacon Jam Scallops\n\u2022 Cioppino';
    return 'For seafood at ' + company + ':\n\n' + lines + '\n\nWant to build a reservation request?';
  }
  if (/date night|romantic|anniversary/.test(s)) {
    return 'For date night at ' + company + ':\n\n\u2022 Filet Mignon\n\u2022 Seafood Risotto\n\u2022 Bacon Jam Scallops\n\u2022 Slow Braised Short Rib\n\nShall I help turn this into a reservation request?';
  }
  if (/steak|filet|sirloin|beef/.test(s)) {
    return 'For steak at ' + company + ':\n\n\u2022 Filet Mignon\n\u2022 Top Sirloin Steak\n\u2022 Flat Iron Steak\n\u2022 Slow Braised Short Rib\n\nWant to add seafood or build a reservation request?';
  }
  if (/private event|corporate|party|wedding|catering|buyout/.test(s)) {
    return company + ' hosts private events and special occasions.\n\nWant to send an inquiry?' + (phone ? ' Or call ' + phone + '.' : '');
  }
  if (/reservation|book|reserve|table/.test(s)) {
    return 'Happy to help with a reservation at ' + company + '. Share your name, party size, and preferred date and time.' + (phone ? ' Or call ' + phone + '.' : '');
  }
  if (menuMatches.length) {
    return 'Here are some ' + company + ' menu ideas:\n\n' + menuMatches.map(bulletItem).join('\n') + '\n\nWant to build a reservation request?';
  }
  return 'I am the ' + company + ' planning assistant. I can help with menu picks, wine pairings, brunch, seafood, date night, steaks, reservations, and private events. What are you planning?';
}

// -------------------------------------------------------
// Route handlers
// -------------------------------------------------------

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

  var welcomeMsg = 'Welcome to your Waters Edge planning room! Share this link with a friend to plan together. I can help with menu picks, wine pairings, brunch, date night, seafood, reservations, and private events.';
  await dbRun(env,
    'INSERT INTO chat_messages (id, room_id, slug, role, name, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [uid(), roomId, slug, 'assistant', 'Waters Edge', welcomeMsg, null, ts]
  );

  var shareUrl = 'https://watersedge-phase2-snapshot.jaredtechfit.workers.dev/chat-room?id=' + roomId;
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

  var contact = await loadSection(env, slug, 'contact', defaultContact());
  var intent = detectQueryIntent(message);
  var reply = '';
  var mode = 'fallback';
  var retrievedChunks = [];
  var wineChunks = [];

  // --- Retrieval path: embed -> Vectorize -> D1 chunk fetch ---
  var queryVec = await embedQuery(env, message);

  if (queryVec) {
    // Always search menu_item chunks for the query
    var menuMatches = await vectorSearch(env, slug, queryVec, 'menu_item', 6);

    // Also search wine_item chunks if wine-related or date night
    var wineMatches = [];
    if (intent === 'wine' || intent === 'date_night' || /wine|pair|drink/.test(message.toLowerCase())) {
      wineMatches = await vectorSearch(env, slug, queryVec, 'wine_item', 4);
    }

    if (menuMatches.length > 0 || wineMatches.length > 0) {
      mode = 'retrieval';
      retrievedChunks = await fetchChunks(env, menuMatches.map(function(m) { return m.id; }));
      wineChunks = await fetchChunks(env, wineMatches.map(function(m) { return m.id; }));
      reply = buildGroundedReply(intent, retrievedChunks, wineChunks, message, contact);
    }
  }

  // --- Fallback: keyword match against defaultMenu() ---
  if (!reply) {
    var menu = await loadSection(env, slug, 'menu', defaultMenu());
    var kwMatches = findMenuMatches(menu, message, 5);
    reply = buildFallbackReply(message, kwMatches, contact);
  }

  // Save assistant message
  var ts = now();
  var msgId = uid();
  var replyMeta = JSON.stringify({ mode: mode, intent: intent, chunk_count: retrievedChunks.length, wine_count: wineChunks.length });

  await dbRun(env,
    'INSERT INTO chat_messages (id, room_id, slug, role, name, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [msgId, roomId, slug, 'assistant', 'Waters Edge', reply, replyMeta, ts]
  );
  await dbRun(env, 'UPDATE chat_rooms SET updated_at=? WHERE id=?', [ts, roomId]);

  return j({
    ok: true,
    reply: reply,
    message_id: msgId,
    mode: mode,
    intent: intent,
    retrieved: retrievedChunks.length,
    wine_retrieved: wineChunks.length
  });
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
  var intent = detectRoomIntent(messages);
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
  await dbRun(env,
    'INSERT INTO demo_leads (slug, name, email, phone, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [slug, name, email, phone, summary, ts]
  );
  return j({ ok: true, intent: intent, summary: summary, created_at: ts });
}
