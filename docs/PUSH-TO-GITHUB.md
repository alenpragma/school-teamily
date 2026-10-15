# Pushing this project to your own GitHub repository

Everything here is plain static sources plus one Node script — there is **nothing to
install** to build or preview (no `npm install`, no dependencies). If you only want the
site online, you can skip straight to step 5.

---

## 1. Unzip and enter the folder

```bash
unzip edulife-it-school.zip
cd edulife-it-school
```

## 2. (Optional) Rebuild the site

`dist/` is **not** committed — it is a build artifact, regenerated from `src/` on every
build. So build it once before you deploy:

```bash
npm run build          # or: node scripts/build.js
```

This writes the complete publishable site into `dist/`. The build cleans `dist/` first,
so nothing stale can survive.

> If you change anything in `src/pages/`, `src/components/`, `src/layouts/`,
> `src/data/` or `src/assets/`, just run `npm run build` again.

## 3. Confirm the project is clean before committing

```bash
ls -a                 # you should NOT see a dist/ or node_modules/ folder committed
npm run check         # optional quality gate (tag balance, dead links, data contract)
```

## 4. Initialise the repository and make the first commit

```bash
git init
git add .
git commit -m "Initial commit: Edulife IT School website"
git branch -M main
```

## 5. Create the GitHub repository and push

Create an **empty** repository on GitHub first — no README, no .gitignore, no license
(otherwise the push is rejected as "remote contains work you do not have locally").
Your browser will ask you to authorise once.

```bash
# replace <your-username> and <your-repo> with your own values
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Using the GitHub CLI instead? `gh repo create <your-repo> --public --source=. --push`
does steps 5 and 6 in one go.

---

## 6. Host it on GitHub Pages

**Option A — GitHub Actions (recommended; rebuilds on every push to `main`)**

A workflow already ships at `.github/workflows/deploy-pages.yml`. It builds the site,
runs the quality gate, and publishes `dist/`. Simply:

1. Open the repo → **Settings** → **Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Push to `main` (or run the workflow from the **Actions** tab)

Your site appears at `https://<your-username>.github.io/<your-repo>/`.

**Option B — deploy straight from a branch (no CI)**

1. Run `npm run build` locally so `dist/` exists.
2. Commit the `dist/` folder (remove `dist/` from `.gitignore` first).
3. Open the repo → **Settings** → **Pages**
4. **Source**: *Deploy from a branch*
5. **Branch**: `main`, folder: **`/dist`** → **Save**

### Does the sub-path break anything?

**No.** The site uses **relative URLs only** — `assets/css/styles.css`, `about.html`,
`blog/<slug>.html` — and contains **zero root-absolute `/assets/...` references**. It
therefore works unchanged both at a domain root and at a repo sub-path like
`https://<your-username>.github.io/<your-repo>/`.

Two things worth doing for production, neither of which breaks local use:

- `dist/sitemap.xml` is generated with **relative** `<loc>` values. Make them absolute,
  including the sub-path: `https://<your-username>.github.io/<your-repo>/about.html`.
- Optionally add a `Sitemap: https://…` line to `public/robots.txt`.

**Do not add a `<base href="…">` tag** — it would break the relative detail routes under
`blog/` and `notice/`.

---

## Deploying somewhere else

Both configs are already in the repo and are detected automatically:

- **Vercel** — import the repo; `vercel.json` sets build `node scripts/build.js` and
  output `dist/`
- **Netlify** — connect the repo; `netlify.toml` sets build `node scripts/build.js` and
  publish `dist/`
- **Any static host** (S3 + CloudFront, nginx, Cloudflare Pages) — run `npm run build`
  and upload the contents of `dist/`, pointing the 404 handler at `404.html`

Full details, plus the folder map and the data-layer notes, are in **`README.md`** and
**`docs/ARCHITECTURE.md`**.
