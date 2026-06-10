// src/auth.js - afo-demo-template
export function getAdminPassword(env) {
  return env.ADMIN_PASSWORD || 'demo1234';
}

export function checkAdminCookie(request, env) {
  const cookie = request.headers.get('cookie') || '';
  const pw = getAdminPassword(env);
  return cookie.split(';').some(function(c) {
    return c.trim() === 'afo_admin=' + pw;
  });
}
