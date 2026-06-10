// src/handlers/ingest.js - watersedge-phase2-snapshot
// Phase 3B: Content ingest pipeline.
// Flow: parse -> R2 raw store -> D1 content_documents -> D1 knowledge_chunks -> CF AI embed -> Vectorize upsert -> KV cache
import { j, now } from '../utils.js';
import { dbRun, dbFirst, dbAll, defaultMenu } from '../db.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// -------------------------------------------------------
// Embedding via Cloudflare AI
// Returns a 768-dim float array or null on failure.
// -------------------------------------------------------
async function embed(env, text) {
  if (!env.AI) return null;
  try {
    var result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [String(text).slice(0, 2000)] });
    var data = result && result.data && result.data[0];
    return Array.isArray(data) ? data : null;
  } catch (e) {
    return null;
  }
}

// -------------------------------------------------------
// R2 raw store
// -------------------------------------------------------
async function storeR2(env, key, payload) {
  if (!env.DEMO_R2) return false;
  try {
    await env.DEMO_R2.put(key, JSON.stringify(payload, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------------
// KV cache helpers
// -------------------------------------------------------
async function kvSet(env, key, value, ttl) {
  if (!env.DEMO_KV) return;
  try { await env.DEMO_KV.put(key, typeof value === 'string' ? value : JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined); } catch (e) {}
}

// -------------------------------------------------------
// Upsert a single vector to Vectorize
// -------------------------------------------------------
async function vectorUpsert(env, id, vector, metadata) {
  if (!env.DEMO_VECTOR || !vector) return false;
  try {
    await env.DEMO_VECTOR.upsert([{ id: id, values: vector, metadata: metadata }]);
    return true;
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------------
// Build text body for a menu item chunk
// -------------------------------------------------------
function menuItemBody(menuName, category, item) {
  var parts = [menuName + ' - ' + category + ': ' + item.name];
  if (item.description) parts.push(item.description);
  if (item.price) parts.push('Price: ' + item.price);
  if (Array.isArray(item.tags) && item.tags.length) parts.push('Tags: ' + item.tags.join(', '));
  return parts.join('. ');
}

// -------------------------------------------------------
// Build text body for a wine item chunk
// -------------------------------------------------------
function wineItemBody(wine) {
  var parts = [wine.name];
  if (wine.type) parts.push(wine.type);
  if (wine.varietal) parts.push(wine.varietal);
  if (wine.region) parts.push('from ' + wine.region);
  if (wine.description) parts.push(wine.description);
  if (wine.price_glass) parts.push('Glass: ' + wine.price_glass);
  if (wine.price_bottle) parts.push('Bottle: ' + wine.price_bottle);
  var pairs = wine.pairs_with_json;
  if (typeof pairs === 'string') { try { pairs = JSON.parse(pairs); } catch (e) { pairs = null; } }
  if (Array.isArray(pairs) && pairs.length) parts.push('Pairs well with: ' + pairs.join(', '));
  return parts.join('. ');
}

// -------------------------------------------------------
// Core chunk ingest: write D1 row + embed + vectorize
// Returns { chunk_id, vector_id, embedded }
// -------------------------------------------------------
async function ingestChunk(env, slug, docId, type, title, body, metadata) {
  var chunkId = uid();
  var ts = now();
  var metaJson = JSON.stringify(metadata || {});

  // 1. Write D1 chunk (vector_id null until embed succeeds)
  await dbRun(env,
    'INSERT INTO knowledge_chunks (id, slug, document_id, type, title, body, metadata_json, vector_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [chunkId, slug, docId, type, title, body, metaJson, null, ts]
  );

  // 2. Embed
  var vector = await embed(env, title + '. ' + body);
  var vectored = false;

  if (vector) {
    // 3. Upsert to Vectorize
    var vecMeta = Object.assign({}, metadata || {}, { slug: slug, type: type, title: title, chunk_id: chunkId, doc_id: docId });
    vectored = await vectorUpsert(env, chunkId, vector, vecMeta);

    // 4. Update D1 chunk with vector_id
    if (vectored) {
      await dbRun(env, 'UPDATE knowledge_chunks SET vector_id=? WHERE id=?', [chunkId, chunkId]);
    }
  }

  return { chunk_id: chunkId, vector_id: vectored ? chunkId : null, embedded: !!vector };
}

// -------------------------------------------------------
// POST /api/content/ingest/menu
// Body: { menu: <menu object> } or uses defaultMenu() fallback
// -------------------------------------------------------
export async function handleIngestMenu(request, env, slug) {
  var body = await request.json().catch(function() { return {}; });
  var menu = body.menu || defaultMenu();
  var source = String(body.source || 'default_menu_data');
  var ts = now();
  var docId = uid();

  // 1. Store raw in R2
  var r2Key = slug + '/raw/menu/' + docId + '.json';
  var r2Stored = await storeR2(env, r2Key, { source: source, ingested_at: ts, menu: menu });

  // 2. Register content_document in D1
  await dbRun(env,
    'INSERT INTO content_documents (id, slug, type, title, source_url, r2_key, status, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [docId, slug, 'menu', 'Waters Edge Menu - ' + ts.slice(0, 10), source, r2Key, 'processing', JSON.stringify({ item_count: 0 }), ts, ts]
  );

  // 3. Chunk every menu item and ingest
  var results = [];
  var totalItems = 0;
  var totalVectored = 0;
  var menus = Array.isArray(menu.menus) ? menu.menus : [];

  for (var mi = 0; mi < menus.length; mi++) {
    var m = menus[mi];
    var menuName = m.name || 'Menu';
    var categories = Array.isArray(m.categories) ? m.categories : [];
    for (var ci = 0; ci < categories.length; ci++) {
      var cat = categories[ci];
      var catName = cat.name || 'Items';
      var items = Array.isArray(cat.items) ? cat.items : [];
      for (var ii = 0; ii < items.length; ii++) {
        var item = items[ii];
        var title = item.name || 'Menu Item';
        var itemBody = menuItemBody(menuName, catName, item);
        var meta = {
          menu: menuName,
          category: catName,
          name: item.name,
          price: item.price || '',
          tags: Array.isArray(item.tags) ? item.tags : []
        };
        var r = await ingestChunk(env, slug, docId, 'menu_item', title, itemBody, meta);
        results.push(r);
        totalItems++;
        if (r.embedded) totalVectored++;
      }
    }
  }

  // 4. Update document status
  await dbRun(env,
    'UPDATE content_documents SET status=?, metadata_json=?, updated_at=? WHERE id=?',
    ['active', JSON.stringify({ item_count: totalItems, vectorized: totalVectored }), now(), docId]
  );

  // 5. Cache menu summary in KV
  var kvSummary = { doc_id: docId, item_count: totalItems, vectorized: totalVectored, ingested_at: ts };
  await kvSet(env, 'menu_cache:' + slug, kvSummary, 86400);

  return j({
    ok: true,
    doc_id: docId,
    r2_key: r2Key,
    r2_stored: r2Stored,
    total_items: totalItems,
    total_vectorized: totalVectored,
    ai_available: !!env.AI,
    chunks: results
  });
}

// -------------------------------------------------------
// POST /api/content/ingest/wine
// Body: { wines: [ { name, type, varietal, region, description, price_glass, price_bottle, pairs_with_json } ] }
// If no body, seeds with a starter Waters Edge wine list.
// -------------------------------------------------------
export async function handleIngestWine(request, env, slug) {
  var body = await request.json().catch(function() { return {}; });
  var wines = Array.isArray(body.wines) ? body.wines : defaultWineList();
  var source = String(body.source || 'default_wine_data');
  var ts = now();
  var docId = uid();

  // 1. Store raw in R2
  var r2Key = slug + '/raw/wine/' + docId + '.json';
  var r2Stored = await storeR2(env, r2Key, { source: source, ingested_at: ts, wines: wines });

  // 2. Register content_document in D1
  await dbRun(env,
    'INSERT INTO content_documents (id, slug, type, title, source_url, r2_key, status, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [docId, slug, 'wine', 'Waters Edge Wine List - ' + ts.slice(0, 10), source, r2Key, 'processing', JSON.stringify({ item_count: wines.length }), ts, ts]
  );

  // 3. Write D1 wine_items rows + chunk + embed
  var results = [];
  var totalVectored = 0;

  for (var i = 0; i < wines.length; i++) {
    var wine = wines[i];
    var wineId = uid();
    var pairsJson = Array.isArray(wine.pairs_with) ? JSON.stringify(wine.pairs_with) : (wine.pairs_with_json || null);

    // Write wine_items row
    await dbRun(env,
      'INSERT OR REPLACE INTO wine_items (id, slug, name, type, varietal, region, description, price_glass, price_bottle, pairs_with_json, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [wineId, slug, wine.name || '', wine.type || '', wine.varietal || '', wine.region || '', wine.description || '', wine.price_glass || '', wine.price_bottle || '', pairsJson, source, ts, ts]
    );

    // Ingest chunk
    var wineBody = wineItemBody(wine);
    var meta = {
      wine_id: wineId,
      name: wine.name,
      type: wine.type || '',
      varietal: wine.varietal || '',
      region: wine.region || '',
      price_glass: wine.price_glass || '',
      price_bottle: wine.price_bottle || ''
    };
    var r = await ingestChunk(env, slug, docId, 'wine_item', wine.name || 'Wine', wineBody, meta);
    results.push(r);
    if (r.embedded) totalVectored++;
  }

  // 4. Update document status
  await dbRun(env,
    'UPDATE content_documents SET status=?, metadata_json=?, updated_at=? WHERE id=?',
    ['active', JSON.stringify({ item_count: wines.length, vectorized: totalVectored }), now(), docId]
  );

  // 5. Cache wine summary in KV
  var kvSummary = { doc_id: docId, item_count: wines.length, vectorized: totalVectored, ingested_at: ts };
  await kvSet(env, 'wine_cache:' + slug, kvSummary, 86400);

  return j({
    ok: true,
    doc_id: docId,
    r2_key: r2Key,
    r2_stored: r2Stored,
    total_items: wines.length,
    total_vectorized: totalVectored,
    ai_available: !!env.AI,
    chunks: results
  });
}

// -------------------------------------------------------
// GET /api/content/search?q=<query>&type=<type>
// Phase 3B: Vectorize semantic search with D1 keyword fallback.
// -------------------------------------------------------
export async function handleContentSearch(request, env, slug) {
  var url = new URL(request.url);
  var q = String(url.searchParams.get('q') || '').trim();
  var type = String(url.searchParams.get('type') || '').trim();
  var limit = Math.min(parseInt(url.searchParams.get('limit') || '8', 10), 30);
  if (!q) return j({ ok: false, error: 'q param required' }, 400);

  var mode = 'keyword';
  var results = [];

  // Try Vectorize semantic search first
  if (env.DEMO_VECTOR && env.AI) {
    try {
      var qVec = await embed(env, q);
      if (qVec) {
        var filter = type ? { slug: { $eq: slug }, type: { $eq: type } } : { slug: { $eq: slug } };
        var vResult = await env.DEMO_VECTOR.query(qVec, { topK: limit, returnMetadata: 'all', filter: filter });
        if (vResult && vResult.matches && vResult.matches.length > 0) {
          mode = 'semantic';
          var chunkIds = vResult.matches.map(function(m) { return m.id; });
          // Fetch full body from D1 for each matched chunk
          for (var i = 0; i < chunkIds.length; i++) {
            var row = await dbFirst(env, 'SELECT id, type, title, body, metadata_json, vector_id FROM knowledge_chunks WHERE id=?', [chunkIds[i]]);
            if (row) results.push({ score: vResult.matches[i].score, id: row.id, type: row.type, title: row.title, body: row.body, metadata_json: row.metadata_json });
          }
        }
      }
    } catch (e) {
      // fall through to keyword
    }
  }

  // D1 keyword fallback
  if (results.length === 0) {
    try {
      var sql, params;
      var like = '%' + q + '%';
      if (type) {
        sql = 'SELECT id, type, title, body, metadata_json, vector_id FROM knowledge_chunks WHERE slug=? AND type=? AND (title LIKE ? OR body LIKE ?) ORDER BY created_at DESC LIMIT ?';
        params = [slug, type, like, like, limit];
      } else {
        sql = 'SELECT id, type, title, body, metadata_json, vector_id FROM knowledge_chunks WHERE slug=? AND (title LIKE ? OR body LIKE ?) ORDER BY created_at DESC LIMIT ?';
        params = [slug, like, like, limit];
      }
      var rows = await dbAll(env, sql, params);
      results = rows.map(function(r) { return Object.assign({ score: null }, r); });
    } catch (e) {
      return j({ ok: false, error: e.message }, 500);
    }
  }

  return j({ ok: true, query: q, mode: mode, count: results.length, results: results });
}

// -------------------------------------------------------
// GET /api/content/documents
// Lists ingested content documents for this slug.
// -------------------------------------------------------
export async function handleContentDocuments(request, env, slug) {
  var url = new URL(request.url);
  var type = String(url.searchParams.get('type') || '').trim();
  try {
    var sql, params;
    if (type) {
      sql = 'SELECT id, type, title, source_url, r2_key, status, metadata_json, created_at FROM content_documents WHERE slug=? AND type=? ORDER BY created_at DESC LIMIT 50';
      params = [slug, type];
    } else {
      sql = 'SELECT id, type, title, source_url, r2_key, status, metadata_json, created_at FROM content_documents WHERE slug=? ORDER BY created_at DESC LIMIT 50';
      params = [slug];
    }
    var rows = await dbAll(env, sql, params);
    return j({ ok: true, count: rows.length, documents: rows });
  } catch (e) {
    return j({ ok: false, error: e.message }, 500);
  }
}

// -------------------------------------------------------
// Default wine list — starter Waters Edge data
// Will be replaced/extended by admin uploads or real wine list ingest.
// -------------------------------------------------------
function defaultWineList() {
  return [
    {
      name: 'Chardonnay - House White',
      type: 'white',
      varietal: 'Chardonnay',
      region: 'California',
      description: 'Crisp and buttery with hints of oak and citrus. A classic California Chardonnay.',
      price_glass: '$12',
      price_bottle: '$44',
      pairs_with: ['Grilled Atlantic Salmon', 'Pacific Halibut Fish N Chips', 'Seafood Risotto', 'Lobster Benedict']
    },
    {
      name: 'Sauvignon Blanc - Coastal Select',
      type: 'white',
      varietal: 'Sauvignon Blanc',
      region: 'New Zealand',
      description: 'Bright and aromatic with tropical fruit and fresh herb notes. Excellent with seafood.',
      price_glass: '$13',
      price_bottle: '$48',
      pairs_with: ['Seared Ahi Steak', 'Steamed Mussels', 'Shrimp Scampi', 'Shrimp Lumpia']
    },
    {
      name: 'Pinot Grigio - Harbor',
      type: 'white',
      varietal: 'Pinot Grigio',
      region: 'Italy',
      description: 'Light and refreshing with green apple and pear. Versatile food wine.',
      price_glass: '$11',
      price_bottle: '$40',
      pairs_with: ['Fried Calamari', 'Avocado Benedict', 'Chicken & Waffles', 'Seasonal Catch Bruschetta']
    },
    {
      name: 'Cabernet Sauvignon - Anchor Reserve',
      type: 'red',
      varietal: 'Cabernet Sauvignon',
      region: 'Napa Valley, California',
      description: 'Bold and structured with dark fruit, cedar, and a long finish. Perfect with red meat.',
      price_glass: '$16',
      price_bottle: '$62',
      pairs_with: ['Filet Mignon', 'Top Sirloin Steak', 'Flat Iron Steak', 'Slow Braised Short Rib']
    },
    {
      name: 'Pinot Noir - Pacific Coast',
      type: 'red',
      varietal: 'Pinot Noir',
      region: 'Willamette Valley, Oregon',
      description: 'Elegant and earthy with red cherry, raspberry, and subtle spice. Pairs beautifully with salmon.',
      price_glass: '$15',
      price_bottle: '$58',
      pairs_with: ['Grilled Atlantic Salmon', 'Bacon Jam Scallops', 'Slow Braised Short Rib', 'Mushroom dishes']
    },
    {
      name: 'Malbec - Waterfront',
      type: 'red',
      varietal: 'Malbec',
      region: 'Mendoza, Argentina',
      description: 'Rich and velvety with dark plum, mocha, and a smooth finish. Great for sharing.',
      price_glass: '$13',
      price_bottle: '$48',
      pairs_with: ['Flat Iron Steak', 'Slow Braised Short Rib', 'Burger Favorites', 'Bacon Jam Scallops']
    },
    {
      name: 'Sparkling Rose - Celebration',
      type: 'sparkling',
      varietal: 'Sparkling Rose',
      region: 'California',
      description: 'Festive and vibrant with strawberry and cream notes. Ideal for date night and special occasions.',
      price_glass: '$14',
      price_bottle: '$52',
      pairs_with: ['Bacon Jam Scallops', 'Seafood Risotto', 'Lobster Benedict', 'Dessert Selection']
    },
    {
      name: 'Rose - Sunset',
      type: 'rose',
      varietal: 'Rose',
      region: 'Provence, France',
      description: 'Dry and delicate with notes of peach, watermelon, and fresh herbs. Approachable and versatile.',
      price_glass: '$12',
      price_bottle: '$44',
      pairs_with: ['Shrimp Lumpia', 'Seared Ahi Steak', 'Avocado Toast', 'Chorizo Chilaquiles']
    }
  ];
}
