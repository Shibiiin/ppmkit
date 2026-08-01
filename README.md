# PPM Charity Fund Tracker

A small React + Vite + Supabase app for tracking a monthly group fund. Members
mark themselves as paid for the current month, an admin can share a WhatsApp
report of who has/hasn't paid, and full payment history is stored in
Supabase.

## Stack

- React 19 + Vite
- Tailwind CSS
- Supabase (Postgres + auto-generated REST API)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com), then
   open **SQL Editor** in your project dashboard and run the contents of
   [`supabase-schema.sql`](./supabase-schema.sql). This creates the
   `members` and `payments` tables with row-level security enabled.

3. Copy `.env.example` to `.env` and fill in your project's credentials
   (Project Settings → API):

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   `.env` is gitignored and should never be committed — it holds real
   credentials. Only `.env.example` (with placeholder values) is tracked.

4. Start the dev server:

   ```bash
   npm run dev
   ```

## How it works

- Add members with the "Add" form.
- Click a member's row to toggle them paid/unpaid for the selected month.
- Use the month picker to view or edit any past or future month — this is
  your payment history.
- "Share on WhatsApp" builds a plain-text summary of who's paid and who
  hasn't for the selected month and opens WhatsApp's share link so you can
  send it to the group.

## Security note

This app has no login system — anyone with the deployed URL and the public
`anon` key can read and write data, matching the "members mark themselves
paid" design. If you need to restrict who can mark payments, add Supabase
Auth and tighten the RLS policies in `supabase-schema.sql` to check
`auth.uid()`.

## Deployment (Netlify)

1. Push this repo to GitHub.
2. In Netlify, "Add new site" → "Import an existing project" → pick the repo.
3. Build command: `npm run build`, publish directory: `dist`.
4. Add environment variables under Site settings → Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
