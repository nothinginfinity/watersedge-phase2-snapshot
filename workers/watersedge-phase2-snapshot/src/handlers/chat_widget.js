// src/handlers/chat_widget.js - watersedge-phase2-snapshot
// Returns a self-contained chat widget script.
// v1.2.0: Added Invite a Friend + planning room quick-actions.
export function handleChatWidget() {
  var css = [
    '.afo-chat-panel{position:fixed;right:18px;bottom:92px;z-index:90;width:min(390px,calc(100vw - 36px));height:560px;max-height:calc(100vh - 128px);display:none;flex-direction:column;overflow:hidden;border:1px solid rgba(20,17,13,.14);border-radius:26px;background:#fffdf7;box-shadow:0 24px 80px rgba(0,0,0,.28);font-family:Inter,system-ui,sans-serif;color:#14110d}',
    '.afo-chat-panel.open{display:flex}',
    '.afo-chat-head{padding:16px 18px;background:#14110d;color:#fff;display:flex;justify-content:space-between;gap:12px;align-items:center}',
    '.afo-chat-head strong{display:block;font-size:15px}',
    '.afo-chat-head span{display:block;font-size:12px;opacity:.75;margin-top:2px}',
    '.afo-chat-close{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);color:#fff;border-radius:999px;width:32px;height:32px;cursor:pointer}',
    '.afo-chat-log{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#fff8ee}',
    '.afo-msg{max-width:88%;border-radius:18px;padding:10px 12px;font-size:14px;line-height:1.42;white-space:pre-wrap}',
    '.afo-msg.bot{align-self:flex-start;background:#fff;border:1px solid rgba(20,17,13,.1)}',
    '.afo-msg.user{align-self:flex-end;background:#0b8f86;color:#fff}',
    '.afo-chat-suggestions{display:flex;gap:8px;overflow-x:auto;padding:10px 12px;border-top:1px solid rgba(20,17,13,.1);background:#fffdf7;scrollbar-width:none}',
    '.afo-chat-suggestions::-webkit-scrollbar{display:none}',
    '.afo-chip{white-space:nowrap;border:1px solid rgba(20,17,13,.14);border-radius:999px;background:#fff;padding:7px 10px;font-size:12px;font-weight:800;cursor:pointer;color:#14110d;flex-shrink:0}',
    '.afo-chip.invite{background:#14110d;color:#fff;border-color:#14110d}',
    '.afo-room-panel{background:#fff;border-top:1px solid rgba(20,17,13,.1);padding:12px;display:none;flex-direction:column;gap:8px}',
    '.afo-room-panel.visible{display:flex}',
    '.afo-room-label{font-size:12px;font-weight:700;color:#14110d}',
    '.afo-room-url{font-size:11px;color:#555;word-break:break-all;background:#fff8ee;border-radius:8px;padding:6px 8px}',
    '.afo-room-btns{display:flex;gap:8px;flex-wrap:wrap}',
    '.afo-room-copy{background:#14110d;color:#fff;border:0;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer}',
    '.afo-room-open{background:#0b8f86;color:#fff;border:0;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;text-decoration:none}',
    '.afo-chat-form{display:flex;gap:8px;padding:12px;background:#fffdf7;border-top:1px solid rgba(20,17,13,.1)}',
    '.afo-chat-form input{flex:1;border:1px solid rgba(20,17,13,.18);border-radius:999px;padding:11px 13px;font:14px Inter,system-ui,sans-serif;background:#fff;color:#14110d}',
    '.afo-chat-form button{border:0;border-radius:999px;background:#14110d;color:#fff;padding:0 14px;font-weight:900;cursor:pointer}',
    '.sticky-cta a.afo-chat-launcher{background:#0b8f86!important;color:#fff!important}',
    '.sticky-cta a.afo-chat-launcher:after{content:" - tap to open chat";font-weight:700;opacity:.82;font-size:.86em}',
    '@media(max-width:640px){.afo-chat-panel{right:10px;left:10px;bottom:84px;width:auto;height:520px;max-height:calc(100vh - 104px);border-radius:24px}.sticky-cta a.afo-chat-launcher:after{content:""}}'
  ].join('');

  var js = [
    '(function(){',
    'if(window.__afoChatLoaded){return;}window.__afoChatLoaded=true;',
    'var style=document.createElement("style");style.textContent=' + JSON.stringify(css) + ';document.head.appendChild(style);',
    'var panel=document.createElement("div");panel.className="afo-chat-panel";panel.setAttribute("aria-live","polite");',
    'panel.innerHTML=',
    JSON.stringify(
      '<div class="afo-chat-head"><div><strong>Chat / Reserve</strong><span>Reservations, menu, private events, follow-up</span></div><button class="afo-chat-close" aria-label="Close">&#x2715;</button></div>' +
      '<div class="afo-chat-log" id="afo-chat-log"></div>' +
      '<div class="afo-chat-suggestions">' +
        '<button class="afo-chip invite" id="afo-invite-btn">&#x1F4E4; Invite a Friend</button>' +
        '<button class="afo-chip" data-q="What are your best seafood dishes?">Seafood Picks</button>' +
        '<button class="afo-chip" data-q="What are good brunch options?">Plan Brunch</button>' +
        '<button class="afo-chip" data-q="What do you recommend for date night?">Date Night</button>' +
        '<button class="afo-chip" data-q="Tell me about private events.">Private Event</button>' +
      '</div>' +
      '<div class="afo-room-panel" id="afo-room-panel">' +
        '<div class="afo-room-label">Planning room created. Copy this link and send it to your friend.</div>' +
        '<div class="afo-room-url" id="afo-room-url"></div>' +
        '<div class="afo-room-btns">' +
          '<button class="afo-room-copy" id="afo-room-copy">Copy Invite Link</button>' +
          '<a class="afo-room-open" id="afo-room-open" target="_blank">Open Room</a>' +
        '</div>' +
      '</div>' +
      '<form class="afo-chat-form"><input id="afo-chat-input" autocomplete="off" placeholder="Ask about reservations, menu, events..."><button type="submit">Send</button></form>'
    ) + ';',
    'document.body.appendChild(panel);',
    'var launcher=document.querySelector(".sticky-cta a");',
    'if(!launcher){var wrap=document.createElement("div");wrap.className="sticky-cta";launcher=document.createElement("a");launcher.href="#";wrap.appendChild(launcher);document.body.appendChild(wrap);}',
    'launcher.classList.add("afo-chat-launcher");launcher.textContent="Chat / Reserve";launcher.setAttribute("href","#chat");launcher.setAttribute("role","button");launcher.setAttribute("aria-label","Open chat or reservation assistant");',
    'var log=panel.querySelector("#afo-chat-log");var input=panel.querySelector("#afo-chat-input");var form=panel.querySelector("form");var history=[];',
    'function add(role,text){var el=document.createElement("div");el.className="afo-msg "+(role==="user"?"user":"bot");el.textContent=text;log.appendChild(el);log.scrollTop=log.scrollHeight;}',
    'function open(){panel.classList.add("open");setTimeout(function(){input.focus();},50);if(!log.childNodes.length){add("bot","Hi! I can help with reservations, menu questions, brunch, date night, seafood picks, private events, or invite a friend to plan together.");}}',
    'function close(){panel.classList.remove("open");}',
    'async function send(text){text=String(text||"").trim();if(!text){return;}add("user",text);history.push({role:"user",content:text});input.value="";add("bot","Thinking...");var pending=log.lastChild;try{var r=await fetch("/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message:text,history:history})});var d=await r.json();pending.textContent=(d.reply||d.response||"Thanks - I received your message.")+(d.next?"\n\n"+d.next:"");history.push({role:"assistant",content:pending.textContent});}catch(e){pending.textContent="Sorry, chat is having trouble right now. Please try again or use the contact form.";}}',
    'launcher.addEventListener("click",function(e){e.preventDefault();open();});',
    'panel.querySelector(".afo-chat-close").addEventListener("click",close);',
    'form.addEventListener("submit",function(e){e.preventDefault();send(input.value);});',
    'panel.querySelectorAll(".afo-chip[data-q]").forEach(function(chip){chip.addEventListener("click",function(){send(chip.getAttribute("data-q"));});});',
    // Invite a Friend
    'document.getElementById("afo-invite-btn").addEventListener("click",async function(){',
    '  var roomPanel=document.getElementById("afo-room-panel");',
    '  if(roomPanel.classList.contains("visible")){roomPanel.classList.remove("visible");return;}',
    '  add("bot","Creating your planning room...");',
    '  try{',
    '    var r=await fetch("/api/chat/room/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Guest",intent:"planning room"})});',
    '    var d=await r.json();',
    '    if(d.ok&&d.share_url){',
    '      document.getElementById("afo-room-url").textContent=d.share_url;',
    '      document.getElementById("afo-room-open").href=d.share_url;',
    '      roomPanel.classList.add("visible");',
    '      add("bot","Planning room created! Copy the link above and send it to your friend. You can both contribute to the room and plan together.");',
    '    }',
    '  }catch(e){add("bot","Sorry, could not create the room. Please try again.");}',
    '});',
    'document.getElementById("afo-room-copy").addEventListener("click",function(){',
    '  var url=document.getElementById("afo-room-url").textContent;',
    '  if(navigator.clipboard){navigator.clipboard.writeText(url).then(function(){document.getElementById("afo-room-copy").textContent="Copied!";setTimeout(function(){document.getElementById("afo-room-copy").textContent="Copy Invite Link";},2000);});}',
    '});',
    '})();'
  ].join('\n');

  return new Response(js, {
    headers: {
      'content-type': 'application/javascript;charset=UTF-8',
      'cache-control': 'no-store'
    }
  });
}
