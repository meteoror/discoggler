# Vinyl Finder

Takes your most-listened-to Last.fm artists over a chosen time period and
looks up matching vinyl / 7" releases on Discogs.

Pure client-side app: static HTML/CSS/TS, no backend, no serverless
functions. Both Last.fm and Discogs' public APIs allow direct browser
requests (CORS), so everything runs as plain `fetch()` calls from the page.

## Setup

```bash
npm install
npm run dev
```

Open the printed local URL. On first load, fill in the "Accounts" card:

- **Last.fm username** — the profile you want to read listening history from.
- **Last.fm API key** — free, instant, no approval: https://www.last.fm/api/account/create
- **Discogs personal access token** — free, instant: https://www.discogs.com/settings/developers → "Generate new token"

Click **Save**. These are stored only in `localStorage` in your browser —
there's no server, so nothing is sent anywhere except directly to Last.fm
and Discogs from your own machine.

Then pick a time period and a Discogs format, and click **Find vinyl**.

## How it works

1. `src/lastfm.ts` calls `user.getTopTracks` for the chosen period, then
   collapses the track list into a de-duplicated, playcount-ranked artist
   list (capped at 25 artists to keep the run short and stay well within
   Discogs' rate limit).
2. `src/discogs.ts` runs one `/database/search` request per artist,
   filtered by format, with a ~1.1s delay between requests.
3. `src/main.ts` renders each artist's results as they come in.

## Deploying to Vercel

No configuration needed — this is a static Vite app.

```bash
npm run build
```

Push the repo to GitHub and import it in Vercel, or run `vercel` from this
directory. Vercel auto-detects the Vite preset (build command `vite build`,
output directory `dist`). Because there are no API routes or serverless
functions, this comfortably sits inside the free static-hosting tier —
there's no function-invocation limit to worry about.

## Notes / limitations

- Your Discogs token is visible in outgoing network requests from your own
  browser (normal for a client-only tool like this). Don't share a deployed
  URL with your credentials pre-filled — this is meant for personal use.
- Discogs enforces ~60 requests/minute for authenticated requests; the
  built-in delay and artist cap keep a single run under that.
- If Last.fm or Discogs ever change their CORS policy, requests would need
  to be routed through a small proxy — but as of now both allow direct
  browser calls.
