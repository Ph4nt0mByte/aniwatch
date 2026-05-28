# IgnisPlay

Anime & movie streaming web app built with React 19, TypeScript, Vite, Tailwind CSS v4, and Firebase.

## Features

- Browse top, seasonal, and airing anime
- Search anime/movies with live suggestions
- Watch streaming via megaplay.buzz embeds
- Google Sign-In via Firebase Auth
- Continue Watching (Firestore-synced)
- Watch List — bookmark anime and movies
- EN/JP title toggle
- Movie & TV show support via TMDB

## Run Locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 5000) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Type-check (`tsc --noEmit`) |

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion
- **APIs:** Jikan (MyAnimeList), TMDB, megaplay.buzz
- **Backend:** Express server (proxies API requests)
- **Auth & Data:** Firebase Auth, Firestore
