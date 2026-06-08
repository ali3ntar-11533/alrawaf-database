import { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { X, Cloud, Download, Upload, Save, AlertCircle, CheckCircle, Loader, Plus, Trash2, FileSpreadsheet } from "lucide-react";
import { bulkCreateContractors, updateContractor } from "../contractors/api";
import type { Contractor } from "../contractors/types";

/* ─── Types ─────────────────────────────────────────────── */
interface RowData {
  contractNo:      string;
  contractYear:    string;
  contractor:      string;
  project:         string;
  portfolio:       string;
  mainActivity:    string;
  businessProgram: string;
  workFamily:      string;
  workType:        string;
  itemScope:       string;
  techSpecs:       string;
  measurements:    string;
  itemCode:        string;
  technicalScope:  string;
  workCategory:    string;
  unit:            string;
  price:           string;
  localContent:    string;
  phone:           string;
  email:           string;
  rating:          string;
}

type RowStatus = "idle" | "saving" | "saved" | "duplicate" | "updated" | "error";

interface Row {
  id:     string;
  data:   RowData;
  status: RowStatus;
  error?: string;
}

interface Props {
  existingContractors: Contractor[];
  onClose:             () => void;
  onSaved:             () => void;
}

/* ─── Columns definition — order matches the main table ─── */
const COLUMNS: { key: keyof RowData; label: string; width: number; type?: "number" | "dropdown"; options?: string[] }[] = [
  { key: "contractNo",      label: "رقم العقد",        width: 55  },
  { key: "contractYear",    label: "سنة",              width: 34  },
  { key: "contractor",      label: "المقاول / المورد", width: 100 },
  { key: "project",         label: "المشروع",          width: 85  },
  { key: "portfolio",       label: "المحفظة",          width: 40  },
  { key: "mainActivity",    label: "النشاط",           width: 70  },
  { key: "businessProgram", label: "برنامج",           width: 65  },
  { key: "workFamily",      label: "عائلة",            width: 65  },
  { key: "workType",        label: "نوع الأعمال",      width: 60  },
  { key: "itemScope",       label: "شمولية",           width: 60  },
  { key: "techSpecs",       label: "مواصفات",          width: 60  },
  { key: "measurements",    label: "قياسات",           width: 35  },
  /* itemCode column intentionally NOT editable — server generates it. */
  { key: "technicalScope",  label: "الوصف الفني",      width: 110 },
  { key: "workCategory",    label: "تعاقد",            width: 42  },
  { key: "unit",            label: "وحدة",             width: 30  },
  { key: "price",           label: "السعر",            width: 52, type: "number" },
  { key: "localContent",    label: "محتوى محلي",       width: 50, type: "dropdown", options: ["", "مسجل", "غير مسجل"] },
  { key: "phone",           label: "التواصل",          width: 65  },
  { key: "email",           label: "البريد",           width: 88  },
  { key: "rating",          label: "تقييم",            width: 34, type: "number" },
];

/* ─── Proper TSV parser ───────────────────────────────────
   Excel wraps cells that contain embedded newlines (ALT+ENTER)
   in double-quotes.  A naïve split(/\r?\n/) breaks those into
   ghost rows with shifted columns.  This parser handles:
     • quoted fields  → "value"
     • embedded newlines inside quotes → "line1\nline2"
     • escaped quotes → "" inside a quoted field = one "
   Returns an array-of-rows, each row is an array-of-cell-strings.
   ─────────────────────────────────────────────────────────── */
function parseTsvRaw(tsv: string): string[][] {
  const rows: string[][] = [];
  let row:  string[] = [];
  let i = 0;
  const n = tsv.length;

  while (i < n) {
    if (tsv[i] === '"') {
      /* ── quoted field ── */
      i++;
      let field = "";
      while (i < n) {
        if (tsv[i] === '"') {
          if (i + 1 < n && tsv[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; }
        } else {
          field += tsv[i++];
        }
      }
      /* ALT+ENTER inside a cell → single space, then trim edges */
      row.push(field.replace(/[\r\n]+/g, " ").trim());
      /* consume delimiter after closing quote */
      if (i < n && tsv[i] === '\t') { i++; }
      else if (i < n && (tsv[i] === '\r' || tsv[i] === '\n')) {
        if (tsv[i] === '\r' && tsv[i + 1] === '\n') i++;
        i++;
        rows.push(row); row = [];
      }
    } else {
      /* ── unquoted field ── */
      let field = "";
      while (i < n && tsv[i] !== '\t' && tsv[i] !== '\r' && tsv[i] !== '\n') {
        field += tsv[i++];
      }
      row.push(field.trim());
      if (i < n && tsv[i] === '\t') { i++; }
      else if (i < n && (tsv[i] === '\r' || tsv[i] === '\n')) {
        if (tsv[i] === '\r' && tsv[i + 1] === '\n') i++;
        i++;
        rows.push(row); row = [];
      }
    }
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

/* ─── Positional column order for TSV paste (no itemCode) ─ */
const PASTE_COLUMNS: (keyof RowData)[] = [
  "contractNo", "contractYear", "contractor", "project", "portfolio",
  "mainActivity", "businessProgram", "workFamily", "workType",
  "itemScope", "techSpecs", "measurements",
  "technicalScope", "workCategory", "unit", "price",
  "localContent", "phone", "email", "rating",
];

/* ─── Parse clipboard TSV into RowData array ─────────────────
   Strategy:
   1. If the first row looks like a header (≥3 cells match known
      column names) → use buildRowExtractor for name-based mapping,
      same as the Excel-file upload path.  Column order in the source
      sheet does NOT matter in this case.
   2. Otherwise fall back to the fixed positional PASTE_COLUMNS order.
   ────────────────────────────────────────────────────────────── */
function parseTsvToRows(tsv: string): RowData[] {
  const allRows = parseTsvRaw(tsv).filter((cells) => cells.some((c) => c));
  if (allRows.length === 0) return [];

  const firstCells = allRows[0];
  const headerHits = firstCells.filter(
    (c) => HEADER_TO_KEY[c.trim()] ?? HEADER_TO_KEY_NORM[normHeader(c)]
  ).length;

  const hasHeader = headerHits >= 3;
  const extractor  = hasHeader ? buildRowExtractor(firstCells) : null;
  const dataRows   = hasHeader ? allRows.slice(1) : allRows;

  return dataRows
    .map((cells) => {
      if (extractor) return extractor(cells);
      const data: RowData = {
        contractNo: "", contractYear: "", contractor: "", project: "", portfolio: "",
        mainActivity: "", businessProgram: "", workFamily: "",
        workType: "", itemScope: "", techSpecs: "", measurements: "", itemCode: "",
        technicalScope: "", workCategory: "", unit: "", price: "",
        localContent: "", phone: "", email: "", rating: "",
      };
      PASTE_COLUMNS.forEach((key, i) => {
        data[key] = cells[i] ?? "";
      });
      return data;
    })
    .filter((d) => Object.values(d).some((v) => v.trim()));
}

/* ─── Helpers ───────────────────────────────────────────── */
function emptyRow(): Row {
  return {
    id: Math.random().toString(36).slice(2),
    status: "idle",
    data: {
      contractNo: "", contractYear: "", contractor: "", project: "", portfolio: "",
      mainActivity: "", businessProgram: "", workFamily: "",
      workType: "", itemScope: "", techSpecs: "", measurements: "", itemCode: "",
      technicalScope: "", workCategory: "", unit: "", price: "",
      localContent: "", phone: "", email: "", rating: "",
    },
  };
}

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, emptyRow);
}

function isRowEmpty(r: RowData): boolean {
  return Object.values(r).every((v) => !v.trim());
}

/* ─── Column headers for the downloadable template ────────── */
const TEMPLATE_HEADERS = [
  "رقم العقد", "سنة العقد", "المقاول / المورد", "المشروع", "المحفظة",
  "النشاط الرئيسي", "برنامج الأعمال", "عائلة الأعمال", "نوع الأعمال",
  "شمولية البند", "مواصفات فنية", "قياسات",
  "الوصف الفني للبند", "نوع التعاقد", "الوحدة", "السعر",
  "المحتوى المحلي", "رقم التواصل", "البريد الإلكتروني", "التقييم (0-5)",
];

/* ─── Header → RowData key mapping (covers old templates that had
   "كود الفريد للبند" at position 12 and newer ones without it).
   Matching is done by NAME so column order no longer matters.    ── */
const HEADER_TO_KEY: Record<string, keyof RowData> = {
  /* ── contract / vendor ── */
  "رقم العقد":              "contractNo",
  "سنة العقد":              "contractYear",
  "المقاول / المورد":       "contractor",
  "المقاول":                "contractor",
  "المورد":                 "contractor",
  "المشروع":                "project",
  "المحفظة":                "portfolio",
  /* ── classification ── */
  "النشاط الرئيسي":        "mainActivity",
  "النشاط":                "mainActivity",
  "برنامج الأعمال":        "businessProgram",
  "عائلة الأعمال":         "workFamily",
  "نوع الأعمال":           "workType",
  "شمولية البند":          "itemScope",
  "مواصفات فنية":          "techSpecs",
  "قياسات":                "measurements",
  /* Old template had this column — accept it but the value is ignored
     (server always regenerates itemCode from the other 8 fields).   */
  "كود الفريد للبند":       "itemCode",
  "الوصف الفني للبند":     "technicalScope",
  "الوصف الفني":           "technicalScope",
  "نوع التعاقد":            "workCategory",
  /* ── price / unit ── */
  "الوحدة":                "unit",
  "السعر":                 "price",
  "سعر":                   "price",
  "Price":                 "price",
  /* ── contact / rating ── */
  "المحتوى المحلي":        "localContent",
  "رقم التواصل":           "phone",
  "التواصل":               "phone",
  "البريد الإلكتروني":      "email",
  "البريد":                "email",
  "التقييم (0-5)":         "rating",
  "التقييم":               "rating",
  "تقييم":                 "rating",
  "Rating":                "rating",
};

/* All known header strings (current + legacy) — used for header-row detection.
   We include both the original keys AND their normalised forms so that a sheet
   whose headers were saved with tashkeel still triggers header-mode detection. */
const ALL_KNOWN_HEADERS = new Set([
  ...Object.keys(HEADER_TO_KEY),
]);

/* Normalised lookup: strip diacritics, normalise alef variants, collapse
   whitespace — lets us match headers even when the Excel file was saved with
   tashkeel or non-breaking spaces.                                          */
function normHeader(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670]/g, "")  // strip all Arabic diacritics
    .replace(/[أإآٱ]/g, "ا")                // normalise alef variants
    .replace(/ة/g, "ه")                      // ta marbuta → ha
    .replace(/ى/g, "ي")                      // alef maqsura → ya
    .replace(/\s+/g, " ")                    // collapse whitespace
    .trim()
    .toLowerCase();
}
const HEADER_TO_KEY_NORM: Record<string, keyof RowData> = Object.fromEntries(
  Object.entries(HEADER_TO_KEY).map(([k, v]) => [normHeader(k), v])
);

/* Build a position map from a parsed header row, then produce a RowData
   extractor that looks up values by column name instead of fixed index.
   Falls back to "" for any field not found in the uploaded file.        */
function buildRowExtractor(headerCells: string[]): (cells: string[]) => RowData {
  const pos: Partial<Record<keyof RowData, number>> = {};
  headerCells.forEach((h, i) => {
    /* Try exact match first, then fall back to normalised match so that
       headers with diacritics, alef variants, or extra spaces still map
       correctly.  Also update ALL_KNOWN_HEADERS dynamically so header
       detection picks up any normalised match too.                      */
    const key = HEADER_TO_KEY[h.trim()] ?? HEADER_TO_KEY_NORM[normHeader(h)];
    if (key) pos[key] = i;
  });
  return (cells: string[]): RowData => {
    const g = (key: keyof RowData) => {
      const idx = pos[key];
      return idx !== undefined ? String(cells[idx] ?? "").trim() : "";
    };
    return {
      contractNo:      g("contractNo"),
      contractYear:    g("contractYear"),
      contractor:      g("contractor"),
      project:         g("project"),
      portfolio:       g("portfolio"),
      mainActivity:    g("mainActivity"),
      businessProgram: g("businessProgram"),
      workFamily:      g("workFamily"),
      workType:        g("workType"),
      itemScope:       g("itemScope"),
      techSpecs:       g("techSpecs"),
      measurements:    g("measurements"),
      itemCode:        "",      /* always server-generated */
      technicalScope:  g("technicalScope"),
      workCategory:    g("workCategory"),
      unit:            g("unit"),
      price:           g("price"),
      localContent:    g("localContent"),
      phone:           g("phone"),
      email:           g("email"),
      rating:          g("rating"),
    };
  };
}

/* Positional fallback used when no recognisable header row is present.
   Column order matches the current TEMPLATE_HEADERS (no itemCode).    */
function positionalRow(cells: string[]): RowData {
  const g = (i: number) => String(cells[i] ?? "").trim();
  return {
    contractNo:      g(0),  contractYear:    g(1),
    contractor:      g(2),  project:         g(3),
    portfolio:       g(4),  mainActivity:    g(5),
    businessProgram: g(6),  workFamily:      g(7),
    workType:        g(8),  itemScope:       g(9),
    techSpecs:       g(10), measurements:    g(11),
    itemCode:        "",
    technicalScope:  g(12), workCategory:    g(13),
    unit:            g(14), price:           g(15),
    localContent:    g(16), phone:           g(17),
    email:           g(18), rating:          g(19),
  };
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  /* Style: wide columns + RTL */
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
  (ws as any)["!dir"] = "rtl";
  XLSX.utils.book_append_sheet(wb, ws, "البيانات");
  XLSX.writeFile(wb, "قالب_إدخال_البيانات.xlsx");
}

function parseExcelFile(
  file: File,
  onProgress?: (percent: number, phase: "read" | "parse" | "done", rowCount?: number) => void,
): Promise<RowData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    /* Phase 1 (0-70%): browser reading bytes from disk to memory. */
    /* Kick off an immediate 5% so the UI doesn't stay frozen at 0%
       even for tiny files where onprogress never fires.             */
    onProgress?.(5, "read");

    reader.onprogress = (ev) => {
      if (onProgress && ev.lengthComputable && ev.total > 0) {
        const pct = Math.min(70, Math.round((ev.loaded / ev.total) * 70));
        onProgress(Math.max(pct, 5), "read");
      }
    };
    reader.onload = (e) => {
      try {
        onProgress?.(75, "parse");
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        onProgress?.(90, "parse");

        const toStr = (c: unknown) =>
          String(c ?? "").replace(/[\r\n]+/g, " ").trim();

        /* Strip thousands separators and currency symbols from numeric fields
           so "1,500" / "1.500" / "ر.س 1,500" all resolve to "1500".         */
        const cleanNumeric = (v: string): string => {
          const stripped = v
            .replace(/[ر.س$€£¥\u00A0\u202F]/g, "")  // currency symbols + nbsp
            .replace(/,/g, "")                         // thousands comma
            .trim();
          return /^-?\d+(\.\d+)?$/.test(stripped) ? stripped : v;
        };

        /* ── Try every sheet until we find one with usable data ──────── */
        let parsed: RowData[] = [];

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          if (!ws) continue;

          /* raw: true → numbers come back as JS numbers not formatted strings. */
          const rows: unknown[][] = XLSX.utils.sheet_to_json(
            ws, { header: 1, defval: "", raw: true }
          ) as unknown[][];

          /* Drop completely empty rows at the start (title rows, blank lines). */
          let startIdx = 0;
          while (startIdx < rows.length && !rows[startIdx].some((c) => toStr(c))) {
            startIdx++;
          }
          const trimmedRows = rows.slice(startIdx);
          if (trimmedRows.length === 0) continue;

          /* ── Detect header row: search first 5 non-empty rows ─────── */
          let headerRowIdx = -1;
          let headerCells: string[] = [];
          for (let i = 0; i < Math.min(5, trimmedRows.length); i++) {
            const cells = trimmedRows[i].map((c) => toStr(c));
            const matches = cells.filter(
              (c) => ALL_KNOWN_HEADERS.has(c) || HEADER_TO_KEY_NORM[normHeader(c)] !== undefined
            ).length;
            /* Consider it a header row if ≥3 columns are recognised */
            if (matches >= 3) {
              headerRowIdx = i;
              headerCells = cells;
              break;
            }
          }

          let dataRows: unknown[][];
          let extractRow: (cells: string[]) => RowData;

          if (headerRowIdx >= 0) {
            dataRows = trimmedRows.slice(headerRowIdx + 1);
            extractRow = buildRowExtractor(headerCells);
          } else {
            /* No header found — fall back to fixed positional mapping */
            dataRows = trimmedRows;
            extractRow = positionalRow;
          }

          const sheetParsed: RowData[] = dataRows
            .filter((row) => row.some((c) => toStr(c)))
            .map((cells) => {
              const row = extractRow(cells.map(toStr));
              /* Clean numeric fields so "1,500" / "ر.س 900" → "1500" / "900" */
              row.price  = cleanNumeric(row.price);
              row.rating = cleanNumeric(row.rating);
              return row;
            });

          if (sheetParsed.length > 0) {
            parsed = sheetParsed;
            break; /* Found data — stop trying other sheets */
          }
        }

        onProgress?.(100, "done", parsed.length);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}


/* ─── Normalizer ─────────────────────────────────────────── */
function norm(s: string): string {
  return (s ?? "").replace(/[\u064B-\u065F]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase().trim();
}

/* ─── Identity signature — 14 key fields ONLY (no price/unit/phone/email).
   Two records with matching identity but different price/unit are treated
   as "same item, update price/unit" rather than a new record or duplicate. */
function dbIdentity(c: Contractor): string {
  return [
    norm(c.contractNo),
    norm(c.contractYear     ?? ""),
    norm(c.contractor),
    norm(c.project),
    norm(c.portfolio),
    norm(c.mainActivity     ?? ""),
    norm(c.businessProgram  ?? ""),
    norm(c.workFamily       ?? ""),
    norm(c.workType),
    norm(c.itemScope        ?? ""),
    norm(c.techSpecs        ?? ""),
    norm(c.measurements     ?? ""),
    norm(c.technicalScope),
    norm(c.workCategory     ?? ""),
  ].join("\x00");
}

function rowIdentity(d: RowData): string {
  return [
    norm(d.contractNo),
    norm(d.contractYear),
    norm(d.contractor),
    norm(d.project),
    norm(d.portfolio),
    norm(d.mainActivity),
    norm(d.businessProgram),
    norm(d.workFamily),
    norm(d.workType),
    norm(d.itemScope),
    norm(d.techSpecs),
    norm(d.measurements),
    norm(d.technicalScope),
    norm(d.workCategory),
  ].join("\x00");
}

/* ─── Full-record duplicate — same identity AND same price/unit ──────────
   Only used to skip rows that are 100% identical (nothing to update).    */
function dbSignature(c: Contractor): string {
  return dbIdentity(c) + "\x00" + String(c.price) + "\x00" + norm(c.unit ?? "");
}

function rowSignature(d: RowData): string {
  return rowIdentity(d) + "\x00" + String(Math.round(parseFloat(d.price) || 0)) + "\x00" + norm(d.unit);
}

/* ─── Partial-match detection ────────────────────────────────────────────
   Returns an existing Contractor that is "incomplete" (has at least one
   empty identity field) AND whose every NON-EMPTY identity field matches
   the uploaded row exactly.  This lets a complete row from the Excel file
   fill in the gaps of a previously-entered incomplete DB record instead of
   creating a duplicate.

   Guard rails:
   • DB record must have at least one empty identity field (otherwise it
     would have been caught by the full identity map already).
   • At least 2 non-empty DB fields must match (avoids too-broad matching
     on nearly-empty records).
   • `contractor` must be non-empty in the DB record AND match the row —
     it is the primary anchor that prevents cross-vendor false positives.  */
const IDENTITY_KEYS: (keyof Contractor)[] = [
  "contractNo", "contractYear", "contractor", "project", "portfolio",
  "mainActivity", "businessProgram", "workFamily", "workType",
  "itemScope", "techSpecs", "measurements", "technicalScope", "workCategory",
];
const IDENTITY_ROW_KEYS: (keyof RowData)[] = [
  "contractNo", "contractYear", "contractor", "project", "portfolio",
  "mainActivity", "businessProgram", "workFamily", "workType",
  "itemScope", "techSpecs", "measurements", "technicalScope", "workCategory",
];

function findPartialMatch(row: RowData, contractors: Contractor[]): Contractor | null {
  const rowContractNo = norm(row.contractNo);
  /* contractNo must be non-empty and must match — without this anchor the
     search is too broad and can match thousands of unrelated records.     */
  if (!rowContractNo) return null;

  const rn = IDENTITY_ROW_KEYS.map((k) => norm(row[k]));
  for (const c of contractors) {
    /* Primary anchor: contractNo must be present AND match */
    if (!norm(c.contractNo) || norm(c.contractNo) !== rowContractNo) continue;
    const dn = IDENTITY_KEYS.map((k) => norm(String(c[k] ?? "")));
    const hasGap   = dn.some((v) => !v);          // at least one empty DB field
    if (!hasGap) continue;
    const nonEmpty = dn.map((v, i) => ({ db: v, row: rn[i] })).filter(({ db }) => db);
    if (nonEmpty.length < 3) continue;              // require 3+ matching anchors
    if (!nonEmpty.every(({ db, row: r }) => db === r)) continue;
    return c;
  }
  return null;
}

/* ─── Full row payload builder (used for partial-match completion) ─────── */
function buildFullPayload(d: RowData) {
  return {
    contractNo:      d.contractNo.trim(),
    contractYear:    d.contractYear.trim()    || null,
    contractor:      d.contractor.trim(),
    project:         d.project.trim(),
    portfolio:       d.portfolio.trim(),
    mainActivity:    d.mainActivity.trim()    || null,
    businessProgram: d.businessProgram.trim() || null,
    workFamily:      d.workFamily.trim()      || null,
    workType:        d.workType.trim(),
    itemScope:       d.itemScope.trim()       || null,
    techSpecs:       d.techSpecs.trim()       || null,
    measurements:    d.measurements.trim()    || null,
    itemCode:        null,
    technicalScope:  d.technicalScope.trim(),
    workCategory:    d.workCategory.trim()    || null,
    unit:            d.unit.trim()            || null,
    price:           Math.min(Math.round(parseFloat(d.price) || 0), 2_000_000_000),
    localContent:    d.localContent.trim()    || null,
    phone:           d.phone.trim(),
    email:           d.email.trim(),
    rating:          d.rating ? Math.min(5, Math.max(0, Math.round(parseFloat(d.rating)))) : null,
  };
}

/* ─── Status Badge ──────────────────────────────────────── */
function StatusBadge({ status, error }: { status: RowStatus; error?: string }) {
  if (status === "idle")      return null;
  if (status === "saving")    return <Loader size={14} style={{ color: "#3b8fcc", animation: "spin-loader 0.9s linear infinite" }} />;
  if (status === "saved")     return <CheckCircle size={14} style={{ color: "#2baa74" }} />;
  if (status === "updated")   return (
    <span title="تم تحديث السعر / الوحدة لهذا البند">
      <CheckCircle size={14} style={{ color: "#c5a059" }} />
    </span>
  );
  if (status === "duplicate") return (
    <span title="سجل مطابق تماماً موجود في القاعدة — تم التخطي">
      <AlertCircle size={14} style={{ color: "#e67e22" }} />
    </span>
  );
  return (
    <span title={error}>
      <AlertCircle size={14} style={{ color: "#e74c3c" }} />
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function CloudSyncModal({ existingContractors, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>(() => makeRows(10));
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress,  setSaveProgress]  = useState<{ saved: number; total: number } | null>(null);
  const [updateProgress, setUpdateProgress] = useState<{ done: number; total: number } | null>(null);
  const [saveResult, setSaveResult] = useState<{ saved: number; total: number; errors: number; firstError: string | null; duplicates?: number } | null>(null);
  const [summary, setSummary] = useState<{ saved: number; duplicates: number; errors: number } | null>(null);
  const [templateMode, setTemplateMode] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [readPhase, setReadPhase] = useState<"read" | "parse" | "done" | null>(null);
  const [readTotalRows, setReadTotalRows] = useState(0);
  const [readDisplayRows, setReadDisplayRows] = useState(0);
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Animate row counter from 0 → readTotalRows when parsing finishes */
  useEffect(() => {
    if (readTotalRows === 0) { setReadDisplayRows(0); return; }
    let current = 0;
    const step  = Math.max(1, Math.ceil(readTotalRows / 60)); // ~60 frames
    const id = setInterval(() => {
      current += step;
      if (current >= readTotalRows) { setReadDisplayRows(readTotalRows); clearInterval(id); }
      else { setReadDisplayRows(current); }
    }, 16); // ~60 fps
    return () => clearInterval(id);
  }, [readTotalRows]);

  /* Full-duplicate set (same identity + same price/unit → skip entirely) */
  const existingSignatures = new Set(existingContractors.map(dbSignature));
  /* Identity map: key=14-field identity → existing Contractor (for price/unit updates) */
  const existingIdentityMap = new Map<string, Contractor>(
    existingContractors.map((c) => [dbIdentity(c), c])
  );

  const updateCell = useCallback((rowId: string, key: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) =>
      r.id === rowId ? { ...r, data: { ...r.data, [key]: value }, status: "idle", error: undefined } : r
    ));
  }, []);

  function addRows(n = 5) {
    setRows((prev) => [...prev, ...makeRows(n)]);
  }

  function removeRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }

  /* ── Shared paste processor — called from button OR global Ctrl+V ── */
  const applyPastedText = useCallback((text: string) => {
    const parsed = parseTsvToRows(text);
    if (parsed.length === 0) return;
    const newRows: Row[] = parsed.map((data) => ({ id: Math.random().toString(36).slice(2), data, status: "idle" }));
    setRows((prev) => {
      const nonEmpty = prev.filter((r) => !isRowEmpty(r.data));
      return [...nonEmpty, ...newRows, ...makeRows(Math.max(0, 3))];
    });
  }, []);

  /* ── Global Ctrl+V listener — intercepts paste at document level.
     Works for any amount of data regardless of which cell is focused,
     because we read from e.clipboardData directly (no permission needed).
     We deliberately do NOT skip when isEditing — if the user pastes while
     a cell is focused the TSV is multi-column, so we take over entirely. ── */
  useEffect(() => {
    function onGlobalPaste(e: ClipboardEvent) {
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;
      /* Only intercept if the pasted text looks like TSV/spreadsheet data
         (contains a tab character), so normal single-cell typing is unaffected. */
      if (!text.includes("\t") && !text.includes("\n")) return;
      e.preventDefault();
      e.stopPropagation();
      applyPastedText(text);
    }
    document.addEventListener("paste", onGlobalPaste, true); /* capture phase */
    return () => document.removeEventListener("paste", onGlobalPaste, true);
  }, [applyPastedText]);

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      applyPastedText(text);
    } catch {
      /* clipboard API blocked inside iframe — show Ctrl+V hint */
      setPasteHint(true);
      setTimeout(() => setPasteHint(false), 4000);
    }
  }

  async function handleFileUpload(file: File) {
    setUploadError(null);
    setIsReading(true);
    setReadProgress(0);
    setReadPhase("read");
    setReadTotalRows(0);
    setReadDisplayRows(0);
    setUploadName(file.name);
    try {
      const parsed = await parseExcelFile(file, (pct, phase, rowCount) => {
        setReadProgress(pct);
        setReadPhase(phase);
        if (phase === "done" && rowCount != null) setReadTotalRows(rowCount);
      });
      if (parsed.length === 0) { setUploadError("لم يتم العثور على بيانات في الملف — تأكد أن الملف يحتوي بيانات وأن أعمدته تطابق القالب المطلوب"); setIsReading(false); setReadProgress(0); return; }
      const newRows: Row[] = parsed.map((data) => ({ id: Math.random().toString(36).slice(2), data, status: "idle" }));
      setRows((prev) => {
        const nonEmpty = prev.filter((r) => !isRowEmpty(r.data));
        return [...nonEmpty, ...newRows, ...makeRows(Math.max(0, 3))];
      });
      setTemplateMode(false);
      setUploadName(null);
    } catch {
      setUploadError("تعذّر قراءة الملف — تأكد أنه ملف Excel صحيح (.xlsx / .xls)");
    } finally {
      setIsReading(false);
      setReadProgress(0);
      setReadPhase(null);
      setReadTotalRows(0);
      setReadDisplayRows(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    const toSave = rows.filter((r) => !isRowEmpty(r.data));
    if (toSave.length === 0) return;

    setIsSaving(true);
    setSummary(null);
    setSaveResult(null);

    /* ── Phase 1: Classify each row into one of four buckets ───────────────
       • duplicate   — identity AND price/unit match exactly → skip
       • toUpdate    — full identity matches but price/unit differ → update price/unit
       • toComplete  — partial identity match (DB record has empty fields) → fill all data
       • fresh       — no match at all → create new record                 */
    const duplicateIds  = new Set<string>();
    const toUpdate:   { row: Row; existing: Contractor }[] = [];
    const toComplete: { row: Row; existing: Contractor }[] = [];
    const fresh: Row[] = [];

    for (const r of toSave) {
      if (existingSignatures.has(rowSignature(r.data))) {
        duplicateIds.add(r.id);
      } else {
        const existing = existingIdentityMap.get(rowIdentity(r.data));
        if (existing) {
          toUpdate.push({ row: r, existing });
        } else {
          const partial = findPartialMatch(r.data, existingContractors);
          if (partial) {
            toComplete.push({ row: r, existing: partial });
          } else {
            fresh.push(r);
          }
        }
      }
    }

    const duplicates    = duplicateIds.size;
    const updateIds     = new Set(toUpdate.map((u) => u.row.id));
    const completeIds   = new Set(toComplete.map((u) => u.row.id));
    const freshIds      = new Set(fresh.map((r) => r.id));

    setRows((prev) =>
      prev.map((r) => {
        if (duplicateIds.has(r.id))  return { ...r, status: "duplicate" };
        if (updateIds.has(r.id))     return { ...r, status: "saving" };
        if (completeIds.has(r.id))   return { ...r, status: "saving" };
        if (freshIds.has(r.id))      return { ...r, status: "saving" };
        return r;
      })
    );

    if (fresh.length === 0 && toUpdate.length === 0 && toComplete.length === 0) {
      setSummary({ saved: 0, duplicates, errors: 0 });
      setSaveResult({ saved: 0, total: 0, errors: 0, firstError: null, duplicates });
      return;
    }

    /* ── Phase 2: build the payload ONCE (in memory) ── */
    const payload = fresh.map((row) => ({
      contractNo:      row.data.contractNo.trim(),
      contractYear:    row.data.contractYear.trim()    || null,
      contractor:      row.data.contractor.trim(),
      project:         row.data.project.trim(),
      portfolio:       row.data.portfolio.trim(),
      mainActivity:    row.data.mainActivity.trim()    || null,
      businessProgram: row.data.businessProgram.trim() || null,
      workFamily:      row.data.workFamily.trim()      || null,
      workType:        row.data.workType.trim(),
      itemScope:       row.data.itemScope.trim()       || null,
      techSpecs:       row.data.techSpecs.trim()       || null,
      measurements:    row.data.measurements.trim()    || null,
      /* itemCode is ALWAYS server-generated — discard any inbound value. */
      itemCode:        null,
      technicalScope:  row.data.technicalScope.trim(),
      workCategory:    row.data.workCategory.trim()    || null,
      unit:            row.data.unit.trim()            || null,
      price:           Math.min(Math.round(parseFloat(row.data.price) || 0), 2_000_000_000),
      localContent:    row.data.localContent.trim()    || null,
      phone:           row.data.phone.trim(),
      email:           row.data.email.trim(),
      rating:          row.data.rating ? Math.min(5, Math.max(0, Math.round(parseFloat(row.data.rating)))) : null,
      workDescription: null,
      workScopeText:   null,
    }));

    /* ── Phase 2b: updates — always send a COMPLETE payload by merging the
       existing DB record with the new values from the uploaded row.
       The PUT endpoint validates using the full CreateContractorBody schema,
       so sending a partial object (e.g. just { price, unit }) would return
       400 because required fields are missing.  Merging guarantees every
       required field is always present.                                    */
    let updated = 0;
    let errors = 0;
    let firstError: string | null = null;

    /* Helper: turn a Contractor record into a PUT-safe payload */
    function contractorToPayload(c: Contractor) {
      return {
        contractNo:      c.contractNo,
        contractYear:    c.contractYear    ?? null,
        contractor:      c.contractor,
        project:         c.project,
        portfolio:       c.portfolio,
        mainActivity:    c.mainActivity    ?? null,
        businessProgram: c.businessProgram ?? null,
        workFamily:      c.workFamily      ?? null,
        workType:        c.workType,
        itemScope:       c.itemScope       ?? null,
        techSpecs:       c.techSpecs       ?? null,
        measurements:    c.measurements    ?? null,
        technicalScope:  c.technicalScope,
        workCategory:    c.workCategory    ?? null,
        unit:            c.unit            ?? null,
        price:           c.price,
        localContent:    c.localContent    ?? null,
        phone:           c.phone,
        email:           c.email,
        rating:          c.rating          ?? null,
        workDescription: null,
        workScopeText:   null,
      };
    }

    /* ── Batched parallel update runner ─────────────────────────────────────
       Key design decisions:
       1. CONCURRENCY requests fire at the same time (true parallel I/O).
       2. All `setRows` calls for a batch are collected into one Map then
          applied in a SINGLE React state update — avoids N re-renders of a
          large list (which was causing 8-second stalls between batches).
       3. A single `setTimeout(0)` yield between batches lets the browser
          paint the progress UI.                                             */
    const CONCURRENCY = 20;

    type UpdateTask = {
      rowId:   string;
      id:      number;
      payload: Record<string, unknown>;
    };

    async function runBatchedUpdates(tasks: UpdateTask[], totalAllUpdates: number, doneOffset: number): Promise<number> {
      let batchDone = 0;
      for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const batch = tasks.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map((t) => updateContractor(t.id, t.payload as Parameters<typeof updateContractor>[1]))
        );
        const statusMap = new Map<string, { status: RowStatus; error?: string }>();
        results.forEach((r, idx) => {
          const rowId = batch[idx].rowId;
          if (r.status === "fulfilled") {
            updated++;
            statusMap.set(rowId, { status: "updated" });
          } else {
            const msg = r.reason instanceof Error ? r.reason.message : "خطأ غير معروف";
            if (!firstError) firstError = msg;
            errors++;
            statusMap.set(rowId, { status: "error", error: msg });
          }
        });
        batchDone += batch.length;
        setRows((prev) => prev.map((r) => {
          const s = statusMap.get(r.id);
          return s ? { ...r, ...s } : r;
        }));
        /* Update the update-phase progress counter */
        setUpdateProgress({ done: doneOffset + batchDone, total: totalAllUpdates });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      return batchDone;
    }

    const totalUpdates = toUpdate.length + toComplete.length;
    if (totalUpdates > 0) setUpdateProgress({ done: 0, total: totalUpdates });

    /* price/unit updates: keep all existing fields, override only price & unit */
    const doneUpdate = await runBatchedUpdates(
      toUpdate.map(({ row, existing }) => ({
        rowId:   row.id,
        id:      existing.id,
        payload: {
          ...contractorToPayload(existing),
          price: Math.min(Math.round(parseFloat(row.data.price) || 0), 2_000_000_000),
          unit:  row.data.unit.trim() || null,
        },
      })),
      totalUpdates,
      0,
    );

    /* Partial-match completions: start from existing record then override with
       every non-empty value from the uploaded row (new data wins over old).  */
    await runBatchedUpdates(
      toComplete.map(({ row, existing }) => {
        const fromRow = buildFullPayload(row.data);
        const merged  = { ...contractorToPayload(existing) } as Record<string, unknown>;
        for (const key of Object.keys(fromRow) as (keyof typeof fromRow)[]) {
          const v = fromRow[key];
          if (v !== null && v !== "" && v !== 0) merged[key] = v;
        }
        return { rowId: row.id, id: existing.id, payload: merged };
      }),
      totalUpdates,
      doneUpdate,
    );

    setUpdateProgress(null);

    /* ── Phase 3: chunked incremental save for new records ──
       Each 500-row chunk is its own HTTP request and its own DB
       transaction.  Server-side COMMIT happens after every chunk, so if
       the user closes the browser mid-import every chunk already
       acknowledged is permanently persisted.  Live progress UI updates
       between chunks. */
    const CHUNK_SIZE = 500;
    if (payload.length > 0) setSaveProgress({ saved: 0, total: payload.length });

    let saved = 0;
    const savedIds: string[] = [];

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const sliceItems  = payload.slice(i, i + CHUNK_SIZE);
      const sliceRows   = fresh.slice(i, i + CHUNK_SIZE);
      try {
        const result = await bulkCreateContractors(sliceItems);
        saved += result.saved;
        for (const r of sliceRows) {
          existingSignatures.add(rowSignature(r.data));
          savedIds.push(r.id);
        }
        const savedIdSet = new Set(savedIds);
        setRows((prev) => prev.map((r) =>
          savedIdSet.has(r.id) ? { ...r, status: "saved" } : r
        ));
        setSaveProgress({ saved, total: payload.length });
        /* Yield to the browser so the progress UI repaints between chunks
           before we kick off the next network round-trip. */
        await new Promise((resolve) => setTimeout(resolve, 0));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "خطأ غير معروف";
        if (!firstError) firstError = msg;
        errors += sliceRows.length;
        const failedIds = new Set(sliceRows.map((r) => r.id));
        setRows((prev) => prev.map((r) =>
          failedIds.has(r.id) ? { ...r, status: "error", error: msg } : r
        ));
        /* Stop on first failure — saved chunks are already persisted in
           data.db so the user keeps the work that succeeded. */
        break;
      }
    }

    /* Safety net: any row still flagged "saving" after the loop is a bug
       in our accounting (should be impossible). Force it to "error" so the
       UI never shows an indefinite spinner next to a row. */
    setRows((prev) => prev.map((r) =>
      r.status === "saving"
        ? { ...r, status: "error", error: "لم يكتمل الحفظ — أعد المحاولة" }
        : r
    ));

    setSummary({ saved, duplicates, errors });
    /* Keep the overlay locked AND switch it to the final result screen.
       The user must press "تم" to dismiss — so even a 500ms import is
       clearly acknowledged with a checkmark + count, instead of vanishing
       before the eye can register it. */
    setSaveResult({ saved: saved + updated, total: payload.length + toUpdate.length + toComplete.length, errors, firstError, duplicates });
    setSaveProgress(null);
    if (saved > 0 || updated > 0) onSaved();
  }

  const nonEmptyCount = rows.filter((r) => !isRowEmpty(r.data)).length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(10,8,5,0.72)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column" }}>
      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a5c 100%)", borderBottom: "2px solid rgba(59,143,204,0.4)", padding: "14px 24px", display: "flex", alignItems: "center", gap: "14px", flexShrink: 0, direction: "rtl" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "linear-gradient(135deg, #1e6fa8, #3b8fcc)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(59,143,204,0.4)" }}>
            <Cloud size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>إدخال بيانات سحابي</div>
            <div style={{ fontSize: "0.62rem", color: "rgba(59,143,204,0.85)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Excel Online Sync · Cloud Database Entry — 20 عموداً</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ background: "rgba(59,143,204,0.18)", border: "1px solid rgba(59,143,204,0.35)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.72rem", color: "#7ec8f0", fontWeight: 700 }}>{rows.length} صف</span>
          <span style={{ background: "rgba(43,170,116,0.15)", border: "1px solid rgba(43,170,116,0.3)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.72rem", color: "#5dd6a8", fontWeight: 700 }}>{nonEmptyCount} مدخل</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => setTemplateMode(true)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(59,143,204,0.15)", border: "1.5px solid rgba(59,143,204,0.4)", color: "#7ec8f0", borderRadius: "9px", padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
            <FileSpreadsheet size={13} />
            قالب / رفع Excel
          </button>
          <button
            onClick={handlePasteFromClipboard}
            title="لصق من الحافظة (أو اضغط Ctrl+V)"
            style={{ display: "flex", alignItems: "center", gap: "6px", background: pasteHint ? "rgba(197,160,89,0.25)" : "rgba(197,160,89,0.12)", border: `1.5px solid ${pasteHint ? "rgba(197,160,89,0.8)" : "rgba(197,160,89,0.4)"}`, color: "#e0bb7a", borderRadius: "9px", padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", transition: "all 0.2s" }}
          >
            <span style={{ fontSize: "0.85rem" }}>📋</span>
            {pasteHint ? "اضغط Ctrl+V ←" : "لصق"}
          </button>
          <button onClick={handleSave} disabled={isSaving || nonEmptyCount === 0} style={{ display: "flex", alignItems: "center", gap: "6px", background: isSaving || nonEmptyCount === 0 ? "rgba(59,143,204,0.25)" : "linear-gradient(135deg, #1e6fa8, #3b8fcc)", border: "none", color: "#fff", borderRadius: "9px", padding: "8px 18px", fontSize: "0.82rem", fontWeight: 700, cursor: isSaving || nonEmptyCount === 0 ? "not-allowed" : "pointer", fontFamily: "Tajawal, sans-serif", boxShadow: isSaving || nonEmptyCount === 0 ? "none" : "0 4px 14px rgba(59,143,204,0.4)", opacity: isSaving || nonEmptyCount === 0 ? 0.6 : 1 }}>
            {isSaving ? <Loader size={13} style={{ animation: "spin-loader 0.9s linear infinite" }} /> : <Save size={13} />}
            {isSaving ? "جاري الحفظ..." : `حفظ (${nonEmptyCount})`}
          </button>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#aaa", borderRadius: "8px", padding: "7px 10px", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Summary Banner ── */}
      {summary && (
        <div style={{ background: summary.errors > 0 ? "rgba(231,76,60,0.12)" : summary.duplicates > 0 ? "rgba(230,126,34,0.12)" : "rgba(43,170,116,0.12)", borderBottom: `1px solid ${summary.errors > 0 ? "rgba(231,76,60,0.3)" : summary.duplicates > 0 ? "rgba(230,126,34,0.3)" : "rgba(43,170,116,0.3)"}`, padding: "10px 24px", fontSize: "0.8rem", fontWeight: 700, color: summary.errors > 0 ? "#e74c3c" : summary.duplicates > 0 ? "#e67e22" : "#2baa74", display: "flex", gap: "20px", alignItems: "center", direction: "rtl", flexShrink: 0 }}>
          <span>✅ تم حفظ {summary.saved} سجل</span>
          {summary.duplicates > 0 && <span>⚠️ {summary.duplicates} مكرر (تم تخطيه)</span>}
          {summary.errors > 0 && <span>❌ {summary.errors} خطأ في الحفظ</span>}
          {summary.saved > 0 && <span style={{ marginRight: "auto", fontSize: "0.72rem", color: "#aaa", fontWeight: 400 }}>تم تحديث قاعدة البيانات السحابية بنجاح</span>}
        </div>
      )}

      {/* ── Instructions bar ── */}
      <div style={{ background: "#0a1628", padding: "8px 24px", fontSize: "0.68rem", color: "rgba(126,200,240,0.7)", display: "flex", gap: "20px", alignItems: "center", direction: "rtl", flexShrink: 0, borderBottom: "1px solid rgba(59,143,204,0.15)" }}>
        <span>💡 انقر على أي خلية لتعديلها مباشرة</span>
        <span>📋 الترتيب عند اللصق: رقم العقد | سنة العقد | المقاول | المشروع | المحفظة | النشاط | برنامج | عائلة | نوع الأعمال | شمولية | مواصفات | قياسات | وصف فني | تعاقد | وحدة | سعر | محتوى محلي | تواصل | بريد | تقييم</span>
        <span>🔒 السجل المكرر بجميع بياناته يُتخطى</span>
      </div>

      {/* ── Grid ── */}
      <div className="dark-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "auto", background: "#0d1a2e" }}>
        <table style={{ borderCollapse: "collapse", tableLayout: "fixed", direction: "rtl", width: "100%", minWidth: 1290 }}>
          <colgroup>
            <col style={{ width: 36 }} />
            {COLUMNS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
            <col style={{ width: 54 }} />
          </colgroup>

          <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <tr style={{ background: "#0a1525", borderBottom: "2px solid rgba(59,143,204,0.35)" }}>
              <th style={{ padding: "9px 6px", fontSize: "0.6rem", color: "rgba(59,143,204,0.5)", textAlign: "center", borderLeft: "1px solid rgba(59,143,204,0.1)" }}>#</th>
              {COLUMNS.map((c) => (
                <th key={c.key} style={{ padding: "6px 4px", fontSize: "0.58rem", fontWeight: 700, color: "rgba(59,143,204,0.9)", textAlign: "right", letterSpacing: "0.02em", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.2, verticalAlign: "bottom", borderLeft: "1px solid rgba(59,143,204,0.12)" }}>
                  {c.label}
                </th>
              ))}
              <th style={{ padding: "9px 6px", fontSize: "0.6rem", color: "rgba(59,143,204,0.5)", textAlign: "center" }}>حالة</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const isEmpty = isRowEmpty(row.data);
              const isDup   = row.status === "duplicate";
              const isSaved = row.status === "saved";
              const isErr   = row.status === "error";
              const rowBg   = isSaved ? "rgba(43,170,116,0.07)" : isDup ? "rgba(230,126,34,0.07)" : isErr ? "rgba(231,76,60,0.07)" : idx % 2 === 0 ? "#0f1f38" : "#0d1b33";
              return (
                <tr key={row.id} style={{ background: rowBg, borderBottom: "1px solid rgba(59,143,204,0.08)" }}>
                  <td style={{ padding: "3px 6px", fontSize: "0.6rem", color: "rgba(59,143,204,0.4)", textAlign: "center", borderLeft: "1px solid rgba(59,143,204,0.08)", verticalAlign: "middle" }}>
                    {isEmpty ? <span style={{ color: "rgba(59,143,204,0.2)" }}>·</span> : idx + 1}
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} style={{ padding: "2px 3px", borderLeft: "1px solid rgba(59,143,204,0.08)", verticalAlign: "middle" }}>
                      {col.type === "dropdown" ? (
                        <select value={row.data[col.key]} onChange={(e) => updateCell(row.id, col.key, e.target.value)} disabled={isSaved}
                          style={{ width: "100%", background: "transparent", border: "none", color: isSaved ? "#2baa74" : isDup ? "#e67e22" : "#c8dff0", fontSize: "0.72rem", fontFamily: "Tajawal, sans-serif", outline: "none", cursor: isSaved ? "not-allowed" : "pointer", padding: "5px 4px", direction: "rtl" }}>
                          {(col.options ?? []).map((opt) => <option key={opt} value={opt} style={{ background: "#0d1f3c" }}>{opt || "— اختر —"}</option>)}
                        </select>
                      ) : (
                        <input type={col.type === "number" ? "number" : "text"} value={row.data[col.key]} onChange={(e) => updateCell(row.id, col.key, e.target.value)} disabled={isSaved} min={col.type === "number" ? 0 : undefined}
                          style={{ width: "100%", background: "transparent", border: "none", color: isSaved ? "#2baa74" : isDup ? "#e67e22" : isErr ? "#e74c3c" : "#c8dff0", fontSize: "0.72rem", fontFamily: "Tajawal, sans-serif", outline: "none", padding: "5px 6px", direction: "rtl", cursor: isSaved ? "not-allowed" : "text" }}
                          onFocus={(e) => { if (!isSaved) { (e.target.parentElement as HTMLElement).style.background = "rgba(59,143,204,0.12)"; (e.target.parentElement as HTMLElement).style.borderRadius = "4px"; } }}
                          onBlur={(e) => { (e.target.parentElement as HTMLElement).style.background = ""; }}
                        />
                      )}
                    </td>
                  ))}
                  <td style={{ padding: "3px 6px", textAlign: "center", verticalAlign: "middle", borderLeft: "1px solid rgba(59,143,204,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      <StatusBadge status={row.status} error={row.error} />
                      {!isSaved && (
                        <button onClick={() => removeRow(row.id)} style={{ background: "none", border: "none", color: "rgba(231,76,60,0.4)", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }} title="حذف الصف">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div style={{ background: "#0a1525", borderTop: "1px solid rgba(59,143,204,0.2)", padding: "10px 24px", display: "flex", gap: "12px", alignItems: "center", direction: "rtl", flexShrink: 0 }}>
        <button onClick={() => addRows(5)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(59,143,204,0.12)", border: "1px solid rgba(59,143,204,0.3)", color: "#7ec8f0", borderRadius: "8px", padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
          <Plus size={13} />
          إضافة 5 صفوف
        </button>
        <button onClick={() => addRows(20)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(59,143,204,0.08)", border: "1px solid rgba(59,143,204,0.2)", color: "rgba(126,200,240,0.7)", borderRadius: "8px", padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
          <Plus size={13} />
          إضافة 20 صفاً
        </button>
        <span style={{ marginRight: "auto", fontSize: "0.68rem", color: "rgba(59,143,204,0.5)" }}>
          {rows.filter((r) => r.status === "saved").length} محفوظ · {rows.filter((r) => r.status === "duplicate").length} مكرر · {rows.filter((r) => r.status === "error").length} خطأ
        </span>
      </div>

      {/* ── Template / Upload Overlay ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
      />
      {templateMode && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,12,28,0.88)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
          <div style={{ background: "#0d1f3c", border: "2px solid rgba(59,143,204,0.4)", borderRadius: "16px", padding: "32px", maxWidth: "580px", width: "100%", direction: "rtl" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginBottom: "6px" }}>استيراد بيانات من Excel</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(126,200,240,0.65)", lineHeight: 1.6 }}>حمّل القالب، عبّئه في Excel، ثم ارفعه لاستيراد البيانات تلقائياً</div>
              </div>
              <button onClick={() => { setTemplateMode(false); setUploadError(null); setUploadName(null); }} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", flexShrink: 0 }}><X size={18} /></button>
            </div>

            {/* Step 1 — Download template */}
            <div style={{ background: "rgba(59,143,204,0.08)", border: "1px solid rgba(59,143,204,0.25)", borderRadius: "12px", padding: "18px 20px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "10px", background: "linear-gradient(135deg, #1e6fa8, #3b8fcc)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>١</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#c8dff0", marginBottom: "3px" }}>تحميل القالب</div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(126,200,240,0.6)" }}>ملف Excel جاهز بترتيب الأعمدة الصحيح (20 عمود — كود البند يُولَّد تلقائياً)</div>
                </div>
                <button onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #1e6fa8, #3b8fcc)", border: "none", color: "#fff", borderRadius: "9px", padding: "9px 18px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", flexShrink: 0, boxShadow: "0 4px 14px rgba(59,143,204,0.35)" }}>
                  <Download size={14} />
                  تحميل القالب
                </button>
              </div>
            </div>

            {/* Step 2 — Upload filled file */}
            <div style={{ background: "rgba(43,170,116,0.08)", border: "1px solid rgba(43,170,116,0.25)", borderRadius: "12px", padding: "18px 20px", marginBottom: uploadError ? "12px" : "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "10px", background: "linear-gradient(135deg, #1d8a5a, #2baa74)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>٢</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#a0e6c8", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {uploadName ? uploadName : "رفع الملف المعبّأ"}
                  </div>
                  {/* Status text */}
                  <div style={{ fontSize: "0.68rem", color: "rgba(100,220,170,0.7)", fontWeight: 600, minHeight: "1.2em" }}>
                    {isReading
                      ? readPhase === "read"
                        ? `جاري قراءة الملف... ${readProgress}%`
                        : readPhase === "parse"
                          ? `جاري تحليل البيانات... ${readProgress}%`
                          : readPhase === "done"
                            ? `اكتمل التحليل — جاري الإدراج...`
                            : `جاري المعالجة... ${readProgress}%`
                      : "اختر ملف Excel (.xlsx / .xls) بعد تعبئة القالب"}
                  </div>

                  {/* Animated row counter — appears when row count is known */}
                  {isReading && readTotalRows > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                      <span style={{ fontSize: "0.62rem", color: "rgba(100,220,170,0.5)", fontFamily: "Tajawal, sans-serif" }}>تم رصد</span>
                      <span style={{
                        fontSize: "1rem", fontWeight: 900,
                        color: "#4dd49a",
                        fontFamily: "monospace",
                        letterSpacing: "-0.02em",
                        minWidth: "4ch",
                        textShadow: "0 0 12px rgba(77,212,154,0.5)",
                        transition: "color 0.1s",
                      }}>
                        {readDisplayRows.toLocaleString("ar-EG")}
                      </span>
                      <span style={{ fontSize: "0.62rem", color: "rgba(100,220,170,0.5)", fontFamily: "Tajawal, sans-serif" }}>
                        من {readTotalRows.toLocaleString("ar-EG")} سجل
                      </span>
                    </div>
                  )}

                  {/* Live progress bar */}
                  {isReading && (
                    <div style={{ marginTop: 6, width: "100%", height: 6, background: "rgba(43,170,116,0.15)", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(43,170,116,0.25)" }}>
                      <div style={{
                        width: readTotalRows > 0
                          ? `${Math.round((readDisplayRows / readTotalRows) * 100)}%`
                          : `${readProgress}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #2baa74, #4dd49a)",
                        boxShadow: "0 0 10px rgba(43,170,116,0.6)",
                        transition: "width 0.06s linear",
                        borderRadius: 999,
                      }} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
                  disabled={isReading}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: isReading ? "rgba(43,170,116,0.25)" : "linear-gradient(135deg, #1d8a5a, #2baa74)", border: "none", color: "#fff", borderRadius: "9px", padding: "9px 18px", fontSize: "0.8rem", fontWeight: 700, cursor: isReading ? "not-allowed" : "pointer", fontFamily: "Tajawal, sans-serif", flexShrink: 0, boxShadow: isReading ? "none" : "0 4px 14px rgba(43,170,116,0.3)", opacity: isReading ? 0.85 : 1, minWidth: 110, justifyContent: "center" }}>
                  {isReading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", lineHeight: 1 }}>
                      <Loader size={14} style={{ animation: "spin-loader 0.9s linear infinite" }} />
                      {readTotalRows > 0 ? (
                        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "0.9rem", letterSpacing: "-0.02em" }}>
                          {readDisplayRows.toLocaleString("ar-EG")}
                        </span>
                      ) : (
                        <span style={{ fontFamily: "monospace", fontWeight: 800 }}>{readProgress}%</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload size={14} />
                      رفع الملف
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {uploadError && (
              <div style={{ background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "0.78rem", color: "#e74c3c", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={14} />
                {uploadError}
              </div>
            )}

            <div style={{ textAlign: "center" }}>
              <button onClick={() => { setTemplateMode(false); setUploadError(null); setUploadName(null); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#aaa", borderRadius: "8px", padding: "8px 24px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bulk-save overlay ──────────────────────────────────────────
           Locks the entire modal during a bulk import so the user
           cannot double-click "حفظ" or close the dialog mid-flight.
           Shows row count + animated spinner.                          */}
      {(isSaving || saveResult) && (() => {
        const done        = saveResult !== null;
        const isUpdating  = !done && updateProgress !== null && saveProgress === null;
        const total       = saveResult?.total ?? saveProgress?.total ?? nonEmptyCount;
        const savedNow    = saveResult?.saved ?? saveProgress?.saved ?? 0;
        const percent     = total > 0 ? Math.min(100, Math.round((savedNow / total) * 100)) : 0;
        const updPct      = updateProgress && updateProgress.total > 0
          ? Math.min(100, Math.round((updateProgress.done / updateProgress.total) * 100))
          : 0;
        const arSaved    = savedNow.toLocaleString("ar-EG");
        const arTotal    = total.toLocaleString("ar-EG");
        const hasErrors  = (saveResult?.errors ?? 0) > 0;
        const fullSuccess = done && !hasErrors && savedNow === total && total > 0;
        return (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed", inset: 0, zIndex: 3000,
              background: "rgba(8,14,28,0.82)", backdropFilter: "blur(12px)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "22px", direction: "rtl",
              fontFamily: "Tajawal, sans-serif",
              animation: "fadeInUp 0.25s ease-out",
            }}
          >
            {done ? (
              <div style={{
                width: 92, height: 92, borderRadius: "50%",
                background: fullSuccess
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : hasErrors
                    ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                    : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "3rem", color: "#fff", fontWeight: 900,
                boxShadow: fullSuccess
                  ? "0 0 28px rgba(16,185,129,0.6), 0 8px 24px rgba(0,0,0,0.4)"
                  : "0 0 28px rgba(239,68,68,0.5), 0 8px 24px rgba(0,0,0,0.4)",
                animation: "popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}>
                {fullSuccess ? "✓" : hasErrors ? "✕" : "!"}
              </div>
            ) : (
              <div
                style={{
                  width: 78, height: 78, borderRadius: "50%",
                  border: "5px solid rgba(59,143,204,0.18)",
                  borderTopColor: "#3b8fcc",
                  animation: "spin 0.85s linear infinite",
                }}
              />
            )}
            <div style={{ textAlign: "center", maxWidth: 540, padding: "0 24px" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", marginBottom: 10 }}>
                {done
                  ? saveResult?.total === 0 && (saveResult?.duplicates ?? 0) > 0
                    ? "لا يوجد جديد للحفظ"
                    : fullSuccess
                      ? "اكتمل الحفظ بنجاح"
                      : hasErrors
                        ? "اكتمل الحفظ مع وجود أخطاء"
                        : "اكتمل الحفظ"
                  : isUpdating
                    ? "جاري تحديث البنود الموجودة"
                    : "جاري معالجة وتكويد البنود"}
              </div>
              <div style={{ fontSize: "1rem", color: done && fullSuccess ? "#86efac" : "#7ec8f0", lineHeight: 1.8, fontWeight: 700 }}>
                {done && saveResult?.total === 0 && (saveResult?.duplicates ?? 0) > 0 ? (
                  <>
                    جميع البنود (<strong style={{ color: "#fff", fontSize: "1.25rem" }}>{(saveResult?.duplicates ?? 0).toLocaleString("ar-EG")}</strong>) موجودة مسبقاً في قاعدة البيانات — لم تتم إضافة أي صف جديد
                  </>
                ) : (
                  <>
                    تم حفظ <strong style={{ color: "#fff", fontSize: "1.25rem" }}>{arSaved}</strong>
                    {" "}من إجمالي{" "}
                    <strong style={{ color: "#fff", fontSize: "1.25rem" }}>{arTotal}</strong>
                    {" "}بند بنجاح
                    {done && (saveResult?.duplicates ?? 0) > 0 && (
                      <div style={{ fontSize: "0.85rem", color: "#fcd34d", marginTop: 6, fontWeight: 600 }}>
                        + {(saveResult?.duplicates ?? 0).toLocaleString("ar-EG")} صف تم تجاوزه (مكرر)
                      </div>
                    )}
                  </>
                )}
              </div>
              {!done && (
                <div style={{ fontSize: "0.78rem", color: "rgba(255,200,120,0.9)", marginTop: 10, fontWeight: 700 }}>
                  ⚠ يرجى عدم إغلاق المتصفح — كل دفعة محفوظة بشكل دائم في قاعدة البيانات
                </div>
              )}
              {done && hasErrors && saveResult?.firstError && (
                <div style={{ fontSize: "0.78rem", color: "#fca5a5", marginTop: 10, padding: "8px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8 }}>
                  {saveResult.firstError}
                </div>
              )}
            </div>

            {/* ── Live Progress Bar ── */}
            <div style={{ width: "min(520px, 80vw)", padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Update-phase bar (shown only while updating existing records) */}
              {isUpdating && updateProgress && (
                <div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,210,100,0.9)", fontWeight: 700, marginBottom: 5, textAlign: "center" }}>
                    تحديث البنود الموجودة — {updateProgress.done.toLocaleString("ar-EG")} / {updateProgress.total.toLocaleString("ar-EG")}
                  </div>
                  <div style={{
                    width: "100%", height: 10,
                    background: "rgba(197,160,89,0.12)",
                    border: "1px solid rgba(197,160,89,0.3)",
                    borderRadius: 999, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${updPct}%`, height: "100%",
                      background: "linear-gradient(90deg, #a88540 0%, #c5a059 50%, #e0bb7a 100%)",
                      borderRadius: 999,
                      transition: "width 0.3s ease-out",
                      boxShadow: "0 0 10px rgba(197,160,89,0.5)",
                    }} />
                  </div>
                </div>
              )}
              {/* Save-phase bar */}
              <div>
                {isUpdating && (
                  <div style={{ fontSize: "0.72rem", color: "rgba(126,200,240,0.7)", fontWeight: 700, marginBottom: 5, textAlign: "center" }}>
                    حفظ البنود الجديدة
                  </div>
                )}
                <div style={{
                  width: "100%", height: 14,
                  background: "rgba(59,143,204,0.12)",
                  border: "1px solid rgba(59,143,204,0.25)",
                  borderRadius: 999, overflow: "hidden",
                  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.45)",
                }}>
                  <div style={{
                    width: `${percent}%`, height: "100%",
                    background: "linear-gradient(90deg, #1e6fa8 0%, #3b8fcc 50%, #7ec8f0 100%)",
                    borderRadius: 999,
                    transition: "width 0.35s ease-out",
                    boxShadow: "0 0 14px rgba(126,200,240,0.6)",
                  }} />
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginTop: 8, fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.7)", fontWeight: 700,
                }}>
                  <span>{percent}%</span>
                  <span>{arSaved} / {arTotal}</span>
                </div>
              </div>
            </div>

            {done && (
              <button
                onClick={() => { setSaveResult(null); setIsSaving(false); }}
                autoFocus
                style={{
                  marginTop: 8, padding: "12px 36px",
                  background: fullSuccess
                    ? "linear-gradient(135deg, #c5a059 0%, #a88540 100%)"
                    : "linear-gradient(135deg, #3b8fcc 0%, #1e6fa8 100%)",
                  color: "#fff", border: "none", borderRadius: 12,
                  fontSize: "0.95rem", fontWeight: 800,
                  fontFamily: "Tajawal, sans-serif",
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                  letterSpacing: "0.04em",
                }}
              >تم — إغلاق</button>
            )}

            <style>{`
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes popIn { 0% { transform: scale(0.3); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            `}</style>
          </div>
        );
      })()}
    </div>
  );
}
