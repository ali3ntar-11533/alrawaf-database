/* Smart Item Coding System
   Generates a unique item code from portfolio + 7 numeric slots.
   Format: [PortfolioLetter]-[2digit×7]  e.g. "B-01020501031204"
*/

export const PORTFOLIO_LETTERS: Record<string, string> = {
  "إدارة التكنولوجيا والمعلومات": "T",
  "إدارة المشتريات":                "P",
  "الورشة المركزية والحركة":         "C",
  "قطاع منطقة القصيم":              "Q",
  "محفظة مشاريع البنية التحتية":     "I",
  "محفظة مشاريع المباني":           "B",
  "محفظة مشاريع المياه والنقل":      "W",
};

/* Arabic-aware normalization used to look up the portfolio letter
   regardless of diacritics or alef/teh-marbuta variation. */
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

/* Extract the first numeric run from a field value and pad to 2 digits.
   Returns "00" if no digits are found. */
function slot(value: string | null | undefined): string {
  const m = (value ?? "").toString().match(/\d+/);
  if (!m) return "00";
  const digits = m[0].slice(-2);              // keep last 2 if longer
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
    slot(input.measurements);
  return `${letter}-${digits}`;
}

/* Build a normalized signature used for deduplication.
   Two items are considered identical iff they share the same portfolio
   letter AND the same 7 numeric slots. */
export function itemSignature(input: ItemCodeInput): string {
  return generateItemCode(input);
}
