# AGENTS.md

Guidance for AI agents and automated tools working in this repository.

## Project Overview

**StraightUp** is a vibe-based connection app where users post expiring moods, resonate with others, get matched, and message their matches. Built with Next.js 14 (App Router), PostgreSQL, and OpenAI GPT-3.5.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (Node.js) |
| Database | PostgreSQL (raw `pg` queries, no ORM) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| AI | OpenAI GPT-3.5-turbo (vibe classification, content moderation) |

## Repository Structure

```
app/
  api/              # Next.js API route handlers
    auth/           # signup, login, me
    moods/          # create mood, get feed
    resonates/      # resonate with a mood
    matches/        # get active matches
    messages/       # send/get messages
    stats/          # app statistics
    health/         # health check endpoint
  app/              # Protected app pages
  auth/             # Login / signup pages
components/         # Reusable React components (Button, Alert, VibeCard, LoadingSpinner)
hooks/              # Custom React hooks
lib/
  ai.ts             # OpenAI: classifyMood, moderateContent, calculateVibeCompatibility
  auth.ts           # JWT helpers
  db.ts             # PostgreSQL pool (uses DATABASE_URL)
  types.ts          # Shared TypeScript types (User, Mood, Match, Message, Vibe, etc.)
  api.ts            # Client-side fetch helpers
  utils.ts          # General utilities
  vibes.ts          # Vibe metadata / display helpers
  dates.ts          # Date formatting helpers
  string.ts         # String utilities
database/
  schema.sql        # Full DB schema (users, moods, resonates, matches, messages, moderation_flags)
scripts/
  migrate.js        # Runs schema.sql against DATABASE_URL
  seed.js           # Inserts demo data
```

## Development Commands

```bash
npm install           # Install dependencies
npm run dev           # Start Next.js dev server (http://localhost:3000)
npm run build         # Production build
npm run lint          # ESLint via next lint  ← run this before committing
npm run db:migrate    # Apply database schema (scripts/migrate.js)
npm run db:seed       # Seed demo data (scripts/seed.js)
```

**Always run `npm run lint` before committing.** It is the verified CI check.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection (reserved for future use) |
| `JWT_SECRET` | JWT signing secret — must be changed in production |
| `JWT_EXPIRY` | Token lifetime (default `7d`) |
| `OPENAI_API_KEY` | OpenAI API key for vibe classification and moderation |
| `NEXT_PUBLIC_APP_URL` | Frontend base URL |
| `NODE_ENV` | `development` or `production` |

**Never commit real secrets.** Scan modified files for credentials before committing.

## Core Domain Concepts

- **Vibe**: One of `flirty | bored | curious | venting | playful | calm | chaotic`. Automatically classified by OpenAI from mood text.
- **Mood**: A short post that expires in 24 hours. Subject to AI content moderation on creation.
- **Resonate**: A one-way interest signal from a user to a mood.
- **Match**: A mutual connection created when two users resonate with each other's moods. Matches expire and can be extended by both parties.
- **Message**: A DM between matched users, scoped to a match.
- **EnergyTrait**: User profile attribute; one of `calm | funny | direct | low-key | intense | creative | chill | driven`.

## Database

- Raw SQL via the `pg` client — no ORM. DB helpers live in `lib/db.ts`.
- Schema is in `database/schema.sql`. Run `npm run db:migrate` to apply.
- All IDs are UUIDs (`gen_random_uuid()`).
- Moods have an `expires_at` column; feed queries should filter `expires_at > NOW()`.
- The `moderation_flags` table stores AI-flagged content with severity `warning` or `block`.

## API Conventions

- All API routes live under `app/api/` following Next.js App Router conventions (`route.ts` files).
- Auth is JWT-based. Include the token in the `Authorization: ****** header.
- Responses use standard HTTP status codes with JSON bodies.
- Content moderation runs on mood and message creation; flagged content with severity `block` is rejected.

## TypeScript & Styling

- Strict TypeScript. Shared types are defined in `lib/types.ts` — extend there rather than defining local types.
- Tailwind CSS for all styling. Configuration is in `tailwind.config.ts`.
- ESLint config is in `.eslintrc.json` (extends `next/core-web-vitals`).

## CI

GitHub Actions (`.github/workflows/webpack.yml`) runs on push/PR to `main`. It installs dependencies and builds. Lint is the key check to pass locally before opening a PR.

## Guidelines for Agents

1. **Run `npm run lint` after any TypeScript/React change** to confirm no ESLint errors.
2. **Run `npm run build`** to verify the Next.js build succeeds before finalizing changes that touch API routes or page components.
3. **Do not commit secrets.** Check `.env.example` to understand which values are sensitive.
4. **Match existing patterns** — new API routes should follow the structure of existing ones under `app/api/`.
5. **Use `lib/types.ts`** for any shared type definitions rather than duplicating types locally.
6. **Use `lib/db.ts`** for all database access (the existing `pg` pool).
7. **Use `lib/ai.ts`** for all OpenAI calls — do not instantiate a new `OpenAI` client elsewhere.
8. **Vibe values are a closed set** — only the seven values defined in `Vibe` type are valid; do not add new values without updating the DB schema `CHECK` constraint as well.
9. **Moods expire** — always filter by `expires_at > NOW()` when querying the feed.
10. **No ORM** — write raw SQL; keep queries in the API route or a dedicated lib helper.
