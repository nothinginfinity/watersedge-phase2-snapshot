// src/render/chat_room.js - watersedge-phase2-snapshot
// Phase 5B: Order builder - Add to Order buttons, cart panel, follow-up questions.
import { h, esc } from '../utils.js';

export function renderChatRoom(roomId, initialData) {
  var title = (initialData && initialData.title) ? esc(initialData.title) : 'Planning Room';
  var rawShareUrl = 'https://watersedge-phase2-snapshot.jaredtechfit.workers.dev/chat-room?id=' + roomId;
  var shareUrl = esc(rawShareUrl);
  var messagesJson = JSON.stringify((initialData && initialData.messages) ? initialData.messages : []);

  var css = [
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{font-family:Inter,system-ui,sans-serif;background:#f5f0e8;color:#14110d;min-height:100vh;display:flex;flex-direction:column}',
    '.we-room-header{background:#14110d;color:#fff;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:20}',
    '.we-room-header-left{display:flex;flex-direction:column;gap:2px}',
    '.we-room-title{font-size:16px;font-weight:800;letter-spacing:-.01em}',
    '.we-room-sub{font-size:11px;opacity:.65}',
    '.we-room-back{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap}',
    '.we-onboard{position:fixed;inset:0;z-index:100;background:rgba(20,17,13,.7);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}',
    '.we-onboard.hidden{display:none}',
    '.we-onboard-card{background:#fff;border-radius:24px;padding:28px 24px;max-width:360px;width:100%;box-shadow:0 32px 80px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:16px}',
    '.we-onboard-logo{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#888;text-align:center}',
    '.we-onboard-title{font-size:22px;font-weight:800;text-align:center;line-height:1.2;color:#14110d}',
    '.we-onboard-sub{font-size:14px;color:#74685f;text-align:center;line-height:1.5}',
    '.we-onboard-input{width:100%;border:2px solid rgba(20,17,13,.18);border-radius:12px;padding:13px 14px;font-size:16px;background:#f5f0e8;color:#14110d;text-align:center;font-weight:600}',
    '.we-onboard-input:focus{outline:none;border-color:#0b8f86}',
    '.we-onboard-btn{width:100%;padding:14px;background:#14110d;color:#fff;border:0;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer}',
    '.we-onboard-btn:disabled{opacity:.5;cursor:not-allowed}',
    '.we-player-bar{background:#fff;border-bottom:1px solid rgba(20,17,13,.08);padding:8px 14px;display:flex;align-items:center;gap:10px;overflow-x:auto;scrollbar-width:none}',
    '.we-player-bar::-webkit-scrollbar{display:none}',
    '.we-player-chip{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:#f5f0e8;border:1px solid rgba(20,17,13,.1);font-size:12px;font-weight:700;white-space:nowrap;flex-shrink:0}',
    '.we-player-chip-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}',
    '.we-player-chip.me{background:#14110d;color:#fff;border-color:#14110d}',
    '.we-invite-bar{background:#14110d;color:#fff;padding:7px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px}',
    '.we-invite-bar-label{font-size:11px;opacity:.75;flex:1;min-width:0}',
    '.we-invite-bar-copy{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}',
    '.we-room-body{flex:1;display:flex;flex-direction:column;max-width:640px;width:100%;margin:0 auto;padding:0 0 84px}',
    '.we-action-strip{display:flex;gap:7px;overflow-x:auto;padding:10px 12px;border-bottom:1px solid rgba(20,17,13,.08);background:#fff;scrollbar-width:none}',
    '.we-action-strip::-webkit-scrollbar{display:none}',
    '.we-action-btn{border:1px solid rgba(20,17,13,.18);background:#f5f0e8;color:#14110d;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0}',
    '.we-action-btn.primary{background:#0b8f86;color:#fff;border-color:#0b8f86}',
    '.we-action-btn.cart-btn{background:#14110d;color:#fff;border-color:#14110d;position:relative}',
    '.we-cart-badge{position:absolute;top:-4px;right:-4px;background:#c0392b;color:#fff;border-radius:999px;font-size:10px;font-weight:800;padding:1px 5px;min-width:16px;text-align:center;line-height:14px}',
    '.we-panel{background:#fff;border:1px solid rgba(20,17,13,.1);border-radius:16px;padding:14px;margin:10px 12px;display:none}',
    '.we-panel.visible{display:block}',
    '.we-panel h3{font-size:13px;font-weight:800;margin-bottom:10px;color:#14110d}',
    '.we-panel-url{background:#f5f0e8;border:1px solid rgba(20,17,13,.12);border-radius:8px;padding:8px 10px;font-size:12px;word-break:break-all;margin-bottom:10px;color:#555}',
    '.we-lead-field{width:100%;border:1px solid rgba(20,17,13,.18);border-radius:8px;padding:9px 11px;font-size:13px;margin-bottom:8px;background:#f5f0e8;color:#14110d}',
    '.we-lead-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.we-lead-submit{background:#0b8f86;color:#fff;border:0;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;width:100%;margin-top:4px}',
    '.we-lead-done{font-size:13px;color:#0b8f86;font-weight:700;text-align:center;padding:8px;display:none}',
    '.we-btn-copy{background:#14110d;color:#fff;border:0;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer}',
    // Cart panel
    '.we-cart-empty{font-size:13px;color:#888;text-align:center;padding:12px 0}',
    '.we-cart-player{margin-bottom:12px}',
    '.we-cart-player-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#888;margin-bottom:6px;display:flex;align-items:center;gap:6px}',
    '.we-cart-player-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}',
    '.we-cart-item{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(20,17,13,.06)}',
    '.we-cart-item:last-child{border-bottom:none}',
    '.we-cart-item-emoji{font-size:16px;width:22px;text-align:center;flex-shrink:0}',
    '.we-cart-item-name{flex:1;font-size:13px;font-weight:600;color:#14110d}',
    '.we-cart-item-note{font-size:11px;color:#888;margin-top:1px}',
    '.we-cart-remove{background:none;border:0;color:#c0392b;font-size:16px;cursor:pointer;padding:0 4px;line-height:1;flex-shrink:0}',
    '.we-cart-send{width:100%;padding:11px 0;background:#0b8f86;color:#fff;border:0;border-radius:999px;font-size:13px;font-weight:800;cursor:pointer;margin-top:12px}',
    '.we-cart-send:disabled{opacity:.5;cursor:not-allowed}',
    // Follow-up modal
    '.we-followup{position:fixed;inset:0;z-index:90;background:rgba(20,17,13,.6);display:flex;align-items:flex-end;justify-content:center;padding:0;backdrop-filter:blur(2px)}',
    '.we-followup.hidden{display:none}',
    '.we-followup-card{background:#fff;border-radius:24px 24px 0 0;padding:24px 20px 32px;max-width:640px;width:100%;box-shadow:0 -20px 60px rgba(0,0,0,.2)}',
    '.we-followup-title{font-size:16px;font-weight:800;color:#14110d;margin-bottom:14px;line-height:1.3}',
    '.we-followup-opts{display:flex;flex-direction:column;gap:8px}',
    '.we-followup-opt{width:100%;padding:12px 16px;background:#f5f0e8;border:1px solid rgba(20,17,13,.12);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;text-align:left;color:#14110d}',
    '.we-followup-opt:active{background:#14110d;color:#fff}',
    '.we-followup-skip{width:100%;padding:10px;background:none;border:0;font-size:13px;color:#888;cursor:pointer;margin-top:4px}',
    // Message log
    '.we-msg-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:#f5f0e8;min-height:240px}',
    '.we-msg-wrap{display:flex;flex-direction:column;max-width:88%}',
    '.we-msg-wrap.user-self{align-self:flex-end;align-items:flex-end}',
    '.we-msg-wrap.user-other{align-self:flex-start;align-items:flex-start}',
    '.we-msg-wrap.assistant{align-self:flex-start;align-items:flex-start;max-width:95%}',
    '.we-msg-wrap.system{align-self:center;align-items:center;max-width:90%}',
    '.we-bubble{border-radius:18px;padding:10px 14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}',
    '.we-bubble.assistant{background:#fff;border:1px solid rgba(20,17,13,.12);color:#14110d;border-bottom-left-radius:6px}',
    '.we-bubble.user-self{color:#fff;border-bottom-right-radius:6px}',
    '.we-bubble.user-other{color:#fff;border-bottom-left-radius:6px}',
    '.we-bubble.system{background:rgba(20,17,13,.06);color:#74685f;font-size:12px;border-radius:12px;padding:6px 12px;text-align:center}',
    '.we-card-bubble{background:#fff;border:1px solid rgba(20,17,13,.12);border-radius:18px;border-bottom-left-radius:6px;overflow:hidden;width:100%}',
    '.we-card-intro{padding:12px 14px 8px;font-size:14px;font-weight:600;color:#14110d;line-height:1.4;border-bottom:1px solid rgba(20,17,13,.06)}',
    '.we-card-section-label{padding:8px 14px 4px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#888}',
    '.we-card-item{display:flex;align-items:flex-start;gap:10px;padding:9px 14px;border-bottom:1px solid rgba(20,17,13,.05)}',
    '.we-card-item:last-of-type{border-bottom:none}',
    '.we-card-emoji{font-size:20px;flex-shrink:0;width:28px;text-align:center;margin-top:1px}',
    '.we-card-info{flex:1;min-width:0}',
    '.we-card-name{font-size:14px;font-weight:700;color:#14110d}',
    '.we-card-desc{font-size:12px;color:#74685f;margin-top:1px;line-height:1.35}',
    '.we-card-price{font-size:11px;color:#0b8f86;font-weight:700;margin-top:2px}',
    '.we-card-add{background:#f5f0e8;border:1px solid rgba(20,17,13,.18);color:#14110d;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;flex-shrink:0;margin-top:2px}',
    '.we-card-add:active,.we-card-add.added{background:#0b8f86;color:#fff;border-color:#0b8f86}',
    '.we-card-wine-note{padding:8px 14px;font-size:12px;color:#6c3483;font-weight:600;background:rgba(108,52,131,.05);border-top:1px solid rgba(108,52,131,.1)}',
    '.we-card-outro{padding:8px 14px;font-size:12px;color:#888}',
    '.we-card-cta{padding:10px 14px 12px}',
    '.we-card-cta-btn{width:100%;padding:10px 0;background:#14110d;color:#fff;border:0;border-radius:999px;font-size:13px;font-weight:800;cursor:pointer}',
    '.we-msg-meta{font-size:10px;opacity:.55;margin-top:4px;padding:0 4px}',
    '.we-typing{font-size:13px;opacity:.55;font-style:italic;padding:6px 14px;align-self:flex-start}',
    '.we-chat-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid rgba(20,17,13,.12);padding:10px 12px;display:flex;gap:8px;max-width:640px;margin:0 auto;z-index:20}',
    '.we-chat-bar input{flex:1;border:1px solid rgba(20,17,13,.18);border-radius:999px;padding:10px 14px;font-size:14px;background:#f5f0e8;color:#14110d}',
    '.we-chat-bar button{background:#14110d;color:#fff;border:0;border-radius:999px;padding:0 18px;font-weight:800;font-size:14px;cursor:pointer;height:42px}',
    '.we-chat-bar button:disabled{opacity:.45;cursor:not-allowed}',
    '@media(max-width:640px){.we-msg-wrap{max-width:92%}.we-chat-bar{border-radius:0}}'
  ].join('');

  var js = [
    'var ROOM_ID='+JSON.stringify(roomId)+';',
    'var SHARE_URL='+JSON.stringify(rawShareUrl)+';',
    'var INITIAL_MSGS='+messagesJson+';',
    'var COLORS=["#0b8f86","#c0392b","#6c3483","#b7600a","#1a5276"];',
    'var seenIds={};var colorMap={};',
    'var myParticipantId="";var myColor="";var myName="";var myPlayerNum=0;',
    'var isSending=false;var hasJoined=false;',
    'var cartItems=[];var pendingOrderId=null;var pendingOrderItem=null;',
    'var LSKEY="we-room-"+ROOM_ID;',
    'function loadIdentity(){try{var s=localStorage.getItem(LSKEY);if(s){var d=JSON.parse(s);myParticipantId=d.pid||"";myName=d.name||"";myColor=d.color||"";myPlayerNum=d.playerNum||0;hasJoined=!!(d.pid&&d.name);}}catch(e){}if(!myParticipantId){myParticipantId="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}}',
    'function saveIdentity(){try{localStorage.setItem(LSKEY,JSON.stringify({pid:myParticipantId,name:myName,color:myColor,playerNum:myPlayerNum}));}catch(e){}}',
    'function getColor(pid){if(!pid)return COLORS[1];if(!colorMap[pid]){colorMap[pid]=COLORS[Object.keys(colorMap).length%COLORS.length];}return colorMap[pid];}',
    'function showOnboarding(){var o=document.getElementById("we-onboard");if(o)o.classList.remove("hidden");var i=document.getElementById("onboard-name");if(i)setTimeout(function(){i.focus();},300);}',
    'function hideOnboarding(){var o=document.getElementById("we-onboard");if(o)o.classList.add("hidden");}',
    'async function submitOnboarding(){var inp=document.getElementById("onboard-name");var name=inp?inp.value.trim():"";if(!name){inp&&inp.focus();return;}var btn=document.getElementById("onboard-btn");if(btn){btn.disabled=true;btn.textContent="Joining...";}try{var r=await fetch("/api/chat/room/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,participant_id:myParticipantId,display_name:name})});var d=await r.json();if(d.ok){myName=d.display_name;myColor=d.color;myPlayerNum=d.player_number;hasJoined=true;saveIdentity();colorMap[myParticipantId]=myColor;hideOnboarding();updatePlayerBar(d.participants||[]);poll();}else if(btn){btn.disabled=false;btn.textContent="Join Room";}}catch(e){if(btn){btn.disabled=false;btn.textContent="Join Room";}}}',
    'function updatePlayerBar(participants){var bar=document.getElementById("player-bar");if(!bar)return;bar.innerHTML="";(participants||[]).forEach(function(p){var chip=document.createElement("div");chip.className="we-player-chip"+(p.participant_id===myParticipantId?" me":"");var dot=document.createElement("div");dot.className="we-player-chip-dot";dot.style.background=p.color||(COLORS[(p.player_number-1)%COLORS.length]);colorMap[p.participant_id]=p.color;var label=document.createElement("span");label.textContent="P"+p.player_number+" "+p.display_name+(p.participant_id===myParticipantId?" (you)":"");chip.appendChild(dot);chip.appendChild(label);bar.appendChild(chip);});}',
    // Cart
    'function updateCartBadge(){var badge=document.getElementById("cart-badge");var myItems=cartItems.filter(function(i){return i.participant_id===myParticipantId;});if(badge)badge.textContent=cartItems.length>0?String(cartItems.length):"";badge&&(badge.style.display=cartItems.length>0?"block":"none");}',
    'function renderCart(){var panel=document.getElementById("cart-panel");if(!panel)return;var inner=panel.querySelector(".we-panel-inner")||(function(){var d=document.createElement("div");d.className="we-panel-inner";panel.appendChild(d);return d;})();inner.innerHTML="";if(cartItems.length===0){var empty=document.createElement("div");empty.className="we-cart-empty";empty.textContent="No items added yet. Tap + Add on any menu item.";inner.appendChild(empty);return;}var byPlayer={};cartItems.forEach(function(item){var key=item.player_number;if(!byPlayer[key])byPlayer[key]=[];byPlayer[key].push(item);});Object.keys(byPlayer).sort().forEach(function(pn){var items=byPlayer[pn];var section=document.createElement("div");section.className="we-cart-player";var lbl=document.createElement("div");lbl.className="we-cart-player-label";var dot=document.createElement("div");dot.className="we-cart-player-dot";dot.style.background=COLORS[(parseInt(pn)-1)%COLORS.length];lbl.appendChild(dot);var lspan=document.createElement("span");lspan.textContent="Player "+pn+(items[0]?" "+items[0].player_name:"");lbl.appendChild(lspan);section.appendChild(lbl);items.forEach(function(item){var row=document.createElement("div");row.className="we-cart-item";var em=document.createElement("div");em.className="we-cart-item-emoji";em.textContent=item.item_emoji||"•";var info=document.createElement("div");info.className="we-cart-item-name";info.textContent=item.item_name;var rmv=document.createElement("button");rmv.className="we-cart-remove";rmv.textContent="\u00d7";rmv.setAttribute("data-id",item.id);rmv.addEventListener("click",function(){removeCartItem(item.id);});if(item.item_notes){var note=document.createElement("div");note.className="we-cart-item-note";note.textContent=item.item_notes;info.appendChild(note);}row.appendChild(em);row.appendChild(info);row.appendChild(rmv);section.appendChild(row);});inner.appendChild(section);});var sendBtn=document.createElement("button");sendBtn.className="we-cart-send";sendBtn.textContent="\uD83D\uDCCB Send Order as Reservation Request";sendBtn.addEventListener("click",function(){document.getElementById("cart-panel").classList.remove("visible");document.getElementById("lead-panel").classList.add("visible");});inner.appendChild(sendBtn);}',
    'async function removeCartItem(orderId){try{await fetch("/api/chat/room/order/remove",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({order_id:orderId})});cartItems=cartItems.filter(function(i){return i.id!==orderId;});updateCartBadge();renderCart();}catch(e){}}',
    'async function addToOrder(itemName,itemEmoji,itemCategory){if(!hasJoined)return;try{var r=await fetch("/api/chat/room/order/add",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,participant_id:myParticipantId,player_name:myName,player_number:myPlayerNum,item_name:itemName,item_emoji:itemEmoji,item_category:itemCategory||""})});var d=await r.json();if(d.ok){cartItems.push({id:d.order_id,room_id:ROOM_ID,participant_id:myParticipantId,player_name:myName,player_number:myPlayerNum,item_name:itemName,item_emoji:itemEmoji,item_notes:""});updateCartBadge();renderCart();pendingOrderId=d.order_id;pendingOrderItem={name:itemName,emoji:itemEmoji};if(d.follow_up&&d.follow_up.question){showFollowUp(d.follow_up,d.order_id);}}}catch(e){}}',
    'function showFollowUp(followUp,orderId){var modal=document.getElementById("we-followup");if(!modal)return;modal.classList.remove("hidden");var title=modal.querySelector(".we-followup-title");if(title)title.textContent=followUp.question;var opts=modal.querySelector(".we-followup-opts");if(!opts)return;opts.innerHTML="";(followUp.options||[]).forEach(function(opt){var btn=document.createElement("button");btn.className="we-followup-opt";btn.textContent=opt;btn.addEventListener("click",function(){saveFollowUpNote(orderId,opt);hideFollowUp();});opts.appendChild(btn);});}',
    'async function saveFollowUpNote(orderId,note){try{await fetch("/api/chat/room/order/note",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({order_id:orderId,note:note})});var item=cartItems.find(function(i){return i.id===orderId;});if(item)item.item_notes=note;renderCart();}catch(e){}}',
    'function hideFollowUp(){var modal=document.getElementById("we-followup");if(modal)modal.classList.add("hidden");}',
    // Card renderer with Add buttons
    'function renderCardBubble(cards,ts,msgId){',
    '  if(msgId&&seenIds[msgId])return;if(msgId)seenIds[msgId]=true;',
    '  var log=document.getElementById("msg-log");if(!log)return;',
    '  var wrap=document.createElement("div");wrap.className="we-msg-wrap assistant";',
    '  var card=document.createElement("div");card.className="we-card-bubble";',
    '  if(cards.intro){var intro=document.createElement("div");intro.className="we-card-intro";intro.textContent=cards.intro;card.appendChild(intro);}',
    '  function addSection(label,items){',
    '    if(label){var lbl=document.createElement("div");lbl.className="we-card-section-label";lbl.textContent=label;card.appendChild(lbl);}',
    '    (items||[]).forEach(function(item){',
    '      var row=document.createElement("div");row.className="we-card-item";',
    '      var em=document.createElement("div");em.className="we-card-emoji";em.textContent=item.emoji||"•";',
    '      var info=document.createElement("div");info.className="we-card-info";',
    '      var nm=document.createElement("div");nm.className="we-card-name";nm.textContent=item.name||"";info.appendChild(nm);',
    '      if(item.desc){var ds=document.createElement("div");ds.className="we-card-desc";ds.textContent=item.desc;info.appendChild(ds);}',
    '      if(item.price){var pr=document.createElement("div");pr.className="we-card-price";pr.textContent=item.price;info.appendChild(pr);}',
    '      var addBtn=document.createElement("button");addBtn.className="we-card-add";addBtn.textContent="+ Add";',
    '      (function(itemName,itemEmoji){addBtn.addEventListener("click",function(){addBtn.textContent="\u2713 Added";addBtn.classList.add("added");addBtn.disabled=true;addToOrder(itemName,itemEmoji,"");});})(item.name||"",item.emoji||"•");',
    '      info.appendChild(addBtn);',
    '      row.appendChild(em);row.appendChild(info);card.appendChild(row);',
    '    });',
    '  }',
    '  if(cards.section1_label||cards.section1_cards)addSection(cards.section1_label||"",cards.section1_cards||[]);',
    '  else addSection("",cards.cards||[]);',
    '  if(cards.section2_label||cards.section2_cards)addSection(cards.section2_label||"",cards.section2_cards||[]);',
    '  if(cards.wine_note){var wn=document.createElement("div");wn.className="we-card-wine-note";wn.textContent="\uD83C\uDF77 "+cards.wine_note;card.appendChild(wn);}',
    '  if(cards.outro){var ot=document.createElement("div");ot.className="we-card-outro";ot.textContent=cards.outro;card.appendChild(ot);}',
    '  if(cards.cta_label){var ctaDiv=document.createElement("div");ctaDiv.className="we-card-cta";var ctaBtn=document.createElement("button");ctaBtn.className="we-card-cta-btn";ctaBtn.textContent=cards.cta_label;ctaBtn.addEventListener("click",function(){if(cards.cta_action==="reserve"){var p=document.getElementById("lead-panel");if(p){p.classList.add("visible");p.scrollIntoView({behavior:"smooth",block:"nearest"}); }}});ctaDiv.appendChild(ctaBtn);card.appendChild(ctaDiv);}',
    '  var meta=document.createElement("div");meta.className="we-msg-meta";',
    '  var timeStr="";if(ts){try{timeStr=new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});}catch(e){}}',
    '  meta.textContent="Waters Edge"+(timeStr?" \xb7 "+timeStr:"");',
    '  wrap.appendChild(card);wrap.appendChild(meta);',
    '  var typing=document.getElementById("typing-indicator");',
    '  if(typing)log.insertBefore(wrap,typing);else log.appendChild(wrap);',
    '  log.scrollTop=log.scrollHeight;',
    '}',
    'function addMsg(role,name,text,ts,pid,msgId,clientId){var key=msgId||(clientId?("c:"+clientId):null)||(role+":"+String(ts).slice(0,19)+":"+text.slice(0,20));if(seenIds[key])return;seenIds[key]=true;if(msgId)seenIds[msgId]=true;if(clientId)seenIds["c:"+clientId]=true;var log=document.getElementById("msg-log");if(!log)return;var isAssistant=(role==="assistant"),isSystem=(role==="system");var isSelf=(pid===myParticipantId&&!isAssistant&&!isSystem);var wrapClass=isSystem?"system":isAssistant?"assistant":isSelf?"user-self":"user-other";var wrap=document.createElement("div");wrap.className="we-msg-wrap "+wrapClass;var bubble=document.createElement("div");bubble.className="we-bubble "+wrapClass;if(!isAssistant&&!isSystem)bubble.style.background=isSelf?myColor:getColor(pid);bubble.textContent=text;var meta=document.createElement("div");meta.className="we-msg-meta";var timeStr="";if(ts){try{timeStr=new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});}catch(e){}}if(!isSystem)meta.textContent=(isAssistant?"Waters Edge":name||role)+(timeStr?" \xb7 "+timeStr:"");wrap.appendChild(bubble);if(!isSystem)wrap.appendChild(meta);var typing=document.getElementById("typing-indicator");if(typing)log.insertBefore(wrap,typing);else log.appendChild(wrap);log.scrollTop=log.scrollHeight;}',
    'function addTyping(){removeTyping();var log=document.getElementById("msg-log");var el=document.createElement("div");el.className="we-typing";el.id="typing-indicator";el.textContent="Waters Edge is thinking...";log.appendChild(el);log.scrollTop=log.scrollHeight;}',
    'function removeTyping(){var el=document.getElementById("typing-indicator");if(el&&el.parentNode)el.parentNode.removeChild(el);}',
    'function parseMsg(m){var pid="";var clientId="";try{if(m.metadata_json){var md=JSON.parse(m.metadata_json);pid=md.participant_id||"";clientId=md.client_message_id||"";}}catch(e){}return{pid:pid,clientId:clientId};}',
    'function renderMessages(msgs){(msgs||[]).forEach(function(m){var pm=parseMsg(m);if(pm.pid&&pm.pid!==myParticipantId&&!colorMap[pm.pid])getColor(pm.pid);addMsg(m.role||"user",m.name||m.role,m.message||"",m.created_at,pm.pid,m.id,pm.clientId);});}',
    'function poll(){if(isSending||!hasJoined)return;fetch("/api/chat/room/messages?id="+encodeURIComponent(ROOM_ID)).then(function(r){return r.json();}).then(function(d){if(d.ok&&d.messages)renderMessages(d.messages);fetch("/api/chat/room/participants?id="+encodeURIComponent(ROOM_ID)).then(function(r2){return r2.json();}).then(function(d2){if(d2.ok&&d2.participants)updatePlayerBar(d2.participants);}).catch(function(){});}).catch(function(){});}',
    'function setSending(v){isSending=v;var btn=document.getElementById("chat-send");var inp=document.getElementById("chat-input");if(btn)btn.disabled=v;if(inp)inp.disabled=v;}',
    'async function sendMessage(){if(isSending||!hasJoined)return;var input=document.getElementById("chat-input");var text=String(input.value||"").trim();if(!text)return;input.value="";var clientId="cm"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);seenIds["c:"+clientId]=true;addMsg("user",myName,text,new Date().toISOString(),myParticipantId,null,clientId);setSending(true);addTyping();var replied=false;try{await fetch("/api/chat/room/message",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,name:myName,color:myColor,participant_id:myParticipantId,client_message_id:clientId,message:text})});var ar=await fetch("/api/chat/room/assistant",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,message:text})});var ad=await ar.json();removeTyping();if(ad.ok){replied=true;if(ad.message_id)seenIds[ad.message_id]=true;if(ad.reply_cards&&(ad.reply_cards.cards||ad.reply_cards.intro)){renderCardBubble(ad.reply_cards,new Date().toISOString(),ad.message_id);}else if(ad.reply){addMsg("assistant","Waters Edge",ad.reply,new Date().toISOString(),"",ad.message_id,null);}}}catch(e){removeTyping();if(!replied)addMsg("assistant","Waters Edge","I had trouble connecting. Try again.",new Date().toISOString(),"","err-"+Date.now(),null);}finally{setSending(false);}}',
    // Event listeners
    'document.getElementById("onboard-btn").addEventListener("click",submitOnboarding);',
    'document.getElementById("onboard-name").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();submitOnboarding();}});',
    'document.getElementById("invite-bar-copy").addEventListener("click",function(){var btn=document.getElementById("invite-bar-copy");if(navigator.clipboard){navigator.clipboard.writeText(SHARE_URL).then(function(){btn.textContent="Copied!";setTimeout(function(){btn.textContent="Copy Link";},2000);});}});',
    'document.getElementById("btn-cart").addEventListener("click",function(){var p=document.getElementById("cart-panel");if(p){renderCart();p.classList.toggle("visible");}});',
    'document.getElementById("btn-reserve").addEventListener("click",function(){document.getElementById("lead-panel").classList.toggle("visible");});',
    'document.getElementById("btn-invite").addEventListener("click",function(){document.getElementById("invite-panel").classList.toggle("visible");});',
    'document.getElementById("copy-btn").addEventListener("click",function(){var btn=document.getElementById("copy-btn");if(navigator.clipboard){navigator.clipboard.writeText(SHARE_URL).then(function(){btn.textContent="Copied!";setTimeout(function(){btn.textContent="Copy Invite Link";},2000);});}});',
    'document.getElementById("followup-skip").addEventListener("click",hideFollowUp);',
    'document.getElementById("lead-submit").addEventListener("click",async function(){var name=document.getElementById("lead-name").value.trim()||myName;var email=document.getElementById("lead-email").value.trim();var phone=document.getElementById("lead-phone").value.trim();var psize=document.getElementById("lead-party").value.trim();var pdate=document.getElementById("lead-date").value.trim();var ptime=document.getElementById("lead-time").value.trim();var occ=document.getElementById("lead-occasion").value.trim();if(!occ&&cartItems.length>0){occ=cartItems.map(function(i){return i.player_name+": "+i.item_name+(i.item_notes?" ("+i.item_notes+")":"");}).join(", ");}var btn=document.getElementById("lead-submit");btn.disabled=true;btn.textContent="Sending...";try{await fetch("/api/chat/room/summary-lead",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,name:name,email:email,phone:phone,party_size:psize,preferred_date:pdate,preferred_time:ptime,occasion:occ})});document.getElementById("lead-done").style.display="block";btn.style.display="none";}catch(e){btn.disabled=false;btn.textContent="Send to Waters Edge";alert("Something went wrong.");}});',
    'document.getElementById("btn-ask").addEventListener("click",function(){document.getElementById("chat-input").focus();});',
    'document.querySelectorAll(".we-action-btn[data-q]").forEach(function(btn){btn.addEventListener("click",function(){var q=btn.getAttribute("data-q");if(q&&!isSending&&hasJoined){document.getElementById("chat-input").value=q;sendMessage();}});});',
    'document.getElementById("chat-send").addEventListener("click",sendMessage);',
    'document.getElementById("chat-input").addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}});',
    'loadIdentity();',
    'if(hasJoined){hideOnboarding();renderMessages(INITIAL_MSGS);fetch("/api/chat/room/participants?id="+encodeURIComponent(ROOM_ID)).then(function(r){return r.json();}).then(function(d){if(d.ok)updatePlayerBar(d.participants);}).catch(function(){});fetch("/api/chat/room/order?id="+encodeURIComponent(ROOM_ID)).then(function(r){return r.json();}).then(function(d){if(d.ok){cartItems=d.cart||[];updateCartBadge();}}).catch(function(){});}',
    'else{showOnboarding();renderMessages(INITIAL_MSGS);}',
    'setInterval(poll,3000);'
  ].join('\n');

  var onboardHtml =
    '<div class="we-onboard" id="we-onboard">' +
    '<div class="we-onboard-card">' +
    '<div class="we-onboard-logo">Waters Edge</div>' +
    '<div class="we-onboard-title">Welcome to your planning room</div>' +
    '<div class="we-onboard-sub">Enter your name so your friend knows who you are</div>' +
    '<input class="we-onboard-input" id="onboard-name" placeholder="Your name" type="text" maxlength="32" autocomplete="name">' +
    '<button class="we-onboard-btn" id="onboard-btn">Join Room</button>' +
    '</div></div>';

  var followUpHtml =
    '<div class="we-followup hidden" id="we-followup">' +
    '<div class="we-followup-card">' +
    '<div class="we-followup-title">How would you like it?</div>' +
    '<div class="we-followup-opts" id="followup-opts"></div>' +
    '<button class="we-followup-skip" id="followup-skip">Skip for now</button>' +
    '</div></div>';

  var cartPanelHtml =
    '<div class="we-panel" id="cart-panel">' +
    '<h3>\uD83D\uDDD2\uFE0F Your Order</h3>' +
    '<div class="we-panel-inner"></div>' +
    '</div>';

  var leadFormHtml =
    '<div class="we-panel" id="lead-panel">' +
    '<h3>Build Reservation Request</h3>' +
    '<input class="we-lead-field" id="lead-name" placeholder="Your name" type="text">' +
    '<div class="we-lead-row">' +
    '<input class="we-lead-field" id="lead-email" placeholder="Email" type="email">' +
    '<input class="we-lead-field" id="lead-phone" placeholder="Phone" type="tel">' +
    '</div>' +
    '<div class="we-lead-row">' +
    '<input class="we-lead-field" id="lead-party" placeholder="Party size" type="number" min="1" max="50">' +
    '<input class="we-lead-field" id="lead-date" placeholder="Preferred date" type="date">' +
    '</div>' +
    '<div class="we-lead-row">' +
    '<input class="we-lead-field" id="lead-time" placeholder="Preferred time" type="time">' +
    '<input class="we-lead-field" id="lead-occasion" placeholder="Occasion / notes" type="text">' +
    '</div>' +
    '<button class="we-lead-submit" id="lead-submit">Send to Waters Edge</button>' +
    '<div class="we-lead-done" id="lead-done">Sent! The team will follow up soon.</div>' +
    '</div>';

  var invitePanelHtml =
    '<div class="we-panel" id="invite-panel">' +
    '<h3>Invite a Friend</h3>' +
    '<div class="we-panel-url">' + shareUrl + '</div>' +
    '<button class="we-btn-copy" id="copy-btn">Copy Invite Link</button>' +
    '</div>';

  var html =
    '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Waters Edge - ' + title + '</title>' +
    '<style>' + css + '</style>' +
    '</head><body>' +
    onboardHtml +
    followUpHtml +
    '<div class="we-room-header">' +
    '<div class="we-room-header-left">' +
    '<div class="we-room-title">Waters Edge Planning Room</div>' +
    '<div class="we-room-sub">' + title + '</div>' +
    '</div>' +
    '<a class="we-room-back" href="/">Back to Site</a>' +
    '</div>' +
    '<div class="we-player-bar" id="player-bar"></div>' +
    '<div class="we-invite-bar">' +
    '<span class="we-invite-bar-label">Share this room with a friend to plan together</span>' +
    '<button class="we-invite-bar-copy" id="invite-bar-copy">Copy Link</button>' +
    '</div>' +
    '<div class="we-room-body">' +
    '<div class="we-action-strip">' +
    '<button class="we-action-btn primary" id="btn-ask">Ask Assistant</button>' +
    '<button class="we-action-btn cart-btn" id="btn-cart">\uD83D\uDDC2\uFE0F Order<span class="we-cart-badge" id="cart-badge" style="display:none"></span></button>' +
    '<button class="we-action-btn" id="btn-reserve">Reserve</button>' +
    '<button class="we-action-btn" id="btn-invite">Invite Link</button>' +
    '<button class="we-action-btn" data-q="What wine pairs well with our meal?">Wine Pairings</button>' +
    '<button class="we-action-btn" data-q="What do you recommend for date night?">Date Night</button>' +
    '<button class="we-action-btn" data-q="What are good brunch options?">Brunch</button>' +
    '<button class="we-action-btn" data-q="What are your best seafood dishes?">Seafood</button>' +
    '<button class="we-action-btn" data-q="What steaks do you have?">Steaks</button>' +
    '</div>' +
    cartPanelHtml +
    invitePanelHtml +
    leadFormHtml +
    '<div class="we-msg-log" id="msg-log"></div>' +
    '</div>' +
    '<div class="we-chat-bar">' +
    '<input id="chat-input" autocomplete="off" placeholder="Type a message...">' +
    '<button id="chat-send">Send</button>' +
    '</div>' +
    '<script>' + js + '<\/script>' +
    '</body></html>';

  return h(html, 200);
}

export function renderChatRoomNotFound() {
  var html =
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Room Not Found</title>' +
    '<style>body{font-family:Inter,system-ui,sans-serif;background:#f5f0e8;color:#14110d;min-height:100vh;display:grid;place-items:center;padding:24px}.card{max-width:420px;background:#fff;border:1px solid rgba(20,17,13,.12);border-radius:24px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.08)}h1{font-size:22px;margin-bottom:8px}p{color:#74685f;line-height:1.55;margin-bottom:18px;font-size:14px}a{display:inline-flex;background:#14110d;color:#fff;border-radius:999px;padding:10px 18px;text-decoration:none;font-weight:800;font-size:13px}</style>' +
    '</head><body><div class="card"><h1>Planning room not found</h1><p>This invite link may be expired or incorrect.</p><a href="/">Back to Waters Edge</a></div></body></html>';
  return h(html, 404);
}
