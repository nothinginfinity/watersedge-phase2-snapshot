// src/handlers/status.js — watersedge-phase2-snapshot
import { j } from '../utils.js';
import { dbFirst, loadSection } from '../db.js';

const VERSION = '1.1.0';
const WORKER  = 'watersedge-phase2-snapshot';

export async function handleStatus(env, slug) {
  const tenant  = await dbFirst(env, 'SELECT * FROM tenants WHERE slug=?', [slug]);
  const contact = await loadSection(env, slug, 'contact', null);
  const snap    = await dbFirst(env, 'SELECT published_at FROM demo_snapshots WHERE slug=?', [slug]);
  const leads   = await dbFirst(env, 'SELECT COUNT(*) as c FROM demo_leads WHERE slug=?', [slug]);
  return j({ ok: true, worker: WORKER, version: VERSION, slug, tenant: tenant?.name||null, vertical: tenant?.vertical||'generic', has_contact: !!contact, has_snapshot: !!snap, snapshot_at: snap?.published_at||null, leads: leads?.c||0 });
}
