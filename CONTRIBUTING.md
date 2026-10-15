# Contributing to the Edulife IT School website

Thanks for helping improve the school site. This project is a **plain static
site** — HTML, CSS and vanilla JavaScript assembled by a small Node build
script. There is no framework, no bundler and no runtime dependency, and we
would like to keep it that way.

## Prerequisites

- **Node.js 18 or newer** (see `.nvmrc`; `nvm use` picks the right version)
- No global installs required — the build uses only Node built-ins

## Getting started

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install          # optional: only for the lint/format dev tools
npm run build        # assemble the site into dist/
npm run dev          # preview at http://localhost:4173/
```

## Project layout

```
src/        all sources — pages, components, layouts, data, assets
public/     files copied verbatim to the output (robots.txt, favicon)
scripts/    build.js, check.js, serve.js
dist/       GENERATED output — never edit by hand, never commit
docs/       architecture notes and the GitHub push guide
```

Full detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## The one rule that matters

**Never edit anything in `dist/`.** It is deleted and regenerated on every
build. Edit the source in `src/` (or `public/`) and rebuild.

## Making a change

1. **Content** (text, teachers, notices, events, blog posts, classes) lives in
   `src/data/*.json`. Edit the JSON — no markup changes needed.
2. **Markup** for a page lives in `src/pages/<name>.html`. Shared chrome lives
   in `src/components/` and `src/layouts/base.html`.
3. **Styling** lives in `src/assets/css/styles.css`. Design tokens are CSS
   custom properties at the top of the file — prefer changing a token over
   hard-coding a colour.
4. **Behaviour** lives in `src/assets/js/`. `renderers.js` is *isomorphic*: the
   same file runs in Node (during the build) and in the browser.

Then:

```bash
npm run verify       # build + run the quality gate
```

`npm run verify` must pass before you open a pull request. It checks tag
balance, unresolved `{{TOKEN}}`s, the internal link graph, the data contract and
orphaned CSS.

## Before opening a pull request

- [ ] `npm run verify` passes (build + quality gate)
- [ ] `npm run lint` reports no errors
- [ ] `npm run format:check` passes (or run `npm run format`)
- [ ] You did **not** commit `dist/` or `node_modules/`
- [ ] New pages were added to the `PAGES` manifest in `scripts/build.js`
- [ ] New images are real files (check the size — a failed download can leave a
      tiny HTML error page named `*.jpg` that still returns HTTP 200)

## Commit messages

Short imperative subject line, then a blank line and a body if the change needs
explanation:

```
Add winter concert to the events data

Adds the December concert to src/data/events.json and a matching
gallery entry. No markup changes — the renderers pick it up.
```

## Reporting a problem

Open an issue with the page URL, what you expected, what happened, and your
browser/OS. Screenshots help a lot for layout problems.

## Code style

Formatting is owned by Prettier (`.prettierrc`) and correctness by ESLint
(`eslint.config.js`). Run `npm run format` before committing and let the tools
settle style debates.
