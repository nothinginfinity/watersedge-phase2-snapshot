// src/handlers/pipeline.js - watersedge-phase2-snapshot
// Phase 3A: Data pipeline smoke test and status endpoints.
// Tests D1, KV, R2, and Vectorize layers. Graceful fallback if KV/R2 not yet bound.
import { j, now } from '../utils.js';
import { dbRun, dbFirst, dbAll } from '../db.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// GET /api/pipeline/status
// Returns binding presence and layer readiness without writing anything.
export async function handlePipelineStatus(request, env, slug) {
  var status = {
    ok: true,
    worker: 'watersedge-phase2-snapshot',
    slug: slug,
    timestamp: now(),
    layers: {
      d1:        env.DEMO_DB      ? 'bound' : 'missing',
      kv:        env.DEMO_KV      ? 'bound' : 'not_configured',
      r2:        env.DEMO_R2      ? 'bound' : 'not_configured',
      vectorize: env.DEMO_VECTOR  ? 'bound' : 'missing'
    },
    tables: {}
  };

  // Quick D1 table check
  try {
    var tables = [
      'chat_rooms', 'chat_messages', 'chat_participants',
      'demo_leads', 'demo_content',
      'wine_items', 'content_documents', 'knowledge_chunks'
    ];
    for (var i = 0; i < tables.length; i++) {
      var t = tables[i];
      var row = await dbFirst(env, 'SELECT COUNT(*) as n FROM ' + t, []);
      status.tables[t] = row ? row.n : 0;
    }
  } catch (e) {
    status.d1_error = e.message;
  }

  return j(status);
}

// POST /api/pipeline/smoke
// Writes and reads back a test record in every available layer.
export async function handlePipelineSmoke(request, env, slug) {
  var results = {
    ok: true,
    timestamp: now(),
    d1: 'skip',
    kv: 'skip',
    r2: 'skip',
    vectorize: 'skip'
  };

  // --- D1 smoke ---
  try {
    var smokeId = 'smoke-' + uid();
    var ts = now();
    await dbRun(env,
      'INSERT INTO knowledge_chunks (id, slug, document_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [smokeId, slug, null, 'smoke_test', 'Pipeline smoke test', 'D1 write/read check: ' + ts, ts]
    );
    var row = await dbFirst(env, 'SELECT id, body FROM knowledge_chunks WHERE id=?', [smokeId]);
    if (row && row.id === smokeId) {
      results.d1 = 'ok';
      // Clean up smoke row
      await dbRun(env, 'DELETE FROM knowledge_chunks WHERE id=?', [smokeId]);
    } else {
      results.d1 = 'read_failed';
      results.ok = false;
    }
  } catch (e) {
    results.d1 = 'error: ' + e.message;
    results.ok = false;
  }

  // --- KV smoke ---
  if (env.DEMO_KV) {
    try {
      var kvKey = 'smoke:' + uid();
      var kvVal = 'kv-check-' + now();
      await env.DEMO_KV.put(kvKey, kvVal, { expirationTtl: 60 });
      var kvRead = await env.DEMO_KV.get(kvKey);
      results.kv = kvRead === kvVal ? 'ok' : 'read_mismatch';
      if (results.kv !== 'ok') results.ok = false;
    } catch (e) {
      results.kv = 'error: ' + e.message;
      results.ok = false;
    }
  } else {
    results.kv = 'not_configured';
  }

  // --- R2 smoke ---
  if (env.DEMO_R2) {
    try {
      var r2Key = slug + '/smoke/test-' + uid() + '.txt';
      var r2Body = 'r2-smoke-' + now();
      await env.DEMO_R2.put(r2Key, r2Body);
      var r2Obj = await env.DEMO_R2.get(r2Key);
      var r2Read = r2Obj ? await r2Obj.text() : null;
      results.r2 = r2Read === r2Body ? 'ok' : 'read_mismatch';
      if (results.r2 !== 'ok') results.ok = false;
      // Clean up
      await env.DEMO_R2.delete(r2Key);
    } catch (e) {
      results.r2 = 'error: ' + e.message;
      results.ok = false;
    }
  } else {
    results.r2 = 'not_configured';
  }

  // --- Vectorize smoke ---
  if (env.DEMO_VECTOR) {
    try {
      var vecId = 'smoke-' + uid();
      // Use a deterministic 768-dim zero-ish vector for smoke test (no AI call needed)
      var smokeVec = new Array(768).fill(0.0);
      smokeVec[0] = 0.1; smokeVec[1] = 0.2; smokeVec[2] = 0.3;
      await env.DEMO_VECTOR.upsert([{
        id: vecId,
        values: smokeVec,
        metadata: { slug: slug, type: 'smoke_test', title: 'Smoke test vector' }
      }]);
      var qResult = await env.DEMO_VECTOR.query(smokeVec, { topK: 1 });
      results.vectorize = (qResult && qResult.matches && qResult.matches.length > 0) ? 'ok' : 'query_empty';
      // Delete smoke vector
      await env.DEMO_VECTOR.deleteByIds([vecId]);
    } catch (e) {
      results.vectorize = 'error: ' + e.message;
      results.ok = false;
    }
  } else {
    results.vectorize = 'not_configured';
  }

  return j(results);
}

// GET /api/content/r2-list
// Lists R2 objects under the slug prefix. Safe to call anytime.
export async function handleR2List(request, env, slug) {
  if (!env.DEMO_R2) return j({ ok: false, error: 'R2 not configured. Add [[r2_buckets]] to wrangler.toml.' });
  try {
    var url = new URL(request.url);
    var prefix = url.searchParams.get('prefix') || (slug + '/');
    var limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    var listed = await env.DEMO_R2.list({ prefix: prefix, limit: limit });
    return j({
      ok: true,
      prefix: prefix,
      count: listed.objects.length,
      truncated: listed.truncated,
      objects: listed.objects.map(function(o) {
        return { key: o.key, size: o.size, uploaded: o.uploaded };
      })
    });
  } catch (e) {
    return j({ ok: false, error: e.message }, 500);
  }
}

// GET /api/content/search?q=<query>
// Searches knowledge_chunks in D1 by keyword (Phase 3A: full-text via LIKE).
// Phase 3B will replace with Vectorize semantic search.
export async function handleContentSearch(request, env, slug) {
  var url = new URL(request.url);
  var q = String(url.searchParams.get('q') || '').trim();
  var type = String(url.searchParams.get('type') || '').trim();
  var limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
  if (!q) return j({ ok: false, error: 'q param required' }, 400);

  try {
    var sql, params;
    if (type) {
      sql = 'SELECT id, type, title, body, metadata_json, vector_id FROM knowledge_chunks WHERE slug=? AND type=? AND (title LIKE ? OR body LIKE ?) ORDER BY created_at DESC LIMIT ?';
      params = [slug, type, '%' + q + '%', '%' + q + '%', limit];
    } else {
      sql = 'SELECT id, type, title, body, metadata_json, vector_id FROM knowledge_chunks WHERE slug=? AND (title LIKE ? OR body LIKE ?) ORDER BY created_at DESC LIMIT ?';
      params = [slug, '%' + q + '%', '%' + q + '%', limit];
    }
    var rows = await dbAll(env, sql, params);
    return j({ ok: true, query: q, count: rows.length, results: rows });
  } catch (e) {
    return j({ ok: false, error: e.message }, 500);
  }
}
