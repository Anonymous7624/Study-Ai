# ClassPilot

AI-powered school copilot. Organize assignments, connect Google Classroom & Drive, upload files manually, and get assignment-specific AI help.

## Quick Start (Local Development)

1. **Prerequisites**: Node.js 20+, MongoDB running locally
2. **Install**: `npm install`
3. **Environment**: Copy `.env.example` to `.env.local` and set `MONGODB_URI`, `JWT_SECRET` (required for auth)
4. **Run**: `npm run dev`
5. **Create account** at `/create-account` or use `npm run seed:user` to create a dev user
6. **Sign in** at `/sign-in`

### Optional: Seed demo data

- `npm run seed:user` – Create dev user (dev@classpilot.local / devuser / DevPass123!)
- `npm run seed` – Seed demo courses and assignments (requires a user; run seed:user or create account first)

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, server actions, MongoDB + Mongoose
- **Auth**: JWT (httpOnly cookies), bcryptjs, zod
- **AI**: Ollama-compatible API (default: deepseek-r1:7b)

## Pages

- `/` – Homepage
- `/sign-in` – Sign in (email or username)
- `/create-account` – Create account
- `/dashboard` – Assignments, stats, empty-state onboarding
- `/workspace/[id]` – Assignment workspace with AI help
- `/settings` – Profile, preferences, Google connections, file uploads

## Scripts

- `npm run dev` – Development server
- `npm run build` – Production build
- `npm run seed:user` – Create dev user
- `npm run seed` – Seed demo courses and assignments (run seed:user first or create account)
