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
  { label: "إنشاء العقد",            role: "مدير المشروع",       icon: "📝" },
  { label: "مراجعة القطاع",          role: "مدير القطاع",        icon: "🏢" },
  { label: "مراجعة PMO",             role: "مدير PMO",           icon: "📊" },
  { label: "المراجعة القانونية",      role: "أخصائي العقود",      icon: "⚖️" },
  { label: "صياغة البنود",           role: "أدمن العقود",        icon: "✍️" },
  { label: "رفع مسودة العقد",        role: "أدمن العقود",        icon: "📤" },
  { label: "اعتماد مدير الإدارة",    role: "مدير الإدارة",       icon: "✅" },
  { label: "اعتماد نائب الرئيس",     role: "نائب الرئيس",        icon: "🔑" },
  { label: "الختم الذهبي — CEO",      role: "الرئيس التنفيذي",   icon: "👑" },
  { label: "رفع النسخة الموقعة",     role: "مسؤول التوقيعات",   icon: "📜" },
  { label: "الأرشفة والإغلاق",       role: "مسؤول التوقيعات",   icon: "🏦" },
];

export const ROLES: { name: string; icon: string; stage: number[] }[] = [
  { name: "مدير المشروع",     icon: "👷", stage: [1] },
  { name: "مدير القطاع",      icon: "🏢", stage: [2] },
  { name: "مدير PMO",         icon: "📊", stage: [3] },
  { name: "أخصائي العقود",    icon: "⚖️", stage: [4] },
  { name: "أدمن العقود",      icon: "✍️", stage: [5, 6] },
  { name: "مدير الإدارة",     icon: "✅", stage: [7] },
  { name: "نائب الرئيس",      icon: "🔑", stage: [8] },
  { name: "الرئيس التنفيذي", icon: "👑", stage: [9] },
  { name: "مسؤول التوقيعات", icon: "📜", stage: [10, 11] },
];

export const GOLD = "#C5A059";
export const GOLD_LIGHT = "#e8c96a";
export const GOLD_BG = "rgba(197,160,89,0.08)";
export const GOLD_BORDER = "rgba(197,160,89,0.28)";
