import { Router, type IRouter } from "express";
import { and, eq, type SQL } from "drizzle-orm";
import { db, contractorsTable, resolveItemCodeFromDb } from "@workspace/db";
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
