import { Router, type IRouter } from "express";
import { eq, desc, and, sql, gte, lte, like } from "drizzle-orm";
import { z } from "zod/v4";
import { db, contractsTable, contractStageLogTable, contractDocumentsTable, contractCommentsTable } from "@workspace/db";

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
  contractType?: string;
  vendorName?: string;
}

function parseFilterParams(
  query: { dateFrom?: string; dateTo?: string; valueMin?: string; valueMax?: string; contractType?: string; vendorName?: string },
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
  if (query.contractType) result.contractType = query.contractType.trim();
  if (query.vendorName)   result.vendorName   = query.vendorName.trim();
  return result;
}

function buildContractFilters(params: FilterParams) {
  const filters = [];
  if (params.dateFrom) filters.push(gte(contractsTable.createdAt, params.dateFrom));
  if (params.dateTo)   filters.push(lte(contractsTable.createdAt, params.dateTo));
  if (params.valueMin !== undefined) filters.push(gte(contractsTable.value, params.valueMin));
  if (params.valueMax !== undefined) filters.push(lte(contractsTable.value, params.valueMax));
  if (params.contractType) filters.push(eq(contractsTable.contractType, params.contractType));
  if (params.vendorName)   filters.push(like(contractsTable.vendorName, `%${params.vendorName}%`));
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
  const { status, stage, dateFrom, dateTo, valueMin, valueMax, contractType, vendorName } = req.query as {
    status?: string; stage?: string;
    dateFrom?: string; dateTo?: string;
    valueMin?: string; valueMax?: string;
    contractType?: string; vendorName?: string;
  };

  const fp = parseFilterParams({ dateFrom, dateTo, valueMin, valueMax, contractType, vendorName }, res);
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

router.get("/contracts/vendors", async (req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ vendorName: contractsTable.vendorName })
    .from(contractsTable)
    .orderBy(contractsTable.vendorName);
  const names = rows.map(r => r.vendorName).filter(Boolean);
  res.json(names);
});

router.get("/contracts/my-approved", async (req, res): Promise<void> => {
  const actorName = (req.query.actorName as string | undefined)?.trim();
  if (!actorName) {
    res.status(400).json({ error: "actorName مطلوب" });
    return;
  }

  const rows = await db
    .select({
      contractId:      contractsTable.id,
      contractNo:      contractsTable.contractNo,
      title:           contractsTable.title,
      vendorName:      contractsTable.vendorName,
      currentStage:    contractsTable.currentStage,
      status:          contractsTable.status,
      rejectionReason: contractsTable.rejectionReason,
      approvedAt:      contractStageLogTable.createdAt,
      approvedStage:   contractStageLogTable.stage,
    })
    .from(contractStageLogTable)
    .innerJoin(contractsTable, eq(contractStageLogTable.contractId, contractsTable.id))
    .where(
      and(
        eq(contractStageLogTable.actorName, actorName),
        eq(contractStageLogTable.action, "advance"),
      )
    )
    .orderBy(desc(contractStageLogTable.createdAt));

  const seen = new Set<number>();
  const unique = rows.filter(r => {
    if (seen.has(r.contractId)) return false;
    seen.add(r.contractId);
    return true;
  });

  res.json(unique.map(r => ({
    ...r,
    approvedAt: r.approvedAt.toISOString(),
  })));
});

router.get("/contracts/activity", async (req, res): Promise<void> => {
  const { dateFrom, dateTo, contractType, vendorName } = req.query as { dateFrom?: string; dateTo?: string; contractType?: string; vendorName?: string };
  const fp = parseFilterParams({ dateFrom, dateTo, contractType, vendorName }, res);
  if (fp === null) return;

  const filters = [];
  if (fp.dateFrom) filters.push(gte(contractStageLogTable.createdAt, fp.dateFrom));
  if (fp.dateTo)   filters.push(lte(contractStageLogTable.createdAt, fp.dateTo));
  if (fp.contractType) filters.push(eq(contractsTable.contractType, fp.contractType));
  if (fp.vendorName)   filters.push(like(contractsTable.vendorName, `%${fp.vendorName}%`));

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
  const { dateFrom, dateTo, valueMin, valueMax, contractType, vendorName } = req.query as {
    dateFrom?: string; dateTo?: string;
    valueMin?: string; valueMax?: string;
    contractType?: string; vendorName?: string;
  };

  const fp = parseFilterParams({ dateFrom, dateTo, valueMin, valueMax, contractType, vendorName }, res);
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

// ── Comments endpoints ─────────────────────────────────────────────
const AddCommentBody = z.object({
  actorName: z.string().min(1),
  actorRole: z.string().default(""),
  message:   z.string().min(1),
});

router.get("/contracts/:id/comments", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [contract] = await db.select({ id: contractsTable.id }).from(contractsTable).where(eq(contractsTable.id, id));
  if (!contract) { res.status(404).json({ error: "العقد غير موجود" }); return; }

  const rows = await db.select().from(contractCommentsTable)
    .where(eq(contractCommentsTable.contractId, id))
    .orderBy(contractCommentsTable.createdAt);

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/contracts/:id/comments", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [contract] = await db.select({ id: contractsTable.id }).from(contractsTable).where(eq(contractsTable.id, id));
  if (!contract) { res.status(404).json({ error: "العقد غير موجود" }); return; }

  const parsed = AddCommentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.insert(contractCommentsTable).values({
    contractId: id,
    ...parsed.data,
  }).returning();

  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

// ── Seed endpoint ──────────────────────────────────────────────────
const STAGE_ACTOR_ROLES: Record<number, string> = {
  1: "مدير المشروع", 2: "مدير القطاع", 3: "مدير PMO",
  4: "أخصائي العقود", 5: "أدمن العقود", 6: "أدمن العقود",
  7: "مدير الإدارة", 8: "نائب الرئيس", 9: "الرئيس التنفيذي",
  10: "مسؤول التوقيعات", 11: "مسؤول التوقيعات",
};
const STAGE_ACTOR_NAMES: Record<number, string> = {
  1: "أحمد المطيري", 2: "سعد العتيبي", 3: "منى الشهري", 4: "عبدالله الحربي",
  5: "سارة القحطاني", 6: "سارة القحطاني", 7: "ناصر الدوسري", 8: "ريم العنزي",
  9: "خالد المالكي", 10: "هند السبيعي", 11: "هند السبيعي",
};

// active contracts — one per stage 1→11
const ACTIVE_CONTRACTS = [
  { title: "عقد إنشاء مركز خدمات المواطن",             vendorName: "شركة الجودة الشاملة",         vendorContact: "0501112233", value:   450_000, contractType: "إنشاء",   projectName: "مشروع الخدمات البلدية",       createdBy: "أحمد المطيري",  startDate: "2026-01-05", endDate: "2026-08-05", targetStage: 1 },
  { title: "عقد توريد معدات الحراسة الأمنية",           vendorName: "مؤسسة الأمان للأجهزة",        vendorContact: "0559990001", value:   780_000, contractType: "توريد",  projectName: "مشروع تأمين المنشآت",         createdBy: "سعد العتيبي",   startDate: "2025-11-01", endDate: "2026-05-01", targetStage: 2 },
  { title: "عقد تطوير نظام الإشارات المرورية الذكية",   vendorName: "شركة التقنية المتقدمة",        vendorContact: "0534441122", value: 3_200_000, contractType: "خدمات",  projectName: "مشروع المدينة الذكية",        createdBy: "أحمد المطيري",  startDate: "2025-09-15", endDate: "2026-09-15", targetStage: 3 },
  { title: "عقد صيانة المصاعد والرافعات",               vendorName: "شركة التقنيات الرفيعة",        vendorContact: "0571228833", value:   320_000, contractType: "صيانة",  projectName: "مشروع المباني الحكومية",      createdBy: "سعد العتيبي",   startDate: "2026-02-01", endDate: "2026-08-01", targetStage: 4 },
  { title: "عقد تشييد مدرسة ابتدائية بنات",             vendorName: "مجموعة التعليم والبناء",       vendorContact: "0509887766", value: 8_500_000, contractType: "إنشاء",   projectName: "مشروع التعليم الحكومي",       createdBy: "أحمد المطيري",  startDate: "2025-06-01", endDate: "2026-12-01", targetStage: 5 },
  { title: "عقد تطوير البنية التحتية الرقمية",           vendorName: "شركة البيانات الذكية",         vendorContact: "0551234567", value: 5_200_000, contractType: "خدمات",  projectName: "مشروع التحول الرقمي",         createdBy: "سعد العتيبي",   startDate: "2025-07-01", endDate: "2026-07-01", targetStage: 6 },
  { title: "عقد إنشاء حديقة عامة ومنتزه ترفيهي",        vendorName: "شركة الخضراء للمقاولات",       vendorContact: "0561239876", value: 1_800_000, contractType: "إنشاء",   projectName: "مشروع التطوير الحضري",        createdBy: "أحمد المطيري",  startDate: "2025-08-01", endDate: "2026-06-01", targetStage: 7 },
  { title: "عقد توريد وتجهيز سيارات خدمة ميدانية",      vendorName: "شركة الأسطول المتميز",         vendorContact: "0530001122", value: 2_600_000, contractType: "توريد",  projectName: "مشروع الأسطول الحكومي",       createdBy: "سعد العتيبي",   startDate: "2025-10-01", endDate: "2026-04-01", targetStage: 8 },
  { title: "عقد بناء مستودع مركزي للتخزين",             vendorName: "مؤسسة البنية الصلبة",          vendorContact: "0540007788", value: 4_100_000, contractType: "إنشاء",   projectName: "مشروع اللوجستيات",            createdBy: "أحمد المطيري",  startDate: "2025-05-01", endDate: "2026-05-01", targetStage: 9 },
  { title: "عقد إعادة تأهيل محطة المعالجة الرئيسية",    vendorName: "شركة الإنشاء الحديث",          vendorContact: "0529998877", value: 6_700_000, contractType: "صيانة",  projectName: "مشروع معالجة المياه",         createdBy: "سعد العتيبي",   startDate: "2025-04-01", endDate: "2026-10-01", targetStage: 10 },
  { title: "عقد توسعة خطوط المياه الرئيسية والفرعية",   vendorName: "مجموعة المياه المتكاملة",      vendorContact: "0576543210", value: 3_900_000, contractType: "إنشاء",   projectName: "مشروع شبكة المياه الموسعة",   createdBy: "أحمد المطيري",  startDate: "2025-03-15", endDate: "2026-03-15", targetStage: 11 },
];

// completed contracts — fully approved through stage 11
const COMPLETED_CONTRACTS = [
  { title: "عقد إنشاء مبنى الإدارة العامة الجديد",        vendorName: "شركة الراسخ للإنشاء",         vendorContact: "0501000001", value:  9_500_000, contractType: "إنشاء",  projectName: "مشروع المقر المؤسسي",         createdBy: "فهد الحربي",    startDate: "2024-01-01", endDate: "2025-01-01" },
  { title: "عقد صيانة شاملة لشبكة الصرف الصحي",          vendorName: "شركة الصرف المتكاملة",         vendorContact: "0559000002", value:  2_100_000, contractType: "صيانة",  projectName: "مشروع الصرف الصحي الحضري",    createdBy: "سعد العتيبي",   startDate: "2024-03-01", endDate: "2024-12-01" },
  { title: "عقد توريد وتركيب كاميرات مراقبة متكاملة",    vendorName: "شركة الأمان الرقمي",           vendorContact: "0533000003", value:  1_450_000, contractType: "توريد",  projectName: "مشروع المراقبة الأمنية",      createdBy: "خالد السبيعي",  startDate: "2024-04-01", endDate: "2024-10-01" },
  { title: "عقد تطوير وتجميل المنتزه الترفيهي الكبير",   vendorName: "مجموعة الترفيه والبيئة",       vendorContact: "0571000004", value:  4_300_000, contractType: "إنشاء",  projectName: "مشروع البيئة والترفيه",       createdBy: "أحمد المطيري",  startDate: "2024-02-01", endDate: "2025-02-01" },
  { title: "عقد إنشاء مركز التدريب المهني والتقني",       vendorName: "شركة التعليم والتطوير",        vendorContact: "0509000005", value:  7_800_000, contractType: "إنشاء",  projectName: "مشروع التدريب الوطني",        createdBy: "محمد الشهري",   startDate: "2024-05-01", endDate: "2025-05-01" },
];

// rejected/returned contracts — "rejection" semantic: status stays "active", rejectionReason is set, currentStage resets to 1.
// This matches the existing UI convention where "مُعادة" is detected via rejectionReason presence rather than a separate status value.
const REJECTED_CONTRACTS = [
  { title: "عقد صيانة مولدات الطوارئ والمحطات الفرعية",  vendorName: "شركة الطاقة الاحتياطية",       vendorContact: "0511000006", value:   580_000, contractType: "صيانة",  projectName: "مشروع الطوارئ الكهربائية",    createdBy: "سعد العتيبي",   startDate: "2025-08-01", endDate: "2026-02-01", rejectionStage: 3, rejectionReason: "العقد يحتاج مراجعة المواصفات الفنية وإعادة تسعير البنود" },
  { title: "عقد توريد مستلزمات المكاتب والقرطاسية",      vendorName: "شركة اللوازم المكتبية الدولية", vendorContact: "0559000007", value:   420_000, contractType: "توريد",  projectName: "مشروع التجهيزات الإدارية",    createdBy: "أحمد المطيري",  startDate: "2025-09-01", endDate: "2026-01-01", rejectionStage: 5, rejectionReason: "الأسعار المقدمة تتجاوز حدود الميزانية المعتمدة بنسبة 35%" },
  { title: "عقد تطوير نظام الأمان والتحكم المركزي",      vendorName: "شركة التحكم الآلي المتقدم",    vendorContact: "0533000008", value: 1_900_000, contractType: "خدمات",  projectName: "مشروع أتمتة المنشآت",        createdBy: "سعد العتيبي",   startDate: "2025-07-01", endDate: "2026-07-01", rejectionStage: 7, rejectionReason: "يجب مراجعة بنود الضمان والصيانة وتوضيح مستوى الخدمة المطلوب" },
];

// seed sample comments per first few contracts
const SEED_COMMENTS: { contractIndex: number; comments: Array<{ actorName: string; actorRole: string; message: string }> }[] = [
  { contractIndex: 0, comments: [
    { actorName: "سعد العتيبي", actorRole: "مدير القطاع", message: "يرجى مراجعة الشروط الفنية قبل الرفع للمرحلة التالية" },
    { actorName: "أحمد المطيري", actorRole: "مدير المشروع", message: "تم مراجعة الشروط والتحقق من توافقها مع المواصفات المعتمدة" },
  ]},
  { contractIndex: 2, comments: [
    { actorName: "منى الشهري", actorRole: "مدير PMO", message: "هل تم الحصول على الموافقة المبدئية من الجهة المختصة؟" },
    { actorName: "سعد العتيبي", actorRole: "مدير القطاع", message: "نعم، تم الحصول على الموافقة رقم 4455/2025 بتاريخ أمس" },
    { actorName: "منى الشهري", actorRole: "مدير PMO", message: "ممتاز، سيتم إنهاء المراجعة خلال يومي عمل" },
  ]},
  { contractIndex: 5, comments: [
    { actorName: "ناصر الدوسري", actorRole: "مدير الإدارة", message: "العقد جاهز للاعتماد، تأكدت من استيفاء جميع الشروط" },
    { actorName: "ريم العنزي", actorRole: "نائب الرئيس", message: "شكراً، سأقوم بالمراجعة النهائية واتخاذ القرار غداً" },
  ]},
];

router.post("/contracts/seed", async (_req, res): Promise<void> => {
  // always wipe and rebuild for a canonical demo dataset
  await db.delete(contractCommentsTable);
  await db.delete(contractDocumentsTable);
  await db.delete(contractStageLogTable);
  await db.delete(contractsTable);

  const insertedIds: number[] = [];

  // helper: insert + advance to stage
  async function insertContract(
    fields: Omit<typeof ACTIVE_CONTRACTS[0], "targetStage">,
    targetStage: number,
    finalStatus: "active" | "completed" = "active",
    rejectionInfo?: { stage: number; reason: string },
  ) {
    const [row] = await db.insert(contractsTable).values({ ...fields, currentStage: 1, status: "active" }).returning();
    const contractNo = generateContractNo(row.id);
    await db.update(contractsTable).set({ contractNo }).where(eq(contractsTable.id, row.id));
    await db.insert(contractStageLogTable).values({ contractId: row.id, stage: 1, action: "create", actorRole: "مدير المشروع", actorName: fields.createdBy, notes: "إنشاء العقد" });

    if (rejectionInfo) {
      // advance up to rejection stage
      for (let s = 1; s < rejectionInfo.stage; s++) {
        await db.insert(contractStageLogTable).values({ contractId: row.id, stage: s, action: "advance", actorRole: STAGE_ACTOR_ROLES[s], actorName: STAGE_ACTOR_NAMES[s], notes: `اعتماد المرحلة ${s}` });
        await db.update(contractsTable).set({ currentStage: s + 1, updatedAt: new Date() }).where(eq(contractsTable.id, row.id));
      }
      await db.insert(contractStageLogTable).values({ contractId: row.id, stage: rejectionInfo.stage, action: "reject", actorRole: STAGE_ACTOR_ROLES[rejectionInfo.stage], actorName: STAGE_ACTOR_NAMES[rejectionInfo.stage], notes: rejectionInfo.reason });
      await db.update(contractsTable).set({ currentStage: 1, rejectionReason: rejectionInfo.reason, updatedAt: new Date() }).where(eq(contractsTable.id, row.id));
    } else {
      // advance to targetStage
      for (let s = 1; s < targetStage; s++) {
        await db.insert(contractStageLogTable).values({ contractId: row.id, stage: s, action: "advance", actorRole: STAGE_ACTOR_ROLES[s], actorName: STAGE_ACTOR_NAMES[s], notes: `اعتماد المرحلة ${s}` });
        const nextStage = s + 1;
        const isLast = nextStage > 11;
        await db.update(contractsTable).set({
          currentStage: isLast ? 11 : nextStage,
          status: finalStatus === "completed" && isLast ? "completed" : "active",
          updatedAt: new Date(),
        }).where(eq(contractsTable.id, row.id));
      }
      if (finalStatus === "completed") {
        await db.update(contractsTable).set({ status: "completed" }).where(eq(contractsTable.id, row.id));
      }
    }
    return row.id;
  }

  for (const c of ACTIVE_CONTRACTS) {
    const { targetStage, ...fields } = c;
    const id = await insertContract(fields, targetStage);
    insertedIds.push(id);
  }
  for (const c of COMPLETED_CONTRACTS) {
    const id = await insertContract(c, 12, "completed");
    insertedIds.push(id);
  }
  for (const c of REJECTED_CONTRACTS) {
    const { rejectionStage, rejectionReason, ...fields } = c;
    const id = await insertContract(fields, rejectionStage, "active", { stage: rejectionStage, reason: rejectionReason });
    insertedIds.push(id);
  }

  // seed sample comments
  for (const sc of SEED_COMMENTS) {
    const contractId = insertedIds[sc.contractIndex];
    if (!contractId) continue;
    for (const comment of sc.comments) {
      await db.insert(contractCommentsTable).values({ contractId, ...comment });
    }
  }

  res.json({ seeded: true, active: ACTIVE_CONTRACTS.length, completed: COMPLETED_CONTRACTS.length, rejected: REJECTED_CONTRACTS.length });
});

export default router;
