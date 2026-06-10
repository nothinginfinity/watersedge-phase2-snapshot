// src/handlers/chat_room.js - watersedge-phase2-snapshot
// Phase 3D v2: Better steak/seafood separation, smarter general query handling,
// participant names from room history when not set.
import { j, now } from '../utils.js';
import { dbRun, dbFirst, dbAll, loadSection, defaultContact, defaultMenu } from '../db.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function embedQuery(env, text) {
  if (!env.AI) return null;
  try {
    var result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [String(text).slice(0, 512)] });
    var data = result && result.data && result.data[0];
    return Array.isArray(data) ? data : null;
  } catch (e) { return null; }
}

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

function buildRoomContext(roomMessages) {
  var userMessages = roomMessages.filter(function(m) { return m.role === 'user'; });
  var participants = {};
  userMessages.forEach(function(m) {
    var name = (m.name && m.name !== 'Guest') ? m.name : null;
    if (!name) return;
    if (!participants[name]) participants[name] = [];
    participants[name].push(m.message);
  });
  var names = Object.keys(participants);
  var combined = userMessages.map(function(m) { return (m.name || 'Guest') + ': ' + m.message; }).join(' | ');
  var prefs = names.map(function(n) { return n + ' said: ' + participants[n].slice(-2).join('; '); }).join(' / ');
  return { participants: names, combined: combined, prefs: prefs, multiParty: names.length > 1 };
}

function detectIntent(msg, ctx) {
  var s = String(msg || '').toLowerCase();
  // Wine always wins if explicit
  if (/wine|pairing|pairs with|bottle|glass|red wine|white wine|sparkling|ros[e\u00e9]|chardonnay|cabernet|pinot noir|pinot grigio|malbec|sauvignon/.test(s)) return 'wine';
  if (/brunch|breakfast|benedict|waffle|morning|chilaquile/.test(s)) return 'brunch';
  if (/date night|romantic|anniversary/.test(s)) return 'date_night';
  // Steak before seafood so "steak" queries don't bleed into seafood
  if (/\bsteak\b|filet mignon|sirloin|flat iron|short rib/.test(s)) return 'steak';
  if (/seafood|fish|salmon|halibut|\bahi\b|scallop|lobster|cioppino|shrimp|mussel/.test(s)) return 'seafood';
  if (/private event|corporate|party|wedding|catering|buyout/.test(s)) return 'event';
  if (/reservation|book|reserve|table/.test(s)) return 'reservation';
  if (/starter|appetizer|lumpia|calamari|small plate/.test(s)) return 'starters';
  if (/\bwine\b|pair/.test(s)) return 'wine';
  // History fallback
  var h = String(ctx.combined || '').toLowerCase();
  if (/wine|pairing/.test(h)) return 'wine';
  if (/\bsteak\b/.test(h) && /seafood|salmon/.test(h)) return 'surf_turf';
  if (/brunch/.test(h)) return 'brunch';
  if (/date night/.test(h)) return 'date_night';
  // Intro/greeting - don't try to answer with menu items
  if (/hello|hi\b|hey|plan|dinner|lunch|tonight|tonight|visit|eat/.test(s)) return 'greeting';
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

function chunkBullet(chunk) {
  var meta = parseMeta(chunk);
  var name = meta.name || chunk.title || 'Item';
  var price = meta.price ? ' (' + meta.price + ')' : '';
  var bodyStr = String(chunk.body || '');
  var descMatch = bodyStr.match(/[^:]+:\s+[^.]+\.\s+(.+?)(?:\.\s+Tags|$)/);
  var desc = descMatch ? ' \u2014 ' + descMatch[1].trim().split('.')[0] : '';
  return '\u2022 ' + name + price + desc;
}

function wineBullet(chunk) {
  var meta = parseMeta(chunk);
  var name = meta.name || chunk.title || 'Wine';
  var glass = meta.price_glass ? ' (' + meta.price_glass + '/glass' : '';
  var bottle = meta.price_bottle ? ', ' + meta.price_bottle + '/btl)' : (glass ? ')' : '');
  var detail = meta.varietal ? ' \u2014 ' + meta.varietal + (meta.region ? ', ' + meta.region : '') : '';
  return '\u2022 ' + name + glass + bottle + detail;
}

function buildReply(intent, menuChunks, wineChunks, msg, ctx, contact) {
  var company = (contact && contact.company) || 'Waters Edge Restaurant and Bar';
  var s = String(msg || '').toLowerCase();
  var names = ctx.participants;
  var multi = ctx.multiParty;
  var groupLine = (multi && names.length > 1) ? 'Planning for ' + names.join(' and ') + ':\n\n' : '';

  // Greeting / intro - warm response asking what they want
  if (intent === 'greeting') {
    var who = multi ? names.join(' and ') : 'everyone';
    return 'Welcome! Happy to help ' + who + ' plan a great meal at ' + company + '.\n\nWhat are you in the mood for? I can help with:\n\u2022 Seafood, steaks, or shared plates\n\u2022 Wine pairings\n\u2022 Brunch picks\n\u2022 Date night recommendations\n\u2022 Private event inquiries\n\u2022 Reservation requests';
  }

  // Wine
  if (intent === 'wine') {
    if (wineChunks.length === 0) {
      return groupLine + 'For wine pairings, ask your server about our current selection. Want to build a reservation request?';
    }
    var pairingNote = '';
    if (/salmon/.test(s)) pairingNote = 'For salmon specifically: Pinot Noir or Chardonnay are your best bets.\n\n';
    else if (/steak|filet|beef|sirloin/.test(s)) pairingNote = 'For steak: Cabernet Sauvignon or Malbec are the go-to choices.\n\n';
    else if (/seafood|halibut|scallop|shrimp/.test(s)) pairingNote = 'For seafood: Sauvignon Blanc or Chardonnay pair beautifully.\n\n';
    var wineLines = wineChunks.slice(0, 6).map(wineBullet).join('\n');
    var foodNote = menuChunks.length > 0 ? '\n\nFor the food, top picks:\n' + menuChunks.slice(0, 3).map(chunkBullet).join('\n') : '';
    return groupLine + pairingNote + 'Wine options at ' + company + ':\n\n' + wineLines + foodNote + '\n\nWant to build a reservation request?';
  }

  // Surf and turf
  if (intent === 'surf_turf') {
    var steakList = menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&(m.tags.indexOf('steak')!==-1||m.tags.indexOf('beef')!==-1);});
    var sfoodList = menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&m.tags.indexOf('seafood')!==-1;});
    var sLines = (steakList.length?steakList:menuChunks.slice(0,2)).slice(0,3).map(chunkBullet).join('\n') || '\u2022 Filet Mignon\n\u2022 Top Sirloin Steak';
    var fLines = (sfoodList.length?sfoodList:menuChunks.slice(2,5)).slice(0,3).map(chunkBullet).join('\n') || '\u2022 Grilled Atlantic Salmon\n\u2022 Seafood Risotto';
    var wRec = wineChunks.length ? '\n\nFor wine, Pinot Noir works beautifully for both steak and salmon \u2014 a great shared bottle.' : '';
    return groupLine + 'Great combo \u2014 ' + company + ' has both covered:\n\nFor steak:\n' + sLines + '\n\nFor seafood:\n' + fLines + wRec + '\n\nWant to build a reservation request?';
  }

  // Steak - filter to ONLY steak/beef items
  if (intent === 'steak') {
    var steakOnly = menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&(m.tags.indexOf('steak')!==-1||m.tags.indexOf('beef')!==-1);});
    var steakLines = steakOnly.length ? steakOnly.slice(0,5).map(chunkBullet).join('\n') : '\u2022 Filet Mignon \u2014 premium cut for a special dinner\n\u2022 Top Sirloin Steak\n\u2022 Flat Iron Steak\n\u2022 Slow Braised Short Rib';
    var wPair = wineChunks.length ? '\n\nFor wine: ' + (parseMeta(wineChunks[0]).name||'Cabernet Sauvignon') + ' pairs perfectly with steak.' : '';
    return groupLine + 'For steak at ' + company + ':\n\n' + steakLines + wPair + '\n\nWant to build a reservation request?';
  }

  // Seafood - filter to ONLY seafood items
  if (intent === 'seafood') {
    var sfOnly = menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&m.tags.indexOf('seafood')!==-1;});
    var sfLines = sfOnly.length ? sfOnly.slice(0,6).map(chunkBullet).join('\n') : '\u2022 Grilled Atlantic Salmon\n\u2022 Seared Ahi Steak\n\u2022 Seafood Risotto\n\u2022 Bacon Jam Scallops\n\u2022 Pacific Halibut Fish N Chips\n\u2022 Cioppino';
    var wPair2 = wineChunks.length ? '\n\nFor wine: ' + (parseMeta(wineChunks[0]).name||'Sauvignon Blanc') + ' pairs beautifully with seafood.' : '';
    return groupLine + 'For seafood at ' + company + ':\n\n' + sfLines + wPair2 + '\n\nWant to build a reservation request?';
  }

  // Other menu-grounded replies
  if (menuChunks.length > 0) {
    var intros = { brunch:'For brunch at '+company+':', date_night:'For date night at '+company+':', starters:'For shared starters at '+company+':' };
    var intro = intros[intent] || 'Here are some picks from ' + company + ':';
    var mLines = menuChunks.slice(0,6).map(chunkBullet).join('\n');
    var wNote = wineChunks.length ? '\n\nFor wine, ' + (parseMeta(wineChunks[0]).name||'a house selection') + ' pairs well with this style of meal.' : '';
    var cta = intent==='date_night' ? '\n\nShall I help turn this into a reservation request?' : '\n\nWant to build a reservation request or ask about something else?';
    return groupLine + intro + '\n\n' + mLines + wNote + cta;
  }

  // Hardcoded fallbacks
  var phone = (contact && contact.phone) || '';
  if (intent==='event') return company+' hosts private events and special occasions. Want to send an inquiry?'+(phone?' Or call '+phone+'.':'');
  if (intent==='reservation') return 'Happy to help with a reservation at '+company+'. Share your name, party size, and preferred date and time.'+(phone?' Or call '+phone+'.':'');
  if (intent==='brunch') return groupLine+'For brunch at '+company+':\n\n\u2022 Avocado Benedict\n\u2022 Lobster Benedict\n\u2022 Chicken & Waffles\n\u2022 Chorizo Chilaquiles\n\u2022 Steak & Eggs\n\u2022 Salmon Burger\n\nWant to build a reservation request?';
  if (intent==='date_night') return groupLine+'For date night at '+company+':\n\n\u2022 Filet Mignon\n\u2022 Seafood Risotto\n\u2022 Bacon Jam Scallops\n\u2022 Slow Braised Short Rib\n\nShall I help turn this into a reservation request?';

  return groupLine+'I can help plan a great meal at '+company+'. Ask about seafood, steaks, wine pairings, brunch, date night, or reservations.';
}

// Keyword fallback
function flattenMenu(menu) {
  var out=[];
  (menu&&Array.isArray(menu.menus)?menu.menus:[]).forEach(function(m){
    (m.categories||[]).forEach(function(c){
      (c.items||[]).forEach(function(item){
        out.push({menu:m.name||'',category:c.name||'',name:item.name||'',description:item.description||'',price:item.price||'',tags:Array.isArray(item.tags)?item.tags:[]});
      });
    });
  });
  return out;
}
function kwSearch(menu,text,limit){
  var items=flattenMenu(menu);
  var s=String(text||'').toLowerCase();
  var terms=s.split(/[^a-z0-9]+/).filter(function(x){return x.length>2;});
  return items.map(function(item){
    var hay=(item.menu+' '+item.category+' '+item.name+' '+item.description+' '+item.tags.join(' ')).toLowerCase();
    var score=terms.reduce(function(sc,t){return sc+(hay.indexOf(t)!==-1?2:0);},0);
    return{item:item,score:score};
  }).filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score;}).slice(0,limit||5).map(function(x){return x.item;});
}

// Route handlers
export async function handleRoomCreate(request, env, slug) {
  var body = await request.json().catch(function() { return {}; });
  var intent = String(body.intent || '').trim();
  var roomId = uid(); var ts = now();
  var title = intent ? intent : 'Planning Room';
  await dbRun(env,'INSERT INTO chat_rooms (id,slug,title,status,created_at,updated_at) VALUES (?,?,?,?,?,?)',[roomId,slug,title,'open',ts,ts]);
  var welcomeMsg='Welcome to your Waters Edge planning room! Share this link with a friend to plan together. I can help with menu picks, wine pairings, brunch, date night, seafood, steaks, reservations, and private events.';
  await dbRun(env,'INSERT INTO chat_messages (id,room_id,slug,role,name,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?)',[uid(),roomId,slug,'assistant','Waters Edge',welcomeMsg,null,ts]);
  return j({ok:true,room_id:roomId,title:title,share_url:'https://watersedge-phase2-snapshot.jaredtechfit.workers.dev/chat-room?id='+roomId,created_at:ts});
}

export async function handleRoomMessages(request, env, slug) {
  var url=new URL(request.url);
  var roomId=url.searchParams.get('id')||'';
  if(!roomId)return j({ok:false,error:'room id required'},400);
  var room=await dbFirst(env,'SELECT * FROM chat_rooms WHERE id=? AND slug=?',[roomId,slug]);
  if(!room)return j({ok:false,error:'room not found'},404);
  var messages=await dbAll(env,'SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at ASC LIMIT 100',[roomId]);
  return j({ok:true,room_id:roomId,title:room.title,status:room.status,messages:messages});
}

export async function handleRoomMessage(request, env, slug) {
  var body=await request.json().catch(function(){return{};});
  var roomId=String(body.room_id||'').trim();
  var message=String(body.message||'').trim();
  var name=String(body.name||'Guest').trim();
  var color=String(body.color||'').trim();
  var participantId=String(body.participant_id||'').trim();
  var clientMsgId=String(body.client_message_id||'').trim();
  if(!roomId||!message)return j({ok:false,error:'room_id and message required'},400);
  var room=await dbFirst(env,'SELECT * FROM chat_rooms WHERE id=? AND slug=?',[roomId,slug]);
  if(!room)return j({ok:false,error:'room not found'},404);
  var msgId=uid();var ts=now();
  await dbRun(env,'INSERT INTO chat_messages (id,room_id,slug,role,name,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?)',[msgId,roomId,slug,'user',name,message,JSON.stringify({color:color,participant_id:participantId,client_message_id:clientMsgId}),ts]);
  await dbRun(env,'UPDATE chat_rooms SET updated_at=? WHERE id=?',[ts,roomId]);
  return j({ok:true,message_id:msgId,client_message_id:clientMsgId,room_id:roomId,created_at:ts});
}

export async function handleRoomAssistant(request, env, slug) {
  var body=await request.json().catch(function(){return{};});
  var roomId=String(body.room_id||'').trim();
  var message=String(body.message||'').trim();
  if(!roomId)return j({ok:false,error:'room_id required'},400);
  var room=await dbFirst(env,'SELECT * FROM chat_rooms WHERE id=? AND slug=?',[roomId,slug]);
  if(!room)return j({ok:false,error:'room not found'},404);

  var roomMessages=await dbAll(env,'SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at ASC LIMIT 30',[roomId]);
  var ctx=buildRoomContext(roomMessages);
  var contact=await loadSection(env,slug,'contact',defaultContact());
  var intent=detectIntent(message,ctx);

  var menuChunks=[]; var wineChunks=[]; var mode='fallback';

  // Rich query includes room context for better embedding
  var richQuery=message+(ctx.prefs?' context: '+ctx.prefs.slice(0,150):'');
  var queryVec=await embedQuery(env,richQuery);

  if(queryVec){
    var allMatches=await vectorSearch(env,queryVec,14);
    if(allMatches.length>0){
      mode='retrieval';
      for(var i=0;i<allMatches.length;i++){
        var m=allMatches[i];
        var mtype=(m.metadata&&m.metadata.type)?m.metadata.type:null;
        if(!mtype){
          var c=await fetchChunk(env,m.id);
          if(c)mtype=c.type;
        }
        if(mtype==='wine_item'&&wineChunks.length<6){
          var wc=await fetchChunk(env,m.id);
          if(wc)wineChunks.push(wc);
        } else if(mtype==='menu_item'&&menuChunks.length<8){
          var mc=await fetchChunk(env,m.id);
          if(mc)menuChunks.push(mc);
        }
      }
    }
  }

  // Always fetch wine from D1 directly when intent is wine, as a safety net
  if(intent==='wine'&&wineChunks.length===0){
    mode='keyword';
    var wRows=await dbAll(env,'SELECT id,type,title,body,metadata_json FROM knowledge_chunks WHERE slug=? AND type=? ORDER BY created_at ASC LIMIT 8',[slug,'wine_item']);
    wineChunks=wRows;
  }

  // D1 keyword fallback for menu
  if(menuChunks.length===0&&intent!=='wine'&&intent!=='greeting'&&intent!=='event'&&intent!=='reservation'){
    if(mode!=='retrieval')mode='keyword';
    var menu=await loadSection(env,slug,'menu',defaultMenu());
    var kwItems=kwSearch(menu,message+' '+ctx.combined,6);
    menuChunks=kwItems.map(function(item){
      return{id:item.name,type:'menu_item',title:item.name,body:(item.menu||'')+' - '+(item.category||'')+': '+item.name+'. '+(item.description||''),metadata_json:JSON.stringify({name:item.name,price:item.price,tags:item.tags,menu:item.menu,category:item.category})};
    });
  }

  var reply=buildReply(intent,menuChunks,wineChunks,message,ctx,contact);
  var ts=now();var msgId=uid();
  await dbRun(env,'INSERT INTO chat_messages (id,room_id,slug,role,name,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?)',[msgId,roomId,slug,'assistant','Waters Edge',reply,JSON.stringify({mode:mode,intent:intent,participants:ctx.participants}),ts]);
  await dbRun(env,'UPDATE chat_rooms SET updated_at=? WHERE id=?',[ts,roomId]);
  return j({ok:true,reply:reply,message_id:msgId,mode:mode,intent:intent,participants:ctx.participants});
}

export async function handleRoomSummaryLead(request, env, slug) {
  var body=await request.json().catch(function(){return{};});
  var roomId=String(body.room_id||'').trim();
  var name=String(body.name||'Chat Room Guest').trim();
  var email=String(body.email||'').trim();
  var phone=String(body.phone||'').trim();
  var partySize=String(body.party_size||'').trim();
  var prefDate=String(body.preferred_date||'').trim();
  var prefTime=String(body.preferred_time||'').trim();
  var occasion=String(body.occasion||'').trim();
  if(!roomId)return j({ok:false,error:'room_id required'},400);
  var room=await dbFirst(env,'SELECT * FROM chat_rooms WHERE id=? AND slug=?',[roomId,slug]);
  if(!room)return j({ok:false,error:'room not found'},404);
  var messages=await dbAll(env,'SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at ASC LIMIT 50',[roomId]);
  var intent=detectRoomIntent(messages);
  var userMsgs=messages.filter(function(m){return m.role==='user';}).slice(-5);
  var excerpt=userMsgs.map(function(m){return(m.name||'Guest')+': '+m.message;}).join(' | ');
  var parts=['[chat-room]','Room: '+roomId,'Intent: '+intent,'Title: '+(room.title||''),'Name: '+name];
  if(email)parts.push('Email: '+email);
  if(phone)parts.push('Phone: '+phone);
  if(partySize)parts.push('Party size: '+partySize);
  if(prefDate)parts.push('Date: '+prefDate);
  if(prefTime)parts.push('Time: '+prefTime);
  if(occasion)parts.push('Occasion: '+occasion);
  parts.push('Excerpt: '+excerpt);
  var ts=now();
  await dbRun(env,'INSERT INTO demo_leads (slug,name,email,phone,message,created_at) VALUES (?,?,?,?,?,?)',[slug,name,email,phone,parts.join(' | '),ts]);
  return j({ok:true,intent:intent,created_at:ts});
}
