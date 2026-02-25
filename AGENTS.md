# AGENTS.md

## Cursor Cloud specific instructions

### Overview

BFX Manager is a Next.js 16 + PostgreSQL business management system (ERP-lite) for a Brazilian retail operation. It manages clients, products, sales, finances, HR, and reports.

### Tech stack

- **Runtime:** Node.js 20, Yarn 1.22.22
- **Framework:** Next.js 16.1.6 (App Router, React 18, TypeScript)
- **ORM/DB:** Prisma 6 + PostgreSQL 16 (via Docker)
- **UI:** shadcn/ui + Radix UI + Tailwind CSS v4

### Running services

- **PostgreSQL:** `docker compose up -d db` (port 5432, user/pass: postgres/postgres)
- **Dev server:** `yarn dev` (port 3008, binds to 0.0.0.0)
- **Login:** admin / admin (created by `npx prisma db seed`)

### Important caveats

- After running migrations (`npx prisma migrate deploy`), you **must also** run `npx prisma db push` to sync any schema fields that may have been added to `prisma/schema.prisma` without a corresponding migration file. This is a known gap in the repo.
- Prisma client is generated to `src/generated/prisma` (non-default output path). Always run `npx prisma generate` after installing dependencies.
- The CI workflow (`.github/workflows/ci.yml`) uses `continue-on-error: true` for lint — the codebase has pre-existing lint errors/warnings. This is expected.
- The production build (`yarn build`) has a pre-existing TypeScript type error (`Buffer` vs `Uint8Array` in `src/lib/documento-service.ts`). The dev server is not affected.
- The `NEXT_DISABLE_TURBOPACK=1` env var is set in the dev/build scripts via `cross-env`.
- `.env` must have `DATABASE_URL` and `SESSION_SECRET` set. See `.env.example` for all variables.

### Standard commands

See `package.json` scripts and `README.md` for full reference:
- Lint: `yarn lint`
- Dev: `yarn dev`
- Build: `yarn build`
- Migrations: `npx prisma migrate deploy`
- Seed: `npx prisma db seed`
