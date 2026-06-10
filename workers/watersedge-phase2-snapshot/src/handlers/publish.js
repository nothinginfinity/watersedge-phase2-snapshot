// src/handlers/publish.js — watersedge-phase2-snapshot
import { j, now } from '../utils.js';
import { dbRun, loadSection, defaultContact, defaultServices, defaultTestimonials } from '../db.js';
import { renderPage } from '../render/page.js';

export async function handlePublish(env, slug) {
  const contact      = await loadSection(env, slug, 'contact',      defaultContact());
  const services     = await loadSection(env, slug, 'services',     defaultServices());
  const testimonials = await loadSection(env, slug, 'testimonials', defaultTestimonials());
  const html = renderPage(contact, services, testimonials, slug);
  await dbRun(env,
    'INSERT INTO demo_snapshots (slug,html,published_at) VALUES (?,?,?) ON CONFLICT(slug) DO UPDATE SET html=excluded.html,published_at=excluded.published_at',
    [slug, html, now()]
  );
  return j({ ok: true, slug, message: 'Demo published!', size: html.length, published_at: now() });
}
