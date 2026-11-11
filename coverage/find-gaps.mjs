#!/usr/bin/env node
// find-gaps.mjs — lists SkyPermit business rules that no test case covers yet.
//
// Rules are read live from ct-gen-ai-skypermit/docs (no separate rules file), test
// cases from test-cases/**. Read-only: it writes nothing anywhere.
//
// Usage:
//   node coverage/find-gaps.mjs                 table of every rule
//   node coverage/find-gaps.mjs --gaps          only missing / partial rules
//   node coverage/find-gaps.mjs --module 04     one module
//   node coverage/find-gaps.mjs --json          machine-readable (used by the cover-gaps skill)
// Env: SKYPERMIT_DOCS overrides the docs folder.
// Exit code: 1 if any rule is missing or partial, 0 otherwise.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = process.env.SKYPERMIT_DOCS || resolve(ROOT, '..', 'ct-gen-ai-skypermit', 'docs');
const CASES = process.env.SKYPERMIT_CASES || join(ROOT, 'test-cases');

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);

// ---------- reading ----------
const doc = (f) => {
  const p = join(DOCS, f);
  if (!existsSync(p)) { console.error(`Docs file not found: ${p}`); process.exit(2); }
  return readFileSync(p, 'utf8');
};
const D = { data: doc('01-data-model.md'), state: doc('02-state-machine.md'), api: doc('03-api-contract.md'),
  open: doc('05-open-questions.md'), rules: doc('06-business-rules.md') };

const strip = (s) => s.replace(/[`*]/g, '').trim();
const firstTick = (s) => (s.match(/`([^`]+)`/) || [])[1];

/** Markdown tables in a block of text -> [{head, rows, heading}] (cells raw, trimmed). */
function tables(md) {
  const lines = md.split('\n'), out = [];
  let heading = '';
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,4} /.test(lines[i])) heading = lines[i].replace(/^#+\s*/, '');
    if (lines[i].startsWith('|') && /^\|[\s:|-]+\|$/.test(lines[i + 1] || '')) {
      const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
      const t = { head: cells(lines[i]), rows: [], heading };
      i += 2;
      while (i < lines.length && lines[i].startsWith('|')) t.rows.push(cells(lines[i++]));
      i--; out.push(t);
    }
  }
  return out;
}
/** Text of a "## N. ..." section up to the next "## ". */
function section(md, re) {
  const lines = md.split('\n'), s = lines.findIndex((l) => re.test(l));
  if (s < 0) return '';
  let e = lines.findIndex((l, i) => i > s && /^## /.test(l));
  return lines.slice(s, e < 0 ? undefined : e).join('\n');
}
const tableWithHead = (md, first) => tables(md).find((t) => t.head[0] === first || t.head.join('|').startsWith(first));

// module registry from test-cases/README.md
const modules = {};
const readme = join(CASES, 'README.md');
if (existsSync(readme)) for (const m of readFileSync(readme, 'utf8').matchAll(/^\|\s*(\d\d)\s*\|\s*([^|]+?)\s*\|/gm)) modules[m[1]] = m[2];

// ---------- test cases ----------
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') && n !== 'README.md' ? [p] : [];
  });
}
const cases = [];
for (const f of walk(CASES)) {
  for (const part of readFileSync(f, 'utf8').split(/^(?=### E2E-)/m)) {
    const id = (part.match(/^### (E2E-\d\d-\d{3})/) || [])[1];
    if (!id) continue;
    cases.push({ id, file: f.replace(ROOT + '/', ''), text: part, type: (part.match(/\*\*Type:\*\*\s*(\w+)/) || [])[1] || '' });
  }
}

// ---------- matchers ----------
const has = (t, s) => t.toLowerCase().includes(s.toLowerCase());
const word = (t, w) => new RegExp(`\\b${w}\\b`, 'i').test(t);
const gateFails = (t, g) => new RegExp(`failing_gate[^\\n]{0,30}?\\b${g}\\b`, 'i').test(t);
const num = (t, n) => {
  const withComma = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return new RegExp(`(?<![\\d,.])(${n}|${withComma})(?!\\d)`).test(t);
};

// ---------- rule generation ----------
const rules = [];
const notes = [];
const add = (r) => rules.push({ need: 1, boundary: false, open: false, ...r });
const present = (md, re, why) => { if (re.test(md)) return true; notes.push(`Skipped rule "${why}": expected text not found in docs (docs changed?)`); return false; };

// A. 06 §6 — rule_reference table: the gate rules
{
  const t = tables(section(D.rules, /^## 6\./))[0];
  const BOUNDARY = /too short|too far|out of range|curfew|exceeds|not current|authorisation|30,000/i;
  t.rows.forEach(([gateCell, cond, refCell], i) => {
    const gate = firstTick(gateCell), ref = firstTick(refCell), c = strip(cond);
    const isReg = !gate;
    add({
      id: `BR-6.${i + 1}`, module: isReg ? '02' : '04', src: '06 §6',
      title: isReg ? `Registration: ${c} -> 422 (${ref})` : `${gate}: ${c} -> 422 (${ref})`,
      boundary: BOUNDARY.test(c), need: /authorisation/i.test(c) ? 2 : 3,
      open: /not yet|not fully/i.test(refCell),
      match: (t) => has(t, ref) && (isReg ? has(t, '422') && (num(t, 30000) || num(t, 30001)) : gateFails(t, gate)),
    });
  });
}

// B. 06 §1.1 — pilot rating x zone class matrix
{
  const line = D.rules.split('\n').find((l) => /R_BASIC.*→.*R_ADVANCED.*→.*R_BVLOS.*→/.test(l));
  const classes = (D.data.match(/`Zone\.zone_class`\s*\|\s*([^|]+)\|/) || [])[1]?.match(/`(\w+)`/g)?.map(strip) || [];
  if (line && classes.length) {
    for (const m of line.matchAll(/`(R_\w+)`\s*→\s*([^·|]+)/g)) {
      const allowed = m[2].match(/\b[A-Z]{4,}\b/g) || [];
      for (const cls of classes) {
        const ok = allowed.includes(cls);
        add({ id: `BR-1.1-${m[1]}-${cls}`, module: '04', src: '06 §1.1',
          title: `PILOT ${m[1]} + ${cls} zone -> ${ok ? 'passes rating check' : '422 PILOT OH-1 §2.1'}`,
          match: (t) => word(t, m[1]) && word(t, cls) });
      }
    }
  } else notes.push('Skipped pilot rating x zone class matrix: line or Zone.zone_class enum not found in docs');
}

// C. 06 §3 — weight band boundaries (upper bound inclusive, and 1 g above)
{
  const t = tableWithHead(D.rules, 'Band');
  if (t) {
    const bands = t.rows.map((r) => ({ band: strip(r[0]), up: parseInt(strip(r[2]).replace(/,/g, ''), 10) }));
    bands.forEach((b, i) => {
      const next = bands[i + 1];
      add({ id: `BR-3-${b.band}-at`, module: '02', src: '06 §3', title: `Aircraft of exactly ${b.up} g is band ${b.band} (upper bound inclusive)`,
        match: (t) => num(t, b.up) && word(t, b.band) });
      add({ id: `BR-3-${b.band}-above`, module: '02', src: '06 §3',
        title: next ? `Aircraft of ${b.up + 1} g is band ${next.band}` : `Aircraft of ${b.up + 1} g is refused at registration (422)`,
        match: (t) => num(t, b.up + 1) && (next ? word(t, next.band) : has(t, '422')) });
    });
  } else notes.push('Skipped weight bands: table "Band" not found in 06');
}

// D. 06 §4 — one rule per zone
{
  const t = tableWithHead(D.rules, 'Code');
  if (t) for (const r of t.rows) {
    const code = strip(r[0]);
    add({ id: `BR-4-${code}`, module: '03', src: '06 §4', title: `Zone ${code} data shown as catalogued (class ${strip(r[2])}, ceiling ${strip(r[3])}, curfew ${strip(r[5])})`,
      match: (t) => has(t, code) });
  } else notes.push('Skipped zones: table "Code" not found in 06');
}

// E. 02 — transitions
{
  const tr = tableWithHead(D.state, 'From');
  const states = (tableWithHead(D.state, 'State')?.rows || []).map((r) => strip(r[0]));
  const actOf = (s) => (strip(s).match(/^[a-z]+/i) || [''])[0].toLowerCase();
  const reviewer = (a) => a === 'approve' || a === 'reject';
  const legal = new Set(), actions = new Set();
  for (const [fromC, actC, toC] of tr?.rows || []) {
    const from = strip(fromC), a = actOf(actC);
    if (/^\(/.test(strip(actC))) {                       // automatic gate outcomes
      const pass = /pass/i.test(actC), to = strip(toC);
      add({ id: `ST-submit-${to}`, module: '04', src: '02', title: `submit -> gates ${pass ? 'pass' : 'fail'} -> ${to}`,
        match: (t) => has(t, 'submit') && word(t, to) && (pass || has(t, 'failing_gate')) });
      continue;
    }
    actions.add(a); legal.add(`${from}|${a}`);
    if (a === 'submit') continue;                         // covered by the two outcome rules
    if (from === 'SUBMITTED') { notes.push(`Not testable at rest: ${from} + ${a} (transient state, see 02)`); continue; }
    const to = firstTick(toC);
    add({ id: `ST-${from}-${a}`, module: reviewer(a) ? '06' : '05', src: '02', title: `${a} from ${from} -> ${to}`,
      boundary: from === 'APPROVED' && a === 'cancel', need: 3,
      match: (t) => word(t, from) && has(t, a) && word(t, to) });
  }
  for (const from of states) {
    if (from === 'SUBMITTED') continue;
    for (const a of actions) if (!legal.has(`${from}|${a}`) && !(from === 'SUBMITTED'))
      add({ id: `ST-${from}-${a}-409`, module: reviewer(a) ? '06' : '05', src: '02', title: `${a} from ${from} is illegal -> 409`,
        match: (t) => word(t, from) && has(t, a) && has(t, '409') });
  }
}

// F. 06 §5 — cancellation deadline (APPROVED)
if (present(D.rules, /## 5\. Cancellation deadline/, 'cancellation deadline')) {
  const h = (section(D.rules, /^## 5\./).match(/(\d+) hours/) || [])[1];
  add({ id: 'BR-5', module: '05', src: '06 §5', title: `Cancel APPROVED request: allowed up to ${h} h before window_start, rejected (409) closer`,
    boundary: true, need: 3, match: (t) => has(t, 'cancel') && word(t, 'APPROVED') && (new RegExp(`\\b${h} ?(hours?|h)\\b|deadline`, 'i')).test(t) });
}

// G. 03 — endpoints and error statuses
{
  const modOf = (path, m) => /^\/(auth|operators)/.test(path) ? '01' : /^\/(pilots|aircraft)/.test(path) ? '02' : /^\/zones/.test(path) ? '03'
    : /validate|submit/.test(path) ? '04' : /approve|reject/.test(path) ? '06' : '05';
  for (const t of tables(D.api)) {
    if (t.head.join(',') === '#,Method,Path,Purpose') for (const [n, m, p, purpose] of t.rows) {
      const method = strip(m), path = strip(p);
      const re = new RegExp('/api/v1' + path.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '[^\\s`/?]+'), 'i');
      add({ id: `EP-${method}-${path}`, module: modOf(path), src: '03', title: `${method} ${path} — ${strip(purpose).split(/[.—]/)[0].slice(0, 70)}`,
        match: (t) => re.test(t) });
    }
    if (t.head[0] === 'Status') for (const [s, meaning] of t.rows) {
      const code = strip(s), mod = { 400: '01', 401: '01', 403: '01', 404: '02', 409: '05', 422: '04' }[code] || '01';
      add({ id: `ERR-${code}`, module: mod, src: '03', title: `Status ${code}: ${strip(meaning)}`, match: (t) => new RegExp(`\\b${code}\\b`).test(t) });
    }
  }
}

// H. 01 — unique fields (docs do not state the response -> open)
{
  let entity = '';
  for (const line of D.data.split('\n')) {
    const h = line.match(/^### (\w+)/); if (h) entity = h[1];
    const u = line.match(/^\| `(\w+)` \| unique \|/);
    if (u) add({ id: `UQ-${entity}.${u[1]}`, module: entity === 'Operator' ? '01' : '02', src: '01', open: true,
      title: `${entity}.${u[1]} is unique — duplicate refused (docs do not state status code/body)`,
      match: (t) => (has(t, u[1]) || has(t, u[1].replace(/_/g, ' '))) && /duplicate|already (exists|registered|in use|taken)/i.test(t) });
  }
}

// I. 01 — derived values, never stored
{
  const t = tableWithHead(D.data, 'Value');
  if (t) for (const r of t.rows) {
    const v = strip(r[0]), isBand = /band/i.test(v);
    add({ id: `DV-${v.replace(/\s+/g, '-')}`, module: '02', src: '01', title: `${v} is derived on read, never stored`,
      match: (t) => isBand ? /weight band|\bC[0-3]\b/i.test(t) : has(t, 'currency') });
  }
}

// J. 05 — open questions: expected result undefined
{
  const t = tableWithHead(D.open, '#');
  if (t) for (const r of t.rows) {
    if (!/^\*\*Open/.test(r[2])) continue;
    const tok = (firstTick(r[1]) || '').split(/[.=\s]+/).pop();
    add({ id: `OQ-${r[0]}`, module: '01', src: '05', open: true, title: `Open: ${strip(r[1])}`,
      match: (t) => has(t, 'expected result undefined') && has(t, tok) });
  }
  if (present(D.open, /RETIRED/, 'RETIRED/INACTIVE')) {
    add({ id: 'OQ-2-RETIRED', module: '02', src: '05 #2', title: 'RETIRED aircraft is not rejected by any gate', match: (t) => word(t, 'RETIRED') });
    add({ id: 'OQ-2-INACTIVE', module: '02', src: '05 #2', title: 'INACTIVE pilot is not rejected by any gate', match: (t) => word(t, 'INACTIVE') });
  }
}

// K. Prose rules (each is only emitted if its sentence is still in the docs)
if (present(D.data, /max 2,000 characters/, 'flight_purpose cap')) {
  add({ id: 'PR-purpose', module: '05', src: '01', title: 'flight_purpose capped at 2,000 characters (at / inside / outside)', boundary: true, need: 3,
    match: (t) => (has(t, 'flight_purpose') || has(t, 'purpose')) && (num(t, 2000) || num(t, 2001) || num(t, 1999)) });
}
if (present(D.rules, /do not overlap/, 'overlap touching')) {
  add({ id: 'PR-overlap-touch', module: '04', src: '06 §1.4', title: 'Windows that only touch at a boundary do not overlap', boundary: true, need: 2,
    match: (t) => has(t, 'TSD-4 §5') && /touch|boundar|adjacent|back-to-back/i.test(t) });
  add({ id: 'PR-overlap-states', module: '04', src: '06 §1.4', title: 'Only APPROVED / UNDER_REVIEW block the aircraft; DRAFT, REJECTED, CANCELLED, COMPLETED do not',
    match: (t) => /\b(DRAFT|REJECTED|CANCELLED|COMPLETED)\b/.test(t) && /overlap|same aircraft|schedule/i.test(t) });
}
if (present(D.api, /never changes state/, 'validate never changes state')) {
  add({ id: 'PR-validate', module: '04', src: '03', title: 'validate returns the same result as submit and never changes state',
    match: (t) => has(t, 'validate') && /state (is )?(unchanged|stays|remains)|does not change|no state change|still DRAFT/i.test(t) });
}
if (present(D.api, /Return `400` if `X-Reviewer-Id` is missing/, 'reviewer header 400')) {
  add({ id: 'PR-reviewer-400', module: '06', src: '03', title: 'approve / reject without X-Reviewer-Id -> 400', match: (t) => has(t, 'X-Reviewer-Id') && /\b400\b/.test(t) });
}
if (present(D.data, /`note` \| required when `action` is `REJECT`/, 'reject note required')) {
  add({ id: 'PR-reject-note', module: '06', src: '01 / 02', title: 'reject requires a note', match: (t) => has(t, 'reject') && /\bnote\b/i.test(t) });
}
if (present(D.data, /AuditLog.*append-only|append-only/, 'AuditLog')) {
  add({ id: 'PR-auditlog', module: '06', src: '01', title: 'Every state change writes an AuditLog entry; ReviewAction written on approve/reject',
    match: (t) => has(t, 'AuditLog') || has(t, 'ReviewAction') });
}
if (present(D.api, /Registration always\s+creates an operator at `L1`/, 'registration L1')) {
  add({ id: 'PR-reg-L1', module: '01', src: '03', title: 'Registration always creates the operator at L1', match: (t) => has(t, 'authorisation_level') && word(t, 'L1') });
}
if (present(D.api, /\*\*Reviewer-or-owner reads\.\*\*/, 'operator scoping')) {
  add({ id: 'PR-scoping-403', module: '01', src: '03', title: "Operator reaching another operator's resource -> 403", match: (t) => /\b403\b/.test(t) });
  add({ id: 'PR-scoping-list', module: '01', src: '03', title: 'GET /flight-requests is scoped to the session operator; reviewer sees all', match: (t) => has(t, '/flight-requests') && /scope|only (their|own)|all operators/i.test(t) });
}

// ---------- evaluate ----------
const ids = new Set();
for (let i = rules.length - 1; i >= 0; i--) {            // the same endpoint can be listed twice in 03
  if (ids.has(rules[i].id)) rules.splice(i, 1); else ids.add(rules[i].id);
}
for (const r of rules) {
  const hit = cases.filter((c) => r.match(c.text));
  r.cases = hit.map((c) => c.id);
  const nb = hit.filter((c) => c.type === 'Boundary').length;
  if (r.boundary) r.status = nb >= r.need ? 'covered' : hit.length ? 'partial' : r.open ? 'open' : 'missing';
  else r.status = hit.length ? 'covered' : r.open ? 'open' : 'missing';
  if (r.boundary) r.detail = `${nb}/${r.need} boundary cases`;
}

// ---------- output ----------
const wanted = rules.filter((r) => (!opt('--module') || r.module === opt('--module')) && (!flag('--gaps') || r.status === 'missing' || r.status === 'partial'));
const count = (l, s) => l.filter((r) => r.status === s).length;
const summary = { rules: rules.length, covered: count(rules, 'covered'), partial: count(rules, 'partial'), missing: count(rules, 'missing'), open: count(rules, 'open'), cases: cases.length };

if (flag('--json')) {
  console.log(JSON.stringify({ summary, modules, rules: wanted.map(({ match, ...r }) => r), notes }, null, 2));
} else {
  const icon = { covered: 'OK     ', partial: 'PARTIAL', missing: 'MISSING', open: 'OPEN   ' };
  console.log(`SkyPermit rule coverage — ${cases.length} test case(s), ${rules.length} rules read from docs\n`);
  for (const m of [...new Set(wanted.map((r) => r.module))].sort()) {
    const list = wanted.filter((r) => r.module === m);
    console.log(`Module ${m} ${modules[m] || ''}  (${count(list, 'covered')}/${list.length} covered)`);
    for (const r of list) console.log(`  ${icon[r.status]} ${r.id.padEnd(22)} ${r.title}${r.cases.length ? '  [' + r.cases.join(', ') + ']' : ''}${r.detail && r.status !== 'missing' ? '  (' + r.detail + ')' : ''}`);
    console.log();
  }
  console.log(`Total: ${summary.covered} covered, ${summary.partial} partial, ${summary.missing} missing, ${summary.open} open (expected result undefined in docs)`);
  if (notes.length) console.log('\nNotes:\n' + [...new Set(notes)].map((n) => '  - ' + n).join('\n'));
}
process.exit(summary.missing + summary.partial > 0 ? 1 : 0);
