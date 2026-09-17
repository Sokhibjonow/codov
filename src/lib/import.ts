import ExcelJS from "exceljs";

// Parsing of the student import table (.xlsx from the template, or .csv).

export const TEMPLATE_COLUMNS = ["lastName", "firstName", "phone", "group", "parentName", "parentPhone"] as const;
type Column = (typeof TEMPLATE_COLUMNS)[number];

export type ImportRow = {
  line: number;
  firstName: string;
  lastName: string;
  phone: string;
  group: string;
  parentFirstName: string;
  parentLastName: string;
  parentPhone: string;
};

export type PreviewRow = ImportRow & {
  error?: string;
  groupIsNew: boolean;
  parentExists: boolean;
};

export type ImportState =
  | {
      ok: boolean;
      message?: string;
      rows?: PreviewRow[];
      credentials?: import("./action-state").Credential[];
    }
  | undefined;

type TableRow = { line: number; cells: string[] };

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return value.result === undefined || value.result === null ? "" : String(value.result).trim();
    return "";
  }
  return String(value).trim();
}

function decode(buffer: Buffer) {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  // Excel on Russian Windows saves CSV as cp1251
  return utf8.includes("�") ? new TextDecoder("windows-1251").decode(buffer) : utf8.replace(/^﻿/, "");
}

function parseCsv(text: string): TableRow[] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", ",", "\t"].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best,
  );

  const rows: TableRow[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;

  const endRow = () => {
    cells.push(cell.trim());
    if (cells.some(Boolean)) rows.push({ line, cells });
    cells = [];
    cell = "";
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      cells.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      endRow();
      line++;
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  endRow();
  return rows;
}

export async function readTable(file: File): Promise<TableRow[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".csv")) return parseCsv(decode(buffer));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: TableRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= Math.max(row.cellCount, TEMPLATE_COLUMNS.length); c++) cells.push(cellText(row.getCell(c).value));
    if (cells.some(Boolean)) rows.push({ line: row.number, cells });
  });
  return rows;
}

function detectColumn(header: string): Column | null {
  const h = header.toLowerCase().replace(/[‘’'ʻ`]/g, "");
  const isParent = /родител|ota-ona|ota ona|otaona|parent/.test(h);
  const isPhone = /телефон|telefon|phone/.test(h);

  if (isParent && isPhone) return "parentPhone";
  if (isParent) return "parentName";
  if (/фамил|familiya|surname/.test(h)) return "lastName";
  if (/имя|ism|name/.test(h)) return "firstName";
  if (isPhone) return "phone";
  if (/групп|guruh|group/.test(h)) return "group";
  return null;
}

/** Maps raw table rows to import rows. A header row is detected by its titles; otherwise the template order is assumed. */
export function toImportRows(table: TableRow[]): ImportRow[] {
  if (table.length === 0) return [];

  const detected = table[0].cells.map(detectColumn);
  const hasHeader = detected.some(Boolean);
  const columns: (Column | null)[] = hasHeader ? detected : [...TEMPLATE_COLUMNS];
  const data = hasHeader ? table.slice(1) : table;

  return data.map(({ line, cells }) => {
    const get = (column: Column) => cells[columns.indexOf(column)]?.trim() ?? "";
    const parentWords = get("parentName").split(/\s+/).filter(Boolean);

    return {
      line,
      firstName: get("firstName").slice(0, 60),
      lastName: get("lastName").slice(0, 60),
      phone: get("phone").slice(0, 30),
      group: get("group").slice(0, 80),
      // "Familiya Ism" – surname comes first
      parentLastName: (parentWords.length > 1 ? parentWords[0] : "").slice(0, 60),
      parentFirstName: (parentWords.length > 1 ? parentWords.slice(1).join(" ") : (parentWords[0] ?? "")).slice(0, 60),
      parentPhone: get("parentPhone").slice(0, 30),
    };
  });
}
