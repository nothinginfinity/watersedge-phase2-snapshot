// src/render/admin_pipeline.js - watersedge-phase2-snapshot
// Mobile-friendly pipeline control panel. Tap to ingest, smoke test, and search.
import { h, esc } from '../utils.js';

export function renderAdminPipeline(slug, pipelineStatus) {
  var layers = pipelineStatus && pipelineStatus.layers ? pipelineStatus.layers : {};
  var tables = pipelineStatus && pipelineStatus.tables ? pipelineStatus.tables : {};

  function badge(val) {
    var ok = val === 'bound' || val === 'ok';
    var warn = val === 'not_configured';
    var color = ok ? '#16a34a' : warn ? '#b45309' : '#dc2626';
    return '<span style="background:' + color + ';color:#fff;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700">' + esc(String(val)) + '</span>';
  }

  var layerRows = ['d1', 'kv', 'r2', 'vectorize'].map(function(k) {
    return '<tr><td style="padding:8px 0;color:#aaa;font-size:13px">' + k.toUpperCase() + '</td><td>' + badge(layers[k] || 'unknown') + '</td></tr>';
  }).join('');

  var tableRows = Object.keys(tables).map(function(t) {
    return '<tr><td style="padding:6px 0;color:#aaa;font-size:12px">' + esc(t) + '</td><td style="color:#e8e8e8;font-size:12px;text-align:right">' + esc(String(tables[t])) + ' rows</td></tr>';
  }).join('');

  var css = [
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{font-family:Inter,system-ui,sans-serif;background:#0f0f0f;color:#e8e8e8;min-height:100vh}',
    '.topbar{background:#151515;border-bottom:1px solid #222;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}',
    '.topbar h1{font-size:15px;font-weight:800}',
    '.topbar a{color:#60a5fa;font-size:12px;text-decoration:none}',
    '.wrap{max-width:640px;margin:0 auto;padding:16px}',
    '.card{background:#151515;border:1px solid #222;border-radius:16px;margin-bottom:14px;overflow:hidden}',
    '.card-head{padding:14px 16px;border-bottom:1px solid #1e1e1e;display:flex;align-items:center;justify-content:space-between}',
    '.card-head h2{font-size:14px;font-weight:700}',
    '.card-body{padding:14px 16px}',
    '.step-btn{width:100%;padding:14px;background:#2563eb;color:#fff;border:0;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;text-align:left;display:flex;align-items:center;justify-content:space-between}',
    '.step-btn:active{opacity:.85}',
    '.step-btn.green{background:#16a34a}',
    '.step-btn.teal{background:#0b8f86}',
    '.step-btn.amber{background:#b45309}',
    '.step-btn.gray{background:#333;color:#aaa}',
    '.step-icon{font-size:18px}',
    '.output{background:#0a0a0a;border:1px solid #1e1e1e;border-radius:10px;padding:12px;font-size:12px;font-family:monospace;color:#4ade80;min-height:48px;max-height:240px;overflow-y:auto;display:none;margin-top:8px;white-space:pre-wrap;word-break:break-all}',
    '.output.visible{display:block}',
    '.output.err{color:#f87171}',
    'table{width:100%;border-collapse:collapse}',
    '.search-row{display:flex;gap:8px;margin-bottom:10px}',
    '.search-row input{flex:1;padding:10px 12px;background:#111;border:1px solid #2a2a2a;border-radius:10px;color:#e8e8e8;font-size:14px}',
    '.search-row button{background:#0b8f86;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;white-space:nowrap}',
    '.note{font-size:12px;color:#666;margin-bottom:12px;line-height:1.5}'
  ].join('');

  var js = [
    'async function run(id, url, method, body) {',
    '  var out = document.getElementById(id);',
    '  out.className = "output visible";',
    '  out.textContent = "Running...";',
    '  try {',
    '    var opts = { method: method || "POST", headers: { "content-type": "application/json" } };',
    '    if (body !== undefined) opts.body = JSON.stringify(body);',
    '    var r = await fetch(url, opts);',
    '    var d = await r.json();',
    '    out.className = "output visible" + (d.ok === false ? " err" : "");',
    '    out.textContent = JSON.stringify(d, null, 2);',
    '  } catch(e) {',
    '    out.className = "output visible err";',
    '    out.textContent = "Error: " + e.message;',
    '  }',
    '}',
    'async function runSearch() {',
    '  var q = document.getElementById("search-q").value.trim();',
    '  if (!q) return;',
    '  await run("out-search", "/api/content/search?q=" + encodeURIComponent(q), "GET", undefined);',
    '}',
    'document.getElementById("search-q").addEventListener("keydown", function(e) {',
    '  if (e.key === "Enter") runSearch();',
    '});'
  ].join('\n');

  var html =
    '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Pipeline Admin</title>' +
    '<style>' + css + '</style>' +
    '</head><body>' +
    '<div class="topbar">' +
    '<h1>Pipeline Control</h1>' +
    '<a href="/admin">&larr; Admin</a>' +
    '</div>' +
    '<div class="wrap">' +

    // Layer status card
    '<div class="card">' +
    '<div class="card-head"><h2>Storage Layers</h2></div>' +
    '<div class="card-body">' +
    '<table>' + layerRows + '</table>' +
    '<div style="border-top:1px solid #1e1e1e;margin-top:10px;padding-top:10px">' +
    '<table>' + tableRows + '</table>' +
    '</div>' +
    '</div></div>' +

    // Step 1: Smoke test
    '<div class="card">' +
    '<div class="card-head"><h2>Step 1 &mdash; Smoke Test All Layers</h2></div>' +
    '<div class="card-body">' +
    '<p class="note">Writes and reads back a record on every bound layer. Safe to run anytime.</p>' +
    '<button class="step-btn" onclick="run(\"out-smoke\",\"/api/pipeline/smoke\",\"POST\",{})">Run Smoke Test <span class="step-icon">&#x1F9EA;</span></button>' +
    '<div class="output" id="out-smoke"></div>' +
    '</div></div>' +

    // Step 2: Ingest menu
    '<div class="card">' +
    '<div class="card-head"><h2>Step 2 &mdash; Ingest Menu</h2></div>' +
    '<div class="card-body">' +
    '<p class="note">Chunks all menu items, embeds via Cloudflare AI, and upserts to Vectorize. Stores raw JSON in R2. Uses the built-in Waters Edge menu if no custom data has been uploaded.</p>' +
    '<button class="step-btn green" onclick="run(\"out-menu\",\"/api/content/ingest/menu\",\"POST\",{})">Ingest Menu &rarr; Vectorize <span class="step-icon">&#x1F37D;&#xFE0F;</span></button>' +
    '<div class="output" id="out-menu"></div>' +
    '</div></div>' +

    // Step 3: Ingest wine
    '<div class="card">' +
    '<div class="card-head"><h2>Step 3 &mdash; Ingest Wine List</h2></div>' +
    '<div class="card-body">' +
    '<p class="note">Writes wine items to D1, embeds descriptions and pairings, upserts to Vectorize. Uses the built-in Waters Edge starter wine list.</p>' +
    '<button class="step-btn teal" onclick="run(\"out-wine\",\"/api/content/ingest/wine\",\"POST\",{})">Ingest Wine List &rarr; Vectorize <span class="step-icon">&#x1F377;</span></button>' +
    '<div class="output" id="out-wine"></div>' +
    '</div></div>' +

    // Step 4: Semantic search test
    '<div class="card">' +
    '<div class="card-head"><h2>Step 4 &mdash; Test Semantic Search</h2></div>' +
    '<div class="card-body">' +
    '<p class="note">Embeds your query and searches Vectorize. Falls back to D1 keyword search. Mode: semantic or keyword shows which path fired.</p>' +
    '<div class="search-row">' +
    '<input id="search-q" placeholder="e.g. what wine goes with salmon" type="text">' +
    '<button onclick="runSearch()">Search</button>' +
    '</div>' +
    '<div class="output" id="out-search"></div>' +
    '</div></div>' +

    // Step 5: View ingested documents
    '<div class="card">' +
    '<div class="card-head"><h2>Step 5 &mdash; View Ingested Documents</h2></div>' +
    '<div class="card-body">' +
    '<p class="note">Lists all content documents ingested into D1 for this slug.</p>' +
    '<button class="step-btn amber" onclick="run(\"out-docs\",\"/api/content/documents\",\"GET\",undefined)">List Documents <span class="step-icon">&#x1F4C2;</span></button>' +
    '<div class="output" id="out-docs"></div>' +
    '</div></div>' +

    // Step 6: Full pipeline status
    '<div class="card">' +
    '<div class="card-head"><h2>Step 6 &mdash; Full Pipeline Status</h2></div>' +
    '<div class="card-body">' +
    '<button class="step-btn gray" onclick="run(\"out-status\",\"/api/pipeline/status\",\"GET\",undefined)">Refresh Status <span class="step-icon">&#x1F504;</span></button>' +
    '<div class="output" id="out-status"></div>' +
    '</div></div>' +

    '</div>' +
    '<script>' + js + '<\/script>' +
    '</body></html>';

  return h(html);
}
