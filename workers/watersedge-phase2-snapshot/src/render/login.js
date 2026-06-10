// src/render/login.js — afo-demo-template
import { esc } from '../utils.js';
export function renderLogin(msg) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Admin Login</title>' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:Inter,system-ui,sans-serif;background:#0f0f0f;color:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:100vh}' +
    '.box{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:2.5rem;width:min(400px,90vw)}' +
    'h1{font-size:1.4rem;font-weight:800;margin-bottom:.25rem}' +
    'p{color:#888;font-size:.88rem;margin-bottom:1.75rem}' +
    'input{width:100%;padding:.75rem 1rem;background:#111;border:1px solid #333;border-radius:10px;color:#f0f0f0;font-size:.95rem;margin-bottom:1rem}' +
    'button{width:100%;padding:.8rem;background:#fff;color:#111;border:none;border-radius:10px;font-weight:700;font-size:.95rem;cursor:pointer}' +
    '.err{color:#f87171;font-size:.85rem;margin-top:.75rem;text-align:center}' +
    '</style></head><body>' +
    '<div class="box">' +
    '<h1>AFO Demo Admin</h1><p>Enter your admin password to continue.</p>' +
    '<input id="pw" type="password" placeholder="Password" onkeydown="if(event.key===\'Enter\')login()">' +
    '<button onclick="login()">Sign In</button>' +
    (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
    '</div>' +
    '<script>async function login(){' +
    'var pw=document.getElementById("pw").value;' +
    'var r=await fetch("/admin/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:pw})});' +
    'var d=await r.json();' +
    'if(d.ok){document.cookie="afo_admin="+pw+";path=/;max-age=86400";location.reload();}' +
    'else{document.querySelector(".err")||document.querySelector("button").insertAdjacentHTML("afterend","<p class=\\"err\\">Wrong password</p>");}' +
    '}</script>' +
    '</body></html>';
}