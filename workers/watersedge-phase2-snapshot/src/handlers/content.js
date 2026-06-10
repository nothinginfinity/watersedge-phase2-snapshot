// src/handlers/content.js — afo-demo-template
import { j } from '../utils.js';
import { dbAll } from '../db.js';
export async function handleContent(env, slug) {
  const content = await loadAllContent(env, slug);
  return j({ ok: true, slug, sections: Object.keys(content), content });
}