/* ==========================================================================
   data-loader.js — THE SEAM BETWEEN STATIC JSON AND A LIVE BACKEND
   --------------------------------------------------------------------------
   This is the only file that knows where content comes from.

   ┌── HOW TO CONNECT A BACKEND / CMS ───────────────────────────────────────┐
   │ 1. Set config.useStaticJson = false                                     │
   │ 2. Set config.apiBase = 'https://api.your-school.example/v1'            │
   │ 3. Make the endpoint map below match your routes.                       │
   │ 4. Mark up the container:  <div data-source="teachers"                  │
   │                                  data-pick="staff"                      │
   │                                  data-view="teachers"></div>            │
   │ 5. Give the page a live flag: <body data-live="true">                   │
   │                                                                         │
   │ Nothing else changes. build.js already ships pre-rendered HTML, so the  │
   │ page is fully usable (and indexable) before JS arrives; hydration only  │
   │ replaces the list contents once the response lands.                     │
   └─────────────────────────────────────────────────────────────────────────┘

   Expected response shapes (see data/*.json for working examples):
     site.json      -> { brand, nav, contact, campuses, hero, pillars, stats,
                         features, marquee, deadlines, ... }
     teachers.json  -> { leadership: [...], staff: [...] }
     notices.json   -> { items: [...] }
     events.json    -> { items: [...] }
     gallery.json   -> { items: [...] }
     blog.json      -> { items: [...] }
   ========================================================================== */
(function () {
  'use strict';

  var EDU = window.EDU = window.EDU || {};

  var config = {
    /* true  -> read the JSON fixtures (the shipped default: this is the frozen
                static build, so every page must work with no backend).
       false -> read config.apiBase + endpoints[key].api instead. */
    useStaticJson: true,

    /* Folder holding the static JSON fixtures, RELATIVE TO THE SITE ROOT.
       The root itself is resolved at call time from this script's own URL
       (see siteRoot below), so it works from a root page
       ('assets/js/data-loader.js') and from a detail page one level down
       ('../assets/js/data-loader.js') without any per-page configuration. */
    dataDir: 'data/',

    /* Your backend / CMS base URL. No trailing slash. */
    apiBase: '',

    /* Static file name  <->  REST path — the whole data contract in one map. */
    endpoints: {
      site:     { json: 'site.json',     api: '/site' },
      teachers: { json: 'teachers.json', api: '/teachers' },
      notices:  { json: 'notices.json',  api: '/notices' },
      events:   { json: 'events.json',   api: '/events' },
      gallery:  { json: 'gallery.json',  api: '/gallery' },
      blog:     { json: 'blog.json',     api: '/blog' }
    }
  };

  /* Cache of resolved payloads, so a page reading several lists from the same
     source issues exactly one request. */
  var cache = {};

  /*
   * Absolute URL of the site root, derived from this script's own src.
   *
   * A bare 'data/blog.json' would resolve against the CURRENT page, which gives
   * the right answer only on a root page — from blog/<slug>.html it resolves to
   * blog/data/blog.json and 404s. Anchoring to <script src> instead is correct
   * at any depth and under any host rewrite.
   */
  function siteRoot() {
    var s = document.currentScript;
    if (!s || !s.src) {
      /* Called after load, so currentScript is null: find our own tag. */
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if (/data-loader\.js/.test(all[i].src)) { s = all[i]; break; }
      }
    }
    if (!s || !s.src) { return ''; }
    /* Strip the script's own path, leaving the site root with a trailing '/'. */
    return s.src.replace(/assets\/js\/data-loader\.js.*$/, '');
  }

  function urlFor(key) {
    var ep = config.endpoints[key];
    if (!ep) { throw new Error('[EDU] unknown data source: ' + key); }
    return config.useStaticJson
      ? (siteRoot() + config.dataDir + ep.json)
      : (config.apiBase + ep.api);
  }

  /** Load one named source. Returns a promise of the parsed payload. */
  function load(key) {
    if (cache[key]) { return cache[key]; }
    var url = urlFor(key);
    cache[key] = fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) { throw new Error('[EDU] ' + key + ' -> HTTP ' + res.status + ' (' + url + ')'); }
        return res.json();
      })
      .catch(function (err) {
        delete cache[key];                 /* let a later call retry */
        throw err;
      });
    return cache[key];
  }

  /* view name -> renderer supplied by renderers.js */
  var VIEWS = {
    pillars:      EDU.render.pillarCard,
    stats:        EDU.render.statCard,
    features:     EDU.render.featureCard,
    gallery:      EDU.render.galleryItem,
    teachers:     EDU.render.teacherCard,
    leadership:   EDU.render.memberCard,
    notices:      EDU.render.noticeRow,
    noticesFull:  EDU.render.announcementRow,
    events:       EDU.render.eventRow,
    eventsFull:   EDU.render.eventRowFull,
    blog:         EDU.render.postCard,
    initiatives:  EDU.render.initiativeCard,
    classes:      EDU.render.classCard
  };

  function pick(payload, path) {
    if (!path) { return payload; }
    return path.split('.').reduce(function (acc, part) {
      return acc === null || acc === undefined ? undefined : acc[part];
    }, payload);
  }

  /**
   * Find every [data-source] container and render it from its source.
   * A container looks like:
   *   <div data-source="teachers" data-pick="staff" data-view="teachers"></div>
   *   <div data-source="notices"  data-pick="items" data-view="notices"
   *        data-limit="3"></div>
   */
  function hydrate(root) {
    var live = document.body.getAttribute('data-live') === 'true';
    var containers = (root || document).querySelectorAll('[data-source]');
    if (!containers.length) { return Promise.resolve(false); }
    if (!live) {
      /* Static build: build.js already wrote the final HTML into each
         container. Leave it alone — this keeps the shipped page identical
         whether or not the visitor's JS runs. */
      return Promise.resolve(false);
    }

    var jobs = Array.prototype.map.call(containers, function (el) {
      var source = el.getAttribute('data-source');
      var view = el.getAttribute('data-view');
      var pickPath = el.getAttribute('data-pick');
      var limit = parseInt(el.getAttribute('data-limit'), 10);
      var renderer = VIEWS[view];
      if (!renderer) { return Promise.resolve(); }

      return load(source).then(function (payload) {
        var list = pick(payload, pickPath);
        if (!Array.isArray(list)) { return; }
        if (limit > 0) { list = list.slice(0, limit); }
        el.innerHTML = EDU.render.renderList(list, renderer);
      }).catch(function (err) {
        /* Network/API failure must never blank a page: the build-time markup
           stays exactly where it is. Surfaced loudly for the developer. */
        console.error(err);
      });
    });

    return Promise.all(jobs).then(function () { return true; });
  }

  EDU.config = config;
  EDU.load = load;
  EDU.hydrate = hydrate;
  EDU.siteRoot = siteRoot;
}());
