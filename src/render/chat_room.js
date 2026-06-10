// src/render/chat_room.js - watersedge-demo-feature-lab
// Phase 2: participant colors, dedup, bullet rendering, expanded reservation form.
import { h, esc } from '../utils.js';

export function renderChatRoom(roomId, initialData) {
  var title = (initialData && initialData.title) ? esc(initialData.title) : 'Planning Room';
  var rawShareUrl = 'https://watersedge-demo-feature-lab.jaredtechfit.workers.dev/chat-room?id=' + roomId;
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
    '.we-name-input{border:1px solid rgba(20,17,13,.18);border-radius:999px;padding:6px 12px;font-size:13px;background:#f5f0e8;color:#14110d;width:140px}',
    '.we-name-save{background:#14110d;color:#fff;border:0;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer}',
    '.we-name-saved{font-size:12px;color:#0b8f86;font-weight:700;display:none}',
    '.we-invite-bar{background:#14110d;color:#fff;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px}',
    '.we-invite-bar-label{font-size:12px;opacity:.8}',
    '.we-invite-bar-copy{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer}',
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
    '.we-lead-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:0}',
    '.we-lead-submit{background:#0b8f86;color:#fff;border:0;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;width:100%;margin-top:4px}',
    '.we-lead-done{font-size:13px;color:#0b8f86;font-weight:700;text-align:center;padding:8px;display:none}',
    '.we-btn-copy{background:#14110d;color:#fff;border:0;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer}',
    '.we-msg-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f5f0e8;min-height:240px}',
    '.we-msg-wrap{display:flex;flex-direction:column;max-width:85%}',
    '.we-msg-wrap.user-self{align-self:flex-end;align-items:flex-end}',
    '.we-msg-wrap.user-other{align-self:flex-start;align-items:flex-start}',
    '.we-msg-wrap.assistant{align-self:flex-start;align-items:flex-start;max-width:92%}',
    '.we-bubble{border-radius:18px;padding:10px 13px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}',
    '.we-bubble.assistant{background:#fff;border:1px solid rgba(20,17,13,.14);color:#14110d;border-bottom-left-radius:6px}',
    '.we-bubble.user-self{color:#fff;border-bottom-right-radius:6px}',
    '.we-bubble.user-other{color:#fff;border-bottom-left-radius:6px}',
    '.we-msg-meta{font-size:10px;opacity:.55;margin-top:3px;padding:0 4px}',
    '.we-typing{font-size:13px;opacity:.55;font-style:italic;padding:6px 14px;align-self:flex-start}',
    '.we-chat-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid rgba(20,17,13,.12);padding:10px 12px;display:flex;gap:8px;max-width:640px;margin:0 auto;z-index:20}',
    '.we-chat-bar input{flex:1;border:1px solid rgba(20,17,13,.18);border-radius:999px;padding:10px 14px;font-size:14px;background:#f5f0e8;color:#14110d}',
    '.we-chat-bar button{background:#14110d;color:#fff;border:0;border-radius:999px;padding:0 18px;font-weight:800;font-size:14px;cursor:pointer;height:42px}',
    '@media(max-width:640px){.we-msg-wrap{max-width:90%}.we-chat-bar{left:0;right:0;border-radius:0}}'
  ].join('');

  var js = [
    'var ROOM_ID=' + JSON.stringify(roomId) + ';',
    'var SHARE_URL=' + JSON.stringify(rawShareUrl) + ';',
    'var INITIAL_MSGS=' + messagesJson + ';',
    'var COLORS=["#0b8f86","#c0392b","#6c3483","#b7600a","#1a5276"];',
    'var seenIds={};',
    'var clientMsgIds={};',
    'var colorMap={};',
    'var colorIdx=0;',
    'var myParticipantId="";',
    'var myColor="";',
    'var myName="Guest";',
    'var LSKEY="we-room-"+ROOM_ID;',
    'function loadIdentity(){',
    '  try{var s=localStorage.getItem(LSKEY);if(s){var d=JSON.parse(s);myParticipantId=d.pid||myParticipantId;myName=d.name||myName;myColor=d.color||myColor;}}catch(e){}',
    '  if(!myParticipantId){myParticipantId="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}',
    '  if(!myColor){myColor=COLORS[colorIdx%COLORS.length];colorIdx++;}',
    '  saveIdentity();',
    '  colorMap[myParticipantId]=myColor;',
    '  document.getElementById("name-dot").style.background=myColor;',
    '  document.getElementById("name-input").value=myName;',
    '}',
    'function saveIdentity(){try{localStorage.setItem(LSKEY,JSON.stringify({pid:myParticipantId,name:myName,color:myColor}));}catch(e){}}',
    'function getColor(pid,fallback){',
    '  if(!pid)return fallback||COLORS[0];',
    '  if(!colorMap[pid]){colorMap[pid]=COLORS[Object.keys(colorMap).length%COLORS.length];}',
    '  return colorMap[pid];',
    '}',
    'function addMsg(role,name,text,ts,pid,msgId,clientId){',
    '  var key=msgId||(clientId?("c:"+clientId):null)||(ts+":"+role+":"+text.slice(0,30));',
    '  if(seenIds[key])return;',
    '  seenIds[key]=true;',
    '  if(msgId)seenIds[msgId]=true;',
    '  if(clientId)seenIds["c:"+clientId]=true;',
    '  var log=document.getElementById("msg-log");',
    '  if(!log)return;',
    '  var isAssistant=(role==="assistant");',
    '  var isSelf=(pid===myParticipantId&&!isAssistant);',
    '  var wrapClass=isAssistant?"assistant":(isSelf?"user-self":"user-other");',
    '  var bubbleClass=isAssistant?"assistant":(isSelf?"user-self":"user-other");',
    '  var wrap=document.createElement("div");',
    '  wrap.className="we-msg-wrap "+wrapClass;',
    '  var bubble=document.createElement("div");',
    '  bubble.className="we-bubble "+bubbleClass;',
    '  if(!isAssistant){var col=isSelf?myColor:getColor(pid,COLORS[1]);bubble.style.background=col;}',
    '  bubble.textContent=text;',
    '  var meta=document.createElement("div");',
    '  meta.className="we-msg-meta";',
    '  var timeStr="";',
    '  if(ts){try{timeStr=new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});}catch(e){}}',
    '  meta.textContent=(name||role)+(timeStr?" \xb7 "+timeStr:"");',
    '  wrap.appendChild(bubble);',
    '  wrap.appendChild(meta);',
    '  var typing=document.getElementById("typing-indicator");',
    '  if(typing)log.insertBefore(wrap,typing);else log.appendChild(wrap);',
    '  log.scrollTop=log.scrollHeight;',
    '}',
    'function addTyping(){removeTyping();var log=document.getElementById("msg-log");var el=document.createElement("div");el.className="we-typing";el.id="typing-indicator";el.textContent="Waters Edge is typing...";log.appendChild(el);log.scrollTop=log.scrollHeight;}',
    'function removeTyping(){var el=document.getElementById("typing-indicator");if(el&&el.parentNode)el.parentNode.removeChild(el);}',
    'function parseMsg(m){var pid="";var clientId="";try{if(m.metadata_json){var md=JSON.parse(m.metadata_json);pid=md.participant_id||"";clientId=md.client_message_id||"";}}catch(e){}return{pid:pid,clientId:clientId};}',
    'function renderMessages(msgs){',
    '  (msgs||[]).forEach(function(m){',
    '    var pm=parseMsg(m);',
    '    var pid=pm.pid;',
    '    var clientId=pm.clientId;',
    '    if(pid&&pid!==myParticipantId&&!colorMap[pid])getColor(pid);',
    '    addMsg(m.role||"user",m.name||m.role,m.message||"",m.created_at,pid,m.id,clientId);',
    '  });',
    '}',
    'function poll(){fetch("/api/chat/room/messages?id="+encodeURIComponent(ROOM_ID)).then(function(r){return r.json();}).then(function(d){if(d.ok&&d.messages)renderMessages(d.messages);}).catch(function(){});}',
    'async function sendMessage(){',
    '  var input=document.getElementById("chat-input");',
    '  var text=String(input.value||"").trim();',
    '  if(!text)return;',
    '  input.value="";',
    '  var clientId="cm"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);',
    '  seenIds["c:"+clientId]=true;',
    '  addMsg("user",myName,text,new Date().toISOString(),myParticipantId,null,clientId);',
    '  addTyping();',
    '  try{',
    '    await fetch("/api/chat/room/message",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,name:myName,color:myColor,participant_id:myParticipantId,client_message_id:clientId,message:text})});',
    '    var ar=await fetch("/api/chat/room/assistant",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,message:text})});',
    '    var ad=await ar.json();',
    '    removeTyping();',
    '    if(ad.ok&&ad.reply){if(ad.message_id)seenIds[ad.message_id]=true;addMsg("assistant","Waters Edge",ad.reply,new Date().toISOString(),"",ad.message_id,null);}',
    '  }catch(e){removeTyping();addMsg("assistant","Waters Edge","Sorry, something went wrong. Please try again.",new Date().toISOString(),"",null,null);}',
    '}',
    'document.getElementById("name-save").addEventListener("click",function(){',
    '  var v=document.getElementById("name-input").value.trim();',
    '  if(v){myName=v;saveIdentity();var ok=document.getElementById("name-saved");ok.style.display="inline";setTimeout(function(){ok.style.display="none";},1800);}',
    '});',
    'document.getElementById("invite-bar-copy").addEventListener("click",function(){',
    '  var btn=document.getElementById("invite-bar-copy");',
    '  if(navigator.clipboard){navigator.clipboard.writeText(SHARE_URL).then(function(){btn.textContent="Copied!";setTimeout(function(){btn.textContent="Copy Link";},2000);});}',
    '});',
    'document.getElementById("btn-reserve").addEventListener("click",function(){',
    '  var p=document.getElementById("lead-panel");if(p)p.classList.toggle("visible");',
    '});',
    'document.getElementById("btn-invite").addEventListener("click",function(){',
    '  var p=document.getElementById("invite-panel");if(p)p.classList.toggle("visible");',
    '});',
    'document.getElementById("copy-btn").addEventListener("click",function(){',
    '  var btn=document.getElementById("copy-btn");',
    '  if(navigator.clipboard){navigator.clipboard.writeText(SHARE_URL).then(function(){btn.textContent="Copied!";setTimeout(function(){btn.textContent="Copy Invite Link";},2000);});}',
    '});',
    'document.getElementById("lead-submit").addEventListener("click",async function(){',
    '  var name=document.getElementById("lead-name").value.trim()||myName;',
    '  var email=document.getElementById("lead-email").value.trim();',
    '  var phone=document.getElementById("lead-phone").value.trim();',
    '  var psize=document.getElementById("lead-party").value.trim();',
    '  var pdate=document.getElementById("lead-date").value.trim();',
    '  var ptime=document.getElementById("lead-time").value.trim();',
    '  var occ=document.getElementById("lead-occasion").value.trim();',
    '  var btn=document.getElementById("lead-submit");',
    '  btn.disabled=true;btn.textContent="Sending...";',
    '  try{',
    '    await fetch("/api/chat/room/summary-lead",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room_id:ROOM_ID,name:name,email:email,phone:phone,party_size:psize,preferred_date:pdate,preferred_time:ptime,occasion:occ})});',
    '    document.getElementById("lead-done").style.display="block";',
    '    btn.style.display="none";',
    '  }catch(e){btn.disabled=false;btn.textContent="Send to Restaurant";alert("Something went wrong. Please try again.");}',
    '});',
    'document.getElementById("btn-ask").addEventListener("click",function(){document.getElementById("chat-input").focus();});',
    'document.querySelectorAll(".we-action-btn[data-q]").forEach(function(btn){btn.addEventListener("click",function(){var q=btn.getAttribute("data-q");if(q){document.getElementById("chat-input").value=q;sendMessage();}});});',
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
    '<!DOCTYPE html>' +
    '<html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
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
    '<input class="we-name-input" id="name-input" placeholder="Your name" type="text">' +
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
    '<button class="we-action-btn" data-q="What do you recommend for date night?">Date Night</button>' +
    '<button class="we-action-btn" data-q="What are good brunch options?">Brunch</button>' +
    '<button class="we-action-btn" data-q="What are your best seafood dishes?">Seafood</button>' +
    '<button class="we-action-btn" data-q="I am interested in a private event inquiry.">Private Event</button>' +
    '</div>' +
    invitePanelHtml +
    leadFormHtml +
    '<div class="we-msg-log" id="msg-log"></div>' +
    '</div>' +
    '<div class="we-chat-bar">' +
    '<input id="chat-input" autocomplete="off" placeholder="Type a message...">' +
    '<button id="chat-send">Send</button>' +
    '</div>' +
    '<script>' + js + '</scr' + 'ipt>' +
    '</body></html>';

  return h(html, 200);
}

export function renderChatRoomNotFound() {
  var html =
    '<!DOCTYPE html>' +
    '<html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Room Not Found - Waters Edge</title>' +
    '<style>body{font-family:Inter,system-ui,sans-serif;background:#f5f0e8;color:#14110d;min-height:100vh;display:grid;place-items:center;padding:24px}.card{max-width:420px;background:#fff;border:1px solid rgba(20,17,13,.12);border-radius:24px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.08)}h1{font-size:22px;margin-bottom:8px}p{color:#74685f;line-height:1.55;margin-bottom:18px;font-size:14px}a{display:inline-flex;background:#14110d;color:#fff;border-radius:999px;padding:10px 18px;text-decoration:none;font-weight:800;font-size:13px}</style>' +
    '</head><body><div class="card">' +
    '<h1>Planning room not found</h1>' +
    '<p>This invite link may be expired or incorrect. Return to the Waters Edge site and start a new Chat / Reserve room.</p>' +
    '<a href="/">Back to Waters Edge</a>' +
    '</div></body></html>';
  return h(html, 404);
}
