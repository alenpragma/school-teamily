#!/usr/bin/env node
/* ==========================================================================
   scripts/check.js — quality gate for the static build
   --------------------------------------------------------------------------
   Runs a set of structural assertions over the GENERATED site in dist/ and the
   SOURCES in src/. It is deliberately dependency-free (Node built-ins only) so
   it can run in CI with no install step.

   RUN
       node scripts/check.js        (or: npm run check)

   CHECKS
     1. tag balance            every generated page's tags open and close
     2. unresolved tokens      no {{TOKEN}} survived the build
     3. link graph             every internal href/src resolves on disk
     4. structure / data       the homepage + admission contract holds
     5. class-dropdown sync    the data layer drives every class <option>
     6. dead CSS               no orphaned rules for removed components
   ========================================================================== */
'use strict';

const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

/* Generated pages only. dist/ holds nothing but generated + copied output, so
   the whole tree is fair game; templates in src/ use site-root-relative paths
   that would resolve against their own folder and report false positives. */
function walk(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const pages = walk(DIST);

/* ---------- 1. tag balance ---------- */
const tagBad = [];
for (const f of pages) {
  let h = fs.readFileSync(f, 'utf8');
  h = h.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const stack = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let m, bad = null;
  while ((m = re.exec(h))) {
    const name = m[1].toLowerCase(), closing = m[0][1] === '/', self = m[2] === '/';
    if (VOID.has(name) || self) continue;
    if (!closing) stack.push(name);
    else {
      if (stack.length && stack[stack.length - 1] === name) stack.pop();
      else { bad = 'unexpected </' + name + '>'; break; }
    }
  }
  if (bad || stack.length) tagBad.push(path.relative(DIST, f) + ' :: ' + (bad || 'unclosed ' + stack.join(',')));
}
console.log('TAG BALANCE: ' + (tagBad.length ? 'FAIL' : 'PASS') + ' (' + pages.length + ' pages)');
tagBad.slice(0, 8).forEach(b => console.log('   ' + b));

/* ---------- 2. unresolved tokens ---------- */
const tokLeft = [];
for (const f of pages) {
  const hits = (fs.readFileSync(f, 'utf8').match(/\{\{[A-Z0-9_]+\}\}/g) || []);
  if (hits.length) tokLeft.push(path.relative(DIST, f) + ' :: ' + [...new Set(hits)].join(','));
}
console.log('UNRESOLVED TOKENS: ' + (tokLeft.length ? 'FAIL' : 'PASS (0)'));
tokLeft.slice(0, 8).forEach(b => console.log('   ' + b));

/* ---------- 3. link graph ---------- */
const dead = [];
let refs = 0;
for (const f of pages) {
  const dir = path.dirname(f);
  const h = fs.readFileSync(f, 'utf8');
  const re = /(?:href|src)\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(h))) {
    const raw = m[1];
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/.test(raw)) continue;
    const clean = raw.split('?')[0].split('#')[0];
    if (!clean) continue;
    refs++;
    const target = clean.startsWith('/') ? path.join(DIST, clean) : path.resolve(dir, clean);
    if (!fs.existsSync(target)) dead.push(path.relative(DIST, f) + ' -> ' + raw);
  }
}
console.log('LINK GRAPH: ' + (dead.length ? 'FAIL' : 'PASS') + ' (' + refs + ' refs, 0 dead)');
[...new Set(dead)].slice(0, 10).forEach(d => console.log('   ' + d));

/* ---------- 4. structure: new section + data contract ---------- */
const idx = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const adm = fs.readFileSync(path.join(DIST, 'admission.html'), 'utf8');
const site = JSON.parse(fs.readFileSync(path.join(SRC, 'data/site.json'), 'utf8'));
const cnt = (h, re) => (h.match(re) || []).length;
const R = [];
R.push(['homepage .cta-cols', cnt(idx, /class="cta-cols"/g), 1]);
R.push(['homepage .step (5)', cnt(idx, /class="step reveal/g), 5]);
R.push(['homepage .form-card', cnt(idx, /class="form-card reveal/g), 1]);
R.push(['homepage class <option>', cnt(idx, /<option value="(Nursery|Junior One|Class One|Class Two|Class Three|Class Four|Class Five)"/g), 7]);
R.push(['homepage .cta-panel (dead)', cnt(idx, /cta-panel/g), 0]);
R.push(['homepage data-validate forms', cnt(idx, /data-validate/g), 1]);
R.push(['admission .step (5)', cnt(adm, /class="step reveal/g), 5]);
R.push(['admission class <option>', cnt(adm, /<option>(Nursery|Junior One|Class One|Class Two|Class Three|Class Four|Class Five)</g), 7]);
R.push(['site.json admissionSteps', site.admissionSteps.length, 5]);
R.push(['site.json classes.items', site.classes.items.length, 7]);
R.push(['site.json cta (removed)', site.cta === undefined, true]);
R.push(['site.json ctaSteps present', !!site.ctaSteps, true]);
let structBad = 0;
console.log('\nSTRUCTURE / DATA CONTRACT:');
for (const [label, got, want] of R) {
  const ok = got === want;
  if (!ok) structBad++;
  console.log('   ' + (ok ? 'ok  ' : 'FAIL') + ' ' + label + ' = ' + got + (ok ? '' : ' (want ' + want + ')'));
}

/* ---------- 5. class-option sync (data layer drives both) ---------- */
const names = site.classes.items.map(c => c.name);
const inAdm = names.every(n => adm.includes('>' + n + '</option>') || adm.includes('value="' + n + '"'));
const inIdx = names.every(n => idx.includes('value="' + n + '"'));
console.log('\nCLASS-DROPDOWN SYNC: ' + (inAdm && inIdx ? 'PASS' : 'FAIL') +
  ' (all ' + names.length + ' from data layer present in admission:' + inAdm + ' homepage:' + inIdx + ')');

/* ---------- 6. dead CSS classes ---------- */
const css = fs.readFileSync(path.join(SRC, 'assets/css/styles.css'), 'utf8');
const orphan = [];
for (const cls of ['cta-panel','cta-line','cta-ic','cta-ictxt','cta-end','cta-actions','cta-lead','cta-trust','cta-contact','cta-form']) {
  if (css.includes('.' + cls)) orphan.push('css still defines .' + cls);
}
console.log('DEAD CSS: ' + (orphan.length ? 'FAIL' : 'PASS (0 orphan rules)'));
orphan.forEach(o => console.log('   ' + o));

console.log('\nOVERALL: ' + (!tagBad.length && !tokLeft.length && !dead.length && !structBad && !orphan.length ? 'ALL PASS' : 'ISSUES FOUND'));
