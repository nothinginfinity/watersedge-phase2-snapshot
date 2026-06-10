# watersedge-phase2-snapshot

Blank multi-tenant demo worker. All content driven from shared `afo-demo-db` D1 database.

## How it works

Each demo deployment sets `DEMO_SLUG` in `wrangler.toml`. All D1 reads/writes are scoped to that slug.

## D1 Schema

- `tenants` — slug, name, vertical, source_url
- `demo_content` — (slug, section) → JSON data
- `demo_leads` — contact form submissions per slug
- `demo_snapshots` — pre-rendered HTML per slug

## Sections

- `contact` — company name, phone, address, hours, tagline, hero_image, colors
- `services` — array of {id, name, desc}
- `testimonials` — array of {name, role, quote}

## Routes

- `GET /` — homepage (snapshot or live render)
- `POST /api/publish` — rebuild snapshot
- `POST /api/lead` — contact form submission
- `GET /api/status` — health + stats
- `GET /api/content` — all content sections

## Cloning a new demo

1. Clone this worker repo
2. Set `DEMO_SLUG` to the new demo slug (e.g. `watersedge`)
3. Run `inject_business_data` with `tenant_slug: "watersedge"`
4. Demo is live
