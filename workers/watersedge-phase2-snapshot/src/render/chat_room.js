// src/render/chat_room.js - watersedge-phase2-snapshot
// Phase 4: Card-based assistant responses with emoji, item names, descriptions, inline CTA.
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
    '.we-identity-bar{background:#fff;border-bottom:1px solid rgba(20,17,13,.1);padding:10px 14px;display:flex;align-items:center;gap:10px}',
    '.we-color-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;border:2px solid rgba(0,0,0,.1)}',
    '.we-name-input{border:1px solid rgba(20,17,13,.18);border-radius:999px;padding:6px 12px;font-size:13px;background:#f5f0e8;color:#14110d;flex:1;min-width:0}',
    '.we-name-save{background:#14110d;color:#fff;border:0;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}',
    '.we-name-saved{font-size:12px;color:#0b8f86;font-weight:700;display:none}',
    '.we-invite-bar{background:#14110d;color:#fff;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px}',
    '.we-invite-bar-label{font-size:12px;opacity:.8;flex:1;min-width:0}',
    '.we-invite-bar-copy{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}',
    '.we-room-body{flex:1;display:flex;flex-direction:column;max-width:640px;width:100%;margin:0 auto;padding:0 0 84px}',
    '.we-action-strip{display:flex;gap:7px;overflow-x:auto;padding:10px 12px;border-bottom:1px solid rgba(20,17,13,.08);background:#fff;scrollbar-width:none}',
    '.we-action-strip::-webkit-scrollbar{display:none}',
    '.we-action-btn{border:1px solid rgba(20,17,13,.18);background:#f5f0e8;color:#14110d;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0}',
    '.we-action-btn.primary{background:#0b8f86;color:#fff;border-color:#0b8f86}',
    '.we-panel{background:#fff;border:1px solid rgba(20,17,13,.1);border-radius:16px;padding:14px;margin:10px 12px;display:none}',
    '.we-panel.visible{display:block}',
    '.we-panel h3{font-size:13px;font-weight:800;margin-bottom:10px;color:#14110d}',
    '.we-panel-url{background:#f5f0e8;border:1px solid rgba(20,17,13,.12);border-radius:8px;padding:8px 10px;font-size:12px;word-break:break-all;margin-bottom:10px;color:#555}',
    '.we-lead-field{width:100%;border:1px solid rgba(20,17,13,.18);border-radius:8px;padding:9px 11px;font-size:13px;margin-bottom:8px;background:#f5f0e8;color:#14110d}',
    '.we-lead-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.we-lead-submit{background:#0b8f86;color:#fff;border:0;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;width:100%;margin-top:4px}',
    '.we-lead-done{font-size:13px;color:#0b8f86;font-weight:700;text-align:center;padding:8px;display:none}',
    '.we-btn-copy{background:#14110d;color:#fff;border:0;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer}',
    // Message log
    '.we-msg-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:#f5f0e8;min-height:240px}',
    '.we-msg-wrap{display:flex;flex-direction:column;max-width:88%}',
    '.we-msg-wrap.user-self{align-self:flex-end;align-items:flex-end}',
    '.we-msg-wrap.user-other{align-self:flex-start;align-items:flex-start}',
    '.we-msg-wrap.assistant{align-self:flex-start;align-items:flex-start;max-width:95%}',
    // Plain bubble
    '.we-bubble{border-radius:18px;padding:10px 14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}',
    '.we-bubble.assistant{background:#fff;border:1px solid rgba(20,17,13,.12);color:#14110d;border-bottom-left-radius:6px}',
    '.we-bubble.user-self{color:#fff;border-bottom-right-radius:6px}',
    '.we-bubble.user-other{color:#fff;border-bottom-left-radius:6px}',
    // Card bubble
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
    'var seenIds={};var colorMap={};var colorIdx=0;',
    'var myParticipantId="";var myColor="";var myName="Guest";var isSending=false;',
    'var LSKEY="we-room-"+ROOM_ID;',
    'function loadIdentity(){',
    '  try{var s=localStorage.getItem(LSKEY);if(s){var d=JSON.parse(s);myParticipantId=d.pid||myParticipantId;myName=d.name||myName;myColor=d.color||myColor;}}catch(e){}',
    '  if(!myParticipantId){myParticipantId="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}',
    '  if(!myColor){myColor=COLORS[colorIdx%COLORS.length];colorIdx++;}',
    '  saveIdentity();colorMap[myParticipantId]=myColor;',
    '  document.getElementById("name-dot").style.background=myColor;',
    '  document.getElementById("name-input").value=myName==="Guest"?"":myName;',
    '}',
    'function saveIdentity(){try{localStorage.setItem(LSKEY,JSON.stringify({pid:myParticipantId,name:myName,color:myColor}));}catch(e){}}',
    'function getColor(pid){if(!pid)return COLORS[1];if(!colorMap[pid]){colorMap[pid]=COLORS[Object.keys(colorMap).length%COLORS.length];}return colorMap[pid];}',
    // Card renderer
    'function renderCardBubble(cards,ts){',
    '  var log=document.getElementById("msg-log");',
    '  if(!log)return;',
    '  var wrap=document.createElement("div");',
    '  wrap.className="we-msg-wrap assistant";',
    '  var card=document.createElement("div");',
    '  card.className="we-card-bubble";',
    '  if(cards.intro){',
    '    var intro=document.createElement("div");',
    '    intro.className="we-card-intro";',
    '    intro.textContent=cards.intro;',
    '    card.appendChild(intro);',
    '  }',
    '  function addSection(label,items){',
    '    if(label){var lbl=document.createElement("div");lbl.className="we-card-section-label";lbl.textContent=label;card.appendChild(lbl);}',
    '    (items||[]).forEach(function(item){',
    '      var row=document.createElement("div");row.className="we-card-item";',
    '      var em=document.createElement("div");em.className="we-card-emoji";em.textContent=item.emoji||"•";',
    '      var info=document.createElement("div");info.className="we-card-info";',
    '      var nm=document.createElement("div");nm.className="we-card-name";nm.textContent=item.name||"";',
    '      info.appendChild(nm);',
    '      if(item.desc){var ds=document.createElement("div");ds.className="we-card-desc";ds.textContent=item.desc;info.appendChild(ds);}',
    '      if(item.price){var pr=document.createElement("div");pr.className="we-card-price";pr.textContent=item.price;info.appendChild(pr);}',
    '      row.appendChild(em);row.appendChild(info);card.appendChild(row);',
    '    });',
    '  }',
    '  if(cards.section1_label||cards.section1_cards)addSection(cards.section1_label||"",cards.section1_cards||[]);',
    '  else addSection("",cards.cards||[]);',
    '  if(cards.section2_label||cards.section2_cards)addSection(cards.section2_label||"",cards.section2_cards||[]);',
    '  if(cards.wine_note){var wn=document.createElement("div");wn.className="we-card-wine-note";wn.textContent="\uD83C\uDF77 "+cards.wine_note;card.appendChild(wn);}',
    '  if(cards.outro){var ot=document.createElement("div");ot.className="we-card-outro";ot.textContent=cards.outro;card.appendChild(ot);}',
    '  if(cards.cta_label){',
    '    var ctaDiv=document.createElement("div");ctaDiv.className="we-card-cta";',
    '    var ctaBtn=document.createElement("button");ctaBtn.className="we-card-cta-btn";ctaBtn.textContent=cards.cta_label;',
    '    ctaBtn.addEventListener("click",function(){',
    '      if(cards.cta_action==="reserve"){',
    '        var p=document.getElementById("lead-panel");',
    '        if(p){p.classList.add("visible");p.scrollIntoView({behavior:"smooth",block:"nearest"});}',
    '      }',
    '    });',
    '    ctaDiv.appendChild(ctaBtn);card.appendChild(ctaDiv);',
    '  }',
    '  var meta=document.createElement("div");meta.className="we-msg-meta";',
    '  var timeStr="";if(ts){try{timeStr=new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});}catch(e){}}',
    '  meta.textContent="Waters Edge"+(timeStr?" \xb7 "+timeStr:"");',
    '  wrap.appendChild(card);wrap.appendChild(meta);',
    '  var typing=document.getElementById("typing-indicator");',
    '  if(typing)log.insertBefore(wrap,typing);else log.appendChild(wrap);',
    '  log.scrollTop=log.scrollHeight;',
    '}',
    // Plain bubble
    'function addMsg(role,name,text,ts,pid,msgId,clientId){',
    '  var key=msgId||(clientId?("c:"+clientId):null)||(role+":"+String(ts).slice(0,19)+":"+text.slice(0,20));',
    '  if(seenIds[key])return;',
    '  seenIds[key]=true;',
    '  if(msgId)seenIds[msgId]=true;',
    '  if(clientId)seenIds["c:"+clientId]=true;',
    '  var log=document.getElementById("msg-log");if(!log)return;',
    '  var isAssistant=(role==="assistant");',
    '  var isSelf=(pid===myParticipantId&&!isAssistant);',
    '  var wrap=document.createElement("div");',
    '  wrap.className="we-msg-wrap "+(isAssistant?"assistant":isSelf?"user-self":"user-other");',
    '  var bubble=document.createElement("div");',
    '  bubble.className="we-bubble "+(isAssistant?"assistant":isSelf?"user-self":"user-other");',
    '  if(!isAssistant)bubble.style.background=isSelf?myColor:getColor(pid);',
    '  bubble.textContent=text;',
    '  var meta=document.createElement("div");meta.className="we-msg-meta";',
    '  var timeStr="";if(ts){try{timeStr=new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});}catch(e){}}',
    '  meta.textContent=(isAssistant?"Waters Edge":name||role)+(timeStr?" \xb7 "+timeStr:"");',
    '  wrap.appendChild(bubble);wrap.appendChild(meta);',
    '  var typing=document.getElementById("typing-indicator");',
    '  if(typing)log.insertBefore(wrap,typing);else log.appendChild(wrap);',
    '  log.scrollTop=log.scrollHeight;',
    '}',
    'function addTyping(){removeTyping();var log=document.getElementById("msg-log");var el=document.createElement("div");el.className="we-typing";el.id="typing-indicator";el.textContent="Waters Edge is thinking...";log.appendChild(el);log.scrollTop=log.scrollHeight;}',
    'function removeTyping(){var el=document.getElementById("typing-indicator");if(el&&el.parentNode)el.parentNode.removeChild(el);}',
    'function parseMsg(m){var pid="";var clientId="";try{if(m.metadata_json){var md=JSON.parse(m.metadata_json);pid=md.participant_id||"";clientId=md.client_message_id||"";}}catch(e){}return{pid:pid,clientId:clientId};}',
    // On poll, plain text only (card data not in poll response, so use plain bubble)
    'function renderMessages(msgs){',
    '  (msgs||[]).forEach(function(m){',
    '    var pm=parseMsg(m);',
    '    if(pm.pid&&pm.pid!==myParticipantId&&!colorMap[pm.pid])getColor(pm.pid);',
    '    addMsg(m.role||"user",m.name||m.role,m.message||"",m.created_at,pm.pid,m.id,pm.clientId);',
    '  });',
    '}',
    'function poll(){if(isSending)return;fetch("/api/chat/room/messages?id="+encodeURIComponent(ROOM_ID)).then(function(r){return r.json();}).then(function(d){if(d.ok&&d.messages)renderMessages(d.messages);}).catch(function(){});}',
    'function setSending(v){isSending=v;var btn=document.getElementById("chat-send");var inp=document.getElementById("chat-input");if(btn)btn.disabled=v;if(inp)inp.disabled=v;}',
    'async function sendMessage(){',
    '  if(isSending)return;',
    '  var input=document.getElementById("chat-input");',
    '  var text=String(input.value||"").trim();',
    '  if(!text)return;',
    '  var ni=document.getElementById("name-input");',
    '  if(ni&&ni.value.trim()&&ni.value.trim()!==myName){myName=ni.value.trim();saveIdentity();}',
    '  input.value="";',
    '  var clientId="cm"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);',
    '  seenIds["c:"+clientId]=true;',
    '  addMsg("user",myName,text,new Date().toISOString(),myParticipantId,null,clientId);',
    '  setSending(true);addTyping();',
    '  var replied=false;',
    '  try{',
    '    await fetch("/api/chat/room/message",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,name:myName,color:myColor,participant_id:myParticipantId,client_message_id:clientId,message:text})});',
    '    var ar=await fetch("/api/chat/room/assistant",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,message:text})});',
    '    var ad=await ar.json();',
    '    removeTyping();',
    '    if(ad.ok){',
    '      replied=true;',
    '      if(ad.message_id)seenIds[ad.message_id]=true;',
    '      if(ad.reply_cards&&(ad.reply_cards.cards||ad.reply_cards.intro)){',
    '        renderCardBubble(ad.reply_cards,new Date().toISOString());',
    '      } else if(ad.reply){',
    '        addMsg("assistant","Waters Edge",ad.reply,new Date().toISOString(),"",ad.message_id,null);',
    '      }',
    '    }',
    '  }catch(e){',
    '    removeTyping();',
    '    if(!replied)addMsg("assistant","Waters Edge","I had trouble connecting. Your message was saved \u2014 try asking again.",new Date().toISOString(),"","err-"+Date.now(),null);',
    '  }finally{setSending(false);}',
    '}',
    'document.getElementById("name-save").addEventListener("click",function(){var v=document.getElementById("name-input").value.trim();if(v){myName=v;saveIdentity();var ok=document.getElementById("name-saved");ok.style.display="inline";setTimeout(function(){ok.style.display="none";},1800);}});',
    'document.getElementById("invite-bar-copy").addEventListener("click",function(){var btn=document.getElementById("invite-bar-copy");if(navigator.clipboard){navigator.clipboard.writeText(SHARE_URL).then(function(){btn.textContent="Copied!";setTimeout(function(){btn.textContent="Copy Link";},2000);});}});',
    'document.getElementById("btn-reserve").addEventListener("click",function(){document.getElementById("lead-panel").classList.toggle("visible");});',
    'document.getElementById("btn-invite").addEventListener("click",function(){document.getElementById("invite-panel").classList.toggle("visible");});',
    'document.getElementById("copy-btn").addEventListener("click",function(){var btn=document.getElementById("copy-btn");if(navigator.clipboard){navigator.clipboard.writeText(SHARE_URL).then(function(){btn.textContent="Copied!";setTimeout(function(){btn.textContent="Copy Invite Link";},2000);});}});',
    'document.getElementById("lead-submit").addEventListener("click",async function(){var name=document.getElementById("lead-name").value.trim()||myName;var email=document.getElementById("lead-email").value.trim();var phone=document.getElementById("lead-phone").value.trim();var psize=document.getElementById("lead-party").value.trim();var pdate=document.getElementById("lead-date").value.trim();var ptime=document.getElementById("lead-time").value.trim();var occ=document.getElementById("lead-occasion").value.trim();var btn=document.getElementById("lead-submit");btn.disabled=true;btn.textContent="Sending...";try{await fetch("/api/chat/room/summary-lead",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,name:name,email:email,phone:phone,party_size:psize,preferred_date:pdate,preferred_time:ptime,occasion:occ})});document.getElementById("lead-done").style.display="block";btn.style.display="none";}catch(e){btn.disabled=false;btn.textContent="Send to Waters Edge";alert("Something went wrong. Please try again.");}});',
    'document.getElementById("btn-ask").addEventListener("click",function(){document.getElementById("chat-input").focus();});',
    'document.querySelectorAll(".we-action-btn[data-q]").forEach(function(btn){btn.addEventListener("click",function(){var q=btn.getAttribute("data-q");if(q&&!isSending){document.getElementById("chat-input").value=q;sendMessage();}});});',
    'document.getElementById("chat-send").addEventListener("click",sendMessage);',
    'document.getElementById("chat-input").addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}});',
    'loadIdentity();',
    'renderMessages(INITIAL_MSGS);',
    'setInterval(poll,3000);'
  ].join('\n');

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
    '<div class="we-lead-done" id="lead-done">Sent! The team will follow up with you soon.</div>' +
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
    '<div class="we-room-header">' +
    '<div class="we-room-header-left">' +
    '<div class="we-room-title">Waters Edge Planning Room</div>' +
    '<div class="we-room-sub">' + title + '</div>' +
    '</div>' +
    '<a class="we-room-back" href="/">Back to Site</a>' +
    '</div>' +
    '<div class="we-identity-bar">' +
    '<div class="we-color-dot" id="name-dot"></div>' +
    '<input class="we-name-input" id="name-input" placeholder="Enter your name" type="text">' +
    '<button class="we-name-save" id="name-save">Set Name</button>' +
    '<span class="we-name-saved" id="name-saved">Saved</span>' +
    '</div>' +
    '<div class="we-invite-bar">' +
    '<span class="we-invite-bar-label">Planning together &mdash; share this room with a friend</span>' +
    '<button class="we-invite-bar-copy" id="invite-bar-copy">Copy Link</button>' +
    '</div>' +
    '<div class="we-room-body">' +
    '<div class="we-action-strip">' +
    '<button class="we-action-btn primary" id="btn-ask">Ask Assistant</button>' +
    '<button class="we-action-btn" id="btn-reserve">Reserve</button>' +
    '<button class="we-action-btn" id="btn-invite">Invite Link</button>' +
    '<button class="we-action-btn" data-q="What wine pairs well with our meal?">Wine Pairings</button>' +
    '<button class="we-action-btn" data-q="What do you recommend for date night?">Date Night</button>' +
    '<button class="we-action-btn" data-q="What are good brunch options?">Brunch</button>' +
    '<button class="we-action-btn" data-q="What are your best seafood dishes?">Seafood</button>' +
    '<button class="we-action-btn" data-q="What steaks do you have?">Steaks</button>' +
    '</div>' +
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
