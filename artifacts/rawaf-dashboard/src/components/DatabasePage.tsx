import { useState } from "react";
import { FileSpreadsheet, Search, ChevronUp, ChevronDown } from "lucide-react";

const allData = [
  { contractNo: "CN-2024-001", contractor: "شركة الرواف للمقاولات",    project: "نقل المياه الحلقي",      portfolio: "الرياض",   classification: "درجة أولى",  workType: "إنشائي",    price: 4500000, phone: "0500000000", email: "info@alrawaf.sa" },
  { contractNo: "CN-2024-089", contractor: "مؤسسة نجد الحديثة",        project: "نقل المياه الحلقي",      portfolio: "الرياض",   classification: "درجة أولى",  workType: "إنشائي",    price: 6200000, phone: "0551234567", email: "info@najd-con.sa" },
  { contractNo: "CN-2024-102", contractor: "شركة المسار السريع",        project: "توسعة الطرق الرئيسية",   portfolio: "جدة",      classification: "درجة ثانية", workType: "تشطيبات",   price: 5800000, phone: "0556789012", email: "contact@almasar.sa" },
  { contractNo: "CN-2024-115", contractor: "مقاولات الوطنية",          project: "مجمع سكني النرجس",       portfolio: "الرياض",   classification: "درجة أولى",  workType: "كهربائي",   price: 3100000, phone: "0509876543", email: "info@watania.sa" },
  { contractNo: "CN-2024-130", contractor: "شركة الخليج للإنشاء",      project: "مشروع مياه الدمام",      portfolio: "الشرقية",  classification: "درجة أولى",  workType: "ميكانيكي",  price: 7300000, phone: "0531234567", email: "info@gulf-const.sa" },
  { contractNo: "CN-2024-145", contractor: "مؤسسة البناء الحديث",       project: "توسعة مطار الملك فهد",   portfolio: "الشرقية",  classification: "درجة ثانية", workType: "إنشائي",    price: 4900000, phone: "0543456789", email: "modern@albina.sa" },
  { contractNo: "CN-2024-158", contractor: "شركة رؤية المستقبل",       project: "صيانة الطرق الحضرية",    portfolio: "مكة",      classification: "درجة ثانية", workType: "صيانة",     price: 2300000, phone: "0512345678", email: "info@ru2ya.sa" },
  { contractNo: "CN-2024-172", contractor: "مؤسسة الجزيرة للمقاولات",  project: "مجمع تجاري حي الياسمين", portfolio: "الرياض",   classification: "درجة أولى",  workType: "إنشائي",    price: 8500000, phone: "0567890123", email: "info@jazira-con.sa" },
];

const headers: { key: keyof typeof allData[0]; label: string }[] = [
  { key: "contractNo",     label: "رقم العقد" },
  { key: "contractor",     label: "اسم المقاول" },
  { key: "project",        label: "اسم المشروع" },
  { key: "portfolio",      label: "المحفظة" },
  { key: "classification", label: "تصنيف الأعمال" },
  { key: "workType",       label: "نوع الأعمال" },
  { key: "price",          label: "سعر البند (ر.س)" },
  { key: "phone",          label: "رقم التواصل" },
  { key: "email",          label: "البريد الإلكتروني" },
];

export default function DatabasePage() {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<keyof typeof allData[0]>("contractNo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = allData
    .filter((row) =>
      Object.values(row).some((v) =>
        String(v).toLowerCase().includes(search.toLowerCase())
      )
    )
    .sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "ar");
      return sortDir === "asc" ? cmp : -cmp;
    });

  function toggleSort(col: keyof typeof allData[0]) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  function formatPrice(p: number) {
    return p.toLocaleString("ar-SA");
  }

  return (
    <div className="animate-fade-up" style={{ maxWidth: "1560px", margin: "0 auto", padding: "20px" }}>
      <div className="glass-card">
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--charcoal)", margin: "0 0 3px" }}>
              سجل البيانات الشامل
            </h2>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
              إجمالي السجلات: {filtered.length} من {allData.length}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--section-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                padding: "7px 13px",
                transition: "border-color 0.2s",
              }}
            >
              <Search size={13} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="بحث في السجلات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "0.78rem",
                  color: "var(--charcoal)",
                  fontFamily: "Tajawal, sans-serif",
                  width: "180px",
                  direction: "rtl",
                }}
              />
            </div>

            {/* Export */}
            <button className="export-btn">
              <FileSpreadsheet size={14} />
              تصدير البيانات
            </button>
          </div>
        </div>

        {/* Summary chips */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          {[
            { label: "إجمالي قيمة العقود", value: `${(allData.reduce((s,r)=>s+r.price,0)/1e6).toFixed(1)}M ر.س` },
            { label: "الرياض", value: `${allData.filter(r=>r.portfolio==="الرياض").length} عقود` },
            { label: "جدة والشرقية", value: `${allData.filter(r=>r.portfolio!=="الرياض"&&r.portfolio!=="مكة").length} عقود` },
          ].map((chip) => (
            <div
              key={chip.label}
              style={{
                background: "rgba(197,160,89,0.08)",
                border: "1px solid rgba(197,160,89,0.25)",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "0.7rem",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>{chip.label}: </span>
              <span style={{ fontWeight: 800, color: "var(--gold-dark)" }}>{chip.value}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="custom-scroll" style={{ overflowX: "auto" }}>
          <table className="database-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h.key}
                    onClick={() => toggleSort(h.key)}
                    style={{ cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "flex-end" }}>
                      {h.label}
                      {sortCol === h.key ? (
                        sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                      ) : (
                        <span style={{ opacity: 0.3 }}><ChevronUp size={11} /></span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.contractNo} style={{ animationDelay: `${i * 0.04}s` }}>
                  <td style={{ fontWeight: 800, color: "var(--gold-dark)" }}>{row.contractNo}</td>
                  <td style={{ fontWeight: 600, color: "var(--charcoal)" }}>{row.contractor}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{row.project}</td>
                  <td>
                    <span
                      style={{
                        background: "rgba(197,160,89,0.08)",
                        color: "var(--gold-dark)",
                        padding: "2px 9px",
                        borderRadius: "12px",
                        fontSize: "10.5px",
                        fontWeight: 700,
                      }}
                    >
                      {row.portfolio}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{row.classification}</td>
                  <td>
                    <span
                      style={{
                        background: "var(--section-bg)",
                        color: "var(--charcoal-mid)",
                        padding: "2px 9px",
                        borderRadius: "12px",
                        fontSize: "10.5px",
                      }}
                    >
                      {row.workType}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, color: "var(--accent-green)" }}>
                    {formatPrice(row.price)}
                  </td>
                  <td style={{ direction: "ltr", textAlign: "right", color: "var(--text-secondary)" }}>
                    {row.phone}
                  </td>
                  <td style={{ color: "var(--charcoal-mid)" }}>{row.email}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "0.9rem" }}>لا توجد نتائج مطابقة للبحث</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
