// src/handlers/order.js - watersedge-phase2-snapshot
// Phase 5B: Order builder - add items to cart, get cart, follow-up questions.
import { j, now } from '../utils.js';
import { dbRun, dbFirst, dbAll } from '../db.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Follow-up questions by item type
function followUpFor(itemName, emoji) {
  var n = String(itemName || '').toLowerCase();
  if (/filet|sirloin|flat iron|steak/.test(n) && !/ahi|seared/.test(n)) {
    return {
      question: 'How would you like your ' + itemName + ' cooked?',
      options: ['Rare', 'Medium Rare', 'Medium', 'Medium Well', 'Well Done']
    };
  }
  if (/short rib/.test(n)) {
    return {
      question: 'Any special notes for the Short Rib?',
      options: ['No special requests', 'Extra sauce on the side', 'Dairy free if possible']
    };
  }
  if (/salmon|halibut|ahi|scallop|lobster|cioppino|seafood|shrimp|mussel/.test(n)) {
    return {
      question: 'Any preferences for the ' + itemName + '?',
      options: ['No special requests', 'Light on the sauce', 'Extra lemon', 'Gluten free if possible']
    };
  }
  if (/benedict|waffle|chilaquile|burrito|egg/.test(n)) {
    return {
      question: 'How would you like your eggs?',
      options: ['Poached', 'Scrambled', 'Over easy', 'No preference']
    };
  }
  if (/burger/.test(n)) {
    return {
      question: 'How would you like your burger cooked?',
      options: ['Medium Rare', 'Medium', 'Well Done', 'No preference']
    };
  }
  if (/wine|chardonnay|sauvignon|pinot|cabernet|malbec|rose|sparkling/.test(n)) {
    return {
      question: 'Would you like a glass or a bottle?',
      options: ['Glass', 'Bottle', 'We\u2019ll decide at the table']
    };
  }
  return {
    question: 'Any special requests for the ' + itemName + '?',
    options: ['No special requests', 'Allergy or dietary note', 'Ask server for details']
  };
}

// POST /api/chat/room/order/add
export async function handleOrderAdd(request, env, slug) {
  var body = await request.json().catch(function() { return {}; });
  var roomId = String(body.room_id || '').trim();
  var participantId = String(body.participant_id || '').trim();
  var playerName = String(body.player_name || 'Guest').trim();
  var playerNumber = parseInt(body.player_number || 1, 10);
  var itemName = String(body.item_name || '').trim();
  var itemCategory = String(body.item_category || '').trim();
  var itemEmoji = String(body.item_emoji || '\u2022').trim();
  var itemNotes = String(body.item_notes || '').trim();

  if (!roomId || !itemName) return j({ ok: false, error: 'room_id and item_name required' }, 400);

  var room = await dbFirst(env, 'SELECT * FROM chat_rooms WHERE id=? AND slug=?', [roomId, slug]);
  if (!room) return j({ ok: false, error: 'room not found' }, 404);

  var ts = now();
  var orderId = uid();

  await dbRun(env,
    'INSERT INTO room_orders (id,room_id,slug,participant_id,player_name,player_number,item_name,item_category,item_emoji,item_notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [orderId, roomId, slug, participantId, playerName, playerNumber, itemName, itemCategory, itemEmoji, itemNotes, ts]
  );

  // Post a system message so everyone sees what was added
  var addMsg = itemEmoji + ' ' + playerName + ' added ' + itemName + ' to the order.';
  await dbRun(env,
    'INSERT INTO chat_messages (id,room_id,slug,role,name,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?)',
    [uid(), roomId, slug, 'system', 'Waters Edge', addMsg, JSON.stringify({ type: 'order_add', item: itemName, player: playerName }), ts]
  );

  // Get the full current order for this room
  var allOrders = await dbAll(env, 'SELECT * FROM room_orders WHERE room_id=? ORDER BY created_at ASC', [roomId]);

  // Build follow-up question
  var followUp = followUpFor(itemName, itemEmoji);

  return j({
    ok: true,
    order_id: orderId,
    item_name: itemName,
    player_name: playerName,
    follow_up: followUp,
    cart: allOrders
  });
}

// POST /api/chat/room/order/note
// Saves a note/preference for an existing order item
export async function handleOrderNote(request, env, slug) {
  var body = await request.json().catch(function() { return {}; });
  var orderId = String(body.order_id || '').trim();
  var note = String(body.note || '').trim();
  if (!orderId) return j({ ok: false, error: 'order_id required' }, 400);
  await dbRun(env, 'UPDATE room_orders SET item_notes=? WHERE id=?', [note, orderId]);
  return j({ ok: true, order_id: orderId, note: note });
}

// GET /api/chat/room/order?id=<room_id>
export async function handleOrderGet(request, env, slug) {
  var url = new URL(request.url);
  var roomId = url.searchParams.get('id') || '';
  if (!roomId) return j({ ok: false, error: 'room id required' }, 400);
  var orders = await dbAll(env, 'SELECT * FROM room_orders WHERE room_id=? ORDER BY player_number ASC, created_at ASC', [roomId]);
  return j({ ok: true, room_id: roomId, cart: orders });
}

// POST /api/chat/room/order/remove
export async function handleOrderRemove(request, env, slug) {
  var body = await request.json().catch(function() { return {}; });
  var orderId = String(body.order_id || '').trim();
  if (!orderId) return j({ ok: false, error: 'order_id required' }, 400);
  await dbRun(env, 'DELETE FROM room_orders WHERE id=?', [orderId]);
  return j({ ok: true, order_id: orderId });
}
