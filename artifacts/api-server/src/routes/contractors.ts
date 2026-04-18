import { Router, type IRouter } from "express";
import { ilike, and, eq, type SQL } from "drizzle-orm";
import { db, contractorsTable } from "@workspace/db";
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

router.get("/contractors", async (req, res): Promise<void> => {
  const q = ListContractorsQueryParams.safeParse(req.query);
  const filters: SQL[] = [];

  if (q.success) {
    const { contractNo, contractor, technicalScope, workType, project, portfolio } = q.data;
    if (contractNo) filters.push(ilike(contractorsTable.contractNo, `%${contractNo}%`));
    if (contractor) filters.push(ilike(contractorsTable.contractor, `%${contractor}%`));
    if (technicalScope) filters.push(ilike(contractorsTable.technicalScope, `%${technicalScope}%`));
    if (workType) filters.push(ilike(contractorsTable.workType, `%${workType}%`));
    if (project) filters.push(ilike(contractorsTable.project, `%${project}%`));
    if (portfolio) filters.push(ilike(contractorsTable.portfolio, `%${portfolio}%`));
  }

  const rows = await db
    .select()
    .from(contractorsTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(contractorsTable.id);

  res.json(ListContractorsResponse.parse(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))));
});

router.post("/contractors", async (req, res): Promise<void> => {
  const parsed = CreateContractorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(contractorsTable).values(parsed.data).returning();
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

  const [row] = await db
    .update(contractorsTable)
    .set(parsed.data)
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
