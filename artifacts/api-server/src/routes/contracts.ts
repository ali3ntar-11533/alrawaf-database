import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  contractsTable,
  contractStageLogTable,
  contractDocumentsTable,
  contractClausesTable,
} from "@workspace/db";

const router: IRouter = Router();

/* ── Helpers ── */
function toISO(row: any) {
  const r = { ...row };
  if (r.createdAt instanceof Date) r.createdAt = r.createdAt.toISOString();
  if (r.updatedAt instanceof Date) r.updatedAt = r.updatedAt.toISOString();
  if (r.uploadedAt instanceof Date) r.uploadedAt = r.uploadedAt.toISOString();
  if (r.s4SignedAt instanceof Date) r.s4SignedAt = r.s4SignedAt.toISOString();
  return r;
}

/* ── POST /api/contracts — create new CR ── */
const CreateContractBody = z.object({
  title:          z.string().min(1),
  portfolio:      z.string().min(1),
  project:        z.string().min(1),
  workType:       z.string().min(1),
  technicalScope: z.string().min(1),
  contractValue:  z.number().int().default(0),
  createdBy:      z.string().default("مدير المشروع"),
  budgetAllocated: z.number().int().optional(),
  budgetConsumed:  z.number().int().optional(),
});

router.post("/contracts", async (req, res): Promise<void> => {
  const parsed = CreateContractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const now = new Date();
  /* auto-generate contract number */
  const count = await db.select().from(contractsTable);
  const contractNo = `CR-${now.getFullYear()}-${String(count.length + 1).padStart(4, "0")}`;

  const [row] = await db.insert(contractsTable).values({
    contractNo,
    ...parsed.data,
    currentStage: 1,
    currentStatus: "pending",
  }).returning();

  /* Seed initial audit entry */
  await db.insert(contractStageLogTable).values({
    contractId: row.id,
    stage: 1,
    action: "إنشاء طلب التعاقد",
    adminRole: "pm_admin",
    adminName: parsed.data.createdBy,
    note: `تم إنشاء طلب التعاقد رقم ${contractNo}`,
  });

  /* Seed default clauses */
  const DEFAULT_CLAUSES = [
    "يلتزم المقاول بتنفيذ الأعمال المتفق عليها وفق المواصفات الفنية المعتمدة وخطة العمل المرفقة.",
    "يتم صرف الدفعة الأولى بنسبة 20% من قيمة العقد عند توقيع العقد وتقديم خطاب الضمان البنكي.",
    "يلتزم المقاول بالحصول على جميع التصاريح اللازمة من الجهات المختصة قبل الشروع في التنفيذ.",
    "في حال التأخر عن الجدول الزمني المعتمد تُطبَّق غرامة تأخير بواقع (1%) من قيمة العقد لكل أسبوع تأخير.",
    "يخضع هذا العقد لأنظمة المملكة العربية السعودية، وفي حال النزاع يُحال للقضاء السعودي المختص.",
  ];
  await db.insert(contractClausesTable).values(
    DEFAULT_CLAUSES.map((text, i) => ({
      contractId: row.id,
      clauseOrder: i + 1,
      clauseText: text,
    }))
  );

  res.status(201).json(toISO(row));
});

/* ── GET /api/contracts — list all ── */
router.get("/contracts", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(contractsTable)
    .orderBy(desc(contractsTable.createdAt));
  res.json(rows.map(toISO));
});

/* ── GET /api/contracts/:id — full detail ── */
router.get("/contracts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
  if (!contract) { res.status(404).json({ error: "Not found" }); return; }

  const log = await db
    .select()
    .from(contractStageLogTable)
    .where(eq(contractStageLogTable.contractId, id))
    .orderBy(desc(contractStageLogTable.createdAt));

  const docs = await db
    .select()
    .from(contractDocumentsTable)
    .where(eq(contractDocumentsTable.contractId, id));

  const clauses = await db
    .select()
    .from(contractClausesTable)
    .where(eq(contractClausesTable.contractId, id))
    .orderBy(contractClausesTable.clauseOrder);

  res.json({
    contract: toISO(contract),
    log: log.map(toISO),
    documents: docs.map(toISO),
    clauses: clauses.map(toISO),
  });
});

/* ── PATCH /api/contracts/:id/stage — advance or reject stage ── */
const StageActionBody = z.object({
  action:    z.enum(["approve", "reject", "seal", "sign", "save_draft", "cost_approve", "finance_sign", "compliance_approve", "vceo_approve", "ceo_approve", "sector_approve", "auditor_seal", "contractor_sign"]),
  adminRole: z.string(),
  adminName: z.string(),
  note:      z.string().optional(),
  extraData: z.record(z.any()).optional(),
});

router.patch("/contracts/:id/stage", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = StageActionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
  if (!contract) { res.status(404).json({ error: "Not found" }); return; }

  const { action, adminRole, adminName, note, extraData } = parsed.data;
  const update: Partial<typeof contractsTable.$inferInsert> = {};

  /* ── Stage 1 actions ── */
  if (action === "sector_approve") {
    update.s1SectorApproved = "approved";
  } else if (action === "auditor_seal") {
    update.s1AuditorSealed = "sealed";
  }

  /* ── Stage 2 actions ── */
  if (action === "cost_approve") {
    update.s2CostApproved = "approved";
    if (extraData?.budgetAllocated) update.budgetAllocated = extraData.budgetAllocated;
    if (extraData?.budgetConsumed)  update.budgetConsumed  = extraData.budgetConsumed;
  } else if (action === "save_draft") {
    update.s2DraftSaved = "saved";
  } else if (action === "finance_sign") {
    update.s2FinanceSigned = "signed";
    if (extraData?.paymentTerms)  update.paymentTerms  = extraData.paymentTerms;
    if (extraData?.guaranteePct)  update.guaranteePct  = extraData.guaranteePct;
  }

  /* ── Stage 3 actions ── */
  if (action === "compliance_approve") {
    update.s3ComplianceLight = "approved";
  } else if (action === "vceo_approve") {
    update.s3VceoApproved = "approved";
  } else if (action === "ceo_approve") {
    update.s3CeoApproved = "approved";
    update.stage3Status = "approved";
  }

  /* ── Stage 4 actions ── */
  if (action === "contractor_sign") {
    update.s4ContractorSigned = "signed";
    update.s4ContractorName   = extraData?.contractorName ?? "";
    update.s4SignedAt          = new Date().toISOString();
    update.stage4Status        = "signed";
    update.currentStatus       = "archived";
  }

  /* Auto-advance currentStage based on completion */
  const refreshed = { ...contract, ...update };
  if (
    refreshed.s1SectorApproved === "approved" &&
    refreshed.s1AuditorSealed  === "sealed" &&
    refreshed.currentStage === 1
  ) {
    update.stage1Status  = "approved";
    update.currentStage  = 2;
    update.currentStatus = "pending";
  }
  if (
    refreshed.s2CostApproved  === "approved" &&
    refreshed.s2DraftSaved    === "saved" &&
    refreshed.s2FinanceSigned === "signed" &&
    refreshed.currentStage === 2
  ) {
    update.stage2Status  = "approved";
    update.currentStage  = 3;
    update.currentStatus = "pending";
  }
  if (
    refreshed.s3ComplianceLight === "approved" &&
    refreshed.s3VceoApproved    === "approved" &&
    refreshed.s3CeoApproved     === "approved" &&
    refreshed.currentStage === 3
  ) {
    update.stage3Status  = "approved";
    update.currentStage  = 4;
    update.currentStatus = "pending";
  }

  /* Reject shortcut */
  if (action === "reject") {
    update.currentStatus = "rejected";
  }

  update.updatedAt = new Date();

  const [updated] = await db
    .update(contractsTable)
    .set(update)
    .where(eq(contractsTable.id, id))
    .returning();

  /* Append audit log */
  await db.insert(contractStageLogTable).values({
    contractId: id,
    stage: updated.currentStage,
    action,
    adminRole,
    adminName,
    note: note ?? null,
  });

  res.json(toISO(updated));
});

/* ── POST /api/contracts/:id/audit — append manual audit entry ── */
router.post("/contracts/:id/audit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = z.object({
    stage: z.number().int(),
    action: z.string(),
    adminRole: z.string(),
    adminName: z.string(),
    note: z.string().optional(),
  }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [entry] = await db.insert(contractStageLogTable).values({
    contractId: id,
    ...body.data,
    note: body.data.note ?? null,
  }).returning();

  res.status(201).json(toISO(entry));
});

/* ── PATCH /api/contracts/:id/clauses — update clauses ── */
router.patch("/contracts/:id/clauses", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = z.object({
    clauses: z.array(z.object({ clauseOrder: z.number(), clauseText: z.string() })),
  }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  /* Replace all clauses */
  await db.delete(contractClausesTable).where(eq(contractClausesTable.contractId, id));
  const inserted = await db.insert(contractClausesTable)
    .values(body.data.clauses.map(c => ({ contractId: id, ...c })))
    .returning();

  res.json(inserted.map(toISO));
});

/* ── GET /api/contracts/:id/pdf-data — structured data for PDF ── */
router.get("/contracts/:id/pdf-data", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
  if (!contract) { res.status(404).json({ error: "Not found" }); return; }

  const log = await db
    .select()
    .from(contractStageLogTable)
    .where(eq(contractStageLogTable.contractId, id))
    .orderBy(contractStageLogTable.createdAt);

  const clauses = await db
    .select()
    .from(contractClausesTable)
    .where(eq(contractClausesTable.contractId, id))
    .orderBy(contractClausesTable.clauseOrder);

  res.json({ contract: toISO(contract), log: log.map(toISO), clauses: clauses.map(toISO) });
});

export default router;
