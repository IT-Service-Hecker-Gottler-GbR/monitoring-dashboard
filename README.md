# IT-Service HG Suite

The internal management suite for **IT-Service HG** — a single Next.js app combining website/uptime **monitoring** with full **project management** (projects, tasks, clients, time tracking and invoicing) behind one login.

Built with **Next.js 16**, **React 19**, **Prisma 7** (SQLite via the better-sqlite3 driver adapter), **next-auth v5**, **Tailwind CSS v4**, and **shadcn/ui**.

## Features

- **Monitoring** — track customer domains, uptime/SSL checks, and latency.
- **Projects** — status, budget, and per-project task progress.
- **Tasks** — a Kanban board (To Do / In Progress / Done) with priority and due dates.
- **Clients** — the people and companies you work with.
- **Time tracking** — log billable/non-billable hours against projects and tasks.
- **Invoices** — line items, draft/sent/paid status, and outstanding balances.

## Getting started

```bash
npm install
npx prisma db push   # sync schema to the SQLite database (dev.db)
npm run db:seed      # optional: seed an admin user + sample data
npm run dev          # http://localhost:3000
```

Default seeded login: **admin@it-service-hg.de** / **admin123**.

## Notes

- The SQLite database is `dev.db` at the project root. `DATABASE_URL` in `.env` pins an absolute path so the Prisma CLI and the runtime adapter target the same file. Use `prisma db push` for additive schema changes.
- Mutations use **Next.js Server Actions** (`src/lib/actions.ts` for monitoring, `src/lib/pm-actions.ts` for project management) — no separate API layer.
- Auth and route protection: `src/lib/auth.ts`, `src/lib/auth.config.ts`, and `src/middleware.ts` guard everything under `/dashboard`.

## Structure

```
prisma/schema.prisma     # data model (monitoring + project management)
src/app/dashboard/       # monitoring + projects, clients, time, invoices
src/lib/pm-actions.ts    # project-management server actions
src/lib/actions.ts       # monitoring server actions
src/components/           # shared UI (shadcn/ui + suite components)
```
