# Architecture

How the Edulife IT School site is put together, and why.

## The stack, stated plainly

This is **not** a React or Next.js project. It is a **static multi-page site**:

- **HTML** — hand-written page fragments in `src/pages/`
- **CSS** — one stylesheet, `src/assets/css/styles.css`, with design tokens as
  CSS custom properties at `:root`
- **JavaScript** — vanilla, classic `<script>` tags (no modules, no bundler), so
  the site also works from `file://` and from any static host
- **Build** — a custom Node.js static-site generator, `scripts/build.js`, using
  only Node built-ins

There is no framework, no bundler, no transpiler and no runtime dependency. The
only tool you need is Node.

## Why a custom build script instead of a framework

The site is content-heavy but structurally simple: ten pages, three families of
detail page, and a handful of repeating lists. A framework would add a build
toolchain, a dependency tree and a hydration model to solve problems this site
does not have. A ~500-line build script gives the same benefits that matter
here — shared layouts, a data layer, generated detail pages, cache-busting —
with none of the weight, and it stays readable by any developer.

## The three layers

```
   ┌──────────────────────────────────────────────────────────────┐
   │  CONTENT        src/data/*.json                              │
   │                 brand, nav, teachers, notices, events,       │
   │                 gallery, blog, classes, admission steps      │
   └───────────────────────────┬──────────────────────────────────┘
                               │  read at build time
   ┌───────────────────────────▼──────────────────────────────────┐
   │  VIEW           src/assets/js/renderers.js                   │
   │                 fn(item, i) -> htmlString                    │
   │                 ISOMORPHIC: runs in Node AND in the browser  │
   └───────────────────────────┬──────────────────────────────────┘
                               │  called by
   ┌───────────────────────────▼──────────────────────────────────┐
   │  ASSEMBLY       scripts/build.js                             │
   │                 layout + components + pages + data -> dist/  │
   └──────────────────────────────────────────────────────────────┘
```

### 1. Content — `src/data/`

All content is JSON. Nothing about a teacher, a notice or a blog post is
hard-coded in markup. This is the layer a school administrator edits, and the
layer a backend would replace.

### 2. View — `src/assets/js/renderers.js`

Every card and every detail page is produced by a pure function
`fn(item, index) -> htmlString`. The file is **isomorphic**: it ends with

```js
if (typeof module !== 'undefined' && module.exports) { module.exports = ...; }
else { window.EDU = window.EDU || {}; window.EDU.render = ...; }
```

so `build.js` can `require()` it in Node while the browser loads the very same
file as a classic script. This is the property that makes the static build and a
future dynamic backend produce **identical markup** — there is only one
implementation of "what a teacher card looks like".

### 3. Assembly — `scripts/build.js`

For each page in the `PAGES` manifest it:

1. reads the body from `src/pages/`,
2. resolves `{{TOKEN}}` placeholders from `src/data/`,
3. expands `{{BLOCK_*}}` placeholders by calling the renderers,
4. wraps the result in `src/layouts/base.html`,
5. stamps local CSS/JS URLs with a content hash,
6. writes the page to `dist/`.

It then generates one detail page per blog post / notice / event from
`src/pages/detail.html`, copies `src/assets/` and `public/` into `dist/`, and
writes `dist/sitemap.xml`.

## Two ideas that carry the design

### Isomorphic renderers

Because the renderer is shared, a list pre-rendered at build time and the same
list hydrated from an API are byte-for-byte the same markup. There is no
"server template" and "client template" to keep in sync.

### Declarative list containers

Each repeating list is one element:

```html
<div class="teachers" data-source="teachers" data-pick="staff"
     data-view="teachers" data-limit="8">
  <!-- pre-rendered children written by the build -->
</div>
```

Going dynamic means flipping `useStaticJson: false`, setting `apiBase`, and
marking the page `data-live="true"`. Nothing else changes — and because the
build already wrote real cards, the page stays complete and indexable before
JavaScript runs.

## Detail pages: one template, two entry points

Every blog post, notice and event gets a **real file** at
`blog/<slug>.html` (etc.), generated from the single `src/pages/detail.html`
template. That file is crawlable, shareable and works with no JavaScript.

The same content is *also* reachable through one runtime route,
`article.html?type=<blog|notice|event>&slug=<slug>`, which renders client-side
through the same renderers. That is the shape a dynamic backend needs, and it is
what the host rewrites (`/blog/:slug` → `/blog/:slug.html`) target.

Routing lives in exactly one function, `detailHref(type, slug)`, so every
listing link, pager link and related-card link is built the same way.

## Why `dist/` is separate and gitignored

`dist/` is a **build artifact**. It is deleted and regenerated on every build,
so:

- a page that was renamed or removed cannot linger as a stale file;
- there is never a question of whether the committed output matches the source;
- the repository stays small and reviewable — you review `src/`, not generated
  HTML.

The build cleans `dist/` at the start of every run for exactly this reason.

## Cache-busting

Assets are served with a long `Cache-Control: max-age`, and edges commonly
ignore the query string when revalidating. Without cache-busting, a redeploy can
sit unseen behind a warm browser cache for days.

So the build hashes the bytes of every local CSS/JS file into a `VERSION` and
emits `styles.css?v=<hash>` on every page. The URL changes whenever the code
does, which makes the long `immutable` cache header safe. The hash is derived
from the `LOCAL_ASSETS` list, so adding an asset in one place cannot silently
leave it out.

## Relative paths and sub-path hosting

The site uses **relative URLs only** — there are zero root-absolute `/assets/…`
references. It therefore works unchanged at a domain root *and* at a sub-path
such as `https://<user>.github.io/<repo>/`.

Detail pages live one level down, so the build runs each generated page through
`rebase(html, depth)`, which prefixes site-root-relative `href`/`src` (and
`og:image`) with the right number of `../` hops and leaves absolute URLs, `#`,
`mailto:`, `data:` and already-relative paths alone.

> **Do not add a `<base href>` tag** — it would break the relative `blog/`,
> `notice/` and `event/` routes.

## The quality gate

`scripts/check.js` runs six structural assertions over `dist/` and `src/`:
tag balance, unresolved tokens, the internal link graph, the structure/data
contract, class-dropdown sync, and orphaned CSS. It exits non-zero on failure
and is wired into the GitHub Pages workflow, so a broken build cannot deploy.

## Directory conventions

| Directory | Holds | Committed? |
|---|---|---|
| `src/` | all sources — pages, components, layouts, data, assets | yes |
| `public/` | files copied verbatim to the output root | yes |
| `scripts/` | build, check and preview tooling | yes |
| `docs/` | architecture notes and the push guide | yes |
| `dist/` | the generated site | **no** (gitignored) |
