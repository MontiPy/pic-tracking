# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router (pages, API routes, layouts). Start at `app/page.tsx`.
- `components/`: UI, forms, layout primitives (prefer PascalCase component files).
- `prisma/`: database schema (`schema.prisma`), local SQLite `dev.db`, and `seed.ts`.
- `public/`: static assets.
- `.env`: local configuration (DB URL for Prisma). Do not commit secrets.
- Reference docs: `supplier_task_manager_design.md`, `CLAUDE.md`, and the PDF for domain intent.

## Build, Test, and Development Commands
- Install deps: `npm ci` (or `npm install`).
- Dev server: `npm run dev` (Next.js with Turbopack).
- Lint: `npm run lint` (ESLint via Next).
- Build/Start: `npm run build` and `npm run start`.
- Database: `npm run db:generate` (Prisma client), `npm run db:push` (apply schema), `npm run db:seed`, `npm run db:studio`.

## Coding Style & Naming Conventions
- Language: TypeScript, indentation 2 spaces.
- Components: PascalCase (`components/SupplierCard.tsx`). Routes/pages: `page.tsx`, API `route.ts`.
- Modules/utilities: `camelCase.ts`; keep co-located where usage is local.
- Styling: Tailwind CSS; prefer utility-first with small, focused components.
- Use ESLint rules from `eslint.config.mjs`; do not suppress without rationale.

## Testing Guidelines
- Testing not yet configured; when adding, prefer Vitest for unit tests (`*.test.ts`) and Playwright for e2e.
- Co-locate tests next to code or mirror folder in `tests/`.
- Aim to cover due-date synchronization, task workflows, and API contracts.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat: sync task due dates`).
- PRs: focused scope, description with what/why, linked issues, and verification steps; include screenshots/GIFs for UI.
- Update docs when behavior or schema changes.

## Architecture Overview
- Domain: Suppliers → Projects → TaskTypes → TaskTemplates → TaskInstances.
- Canonical due dates live on TaskTemplates; instances inherit and stay synchronized across suppliers.

## Security & Configuration Tips
- Keep `.env` local; provide `.env.example` if adding new vars.
- Use Prisma with SQLite for dev; rotate to managed DB for prod.
- Avoid PII in logs; validate inputs at API boundaries (Zod + Prisma).
