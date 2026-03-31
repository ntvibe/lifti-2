# Lifti

Offline-first strength training planner + workout tracker.

## Stack

- React + TypeScript + Vite
- Dexie (IndexedDB)
- Zustand
- Vite PWA

## Local Development

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

For GitHub Pages (repo subpath builds), the workflow uses:

```bash
npm run build -- --base=/<repo-name>/
```

## Lint

```bash
npm run lint
```

## Repo Safety Check

```bash
npm run check:repo-safety
```

This guard ensures local/user artifacts are never tracked (for example `.env` files, build output, or DB/browser storage files).

## Optional Supabase Sync

Create a `.env` from `.env.example` and set:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

If these variables are not set, the app still works fully offline; cloud sync is disabled with a UI message.

Apply the schema in `supabase/migrations/20260331170000_init_lifti.sql` to create the sync tables and shared exercise catalog, then run `supabase/seed.sql` if you want the current built-in exercise library managed from Supabase immediately.

For GitHub Pages builds, set repository Actions variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

## GitHub Pages Deploy

Deployment is automated by `.github/workflows/deploy-pages.yml`.

- Triggers on `master` and `main`
- Runs a tracked-file safety check before install/build
- Builds with the repository base path
- Publishes the `dist` artifact to GitHub Pages
