# AGENTS.md

## Project Overview

AniWatch — an anime streaming web app. React 19 + TypeScript frontend with a Vite build toolchain, Tailwind CSS v4, and an Express production server. Data comes from the [Jikan API](https://api.jikan.moe/v4) (MyAnimeList data), streaming embeds from megaplay.buzz (routed through the anikoto proxy), and user state is persisted in Firebase (Auth + Firestore).

## Essential Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server on port 5000 (hot reload via Vite HMR)
npm run build        # production build → dist/
npm run preview      # preview production build locally
npm run lint         # type-check: tsc --noEmit
```

The production server is `server.js` — it serves `dist/` statically and also proxies `/api/anikoto/*` to `anikotoapi.site`.

## Architecture

```
src/
  main.tsx              # React root, renders <App /> in StrictMode
  App.tsx               # Router, auth/language providers, layout (Navbar + Sidebar + footer)
  types.ts              # Shared types: Anime, Episode, WatchHistoryItem
  index.css             # Tailwind v4 imports, @theme custom tokens, scrollbar-hide utility
  components/
    Navbar.tsx          # Fixed top bar: search form, EN/JP toggle, user avatar dropdown
    Sidebar.tsx         # Slide-out drawer: nav links + genre grid
    AnimeCard.tsx       # Card with poster, hover overlay, rank badge
    Spotlight.tsx       # Hero carousel with auto-rotation (8s interval)
  pages/
    Home.tsx            # Fetches top/seasonal/airing for spotlight + grids
    Watch.tsx           # Main player page: iframe embed, episode list sidebar, relation explorer
    AnimeDetails.tsx    # Detail page: synopsis, episode grid, info sidebar
    Search.tsx          # Keyword search via Jikan
    Auth.tsx            # Google Sign-In page
    ContinueWatching.tsx # Firestore-backed watch history list
  services/
    api.ts              # Jikan API wrappers (top, seasonal, search, by-id, episodes, recommendations, relations)
    anikoto.ts          # Builds megaplay.buzz embed URLs: `https://megaplay.buzz/stream/mal/{malId}/{epNum}/{sub|dub}`
    hiAnime.ts          # Alternative stream source (HiAnime clone API) — currently unused in the UI but kept for fallback
  contexts/
    AuthContext.tsx     # Firebase onAuthStateChanged, exposes { user, loading }
    LanguageContext.tsx  # EN/JP toggle persisted to localStorage key 'preferred_lang'
  lib/
    firebase.ts         # Initializes Firebase app; exports auth, db, googleProvider, signInWithGoogle, logout
    errorHandlers.ts    # Firestore error formatter (OperationType enum, structured logging)
```

### Data Flow

1. **Listing/discovery**: Pages call `jikanApi` functions → Jikan REST API → raw `Anime[]` data. Pages slice/paginate client-side.
2. **Streaming**: `Watch.tsx` calls `getEmbedUrls(malId, epNumber)` from `anikoto.ts` → constructs `https://megaplay.buzz/stream/mal/{id}/{ep}/{sub|dub}` → rendered in an `<iframe>`.
3. **Auth**: Google Sign-In via Firebase Auth. Auth state is observed in `AuthContext` and drives route guards.
4. **Persistence**: Watch history is saved to Firestore at `users/{uid}/watchHistory/{mal_id}` with `serverTimestamp()`. Playback position is saved to `localStorage` keyed by `playback-{id}-{ep}` and restored via `postMessage` to the megaplay iframe.

### Route Structure

| Path | Component | Auth Required |
|---|---|---|
| `/` | Home | No |
| `/search?keyword=` | Search | No |
| `/anime/:id` | AnimeDetails | No |
| `/watch/:id/:ep` | Watch | No |
| `/auth` | Auth | Redirects to `/` if logged in |
| `/continue-watching` | ContinueWatching | Yes (redirects to `/auth`) |
| `*` | → `/` | No |

## Key Conventions

### Colors & Theme
Custom Tailwind v4 tokens in `src/index.css`:
- `--color-primary`: `#ffdd95` (warm yellow/gold)
- `--color-bg-dark`: `#202125` (dark page background)
- `--color-bg-card`: `#2f3033` (card surface)
- `--color-text-secondary`: `#aaaaaa`

### CSS Patterns
- Use `bg-white/5` for subtle elevated surfaces, `bg-[#121315]` for panels, `bg-[#1a1b1e]` for cards/modals.
- Borders: `border border-white/5` or `border border-white/10` for dividers.
- Rounded corners: `rounded-2xl` or `rounded-xl` (Tailwind v4 with default radius scale).
- The `scrollbar-hide` utility class hides scrollbars cross-browser.
- Font: Poppins imported from Google Fonts, set as `--font-sans`.

### Import Paths
- The `@/*` alias maps to the project root (configured in `vite.config.ts` and `tsconfig.json`).
- In practice, components use relative imports (`../services/api`, `../contexts/AuthContext`), not `@/` aliases.

### TypeScript
- Strict mode is NOT enabled — `skipLibCheck: true`, no `strict: true`.
- `tsc --noEmit` is the lint/type-check command.
- Jikan API responses are not strongly typed — data is accessed via `.data` and components cast implicitly.
- `any` is used liberally for API response shapes and Firestore Timestamp compatibility.

### React Patterns
- Functional components with hooks throughout.
- `useEffect` + `isMounted` flag pattern used in Watch.tsx for cleanup on async fetches.
- Loading spinners: `animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary`.
- Animation: `motion/react` (Framer Motion variant) for AnimatePresence, hover effects, and layout animations.

### State Management
- No global state library — React Context for auth and language, component-local state for everything else.
- `localStorage` for language preference (`preferred_lang`) and playback position (`playback-{id}-{ep}`).

## Gotchas & Non-Obvious Patterns

1. **Jikan rate limits**: The Jikan API has a ~3 req/s rate limit. Watch.tsx uses batched requests with 1-second delays between batches of 3 when recursively fetching relations. If you add new Jikan calls, use `Promise.allSettled` + error suppression and respect the rate limit.

2. **Megaplay iframe communication**: Playing media communicates via `postMessage` on the `'megacloud'` channel. Watch.tsx listens for `'time'`, `'watching-log'`, and `'complete'` events. Playback restore sends a `'seek'` event. Origin must be `'https://megaplay.buzz'`.

3. **Streaming URL construction**: The `anikoto.ts` module constructs direct megaplay URLs — it does NOT use the proxy or the HiAnime API. The `/api/anikoto` proxy in `vite.config.ts` and `server.js` exists but is unused by the current frontend (the frontend calls `getEmbedUrls` which builds megaplay URLs directly).

4. **Firestore document IDs**: Watch history and watchlist documents use `anime.mal_id` (converted to string) as the document ID. The firestore rules require `animeId` to be a string matching `^[a-zA-Z0-9_\\-]+$` (max 128 chars).

5. **Dual watchlist paths**: The codebase uses BOTH `watchlist` (lowercase L, in Watch.tsx toggleWatchlist) AND `watchList` (camelCase, in firebase-blueprint.json, firestore.rules, and AnimeDetails.tsx). This is a bug — the firestore rules define `watchList` but Watch.tsx writes to `watchlist`. Firestore is case-sensitive so these are different collections.

6. **EN/JP toggle**: The language preference is stored in `localStorage` with key `preferred_lang`. Components use `useLanguage()` to read/write it. The toggle exists in Navbar's desktop view only (hidden on mobile).

7. **Light mode**: Watch.tsx has a "light mode" toggle that makes the player fixed-position centered with a black backdrop — it's a theater/pop-out mode, not an actual light theme.

8. **Express server proxy**: `server.js` proxies `/api/anikoto/*` to `anikotoapi.site` with CORS headers. This is used for production deployment only — dev uses the Vite proxy config.

9. **No test suite**: There are no tests configured. Running `npm test` will fail.

10. **The `hiAnime.ts` service** is fully implemented with search, episode listing, and multi-server stream fallback, but it is not imported or used by any component. It's a dormant fallback.

11. **Tailwind v4** uses the `@import "tailwindcss"` syntax (not `@tailwind base/components/utilities`). The `@theme` block defines custom design tokens. The `@utility` directive creates the `scrollbar-hide` utility.

12. **`.env.example`** shows `GEMINI_API_KEY` and `APP_URL` — the API key is injected at build time via `vite.config.ts` `define` into `process.env.GEMINI_API_KEY`. This is used by `@google/genai` but there's no frontend code that actually calls it yet.
