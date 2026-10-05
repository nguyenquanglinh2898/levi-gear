// Writes a single-sheet .xlsx workbook with Node's standard library only (no dependencies).
//
//   writeXlsx(file, { sheet, columns: [{ header, width }], rows: [[cell, ...], ...] })
//
// Every cell is written as text, so nothing is ever read as a number, a date or a formula. The header row is bold,
// frozen and filterable; cells wrap and align to the top, and line breaks inside a cell are kept.

import fs from 'node:fs';
import zlib from 'node:zlib';

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const INVALID_XML = /[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function escapeXml(text) {
  return String(text)
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function columnName(index) {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

// A ZIP archive of deflated entries, as an .xlsx package expects.
function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.from(text, 'utf8');
    const packed = zlib.deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(33, 12); // DOS date 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, packed);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + packed.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

function sheetXml(columns, rows) {
  const lastCell = `${columnName(columns.length - 1)}${rows.length + 1}`;
  const row = (cells, r, style) =>
    `<row r="${r}">` +
    cells
      .map((cell, c) => `<c r="${columnName(c)}${r}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${escapeXml(cell ?? '')}</t></is></c>`)
      .join('') +
    '</row>';
  return (
    XML_HEAD +
    `<worksheet xmlns="${MAIN}"><dimension ref="A1:${lastCell}"/>` +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/><cols>' +
    columns.map((col, i) => `<col min="${i + 1}" max="${i + 1}" width="${col.width}" customWidth="1"/>`).join('') +
    '</cols><sheetData>' +
    row(columns.map((col) => col.header), 1, 2) +
    rows.map((cells, i) => row(cells, i + 2, 1)).join('') +
    `</sheetData><autoFilter ref="A1:${lastCell}"/></worksheet>`
  );
}

const STYLES =
  XML_HEAD +
  `<styleSheet xmlns="${MAIN}">` +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

export function writeXlsx(file, { sheet, columns, rows }) {
  const lastCell = `${columnName(columns.length - 1)}${rows.length + 1}`;
  const quotedSheet = `'${sheet.replace(/'/g, "''")}'`;
  const filterRange = `${quotedSheet}!$A$1:$${lastCell.replace(/(\d+)$/, '$$$1')}`;
  const entries = [
    [
      '[Content_Types].xml',
      XML_HEAD +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    ],
    [
      '_rels/.rels',
      XML_HEAD +
        `<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      'xl/workbook.xml',
      XML_HEAD +
        `<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets><sheet name="${escapeXml(sheet)}" sheetId="1" r:id="rId1"/></sheets>` +
        `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${escapeXml(filterRange)}</definedName></definedNames></workbook>`,
    ],
    [
      'xl/_rels/workbook.xml.rels',
      XML_HEAD +
        `<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    ],
    ['xl/worksheets/sheet1.xml', sheetXml(columns, rows)],
    ['xl/styles.xml', STYLES],
  ];
  fs.writeFileSync(file, zip(entries));
}
