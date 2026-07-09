# Ascendra — Auth & Cloud Multi-Save Setup (Supabase)

The code is already shipped and **gracefully degrades**: with no Supabase env
vars, the app runs exactly as before (local-only saves, no sign-in UI). Follow
these steps to turn on accounts + cloud saves. ~10 minutes.

---

## 1. Create a Supabase project
- Go to **[supabase.com](https://supabase.com)** → New project (free tier is fine).
- Note the project's **Project URL** and **anon public key** (Settings → API).

## 2. Create the saves table + security (SQL editor → run this)
```sql
create table if not exists public.saved_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  state jsonb not null,
  week int not null default 1,
  status text not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_games enable row level security;

-- Row-Level Security: each user can only see/modify their own saves.
create policy "own select" on public.saved_games for select using (auth.uid() = user_id);
create policy "own insert" on public.saved_games for insert with check (auth.uid() = user_id);
create policy "own update" on public.saved_games for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete" on public.saved_games for delete using (auth.uid() = user_id);

create index if not exists saved_games_user_updated on public.saved_games (user_id, updated_at desc);
```
(`user_id` defaults to `auth.uid()`, so the app never sends it — RLS guarantees isolation.)

## 3. Configure Auth URLs (Authentication → URL Configuration)
- **Site URL:** `https://frontend-psi-one-63.vercel.app`
- **Redirect URLs:** add both
  - `https://frontend-psi-one-63.vercel.app`
  - `http://localhost:3000`

## 4. Enable providers (Authentication → Providers)
- **Email** — already on; magic link works out of the box.
- **Google** — toggle on, then paste a Google OAuth **Client ID + Secret**:
  1. [Google Cloud Console](https://console.cloud.google.com) → Credentials → OAuth client (Web).
  2. Authorized redirect URI = the callback shown on the Supabase Google page
     (`https://<your-project>.supabase.co/auth/v1/callback`).
  3. Copy the Client ID/Secret back into Supabase.

## 5. Set the env vars
**Vercel** (Project → Settings → Environment Variables), then redeploy:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```
**Local dev** — add the same two lines to `frontend/.env.local` (git-ignored).

That's it. On next load, the landing page shows **“Your companies”** + a Sign-in
button, the play header shows the account menu, and games autosync to the cloud.

---

## How it works
- **`saved_games`** holds one row per saved company (`state` jsonb = the full
  GameState). RLS scopes everything to the signed-in user.
- **Local-first:** localStorage is still the source of truth offline; when a game
  is loaded from / saved to the cloud it's *linked* (`activeCloudSaveId`) and
  autosyncs (debounced) on every change.
- **Anon key is safe to expose** (it's a public client key); RLS is what protects
  the data. Never ship the `service_role` key to the client.
