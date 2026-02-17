# LinkNest

A modern bookmark manager with AI-powered categorization, built as both a **Progressive Web App** and a **Chrome Extension** sharing a single codebase.

## Features

- **Google OAuth** sign-in via Supabase
- **AI categorization** — bookmarks are auto-categorized and tagged using Gemini AI
- **Real-time sync** across tabs via Supabase Realtime
- **Search, sort & filter** — by category, favorites, pinned, most/least visited
- **Favorites & pinning** — star and pin bookmarks to the top
- **Click tracking** — tracks how often you visit each bookmark
- **Bulk operations** — multi-select delete, bulk category change
- **Import/Export** — JSON-based backup and restore
- **PWA** — installable, offline-capable, push notifications
- **Chrome Extension** — save the current tab with one click, context menu, quick popup

## Tech Stack

- **Next.js 16** (App Router, React 19, React Compiler)
- **Supabase** (Auth, PostgreSQL, Realtime, RLS)
- **Tailwind CSS v4**
- **Gemini AI** (via OpenAI-compatible SDK)
- **Vite** (Chrome Extension build)

## Project Structure

```
app/                    # Next.js pages & API routes
components/             # React components (bookmarks, layout, PWA, UI)
lib/
  core/                 # Shared platform-agnostic logic (categories, URL utils, etc.)
  adapters/
    web/                # Web-specific Supabase adapters (auth, storage)
    extension/          # Extension-specific adapters (chrome.storage auth)
  supabase/             # Supabase client/server helpers
extension/              # Chrome Extension source (popup, options, background, content)
public/                 # PWA manifest, service worker, icons
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase project

Create a project at [supabase.com](https://supabase.com) and run this SQL in the SQL Editor:

```sql
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  url text not null,
  category text,
  tags text[],
  ai_summary text,
  is_favorite boolean default false,
  is_pinned boolean default false,
  click_count integer default 0,
  created_at timestamptz default now() not null
);

alter table bookmarks enable row level security;

create policy "Users can view own bookmarks"
  on bookmarks for select using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on bookmarks for insert with check (auth.uid() = user_id);

create policy "Users can update own bookmarks"
  on bookmarks for update using (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on bookmarks for delete using (auth.uid() = user_id);
```

Then enable **Realtime** for the `bookmarks` table:

- Go to **Database > Replication** in the Supabase dashboard
- Toggle on replication for the `bookmarks` table

### 3. Google OAuth

- In Supabase dashboard, go to **Authentication > Providers > Google**
- Enable it and add your Google OAuth client ID and secret
- Add `http://localhost:3000` to your Google OAuth authorized origins
- Add `https://<your-supabase-ref>.supabase.co/auth/v1/callback` to authorized redirect URIs

### 4. Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Chrome Extension

### 1. Extension environment

Create `extension/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:3000
```

### 2. Build

```bash
npm run build:extension
```

### 3. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/dist/`

### 4. Supabase redirect URL

Add your extension's redirect URL to **Supabase > Authentication > URL Configuration > Redirect URLs**:

```
https://<your-extension-id>.chromiumapp.org/
```

Find your extension ID on the `chrome://extensions` page.

### Extension Scripts

| Script                      | Description                           |
| --------------------------- | ------------------------------------- |
| `npm run build:extension`   | Production build to `extension/dist/` |
| `npm run dev:extension`     | Watch mode for development            |
| `npm run preview:extension` | Build + instructions to load          |

---

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`
4. Add your Vercel URL to Google OAuth authorized origins and Supabase redirect URLs
5. Update `VITE_API_BASE_URL` in `extension/.env` to your deployed URL
6. Deploy

## Troubleshooting

- **Realtime not working**: Enable replication for the `bookmarks` table in Supabase dashboard (Database > Replication).
- **Google OAuth redirect fails**: Ensure your redirect URI in Google Cloud Console matches `https://<ref>.supabase.co/auth/v1/callback` exactly.
- **Session not persisting**: The `middleware.js` refreshes the session on every request. Make sure it's at the project root (not inside `app/`).
- **Extension shows "Loading..."**: Check that `extension/.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (not `NEXT_PUBLIC_` prefixed). Rebuild after changes.
- **Extension sign-in not working**: Add `https://<extension-id>.chromiumapp.org/` to Supabase redirect URLs.
- **Service worker registration failed**: Rebuild with `npm run build:extension` — the service worker must not use DOM APIs.
