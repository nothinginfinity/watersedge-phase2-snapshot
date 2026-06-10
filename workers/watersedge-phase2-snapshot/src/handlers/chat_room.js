// src/handlers/chat_room.js - watersedge-phase2-snapshot
// Phase 5A: Participant identity, join flow, player numbers, personalized greetings.
import { j, now } from '../utils.js';
import { dbRun, dbFirst, dbAll, loadSection, defaultContact, defaultMenu } from '../db.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const PLAYER_COLORS = ['#0b8f86','#c0392b','#6c3483','#b7600a','#1a5276'];
const PLAYER_LABELS = ['Player 1','Player 2','Player 3','Player 4','Player 5'];

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

// Load all participants for a room
async function getRoomParticipants(env, roomId) {
  try {
    return await dbAll(env, 'SELECT * FROM room_participants WHERE room_id=? ORDER BY player_number ASC', [roomId]);
  } catch (e) { return []; }
}

function buildRoomContext(roomMessages, participants) {
  var userMsgs = roomMessages.filter(function(m) { return m.role === 'user'; });
  var byName = {};
  userMsgs.forEach(function(m) {
    var name = (m.name && m.name !== 'Guest') ? m.name : null;
    if (!name) return;
    if (!byName[name]) byName[name] = [];
    byName[name].push(m.message);
  });
  var names = participants && participants.length
    ? participants.map(function(p) { return p.display_name; })
    : Object.keys(byName);
  var combined = userMsgs.map(function(m) { return (m.name||'Guest')+': '+m.message; }).join(' | ');
  var prefs = names.map(function(n) { return n+' said: '+(byName[n]||[]).slice(-2).join('; '); }).filter(function(s){return s.indexOf('said: ')!==-1&&s.split('said: ')[1];}).join(' / ');
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

var EMOJI = {
  steak:'\uD83E\uDD69',beef:'\uD83E\uDD69',salmon:'\uD83D\uDC1F',seafood:'\uD83E\uDD90',
  scallops:'\uD83E\uDEA8',lobster:'\uD83E\uDD9E',ahi:'\uD83D\uDC1F',halibut:'\uD83D\uDC1F',
  brunch:'\uD83C\uDF73',benedict:'\uD83C\uDF73',waffle:'\uD83E\uDDC7',burger:'\uD83C\uDF54',
  pasta:'\uD83C\uDF5D',risotto:'\uD83C\uDF5B',soup:'\uD83C\uDF72',starter:'\uD83E\uDD57',
  vegetable:'\uD83E\uDD57',pizza:'\uD83C\uDF55',dessert:'\uD83C\uDF70',
  white:'\uD83E\uDD42',red:'\uD83C\uDF77',sparkling:'\uD83E\uDD42',rose:'\uD83C\uDF38'
};

function emojiForItem(tags, name) {
  if (!Array.isArray(tags)) tags = [];
  for (var i=0;i<tags.length;i++) { if(EMOJI[tags[i]])return EMOJI[tags[i]]; }
  var n=String(name||'').toLowerCase();
  if(/salmon|halibut|ahi|fish/.test(n))return'\uD83D\uDC1F';
  if(/scallop/.test(n))return'\uD83E\uDEA8';
  if(/shrimp|lumpia/.test(n))return'\uD83E\uDD90';
  if(/lobster/.test(n))return'\uD83E\uDD9E';
  if(/steak|filet|sirloin|flat iron|short rib/.test(n))return'\uD83E\uDD69';
  if(/waffle/.test(n))return'\uD83E\uDDC7';
  if(/benedict|egg/.test(n))return'\uD83C\uDF73';
  if(/burger/.test(n))return'\uD83C\uDF54';
  if(/risotto|pasta/.test(n))return'\uD83C\uDF5B';
  if(/brussel|vegetable|avocado/.test(n))return'\uD83E\uDD57';
  if(/calamari|mussel/.test(n))return'\uD83E\uDD90';
  return'\u2022';
}

function emojiForWine(type) {
  var t=String(type||'').toLowerCase();
  if(t==='white')return'\uD83E\uDD42';
  if(t==='red')return'\uD83C\uDF77';
  if(t==='sparkling')return'\uD83E\uDD42';
  if(t==='rose')return'\uD83C\uDF38';
  return'\uD83C\uDF77';
}

function menuCard(chunk){
  var meta=parseMeta(chunk);
  var name=meta.name||chunk.title||'Item';
  var bodyStr=String(chunk.body||'');
  var descMatch=bodyStr.match(/[^:]+:\s+[^.]+\.\s+(.+?)(?:\.\s+Tags|$)/);
  var desc=descMatch?descMatch[1].trim().split('.')[0]:'';
  return{emoji:emojiForItem(meta.tags,name),name:name,desc:desc,price:meta.price||''};
}

function wineCard(chunk){
  var meta=parseMeta(chunk);
  var name=meta.name||chunk.title||'Wine';
  var glass=meta.price_glass?meta.price_glass+'/glass':'';
  var bottle=meta.price_bottle?meta.price_bottle+'/bottle':'';
  var price=[glass,bottle].filter(Boolean).join(' \u00b7 ');
  var detail=meta.varietal?meta.varietal+(meta.region?', '+meta.region:''):'';
  return{emoji:emojiForWine(meta.type),name:name,desc:detail,price:price};
}

function buildCards(intent,menuChunks,wineChunks,msg,ctx,contact,participants){
  var company=(contact&&contact.company)||'Waters Edge';
  var s=String(msg||'').toLowerCase();
  var names=ctx.participants;
  var multi=ctx.multiParty;
  var groupLine=(multi&&names.length>1)?'Planning for '+names.join(' and ')+':':'';

  if(intent==='greeting'){
    var p1=participants&&participants[0]?participants[0].display_name:'you';
    var p2=participants&&participants[1]?participants[1].display_name:null;
    var greetIntro=p2
      ? p1+' and '+p2+', welcome to your planning room!'
      : 'Welcome, '+p1+'! What are you planning tonight?';
    return{
      intro:greetIntro,
      cards:[
        {emoji:'\uD83E\uDD90',name:'Seafood',desc:'Salmon, Halibut, Ahi, Scallops, Cioppino'},
        {emoji:'\uD83E\uDD69',name:'Steaks',desc:'Filet Mignon, Sirloin, Flat Iron, Short Rib'},
        {emoji:'\uD83C\uDF77',name:'Wine Pairings',desc:'8 options — California, Oregon, France'},
        {emoji:'\uD83C\uDF73',name:'Brunch',desc:'Benedict, Waffles, Chilaquiles and more'},
        {emoji:'\uD83C\uDF89',name:'Private Events',desc:'Corporate, wedding, special occasions'}
      ],
      cta_label:'Build Reservation Request',cta_action:'reserve',
      outro:'Tap a category or type your question.'
    };
  }

  if(intent==='wine'){
    var wCards=wineChunks.slice(0,6).map(wineCard);
    if(!wCards.length)wCards=[{emoji:'\uD83C\uDF77',name:'Ask your server',desc:'Current wine list available on request',price:''}];
    var pNote='';
    if(/salmon/.test(s))pNote='For salmon: Pinot Noir or Chardonnay.\n\n';
    else if(/steak|filet|beef/.test(s))pNote='For steak: Cabernet Sauvignon or Malbec.\n\n';
    else if(/seafood|halibut|scallop/.test(s))pNote='For seafood: Sauvignon Blanc or Chardonnay.\n\n';
    var fCards=menuChunks.slice(0,3).map(menuCard);
    return{intro:(groupLine?groupLine+'\n\n':'')+pNote+'Wine options at '+company+':',cards:wCards,section2_label:fCards.length?'For the food:':'',section2_cards:fCards,cta_label:'Build Reservation Request',cta_action:'reserve',outro:''};
  }

  if(intent==='surf_turf'){
    var stkC=menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&(m.tags.indexOf('steak')!==-1||m.tags.indexOf('beef')!==-1);}).slice(0,3).map(menuCard);
    var sfC=menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&m.tags.indexOf('seafood')!==-1;}).slice(0,3).map(menuCard);
    if(!stkC.length)stkC=[{emoji:'\uD83E\uDD69',name:'Filet Mignon',desc:'Premium cut for a special dinner',price:''},{emoji:'\uD83E\uDD69',name:'Top Sirloin Steak',desc:'Classic steakhouse choice',price:''}];
    if(!sfC.length)sfC=[{emoji:'\uD83D\uDC1F',name:'Grilled Atlantic Salmon',desc:'Refined coastal presentation',price:''},{emoji:'\uD83E\uDD90',name:'Seafood Risotto',desc:'Creamy date-night pick',price:''}];
    return{intro:(groupLine?groupLine+'\n\n':'')+'Great combo \u2014 '+company+' has both covered:',section1_label:'\uD83E\uDD69 For steak:',section1_cards:stkC,section2_label:'\uD83E\uDD90 For seafood:',section2_cards:sfC,wine_note:wineChunks.length?'Pinot Noir pairs beautifully with both \u2014 a great shared bottle.':'',cta_label:'Build Reservation Request',cta_action:'reserve',outro:''};
  }

  if(intent==='steak'){
    var stkCards=menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&(m.tags.indexOf('steak')!==-1||m.tags.indexOf('beef')!==-1);}).slice(0,5).map(menuCard);
    if(!stkCards.length)stkCards=[{emoji:'\uD83E\uDD69',name:'Filet Mignon',desc:'Premium cut, perfect for a special dinner',price:''},{emoji:'\uD83E\uDD69',name:'Top Sirloin Steak',desc:'Classic steakhouse choice',price:''},{emoji:'\uD83E\uDD69',name:'Flat Iron Steak',desc:'Hearty and flavorful',price:''},{emoji:'\uD83E\uDD69',name:'Slow Braised Short Rib',desc:'Tender, rich comfort dish',price:''}];
    return{intro:(groupLine?groupLine+'\n\n':'')+'For steak at '+company+':',cards:stkCards,wine_note:wineChunks.length?(parseMeta(wineChunks[0]).name||'Cabernet Sauvignon')+' pairs perfectly.':'',cta_label:'Build Reservation Request',cta_action:'reserve',outro:''};
  }

  if(intent==='seafood'){
    var sfCards=menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&m.tags.indexOf('seafood')!==-1;}).slice(0,6).map(menuCard);
    if(!sfCards.length)sfCards=[{emoji:'\uD83D\uDC1F',name:'Grilled Atlantic Salmon',desc:'Refined coastal presentation',price:''},{emoji:'\uD83D\uDC1F',name:'Seared Ahi Steak',desc:'Bold seafood entree',price:''},{emoji:'\uD83E\uDD90',name:'Seafood Risotto',desc:'Creamy coastal date-night pick',price:''},{emoji:'\uD83E\uDEA8',name:'Bacon Jam Scallops',desc:'Signature shared option',price:''},{emoji:'\uD83D\uDC1F',name:'Pacific Halibut Fish N Chips',desc:'Crisp coastal classic',price:''},{emoji:'\uD83E\uDD90',name:'Cioppino',desc:'Rich seafood stew',price:''}];
    return{intro:(groupLine?groupLine+'\n\n':'')+'For seafood at '+company+':',cards:sfCards,wine_note:wineChunks.length?(parseMeta(wineChunks[0]).name||'Sauvignon Blanc')+' pairs beautifully with seafood.':'',cta_label:'Build Reservation Request',cta_action:'reserve',outro:''};
  }

  if(intent==='brunch'){
    var brCards=menuChunks.filter(function(c){var m=parseMeta(c);return m.tags&&m.tags.indexOf('brunch')!==-1;}).slice(0,6).map(menuCard);
    if(!brCards.length)brCards=[{emoji:'\uD83C\uDF73',name:'Avocado Benedict',desc:'Brunch classic with avocado',price:''},{emoji:'\uD83E\uDD9E',name:'Lobster Benedict',desc:'Premium seafood Benedict',price:''},{emoji:'\uD83E\uDDC7',name:'Chicken & Waffles',desc:'Sweet and savory favorite',price:''},{emoji:'\uD83C\uDF73',name:'Chorizo Chilaquiles',desc:'Bold brunch flavor',price:''},{emoji:'\uD83E\uDD69',name:'Steak & Eggs',desc:'Classic hearty brunch',price:''},{emoji:'\uD83D\uDC1F',name:'Salmon Burger',desc:'Seafood brunch option',price:''}];
    return{intro:(groupLine?groupLine+'\n\n':'')+'For brunch at '+company+':',cards:brCards,cta_label:'Build Reservation Request',cta_action:'reserve',outro:''};
  }

  if(intent==='date_night'){
    return{intro:(groupLine?groupLine+'\n\n':'')+'For date night at '+company+':',cards:[{emoji:'\uD83E\uDD69',name:'Filet Mignon',desc:'Premium cut for a special evening',price:''},{emoji:'\uD83E\uDD90',name:'Seafood Risotto',desc:'Coastal date-night classic',price:''},{emoji:'\uD83E\uDEA8',name:'Bacon Jam Scallops',desc:'Signature shared pick',price:''},{emoji:'\uD83E\uDD69',name:'Slow Braised Short Rib',desc:'Tender and rich',price:''},{emoji:'\uD83E\uDD42',name:'Sparkling Rose',desc:'Celebration bottle for the evening',price:'$14/glass'}],cta_label:'Build Reservation Request',cta_action:'reserve',outro:''};
  }

  if(intent==='event'){
    var ph=(contact&&contact.phone)||'';
    return{intro:company+' hosts private events, corporate gatherings, and special occasions.',cards:[{emoji:'\uD83C\uDF89',name:'Private Dining',desc:'Exclusive room and menu options'},{emoji:'\uD83C\uDFE2',name:'Corporate Events',desc:'Team dinners and private gatherings'},{emoji:'\uD83D\uDC8D',name:'Special Occasions',desc:'Birthdays, anniversaries, rehearsal dinners'}],cta_label:'Send Event Inquiry',cta_action:'reserve',outro:ph?'Or call '+ph+' directly.':''};
  }

  if(intent==='reservation'){
    return{intro:'Happy to help with a reservation at '+company+'.',cards:[],cta_label:'Build Reservation Request',cta_action:'reserve',outro:''};
  }

  if(menuChunks.length>0){
    return{intro:'Here are some picks from '+company+':',cards:menuChunks.slice(0,5).map(menuCard),cta_label:'Build Reservation Request',cta_action:'reserve',outro:''};
  }

  return{intro:'I can help plan a great meal at '+company+'.',cards:[{emoji:'\uD83E\uDD90',name:'Seafood picks',desc:'Ask me about salmon, halibut, scallops'},{emoji:'\uD83E\uDD69',name:'Steaks',desc:'Filet, sirloin, flat iron, short rib'},{emoji:'\uD83C\uDF77',name:'Wine pairings',desc:'Whites, reds, sparkling, and ros\u00e9'},{emoji:'\uD83C\uDF73',name:'Brunch',desc:'Benedicts, waffles, chilaquiles'}],cta_label:'Build Reservation Request',cta_action:'reserve',outro:''};
}

function cardsToText(cardData){
  var lines=[];
  if(cardData.intro)lines.push(cardData.intro);
  var allCards=(cardData.cards||[]).concat(cardData.section1_cards||[]).concat(cardData.section2_cards||[]);
  allCards.forEach(function(c){lines.push((c.emoji?c.emoji+' ':'')+c.name+(c.price?' ('+c.price+')':'')+(c.desc?' \u2014 '+c.desc:''));});
  if(cardData.wine_note)lines.push('\uD83C\uDF77 '+cardData.wine_note);
  if(cardData.outro)lines.push(cardData.outro);
  return lines.join('\n');
}

function flattenMenu(menu){
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

// -------------------------------------------------------
// Route handlers
// -------------------------------------------------------

export async function handleRoomCreate(request, env, slug) {
  var body=await request.json().catch(function(){return{};});
  var intent=String(body.intent||'').trim();
  var roomId=uid();var ts=now();
  var title=intent?intent:'Planning Room';
  await dbRun(env,'INSERT INTO chat_rooms (id,slug,title,status,created_at,updated_at) VALUES (?,?,?,?,?,?)',[roomId,slug,title,'open',ts,ts]);
  // No welcome message on create — the join flow handles the greeting
  return j({ok:true,room_id:roomId,title:title,share_url:'https://watersedge-phase2-snapshot.jaredtechfit.workers.dev/chat-room?id='+roomId,created_at:ts});
}

// POST /api/chat/room/join
// Called when a participant enters their name on the room page.
// Returns their player number, color, and whether they are the first or a returning guest.
export async function handleRoomJoin(request, env, slug) {
  var body=await request.json().catch(function(){return{};});
  var roomId=String(body.room_id||'').trim();
  var participantId=String(body.participant_id||'').trim();
  var displayName=String(body.display_name||'').trim();
  if(!roomId||!participantId||!displayName) return j({ok:false,error:'room_id, participant_id, and display_name required'},400);

  var room=await dbFirst(env,'SELECT * FROM chat_rooms WHERE id=? AND slug=?',[roomId,slug]);
  if(!room)return j({ok:false,error:'room not found'},404);

  var ts=now();

  // Check if this participant already exists
  var existing=await dbFirst(env,'SELECT * FROM room_participants WHERE room_id=? AND participant_id=?',[roomId,participantId]);
  if(existing){
    // Update name if changed
    if(existing.display_name!==displayName){
      await dbRun(env,'UPDATE room_participants SET display_name=?,updated_at=? WHERE room_id=? AND participant_id=?',[displayName,ts,roomId,participantId]);
      existing.display_name=displayName;
    }
    var allParticipants=await getRoomParticipants(env,roomId);
    return j({ok:true,is_new:false,player_number:existing.player_number,color:existing.color,display_name:existing.display_name,participants:allParticipants});
  }

  // New participant — assign next player number
  var currentParticipants=await getRoomParticipants(env,roomId);
  var playerNumber=currentParticipants.length+1;
  var color=PLAYER_COLORS[(playerNumber-1)%PLAYER_COLORS.length];
  var rowId=uid();

  await dbRun(env,
    'INSERT INTO room_participants (id,room_id,slug,participant_id,display_name,color,player_number,prefs_json,joined_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [rowId,roomId,slug,participantId,displayName,color,playerNumber,null,ts,ts]
  );

  var updatedParticipants=await getRoomParticipants(env,roomId);
  var isFirstPlayer=playerNumber===1;

  // Post a system message visible to everyone announcing the join
  var joinMsg=isFirstPlayer
    ? displayName+' started this planning room. Share the link to invite a friend!'
    : displayName+' joined the planning room! Welcome, Player '+playerNumber+'!';

  await dbRun(env,'INSERT INTO chat_messages (id,room_id,slug,role,name,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?)',
    [uid(),roomId,slug,'system','Waters Edge',joinMsg,JSON.stringify({type:'join',player_number:playerNumber,participant_id:participantId}),ts]);

  // Post personalized greeting from assistant
  var greetMsg;
  if(isFirstPlayer){
    greetMsg='Hi '+displayName+'! \uD83D\uDC4B\n\nYou\u2019re Player 1. Share the room link so your friend can join as Player 2.\n\nWhile you wait, what are you thinking for tonight? I can suggest seafood, steaks, brunch picks, wine pairings, or help build a reservation.';
  } else {
    var p1=updatedParticipants[0]?updatedParticipants[0].display_name:'your friend';
    greetMsg='Hi '+displayName+'! \uD83D\uDC4B You\u2019re Player '+playerNumber+'.\n\n'+p1+' is already here planning. Jump in \u2014 what are you in the mood for? I\u2019ll help you both put together a great meal at Waters Edge.';
  }

  await dbRun(env,'INSERT INTO chat_messages (id,room_id,slug,role,name,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?)',
    [uid(),roomId,slug,'assistant','Waters Edge',greetMsg,JSON.stringify({type:'greeting',player_number:playerNumber}),ts]);

  return j({ok:true,is_new:true,player_number:playerNumber,color:color,display_name:displayName,participants:updatedParticipants});
}

// GET /api/chat/room/participants?id=<room_id>
export async function handleRoomParticipants(request, env, slug) {
  var url=new URL(request.url);
  var roomId=url.searchParams.get('id')||'';
  if(!roomId)return j({ok:false,error:'room id required'},400);
  var participants=await getRoomParticipants(env,roomId);
  return j({ok:true,room_id:roomId,participants:participants});
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
  await dbRun(env,'INSERT INTO chat_messages (id,room_id,slug,role,name,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?)',
    [msgId,roomId,slug,'user',name,message,JSON.stringify({color:color,participant_id:participantId,client_message_id:clientMsgId}),ts]);
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
  var participants=await getRoomParticipants(env,roomId);
  var ctx=buildRoomContext(roomMessages,participants);
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

  if(intent==='wine'&&wineChunks.length===0){
    mode='keyword';
    var wRows=await dbAll(env,'SELECT id,type,title,body,metadata_json FROM knowledge_chunks WHERE slug=? AND type=? ORDER BY created_at ASC LIMIT 8',[slug,'wine_item']);
    wineChunks=wRows;
  }

  if(menuChunks.length===0&&intent!=='wine'&&intent!=='greeting'&&intent!=='event'&&intent!=='reservation'){
    if(mode!=='retrieval')mode='keyword';
    var menu=await loadSection(env,slug,'menu',defaultMenu());
    var kwItems=kwSearch(menu,message+' '+ctx.combined,8);
    menuChunks=kwItems.map(function(item){
      return{id:item.name,type:'menu_item',title:item.name,body:(item.menu||'')+' - '+(item.category||'')+': '+item.name+'. '+(item.description||''),metadata_json:JSON.stringify({name:item.name,price:item.price,tags:item.tags,menu:item.menu,category:item.category})};
    });
  }

  var cardData=buildCards(intent,menuChunks,wineChunks,message,ctx,contact,participants);
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
  var participants=await getRoomParticipants(env,roomId);
  var playerNames=participants.map(function(p){return p.display_name;}).join(', ');
  var parts=['[chat-room]','Room: '+roomId,'Intent: '+intent,'Players: '+(playerNames||'unknown'),'Name: '+name];
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
