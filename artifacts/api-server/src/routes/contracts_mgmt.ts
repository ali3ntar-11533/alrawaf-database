import { Router, type IRouter } from "express";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { z } from "zod/v4";
import { db, contractsTable, contractStageLogTable, contractDocumentsTable } from "@workspace/db";

const router: IRouter = Router();

const STAGE_ROLES: Record<number, string[]> = {
  1:  ["مدير المشروع"],
  2:  ["مدير القطاع"],
  3:  ["مدير PMO"],
  4:  ["أخصائي العقود"],
  5:  ["أدمن العقود"],
  6:  ["أدمن العقود"],
  7:  ["مدير الإدارة"],
  8:  ["نائب الرئيس"],
  9:  ["الرئيس التنفيذي"],
  10: ["مسؤول التوقيعات"],
  11: ["مسؤول التوقيعات"],
};

interface FilterParams {
  dateFrom?: Date;
  dateTo?: Date;
  valueMin?: number;
  valueMax?: number;
}

function parseFilterParams(
  query: { dateFrom?: string; dateTo?: string; valueMin?: string; valueMax?: string },
  res: import("express").Response,
): FilterParams | null {
  const result: FilterParams = {};

  if (query.dateFrom) {
    const d = new Date(query.dateFrom);
    if (isNaN(d.getTime())) {
      res.status(400).json({ error: "قيمة dateFrom غير صالحة" });
      return null;
    }
    result.dateFrom = d;
  }
  if (query.dateTo) {
    const d = new Date(query.dateTo);
    if (isNaN(d.getTime())) {
      res.status(400).json({ error: "قيمة dateTo غير صالحة" });
      return null;
    }
    result.dateTo = d;
  }
  if (query.valueMin !== undefined) {
    const n = parseInt(query.valueMin, 10);
    if (isNaN(n) || n < 0) {
      res.status(400).json({ error: "قيمة valueMin غير صالحة" });
      return null;
    }
    result.valueMin = n;
  }
  if (query.valueMax !== undefined) {
    const n = parseInt(query.valueMax, 10);
    if (isNaN(n) || n < 0) {
      res.status(400).json({ error: "قيمة valueMax غير صالحة" });
      return null;
    }
    result.valueMax = n;
  }
  return result;
}

function buildContractFilters(params: FilterParams) {
  const filters = [];
  if (params.dateFrom) filters.push(gte(contractsTable.createdAt, params.dateFrom));
  if (params.dateTo)   filters.push(lte(contractsTable.createdAt, params.dateTo));
  if (params.valueMin !== undefined) filters.push(gte(contractsTable.value, params.valueMin));
  if (params.valueMax !== undefined) filters.push(lte(contractsTable.value, params.valueMax));
  return filters;
}

function generateContractNo(id: number): string {
  const year = new Date().getFullYear();
  const seq = String(id).padStart(4, "0");
  return `CON-${year}-${seq}`;
}

function serializeContract(c: typeof contractsTable.$inferSelect) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function serializeLog(l: typeof contractStageLogTable.$inferSelect) {
  return { ...l, createdAt: l.createdAt.toISOString() };
}

const CreateContractBody = z.object({
  title:        z.string().min(1),
  vendorName:   z.string().min(1),
  vendorContact:z.string().default(""),
  value:        z.number().int().min(0).default(0),
  startDate:    z.string().default(""),
  endDate:      z.string().default(""),
  contractType: z.string().default("خدمات"),
  projectName:  z.string().default(""),
  createdBy:    z.string().default("مدير المشروع"),
});

const StageActionBody = z.object({
  action:    z.enum(["advance", "reject"]),
  actorRole: z.string().min(1),
  actorName: z.string().min(1),
  notes:     z.string().default(""),
  wordFilename:   z.string().optional(),
  signedFilename: z.string().optional(),
});

router.get("/contracts", async (req, res): Promise<void> => {
  const { status, stage, dateFrom, dateTo, valueMin, valueMax } = req.query as {
    status?: string; stage?: string;
    dateFrom?: string; dateTo?: string;
    valueMin?: string; valueMax?: string;
  };

  const fp = parseFilterParams({ dateFrom, dateTo, valueMin, valueMax }, res);
  if (fp === null) return;

  const filters = [...buildContractFilters(fp)];
  if (status) filters.push(eq(contractsTable.status, status));
  if (stage)  filters.push(eq(contractsTable.currentStage, parseInt(stage, 10)));

  const rows = await db.select().from(contractsTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(contractsTable.createdAt));

  res.json(rows.map(serializeContract));
});

router.post("/contracts", async (req, res): Promise<void> => {
  const parsed = CreateContractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db.insert(contractsTable).values({
    ...parsed.data,
    currentStage: 1,
    status: "active",
  }).returning();

  const contractNo = generateContractNo(row.id);
  const [updated] = await db.update(contractsTable)
    .set({ contractNo })
    .where(eq(contractsTable.id, row.id))
    .returning();

  await db.insert(contractStageLogTable).values({
    contractId: row.id,
    stage: 1,
    action: "advance",
    actorRole: parsed.data.createdBy,
    actorName: parsed.data.createdBy,
    notes: "إنشاء العقد",
  });

  res.status(201).json(serializeContract(updated));
});

router.get("/contracts/activity", async (req, res): Promise<void> => {
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
  const fp = parseFilterParams({ dateFrom, dateTo }, res);
  if (fp === null) return;

  const filters = [];
  if (fp.dateFrom) filters.push(gte(contractStageLogTable.createdAt, fp.dateFrom));
  if (fp.dateTo)   filters.push(lte(contractStageLogTable.createdAt, fp.dateTo));

  const logs = await db
    .select({
      logId:        contractStageLogTable.id,
      stage:        contractStageLogTable.stage,
      action:       contractStageLogTable.action,
      actorRole:    contractStageLogTable.actorRole,
      actorName:    contractStageLogTable.actorName,
      notes:        contractStageLogTable.notes,
      logCreatedAt: contractStageLogTable.createdAt,
      contractId:   contractsTable.id,
      contractNo:   contractsTable.contractNo,
      title:        contractsTable.title,
    })
    .from(contractStageLogTable)
    .innerJoin(contractsTable, eq(contractStageLogTable.contractId, contractsTable.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(contractStageLogTable.createdAt))
    .limit(10);

  res.json(logs.map(l => ({
    ...l,
    logCreatedAt: l.logCreatedAt.toISOString(),
  })));
});

router.get("/contracts/stats", async (req, res): Promise<void> => {
  const { dateFrom, dateTo, valueMin, valueMax } = req.query as {
    dateFrom?: string; dateTo?: string;
    valueMin?: string; valueMax?: string;
  };

  const fp = parseFilterParams({ dateFrom, dateTo, valueMin, valueMax }, res);
  if (fp === null) return;

  const filters = buildContractFilters(fp);

  const [stats] = await db.select({
    total:      sql<string>`count(*)`,
    draft:      sql<string>`count(*) filter (where current_stage = 1 and status = 'active')`,
    inProgress: sql<string>`count(*) filter (where current_stage between 2 and 9 and status = 'active')`,
    approved:   sql<string>`count(*) filter (where current_stage >= 9 and status = 'active')`,
    completed:  sql<string>`count(*) filter (where status = 'completed')`,
  }).from(contractsTable)
    .where(filters.length > 0 ? and(...filters) : undefined);

  res.json({
    total:      parseInt(stats?.total      ?? "0", 10),
    draft:      parseInt(stats?.draft      ?? "0", 10),
    inProgress: parseInt(stats?.inProgress ?? "0", 10),
    approved:   parseInt(stats?.approved   ?? "0", 10),
    completed:  parseInt(stats?.completed  ?? "0", 10),
  });
});

router.get("/contracts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeContract(row));
});

router.get("/contracts/:id/audit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const logs = await db.select().from(contractStageLogTable)
    .where(eq(contractStageLogTable.contractId, id))
    .orderBy(contractStageLogTable.createdAt);

  res.json(logs.map(serializeLog));
});

router.get("/contracts/:id/documents", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const docs = await db.select().from(contractDocumentsTable)
    .where(eq(contractDocumentsTable.contractId, id))
    .orderBy(contractDocumentsTable.createdAt);

  res.json(docs.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })));
});

router.post("/contracts/:id/documents", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({
    stage:      z.number().int().min(1).max(11),
    filename:   z.string().min(1),
    fileType:   z.string().default("pdf"),
    uploadedBy: z.string().default(""),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [doc] = await db.insert(contractDocumentsTable)
    .values({ contractId: id, ...parsed.data })
    .returning();

  res.status(201).json({ ...doc, createdAt: doc.createdAt.toISOString() });
});

router.get("/contracts/:id/pdf-data", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
  if (!contract) { res.status(404).json({ error: "Not found" }); return; }

  const logs = await db.select().from(contractStageLogTable)
    .where(eq(contractStageLogTable.contractId, id))
    .orderBy(contractStageLogTable.createdAt);

  const docs = await db.select().from(contractDocumentsTable)
    .where(eq(contractDocumentsTable.contractId, id))
    .orderBy(contractDocumentsTable.createdAt);

  res.json({
    contract: serializeContract(contract),
    auditLog: logs.map(serializeLog),
    documents: docs.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })),
  });
});

router.patch("/contracts/:id/stage", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
  if (!contract) { res.status(404).json({ error: "Not found" }); return; }
  if (contract.status === "completed") { res.status(409).json({ error: "Contract already completed" }); return; }

  const parsed = StageActionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { action, actorRole, actorName, notes, wordFilename, signedFilename } = parsed.data;

  const allowedRoles = STAGE_ROLES[contract.currentStage] ?? [];
  if (!allowedRoles.includes(actorRole)) {
    res.status(403).json({ error: `دور '${actorRole}' غير مخوّل للتصرف في المرحلة ${contract.currentStage}` });
    return;
  }

  if (action === "reject") {
    await db.insert(contractStageLogTable).values({
      contractId: id,
      stage: contract.currentStage,
      action: "reject",
      actorRole, actorName,
      notes: notes || "رُفض العقد",
    });
    await db.update(contractsTable).set({
      currentStage: 1,
      rejectionReason: notes,
      wordFilename: undefined,
      updatedAt: new Date(),
    }).where(eq(contractsTable.id, id));
    const [updated] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
    res.json(serializeContract(updated));
    return;
  }

  const nextStage = contract.currentStage + 1;
  const isComplete = nextStage > 11;
  const updates: Partial<typeof contractsTable.$inferInsert> = {
    currentStage: isComplete ? 11 : nextStage,
    status: isComplete ? "completed" : "active",
    rejectionReason: undefined,
    updatedAt: new Date(),
  };
  if (wordFilename)   updates.wordFilename   = wordFilename;
  if (signedFilename) updates.signedFilename = signedFilename;

  await db.insert(contractStageLogTable).values({
    contractId: id,
    stage: contract.currentStage,
    action: "advance",
    actorRole, actorName,
    notes: notes || `اعتماد المرحلة ${contract.currentStage}`,
  });

  await db.update(contractsTable).set(updates).where(eq(contractsTable.id, id));
  const [updated] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
  res.json(serializeContract(updated));
});

export default router;
