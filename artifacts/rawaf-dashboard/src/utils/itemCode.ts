/* Smart Item Coding System — frontend copy (kept in sync with lib/db/src/itemCode.ts)
   Format: [PortfolioLetter]-[2digit×8]  e.g. "B-010205010312040X"
   Slot 8 = workCategory (نوع التعاقد) — added to widen comparison scope. */

export const PORTFOLIO_LETTERS: Record<string, string> = {
  "إدارة التكنولوجيا والمعلومات": "T",
  "إدارة المشتريات":                "P",
  "الورشة المركزية والحركة":         "C",
  "قطاع منطقة القصيم":              "Q",
  "محفظة مشاريع البنية التحتية":     "I",
  "محفظة مشاريع المباني":           "B",
  "محفظة مشاريع المياه والنقل":      "W",
};

function normArabic(s: string): string {
  return (s ?? "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

const NORMALIZED_LETTERS: Record<string, string> = Object.fromEntries(
  Object.entries(PORTFOLIO_LETTERS).map(([k, v]) => [normArabic(k), v]),
);

export function portfolioLetter(portfolio: string | null | undefined): string {
  if (!portfolio) return "";
  return NORMALIZED_LETTERS[normArabic(portfolio)] ?? "";
}

function slot(value: string | null | undefined): string {
  const m = (value ?? "").toString().match(/\d+/);
  if (!m) return "00";
  const digits = m[0].slice(-2);
  return digits.padStart(2, "0");
}

export interface ItemCodeInput {
  portfolio:       string | null | undefined;
  mainActivity:    string | null | undefined;
  businessProgram: string | null | undefined;
  workFamily:      string | null | undefined;
  workType:        string | null | undefined;
  itemScope:       string | null | undefined;
  techSpecs:       string | null | undefined;
  measurements:    string | null | undefined;
  workCategory:    string | null | undefined;
}

export function generateItemCode(input: ItemCodeInput): string {
  const letter = portfolioLetter(input.portfolio);
  if (!letter) return "";
  const digits =
    slot(input.mainActivity)    +
    slot(input.businessProgram) +
    slot(input.workFamily)      +
    slot(input.workType)        +
    slot(input.itemScope)       +
    slot(input.techSpecs)       +
    slot(input.measurements)    +
    slot(input.workCategory);
  return `${letter}-${digits}`;
}
