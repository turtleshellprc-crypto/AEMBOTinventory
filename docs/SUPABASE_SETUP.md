# Supabase setup (free tier)

1. Create a project at supabase.com (free plan). Save the database password.
2. **Disable open signup first:** Authentication → Sign In / Providers → Email → turn **off** "Allow new users to sign up". Keep "Confirm email" on.
3. **SQL Editor:** run, in order, each file in `supabase/migrations/` (0001 → 0005). Optionally run `supabase/seed.sql` for starter categories.
4. **URL settings:** Authentication → URL Configuration. Set Site URL to your deployed site (e.g. `https://aembot-inventory.pages.dev`). Add `http://localhost:5173` to Redirect URLs for local work.
5. **Create the first administrator:** Authentication → Users → **Invite user**, enter your email. Open the email link and choose a password. The first account created is automatically Administrator.
6. **Invite everyone else** the same way. They start with the Student role (view only). Until Stage 3 adds the Team page, change roles in Table Editor → `user_roles` (swap `role_id`). The database refuses to remove or deactivate the last active administrator.
7. Project Settings → API: copy the **Project URL** and **anon public key** into `.env` and Cloudflare. Do not use the service_role key anywhere in this project.

## Free-tier cautions
- Built-in invite emails have a low hourly send limit and may land in spam. For a larger team, add a custom SMTP provider (Authentication → SMTP).
- Free projects pause after about a week with no activity; restore from the dashboard or visit the site regularly.
- No guaranteed automatic backups on the free plan. Export data periodically (Stage 5 adds CSV export).
