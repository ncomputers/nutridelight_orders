# Nutridelight Orders

Web app for restaurant produce ordering and basic admin order management.

## Tech Stack

- Vite
- React + TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Required values in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_ADMIN_PASSWORD`
- `VITE_ADMIN_POLL_INTERVAL_MS` (optional)

3. Start dev server:

```bash
npm run dev
```

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - create production build
- `npm run preview` - preview production build
- `npm run test` - run tests
- `npm run lint` - run ESLint

## Main Routes

- `/order?r=<restaurant-slug>` - customer order page
- `/admin/login` - admin login
- `/admin` - admin panel

## App Config

Non-secret app constants are centralized in `src/config/app.ts`.

## Architecture Notes

Project architecture conventions and feature layering are documented in `docs/architecture.md`.
