# DIAN

Document Intelligence and Archive Network — an AI-powered document retrieval assistant for government administrative staff.

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL (local install, running on port 5432)

## Installation

```bash
pnpm install
```

## Environment Setup

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

| Variable       | Description                                                                            |
| -------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://USER:PASSWORD@localhost:5432/dian_db` |
| `AUTH_SECRET`  | Random secret for JWT signing — generate with `openssl rand -base64 32`                |
| `AUTH_URL`     | Base URL of the app, e.g. `http://localhost:3000`                                      |

## Database Setup

Create the database, apply migrations, and seed the default admin user:

```bash
createdb dian_db
pnpm db:migrate
```

This runs `prisma migrate deploy` and `prisma db seed` in sequence.

Default admin credentials (set in `prisma/seed.ts`):

| Field    | Value      |
| -------- | ---------- |
| Username | `admin`    |
| Password | `admin123` |

## Running the Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You will be redirected to `/login`.

## Other Commands

| Command               | Description                                       |
| --------------------- | ------------------------------------------------- |
| `pnpm build`          | Production build                                  |
| `pnpm lint`           | Run ESLint                                        |
| `pnpm format`         | Auto-format all files with Prettier               |
| `pnpm format:check`   | Check formatting without writing                  |
| `pnpm db:migrate:dev` | Create a new Prisma migration during development  |
| `pnpm db:studio`      | Open Prisma Studio to inspect the database        |
| `pnpm db:generate`    | Regenerate the Prisma client after schema changes |
