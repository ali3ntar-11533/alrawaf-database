import { Router, type IRouter } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db, contractsTable, contractStageLogTable } from "@workspace/db";

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
  const { status, stage } = req.query as { status?: string; stage?: string };
  const filters = [];
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

router.get("/contracts/stats", async (_req, res): Promise<void> => {
  const [stats] = await db.select({
    total:      sql<string>`count(*)`,
    draft:      sql<string>`count(*) filter (where current_stage = 1 and status = 'active')`,
    inProgress: sql<string>`count(*) filter (where current_stage between 2 and 9 and status = 'active')`,
    approved:   sql<string>`count(*) filter (where current_stage >= 9 and status = 'active')`,
    completed:  sql<string>`count(*) filter (where status = 'completed')`,
  }).from(contractsTable);

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

router.get("/contracts/:id/log", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const logs = await db.select().from(contractStageLogTable)
    .where(eq(contractStageLogTable.contractId, id))
    .orderBy(contractStageLogTable.createdAt);

  res.json(logs.map(serializeLog));
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

router.delete("/contracts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(contractStageLogTable).where(eq(contractStageLogTable.contractId, id));
  const [row] = await db.delete(contractsTable).where(eq(contractsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
