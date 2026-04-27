export interface Contract {
  id: number;
  contractNo: string;
  title: string;
  vendorName: string;
  vendorContact: string;
  value: number;
  startDate: string;
  endDate: string;
  contractType: string;
  projectName: string;
  currentStage: number;
  status: string;
  createdBy: string;
  wordFilename: string | null;
  signedFilename: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  /* ── Extended project fields ── */
  projectNo:           string | null;
  workType:            string | null;
  contractDuration:    string | null;
  priceAnalysisStatus: string | null;
  issuerEntity:        string | null;
  costEstimationDept:  string | null;
  /* ── Second party (vendor) details ── */
  vendorIban:          string | null;
  vendorTaxNo:         string | null;
  vendorDelegate:      string | null;
  vendorDelegateTitle: string | null;
  vendorDelegateId:    string | null;
  vendorEmail:         string | null;
  vendorAddress:       string | null;
  vendorPostalCode:    string | null;
  vendorRegExpiry:     string | null;
  vendorEntityType:    string | null;
}

export interface StageLog {
  id: number;
  contractId: number;
  stage: number;
  action: string;
  actorRole: string;
  actorName: string;
  notes: string;
  createdAt: string;
}

export interface ContractStats {
  total: number;
  draft: number;
  inProgress: number;
  approved: number;
  completed: number;
}

export type ContractTab = "dashboard" | "requests" | "tracking" | "archive" | "analytics";

export const STAGES: { label: string; role: string; icon: string }[] = [
  { label: "إدارة المشروع",                role: "إدارة المشروع",                icon: "📝" },
  { label: "إدارة المحفظة",               role: "إدارة المحفظة",               icon: "🏢" },
  { label: "مراقبة التكاليف - PMO",        role: "مراقبة التكاليف - PMO",        icon: "📊" },
  { label: "مراجعة الطلب",                role: "مراجعة الطلب",                icon: "⚖️" },
  { label: "تحرير العقد",                  role: "تحرير العقد",                  icon: "✍️" },
  { label: "المراجعة الفنية للعقد",        role: "المراجعة الفنية للعقد",        icon: "📤" },
  { label: "اعتماد مدير الإدارة",          role: "اعتماد مدير الإدارة",          icon: "✅" },
  { label: "اعتماد نائب الرئيس التنفيذي", role: "اعتماد نائب الرئيس التنفيذي", icon: "🔑" },
  { label: "اعتماد الرئيس التنفيذي",       role: "اعتماد الرئيس التنفيذي",       icon: "👑" },
  { label: "التوقيعات والأرشفة",           role: "التوقيعات والأرشفة",           icon: "🏦" },
];

export const ROLES: { name: string; icon: string; stage: number[] }[] = [
  { name: "إدارة المشروع",                icon: "👷", stage: [1] },
  { name: "إدارة المحفظة",               icon: "🏢", stage: [2] },
  { name: "مراقبة التكاليف - PMO",        icon: "📊", stage: [3] },
  { name: "مراجعة الطلب",                icon: "⚖️", stage: [4] },
  { name: "تحرير العقد",                  icon: "✍️", stage: [5] },
  { name: "المراجعة الفنية للعقد",        icon: "📤", stage: [6] },
  { name: "اعتماد مدير الإدارة",          icon: "✅", stage: [7] },
  { name: "اعتماد نائب الرئيس التنفيذي", icon: "🔑", stage: [8] },
  { name: "اعتماد الرئيس التنفيذي",       icon: "👑", stage: [9] },
  { name: "التوقيعات والأرشفة",           icon: "🏦", stage: [10] },
];

export interface ContractComment {
  id: number;
  contractId: number;
  actorName: string;
  actorRole: string;
  message: string;
  createdAt: string;
}

export const GOLD = "#C5A059";
export const GOLD_LIGHT = "#e8c96a";
export const GOLD_BG = "rgba(197,160,89,0.08)";
export const GOLD_BORDER = "rgba(197,160,89,0.28)";
