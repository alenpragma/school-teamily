# Edulife IT School — website

A fast, dependency-free **multi-page static website** for Edulife IT School,
built from a small data layer and a single Node build script.

> **Stack:** plain HTML + CSS + vanilla JavaScript, assembled by a custom
> **Node.js static-site generator** (`scripts/build.js`). There is **no
> framework** — not React, not Next.js, not a bundler. The only runtime
> dependency is Node itself, and the only build step is `node scripts/build.js`.

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [Requirements](#2-requirements)
3. [Quick start](#3-quick-start)
4. [Project structure](#4-project-structure)
5. [How the build works](#5-how-the-build-works)
6. [Editing content](#6-editing-content)
7. [Adding a page](#7-adding-a-page)
8. [Quality checks](#8-quality-checks)
9. [Deploy](#9-deploy)
10. [Connecting a backend / CMS](#10-connecting-a-backend--cms)
11. [Live chat (tawk.to)](#11-live-chat-tawkt)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What this is

A complete school website — home, about, admission, teachers, notice board,
events, gallery, journal (blog), contact and a 404 page — plus **20 generated
detail pages** (one per blog post, notice and event).

The design goal is that **content lives in JSON, not in markup**. Every list on
the site (teachers, notices, events, gallery, blog posts, classes, admission
steps) is rendered from `src/data/*.json` through a shared, *isomorphic*
renderer file. That means:

- a non-developer can add a teacher or a notice by editing one JSON file;
- the same renderer runs in Node (at build time) and in the browser (at
  runtime), so a list pre-rendered at build time and the same list hydrated from
  an API produce **identical markup**;
- swapping the JSON for a real REST API is a one-flag change (see
  [§10](#10-connecting-a-backend--cms)).

The site is fully static: it works on any host, needs no server, and every page
is complete and indexable before a single line of JavaScript runs.

---

## 2. Requirements

- **Node.js 18 or newer** — the build uses only Node built-ins (`fs`, `path`,
  `crypto`, `http`). There is no `npm install` step required to build or preview.
- A modern browser for previewing.

The pinned version is in [`.nvmrc`](.nvmrc) (Node 20). With nvm:

```bash
nvm use
```

---

## 3. Quick start

```bash
# 1. Build the site into dist/
npm run build

# 2. Preview it locally at http://localhost:4173/
npm run dev
```

That is the whole loop. `npm run build` reads `src/` + `public/`, writes the
complete publishable site into `dist/`, and cleans `dist/` first so nothing
stale can survive.

Optional developer tooling (lint + format) is the only thing that needs an
install:

```bash
npm install          # installs eslint + prettier (dev-only)
npm run lint
npm run format
```

---

## 4. Project structure

```
edulife-it-school/
├── src/                        ← ALL SOURCES (edit here)
│   ├── pages/                  page bodies — the source of truth for markup
│   │   ├── index.html          home
│   │   ├── about.html  admission.html  teachers.html
│   │   ├── notice.html  events.html  gallery.html
│   │   ├── blog.html  contact.html  404.html
│   │   ├── article.html        the runtime ?type=&slug= detail route
│   │   └── detail.html         the template for every generated detail page
│   ├── components/             shared partials
│   │   ├── header.html  drawer.html  footer.html  lightbox.html
│   ├── layouts/
│   │   └── base.html           the single shell: <head>, slots, script tags
│   ├── data/                   ← THE CONTENT LAYER (JSON)
│   │   ├── site.json           brand, nav, contact, campuses, hero, pillars,
│   │   │                       stats, features, admissionSteps, classes,
│   │   │                       initiatives, ctaSteps, footer
│   │   ├── teachers.json       leadership + staff
│   │   ├── notices.json        notice board items
│   │   ├── events.json         event items
│   │   ├── gallery.json        gallery items
│   │   └── blog.json           journal posts (with full body content)
│   └── assets/
│       ├── css/styles.css      design tokens at :root, then component styles
│       ├── js/renderers.js     card + detail markup — ISOMORPHIC (Node + browser)
│       ├── js/data-loader.js   the static-JSON ↔ REST seam
│       ├── js/main.js          page behaviours only, no content
│       ├── js/article.js       the ?type=&slug= detail route
│       ├── js/chat.js          optional tawk.to live chat
│       └── images/             all site imagery
│
├── public/                     ← copied VERBATIM to the output root
│   └── robots.txt
│
├── scripts/                    ← the build tooling
│   ├── build.js                the static-site generator
│   ├── check.js                the quality gate
│   └── serve.js                zero-dependency local preview server
│
├── docs/
│   ├── ARCHITECTURE.md         how the pieces fit together
│   ├── PUSH-TO-GITHUB.md       step-by-step git + Pages walkthrough
│   └── sitemap.reference.xml   a sample generated sitemap
│
├── .github/workflows/
│   └── deploy-pages.yml        build + deploy to GitHub Pages
│
├── dist/                       ← GENERATED OUTPUT (gitignored, never edit)
│
├── netlify.toml                Netlify build + headers + rewrites
├── vercel.json                 Vercel build + headers + rewrites
├── package.json                metadata + npm scripts
├── eslint.config.js            ESLint flat config
├── .prettierrc / .prettierignore
├── .editorconfig  .gitattributes  .nvmrc
├── CONTRIBUTING.md
└── LICENSE                     MIT
```

**The one rule:** never edit anything in `dist/`. It is deleted and regenerated
on every build. Edit `src/` (or `public/`) and rebuild.

---

## 5. How the build works

`scripts/build.js` is the only thing that knows how the layers fit together:

```
src/data/*.json          content        (replaced by your API later)
src/components/*.html    partials       (header, drawer, footer, lightbox)
src/layouts/base.html    the shell      (<head>, slots, script tags)
src/pages/*.html         page bodies    (tokens + {{BLOCK_*}} placeholders)
src/assets/js/renderers.js   the view layer, shared with the browser
        │
        ▼
      dist/              the complete, publish-ready site
```

For each page it:

1. reads the body from `src/pages/`,
2. fills every `{{TOKEN}}` from `src/data/` (and expands `{{BLOCK_*}}`
   placeholders by calling the shared renderers),
3. wraps the result in `src/layouts/base.html`,
4. stamps every local CSS/JS URL with a **content hash** (`?v=xxxxxxxx`) so a
   redeploy can never sit behind a warm browser cache,
5. writes it to `dist/`.

It then generates one detail page per blog post / notice / event from
`src/pages/detail.html`, copies `src/assets/` and `public/` into `dist/`, and
writes `dist/sitemap.xml`.

**`dist/` is cleaned at the start of every build**, so a page that was renamed
or removed cannot linger as a stale file that still resolves on the host.

### npm scripts

| Script | What it does |
|---|---|
| `npm run build` | Assemble the site into `dist/` |
| `npm run dev` / `npm run preview` | Serve `dist/` at `http://localhost:4173/` |
| `npm run check` | Run the quality gate over `dist/` |
| `npm run clean` | Delete `dist/` |
| `npm run rebuild` | `clean` + `build` |
| `npm run verify` | `build` + `check` — run this before every commit |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier |

---

## 6. Editing content

Almost every change a school needs is a **JSON edit** — no markup, no rebuild
logic to understand.

| To change… | Edit |
|---|---|
| School name, tagline, contact details, campuses | `src/data/site.json` |
| Navigation links | `src/data/site.json` → `nav` |
| Hero headline, lead, buttons, floating badges | `src/data/site.json` → `hero` |
| The five admission steps | `src/data/site.json` → `admissionSteps` |
| The classes offered (and the form dropdown) | `src/data/site.json` → `classes.items` |
| The closing "Five clear steps" section copy | `src/data/site.json` → `ctaSteps` |
| Teachers and leadership | `src/data/teachers.json` |
| Notice board | `src/data/notices.json` |
| Events | `src/data/events.json` |
| Gallery | `src/data/gallery.json` |
| Journal / blog posts | `src/data/blog.json` |

After any edit:

```bash
npm run verify
```

**One important consistency rule:** the class dropdown in the admission form is
generated from `classes.items`, and the five admission steps on the homepage and
the Admission page both come from the single `admissionSteps` array. Add a class
or a step **once**, in the JSON, and every place that shows it updates together.
The quality gate fails if they ever drift apart.

---

## 7. Adding a page

1. Create `src/pages/<name>.html` with the page body (use an existing page as a
   template — it is just the fragment that goes inside `<main>`).
2. Add one entry to the `PAGES` manifest in `scripts/build.js`:

   ```js
   { src: 'my-page.html', out: 'my-page.html', key: 'my-page',
     title: 'My Page — Edulife IT School',
     description: 'A short description for search engines.' }
   ```

3. If the page should appear in the nav, add it to `nav` in
   `src/data/site.json` too.
4. `npm run verify`.

---

## 8. Quality checks

`npm run check` runs a dependency-free quality gate over the generated site:

| Check | What it proves |
|---|---|
| **Tag balance** | every generated page's tags open and close |
| **Unresolved tokens** | no `{{TOKEN}}` survived the build |
| **Link graph** | every internal `href`/`src` resolves on disk (0 dead links) |
| **Structure / data contract** | the homepage + admission sections match the data layer |
| **Class-dropdown sync** | the data layer drives every class `<option>` |
| **Dead CSS** | no orphaned rules for removed components |

It exits non-zero on failure, so it is safe to wire into CI (the GitHub Pages
workflow already runs it before deploying).

---

## 9. Deploy

The site is **fully static** and uses **relative paths only** — there are zero
root-absolute `/assets/…` references. It therefore works unchanged at a domain
root *and* at a sub-path such as `https://<user>.github.io/<repo>/`.

> ⚠️ **Do not add a `<base href>` tag.** It would break the relative `blog/`,
> `notice/` and `event/` detail routes.

### GitHub Pages

**Option A — GitHub Actions (recommended).** The included
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
rebuilds the site and runs the quality gate on every push to `main`, then
publishes `dist/`.

1. Push the repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main`. The site deploys automatically.

**Option B — deploy from a branch.** Run `npm run build` locally, commit the
`dist/` folder, then set **Settings → Pages → Source: Deploy from a branch →
`main` / `/dist`**.

### Netlify

[`netlify.toml`](netlify.toml) is already configured:

- **Build command:** `node scripts/build.js`
- **Publish directory:** `dist`
- Long-cache headers for `/assets/*`, revalidate for everything else
- Clean-URL rewrites for `/blog/*`, `/notice/*`, `/event/*` and `/article`
- A real 404 fallback to `/404.html`

Connect the repo in the Netlify UI and it will pick the config up automatically
(no settings to type).

### Vercel

[`vercel.json`](vercel.json) is already configured:

- **Build command:** `node scripts/build.js`
- **Output directory:** `dist`
- `cleanUrls: true`, `trailingSlash: false`
- The same cache headers and detail-route rewrites

Import the repo in Vercel; the config is detected automatically.

### Any other host

Run `npm run build` and upload the contents of `dist/` to any static host
(S3 + CloudFront, Cloudflare Pages, Firebase Hosting, a plain nginx box…). No
server-side runtime is required.

### Making the sitemap absolute

`dist/sitemap.xml` is generated with **relative** `<loc>` values so it is
correct in any environment. For production, replace them with absolute URLs
including your sub-path, e.g.:

```xml
<url><loc>https://example.com/edulife-it-school/index.html</loc></url>
```

---

## 10. Connecting a backend / CMS

The whole data contract lives in one file: `src/assets/js/data-loader.js`.

1. Set `config.useStaticJson = false`.
2. Set `config.apiBase = 'https://api.your-school.example/v1'`.
3. Make the `endpoints` map match your routes.
4. Mark up a container:
   `<div data-source="teachers" data-pick="staff" data-view="teachers"></div>`
5. Give the page a live flag: `<body data-live="true">`.

Nothing else changes. The build already ships pre-rendered HTML, so the page is
fully usable (and indexable) before JavaScript arrives; hydration only replaces
the list contents once the response lands. A network failure never blanks a
page — the build-time markup simply stays.

The JSON fixtures are also published to `dist/data/`, so the static mode keeps
working from the built site.

---

## 11. Live chat (tawk.to)

Chat is optional and off by default. To switch it on, edit **two constants in
one file** — `src/assets/js/chat.js`:

```js
var TAWK_PROPERTY_ID = '...';
var TAWK_WIDGET_ID   = '...';
```

Find both in your tawk.to dashboard under
**Administration → Channels → Chat Widget → Direct Chat Link** (the link looks
like `https://tawk.to/chat/<PROPERTY_ID>/<WIDGET_ID>`). Until real IDs are
pasted in, `chat.js` deliberately loads nothing at all — no widget, no console
errors.

---

## 12. Troubleshooting

**The page looks unstyled / a change did not appear.**
You are probably looking at a cached asset. The build stamps every CSS/JS URL
with a content hash, so a rebuild changes the URL — hard-refresh once. If you
edited `dist/` directly, your change was overwritten by the next build; edit
`src/` instead.

**`dist/ not found — run npm run build first.`**
`npm run dev` and `npm run check` both read `dist/`. Build first, or use
`npm run verify`.

**A detail page 404s.**
Detail pages live one level down (`blog/<slug>.html`). The build rewrites their
links with the correct `../` prefix automatically — if you hand-wrote a link in
a template, make it site-root-relative (e.g. `assets/css/styles.css`) and let
the build rebase it.

**An image is broken but returns HTTP 200.**
A failed download can leave a tiny HTML error page named `*.jpg`. Check the file
size — a real image is kilobytes, a stub is a few dozen bytes.

---

## License

[MIT](LICENSE) © Edulife IT School.
