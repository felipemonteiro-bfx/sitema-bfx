# Technology Stack

**Analysis Date:** 2026-08-03

## Languages

**Primary:**
- TypeScript 5 - Application source code in `src/`
- JavaScript - Config files and build scripts
- SQL - PostgreSQL schemas and migrations in `prisma/`

**Secondary:**
- Bash - Deployment scripts and environment setup
- YAML - Kubernetes manifests in `deploy/bfx/`

## Runtime

**Environment:**
- Node.js (version not pinned in codebase; inferred from next.config.ts and package.json setup)

**Package Manager:**
- Yarn 1.22.22 (declared in package.json)
- npm (package-lock.json also present as fallback)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router (`src/app/`, `next.config.ts`)
- React 18.3.1 - UI component library
- Tailwind CSS 4.1.18 - Utility-first styling (`tailwind.config.ts`)
- shadcn/ui 3.8.2 - Headless UI component library (Radix UI primitives + Tailwind)

**Backend/ORM:**
- Prisma 6.5.0 - TypeScript ORM for PostgreSQL (`prisma/schema.prisma`, `src/generated/prisma`)

**Form & Validation:**
- React Hook Form 7.71.1 - Form state management
- Zod 4.3.6 - Schema validation (used in `src/env.ts` for env vars)

**UI/Visualization:**
- Recharts 3.7.0 - Data visualization charts
- Lucide React 0.563.0 - Icon library
- Sonner 2.0.7 - Toast notifications
- React Markdown 10.1.0 - Markdown rendering (custom parser, no remark-gfm)

**Testing:**
- Vitest 4.1.2 - Unit and integration test runner (config: `vitest.config.ts`)

**Build/Dev:**
- TypeScript Compiler (via tsconfig.json, ES2017 target)
- PostCSS 8.5.6 - CSS processing (config: `postcss.config.js`)
- ESLint 9 - Code linting (config: `eslint.config.mjs`, extends Next.js config)
- Tailwind CSS Oxide (optional Linux dependency) - Native CSS compiler

**Utilities:**
- date-fns 4.1.0 - Date/time manipulation
- uuid 10.0.0 - UUID generation
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.4.0 - Tailwind class merging
- papaparse 5.5.3 - CSV parsing
- pdf-lib 1.17.1 - PDF generation
- jose 6.1.3 - JWT utilities for sessions
- react-day-picker 9.13.2 - Date picker component
- next-themes 0.4.6 - Theme switching (light/dark mode)
- nuqs 2.8.8 - Query string state management
- class-variance-authority 0.7.1 - CSS-in-JS type-safe variants
- cmdk 1.1.1 - Command menu/palette
- tw-animate-css 1.4.0 - Animation utilities

**AI/LLM:**
- @ai-sdk/google 3.0.20 - Vercel AI SDK for Google Generative AI
- @ai-sdk/openai 3.0.25 - Vercel AI SDK for OpenAI
- ai 6.0.69 - Vercel AI SDK core (generateText, tool definitions)
- @google/generative-ai 0.21.0 - Google Gemini direct SDK
- @google/genai 0.7.0 - Alternative Google AI SDK
- openai 6.22.0 - OpenAI API client

**AWS/Cloud:**
- @aws-sdk/client-s3 3.998.0 - AWS S3 client (used for MinIO compatibility in `src/lib/minio.ts`)

**Database Utilities:**
- better-sqlite3 12.6.2 - Synchronous SQLite (dev/script use)
- tsx 4.21.0 - TypeScript executor for scripts
- ts-node 10.9.2 - TypeScript Node.js loader

## Configuration

**Environment:**
- `.env.example` present (secrets template, never read contents)
- Environment validation via `src/env.ts` using Zod
- Required vars: `DATABASE_URL`, `SESSION_SECRET`
- Optional integrations configured via env vars (see INTEGRATIONS.md)

**Build:**
- `next.config.ts` - Standalone output, image remotePatterns for MinIO, server actions body limit (10MB)
- `tsconfig.json` - ES2017 target, strict mode, path aliases (`@/*` → `./src/*`)
- `vitest.config.ts` - Test framework setup
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS pipeline (Tailwind)
- `eslint.config.mjs` - ESLint flat config extending Next.js
- `components.json` - shadcn/ui component registry

## Platform Requirements

**Development:**
- Node.js runtime
- PostgreSQL database (via docker compose: `db:start`)
- MinIO (optional, via docker: `db:minio`)
- Evolution API (optional Docker container: `evolution:up`)

**Production:**
- Kubernetes cluster (AWS EKS implied by ECR sa-east-1)
- PostgreSQL 16 (StatefulSet: `bfx-db`)
- Optional: MinIO/S3-compatible storage (configured via env)
- Optional: Evolution API service (separate deployment)
- Container registry: AWS ECR sa-east-1 (`730335375436.dkr.ecr.sa-east-1.amazonaws.com/bfx/bfx-shop`)

---

*Stack analysis: 2026-08-03*
