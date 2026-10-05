#!/usr/bin/env node
// Checks test cases and renders them as Markdown and Excel, so that both files always agree.
//
//   node render-test-cases.mjs check <cases.json>                        validate only
//   node render-test-cases.mjs render <cases.json> <out-base> [--force]  validate, then write <out-base>.md and .xlsx
//   node render-test-cases.mjs extract <out-base>.md <cases.json>        read the cases back from a rendered file
//
// The JSON format is described in ../references/test-case-guide.md. Every command prints JSON and exits 1 on an
// error. `render` refuses to replace an existing file unless --force is given; `extract` never overwrites the JSON.

import fs from 'node:fs';
import path from 'node:path';
import { validate } from './validate-test-cases.mjs';
import { CATEGORIES, PRIORITIES, DEFAULT_LABELS, columns, hasResults, rowCells } from './test-case-fields.mjs';
import { renderMarkdown, extractDocument } from './render-test-cases-markdown.mjs';
import { writeXlsx } from './write-xlsx.mjs';

function render(doc, base, force) {
  const files = [`${base}.md`, `${base}.xlsx`];
  const existing = files.filter((f) => fs.existsSync(f));
  if (existing.length && !force) return { ok: false, errors: existing.map((f) => `already exists: ${f} (pass --force to replace it)`) };
  const labels = { ...DEFAULT_LABELS, ...doc.labels };
  const withResults = hasResults(doc);
  fs.mkdirSync(path.dirname(base), { recursive: true });
  fs.writeFileSync(files[0], renderMarkdown(doc, labels));
  writeXlsx(files[1], { sheet: 'Test cases', columns: columns(doc), rows: doc.cases.map((tc) => rowCells(tc, labels, withResults)) });
  const tally = (key, values) => Object.fromEntries(values.map((v) => [v, doc.cases.filter((tc) => tc[key] === v).length]));
  return {
    ok: true,
    written: files,
    cases: doc.cases.length,
    byCategory: tally('category', CATEGORIES),
    byPriority: tally('priority', PRIORITIES),
    ...(withResults ? { results: tally('status', ['PASS', 'FAIL']) } : {}),
    ambiguities: (doc.ambiguities ?? []).length,
  };
}

function extract(markdownFile, output) {
  if (fs.existsSync(output)) return { ok: false, errors: [`already exists: ${output}`] };
  const doc = extractDocument(fs.readFileSync(markdownFile, 'utf8'));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(doc, null, 2) + '\n');
  return { ok: true, written: [output], cases: doc.cases.length };
}

const [cmd, input, target, flag] = process.argv.slice(2);
try {
  let result;
  if (cmd === 'check' && input) result = { ok: true, ...validate(JSON.parse(fs.readFileSync(input, 'utf8'))) };
  else if (cmd === 'render' && input && target) {
    const doc = JSON.parse(fs.readFileSync(input, 'utf8'));
    const { errors, warnings } = validate(doc);
    result = errors.length ? { ok: false, errors, warnings } : { ...render(doc, target, flag === '--force'), warnings };
  } else if (cmd === 'extract' && input && target) result = extract(input, target);
  else {
    console.error('usage: render-test-cases.mjs check <cases.json> | render <cases.json> <out-base> [--force] | extract <file.md> <cases.json>');
    process.exitCode = 2;
  }
  if (result) {
    if (result.errors?.length) result.ok = false;
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  }
} catch (err) {
  console.log(JSON.stringify({ ok: false, errors: [err.message] }, null, 2));
  process.exitCode = 1;
}
