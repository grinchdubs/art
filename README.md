# Art Catalog

A self-hosted cataloging application for an artist's body of work: physical artworks,
digital/NFT works, exhibitions, series, sales, editions, provenance, and publications —
plus a public portfolio view and PDF portfolio builder.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, React Router 7, Recharts, `qrcode` |
| Backend | Node 20, Express 4, `pg`, `multer`, `pdfkit` |
| Database | PostgreSQL 15 |
| Infra | Docker Compose, nginx, GitHub |

## Features

- **Physical works** — artworks, images, tags, series/collections, exhibitions, provenance
  (ownership + transfer history), location history, print editions
- **Digital works** — digital/NFT works with metadata matching and YouTube/Vimeo embedding
- **Media** — image gallery, batch upload, lightbox, Immich integration
- **Business** — sales records, reports/analytics, artist statements, portfolio builder (PDF)
- **System** — CSV import/export, spreadsheet editor, backup/restore, QR codes
- **Public** — read-only public portfolio gallery

## Repository layout

```
src/                 React frontend (pages, components, utils)
backend/             Express API
  src/routes/        API route modules
  src/migrations/    SQL migrations
docker-compose.yml       Production stack (art-catalog-prod)
docker-compose.dev.yml   Development stack (art-catalog-dev)
deploy-prod.sh           Pull + rebuild + migrate (production)
deploy-dev.sh            Pull + rebuild + migrate (development)
nginx.conf / nginx.dev.conf
```

## Local development

```bash
# Backend
cd backend
npm install
npm run dev            # http://localhost:3002

# Frontend (separate terminal, from repo root)
npm install
npm run dev            # http://localhost:3333
```

The backend needs a PostgreSQL database (see `backend/.env.example`).

## Deployment

Production runs on **`grnchai`** at `/opt/art/art-catalog`, alongside an isolated dev stack.

| | Frontend | Backend | DB (host) |
|---|---|---|---|
| Production | `grnchai:3333` | `grnchai:3002` | `grnchai:5434` |
| Development | `grnchai:3334` | `grnchai:3003` | `grnchai:5433` |

```bash
ssh grnchai "cd /opt/art/art-catalog && ./deploy-dev.sh"   # test in dev
ssh grnchai "cd /opt/art/art-catalog && ./deploy-prod.sh"  # promote to prod
```

Both scripts pull `main`, rebuild, and run the SQL migrations. See
[DEV-DEPLOYMENT.md](DEV-DEPLOYMENT.md) for details.

## Documentation

- [CLAUDE.md](CLAUDE.md) — project guide, feature status, and conventions
- [DEV-DEPLOYMENT.md](DEV-DEPLOYMENT.md) — dev/prod environments
- [TECHNICAL-STACK.md](TECHNICAL-STACK.md) — architecture deep dive
- [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) — roadmap and future phases
- [SETUP.md](SETUP.md) — detailed setup and PostgreSQL migration notes
