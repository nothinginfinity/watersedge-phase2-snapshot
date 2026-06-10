// src/handlers/chat_room.js - watersedge-phase2-snapshot
// Phase 4: Structured card responses. Assistant returns reply_cards array
// which the client renders as emoji cards with inline CTA.
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
  try { return await dbFirst(env, 'SELECT id,type,title,body,metadata_json FROM knowledge_chunks WHERE id=?', [id]); }
  catch (e) { return null; }
}

function parseMeta(row) {
  try { return row && row.metadata_json ? JSON.parse(row.metadata_json) : {}; } catch (e) { return {}; }
}

function buildRoomContext(roomMessages) {
  var userMsgs = roomMessages.filter(function(m) { return m.role === 'user'; });
  var participants = {};
  userMsgs.forEach(function(m) {
    var name = (m.name && m.name !== 'Guest') ? m.name : null;
    if (!name) return;
    if (!participants[name]) participants[name] = [];
    participants[name].push(m.message);
  });
  var names = Object.keys(participants);
  var combined = userMsgs.map(function(m) { return (m.name||'Guest')+': '+m.message; }).join(' | ');
  var prefs = names.map(function(n) { return n+' said: '+participants[n].slice(-2).join('; '); }).join(' / ');
  return { participants: names, combined: combined, prefs: prefs, multiParty: names.length > 1 };
}

function detectIntent(msg, ctx) {
  var s = String(msg||'').toLowerCase();
  if (/wine|pairing|pairs with|bottle|glass|red wine|white wine|sparkling|ros[e\u00e9]|chardonnay|cabernet|pinot noir|pinot grigio|malbec|sauvignon/.test(s)) return 'wine';
  if (/brunch|breakfast|benedict|waffle|morning|chilaquile/.test(s)) return 'brunch';
  if (/date night|romantic|anniversary/.test(s)) return 'date_night';
  if (/\bsteak\b|filet mignon|sirloin|flat iron|short rib/.test(s)) return 'steak';
  if (/seafood|fish|salmon|halibut|\bahi\b|scallop|lobster|cioppino|shrimp|mussel/.test(s)) return 'seafood';
  if (/private event|corporate|party|wedding|catering|buyout/.test(s)) return 'event';
  if (/reservation|book|reserve|table/.test(s)) return 'reservation';
  if (/starter|appetizer|lumpia|calamari|small plate/.test(s)) return 'starters';
  if (/\bwine\b|pair/.test(s)) return 'wine';
  var h = String(ctx.combined||'').toLowerCase();
  if (/wine|pairing/.test(h)) return 'wine';
  if (/\bsteak\b/.test(h) && /seafood|salmon/.test(h)) return 'surf_turf';
  if (/brunch/.test(h)) return 'brunch';
  if (/date night/.test(h)) return 'date_night';
  if (/hello|hi\b|hey|plan|dinner|lunch|tonight|visit|eat/.test(s)) return 'greeting';
  return 'general';
}

function detectRoomIntent(messages) {
  var combined = messages.map(function(m) { return m.message||''; }).join(' ').toLowerCase();
  var intents = [];
  if (/brunch|benedict|waffle/.test(combined)) intents.push('brunch');
  if (/date night|romantic/.test(combined)) intents.push('date night');
  if (/private event|wedding/.test(combined)) intents.push('private event');
  if (/seafood|salmon|halibut|ahi/.test(combined)) intents.push('seafood');
  if (/\bsteak\b|filet/.test(combined)) intents.push('steak');
  if (/wine|pairing/.test(combined)) intents.push('wine');
  if (/reservation|book|reserve/.test(combined)) intents.push('reservation');
  return intents.length ? intents.join(', ') : 'general inquiry';
}

// -------------------------------------------------------
// Emoji map for item categories/tags
// -------------------------------------------------------
var EMOJI = {
  steak: '\uD83E\uDD69',
  beef: '\uD83E\uDD69',
  salmon: '\uD83D\uDC1F',
  seafood: '\uD83E\uDD90',
  scallops: '\uD83E\uDEA8',
  lobster: '\uD83E\uDD9E',
  ahi: '\uD83D\uDC1F',
  halibut: '\uD83D\uDC1F',
  brunch: '\uD83C\uDF73',
  benedict: '\uD83C\uDF73',
  waffle: '\uD83E\uDDC7',
  burger: '\uD83C\uDF54',
  pasta: '\uD83C\uDF5D',
  risotto: '\uD83C\uDF5B',
  soup: '\uD83C\uDF72',
  starter: '\uD83E\uDD57',
  vegetable: '\uD83E\uDD57',
  pizza: '\uD83C\uDF55',
  dessert: '\uD83C\uDF70',
  white: '\uD83E\uDD42',
  red: '\uD83C\uDF77',
  sparkling: '\uD83E\uDD42',
  rose: '\uD83C\uDF38'
};

function emojiForItem(tags, name) {
  if (!Array.isArray(tags)) tags = [];
  for (var i = 0; i < tags.length; i++) {
    if (EMOJI[tags[i]]) return EMOJI[tags[i]];
  }
  var n = String(name||'').toLowerCase();
  if (/salmon|halibut|ahi|fish/.test(n)) return '\uD83D\uDC1F';
  if (/scallop/.test(n)) return '\uD83E\uDEA8';
  if (/shrimp|lumpia/.test(n)) return '\uD83E\uDD90';
  if (/lobster/.test(n)) return '\uD83E\uDD9E';
  if (/steak|filet|sirloin|flat iron|short rib/.test(n)) return '\uD83E\uDD69';
  if (/waffle/.test(n)) return '\uD83E\uDDC7';
  if (/benedict|egg/.test(n)) return '\uD83C\uDF73';
  if (/burger/.test(n)) return '\uD83C\uDF54';
  if (/risotto|pasta/.test(n)) return '\uD83C\uDF5B';
  if (/brussel|vegetable|avocado/.test(n)) return '\uD83E\uDD57';
  if (/calamari|mussel/.test(n)) return '\uD83E\uDD90';
  return '\u2022';
}

function emojiForWine(type) {
  var t = String(type||'').toLowerCase();
  if (t==='white') return '\uD83E\uDD42';
  if (t==='red') return '\uD83C\uDF77';
  if (t==='sparkling') return '\uD83E\uDD42';
  if (t==='rose') return '\uD83C\uDF38';
  return '\uD83C\uDF77';
}

// -------------------------------------------------------
// Card builder helpers
// -------------------------------------------------------
function menuCard(chunk) {
  var meta = parseMeta(chunk);
  var name = meta.name || chunk.title || 'Item';
  var bodyStr = String(chunk.body||'');
  var descMatch = bodyStr.match(/[^:]+:\s+[^.]+\.\s+(.+?)(?:\.\s+Tags|$)/);
  var desc = descMatch ? descMatch[1].trim().split('.')[0] : '';
  var emoji = emojiForItem(meta.tags, name);
  return { emoji: emoji, name: name, desc: desc, price: meta.price||'' };
}

function wineCard(chunk) {
  var meta = parseMeta(chunk);
  var name = meta.name || chunk.title || 'Wine';
  var glass = meta.price_glass ? meta.price_glass+'/glass' : '';
  var bottle = meta.price_bottle ? meta.price_bottle+'/bottle' : '';
  var price = [glass, bottle].filter(Boolean).join(' \u00b7 ');
  var detail = meta.varietal ? meta.varietal+(meta.region?', '+meta.region:'') : '';
  var emoji = emojiForWine(meta.type);
  return { emoji: emoji, name: name, desc: detail, price: price };
}

// -------------------------------------------------------
// Build structured card response
// Returns { intro, cards, cta_label, cta_action, outro }
// -------------------------------------------------------
function buildCards(intent, menuChunks, wineChunks, msg, ctx, contact) {
  var company = (contact&&contact.company)||'Waters Edge';
  var s = String(msg||'').toLowerCase();
  var names = ctx.participants;
  var multi = ctx.multiParty;
  var groupLine = (multi&&names.length>1) ? 'Planning for '+names.join(' and ')+':' : '';

  if (intent === 'greeting') {
    return {
      intro: (groupLine?groupLine+'\n\n':'')+'Welcome to '+company+'! What are you in the mood for?',
      cards: [
        {emoji:'\uD83E\uDD90',name:'Seafood',desc:'Salmon, Halibut, Ahi, Scallops, Cioppino'},
        {emoji:'\uD83E\uDD69',name:'Steaks',desc:'Filet Mignon, Sirloin, Flat Iron, Short Rib'},
        {emoji:'\uD83C\uDF77',name:'Wine Pairings',desc:'8 options from California, Oregon, France'},
        {emoji:'\uD83C\uDF73',name:'Brunch',desc:'Benedict, Waffles, Chilaquiles and more'},
        {emoji:'\uD83C\uDF89',name:'Private Events',desc:'Corporate, wedding, special occasions'}
      ],
      cta_label: 'Build Reservation Request',
      cta_action: 'reserve',
      outro: 'Tap a category above or type your question.'
    };
  }

  if (intent === 'wine') {
    var wCards = wineChunks.slice(0,6).map(wineCard);
    if (wCards.length === 0) {
      wCards = [
        {emoji:'\uD83C\uDF77',name:'Ask your server',desc:'Current wine list available on request',price:''}
      ];
    }
    var pairingNote = '';
    if (/salmon/.test(s)) pairingNote = 'For salmon: Pinot Noir or Chardonnay.';
    else if (/steak|filet|beef/.test(s)) pairingNote = 'For steak: Cabernet Sauvignon or Malbec.';
    else if (/seafood|halibut|scallop/.test(s)) pairingNote = 'For seafood: Sauvignon Blanc or Chardonnay.';
    var fCards = menuChunks.slice(0,3).map(menuCard);
    return {
      intro: (groupLine?groupLine+'\n\n':'')+(pairingNote?pairingNote+'\n\n':'')+'Wine options at '+company+':',
      cards: wCards,
      section2_label: fCards.length ? 'For the food:' : '',
      section2_cards: fCards,
      cta_label: 'Build Reservation Request',
      cta_action: 'reserve',
      outro: ''
    };
  }

  if (intent === 'surf_turf') {
    var steakCards = menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&(m.tags.indexOf('steak')!==-1||m.tags.indexOf('beef')!==-1);}).slice(0,3).map(menuCard);
    var sfoodCards = menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&m.tags.indexOf('seafood')!==-1;}).slice(0,3).map(menuCard);
    if (!steakCards.length) steakCards=[{emoji:'\uD83E\uDD69',name:'Filet Mignon',desc:'Premium cut for a special dinner',price:''},{emoji:'\uD83E\uDD69',name:'Top Sirloin Steak',desc:'Classic steakhouse choice',price:''}];
    if (!sfoodCards.length) sfoodCards=[{emoji:'\uD83D\uDC1F',name:'Grilled Atlantic Salmon',desc:'Refined coastal presentation',price:''},{emoji:'\uD83E\uDD90',name:'Seafood Risotto',desc:'Creamy date-night pick',price:''}];
    var wNote = wineChunks.length ? 'Pinot Noir pairs beautifully with both \u2014 a great shared bottle.' : '';
    return {
      intro: (groupLine?groupLine+'\n\n':'')+'Great combo \u2014 '+company+' has both covered:',
      section1_label: '\uD83E\uDD69 For steak:',
      section1_cards: steakCards,
      section2_label: '\uD83E\uDD90 For seafood:',
      section2_cards: sfoodCards,
      wine_note: wNote,
      cta_label: 'Build Reservation Request',
      cta_action: 'reserve',
      outro: ''
    };
  }

  if (intent === 'steak') {
    var stkCards = menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&(m.tags.indexOf('steak')!==-1||m.tags.indexOf('beef')!==-1);}).slice(0,5).map(menuCard);
    if (!stkCards.length) stkCards=[
      {emoji:'\uD83E\uDD69',name:'Filet Mignon',desc:'Premium cut, perfect for a special dinner',price:''},
      {emoji:'\uD83E\uDD69',name:'Top Sirloin Steak',desc:'Classic steakhouse choice',price:''},
      {emoji:'\uD83E\uDD69',name:'Flat Iron Steak',desc:'Hearty and flavorful',price:''},
      {emoji:'\uD83E\uDD69',name:'Slow Braised Short Rib',desc:'Tender, rich comfort dish',price:''}
    ];
    var wPair = wineChunks.length ? (parseMeta(wineChunks[0]).name||'Cabernet Sauvignon')+' pairs perfectly.' : '';
    return {
      intro: (groupLine?groupLine+'\n\n':'')+'For steak at '+company+':',
      cards: stkCards,
      wine_note: wPair,
      cta_label: 'Build Reservation Request',
      cta_action: 'reserve',
      outro: ''
    };
  }

  if (intent === 'seafood') {
    var sfCards = menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&m.tags.indexOf('seafood')!==-1;}).slice(0,6).map(menuCard);
    if (!sfCards.length) sfCards=[
      {emoji:'\uD83D\uDC1F',name:'Grilled Atlantic Salmon',desc:'Refined coastal presentation',price:''},
      {emoji:'\uD83D\uDC1F',name:'Seared Ahi Steak',desc:'Bold seafood entree',price:''},
      {emoji:'\uD83E\uDD90',name:'Seafood Risotto',desc:'Creamy coastal date-night pick',price:''},
      {emoji:'\uD83E\uDEA8',name:'Bacon Jam Scallops',desc:'Signature shared option',price:''},
      {emoji:'\uD83D\uDC1F',name:'Pacific Halibut Fish N Chips',desc:'Crisp coastal classic',price:''},
      {emoji:'\uD83E\uDD90',name:'Cioppino',desc:'Rich seafood stew',price:''}
    ];
    var wPair2 = wineChunks.length ? (parseMeta(wineChunks[0]).name||'Sauvignon Blanc')+' pairs beautifully with seafood.' : '';
    return {
      intro: (groupLine?groupLine+'\n\n':'')+'For seafood at '+company+':',
      cards: sfCards,
      wine_note: wPair2,
      cta_label: 'Build Reservation Request',
      cta_action: 'reserve',
      outro: ''
    };
  }

  if (intent === 'brunch') {
    var brCards = menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&m.tags.indexOf('brunch')!==-1;}).slice(0,6).map(menuCard);
    if (!brCards.length) brCards=[
      {emoji:'\uD83C\uDF73',name:'Avocado Benedict',desc:'Brunch classic with avocado',price:''},
      {emoji:'\uD83E\uDD9E',name:'Lobster Benedict',desc:'Premium seafood Benedict',price:''},
      {emoji:'\uD83E\uDDC7',name:'Chicken & Waffles',desc:'Sweet and savory favorite',price:''},
      {emoji:'\uD83C\uDF73',name:'Chorizo Chilaquiles',desc:'Bold brunch flavor',price:''},
      {emoji:'\uD83E\uDD69',name:'Steak & Eggs',desc:'Classic hearty brunch',price:''},
      {emoji:'\uD83D\uDC1F',name:'Salmon Burger',desc:'Seafood brunch option',price:''}
    ];
    return {
      intro: (groupLine?groupLine+'\n\n':'')+'For brunch at '+company+':',
      cards: brCards,
      cta_label: 'Build Reservation Request',
      cta_action: 'reserve',
      outro: ''
    };
  }

  if (intent === 'date_night') {
    return {
      intro: (groupLine?groupLine+'\n\n':'')+'For date night at '+company+':',
      cards: [
        {emoji:'\uD83E\uDD69',name:'Filet Mignon',desc:'Premium cut for a special evening',price:''},
        {emoji:'\uD83E\uDD90',name:'Seafood Risotto',desc:'Coastal date-night classic',price:''},
        {emoji:'\uD83E\uDEA8',name:'Bacon Jam Scallops',desc:'Signature shared pick',price:''},
        {emoji:'\uD83E\uDD69',name:'Slow Braised Short Rib',desc:'Tender and rich',price:''},
        {emoji:'\uD83E\uDD42',name:'Sparkling Rose',desc:'Celebration bottle for the evening',price:'$14/glass'}
      ],
      cta_label: 'Build Reservation Request',
      cta_action: 'reserve',
      outro: ''
    };
  }

  if (intent === 'event') {
    var ph = (contact&&contact.phone)||'';
    return {
      intro: company+' hosts private events, corporate gatherings, and special occasions.',
      cards: [
        {emoji:'\uD83C\uDF89',name:'Private Dining',desc:'Exclusive room and menu options'},
        {emoji:'\uD83C\uDFE2',name:'Corporate Events',desc:'Team dinners and private gatherings'},
        {emoji:'\uD83D\uDC8D',name:'Special Occasions',desc:'Birthdays, anniversaries, rehearsal dinners'}
      ],
      cta_label: 'Send Event Inquiry',
      cta_action: 'reserve',
      outro: ph?'Or call '+ph+' directly.':''
    };
  }

  if (intent === 'reservation') {
    return {
      intro: 'Happy to help with a reservation at '+company+'.',
      cards: [],
      cta_label: 'Build Reservation Request',
      cta_action: 'reserve',
      outro: ''
    };
  }

  // General / fallback with whatever menu chunks we have
  if (menuChunks.length > 0) {
    var genCards = menuChunks.slice(0,5).map(menuCard);
    return {
      intro: 'Here are some picks from '+company+':',
      cards: genCards,
      cta_label: 'Build Reservation Request',
      cta_action: 'reserve',
      outro: ''
    };
  }

  return {
    intro: 'I can help plan a great meal at '+company+'.',
    cards: [
      {emoji:'\uD83E\uDD90',name:'Seafood picks',desc:'Ask me about salmon, halibut, scallops'},
      {emoji:'\uD83E\uDD69',name:'Steaks',desc:'Filet, sirloin, flat iron, short rib'},
      {emoji:'\uD83C\uDF77',name:'Wine pairings',desc:'Whites, reds, sparkling, and ros\u00e9'},
      {emoji:'\uD83C\uDF73',name:'Brunch',desc:'Benedicts, waffles, chilaquiles'}
    ],
    cta_label: 'Build Reservation Request',
    cta_action: 'reserve',
    outro: ''
  };
}

// Plain text version of cards for storage/fallback
function cardsToText(cardData) {
  var lines = [];
  if (cardData.intro) lines.push(cardData.intro);
  var allCards = (cardData.cards||[]).concat(cardData.section1_cards||[]).concat(cardData.section2_cards||[]);
  allCards.forEach(function(c) {
    lines.push((c.emoji?c.emoji+' ':'') + c.name + (c.price?' ('+c.price+')':'') + (c.desc?' \u2014 '+c.desc:''));
  });
  if (cardData.wine_note) lines.push('\uD83C\uDF77 '+cardData.wine_note);
  if (cardData.outro) lines.push(cardData.outro);
  return lines.join('\n');
}

// Keyword fallback
function flattenMenu(menu) {
  var out=[];
  (menu&&Array.isArray(menu.menus)?menu.menus:[]).forEach(function(m) {
    (m.categories||[]).forEach(function(c) {
      (c.items||[]).forEach(function(item) {
        out.push({menu:m.name||'',category:c.name||'',name:item.name||'',description:item.description||'',price:item.price||'',tags:Array.isArray(item.tags)?item.tags:[]});
      });
    });
  });
  return out;
}
function kwSearch(menu,text,limit) {
  var items=flattenMenu(menu);
  var s=String(text||'').toLowerCase();
  var terms=s.split(/[^a-z0-9]+/).filter(function(x){return x.length>2;});
  return items.map(function(item) {
    var hay=(item.menu+' '+item.category+' '+item.name+' '+item.description+' '+item.tags.join(' ')).toLowerCase();
    var score=terms.reduce(function(sc,t){return sc+(hay.indexOf(t)!==-1?2:0);},0);
    return{item:item,score:score};
  }).filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score;}).slice(0,limit||5).map(function(x){return x.item;});
}

// Route handlers
export async function handleRoomCreate(request, env, slug) {
  var body=await request.json().catch(function(){return{};});
  var intent=String(body.intent||'').trim();
  var roomId=uid();var ts=now();
  var title=intent?intent:'Planning Room';
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

  var menuChunks=[];var wineChunks=[];var mode='fallback';
  var richQuery=message+(ctx.prefs?' context: '+ctx.prefs.slice(0,150):'');
  var queryVec=await embedQuery(env,richQuery);

  if(queryVec){
    var allMatches=await vectorSearch(env,queryVec,14);
    if(allMatches.length>0){
      mode='retrieval';
      for(var i=0;i<allMatches.length;i++){
        var m=allMatches[i];
        var mtype=(m.metadata&&m.metadata.type)?m.metadata.type:null;
        if(!mtype){var c=await fetchChunk(env,m.id);if(c)mtype=c.type;}
        if(mtype==='wine_item'&&wineChunks.length<6){var wc=await fetchChunk(env,m.id);if(wc)wineChunks.push(wc);}
        else if(mtype==='menu_item'&&menuChunks.length<8){var mc=await fetchChunk(env,m.id);if(mc)menuChunks.push(mc);}
      }
    }
  }

  // Wine safety net
  if(intent==='wine'&&wineChunks.length===0){
    mode='keyword';
    var wRows=await dbAll(env,'SELECT id,type,title,body,metadata_json FROM knowledge_chunks WHERE slug=? AND type=? ORDER BY created_at ASC LIMIT 8',[slug,'wine_item']);
    wineChunks=wRows;
  }

  // Menu keyword fallback
  if(menuChunks.length===0&&intent!=='wine'&&intent!=='greeting'&&intent!=='event'&&intent!=='reservation'){
    if(mode!=='retrieval')mode='keyword';
    var menu=await loadSection(env,slug,'menu',defaultMenu());
    var kwItems=kwSearch(menu,message+' '+ctx.combined,8);
    menuChunks=kwItems.map(function(item){
      return{id:item.name,type:'menu_item',title:item.name,body:(item.menu||'')+' - '+(item.category||'')+': '+item.name+'. '+(item.description||''),metadata_json:JSON.stringify({name:item.name,price:item.price,tags:item.tags,menu:item.menu,category:item.category})};
    });
  }

  var cardData=buildCards(intent,menuChunks,wineChunks,message,ctx,contact);
  var replyText=cardsToText(cardData);
  var ts=now();var msgId=uid();

  await dbRun(env,'INSERT INTO chat_messages (id,room_id,slug,role,name,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?)',
    [msgId,roomId,slug,'assistant','Waters Edge',replyText,JSON.stringify({mode:mode,intent:intent,participants:ctx.participants,cards:cardData}),ts]);
  await dbRun(env,'UPDATE chat_rooms SET updated_at=? WHERE id=?',[ts,roomId]);

  return j({ok:true,reply:replyText,reply_cards:cardData,message_id:msgId,mode:mode,intent:intent,participants:ctx.participants});
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
