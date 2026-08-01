# കിറ്റ് ഫണ്ട് (PPM Kit)

A small React + Vite + Supabase app for tracking a monthly group fund
("kit fund"). Members are marked paid for the current month, an admin can
share a WhatsApp report, and full payment history is stored in Supabase.
The in-app title is shown in Malayalam (കിറ്റ് ഫണ്ട്); the browser tab
title is "PPM Kit".

## Stack

- React 19 + Vite
- Tailwind CSS, with a custom cream/green/gold color system (see
  `COLORS` in `src/App.jsx`) — this is not default Tailwind styling
- Supabase (Postgres + auto-generated REST API) for all persistence —
  members, payments, and history all live in Supabase, not in any
  browser-local or app-local storage

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com), then
   open **SQL Editor** in your project dashboard and run the contents of
   [`supabase-schema.sql`](./supabase-schema.sql). This creates the
   `members` and `payments` tables with row-level security enabled.
   `members.default_amount` stores each member's editable due amount;
   `payments.amount` stores what was actually recorded when they were
   marked paid for a given month. Re-running the file against a database
   that already has these tables is safe (uses `if not exists`).

3. Copy `.env.example` to `.env` and fill in your project's credentials
   (Project Settings → API):

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_MONTHLY_AMOUNT=100
   VITE_CURRENCY_SYMBOL=₹
   ```

   `.env` is gitignored and should never be committed — it holds real
   credentials. Only `.env.example` (with placeholder values) is tracked.

   `VITE_MONTHLY_AMOUNT` pre-fills the amount field when adding a new
   member — each member's due amount is editable at add-time and stored
   per-member (`members.default_amount`), so members can pay different
   amounts. `VITE_CURRENCY_SYMBOL` is just a display symbol used in the UI
   and the WhatsApp report — change it to match your currency.

4. Start the dev server:

   ```bash
   npm run dev
   ```

## How it works

The app has two tabs, switched via the icon-based bottom nav bar (Home /
History, active tab shown in green):

**Home**
- A green summary card at the top shows the total collected this month and
  how many members have paid, with a gold progress bar underneath.
- Search members by name.
- Add members with name + amount (amount defaults to `VITE_MONTHLY_AMOUNT`
  but is editable per member, before adding).
- Tap a member's row to toggle them paid/unpaid for the selected month —
  paid rows turn green-tinted with a green check-circle; the amount
  recorded is that member's configured amount. Press and hold a row
  (~500ms, works with both mouse and touch) to remove that member, which
  asks for confirmation first (`window.confirm`) — a normal tap never
  deletes anything.
- "Share on WhatsApp" (gold button) builds a plain-text summary of only
  the members who've paid for the selected month, with each amount and a
  total, and opens WhatsApp's share link so you can send it to the group.

**History**
- Three summary cards in a single row (total members, total collected
  across all months to date, and last calendar month's total).
- A month picker to browse any past (or future) month and see who paid and
  how much, independent of what's selected on Home.

## Security note

This app has no login system — anyone with the deployed URL and the public
`anon` key can read and write data, matching the "members mark themselves
paid" design. If you need to restrict who can mark payments, add Supabase
Auth and tighten the RLS policies in `supabase-schema.sql` to check
`auth.uid()`.

## Deployment

The app is deployed to **Vercel**, linked via `npx vercel link` with Git
integration connected to this repo — every push to `main` auto-deploys to
Production, other branches/PRs get Preview deployments. All four env vars
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MONTHLY_AMOUNT`,
`VITE_CURRENCY_SYMBOL`) are set for Production, Preview, and Development
via `vercel env add` — all four matter, since a missing one silently
falls back to an empty/zero value at build time rather than erroring.

Vercel serves from the domain root, so `vite.config.js`'s `base` resolves
to `/` there (see the comment on `base` in that file for the full
per-platform logic).

Live: **https://ppmkit-bbs.vercel.app/**

### Deprecated: GitHub Pages

This app used to also deploy to GitHub Pages via GitHub Actions. That
workflow has been removed and Pages has been turned off (source set to
"None" in Settings → Pages) to avoid having two live URLs — Vercel is now
the only deployment target. `https://shibiiin.github.io/ppmkit/` is no
longer live.

### Alternative: Netlify

The app also builds cleanly for Netlify, which serves from the domain
root (no `base` path needed):

1. Push this repo to GitHub.
2. In Netlify, "Add new site" → "Import an existing project" → pick the
   repo.
3. Build command: `npm run build`, publish directory: `dist`.
4. Add environment variables under Site settings → Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
