# Upload to GitHub with drag and drop (no command line)

The project is 36 files, under GitHub's 100-file limit for browser uploads, and contains no secrets.

1. **Unzip** `aembot-inventory-stage1.zip`. GitHub cannot read the zip itself; drag the unzipped files.
2. On github.com click **+ → New repository**. Name it `aembot-inventory`, choose **Private**, and click **Create repository**. Leave the "add README / .gitignore" boxes unchecked.
3. On the empty repo page click **uploading an existing file**.
4. Open the unzipped `aembot-inventory` folder and **select everything inside it** (not the folder itself), then drag it into the browser window. Wait for every file to finish uploading. Use Chrome or Edge, since they keep the subfolders.
5. Type a message like "Stage 1" and click **Commit changes**.

## Check these two things afterward
- **Hidden files:** `.gitignore` and `.env.example` start with a dot, so Mac and some file managers hide them (Mac: press Cmd+Shift+. in Finder to show them). If they are missing on GitHub, upload them separately with **Add file → Upload files**.
- **Folders:** the repo should show `docs`, `src` and `supabase` folders. If files landed loose at the top, delete and redo step 4 with Chrome.

## Never upload
A file named `.env`, or any key labelled `service_role`. Only the project URL and anon key are used, and those go into Cloudflare's environment variables, not into GitHub.

Next: `docs/SUPABASE_SETUP.md`, then `docs/DEPLOYMENT.md`.
