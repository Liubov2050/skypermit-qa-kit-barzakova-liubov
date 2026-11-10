#!/usr/bin/env node
// SessionEnd hook: summarise token usage / cost of a session into reports/ws2/<date>-<session_id>.md
//
// Transcript structure (verified on real transcripts in ~/.claude/projects/<project>/):
//  - <session_id>.jsonl, one JSON object per line.
//  - type "assistant": message.id, message.model, message.usage
//      { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, ... }
//    The same message.id is written once per content block (thinking / text / tool_use) with
//    identical usage -> count each message.id once.
//    message.model "<synthetic>" has all-zero usage -> skipped.
//  - Subagents: <session_id>/subagents/agent-<id>.jsonl (lines have isSidechain:true, agentId)
//    plus agent-<id>.meta.json { agentType, description, ... }.
//  - Compaction: NO real example exists in local transcripts. Detection below uses the markers
//    system.subtype === "compact_boundary" and isCompactSummary === true; it is unverified.
import fs from 'node:fs';
import path from 'node:path';

// USD per 1M tokens
// in = fresh input and cache writes, cached = cache reads. Haiku `long` applies to calls whose
// prompt (input + cache write + cache read) exceeds `over` tokens.
const PRICES = {
  'haiku-5-5': { in: 0.1, cached: 0.01, out: 0.5, long: { over: 100_000, in: 0.5, out: 2.5 } },
  'sonnet-5-5': { in: 2, cached: 0.1, out: 10 },
  'opus-5-5': { in: 4, cached: 0.2, out: 20 },
};
const priceFor = (model) => Object.entries(PRICES).find(([k]) => model.includes(k))?.[1];

const readJsonl = (file) =>
  fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  });

// Returns { byModel: Map<model, totals>, compacts }
function analyse(file) {
  const msgs = new Map(); // message.id -> {model, usage}
  let compacts = 0;
  for (const e of readJsonl(file)) {
    if ((e.type === 'system' && e.subtype === 'compact_boundary') || e.isCompactSummary === true) compacts++;
    if (e.type !== 'assistant' || !e.message?.usage || !e.message.model || e.message.model === '<synthetic>') continue;
    msgs.set(e.message.id ?? e.uuid, { model: e.message.model, usage: e.message.usage });
  }
  const byModel = new Map();
  for (const { model, usage: u } of msgs.values()) {
    const t = byModel.get(model) ?? { calls: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, cost: 0, priced: true, longCalls: 0 };
    t.calls++;
    const c = callCost(model, u);
    if (c.cost == null) t.priced = false; else t.cost += c.cost;
    if (c.long) t.longCalls++;
    t.input += u.input_tokens ?? 0;
    t.cacheWrite += u.cache_creation_input_tokens ?? 0;
    t.cacheRead += u.cache_read_input_tokens ?? 0;
    t.output += u.output_tokens ?? 0;
    byModel.set(model, t);
  }
  return { byModel, compacts };
}

// Cost of ONE call. Cache writes have no separate price in the price list -> billed at the input price.
function callCost(model, u) {
  const p = priceFor(model);
  if (!p) return { cost: null };
  const fresh = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  const cached = u.cache_read_input_tokens ?? 0;
  const long = p.long && fresh + cached > p.long.over;
  const rin = long ? p.long.in : p.in, rout = long ? p.long.out : p.out;
  return { long, cost: (fresh * rin + cached * p.cached + (u.output_tokens ?? 0) * rout) / 1e6 };
}
const cost = (model, t) => (t.priced ? t.cost : null);

const n = (x) => x.toLocaleString('en-US');
const usd = (x) => (x == null ? 'n/a (no price)' : `$${x.toFixed(4)}`);

function table(byModel) {
  const rows = [
    '| Model | Calls | Input | Cache write | Cache read | Output | Cost |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  let total = 0, unpriced = false;
  for (const [model, t] of [...byModel].sort()) {
    const c = cost(model, t);
    if (c == null) unpriced = true; else total += c;
    rows.push(`| ${model} | ${n(t.calls)} | ${n(t.input)} | ${n(t.cacheWrite)} | ${n(t.cacheRead)} | ${n(t.output)} | ${usd(c)} |`);
  }
  return { md: rows.join('\n'), total, unpriced };
}

function merge(into, from) {
  for (const [m, t] of from) {
    const a = into.get(m) ?? { calls: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, cost: 0, priced: true, longCalls: 0 };
    for (const k of ['calls', 'input', 'cacheWrite', 'cacheRead', 'output', 'cost', 'longCalls']) a[k] += t[k];
    a.priced = a.priced && t.priced;
    into.set(m, a);
  }
}

function main(input) {
  const { transcript_path, session_id } = input;
  if (!transcript_path || !session_id) throw new Error('transcript_path / session_id missing in stdin');

  const main = analyse(transcript_path);
  const subDir = path.join(path.dirname(transcript_path), session_id, 'subagents');
  const subagents = [];
  if (fs.existsSync(subDir)) {
    for (const f of fs.readdirSync(subDir).filter((f) => f.endsWith('.jsonl')).sort()) {
      const id = f.replace(/\.jsonl$/, '');
      let meta = {};
      try { meta = JSON.parse(fs.readFileSync(path.join(subDir, `${id}.meta.json`), 'utf8')); } catch {}
      subagents.push({ id, meta, ...analyse(path.join(subDir, f)) });
    }
  }

  const all = new Map();
  merge(all, main.byModel);
  subagents.forEach((s) => merge(all, s.byModel));
  const compactsTotal = main.compacts + subagents.reduce((a, s) => a + s.compacts, 0);

  const mainT = table(main.byModel), allT = table(all);
  const lines = [
    `# Usage report: ${session_id}`,
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Transcript: \`${transcript_path}\``,
    `- Reason: ${input.reason ?? 'n/a'}`,
    `- Subagents: ${subagents.length}`,
    `- Compactions: ${compactsTotal}${compactsTotal === 0 ? ' (none detected; marker format unverified, see hook header)' : ''}`,
    `- **Total cost: ${usd(allT.total)}**${allT.unpriced ? ' (+ models without a price, see table)' : ''}`,
    '',
    '## Total by model (main + subagents)',
    '',
    allT.md,
    '',
    '## Main session',
    '',
    mainT.md,
    '',
    `## Subagents (${subagents.length})`,
    '',
  ];
  if (!subagents.length) lines.push('None.');
  for (const s of subagents) {
    const t = table(s.byModel);
    lines.push(`### ${s.meta.agentType ?? 'unknown'}: ${s.meta.description ?? s.id}`, '', `- id: \`${s.id}\``, `- cost: ${usd(t.total)}`, '', t.md, '');
  }
  lines.push(
    '',
    '## Notes',
    '',
    '- Prices per 1M tokens (input / cached input / output): Haiku 5.5 $0.1 / $0.01 / $0.5; Sonnet 5.5 $2 / $0.1 / $10; Opus 5.5 $4 / $0.2 / $20.',
    '- Haiku calls with a prompt over 100k tokens (input + cache write + cache read) are billed at $0.5 input / $2.5 output. Cached input in that tier is still $0.01 (the price list gives no figure).',
    '- Cache reads use the cached-input price. Cache writes have no price in the list and are billed at the input price.',
    '- Each assistant message.id is counted once (transcripts repeat it per content block).',
  );

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const dir = path.join(root, 'reports', 'ws2');
  fs.mkdirSync(dir, { recursive: true });
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const out = path.join(dir, `${date}-${session_id}.md`);
  fs.writeFileSync(out, lines.join('\n') + '\n');
  return out;
}

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  try {
    main(JSON.parse(raw));
  } catch (err) {
    console.error(`usage-report: ${err.message}`); // never block session end
  }
  process.exit(0);
});
