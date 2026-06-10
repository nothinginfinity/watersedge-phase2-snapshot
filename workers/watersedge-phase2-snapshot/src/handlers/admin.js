// src/handlers/admin.js - watersedge-phase2-snapshot
import { h, j, now } from '../utils.js';
import { dbFirst, dbAll, dbRun, loadSection, defaultContact, defaultServices, defaultTestimonials } from '../db.js';
import { checkAuth } from '../auth.js';
import { renderLogin } from '../render/login.js';
import { renderAdmin } from '../render/admin.js';
import { renderAdminPipeline } from '../render/admin_pipeline.js';

export async function handleAdmin(request, env, slug) {
  if (!checkAuth(request, env)) return h(renderLogin(''), 401);
  const contact      = await loadSection(env, slug, 'contact',      defaultContact());
  const services     = await loadSection(env, slug, 'services',     defaultServices());
  const testimonials = await loadSection(env, slug, 'testimonials', defaultTestimonials());
  const leads        = await dbAll(env, 'SELECT * FROM demo_leads WHERE slug=? ORDER BY id DESC LIMIT 50', [slug]);
  const snap         = await dbFirst(env, 'SELECT published_at FROM demo_snapshots WHERE slug=?', [slug]);
  return h(renderAdmin(contact, services, testimonials, leads, snap, slug));
}

export async function handleAdminPipeline(request, env, slug) {
  if (!checkAuth(request, env)) return h(renderLogin(''), 401);
  // Pre-fetch pipeline status for the page header
  var status = { layers: {}, tables: {} };
  try {
    status.layers = {
      d1:        env.DEMO_DB     ? 'bound' : 'missing',
      kv:        env.DEMO_KV     ? 'bound' : 'not_configured',
      r2:        env.DEMO_R2     ? 'bound' : 'not_configured',
      vectorize: env.DEMO_VECTOR ? 'bound' : 'missing'
    };
    var tableNames = ['chat_rooms','chat_messages','demo_leads','wine_items','content_documents','knowledge_chunks'];
    for (var i = 0; i < tableNames.length; i++) {
      var row = await dbFirst(env, 'SELECT COUNT(*) as n FROM ' + tableNames[i], []);
      status.tables[tableNames[i]] = row ? row.n : 0;
    }
  } catch(e) {}
  return renderAdminPipeline(slug, status);
}

export async function handleAdminAuth(request, env) {
  const body = await request.json().catch(() => ({}));
  const pw   = env.ADMIN_PASSWORD || 'afo-admin';
  return j({ ok: body.password === pw });
}

export async function handleAdminContent(request, env, slug) {
  if (!checkAuth(request, env)) return h(renderLogin(''), 401);
  const body = await request.json().catch(() => ({}));
  if (!body.section) return j({ ok: false, error: 'section required' }, 400);
  const data = JSON.stringify(body.data);
  await dbRun(env,
    'INSERT INTO demo_content (slug,section,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(slug,section) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at',
    [slug, body.section, data, now()]
  );
  return j({ ok: true, slug, section: body.section });
}
