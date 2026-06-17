# Al Trote Marr!

A personal, multi-tenant running training tracker. Next.js 16 on Vercel, MongoDB Atlas via the native driver, Google sign-in restricted to an allowlist, installable as a PWA.

This is the **foundation**: data layer, seed, auth, API, and a home screen that shows today's session. The logging loop, the calendar, and the dashboard are built next in Claude Code.

## Continue in Claude Code

Open this repo in Claude Code and start with the kickoff prompt in `docs/PROMPTS.md`. The agent should read these first, in order:

1. `CLAUDE.md` — stack, hard rules, conventions, file map
2. `docs/ARCHITECTURE.md` — data model, API, and exact stat formulas
3. `docs/DESIGN.md` — palette and type tokens, UI principles
4. `docs/ROADMAP.md` — phased build plan with acceptance criteria

Build one roadmap phase per session.

## Stack

- Next.js 16 (App Router, TypeScript)
- MongoDB Atlas, native `mongodb` driver, cached client for serverless
- Auth.js v5 (Google, allowlist gate, JWT sessions)
- Tailwind CSS v4 (tokens in `app/globals.css`)
- Recharts (for the dashboard)

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in. `npx auth secret` writes `AUTH_SECRET`. Create a Google OAuth client (Web); local redirect URI `http://localhost:3000/api/auth/callback/google`.
3. Seed your plan: `npm run seed` (Node 22+).
4. `npm run dev`, sign in with `nestor.daza@gmail.com`.

## Deploy to Vercel

1. Push to GitHub, import in Vercel.
2. Add every `.env.local` variable to the Vercel project.
3. Add the Vercel callback URL to the Google OAuth client.
4. Deploy, then run the seed once against the same Atlas database.
5. On your phone: open the URL, then Add to Home Screen (Safari) or Install app (Chrome).

Online-only by design. It still installs to the home screen and runs standalone.
