# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start local dev server via `wrangler dev`
- `npm run deploy` — deploy to Cloudflare via `wrangler deploy`

There is no test suite, lint script, or build step in this project. The frontend is served as plain ES modules with no bundler.

## Architecture

This is a real-time planning poker app on Cloudflare Workers, split into two independently-loaded halves with no shared build step:

- **`src/server.ts`** — a Cloudflare Worker using Durable Objects via the `partyserver` package. `PokerRoom` (extends `partyserver`'s `Server`) is the entire backend: one Durable Object instance per room, holding all room state in memory (`participants` map, `hostToken`, `hostConnectionId`, `revealed`). The default export's `fetch` handler delegates routing to `routePartykitRequest`, which maps WebSocket connections at `/parties/poker-room/{roomId}` to a `PokerRoom` instance keyed by `roomId`.
- **`public/`** — static frontend, vanilla JS Web Components (custom elements), no framework and no build step. `app.js` picks `home-screen` or `room-screen` based on the URL path and is loaded directly as an ES module by `index.html`.

Key patterns to know before changing either side:

- **Server is the sole source of truth.** Every mutation (`join`/`vote`/`reveal`/`reset`) triggers `broadcastState()`, which sends the *entire* room state as one `"state"` message to all connected clients. The client never computes derived state itself except for its own optimistic card selection — it just re-renders from the last `"state"` message (`room-screen.js`'s `updateRoom()`).
- **Host is per-room, not per-user.** The first WebSocket to `join` with a `hostToken` claims that token as the room's host token (stored server-side on the Durable Object, not persisted elsewhere). Subsequent connections that present the same token become the active host connection. The token itself is minted client-side (`crypto.randomUUID()`) only when a room is *created* (`home-screen.js`) and stored in `localStorage` under `poker-host-{roomId}`; joining an existing room via its URL never grants host rights.
- **Reconnection relies on `localStorage`, not the server.** `poker-name-{roomId}` lets a client rejoin under the same name without re-prompting; `room-screen.js` reconnects with a 1.5s delay on socket close, guarding against reconnecting a stale socket via an identity check (`this.socket !== ws`).
- **The card deck (`DECK`) is duplicated** between `src/server.ts` and `public/components/util.js` — the server validates votes against its own copy, so if the deck ever changes, both copies need to be updated together.
- **All rendering is `innerHTML` string templates** across the custom elements (`home-screen.js`, `room-screen.js`, `table-seats.js`, `poker-card.js`, `vote-results.js`), so any interpolated user-controlled value (names, vote values) must go through `escapeHtml` from `util.js`.
- Cloudflare bindings are declared in `wrangler.jsonc`: the `PokerRoom` Durable Object binding, and an `ASSETS` binding serving `public/` as a single-page app with WebSocket requests under `/parties/*` routed to the Worker first (`run_worker_first`).
