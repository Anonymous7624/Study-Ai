# ClassPilot

AI-powered school copilot for local development. Syncs Google Classroom, detects hidden deadlines, ranks assignments, and provides assignment-specific tutoring help.

## Quick Start (Local Development)

1. **Prerequisites**: Node.js 20+, MongoDB running locally
2. **Install**: `npm install`
3. **Environment**: Copy `.env.example` to `.env.local` and set `MONGODB_URI` if needed
4. **Seed user**: `npm run seed:user` (creates Ldawg / Password)
5. **Seed data**: `npm run seed` (creates demo courses, assignments, posts)
6. **Run**: `npm run dev`
7. **Sign in** at `/sign-in` with username `Ldawg`, password `Password`

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js server actions and route handlers
- **Database**: MongoDB + Mongoose
- **AI**: Ollama-compatible API (default: deepseek-r1:7b)

## Pages

- `/` – Homepage
- `/sign-in` – Sign in (Ldawg / Password)
- `/dashboard` – Ranked assignments, stats, quick start
- `/workspace/[id]` – Assignment workspace with AI help
- `/settings` – Profile, sort preference, model config, theme

## Scripts

- `npm run dev` – Development server
- `npm run build` – Production build
- `npm run seed:user` – Create seed user
- `npm run seed` – Seed courses, assignments, posts (run seed:user first)
