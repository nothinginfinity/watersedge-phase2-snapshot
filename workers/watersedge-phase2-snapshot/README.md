# watersedge-phase2-snapshot

**Phase 3C complete — retrieval-grounded chat, full data pipeline live.**

## Live URLs
- Site: https://watersedge-phase2-snapshot.jaredtechfit.workers.dev/
- Admin: https://watersedge-phase2-snapshot.jaredtechfit.workers.dev/admin
- Pipeline control: https://watersedge-phase2-snapshot.jaredtechfit.workers.dev/admin/pipeline

## Pipeline activation (do once, from /admin/pipeline)
1. Smoke Test — verify all layers
2. Ingest Menu — menu items → D1 → CF AI embed → Vectorize
3. Ingest Wine — wine list → D1 → CF AI embed → Vectorize
4. Test Semantic Search — verify retrieval is live

## Storage bindings
- D1: `afo-demo-db`
- KV: `afo-demo-kv`
- R2: `afo-demo-assets`
- Vectorize: `watersedge-afo-vector` (768d cosine)
- AI: `@cf/baai/bge-base-en-v1.5`

## Source repo (active development)
https://github.com/nothinginfinity/watersedge-demo-feature-lab

## Snapshot taken from
https://github.com/nothinginfinity/watersedge-phase2-snapshot at Phase 2 completion.
