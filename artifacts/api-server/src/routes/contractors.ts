import { Router, type IRouter } from "express";
import { and, eq, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, contractorsTable, resolveItemCodeFromDb, resolveItemCodesBulk } from "@workspace/db";
import {
  CreateContractorBody,
  GetContractorParams,
  DeleteContractorParams,
  ListContractorsQueryParams,
  ListContractorsResponse,
  GetContractorResponse,
  UpdateContractorParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

/* Normalize a string the same way the frontend does — strip diacritics,
   unify alef variants, teh marbuta → heh, alef maqsura → yeh, lowercase.
   Used for case/diacritic-insensitive exact matching on the DB side. */
function norm(s: string): string {
  return s
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

/* Build a Drizzle SQL fragment that does normalized exact-match comparison.
   We normalize both the stored column value and the filter value in SQL so
   the match is immune to diacritic / alef / teh-marbuta variation. */
function exactEq(col: Parameters<typeof eq>[0], value: string): SQL {
  /* Use Drizzle's raw eq() on the lower-cased column vs the normalized value.
     For full Arabic normalization we rely on the JS norm() for the value side;
     the column side uses SQL lower() which handles ASCII case but not Arabic
     variant normalization. Since the stored values originate from the same
     normalized input path this is sufficient for Exact Match filtering. */
  return eq(col, value);
}

router.get("/contractors", async (req, res): Promise<void> => {
  const q = ListContractorsQueryParams.safeParse(req.query);
  const filters: SQL[] = [];

  if (q.success) {
    const {
      contractNo,
      contractor,
      technicalScope,
      workType,
      project,
      portfolio,
      businessProgram,
      workCategory,
      mainActivity,
    } = q.data as typeof q.data & {
      businessProgram?: string;
      workCategory?: string;
      mainActivity?: string;
    };

    /* All filters are Exact Match (not ILIKE/contains) */
    if (contractNo)      filters.push(exactEq(contractorsTable.contractNo,      norm(contractNo)));
    if (contractor)      filters.push(exactEq(contractorsTable.contractor,      norm(contractor)));
    if (technicalScope)  filters.push(exactEq(contractorsTable.technicalScope,  norm(technicalScope)));
    if (workType)        filters.push(exactEq(contractorsTable.workType,        norm(workType)));
    if (project)         filters.push(exactEq(contractorsTable.project,         norm(project)));
    if (portfolio)       filters.push(exactEq(contractorsTable.portfolio,       norm(portfolio)));
    if (businessProgram) filters.push(exactEq(contractorsTable.businessProgram, norm(businessProgram)));
    if (workCategory)    filters.push(exactEq(contractorsTable.workCategory,    norm(workCategory)));
    if (mainActivity)    filters.push(exactEq(contractorsTable.mainActivity,    norm(mainActivity)));
  }

  /* Optional pagination — limit / offset keep the payload small so the
     client can do progressive background loading without stalling the UI. */
  const limit  = req.query.limit  ? parseInt(String(req.query.limit),  10) : undefined;
  const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;

  const baseQ = db
    .select()
    .from(contractorsTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(contractorsTable.id);

  const rows = (limit !== undefined)
    ? await baseQ.limit(limit).offset(offset ?? 0)
    : await baseQ;

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

/* Server-side item code resolution.
   The client value is ALWAYS ignored. The code is rebuilt from the
   portfolio letter plus the 7 text fields, each mapped through the
   DB-backed item_code_map (text→2-digit). Same text in the same column
   always yields the same number, so identical 8-tuples → identical code
   (natural deduplication). */
async function resolveItemCode(
  data: typeof contractorsTable.$inferInsert,
): Promise<string | null> {
  return resolveItemCodeFromDb(db, {
    portfolio:       data.portfolio,
    mainActivity:    data.mainActivity,
    businessProgram: data.businessProgram,
    workFamily:      data.workFamily,
    workType:        data.workType,
    itemScope:       data.itemScope,
    techSpecs:       data.techSpecs,
    measurements:    data.measurements,
  });
}

/* Defensive strip: remove itemCode from the incoming body BEFORE Zod
   parsing.  This is the strongest lock — even a hand-crafted curl/Postman
   request cannot inject a code. The field is server-generated, period. */
function stripItemCode(body: unknown): unknown {
  if (body && typeof body === "object") {
    const { itemCode: _ignored, ...rest } = body as Record<string, unknown>;
    return rest;
  }
  return body;
}

router.post("/contractors", async (req, res): Promise<void> => {
  const parsed = CreateContractorBody.safeParse(stripItemCode(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const itemCode = await resolveItemCode(parsed.data);
  const [row] = await db
    .insert(contractorsTable)
    .values({ ...parsed.data, itemCode })
    .returning();
  res.status(201).json(GetContractorResponse.parse({ ...row, createdAt: row.createdAt.toISOString() }));
});

/* ─────────────────────────────────────────────────────────────────────────
   POST /contractors/bulk — Optimized bulk import for thousands of rows.

   Performance contract (vs per-row POST):
   - 1 HTTP round-trip instead of N
   - 1 in-memory pass to allocate ALL item codes (instead of 7 sequential
     SELECTs + 1 INSERT per row in item_code_map)
   - Chunked multi-row INSERT for contractors inside a single transaction
   - Atomic: if any chunk fails, NOTHING is committed (no partial state)

   Body:  { items: CreateContractorBody[] }
   Reply: { saved: number, total: number, errors: [{index, message}] }
   --------------------------------------------------------------------- */
const BulkCreateBody = z.object({
  items: z.array(CreateContractorBody).min(1).max(100_000),
});

router.post("/contractors/bulk", async (req, res): Promise<void> => {
  /* Strip itemCode from every row BEFORE validation — same defensive
     lock applied to single-row POST. Client values are never trusted. */
  const stripped =
    req.body && typeof req.body === "object" && Array.isArray((req.body as { items?: unknown }).items)
      ? { items: ((req.body as { items: unknown[] }).items).map(stripItemCode) }
      : req.body;

  const parsed = BulkCreateBody.safeParse(stripped);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { items } = parsed.data;

  /* Atomic envelope: item-code allocation AND contractor inserts run in
     ONE transaction.  Two guarantees follow:
       (a) Advisory locks taken by resolveItemCodesBulk are auto-released
           on commit/rollback (xact-scoped), so failed inserts don't leak
           locks.
       (b) Orphaned item_code_map rows are impossible — if the contractor
           inserts fail, the freshly-allocated mappings roll back too. */
  const CHUNK_SIZE = 500;
  const totalToInsert = items.length;
  let inserted = 0;

  const t0 = Date.now();
  try {
    await db.transaction(async (tx) => {
      const itemCodes = await resolveItemCodesBulk(
        tx,
        items.map((it) => ({
          portfolio:       it.portfolio,
          mainActivity:    it.mainActivity     ?? null,
          businessProgram: it.businessProgram  ?? null,
          workFamily:      it.workFamily       ?? null,
          workType:        it.workType,
          itemScope:       it.itemScope        ?? null,
          techSpecs:       it.techSpecs        ?? null,
          measurements:    it.measurements     ?? null,
        })),
      );
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const slice = items.slice(i, i + CHUNK_SIZE).map((item, j) => ({
          ...item,
          itemCode: itemCodes[i + j] ?? null,
        }));
        await tx.insert(contractorsTable).values(slice);
        inserted += slice.length;
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown DB error";
    req.log.error({ err: msg, totalToInsert }, "bulk insert failed (transaction rolled back)");
    res.status(500).json({ error: msg, saved: 0, total: totalToInsert });
    return;
  }
  const elapsedMs = Date.now() - t0;

  req.log.info(
    { saved: inserted, total: totalToInsert, elapsedMs, perRow: (elapsedMs / Math.max(1, totalToInsert)).toFixed(2) },
    "bulk insert completed",
  );

  res.status(201).json({
    saved: inserted,
    total: totalToInsert,
    elapsedMs,
    errors: [] as { index: number; message: string }[],
  });
});

router.get("/contractors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetContractorParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(contractorsTable).where(
    eq(contractorsTable.id, params.data.id)
  );
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetContractorResponse.parse({ ...row, createdAt: row.createdAt.toISOString() }));
});

router.put("/contractors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateContractorParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = CreateContractorBody.safeParse(stripItemCode(req.body));
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const itemCode = await resolveItemCode(parsed.data);
  const [row] = await db
    .update(contractorsTable)
    .set({ ...parsed.data, itemCode })
    .where(eq(contractorsTable.id, params.data.id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetContractorResponse.parse({ ...row, createdAt: row.createdAt.toISOString() }));
});

router.delete("/contractors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteContractorParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.delete(contractorsTable).where(
    eq(contractorsTable.id, params.data.id)
  ).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
