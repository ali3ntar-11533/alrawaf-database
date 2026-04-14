import { FileSpreadsheet } from "lucide-react";

const tableData = [
  {
    contractNo: "CN-2024-001",
    contractor: "شركة الرواف للمقاولات",
    project: "نقل المياه الحلقي",
    portfolio: "الرياض",
    classification: "درجة أولى",
    workType: "إنشائي",
    price: "4,500,000",
    phone: "0500000000",
    email: "info@alrawaf.sa",
  },
  {
    contractNo: "CN-2024-089",
    contractor: "مؤسسة نجد الحديثة",
    project: "نقل المياه الحلقي",
    portfolio: "الرياض",
    classification: "درجة أولى",
    workType: "إنشائي",
    price: "6,200,000",
    phone: "0551234567",
    email: "info@najd-con.sa",
  },
  {
    contractNo: "CN-2024-102",
    contractor: "شركة المسار السريع",
    project: "توسعة الطرق الرئيسية",
    portfolio: "جدة",
    classification: "درجة ثانية",
    workType: "تشطيبات",
    price: "5,800,000",
    phone: "0556789012",
    email: "contact@almasar.sa",
  },
  {
    contractNo: "CN-2024-115",
    contractor: "مقاولات الوطنية",
    project: "مجمع سكني النرجس",
    portfolio: "الرياض",
    classification: "درجة أولى",
    workType: "كهربائي",
    price: "3,100,000",
    phone: "0509876543",
    email: "info@watania.sa",
  },
  {
    contractNo: "CN-2024-130",
    contractor: "شركة الخليج للإنشاء",
    project: "مشروع مياه الدمام",
    portfolio: "الشرقية",
    classification: "درجة أولى",
    workType: "ميكانيكي",
    price: "7,300,000",
    phone: "0531234567",
    email: "info@gulf-const.sa",
  },
  {
    contractNo: "CN-2024-145",
    contractor: "مؤسسة البناء الحديث",
    project: "توسعة مطار الملك فهد",
    portfolio: "الشرقية",
    classification: "درجة ثانية",
    workType: "إنشائي",
    price: "4,900,000",
    phone: "0543456789",
    email: "modern@albina.sa",
  },
];

const headers = [
  "رقم العقد",
  "اسم المقاول",
  "اسم المشروع",
  "المحفظة",
  "تصنيف الأعمال",
  "نوع الأعمال",
  "سعر البند",
  "رقم التواصل",
  "البريد الإلكتروني",
];

export default function DatabasePage() {
  return (
    <div style={{ maxWidth: "1550px", margin: "0 auto", padding: "20px" }}>
      <div className="glass-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--rawaf-gold)", margin: 0 }}>
            سجل البيانات الشامل (إكسل)
          </h2>
          <button
            style={{
              background: "#16a34a",
              color: "white",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#15803d")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#16a34a")}
          >
            <FileSpreadsheet size={14} />
            تصدير البيانات
          </button>
        </div>

        <div className="custom-scroll" style={{ overflowX: "auto" }}>
          <table className="database-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.contractNo}>
                  <td style={{ color: "var(--rawaf-gold)", fontWeight: 700 }}>{row.contractNo}</td>
                  <td>{row.contractor}</td>
                  <td>{row.project}</td>
                  <td>{row.portfolio}</td>
                  <td>{row.classification}</td>
                  <td>{row.workType}</td>
                  <td style={{ color: "#4ade80", fontWeight: 700 }}>{row.price}</td>
                  <td style={{ direction: "ltr", textAlign: "right" }}>{row.phone}</td>
                  <td style={{ color: "#94a3b8" }}>{row.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
