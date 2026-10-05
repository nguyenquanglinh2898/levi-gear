// Checks a test cases document (the JSON format in ../references/test-case-guide.md) before it is rendered.

import { CATEGORIES, PRIORITIES, RESULTS, DEFAULT_LABELS, rowCells } from './test-case-fields.mjs';

const XLSX_CELL_LIMIT = 32767;
const isText = (value) => typeof value === 'string' && value.trim() !== '';

function checkCase(tc, i, doc, errors) {
  const expectedId = `TC-${doc.featureId}-${String(i + 1).padStart(3, '0')}`;
  const at = `case ${i + 1} (${tc.id ?? 'no id'})`;
  if (tc.id !== expectedId) errors.push(`${at}: id must be ${expectedId} (numbered from 001, in order, no gaps)`);
  for (const field of ['title', 'preconditions', 'expected']) if (!isText(tc[field])) errors.push(`${at}: ${field} is missing`);
  if (!CATEGORIES.includes(tc.category)) errors.push(`${at}: category must be one of ${CATEGORIES.join(', ')}`);
  if (!PRIORITIES.includes(tc.priority)) errors.push(`${at}: priority must be one of ${PRIORITIES.join(', ')}`);
  if (typeof tc.positive !== 'boolean') errors.push(`${at}: positive must be true or false`);
  if (!Array.isArray(tc.refs) || !tc.refs.length || !tc.refs.every(isText)) errors.push(`${at}: refs must name the spec items it traces to`);
  if (tc.notes !== undefined && typeof tc.notes !== 'string') errors.push(`${at}: notes must be text`);
  if (!Array.isArray(tc.steps) || !tc.steps.length) errors.push(`${at}: steps is empty`);
  else
    tc.steps.forEach((step, s) => {
      if (!isText(step)) errors.push(`${at}: step ${s + 1} is empty`);
      else if (/[\r\n]/.test(step)) errors.push(`${at}: step ${s + 1} spans several lines; split it, one action per step`);
      else if (/^\s*\d+[.)]\s/.test(step)) errors.push(`${at}: step ${s + 1} is numbered; leave numbering to the script`);
    });
  if (tc.status !== undefined && !RESULTS.includes(tc.status)) errors.push(`${at}: status must be PASS or FAIL (leave it out when not run)`);
  if (tc.status !== undefined && !isText(tc.evidence)) errors.push(`${at}: a run case needs evidence of what was observed`);
  if (tc.status === undefined && tc.evidence !== undefined) errors.push(`${at}: evidence without a status`);
  for (const cell of rowCells(tc, DEFAULT_LABELS, true))
    if (cell.length > XLSX_CELL_LIMIT) errors.push(`${at}: a field is longer than ${XLSX_CELL_LIMIT} characters`);
}

export function validate(doc) {
  const errors = [];
  const warnings = [];
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(doc.featureId ?? '')) errors.push('featureId must be uppercase letters, digits and hyphens');
  if (!isText(doc.featureName)) errors.push('featureName is missing');
  if (!Array.isArray(doc.spec) || !doc.spec.length || !doc.spec.every(isText)) errors.push('spec must list the source file paths');
  const cases = Array.isArray(doc.cases) ? doc.cases : [];
  if (!cases.length) errors.push('cases is empty');

  const titles = new Map();
  const bodies = new Map();
  cases.forEach((tc, i) => {
    checkCase(tc, i, doc, errors);
    const title = String(tc.title ?? '').trim().toLowerCase();
    const body = JSON.stringify([tc.preconditions, tc.steps, tc.expected]);
    if (title && titles.has(title)) errors.push(`case ${i + 1} (${tc.id}): same title as ${titles.get(title)}`);
    if (bodies.has(body)) errors.push(`case ${i + 1} (${tc.id}): same preconditions, steps and expected result as ${bodies.get(body)}`);
    titles.set(title, tc.id);
    bodies.set(body, tc.id);
  });

  const stories = Array.isArray(doc.stories) ? doc.stories : [];
  if (!stories.length) warnings.push('stories is empty: no user story coverage was checked');
  for (const story of stories) {
    if (!isText(story?.ref)) errors.push('every story needs a ref');
    else if (!cases.some((tc) => tc.positive === true && tc.refs?.includes(story.ref)))
      errors.push(`story ${story.ref} has no positive case (a case with positive: true whose refs include it)`);
  }

  const ids = new Set(cases.map((tc) => tc.id));
  (Array.isArray(doc.ambiguities) ? doc.ambiguities : []).forEach((a, i) => {
    if (!isText(a?.ref) || !isText(a?.issue)) errors.push(`ambiguity ${i + 1}: ref and issue are required`);
    for (const id of a?.cases ?? []) if (!ids.has(id)) errors.push(`ambiguity ${i + 1}: unknown case ${id}`);
  });
  if (doc.labels !== undefined && (typeof doc.labels !== 'object' || Object.values(doc.labels).some((v) => !isText(v))))
    errors.push('labels must map label names to text');
  return { errors, warnings };
}
