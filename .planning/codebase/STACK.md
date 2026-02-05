# Technology Stack

**Analysis Date:** 2026-02-05

## Languages

**Primary:**
- TypeScript 5.x - Full application codebase (React components, Next.js server/API routes, utilities)
- JavaScript - Build configuration and scripts

**Secondary:**
- SQL - PostgreSQL queries via Prisma ORM

## Runtime

**Environment:**
- Node.js (version not explicitly pinned in package.json, inferred from Next.js 16.x support)

**Package Manager:**
- Yarn 1.22.22
- Lockfile: `yarn.lock` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack web framework (App Router, API routes, server actions)
- React 18.3.1 - UI library with React DOM 18.3.1

**Testing:**
- Not detected - No test framework configured (Jest, Vitest, etc.)

**Build/Dev:**
- TypeScript 5.x - Type checking
- ESLint 9.x - Code linting (via `eslint-config-next`)
- PostCSS 8.5.6 - CSS processing
- Tailwind CSS 4.1.18 - Utility-first CSS framework with `@tailwindcss/postcss` 4.1.18
- Autoprefixer 10.4.24 - CSS vendor prefixing

**UI Components:**
- shadcn 3.8.2 - Component CLI tool for installing Radix UI components

## Key Dependencies

**Critical:**
- `@prisma/client` 6.5.0 - PostgreSQL ORM and database client
- `ai` 6.0.69 - Vercel AI SDK for LLM integration and tool calling
- `@ai-sdk/openai` 3.0.25 - OpenAI provider for Vercel AI SDK (models: gpt-4o-mini)
- `@ai-sdk/google` 3.0.20 - Google Generative AI provider for Vercel AI SDK (models: gemini-2.5-flash)
- `zod` 3.25.76 - Runtime schema validation for API parameters and data structures

**UI Component System:**
- Radix UI components:
  - `@radix-ui/react-accordion` 1.2.12
  - `@radix-ui/react-avatar` 1.1.11
  - `@radix-ui/react-checkbox` 1.3.3
  - `@radix-ui/react-dialog` 1.1.15
  - `@radix-ui/react-dropdown-menu` 2.1.16
  - `@radix-ui/react-label` 2.1.8
  - `@radix-ui/react-popover` 1.1.15
  - `@radix-ui/react-progress` 1.1.8
  - `@radix-ui/react-radio-group` 1.3.8
  - `@radix-ui/react-select` 2.2.6
  - `@radix-ui/react-separator` 1.1.8
  - `@radix-ui/react-slot` 1.2.4
  - `@radix-ui/react-switch` 1.2.6
  - `@radix-ui/react-tabs` 1.1.13
  - `@radix-ui/react-tooltip` 1.2.8

**Document Generation:**
- `pdf-lib` 1.17.1 - PDF creation and manipulation (used in `src/app/api/recibo/route.ts` and `src/app/api/relatorios/vendas/pdf/route.ts`)
- `papaparse` 5.5.3 - CSV parsing for data import

**Data Visualization:**
- `recharts` 3.7.0 - React charting library

**Utilities:**
- `clsx` 2.1.1 - Conditional className utility
- `tailwind-merge` 3.4.0 - Merge Tailwind CSS classes intelligently
- `date-fns` 4.1.0 - Date manipulation and formatting (localized to pt-BR)
- `uuid` 10.0.0 - UUID generation (v4 and v7 for sales)
- `class-variance-authority` 0.7.1 - Component variant management
- `nuqs` 2.8.8 - Next.js URL state management
- `tw-animate-css` 1.4.0 - Tailwind animation utilities
- `tailwindcss-animate` 1.0.7 - Tailwind animation plugins
- `lucide-react` 0.563.0 - Icon library
- `jose` 6.1.3 - JWT creation and verification for session management
- `openai` 4.91.0 - OpenAI REST client (fallback/legacy support)
- `@google/generative-ai` 0.21.0 - Google Generative AI REST client (legacy support)
- `@google/genai` 0.7.0 - Newer Google Generative AI library

**Development-only:**
- `ts-node` 10.9.2 - TypeScript execution and REPL
- `tsx` 4.21.0 - TypeScript executor for scripts
- `better-sqlite3` 12.6.2 - SQLite for database seeding/migration scripts
- `cross-env` 7.0.3 - Cross-platform environment variable setting

**Optional (Linux-specific):**
- `lightningcss-linux-x64-gnu` 1.30.2 - CSS parser optimization
- `@tailwindcss/oxide-linux-x64-gnu` 4.1.18 - Tailwind CSS engine optimization

## Configuration

**Environment:**
- `DATABASE_URL` - PostgreSQL connection string (required)
- `SESSION_SECRET` - JWT signing key for session tokens (required, recommended: change from default)
- `NEXT_PUBLIC_APP_URL` - Public application URL for links in PDFs and API responses (used in `src/lib/ai.ts`, `src/app/api/recibo/route.ts`)
- Config file: `.env.example` provides template with minimal required variables

**Build:**
- `next.config.ts` - Next.js configuration with `output: "standalone"` for containerized deployments
- `tsconfig.json` - TypeScript compiler options with path alias `@/*` mapping to `./src/*`
- `tailwind.config.ts` - Tailwind CSS configuration with theme extensions and dark mode support
- `postcss.config.js` - PostCSS configuration for Tailwind processing
- `prisma.config.ts` - Prisma configuration (basic TypeScript config)

**Code Quality:**
- `eslint.config.mjs` - ESLint configuration extending `eslint-config-next` with core-web-vitals and TypeScript support

**Database:**
- `prisma/schema.prisma` - ORM schema defining all database models (PostgreSQL provider)
- `prisma/seed.js` - Database seeding script (referenced in package.json scripts)
- `prisma/import_sqlite.js` - SQLite to PostgreSQL migration script (referenced in package.json)

## Platform Requirements

**Development:**
- Node.js (compatible with Next.js 16.x, TypeScript 5.x)
- PostgreSQL database (required, schema managed by Prisma migrations)
- Yarn 1.22.22 as package manager
- Text editor/IDE with TypeScript support

**Production:**
- Docker/containerized environment (standalone output mode)
- PostgreSQL database
- Node.js runtime
- Environment variables: `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`
- For AI features: OpenAI API key or Google Generative AI API key in database config

**Feature Support:**
- AI capabilities: OpenAI (gpt-4o-mini) or Google Gemini (gemini-2.5-flash) APIs
- File uploads: Local filesystem storage in `public/uploads/productos` directory
- PDF generation: Supported natively via `pdf-lib`
- CSV import: Supported via `papaparse`

---

*Stack analysis: 2026-02-05*
