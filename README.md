# LinkNest

A simple, real-time bookmark manager built with Next.js, Supabase, and Tailwind CSS.

## Features

- Google OAuth sign-in (no email/password)
- Add bookmarks (URL + title)
- Private bookmarks per user (RLS)
- Real-time updates across tabs
- Delete bookmarks

## Tech Stack

- **Next.js 15** (App Router)
- **Supabase** (Auth, Database, Realtime)
- **Tailwind CSS v4**

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
  created_at timestamptz default now() not null
);

alter table bookmarks enable row level security;

create policy "Users can view own bookmarks"
  on bookmarks for select using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on bookmarks for insert with check (auth.uid() = user_id);

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

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Get the values from **Supabase > Settings > API**.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Add your Vercel URL to Google OAuth authorized origins and Supabase redirect URLs
5. Deploy

## Problems and Solutions

- **Realtime not working**: Make sure you've enabled replication for the `bookmarks` table in Supabase dashboard (Database > Replication).
- **Google OAuth redirect fails**: Ensure your redirect URI in Google Cloud Console matches `https://<ref>.supabase.co/auth/v1/callback` exactly.
- **Session not persisting**: The middleware.js refreshes the session on every request. Make sure it's at the project root (not inside `app/`).
