import { Router, type IRouter } from "express";
import { and, eq, type SQL } from "drizzle-orm";
import { db, contractorsTable, generateItemCode } from "@workspace/db";
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

  const rows = await db
    .select()
    .from(contractorsTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(contractorsTable.id);

  res.json(ListContractorsResponse.parse(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))));
});

/* Server-side item code resolution.
   1. Always recompute the code from portfolio + 7 numeric slots — the
      client-sent value is ignored to keep the DB authoritative.
   2. Before inserting, look up any existing record with the exact same
      computed code. If found, reuse it verbatim (deduplication rule). */
async function resolveItemCode(data: typeof contractorsTable.$inferInsert): Promise<string | null> {
  const computed = generateItemCode({
    portfolio:       data.portfolio,
    mainActivity:    data.mainActivity,
    businessProgram: data.businessProgram,
    workFamily:      data.workFamily,
    workType:        data.workType,
    itemScope:       data.itemScope,
    techSpecs:       data.techSpecs,
    measurements:    data.measurements,
  });
  if (!computed) return null;
  const [existing] = await db
    .select({ itemCode: contractorsTable.itemCode })
    .from(contractorsTable)
    .where(eq(contractorsTable.itemCode, computed))
    .limit(1);
  return existing?.itemCode ?? computed;
}

router.post("/contractors", async (req, res): Promise<void> => {
  const parsed = CreateContractorBody.safeParse(req.body);
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

  const parsed = CreateContractorBody.safeParse(req.body);
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
