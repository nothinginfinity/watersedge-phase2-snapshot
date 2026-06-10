// src/handlers/chat_room.js - watersedge-phase2-snapshot
// Phase 3D: Room-aware assistant - reads full conversation, multi-participant context,
// fixed wine intent detection, Vectorize without filter (index filter not supported on free tier).
import { j, now } from '../utils.js';
import { dbRun, dbFirst, dbAll, loadSection, defaultContact, defaultMenu } from '../db.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// -------------------------------------------------------
// Embedding
// -------------------------------------------------------
async function embedQuery(env, text) {
  if (!env.AI) return null;
  try {
    var result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [String(text).slice(0, 512)] });
    var data = result && result.data && result.data[0];
    return Array.isArray(data) ? data : null;
  } catch (e) { return null; }
}

// -------------------------------------------------------
// Vectorize search - no filter (avoids filter support issues)
// We post-filter by type in JS after retrieval.
// -------------------------------------------------------
async function vectorSearch(env, queryVec, topK) {
  if (!env.DEMO_VECTOR || !queryVec) return [];
  try {
    var result = await env.DEMO_VECTOR.query(queryVec, { topK: topK || 12, returnMetadata: 'all' });
    return (result && result.matches) ? result.matches : [];
  } catch (e) { return []; }
}

async function fetchChunk(env, id) {
  try {
    return await dbFirst(env, 'SELECT id, type, title, body, metadata_json FROM knowledge_chunks WHERE id=?', [id]);
  } catch (e) { return null; }
}

function parseMeta(row) {
  try { return row && row.metadata_json ? JSON.parse(row.metadata_json) : {}; } catch (e) { return {}; }
}

// -------------------------------------------------------
// Room context builder
// Reads recent messages and builds a structured summary
// of who is in the room and what each person wants.
// -------------------------------------------------------
function buildRoomContext(roomMessages) {
  var userMessages = roomMessages.filter(function(m) { return m.role === 'user'; });
  var participants = {};
  userMessages.forEach(function(m) {
    var name = m.name || 'Guest';
    if (!participants[name]) participants[name] = [];
    participants[name].push(m.message);
  });

  var names = Object.keys(participants);
  var combined = userMessages.map(function(m) { return (m.name || 'Guest') + ': ' + m.message; }).join(' | ');

  // Build a short readable summary of preferences
  var prefs = names.map(function(name) {
    return name + ' said: ' + participants[name].slice(-2).join('; ');
  }).join(' / ');

  return {
    participants: names,
    combined: combined,
    prefs: prefs,
    multiParty: names.length > 1
  };
}

// -------------------------------------------------------
// Intent detection - checks BOTH current message AND room history
// so wine questions about seafood dishes are caught correctly.
// -------------------------------------------------------
function detectIntent(currentMessage, roomContext) {
  var s = String(currentMessage || '').toLowerCase();
  var hist = String(roomContext.combined || '').toLowerCase();

  // Wine is highest priority - explicit check first
  if (/wine|pairing|pairs|bottle|glass|red wine|white wine|sparkling|ros[e\u00e9]|chardonnay|cabernet|pinot|malbec|sauvignon/.test(s)) return 'wine';

  // Combined context intents
  if (/brunch|breakfast|benedict|waffle|morning|chilaquile/.test(s)) return 'brunch';
  if (/date night|romantic|anniversary/.test(s)) return 'date_night';
  if (/steak|filet|sirloin|beef|short rib/.test(s)) return 'steak';
  if (/seafood|fish|salmon|halibut|ahi|scallop|lobster|cioppino|shrimp|mussel/.test(s)) return 'seafood';
  if (/private event|corporate|party|wedding|catering|buyout/.test(s)) return 'event';
  if (/reservation|book|reserve|table/.test(s)) return 'reservation';
  if (/starter|appetizer|share|small plate|lumpia|calamari/.test(s)) return 'starters';

  // Fall through to history-based detection
  if (/wine|pairing|pairs/.test(hist)) return 'wine';
  if (/steak|filet/.test(hist) && /seafood|fish|salmon/.test(hist)) return 'surf_turf';
  if (/brunch/.test(hist)) return 'brunch';
  if (/date night/.test(hist)) return 'date_night';

  return 'general';
}

function detectRoomIntent(messages) {
  var combined = messages.map(function(m) { return m.message || ''; }).join(' ').toLowerCase();
  var intents = [];
  if (/brunch|benedict|waffle|chilaquile/.test(combined)) intents.push('brunch');
  if (/dinner|date night|evening|romantic/.test(combined)) intents.push('date night');
  if (/private event|corporate|party|wedding|rehearsal|buyout/.test(combined)) intents.push('private event');
  if (/seafood|salmon|halibut|ahi|scallop|cioppino|lobster/.test(combined)) intents.push('seafood');
  if (/steak|filet|sirloin|beef/.test(combined)) intents.push('steak');
  if (/wine|pairing/.test(combined)) intents.push('wine');
  if (/reservation|book|reserve|table/.test(combined)) intents.push('reservation');
  return intents.length ? intents.join(', ') : 'general inquiry';
}

// -------------------------------------------------------
// Reply builder - room-aware, multi-participant
// -------------------------------------------------------
function buildReply(intent, menuChunks, wineChunks, currentMessage, roomCtx, contact) {
  var company = (contact && contact.company) || 'Waters Edge Restaurant and Bar';
  var s = String(currentMessage || '').toLowerCase();
  var multi = roomCtx.multiParty;
  var names = roomCtx.participants;

  function chunkBullet(chunk) {
    var meta = parseMeta(chunk);
    var name = meta.name || chunk.title || 'Item';
    var price = meta.price ? ' (' + meta.price + ')' : '';
    var bodyStr = String(chunk.body || '');
    // Body format: "Menu - Category: Name. Description."
    var descMatch = bodyStr.match(/: [^.]+\. (.+?)(?:\. Tags|$)/);
    var desc = descMatch ? ' \u2014 ' + descMatch[1].trim() : '';
    return '\u2022 ' + name + price + desc;
  }

  function wineBullet(chunk) {
    var meta = parseMeta(chunk);
    var name = meta.name || chunk.title || 'Wine';
    var glass = meta.price_glass ? ' (' + meta.price_glass + '/glass' : '';
    var bottle = meta.price_bottle ? ', ' + meta.price_bottle + '/bottle)' : (glass ? ')' : '');
    var varietal = meta.varietal ? ' \u2014 ' + meta.varietal : '';
    var region = meta.region ? ', ' + meta.region : '';
    return '\u2022 ' + name + glass + bottle + varietal + region;
  }

  // Multi-party opener
  var groupLine = '';
  if (multi && names.length > 1) {
    groupLine = 'Planning for ' + names.join(' and ') + ':\n\n';
  }

  // --- Wine ---
  if (intent === 'wine') {
    if (wineChunks.length === 0) {
      return groupLine + 'For wine pairings at ' + company + ', I would recommend asking your server about the current wine list. Want to build a reservation request so the team can help plan your evening?';
    }
    var wineLines = wineChunks.slice(0, 5).map(wineBullet).join('\n');
    // If they asked specifically about pairing with something, add context
    var pairingNote = '';
    if (/salmon/.test(s)) pairingNote = 'For salmon specifically, the Pinot Noir or Chardonnay are your best bets.\n\n';
    else if (/steak|filet|beef/.test(s)) pairingNote = 'For steak, the Cabernet Sauvignon or Malbec are the go-to choices.\n\n';
    else if (/seafood|fish|halibut|scallop/.test(s)) pairingNote = 'For seafood, the Sauvignon Blanc or Chardonnay pair beautifully.\n\n';
    var foodNote = menuChunks.length > 0 ? '\n\nFor the food:\n' + menuChunks.slice(0, 3).map(chunkBullet).join('\n') : '';
    return groupLine + pairingNote + 'Wine options at ' + company + ':\n\n' + wineLines + foodNote + '\n\nWant to build a reservation request?';
  }

  // --- Surf and turf (steak + seafood in room) ---
  if (intent === 'surf_turf' || (/steak|filet/.test(s) && /seafood|fish|salmon/.test(roomCtx.combined))) {
    var steakChunks = menuChunks.filter(function(c) { var m = parseMeta(c); return m.tags && (m.tags.indexOf('steak') !== -1 || m.tags.indexOf('beef') !== -1); });
    var sfoodChunks = menuChunks.filter(function(c) { var m = parseMeta(c); return m.tags && m.tags.indexOf('seafood') !== -1; });
    var steakLines = steakChunks.slice(0, 3).map(chunkBullet).join('\n') || '\u2022 Filet Mignon\n\u2022 Top Sirloin Steak\n\u2022 Flat Iron Steak';
    var sfoodLines = sfoodChunks.slice(0, 3).map(chunkBullet).join('\n') || '\u2022 Grilled Atlantic Salmon\n\u2022 Seared Ahi Steak\n\u2022 Seafood Risotto';
    var wineRec = wineChunks.length > 0 ? '\n\nFor wine, the Pinot Noir works for both steak and salmon \u2014 a great shared bottle.' : '';
    return groupLine + 'Great combo \u2014 ' + company + ' has both covered:\n\nFor steak:\n' + steakLines + '\n\nFor seafood:\n' + sfoodLines + wineRec + '\n\nWant to build a reservation request?';
  }

  // --- Menu-grounded replies ---
  if (menuChunks.length > 0) {
    var intro = {
      brunch: 'For brunch at ' + company + ':',
      date_night: 'For date night at ' + company + ':',
      steak: 'For steak at ' + company + ':',
      seafood: 'For seafood at ' + company + ':',
      starters: 'For shared starters at ' + company + ':'
    }[intent] || 'Here are some picks from ' + company + ':';

    var menuLines = menuChunks.slice(0, 6).map(chunkBullet).join('\n');
    var wineNote = wineChunks.length > 0 ? '\n\nFor wine, ' + (parseMeta(wineChunks[0]).name || 'a house selection') + ' pairs well with this style of meal.' : '';
    var cta = intent === 'date_night' ? '\n\nShall I help turn this into a reservation request?' : '\n\nWant to build a reservation request or ask about something else?';
    return groupLine + intro + '\n\n' + menuLines + wineNote + cta;
  }

  // --- Fallback intent replies ---
  var phone = (contact && contact.phone) || '';
  if (intent === 'event') return company + ' hosts private events and special occasions. Want to send an inquiry?' + (phone ? ' Or call ' + phone + '.' : '');
  if (intent === 'reservation') return 'Happy to help with a reservation at ' + company + '. Share your name, party size, and preferred date and time.' + (phone ? ' Or call ' + phone + '.' : '');
  if (intent === 'brunch') return groupLine + 'For brunch at ' + company + ':\n\n\u2022 Avocado Benedict\n\u2022 Lobster Benedict\n\u2022 Chicken & Waffles\n\u2022 Chorizo Chilaquiles\n\u2022 Steak & Eggs\n\u2022 Salmon Burger\n\nWant to build a reservation request?';
  if (intent === 'date_night') return groupLine + 'For date night at ' + company + ':\n\n\u2022 Filet Mignon\n\u2022 Seafood Risotto\n\u2022 Bacon Jam Scallops\n\u2022 Slow Braised Short Rib\n\nShall I help turn this into a reservation request?';
  if (intent === 'steak') return groupLine + 'For steak at ' + company + ':\n\n\u2022 Filet Mignon\n\u2022 Top Sirloin Steak\n\u2022 Flat Iron Steak\n\u2022 Slow Braised Short Rib\n\nWant to add seafood or build a reservation request?';
  if (intent === 'seafood') return groupLine + 'For seafood at ' + company + ':\n\n\u2022 Grilled Atlantic Salmon\n\u2022 Seared Ahi Steak\n\u2022 Seafood Risotto\n\u2022 Bacon Jam Scallops\n\u2022 Pacific Halibut Fish N Chips\n\u2022 Cioppino\n\nWant to build a reservation request?';

  return groupLine + 'I can help ' + (multi ? names.join(' and ') + ' ' : '') + 'plan a great meal at ' + company + '. Ask me about menu picks, wine pairings, brunch, date night, seafood, steaks, or reservations.';
}

// -------------------------------------------------------
// Keyword fallback for when Vectorize returns nothing
// -------------------------------------------------------
function flattenMenu(menu) {
  var out = [];
  var menus = menu && Array.isArray(menu.menus) ? menu.menus : [];
  menus.forEach(function(m) {
    (m.categories || []).forEach(function(c) {
      (c.items || []).forEach(function(item) {
        out.push({ menu: m.name||'', category: c.name||'', name: item.name||'', description: item.description||'', price: item.price||'', tags: Array.isArray(item.tags)?item.tags:[] });
      });
    });
  });
  return out;
}

function termsFor(text) {
  var s = String(text||'').toLowerCase();
  var terms = s.split(/[^a-z0-9]+/).filter(function(x){return x.length>2;});
  if(/seafood|fish|coastal/.test(s)) terms=terms.concat(['seafood','salmon','halibut','ahi','shrimp','scallop','cioppino','lobster']);
  if(/brunch|breakfast|benedict|eggs/.test(s)) terms=terms.concat(['brunch','breakfast','benedict','waffle','avocado','chilaquiles']);
  if(/date|romantic|anniversary/.test(s)) terms=terms.concat(['filet','steak','scallops','risotto']);
  if(/steak|beef/.test(s)) terms=terms.concat(['steak','filet','sirloin','flat iron','short rib']);
  return terms;
}

function kwSearch(menu, text, limit) {
  var items = flattenMenu(menu);
  var terms = termsFor(text);
  return items.map(function(item) {
    var hay = (item.menu+' '+item.category+' '+item.name+' '+item.description+' '+item.tags.join(' ')).toLowerCase();
    var score = terms.reduce(function(s,t){return s+(hay.indexOf(t)!==-1?2:0);},0);
    return {item:item,score:score};
  }).filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score;}).slice(0,limit||5).map(function(x){return x.item;});
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
  await dbRun(env, 'INSERT INTO chat_rooms (id, slug, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [roomId, slug, title, 'open', ts, ts]);
  var welcomeMsg = 'Welcome to your Waters Edge planning room! Share this link with a friend to plan together. I can help with menu picks, wine pairings, brunch, date night, seafood, steaks, reservations, and private events.';
  await dbRun(env, 'INSERT INTO chat_messages (id, room_id, slug, role, name, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [uid(), roomId, slug, 'assistant', 'Waters Edge', welcomeMsg, null, ts]);
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
  await dbRun(env, 'INSERT INTO chat_messages (id, room_id, slug, role, name, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [msgId, roomId, slug, 'user', name, message, meta, ts]);
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

  // Load full room history for context
  var roomMessages = await dbAll(env, 'SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at ASC LIMIT 30', [roomId]);
  var roomCtx = buildRoomContext(roomMessages);
  var contact = await loadSection(env, slug, 'contact', defaultContact());

  // Detect intent from current message + room history
  var intent = detectIntent(message, roomCtx);

  var menuChunks = [];
  var wineChunks = [];
  var mode = 'fallback';

  // Build a rich query combining current message with room context
  var richQuery = message;
  if (roomCtx.prefs) richQuery = message + ' context: ' + roomCtx.prefs.slice(0, 200);

  // Embed and search Vectorize
  var queryVec = await embedQuery(env, richQuery);

  if (queryVec) {
    // Get top 12 results unfiltered, then split by type in JS
    var allMatches = await vectorSearch(env, queryVec, 12);

    if (allMatches.length > 0) {
      mode = 'retrieval';
      var menuIds = [];
      var wineIds = [];

      for (var i = 0; i < allMatches.length; i++) {
        var m = allMatches[i];
        var mtype = m.metadata && m.metadata.type ? m.metadata.type : null;
        // If metadata has type use it, otherwise fetch chunk to check
        if (mtype === 'wine_item') {
          wineIds.push(m.id);
        } else if (mtype === 'menu_item') {
          menuIds.push(m.id);
        } else {
          // No metadata type - fetch to determine
          var chunk = await fetchChunk(env, m.id);
          if (chunk) {
            if (chunk.type === 'wine_item') wineIds.push(m.id);
            else menuIds.push(m.id);
          }
        }
      }

      // For wine intent, prioritize wine chunks
      if (intent === 'wine') {
        // If we got no wine from Vectorize, do a direct D1 wine lookup
        if (wineIds.length === 0) {
          var wineRows = await dbAll(env, 'SELECT id, type, title, body, metadata_json FROM knowledge_chunks WHERE slug=? AND type=? LIMIT 5', [slug, 'wine_item']);
          wineChunks = wineRows;
        } else {
          for (var j = 0; j < Math.min(wineIds.length, 5); j++) {
            var wc = await fetchChunk(env, wineIds[j]);
            if (wc) wineChunks.push(wc);
          }
        }
        // Also get some food context if query mentions food
        for (var k = 0; k < Math.min(menuIds.length, 3); k++) {
          var mc = await fetchChunk(env, menuIds[k]);
          if (mc) menuChunks.push(mc);
        }
      } else {
        // For food intents, get menu chunks + any wine for pairing
        for (var mi = 0; mi < Math.min(menuIds.length, 6); mi++) {
          var mchunk = await fetchChunk(env, menuIds[mi]);
          if (mchunk) menuChunks.push(mchunk);
        }
        if (wineIds.length > 0) {
          var wpair = await fetchChunk(env, wineIds[0]);
          if (wpair) wineChunks.push(wpair);
        }
      }
    }
  }

  // D1 keyword fallback if Vectorize returned nothing
  if (menuChunks.length === 0 && wineChunks.length === 0) {
    mode = 'keyword';
    if (intent === 'wine') {
      // Direct D1 wine lookup
      var wineRows2 = await dbAll(env, 'SELECT id, type, title, body, metadata_json FROM knowledge_chunks WHERE slug=? AND type=? LIMIT 6', [slug, 'wine_item']);
      wineChunks = wineRows2;
    } else {
      var menu = await loadSection(env, slug, 'menu', defaultMenu());
      var kwItems = kwSearch(menu, message + ' ' + roomCtx.combined, 6);
      // Convert to chunk-like objects
      menuChunks = kwItems.map(function(item) {
        return {
          id: item.name,
          type: 'menu_item',
          title: item.name,
          body: (item.menu||'') + ' - ' + (item.category||'') + ': ' + item.name + '. ' + (item.description||''),
          metadata_json: JSON.stringify({ name: item.name, price: item.price, tags: item.tags, menu: item.menu, category: item.category })
        };
      });
    }
  }

  var reply = buildReply(intent, menuChunks, wineChunks, message, roomCtx, contact);

  var ts = now();
  var msgId = uid();
  var replyMeta = JSON.stringify({ mode: mode, intent: intent, participants: roomCtx.participants, menu_count: menuChunks.length, wine_count: wineChunks.length });

  await dbRun(env, 'INSERT INTO chat_messages (id, room_id, slug, role, name, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [msgId, roomId, slug, 'assistant', 'Waters Edge', reply, replyMeta, ts]);
  await dbRun(env, 'UPDATE chat_rooms SET updated_at=? WHERE id=?', [ts, roomId]);

  return j({ ok: true, reply: reply, message_id: msgId, mode: mode, intent: intent, participants: roomCtx.participants, menu_count: menuChunks.length, wine_count: wineChunks.length });
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
  await dbRun(env, 'INSERT INTO demo_leads (slug, name, email, phone, message, created_at) VALUES (?, ?, ?, ?, ?, ?)', [slug, name, email, phone, summary, ts]);
  return j({ ok: true, intent: intent, summary: summary, created_at: ts });
}
