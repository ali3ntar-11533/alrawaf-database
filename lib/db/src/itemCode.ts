/* Smart Item Coding System
   Generates a unique item code from portfolio + 7 text fields.
   Format: [PortfolioLetter]-[2digit×7]  e.g. "B-01020501031204"

   Each of the 7 text fields is mapped through a DB-backed lookup
   (item_code_map) so the same Arabic text always yields the same
   2-digit code, and new text gets the next sequential number per
   column.  This module exposes the pure helpers; the async resolver
   lives on the server side and queries the DB. */

import { and, eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { itemCodeMapTable } from "./schema/item_code_map";

export const PORTFOLIO_LETTERS: Record<string, string> = {
  "إدارة التكنولوجيا والمعلومات": "T",
  "إدارة المشتريات":                "P",
  "الورشة المركزية والحركة":         "C",
  "قطاع منطقة القصيم":              "Q",
  "محفظة مشاريع البنية التحتية":     "I",
  "محفظة مشاريع المباني":           "B",
  "محفظة مشاريع المياه والنقل":      "W",
};

/* Arabic-aware normalization: strip diacritics, unify alef variants,
   teh marbuta → heh, alef maqsura → yeh, lowercase + trim. */
export function normArabic(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

const NORMALIZED_LETTERS: Record<string, string> = Object.fromEntries(
  Object.entries(PORTFOLIO_LETTERS).map(([k, v]) => [normArabic(k), v]),
);

export function portfolioLetter(portfolio: string | null | undefined): string {
  if (!portfolio) return "";
  return NORMALIZED_LETTERS[normArabic(portfolio)] ?? "";
}

export interface ItemCodeInput {
  portfolio:       string | null | undefined;
  mainActivity:    string | null | undefined;
  businessProgram: string | null | undefined;
  workFamily:      string | null | undefined;
  workType:        string | null | undefined;
  itemScope:       string | null | undefined;
  techSpecs:       string | null | undefined;
  measurements:    string | null | undefined;
  workCategory:    string | null | undefined;
}

/* The 8 slot columns in canonical order — DO NOT REORDER, the position
   in the final code is significant. workCategory (slot 8) was added after
   the portfolio letter was removed from the comparison key. */
export const SLOT_COLUMNS = [
  "mainActivity",
  "businessProgram",
  "workFamily",
  "workType",
  "itemScope",
  "techSpecs",
  "measurements",
  "workCategory",
] as const;

export type SlotColumn = (typeof SLOT_COLUMNS)[number];

/* Pure pad helper — 2 digits, leading zero. Grows beyond 2 chars only
   if a column exceeds 99 distinct values (still concatenates correctly). */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/* DB-backed get-or-create for a single column/text pair.

   Race-safety strategy (two unique indexes on the table):
   - UNIQUE(column_name, text_value)   → blocks duplicate text mappings
   - UNIQUE(column_name, numeric_code) → blocks two texts sharing a code

   The loop handles both kinds of conflicts:
   1. Re-read by (column, text). If present → return its code (someone
      else just inserted our text — perfect, reuse it).
   2. Otherwise compute next = max(numeric_code) + 1 and INSERT.
      - If the insert succeeds → return the new code.
      - If it fails (either index conflicted), loop and retry. Within a
        few iterations we either find our text already mapped or claim
        the next free slot. Bounded retry count keeps a runaway loop
        impossible. */
async function getOrCreateSlotCode(
  db: NodePgDatabase<Record<string, unknown>>,
  columnName: SlotColumn,
  rawText: string,
): Promise<string> {
  const normalized = normArabic(rawText);
  if (!normalized) return "00";

  const MAX_ATTEMPTS = 8;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    /* Step 1 — check if our text already has an assigned code. */
    const [existing] = await db
      .select({ numericCode: itemCodeMapTable.numericCode })
      .from(itemCodeMapTable)
      .where(and(
        eq(itemCodeMapTable.columnName, columnName),
        eq(itemCodeMapTable.textValue,  normalized),
      ))
      .limit(1);
    if (existing) return existing.numericCode;

    /* Step 2 — compute the next sequential code for this column. */
    const rows = await db
      .select({ numericCode: itemCodeMapTable.numericCode })
      .from(itemCodeMapTable)
      .where(eq(itemCodeMapTable.columnName, columnName));
    const maxN = rows.reduce(
      (m, r) => Math.max(m, parseInt(r.numericCode, 10) || 0),
      0,
    );
    const next = pad2(maxN + 1);

    /* Step 3 — try to claim it. Any unique-constraint violation
       (either text or numeric) sends us back to step 1 to re-read. */
    try {
      const [ins] = await db
        .insert(itemCodeMapTable)
        .values({
          columnName,
          textValue:   normalized,
          rawValue:    rawText.trim(),
          numericCode: next,
        })
        .returning({ numericCode: itemCodeMapTable.numericCode });
      return ins.numericCode;
    } catch {
      /* Concurrent write took our slot — loop and retry. */
      continue;
    }
  }

  throw new Error(
    `getOrCreateSlotCode: failed to allocate code for "${columnName}" after ${MAX_ATTEMPTS} attempts`,
  );
}

/* Resolve the full item code for a record.
   Returns null when the portfolio is unknown (no letter mapping). */
export async function resolveItemCodeFromDb(
  db: NodePgDatabase<Record<string, unknown>>,
  input: ItemCodeInput,
): Promise<string | null> {
  const letter = portfolioLetter(input.portfolio);
  if (!letter) return null;

  const codes = await Promise.all(
    SLOT_COLUMNS.map((col) =>
      getOrCreateSlotCode(db, col, (input[col] ?? "") as string),
    ),
  );
  return `${letter}-${codes.join("")}`;
}

/* ─────────────────────────────────────────────────────────────────────────
   BULK resolver — used by /contractors/bulk to import thousands of rows
   without hammering the DB.

   Strategy (single transaction caller is expected to wrap this):
   1. Walk all items in memory, collect every distinct (column, normalizedText)
      pair that needs a code.
   2. ONE SELECT to load every existing mapping for the involved columns.
   3. For every pair not already mapped, allocate the next sequential code
      IN MEMORY (per column), using the max of what we just loaded as the
      starting cursor.
   4. ONE INSERT (chunked) to persist the freshly-allocated mappings, with
      ON CONFLICT DO NOTHING so a parallel writer cannot break us.
   5. ONE re-SELECT of any rows where ON CONFLICT silently skipped — to
      pick up codes a concurrent caller may have just claimed for the same
      text values. (Bounded; the conflict set is at most |newMappings|.)

   Returns the full item-code string for each input in the same order.
   null is returned for inputs whose portfolio has no letter mapping.
   --------------------------------------------------------------------- */
export async function resolveItemCodesBulk(
  db: NodePgDatabase<Record<string, unknown>>,
  items: ItemCodeInput[],
): Promise<(string | null)[]> {
  if (items.length === 0) return [];

  /* Step 1 — collect needed (column, normText) pairs + remember the
     first raw text we saw for each (for auditing in rawValue). */
  const neededByCol = new Map<SlotColumn, Set<string>>();
  const rawSamples  = new Map<string, string>(); // `${col}|${normText}` -> first raw

  for (const item of items) {
    if (!portfolioLetter(item.portfolio)) continue;
    for (const col of SLOT_COLUMNS) {
      const raw = (item[col] ?? "") as string;
      const norm = normArabic(raw);
      if (!norm) continue;
      if (!neededByCol.has(col)) neededByCol.set(col, new Set());
      neededByCol.get(col)!.add(norm);
      const key = `${col}|${norm}`;
      if (!rawSamples.has(key)) rawSamples.set(key, raw.trim());
    }
  }

  const involvedCols = [...neededByCol.keys()];
  if (involvedCols.length === 0) {
    /* No portfolios resolve → just return nulls. */
    return items.map(() => null);
  }

  /* Step 1.5 — SERIALIZE allocation per column via Postgres advisory locks.
     Without this, two concurrent bulk imports could both read max=N for
     the same column, both allocate N+1 for DIFFERENT text values, and one
     would silently lose its (column, numeric_code) unique-constraint race
     leaving the row coded "00".  The lock is bound to the current
     transaction (xact) so it auto-releases on commit/rollback. The caller
     MUST wrap this function in db.transaction() for the lock to scope. */
  for (const col of involvedCols) {
    await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"itemcode:" + col}))`);
  }

  /* Step 2 — load every existing mapping for the involved columns. */
  const existingRows = await db
    .select({
      columnName:  itemCodeMapTable.columnName,
      textValue:   itemCodeMapTable.textValue,
      numericCode: itemCodeMapTable.numericCode,
    })
    .from(itemCodeMapTable)
    .where(inArray(itemCodeMapTable.columnName, involvedCols));

  /* Cache: "col|normText" -> 2-digit code */
  const codeCache = new Map<string, string>();
  /* Per-column max numeric code seen so far. */
  const maxByCol  = new Map<SlotColumn, number>();

  for (const row of existingRows) {
    codeCache.set(`${row.columnName}|${row.textValue}`, row.numericCode);
    const n = parseInt(row.numericCode, 10) || 0;
    const prev = maxByCol.get(row.columnName as SlotColumn) ?? 0;
    if (n > prev) maxByCol.set(row.columnName as SlotColumn, n);
  }

  /* Step 3 — allocate codes for any pair not yet in the cache. */
  const newMapRows: (typeof itemCodeMapTable.$inferInsert)[] = [];
  for (const [col, texts] of neededByCol) {
    for (const norm of texts) {
      const key = `${col}|${norm}`;
      if (codeCache.has(key)) continue;
      const next = (maxByCol.get(col) ?? 0) + 1;
      maxByCol.set(col, next);
      const code = pad2(next);
      codeCache.set(key, code);
      newMapRows.push({
        columnName:  col,
        textValue:   norm,
        rawValue:    rawSamples.get(key) ?? norm,
        numericCode: code,
      });
    }
  }

  /* Step 4 — persist new mappings.
     The advisory lock above guarantees no concurrent writer can be
     allocating into the same columns, so a clean INSERT cannot collide on
     the (column_name, numeric_code) unique index.  We still set the
     conflict target to (column_name, text_value) as a belt-and-suspenders
     defense against a duplicate text inside the request itself. */
  if (newMapRows.length > 0) {
    const MAP_CHUNK = 1000;
    for (let i = 0; i < newMapRows.length; i += MAP_CHUNK) {
      await db
        .insert(itemCodeMapTable)
        .values(newMapRows.slice(i, i + MAP_CHUNK))
        .onConflictDoNothing({
          target: [itemCodeMapTable.columnName, itemCodeMapTable.textValue],
        });
    }
  }

  /* Step 6 — build the final code for every input. */
  return items.map((item) => {
    const letter = portfolioLetter(item.portfolio);
    if (!letter) return null;
    const parts = SLOT_COLUMNS.map((col) => {
      const norm = normArabic((item[col] ?? "") as string);
      if (!norm) return "00";
      return codeCache.get(`${col}|${norm}`) ?? "00";
    });
    return `${letter}-${parts.join("")}`;
  });
}

/* Legacy pure helper kept for backwards-compat / non-DB callers.
   Falls back to extracting numeric runs from each field (best-effort);
   returns "" when the portfolio is unknown.  The DB-backed resolver
   above is authoritative — this is only a placeholder for clients. */
export function generateItemCode(input: ItemCodeInput): string {
  const letter = portfolioLetter(input.portfolio);
  if (!letter) return "";
  const slot = (v: string | null | undefined): string => {
    const m = (v ?? "").toString().match(/\d+/);
    return m ? m[0].slice(-2).padStart(2, "0") : "00";
  };
  const digits =
    slot(input.mainActivity)    +
    slot(input.businessProgram) +
    slot(input.workFamily)      +
    slot(input.workType)        +
    slot(input.itemScope)       +
    slot(input.techSpecs)       +
    slot(input.measurements)    +
    slot(input.workCategory);
  return `${letter}-${digits}`;
}
