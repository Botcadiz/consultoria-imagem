# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs Express backend + Vite frontend concurrently)
npm run dev

# Backend only (port 3001)
npm run server

# Frontend only (port 5173)
npx vite

# Production build
npm run build

# Lint
npm run lint

# Deploy to Vercel (Windows requires SSL bypass)
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel --prod
```

## Architecture

This is a full-stack image analysis app. Users upload a face photo and receive an AI-generated "consultoria de imagem" (colorimetry + visagismo) report.

**Frontend:** React + Vite (SPA), served at `/`  
**Backend:** Express server (`server.js` at root), runs locally on port 3001 and on Vercel as a serverless function via `api/server.js`

### Request flow

1. Vite dev server proxies `/api/*` → `localhost:3001` (configured in `vite.config.js`)
2. On Vercel, `vercel.json` rewrites `/api/*` → the serverless function at `api/server.js`, which simply re-exports the Express app from `../server.js`
3. All other routes fall through to `index.html` (SPA routing)

### Authentication

Custom JWT auth (not Supabase Auth). Flow:
- `POST /api/register` → hash password with `bcryptjs` → insert into Supabase `users` table
- `POST /api/login` → compare password → return JWT signed with `JWT_SECRET`
- Protected routes use `authenticateToken` middleware that verifies the JWT
- Token stored in `localStorage`, attached as `Authorization: Bearer <token>` header

### Database

Supabase (PostgreSQL). The `database.js` file creates and exports a single Supabase client using `SUPABASE_SERVICE_ROLE_KEY` (falls back to `SUPABASE_ANON_KEY`).

Tables:
- `users` — `id, email, password (bcrypt hash), created_at`
- `history` — `id, user_id (FK), image_base64 (TEXT), result_json (TEXT), created_at`

`result_json` is stored as a JSON string and parsed on read.

### AI Analysis

`POST /api/analyze` sends the uploaded image (compressed base64, max 800px wide, JPEG 0.7) to OpenAI `gpt-4o` with `response_format: { type: "json_object" }`. The prompt enforces a strict JSON schema covering colorimetry (seasonal palette, colors, metals, hair tones, makeup), visagismo (face harmony, personality), face shape, and hair diagnosis.

### Frontend routes

| Path | Component | Auth |
|---|---|---|
| `/auth` | `Auth.jsx` | Public |
| `/` | `Analyzer` (in `App.jsx`) | Protected |
| `/history` | `History.jsx` | Protected |

`PrivateRoute` checks `localStorage.getItem('token')` and redirects to `/auth` if missing.

### Image export

`ResultInfographic.jsx` renders the full analysis report and supports export to JPEG/PDF via `html2canvas` + `jsPDF`. `HairAnalysis.jsx` is a standalone component for hairstyle recommendations (currently unused in main routing).

## Environment variables

Required in `.env` (local) and Vercel environment settings:

```
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
JWT_SECRET
```

## Branding

- App name: **Visagê**
- Login/register page (`Auth.jsx`) shows the Visagê brand name and slogan
- Main analyzer page (`App.jsx`) keeps the "Consultoria de Imagem Premium" heading by design

## Known issues

- Vercel CLI has SSL certificate verification problems on Windows — use `NODE_TLS_REJECT_UNAUTHORIZED=0 vercel --prod` for all deployments
- Supabase free tier pauses projects after inactivity — if the API returns `fetch failed`, check the Supabase dashboard and restore the project
- The `SUPABASE_URL` Vercel env var has historically been set with a typo (missing `i` in the project ID). The correct URL is `https://wkapciqeevzuokgiehwn.supabase.co` — verify this if API calls fail with `fetch failed`
