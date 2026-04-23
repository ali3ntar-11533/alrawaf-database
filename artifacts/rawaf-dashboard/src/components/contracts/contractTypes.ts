export interface Contract {
  id:              number;
  contractNo:      string;
  title:           string;
  portfolio:       string;
  project:         string;
  workType:        string;
  technicalScope:  string;
  contractValue:   number;
  createdBy:       string;
  currentStage:    number;
  currentStatus:   string;
  stage1Status:    string;
  stage2Status:    string;
  stage3Status:    string;
  stage4Status:    string;
  s1SectorApproved:   string | null;
  s1AuditorSealed:    string | null;
  s2CostApproved:     string | null;
  s2DraftSaved:       string | null;
  s2FinanceSigned:    string | null;
  s3ComplianceLight:  string | null;
  s3VceoApproved:     string | null;
  s3CeoApproved:      string | null;
  s4ContractorSigned: string | null;
  s4ContractorName:   string | null;
  s4SignedAt:         string | null;
  budgetAllocated:    number;
  budgetConsumed:     number;
  paymentTerms:       string | null;
  guaranteePct:       number;
  createdAt:          string;
  updatedAt:          string;
}

export interface AuditLogEntry {
  id:         number;
  contractId: number;
  stage:      number;
  action:     string;
  adminRole:  string;
  adminName:  string;
  note:       string | null;
  createdAt:  string;
}

export interface ContractClause {
  id:          number;
  contractId:  number;
  clauseOrder: number;
  clauseText:  string;
  updatedAt:   string;
}

export interface ContractDetail {
  contract:  Contract;
  log:       AuditLogEntry[];
  documents: any[];
  clauses:   ContractClause[];
}

/* ── Admin role definition ── */
export type AdminRole =
  | "pm_admin"
  | "sector_admin"
  | "data_auditor"
  | "cost_admin"
  | "drafting_admin"
  | "financial_admin"
  | "compliance_admin"
  | "vceo_admin"
  | "ceo_admin"
  | "signature_admin";

export interface RoleDef {
  key:      AdminRole;
  label:    string;
  subtitle: string;
  stage:    number;
  icon:     string;
  color:    string;
}

export const ROLE_DEFS: RoleDef[] = [
  { key: "pm_admin",        label: "أدمن مدير المشروع",        subtitle: "إنشاء طلبات التعاقد",           stage: 1, icon: "🏗️",  color: "#1a6b9a" },
  { key: "sector_admin",    label: "أدمن مدير القطاع",         subtitle: "المصادقة الفنية",                stage: 1, icon: "✅",  color: "#1a6b9a" },
  { key: "data_auditor",    label: "أدمن مراجعة البيانات",      subtitle: "التحقق من صحة المستندات",       stage: 1, icon: "🔍",  color: "#1a6b9a" },
  { key: "cost_admin",      label: "أدمن التكاليف والـ PMO",    subtitle: "ربط العقد بالميزانية",          stage: 2, icon: "📊",  color: "#0f6648" },
  { key: "drafting_admin",  label: "أدمن قسم العقود",           subtitle: "صياغة العقد والتفقيط",          stage: 2, icon: "📝",  color: "#0f6648" },
  { key: "financial_admin", label: "أدمن المراجعة المالية",     subtitle: "شروط الدفع والضمانات",          stage: 2, icon: "💰",  color: "#0f6648" },
  { key: "compliance_admin",label: "أدمن اعتماد الإجراءات",    subtitle: "شرطي المرور",                   stage: 3, icon: "🚦",  color: "#7b2d8b" },
  { key: "vceo_admin",      label: "أدمن نائب الرئيس التنفيذي",subtitle: "المراجعة العليا",                stage: 3, icon: "👔",  color: "#7b2d8b" },
  { key: "ceo_admin",       label: "أدمن الرئيس التنفيذي",     subtitle: "الاعتماد النهائي",               stage: 3, icon: "👑",  color: "#7b2d8b" },
  { key: "signature_admin", label: "أدمن التوقيعات",            subtitle: "الأرشفة والتوقيع النهائي",      stage: 4, icon: "🖊️",  color: "#8b3a1f" },
];

export const STAGE_LABELS: Record<number, string> = {
  1: "البوابة الفنية",
  2: "الضبط المالي والصياغة",
  3: "السيادة الإدارية",
  4: "التوقيع والأرشفة",
};

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "قيد المراجعة",   color: "#c5a059" },
  approved:  { label: "معتمد",           color: "#27ae60" },
  rejected:  { label: "مرفوض",          color: "#e74c3c" },
  archived:  { label: "مؤرشف",          color: "#2980b9" },
  sealed:    { label: "مختوم رقمياً",   color: "#27ae60" },
  signed:    { label: "موقّع",           color: "#27ae60" },
  saved:     { label: "محفوظ",          color: "#27ae60" },
};

/* ── Arabic number-to-words (تفقيط) ── */
const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
  "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر",
  "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];

function numToAr(n: number): string {
  if (n === 0) return "صفر";
  if (n < 20) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? tens[t] : `${ones[o]} و${tens[t]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const hStr = h === 1 ? "مائة" : h === 2 ? "مئتان" : `${ones[h]} مائة`;
    return rem === 0 ? hStr : `${hStr} و${numToAr(rem)}`;
  }
  if (n < 1_000_000) {
    const t = Math.floor(n / 1000);
    const rem = n % 1000;
    const tStr = t === 1 ? "ألف" : t === 2 ? "ألفان" : t < 11 ? `${ones[t]} آلاف` : `${numToAr(t)} ألف`;
    return rem === 0 ? tStr : `${tStr} و${numToAr(rem)}`;
  }
  const m = Math.floor(n / 1_000_000);
  const rem = n % 1_000_000;
  const mStr = m === 1 ? "مليون" : m === 2 ? "مليونان" : `${numToAr(m)} مليون`;
  return rem === 0 ? mStr : `${mStr} و${numToAr(rem)}`;
}

export function tafqit(value: number): string {
  return `فقط ${numToAr(value)} ريال سعودي لا غير`;
}
