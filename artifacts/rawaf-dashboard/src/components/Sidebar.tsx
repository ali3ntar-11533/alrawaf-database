const contractors = [
  { rank: 1, name: "شركة الرواف", fullName: "شركة الرواف للمقاولات", price: "4.5M", active: true, compliance: "99%", color: "var(--accent-green)" },
  { rank: 2, name: "مؤسسة نجد",  fullName: "مؤسسة نجد الحديثة",    price: "6.2M", active: false, compliance: "94%", color: "var(--text-secondary)" },
  { rank: 3, name: "المسار السريع", fullName: "شركة المسار السريع", price: "5.8M", active: false, compliance: "91%", color: "var(--text-secondary)" },
];

const registeredContractors = [
  { rank: 1, name: "شركة الرواف للمقاولات", price: "4.5M", active: true },
  { rank: 2, name: "مؤسسة نجد الحديثة",    price: "6.2M", active: false },
  { rank: 3, name: "شركة المسار السريع",   price: "5.8M", active: false },
];

export default function Sidebar() {
  return (
    <aside className="sidebar-stack animate-slide-in">

      {/* Technical Scope */}
      <div className="glass-card animate-fade-up" style={{ minHeight: "260px" }}>
        <span className="label-gold">نطاق التوصيف الفني للبند</span>
        <h3
          style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            color: "var(--charcoal)",
            marginBottom: "12px",
            lineHeight: 1.5,
          }}
        >
          بند أعمال الخرسانة والتشييد المسلح
        </h3>
        <div
          className="custom-scroll"
          style={{
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            lineHeight: 1.9,
            overflowY: "auto",
            paddingLeft: "4px",
            flex: 1,
          }}
        >
          <p style={{ marginBottom: "10px" }}>
            يشتمل هذا البند على تنفيذ وصب القواعد الخرسانية المسلحة والمياد والرقاب للمشروع وفقاً للمخططات المعتمدة وكود البناء السعودي.
          </p>
          <p style={{ marginBottom: "10px" }}>
            يتضمن النطاق توريد كافة المواد والعمالة المتخصصة والمعدات مع الالتزام التام باختبارات المختبر المعتمد.
          </p>
          <p style={{ fontStyle: "italic", color: "var(--gold-dark)", opacity: 0.7, fontSize: "0.72rem" }}>
            "سيتم إضافة المزيد من الشروط الفنية والملاحظات التفصيلية هنا..."
          </p>
        </div>
      </div>

      {/* Registered Contractors */}
      <div className="glass-card animate-fade-up stagger">
        <span className="label-gold">المقاولون المسجلون لهذا البند</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
          {registeredContractors.map((c) => (
            <div key={c.rank} className={`contractor-row ${c.active ? "active" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: c.active ? "var(--gold)" : "var(--card-border)",
                    color: c.active ? "#fff" : "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {c.rank}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: c.active ? 700 : 500,
                    color: c.active ? "var(--charcoal)" : "var(--text-secondary)",
                  }}
                >
                  {c.name}
                </span>
              </div>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--gold-dark)",
                  background: "rgba(197,160,89,0.1)",
                  padding: "2px 8px",
                  borderRadius: "5px",
                }}
              >
                {c.price}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Best Contractors Ranking */}
      <div className="glass-card animate-fade-up" style={{ flex: 1 }}>
        <span className="label-gold">أفضل المقاولين</span>
        <div>
          {contractors.map((c) => (
            <div key={c.rank} className={`rank-item ${c.active ? "active" : ""}`}>
              <div className="rank-number">{c.rank}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    margin: "0 0 2px",
                    color: c.active ? "var(--charcoal)" : "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </p>
                <p
                  style={{
                    fontSize: "0.65rem",
                    margin: 0,
                    color: c.active ? "var(--gold-dark)" : "var(--text-muted)",
                  }}
                >
                  نسبة الالتزام الفني: {c.compliance}
                </p>
              </div>
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  color: c.active ? "var(--accent-green)" : "var(--charcoal-mid)",
                  flexShrink: 0,
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
