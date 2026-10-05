// The fields of a test case and how they become the cells of a row. Shared by the validator and both renderers.

export const CATEGORIES = ['Functional', 'UX', 'Security', 'Performance', 'Accessibility'];
export const PRIORITIES = ['P0', 'P1', 'P2'];
export const RESULTS = ['PASS', 'FAIL'];

export const DEFAULT_LABELS = {
  title: 'Test cases',
  source: 'Spec',
  total: 'Total',
  result: 'Result',
  coverage: 'Coverage',
  category: 'Category',
  priority: 'Priority',
  preconditions: 'Preconditions',
  steps: 'Steps',
  expected: 'Expected Result',
  notes: 'Notes',
  status: 'Status',
  evidence: 'Evidence',
  cases: 'Test cases',
  ambiguities: 'Spec ambiguities',
  item: 'Spec item',
  issue: 'Issue',
  affected: 'Affected cases',
  none: 'None.',
  specRef: 'Spec',
};

const COLUMNS = [
  { header: 'ID', width: 16 },
  { header: 'Title', width: 40 },
  { header: 'Category', width: 14 },
  { header: 'Priority', width: 10 },
  { header: 'Preconditions', width: 40 },
  { header: 'Steps', width: 60 },
  { header: 'Expected Result', width: 50 },
  { header: 'Notes', width: 40 },
];
const RESULT_COLUMNS = [
  { header: 'Status', width: 10 },
  { header: 'Evidence', width: 50 },
];

// Results appear (Status and Evidence) once at least one case has been run.
export const hasResults = (doc) => (doc.cases || []).some((tc) => tc.status !== undefined);

export const columns = (doc) => (hasResults(doc) ? [...COLUMNS, ...RESULT_COLUMNS] : COLUMNS);

export function notesCell(tc, labels) {
  const refs = Array.isArray(tc.refs) ? tc.refs : [];
  const ref = `${labels.specRef}: ${refs.join(', ')}`;
  return typeof tc.notes === 'string' && tc.notes.trim() ? `${ref}\n${tc.notes.trim()}` : ref;
}

export const numberedSteps = (tc) =>
  (Array.isArray(tc.steps) ? tc.steps : []).map((step, i) => `${i + 1}. ${String(step).trim()}`).join('\n');

export function rowCells(tc, labels, withResults) {
  const cells = [tc.id, tc.title, tc.category, tc.priority, tc.preconditions, numberedSteps(tc), tc.expected, notesCell(tc, labels)];
  if (withResults) cells.push(tc.status ?? '-', tc.evidence ?? '-');
  return cells.map((cell) => String(cell ?? '').trim());
}
