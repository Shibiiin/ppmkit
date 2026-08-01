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

The app has two tabs, switched via the bottom nav bar:

**Home**
- Search members by name.
- Add members with name + amount (amount defaults to `VITE_MONTHLY_AMOUNT`
  but is editable per member).
- Tap a member's row to toggle them paid/unpaid for the selected month
  (stamped with that member's amount). Press and hold a row (~500ms, mouse
  or touch) to remove that member, with a confirmation prompt first.
- "Share on WhatsApp" builds a plain-text summary of only the members who've
  paid for the selected month, with each amount and a total, and opens
  WhatsApp's share link so you can send it to the group.

**History**
- Three summary cards: total members, total collected across all months to
  date, and last calendar month's total.
- A month picker to browse any past (or future) month and see who paid and
  how much, independent of what's selected on Home.

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
