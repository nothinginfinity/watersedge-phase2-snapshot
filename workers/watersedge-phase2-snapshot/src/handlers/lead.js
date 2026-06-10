// src/handlers/lead.js — watersedge-phase2-snapshot
import { j, now } from '../utils.js';
import { dbRun } from '../db.js';

export async function handleLead(request, env, slug) {
  const body = await request.json().catch(() => ({}));
  await dbRun(env,
    'INSERT INTO demo_leads (slug,name,email,phone,message,created_at) VALUES (?,?,?,?,?,?)',
    [slug, body.name||'', body.email||'', body.phone||'', body.message||'', now()]
  );
  return j({ ok: true, slug });
}
