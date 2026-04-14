const contractors = [
  { rank: 1, name: "شركة الرواف للمقاولات", price: "4.5M", active: true, compliance: "99%" },
  { rank: 2, name: "مؤسسة نجد الحديثة", price: "6.2M", active: false, compliance: "94%" },
  { rank: 3, name: "شركة المسار السريع", price: "5.8M", active: false, compliance: "91%" },
];

const registeredContractors = [
  { rank: 1, name: "شركة الرواف للمقاولات", price: "4.5M", active: true },
  { rank: 2, name: "مؤسسة نجد الحديثة", price: "6.2M", active: false },
  { rank: 3, name: "شركة المسار السريع", price: "5.8M", active: false },
];

export default function Sidebar() {
  return (
    <aside className="sidebar-stack">
      {/* Technical scope card */}
      <div className="glass-card" style={{ minHeight: "280px" }}>
        <span className="label-gold">نطاق التوصيف الفني للبند</span>
        <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "12px", color: "white", margin: "0 0 12px" }}>
          بند أعمال الخرسانة والتشييد المسلح
        </h3>
        <div
          className="custom-scroll"
          style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.8, overflowY: "auto", paddingRight: "4px" }}
        >
          <p style={{ marginBottom: "12px" }}>
            يشتمل هذا البند على تنفيذ وصب القواعد الخرسانية المسلحة والمياد والرقاب للمشروع وفقاً للمخططات المعتمدة وكود البناء السعودي.
          </p>
          <p style={{ marginBottom: "12px" }}>
            يتضمن النطاق توريد كافة المواد والعمالة المتخصصة والمعدات مع الالتزام التام باختبارات المختبر المعتمد.
          </p>
          <p style={{ fontStyle: "italic", color: "rgba(197, 160, 89, 0.6)" }}>
            "سيتم إضافة المزيد من الشروط الفنية والملاحظات التفصيلية هنا..."
          </p>
        </div>
      </div>

      {/* Registered contractors */}
      <div className="glass-card">
        <span className="label-gold">المقاولون المسجلون لهذا البند</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
          {registeredContractors.map((c) => (
            <div
              key={c.rank}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                background: c.active ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.1)",
                borderRadius: "8px",
                borderRight: c.active ? "4px solid var(--rawaf-gold)" : "none",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: c.active ? "white" : "#d1d5db" }}>
                {c.rank}. {c.name}
              </span>
              <span style={{ color: "var(--rawaf-gold)", fontSize: "0.75rem" }}>سعر البند: {c.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top contractors ranking */}
      <div className="glass-card" style={{ flex: 1 }}>
        <span className="label-gold">أفضل المقاولين</span>
        <div style={{ marginTop: "16px" }}>
          {contractors.map((c) => (
            <div key={c.rank} className={`rank-item ${c.active ? "active" : ""}`}>
              <div className="rank-number">{c.rank}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, margin: 0, color: c.active ? "white" : "#d1d5db" }}>
                  {c.active ? "شركة الرواف" : c.rank === 2 ? "مؤسسة نجد" : "المسار السريع"}
                </p>
                <p
                  style={{
                    fontSize: "0.625rem",
                    margin: "2px 0 0",
                    color: c.active ? "var(--rawaf-gold)" : "#6b7280",
                  }}
                >
                  نسبة الالتزام الفني: {c.compliance}
                </p>
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: c.active ? "#4ade80" : "white",
                }}
              >
                {c.price}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
