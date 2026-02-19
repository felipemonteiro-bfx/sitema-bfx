# Technology Stack

**Analysis Date:** 2026-02-19

## Languages

**Primary:**
- TypeScript 5 - All source code (`src/**/*.ts`, `src/**/*.tsx`)
- JavaScript - Build config, scripts, and Node scripts

**Secondary:**
- CSS - Styling via Tailwind CSS (defined in component files)

## Runtime

**Environment:**
- Node.js 20 (specified in Docker images `node:20-bullseye-slim`)

**Package Manager:**
- Yarn 1.22.22
- Lockfile: `.pnp.cjs` and `.pnp.loader.mjs` (Yarn PnP enabled)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 18.3.1 - UI library

**UI Components:**
- shadcn/ui - Component library (25+ components installed)
- Radix UI - Headless primitives (`@radix-ui/react-*` 12+ packages)
- Lucide React 0.563.0 - Icon library

**Form & Validation:**
- React Hook Form 7.71.1 - Form state management
- @hookform/resolvers 5.2.2 - Schema validation bridge
- Zod 4.3.6 - Schema validation and TypeScript-first validation

**Styling:**
- Tailwind CSS 4.1.18 - Utility-first CSS framework
- @tailwindcss/postcss 4.1.18 - PostCSS plugin
- Tailwind Merge 3.4.0 - Utility class conflict resolution
- Tailwindcss Animate 1.0.7 - Animation utilities
- tw-animate-css 1.4.0 - Additional animations

**Date & Time:**
- date-fns 4.1.0 - Date manipulation and formatting

**Charts & Visualization:**
- Recharts 3.7.0 - React charting library

**AI & ML:**
- ai 6.0.69 - Vercel AI SDK
- @ai-sdk/openai 3.0.25 - OpenAI integration
- @ai-sdk/google 3.0.20 - Google Generative AI integration
- openai 4.91.0 - Direct OpenAI SDK
- @google/generative-ai 0.21.0 - Google Generative AI SDK
- @google/genai 0.7.0 - Alternative Google AI SDK

**Database:**
- @prisma/client 6.5.0 - Database ORM/query builder

**Utilities:**
- uuid 10.0.0 - UUID generation (v10.0.0)
- class-variance-authority 0.7.1 - Variant pattern for components
- clsx 2.1.1 - Conditional className helper
- papaparse 5.5.3 - CSV parsing
- pdf-lib 1.17.1 - PDF generation
- nuqs 2.8.8 - URL query state management
- next-themes 0.4.6 - Dark mode theme provider
- jose 6.1.3 - JWT handling

**Dev & Build Tools:**
- Prisma 6.5.0 - Database toolkit and migration CLI
- TypeScript 5 - Type checking
- ESLint 9 - Linting (`eslint-config-next 16.1.6`)
- Autoprefixer 10.4.24 - CSS vendor prefix auto-add
- PostCSS 8.5.6 - CSS transformation
- shadcn (CLI) 3.8.2 - Component scaffolding
- ts-node 10.9.2 - TypeScript execution
- tsx 4.21.0 - TypeScript execution
- cross-env 7.0.3 - Cross-platform env variable setting
- better-sqlite3 12.6.2 - SQLite database (optional)

## Configuration

**Environment:**
- Environment variables defined via `.env` file
- Example provided in `.env.example`:
  - `DATABASE_URL` - PostgreSQL connection string
  - `SESSION_SECRET` - JWT session signing key
  - `NEXT_PUBLIC_APP_URL` - Public application URL

**Build:**
- `next.config.ts` - Next.js configuration (standalone output mode)
- `tsconfig.json` - TypeScript compiler configuration with `@/*` path alias
- `tailwind.config.ts` - Tailwind CSS configuration (dark mode via class)
- `eslint.config.mjs` - ESLint configuration with Next.js best practices
- `postcss.config.js` - PostCSS plugins
- `prisma/schema.prisma` - Database schema definition
- `components.json` - shadcn/ui component configuration

## Platform Requirements

**Development:**
- Node.js 20+
- Yarn 1.22.22
- PostgreSQL 16+ (in Docker: `postgres:16-alpine`)
- Optional: SQLite (via better-sqlite3)

**Production:**
- Node.js 20
- PostgreSQL 16+
- 3000 port exposure (configurable via `PORT` env var)
- 512MB+ RAM recommended (Next.js + Prisma)

## Docker Support

**Development:**
- `Dockerfile.dev` - Development image with hot reload
- Multi-stage build for dependencies isolation
- Volume mounts for live code changes

**Production:**
- `Dockerfile` - Multi-stage production build (deps → builder → runner)
- Standalone mode enabled for smaller production footprint
- Automatic database migrations on startup

**Compose:**
- `docker-compose.yml` - PostgreSQL (port 5432) + Next.js app (port 3000)
- Named volume `bfx_pg` for persistent data

## Key Dependencies Summary

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| **Web Framework** | Next.js | 16.1.6 | Full-stack React framework |
| **UI Library** | React | 18.3.1 | Component library |
| **Form Validation** | React Hook Form + Zod | 7.71.1 + 4.3.6 | Form state + validation |
| **Database** | Prisma | 6.5.0 | ORM and migrations |
| **Database Engine** | PostgreSQL | 16 | Primary database |
| **AI/LLM** | @ai-sdk (OpenAI + Google) | 3.0+ | LLM integration |
| **Styling** | Tailwind CSS | 4.1.18 | Utility CSS framework |
| **Components** | shadcn/ui + Radix | Latest | Accessible component library |
| **Authentication** | jose + next cookies | 6.1.3 | JWT session management |

## Build Output

- **Bundle Target:** ES2017
- **Module Resolution:** Bundler mode (ESM)
- **Output Mode:** Next.js standalone (no Node.js server required in production)
- **Turbopack:** Disabled in production (`NEXT_DISABLE_TURBOPACK=1`)

## Telemetry

- Next.js telemetry disabled (`NEXT_TELEMETRY_DISABLED=1`)

---

*Stack analysis: 2026-02-19*
