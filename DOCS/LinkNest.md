# LinkNest — Project Documentation

A modern bookmark manager with **AI-powered categorization**, available as a **Progressive Web App (PWA)** and a **Chrome Extension (Manifest V3)**, sharing a single codebase through a modular adapter architecture.

---

## Table of Contents

- [Features](#features)
- [Folder Structure](#folder-structure)
- [APIs Used](#apis-used)
- [Environment Variables](#environment-variables)

---

## Features

### Authentication

- **Google OAuth** via Supabase — single sign-on with Google accounts
- **Session persistence** — middleware refreshes the Supabase session on every request using `@supabase/ssr` cookie management
- **Auth callback** — handles the OAuth code exchange at `/auth/callback`
- **Auth guard** — dashboard is server-side protected; unauthenticated users are redirected to `/login`
- **Extension auth** — OAuth flow runs in the background service worker (survives popup close) using `chrome.identity.launchWebAuthFlow()` with implicit flow; sessions are stored in `chrome.storage.local`

### Bookmark Management

- **Add bookmarks** — paste a URL, optionally add a title; the rest is AI-powered
- **Edit inline** — edit title, URL, category, and tags directly on each bookmark card
- **Delete with undo** — 5-second undo window before the bookmark is actually removed from the database
- **Favorites** — star/unstar bookmarks; filter to show only favorites
- **Pinning** — pin important bookmarks to always appear at the top of any sort order
- **Click tracking** — each bookmark visit increments a click counter via `/api/bookmark-click`; sort by most/least visited

### AI Categorization

- **Automatic categorization** — when a bookmark is added, the server fetches the page's `<meta>` tags (title, description, OG tags) and sends them to **Google Gemini AI**
- **Gemini response** — returns a structured JSON with:
  - `category` — one of 20 predefined categories (Development, Design, News, Video, Social, Shopping, Finance, Education, Health, Travel, Food, Sports, Music, Gaming, Science, Reference, Government, Business, Entertainment, Other)
  - `tags` — up to 5 relevant tags
  - `summary` — a one-line description of the page
  - `suggestedTitle` — a clean title if the original is messy
- **Domain fallback** — if AI fails, a 60+ domain-to-category mapping (`github.com → Development`, `youtube.com → Video`, etc.) is used as a fallback
- **Category colors** — each category has a unique Tailwind gradient badge color

### Search, Sort & Filter

- **Full-text search** — searches across title, URL, category, AI summary, and tags
- **Sort options** — newest, oldest, title A→Z, title Z→A, most visited, least visited
- **Category filter** — sidebar shows all categories with bookmark counts; click to filter
- **Tag filter** — sidebar shows all tags with counts; click to filter
- **Favorites filter** — toggle to show only starred bookmarks
- **Pinned always first** — regardless of sort order, pinned bookmarks appear at the top

### Bulk Operations

- **Multi-select mode** — toggle bulk mode, check individual bookmarks or select all
- **Bulk delete** — delete all selected bookmarks at once
- **Bulk category change** — assign a new category to all selected bookmarks
- **Bulk export** — export only the selected bookmarks as JSON

### Import & Export

- **Export** — downloads all bookmarks (or selected) as a timestamped JSON file (`linknest-bookmarks-YYYY-MM-DD.json`) with metadata header (`app`, `exportedAt`, `count`)
- **Import** — upload a JSON file; supports both `{ bookmarks: [...] }` wrapper format and plain array; validates URLs; deduplicates against existing bookmarks by URL

### Real-time Sync

- **Supabase Realtime** — subscribes to `postgres_changes` on the `bookmarks` table
- **Live updates** — INSERT, UPDATE, and DELETE events are reflected instantly across all open tabs without page refresh
- **Optimistic UI** — all mutations update the UI immediately; errors trigger a rollback and toast notification

### Progressive Web App (PWA)

- **Web App Manifest** — `public/manifest.json` with app name, icons (SVG, maskable), start URL `/dashboard`, standalone display mode, theme color `#e8590c`, dashboard shortcut
- **Service Worker** (`public/sw.js`):
  - **Precache** — caches the app shell (`/`, `/dashboard`, `/login`, `/manifest.json`)
  - **Stale-while-revalidate** — for all static assets
  - **Network-only** — for `/api/` routes (returns 503 JSON when offline)
  - **Skip** — for `/auth/` routes (never cached)
  - **Push notifications** — listens for push events and shows notifications; clicking opens/focuses the dashboard
- **Install prompt** — custom bottom-sheet banner triggered by the `beforeinstallprompt` event with Install/Later buttons
- **Service Worker Registrar** — client component that registers the SW on mount and checks for updates every hour

### Chrome Extension (Manifest V3)

- **Popup** — click the extension icon to:
  - Sign in with Google
  - See the current tab's URL and title
  - Save the current tab as a bookmark with AI categorization
  - View the 5 most recent bookmarks
  - Link to the full web dashboard
- **Context menu** — right-click any page → "Save to LinkNest" stores the page as a pending bookmark
- **Options page** — a full dashboard with search, sort, category filters, export, real-time subscription, favorites, and delete — all using shared core logic
- **Background service worker**:
  - Handles OAuth flow via `chrome.identity.launchWebAuthFlow()` (doesn't close with the popup)
  - Context menu handler with badge notification
  - Session refresh alarm every 30 minutes
- **Content script** — extracts page metadata (title, description, OG tags, favicon) when requested

### UI & Design

- **Dark theme** — `#050505` background with subtle radial gradients (orange/blue)
- **Glassmorphism** — frosted-glass cards with `backdrop-blur`, `border-white/[0.08]`
- **Orange accent** — `#e8590c` for buttons, badges, and highlights
- **Geist font** — loaded from Google Fonts
- **Toast notifications** — success (green), error (red), info (blue), undo (red with action button); animated slide-in/out
- **Responsive** — mobile-friendly layout
- **Custom scrollbar** — thin, accent-colored track

---

## Folder Structure

```
LinkNest/
├── app/                              # Next.js App Router
│   ├── globals.css                   # Tailwind v4 imports, CSS variables, theme
│   ├── layout.js                     # Root layout — Geist font, metadata, PWA meta, ToastProvider
│   ├── page.js                       # Home — auth check → redirect to /dashboard or /login
│   ├── auth/
│   │   └── callback/
│   │       └── route.js              # OAuth code exchange → redirect to /dashboard
│   ├── api/
│   │   ├── ai-categorize/
│   │   │   └── route.js              # POST — AI categorization via Gemini
│   │   └── bookmark-click/
│   │       └── route.js              # POST — increment click_count
│   ├── dashboard/
│   │   └── page.js                   # Auth-guarded dashboard with server-side data fetch
│   └── login/
│       └── page.js                   # Google OAuth sign-in page
│
├── components/
│   ├── bookmarks/
│   │   ├── AddBookmark.js            # Add bookmark form with AI status indicator
│   │   ├── BookmarkItem.js           # Single bookmark card — actions, inline edit, badges
│   │   ├── BookmarkList.js           # Renders list of BookmarkItem components
│   │   └── DashboardClient.js        # Main dashboard — state, realtime, filters, bulk ops
│   ├── layout/
│   │   └── Navbar.js                 # Sticky top nav — logo, user info, sign out
│   ├── pwa/
│   │   ├── InstallPrompt.js          # PWA install banner (beforeinstallprompt)
│   │   └── ServiceWorkerRegistrar.js # Registers /sw.js, hourly update checks
│   └── ui/
│       └── Toast.js                  # Toast context + provider — success/error/info/undo
│
├── lib/
│   ├── core/                         # Platform-agnostic shared logic
│   │   ├── bookmarks.js              # Validation, normalization, filtering, sorting, compute
│   │   ├── categories.js             # 20 categories with colors, DOMAIN_MAP (60+ domains)
│   │   ├── importExport.js           # Export as JSON download, parse imported JSON
│   │   ├── platform.js               # isExtension(), isPWA(), isWeb(), getPlatform()
│   │   └── url.js                    # getFaviconUrl(), extractDomain()
│   │
│   ├── adapters/
│   │   ├── shared.js                 # Adapter interface contract (documentation only)
│   │   ├── web/
│   │   │   ├── auth.js               # Supabase SSR browser client auth
│   │   │   ├── storage.js            # Supabase CRUD, realtime, AI categorization
│   │   │   └── index.js              # Barrel export: auth, storage
│   │   └── extension/
│   │       ├── auth.js               # Supabase JS + chrome.storage auth, background messaging
│   │       ├── storage.js            # Supabase CRUD via extension client, deployed API
│   │       └── index.js              # Barrel export: auth, storage
│   │
│   ├── services/
│   │   ├── ai.js                     # Server-side Gemini AI — metadata scraping, categorization
│   │   └── bookmarks.js              # Re-export shim (backward compat → web/storage)
│   │
│   ├── supabase/
│   │   ├── client.js                 # createBrowserClient() — @supabase/ssr
│   │   └── server.js                 # createServerClient() — @supabase/ssr + cookies
│   │
│   ├── constants/
│   │   └── categories.js             # Re-export shim → core/categories
│   ├── utils/
│   │   └── url.js                    # Re-export shim → core/url
│   └── importExport.js               # Re-export shim → core/importExport
│
├── extension/                        # Chrome Extension (Manifest V3)
│   ├── manifest.json                 # Permissions, popup, options, background, content script
│   ├── vite.config.js                # Multi-entry Vite build, @/ alias, modulePreload off
│   ├── .env                          # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL
│   ├── background/
│   │   └── service-worker.js         # Context menu, OAuth flow, message handler, session alarm
│   ├── content/
│   │   └── content-script.js         # Extracts page metadata (title, description, OG, favicon)
│   ├── popup/
│   │   ├── index.html                # Popup HTML shell
│   │   ├── main.jsx                  # React entry point
│   │   └── Popup.jsx                 # Quick save, sign-in, recent bookmarks, AI categorization
│   ├── options/
│   │   ├── index.html                # Options HTML shell
│   │   ├── main.jsx                  # React entry point
│   │   └── Options.jsx               # Full dashboard — search, sort, filter, export, realtime
│   ├── styles/
│   │   └── extension.css             # Dark theme CSS variables, popup/options styles
│   ├── icons/                        # Extension SVG icons (16, 32, 48, 128)
│   ├── scripts/
│   │   └── copy-assets.mjs           # Post-build: copies manifest + icons to dist/
│   └── dist/                         # Built output (load as unpacked in Chrome)
│
├── public/
│   ├── manifest.json                 # PWA manifest — name, icons, start_url, shortcuts
│   ├── sw.js                         # Service worker — precache, strategies, push notifications
│   └── icons/                        # PWA SVG icons (72–512px, maskable)
│
├── middleware.js                      # Supabase session refresh on every request
├── package.json                       # Scripts, dependencies (Next.js, Supabase, OpenAI, Vite)
├── next.config.mjs                    # React Compiler, SW/manifest cache headers
├── jsconfig.json                      # Path alias: @/ → ./
├── postcss.config.mjs                 # @tailwindcss/postcss plugin
├── eslint.config.mjs                  # ESLint config
└── README.md                          # Setup instructions
```

### Folder Explanations

#### `app/`

Next.js App Router structure. Each folder maps to a route. `api/` contains server-side API endpoints. `auth/callback/` handles the OAuth redirect. `dashboard/` is the main authenticated page. `login/` is the public sign-in page.

#### `components/`

React components organized by domain:

- **`bookmarks/`** — the core UI: add form, individual bookmark cards with inline editing, the bookmark list renderer, and the main dashboard client that orchestrates everything (state management, realtime subscriptions, filtering, sorting, bulk operations, import/export)
- **`layout/`** — the sticky navigation bar with user info and sign-out
- **`pwa/`** — PWA-specific components: the install banner and service worker registration
- **`ui/`** — generic UI primitives: toast notification system with context provider

#### `lib/core/`

Platform-agnostic pure functions shared between the web app and Chrome extension. No framework dependencies — just data validation, URL parsing, category constants, import/export logic, and platform detection. This is the heart of the modular architecture.

#### `lib/adapters/`

The adapter layer that abstracts platform differences:

- **`web/`** — uses `@supabase/ssr` browser client, Next.js API routes for AI
- **`extension/`** — uses `@supabase/supabase-js` with `chrome.storage.local`, `chrome.identity` for OAuth, and calls the deployed webapp's API for AI categorization

Both adapters expose the same interface (`getSession`, `signIn`, `signOut`, `getBookmarks`, `insertBookmark`, etc.), so consuming code doesn't need to know which platform it's running on.

#### `lib/services/`

Server-side services:

- **`ai.js`** — the AI categorization pipeline: fetch page metadata → send to Gemini → parse response → fallback to domain mapping
- **`bookmarks.js`** — backward-compatibility re-export shim that maps old function names to the new web adapter

#### `lib/supabase/`

Supabase client factories:

- **`client.js`** — browser client for client components
- **`server.js`** — server client for server components and API routes (uses Next.js `cookies()`)

#### `extension/`

Complete Chrome Extension (Manifest V3) with its own build pipeline:

- **`background/`** — service worker that handles OAuth (so the popup can close), context menu, and session refresh alarms
- **`content/`** — content script injected into every page to extract metadata
- **`popup/`** — React-based quick-action popup (save current tab, view recent bookmarks)
- **`options/`** — React-based full dashboard (mirrors the web dashboard functionality)
- **`styles/`** — CSS for the extension (can't use Tailwind directly in extensions)
- Built with Vite into `extension/dist/` which is loaded as an unpacked extension

#### `public/`

Static assets served by Next.js:

- **`manifest.json`** — PWA Web App Manifest
- **`sw.js`** — service worker for offline support and push notifications
- **`icons/`** — PWA icons at multiple sizes

---

## APIs Used

### Internal API Endpoints

#### `POST /api/ai-categorize`

AI-powered bookmark categorization.

| Field            | Type       | Description                     |
| ---------------- | ---------- | ------------------------------- |
| **Request**      |            |                                 |
| `url`            | `string`   | The bookmark URL to categorize  |
| `userTitle`      | `string`   | Optional user-provided title    |
| **Response**     |            |                                 |
| `category`       | `string`   | One of 20 predefined categories |
| `tags`           | `string[]` | Up to 5 relevant tags           |
| `summary`        | `string`   | One-line page description       |
| `suggestedTitle` | `string`   | Clean title suggestion          |
| `source`         | `string`   | `"ai"` or `"domain-fallback"`   |

**Flow:**

1. Fetches the target URL's HTML and extracts `<meta>` tags (title, description, OG tags, keywords)
2. Sends metadata + URL + domain to Gemini AI with a structured prompt
3. Parses the JSON response and validates the category against the allowed list
4. On failure, falls back to the `DOMAIN_MAP` (60+ domain-to-category mappings)

#### `POST /api/bookmark-click`

Increment a bookmark's click counter.

| Field         | Type            | Description   |
| ------------- | --------------- | ------------- |
| **Request**   |                 |               |
| `id`          | `string (uuid)` | Bookmark ID   |
| **Response**  |                 |               |
| `click_count` | `number`        | Updated count |

#### `GET /auth/callback`

OAuth callback handler. Exchanges the authorization `code` for a Supabase session, then redirects to `/dashboard`.

| Query Param | Type     | Description                            |
| ----------- | -------- | -------------------------------------- |
| `code`      | `string` | OAuth authorization code from Supabase |

---

### External APIs

#### Google Gemini AI

| Property     | Value                                                            |
| ------------ | ---------------------------------------------------------------- |
| **SDK**      | `openai` npm package (OpenAI-compatible)                         |
| **Base URL** | `https://generativelanguage.googleapis.com/v1beta/openai/`       |
| **Model**    | Configured via `GEMINI_MODEL` env var (e.g., `gemini-2.5-flash`) |
| **Auth**     | API key via `GEMINI_API_KEY` env var                             |
| **Used in**  | `lib/services/ai.js` → called by `/api/ai-categorize`            |

**Prompt structure:**

```
You are a bookmark categorization assistant.
Given a URL and page metadata, respond with JSON:
{ "category": "...", "tags": [...], "summary": "...", "suggestedTitle": "..." }

Categories: [20 predefined categories]
URL: ...
Domain: ...
Title: ...
Description: ...
Keywords: ...
```

#### Supabase

| Service                   | Used For                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **Auth**                  | Google OAuth (PKCE on web, implicit in extension), session management, user identity  |
| **Database (PostgreSQL)** | `bookmarks` table — full CRUD with Row Level Security                                 |
| **Realtime**              | `postgres_changes` subscription on the `bookmarks` table for live updates across tabs |

**Database schema:**

```sql
bookmarks (
  id          uuid        PRIMARY KEY    DEFAULT gen_random_uuid()
  user_id     uuid        NOT NULL       REFERENCES auth.users(id) ON DELETE CASCADE
  title       text        NOT NULL
  url         text        NOT NULL
  category    text
  tags        text[]
  ai_summary  text
  is_favorite boolean     DEFAULT false
  is_pinned   boolean     DEFAULT false
  click_count integer     DEFAULT 0
  created_at  timestamptz DEFAULT now()   NOT NULL
)
```

**RLS policies:**

- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

#### Google Favicon Service

| Property    | Value                                                      |
| ----------- | ---------------------------------------------------------- |
| **URL**     | `https://www.google.com/s2/favicons?domain={domain}&sz=32` |
| **Used in** | `lib/core/url.js` → `getFaviconUrl(url)`                   |
| **Purpose** | Fetches favicon images for bookmark display                |

#### Chrome Extension APIs

| API                                    | Used For                                           |
| -------------------------------------- | -------------------------------------------------- |
| `chrome.identity.launchWebAuthFlow()`  | OAuth flow in background service worker            |
| `chrome.identity.getRedirectURL()`     | Gets the extension's OAuth redirect URL            |
| `chrome.storage.local`                 | Session persistence, pending bookmark storage      |
| `chrome.contextMenus`                  | "Save to LinkNest" right-click menu item           |
| `chrome.action`                        | Badge text/color for save notifications            |
| `chrome.alarms`                        | 30-minute session refresh timer                    |
| `chrome.runtime.sendMessage/onMessage` | Communication between popup ↔ background ↔ content |
| `chrome.tabs.query`                    | Get current active tab info                        |

---

## Environment Variables

### Web App (`.env.local`)

| Variable                        | Required | Description                                  |
| ------------------------------- | -------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous/public key                |
| `GEMINI_API_KEY`                | Yes      | Google Gemini API key (server-side only)     |
| `GEMINI_MODEL`                  | Yes      | Gemini model name (e.g., `gemini-2.5-flash`) |

### Chrome Extension (`extension/.env`)

| Variable                 | Required | Description                                                                                                    |
| ------------------------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Yes      | Supabase project URL (same as web)                                                                             |
| `VITE_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous key (same as web)                                                                           |
| `VITE_API_BASE_URL`      | Yes      | Deployed web app URL (e.g., `http://localhost:3000`) — used for AI categorization and click tracking API calls |
