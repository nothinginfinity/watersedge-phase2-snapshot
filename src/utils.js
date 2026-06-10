// src/utils.js - afo-demo-template
export function esc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function j(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
  });
}

export function h(body, status = 200) {
  return new Response(body, {
    status, headers: { 'content-type': 'text/html;charset=UTF-8', 'cache-control': 'no-store' }
  });
}

export function now() { return new Date().toISOString(); }
