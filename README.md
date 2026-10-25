# Heartbeat

A small, private iPhone web app. Tap the heart each time you think of your partner; each thought is a beat. Heartbeat turns those beats into calm, Apple Health style trends, and offers short, research-backed lessons and quizzes.

All data lives only on your phone (IndexedDB). There are no accounts, no analytics and no network calls after the first load. Use Settings, then Export backup, to keep a copy.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # static export to out/ plus the offline service worker
npx vitest run    # tests
```

## Install on iPhone

1. Open the deployed address in Safari.
2. Tap Share, then Add to Home Screen.
3. Open Heartbeat from the new icon. It works offline afterwards. Tip: put the icon in your Dock.

## Deploy to GitHub Pages

1. Create a new GitHub repository (for example `heartbeat`).
2. Push this project to its `main` branch.
3. In the repo, go to Settings, then Pages, and set Source to GitHub Actions.
4. The workflow in `.github/workflows/deploy.yml` builds with `NEXT_PUBLIC_BASE_PATH=/<repo>` and publishes. Your app appears at `https://<user>.github.io/<repo>/`.

To build for a sub-path locally: `NEXT_PUBLIC_BASE_PATH=/heartbeat pnpm build`.

Note: data is stored per web address. If you move the app to a new address, export a backup first and import it there.

## Icons

Edit `public/icons/icon.svg`, then run `pnpm icons` to regenerate the PNGs.
