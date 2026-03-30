# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript 5+ - Full codebase (backend API routes, server components, utilities)
- JavaScript - Build configuration, scripts

**Secondary:**
- SQL - PostgreSQL schema and migrations
- HTML/CSS - Next.js templates and Tailwind styling

## Runtime

**Environment:**
- Node.js 20 (Alpine Linux: `node:20-bullseye-slim`)
- corepack with Yarn enabled in Dockerfile

**Package Manager:**
- Yarn 1.22.22
- Lockfile: `yarn.lock` (present)

## Frameworks

**Core:**
- Next.js 16.1.6 (App Router) - Full-stack framework with API routes
- React 18.3.1 - UI components and client-side rendering
- Tailwind CSS 4.1.18 - Utility-first styling framework
- Prisma 6.5.0 - ORM for PostgreSQL queries and migrations

**Testing:**
- Not detected in package.json

**Build/Dev:**
- ESLint 9 - Code linting with Next.js config
- PostCSS 8.5.6 - CSS processing pipeline
- AutoPrefixer 10.4.24 - CSS vendor prefixes
- TypeScript 5 - Type checking and compilation
- ts-node 10.9.2 - TypeScript execution for scripts
- tsx 4.21.0 - TypeScript executor for Node.js scripts

**UI Component Library:**
- shadcn/ui (3.8.2) - Radix UI-based component library
- Radix UI primitives (multiple packages) - Accessible component foundation
- class-variance-authority 0.7.1 - Component variant system

## Key Dependencies

**Critical:**
- `@prisma/client` 6.5.0 - Database client and query engine
- `ai` 6.0.69 - Vercel AI SDK for LLM integration and tool definitions

**AI/LLM Providers:**
- `@ai-sdk/google` 3.0.20 - Google Generative AI (Gemini) adapter
- `@ai-sdk/openai` 3.0.25 - OpenAI GPT models adapter
- `@google/generative-ai` 0.21.0 - Google Generative AI SDK
- `openai` 6.22.0 - OpenAI official client

**Infrastructure & Storage:**
- `@aws-sdk/client-s3` 3.998.0 - S3/MinIO client for product image uploads
- `jose` 6.1.3 - JWT encoding/decoding for sessions

**Forms & Validation:**
- `react-hook-form` 7.71.1 - Form state management
- `@hookform/resolvers` 5.2.2 - Form validation schema resolvers
- `zod` 4.3.6 - TypeScript-first schema validation

**UI & Interaction:**
- `lucide-react` 0.563.0 - Icon library
- `sonner` 2.0.7 - Toast notifications
- `react-markdown` 10.1.0 - Markdown rendering
- `react-day-picker` 9.13.2 - Date picker component
- `recharts` 3.7.0 - Charting library
- `cmdk` 1.1.1 - Command palette component
- `nuqs` 2.8.8 - Next.js URL search params management
- `next-themes` 0.4.6 - Dark mode theme management

**Document Generation:**
- `pdf-lib` 1.17.1 - PDF creation and manipulation
- `react-signature-canvas` 1.1.0-alpha.2 - Digital signature capture

**Data Handling:**
- `papaparse` 5.5.3 - CSV parsing
- `date-fns` 4.1.0 - Date utilities
- `uuid` 10.0.0 - UUID generation
- `tailwind-merge` 3.4.0 - Merge Tailwind class names
- `clsx` 2.1.1 - Conditional class composition

**Development Only:**
- `better-sqlite3` 12.6.2 - SQLite for data import scripts
- `cross-env` 7.0.3 - Cross-platform environment variables
- `shadcn` 3.8.2 - Component CLI
- `@tailwindcss/postcss` 4.1.18 - Tailwind CSS processing

## Configuration

**Environment:**

Environment variables are loaded from `.env` or `.env.local` (Next.js standard priority). See `.env.example` for all options:

- `.env` - Local environment (git-ignored)
- `.env.example` - Template with documented variables (committed)

**Build:**

Build configuration files:
- `next.config.ts` - Next.js configuration (output: standalone, image patterns for MinIO/S3)
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript compiler options (ES2017 target, path alias `@/*` → `./src/*`)
- `postcss.config.js` - PostCSS pipeline (Tailwind processing)
- `eslint.config.mjs` - ESLint linting rules (Next.js preset)
- `prisma.config.ts` - Prisma configuration (if custom)

## Platform Requirements

**Development:**
- Node.js 20+
- Yarn package manager
- PostgreSQL 16+ (or Docker PostgreSQL service)
- Optional: MinIO or S3-compatible storage (for product images)
- Optional: Evolution API server (for WhatsApp integration)
- Optional: Asaas account (for payment gateway)
- Optional: Google Generative AI / OpenAI API keys (for AI features)

**Production:**
- Container deployment (Docker image built with multi-stage Dockerfile)
- PostgreSQL 16+ database (persistent StatefulSet in Kubernetes)
- Optional: MinIO or S3-compatible storage
- Optional: Evolution API server
- Kubernetes 1.20+ (with ArgoCD for GitOps deployments)
- `microk8s-hostpath` storage class (or equivalent persistent volume provider)

**Deployment Target:**
- Docker containers (ECR-ready, built via Dockerfile)
- Kubernetes clusters (manifests in `deploy/bfx/`)
- ArgoCD for continuous deployment (Application resources in `deploy/bfx/`)

---

*Stack analysis: 2026-03-30*
