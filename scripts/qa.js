#!/usr/bin/env node
// QA gate for lexoniagroup.com — Agency Playbook SOP 02 (QA Before Deploy), run on every pull request.
// Zero dependencies. Exit 1 blocks the merge. Never weaken a check to get a deploy through: fix the cause.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://lexoniagroup.com';
const PIXEL_ID = '1466460141530283', CLARITY_ID = 'w4if5scy0w';
const problems = [], notes = [];
const fail = (f, m) => problems.push(`${f}: ${m}`);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'scripts') continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const html = files.filter(f => f.endsWith('.html'));
const rel = f => path.relative(ROOT, f).replace(/\\/g, '/');
const cleanUrl = f => { const r = rel(f).replace(/\.html$/, ''); return r === 'index' ? SITE + '/' : SITE + '/' + r; };

// Rule 8 — required files (Playbook Phase 7: Facebook crawler files + config)
for (const req of ['netlify.toml', 'ucp', 'meta.json', 'robots.txt', 'sitemap.xml', '404.html', 'images/og-home.jpg']) {
  if (!fs.existsSync(path.join(ROOT, req))) fail(req, 'required file missing');
}
const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
if (!/from = "\/\.well-known\/ucp"/.test(toml)) fail('netlify.toml', 'missing /.well-known/ucp redirect');
for (const h of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) {
  if (!toml.includes(h)) fail('netlify.toml', `security header ${h} missing`);
}

for (const f of html) {
  const r = rel(f), s = fs.readFileSync(f, 'utf8');
  if (r === '404.html') continue;
  // Rule 1 — structure
  const cnt = re => (s.match(re) || []).length;
  if (cnt(/<a[\s>]/g) !== cnt(/<\/a>/g)) fail(r, `unbalanced <a>: ${cnt(/<a[\s>]/g)} open / ${cnt(/<\/a>/g)} close`);
  if (cnt(/<h1[\s>]/g) !== 1) fail(r, `expected exactly one <h1>, found ${cnt(/<h1[\s>]/g)}`);
  if (!/<title>[^<]{10,}<\/title>/.test(s)) fail(r, 'missing or too-short <title>');
  if (!/<meta name="description" content="[^"]{50,}"/.test(s)) fail(r, 'meta description missing or under 50 chars');
  if (!/<meta name="viewport"/.test(s)) fail(r, 'viewport meta missing');
  // Rule 6 — canonical / OG must use the served host (non-www) and clean URLs
  const canon = (s.match(/rel="canonical" href="([^"]+)"/) || [])[1];
  if (!canon) fail(r, 'canonical missing'); else if (canon !== cleanUrl(f)) fail(r, `canonical is ${canon}, expected ${cleanUrl(f)}`);
  const ogUrl = (s.match(/property="og:url"\s+content="([^"]+)"/) || [])[1];
  if (!ogUrl) fail(r, 'og:url missing'); else if (ogUrl !== cleanUrl(f)) fail(r, `og:url is ${ogUrl}, expected ${cleanUrl(f)}`);
  const ogImg = (s.match(/property="og:image"\s+content="([^"]+)"/) || [])[1];
  if (!ogImg) fail(r, 'og:image missing');
  else if (!ogImg.startsWith(SITE + '/')) fail(r, `og:image must be self-hosted on ${SITE}: ${ogImg}`);
  else { const local = path.join(ROOT, ogImg.slice(SITE.length + 1)); if (!fs.existsSync(local)) fail(r, `og:image file not in repo: ${ogImg}`); else if (fs.statSync(local).size < 20000) fail(r, 'og:image under 20 KB (blank-card risk)'); }
  if (/www\.lexoniagroup\.com/.test(s.replace(/img-src[^;]*/g, ''))) fail(r, 'references www.lexoniagroup.com (site serves non-www; canonical mismatch)');
  // Rule 4/5 — tracking on every page
  if (!s.includes(PIXEL_ID)) fail(r, 'Meta Pixel id missing');
  if (!s.includes(CLARITY_ID)) fail(r, 'Clarity project id missing');
  // Rule 7 — inline JS parses; JSON-LD parses
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi; let m, ld = 0;
  while ((m = re.exec(s))) {
    if (/src=/.test(m[1])) continue;
    const body = m[2].trim();
    if (/ld\+json/.test(m[1])) { ld++; try { JSON.parse(body); } catch (e) { fail(r, 'JSON-LD does not parse: ' + e.message.slice(0, 60)); } }
    else { try { new vm.Script(body); } catch (e) { fail(r, 'inline JS syntax: ' + e.message.slice(0, 60)); } }
  }
  if (ld === 0) fail(r, 'no schema.org JSON-LD block');
  // Rule 10 — inline multi-column grids are forbidden unless a class with a mobile override is present
  const grids = s.match(/style="[^"]*grid-template-columns:\s*repeat\((\d)[^"]*"[^>]*/g) || [];
  for (const g of grids) if (!/class="[^"]*\bcases-grid\b/.test(g) && !/class="[^"]*grid/.test(g)) fail(r, 'inline multi-column grid without a responsive class (Rule 10)');
  // images need alt
  for (const img of s.match(/<img[^>]*>/g) || []) if (!/\balt=/.test(img)) fail(r, 'img without alt: ' + img.slice(0, 70));
  // Rule 2 — internal links resolve
  for (const l of s.match(/href="([^"#:]+)"/g) || []) {
    let t = l.slice(6, -1).split('?')[0]; if (!t || t.startsWith('mailto') || t.startsWith('tel')) continue;
    const base = t.startsWith('/') ? ROOT : path.dirname(f);
    const cand = [path.join(base, t), path.join(base, t + '.html'), path.join(base, t.replace(/\/$/, '') + '.html'), path.join(base, t, 'index.html')];
    if (!cand.some(c => fs.existsSync(c))) fail(r, `internal link does not resolve: ${t}`);
  }
  if (/drive\.google\.com/.test(s)) fail(r, 'links to Google Drive (host policy pages on the site instead)');
}
// sitemap lists every public page with the served host
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const f of html) { const r = rel(f); if (['404.html', 'thank-you.html'].includes(r)) continue; if (!sm.includes(cleanUrl(f))) fail('sitemap.xml', `missing ${cleanUrl(f)}`); }
if (/www\.lexoniagroup\.com/.test(sm)) fail('sitemap.xml', 'uses www host');

console.log(`QA: ${html.length} pages checked`);
notes.forEach(n => console.log('note: ' + n));
if (problems.length) { console.log('\nBLOCKED — ' + problems.length + ' problem(s):'); problems.forEach(p => console.log(' - ' + p)); process.exit(1); }
console.log('CLEAR TO DEPLOY');
