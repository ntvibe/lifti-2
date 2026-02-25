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

## Optional Google Backup

Create a `.env` from `.env.example` and set:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

If this variable is not set, the app still works fully offline; Google backup is disabled with a UI message.

## GitHub Pages Deploy

Deployment is automated by `.github/workflows/deploy-pages.yml`.

- Triggers on `master` and `main`
- Builds with the repository base path
- Publishes the `dist` artifact to GitHub Pages
