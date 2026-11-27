# GitHub and Cloudflare Pages

## GitHub (private repo)
```
git init && git add . && git commit -m "Stage 1"
git branch -M main
git remote add origin https://github.com/YOUR-ORG/aembot-inventory.git
git push -u origin main
```
Confirm `.env` is not in the commit (`git status` should never list it).

## Cloudflare Pages
1. Workers & Pages → Create → Pages → Connect to Git → pick the private repo.
2. Build command: `npm run build`. Output directory: `dist`. Node 20 or newer.
3. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Deploy. The `*.pages.dev` URL is permanent and shareable. The repo stays private while the site is public; editing is protected by sign-in and database policies.
5. Put the final URL in Supabase → Authentication → URL Configuration (Site URL).
