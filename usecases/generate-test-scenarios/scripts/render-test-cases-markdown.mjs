// Renders a test cases document as Markdown. The document itself is embedded at the end, in an HTML comment that
// Markdown viewers do not show, so the cases can be read back and changed later (see extractDocument).

import { CATEGORIES, PRIORITIES, hasResults, notesCell } from './test-case-fields.mjs';

const DATA_OPEN = '<!-- levi-test-cases ';
const DATA_CLOSE = ' -->';
const DATA = /<!-- levi-test-cases (\{[\s\S]*\}) -->/;

// Angle brackets are escaped so they are not read as HTML, a line break becomes <br>, and a table cell also
// escapes its pipes.
const inline = (text) =>
  String(text).trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>');
const cell = (text) => inline(text).replace(/\|/g, '\\|');

function coverage(doc, labels) {
  const count = (category, priority) =>
    doc.cases.filter((tc) => (!category || tc.category === category) && (!priority || tc.priority === priority)).length;
  return [
    `| ${labels.category} | ${PRIORITIES.join(' | ')} | ${labels.total} |`,
    `|---|${PRIORITIES.map(() => '---:').join('|')}|---:|`,
    ...CATEGORIES.map((c) => `| ${c} | ${PRIORITIES.map((p) => count(c, p)).join(' | ')} | ${count(c)} |`),
    `| **${labels.total}** | ${PRIORITIES.map((p) => `**${count(null, p)}**`).join(' | ')} | **${doc.cases.length}** |`,
  ];
}

function testCase(tc, labels, withResults) {
  const lines = [
    `### ${tc.id}: ${inline(tc.title)}`,
    '',
    `- **${labels.category}:** ${tc.category}`,
    `- **${labels.priority}:** ${tc.priority}`,
    `- **${labels.preconditions}:** ${inline(tc.preconditions)}`,
    `- **${labels.steps}:**`,
    ...tc.steps.map((step, i) => `  ${i + 1}. ${inline(step)}`),
    `- **${labels.expected}:** ${inline(tc.expected)}`,
    `- **${labels.notes}:** ${inline(notesCell(tc, labels))}`,
  ];
  if (withResults) lines.push(`- **${labels.status}:** ${tc.status ?? '-'}`, `- **${labels.evidence}:** ${inline(tc.evidence ?? '-')}`);
  return lines;
}

export function renderMarkdown(doc, labels) {
  const withResults = hasResults(doc);
  const passed = doc.cases.filter((tc) => tc.status === 'PASS').length;
  const out = [
    `# ${doc.featureId}: ${inline(doc.featureName)} - ${labels.title}`,
    '',
    `- **${labels.source}:** ${doc.spec.map((p) => `\`${p}\``).join(', ')}`,
    `- **${labels.total}:** ${doc.cases.length}`,
    ...(withResults ? [`- **${labels.result}:** ${passed}/${doc.cases.length} PASS`] : []),
    '',
    `## ${labels.coverage}`,
    '',
    ...coverage(doc, labels),
    '',
    `## ${labels.cases}`,
  ];
  for (const tc of doc.cases) out.push('', ...testCase(tc, labels, withResults));
  out.push('', `## ${labels.ambiguities}`, '');
  const ambiguities = doc.ambiguities ?? [];
  if (!ambiguities.length) out.push(labels.none);
  else {
    out.push(`| # | ${labels.item} | ${labels.issue} | ${labels.affected} |`, '|---|---|---|---|');
    ambiguities.forEach((a, i) => out.push(`| ${i + 1} | ${cell(a.ref)} | ${cell(a.issue)} | ${(a.cases ?? []).join(', ') || '-'} |`));
  }
  // "--" cannot appear inside an HTML comment; inside JSON strings it is written as "--", which parses back the same.
  out.push('', DATA_OPEN + JSON.stringify(doc).replace(/--/g, '-\\u002d') + DATA_CLOSE);
  return out.join('\n') + '\n';
}

export function extractDocument(markdown) {
  const match = DATA.exec(markdown);
  if (!match) throw new Error('no embedded test cases found; the file was not written by render-test-cases.mjs');
  return JSON.parse(match[1]);
}
