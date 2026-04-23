const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
  "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر",
  "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const hundreds = ["", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function belowThousand(n: number): string {
  if (n === 0) return "";
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (h > 0) parts.push(hundreds[h]);
  if (rem < 20) {
    if (rem > 0) parts.push(ones[rem]);
  } else {
    const t = Math.floor(rem / 10);
    const o = rem % 10;
    if (o > 0) parts.push(`${ones[o]} و${tens[t]}`);
    else parts.push(tens[t]);
  }
  return parts.join(" و");
}

export function tafqit(amount: number): string {
  if (amount === 0) return "صفر ريال سعودي";
  const billions  = Math.floor(amount / 1_000_000_000);
  const millions  = Math.floor((amount % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((amount % 1_000_000) / 1_000);
  const remainder = amount % 1_000;

  const parts: string[] = [];
  if (billions  > 0) parts.push(`${belowThousand(billions)} مليار`);
  if (millions  > 0) parts.push(`${belowThousand(millions)} مليون`);
  if (thousands > 0) parts.push(`${belowThousand(thousands)} ألف`);
  if (remainder > 0) parts.push(belowThousand(remainder));

  return parts.join(" و") + " ريال سعودي فقط لا غير";
}
