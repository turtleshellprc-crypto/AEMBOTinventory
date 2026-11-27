# AEMBOT 6443 Inventory

Inventory system for FRC Team 6443. **Stage 1 of 5**: core inventory, public read access, invite-only editing.

## What works in Stage 1
- Dashboard (totals, quantity by category, low/out-of-stock list, recent activity for signed-in members)
- Master inventory: add, edit, archive/restore, search, filters (category, location incl. sub-locations, stock level, source), pagination
- Quantity changes through an atomic database function (set count / add / remove) with full history
- Categories and hierarchical storage locations
- Invite-only accounts, sign-in, password reset, first user becomes Administrator
- Public read access via a restricted view; edits protected by Row Level Security

## Not built yet (shown honestly)
- Subsystems, allocations, return/mark-as-used: **Stage 2**. Allocated is always 0 until then.
- Role/permission management UI, in-app invites, deactivation UI: **Stage 3**. Roles and permissions already exist in the database; manage them in Supabase for now.
- Fusion 360 add-in: **Stage 4**. CSV import/export, QR/barcodes, backups: **Stage 5**.
- Activity History page: the history is recorded and shown per item; the dedicated page comes with Stage 2/3.
- Image upload (only an image URL field for now).

## Stack
Vite + React + TypeScript, plain CSS, supabase-js, TanStack Query, Recharts, React Router. (The plan mentioned Tailwind; plain CSS was used to keep dependencies small.)

## Quick start
1. Follow `docs/SUPABASE_SETUP.md` (database, invite-only auth).
2. `cp .env.example .env` and fill in the two values.
3. `npm install && npm run dev`
4. Deploy with `docs/DEPLOYMENT.md` (to put the code on GitHub without the command line, see `UPLOAD_TO_GITHUB.md`). Test with `docs/TESTING.md`.

## Security notes
- Only the Supabase URL and anon key are used in the frontend. The anon key is public by design; Row Level Security is what protects data.
- Never put the `service_role` key in this repo, in `.env`, or in Cloudflare variables.
- Quantities cannot be written directly by clients; only `adjust_quantity()` changes them, and it logs every change.
- This code was compiled and type-checked, but the SQL has not been run against a live Supabase project yet. Run the checklist in `docs/TESTING.md` before relying on it.
