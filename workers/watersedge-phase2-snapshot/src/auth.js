// src/auth.js — afo-demo-template
export function checkAuth(request, env) {
  const pw = env.ADMIN_PASSWORD || 'afo-admin';
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7) === pw;
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp('(?:^|;)\\s*afo_admin=([^;]+)'));
  return match && match[1] === pw;
}