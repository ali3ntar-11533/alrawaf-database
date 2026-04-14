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
} from "@workspace/api-zod";

const router: IRouter = Router();

const SEED_DATA = [
  {
    contractNo: "CN-2024-001",
    contractor: "شركة الرواف للمقاولات",
    project: "نقل المياه الحلقي",
    portfolio: "الرياض",
    technicalScope: "أعمال الخرسانة والتشييد المسلح",
    workType: "إنشائي",
    price: 4500000,
    phone: "0500000000",
    email: "info@alrawaf.sa",
  },
  {
    contractNo: "CN-2024-089",
    contractor: "مؤسسة نجد الحديثة",
    project: "نقل المياه الحلقي",
    portfolio: "الرياض",
    technicalScope: "أعمال الخرسانة والتشييد المسلح",
    workType: "إنشائي",
    price: 6200000,
    phone: "0551234567",
    email: "info@najd-con.sa",
  },
  {
    contractNo: "CN-2024-102",
    contractor: "شركة المسار السريع",
    project: "توسعة الطرق الرئيسية",
    portfolio: "جدة",
    technicalScope: "أعمال التشطيبات والديكور",
    workType: "تشطيبات",
    price: 5800000,
    phone: "0556789012",
    email: "contact@almasar.sa",
  },
  {
    contractNo: "CN-2024-115",
    contractor: "مقاولات الوطنية",
    project: "مجمع سكني النرجس",
    portfolio: "الرياض",
    technicalScope: "أعمال الكهرباء والميكانيكا",
    workType: "كهربائي",
    price: 3100000,
    phone: "0509876543",
    email: "info@watania.sa",
  },
  {
    contractNo: "CN-2024-130",
    contractor: "شركة الخليج للإنشاء",
    project: "مشروع مياه الدمام",
    portfolio: "الشرقية",
    technicalScope: "أعمال الأنابيب والبنية التحتية",
    workType: "ميكانيكي",
    price: 7300000,
    phone: "0531234567",
    email: "info@gulf-const.sa",
  },
  {
    contractNo: "CN-2024-145",
    contractor: "مؤسسة البناء الحديث",
    project: "توسعة مطار الملك فهد",
    portfolio: "الشرقية",
    technicalScope: "أعمال الحفر والردم والتجهيز",
    workType: "إنشائي",
    price: 4900000,
    phone: "0543456789",
    email: "modern@albina.sa",
  },
  {
    contractNo: "CN-2024-158",
    contractor: "شركة رؤية المستقبل",
    project: "صيانة الطرق الحضرية",
    portfolio: "مكة",
    technicalScope: "أعمال الصيانة الدورية للطرق",
    workType: "صيانة",
    price: 2300000,
    phone: "0512345678",
    email: "info@ru2ya.sa",
  },
  {
    contractNo: "CN-2024-172",
    contractor: "مؤسسة الجزيرة للمقاولات",
    project: "مجمع تجاري حي الياسمين",
    portfolio: "الرياض",
    technicalScope: "أعمال الهيكل الإنشائي الكامل",
    workType: "إنشائي",
    price: 8500000,
    phone: "0567890123",
    email: "info@jazira-con.sa",
  },
];

async function seedIfEmpty() {
  const existing = await db.select({ id: contractorsTable.id }).from(contractorsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(contractorsTable).values(SEED_DATA);
  }
}

seedIfEmpty().catch(() => {});

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
