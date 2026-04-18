import logoImg from "@assets/image_1776506023654.png";

export default function WelcomeHero() {
  return (
    <div
      className="animate-fade-up"
      style={{
        maxWidth: "860px",
        margin: "40px auto 60px",
        padding: "0 24px",
        textAlign: "center",
      }}
    >
      {/* Logo circle */}
      <div
        style={{
          width: "110px", height: "110px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #fff 60%, #f5efe2 100%)",
          border: "3px solid rgba(197,160,89,0.35)",
          boxShadow: "0 12px 48px rgba(197,160,89,0.22), 0 4px 16px rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 32px",
          overflow: "hidden", padding: "12px",
        }}
      >
        <img
          src={logoImg}
          alt="شركة الرواف للمقاولات"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Gold divider line */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "32px", justifyContent: "center" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.4), transparent)", maxWidth: "200px" }} />
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px rgba(197,160,89,0.6)" }} />
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.4), transparent)", maxWidth: "200px" }} />
      </div>

      {/* Main welcome text */}
      <h2
        style={{
          fontSize: "clamp(1.3rem, 3vw, 1.85rem)",
          fontWeight: 800,
          color: "var(--charcoal)",
          lineHeight: 1.55,
          marginBottom: "20px",
          letterSpacing: "-0.01em",
        }}
      >
        نحو بناء مستقبل ريادي..
      </h2>

      <p
        style={{
          fontSize: "clamp(0.88rem, 1.8vw, 1.05rem)",
          color: "#5a524a",
          lineHeight: 1.9,
          marginBottom: "36px",
          fontWeight: 500,
          maxWidth: "680px",
          margin: "0 auto 36px",
        }}
      >
        إدارة المشتريات والعقود بشركة الرواف ترحب بكم في قاعدة بيانات المقاولين والموردين ومقدمي الخدمات،
        حيث تلتقي <span style={{ color: "var(--gold-dark)", fontWeight: 700 }}>الدقة في التنفيذ</span>{" "}
        مع <span style={{ color: "var(--gold-dark)", fontWeight: 700 }}>كفاءة الاختيار</span>{" "}
        لضمان أعلى معايير الجودة في مشاريعنا.
      </p>

      {/* Gold divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "36px", justifyContent: "center" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.4), transparent)", maxWidth: "200px" }} />
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px rgba(197,160,89,0.6)" }} />
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.4), transparent)", maxWidth: "200px" }} />
      </div>

      {/* Instruction prompt */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          background: "linear-gradient(135deg, rgba(197,160,89,0.08), rgba(197,160,89,0.03))",
          border: "1px solid rgba(197,160,89,0.25)",
          borderRadius: "40px",
          padding: "12px 28px",
          marginBottom: "48px",
        }}
      >
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)", animation: "pulse-gold 2s ease-in-out infinite", flexShrink: 0 }} />
        <span style={{ fontSize: "0.88rem", color: "var(--gold-dark)", fontWeight: 700 }}>
          ابدأ بالبحث الشامل في الحقل أعلاه لعرض المتخصصين
        </span>
      </div>

      {/* 3 feature cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {[
          {
            icon: "🔍",
            title: "البحث الذكي",
            desc: "ابحث بأي معيار: نوع العمل، المحفظة، المشروع أو اسم المقاول",
          },
          {
            icon: "📊",
            title: "مقارنة الأسعار",
            desc: "تحليل فوري لأفضل 5 عطاءات مرتبة تصاعدياً لضمان الاختيار الأمثل",
          },
          {
            icon: "📋",
            title: "سجل متكامل",
            desc: "قاعدة بيانات شاملة تربط المقاولين بمشاريعهم وتوصيفاتهم الفنية",
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              border: "1px solid rgba(197,160,89,0.15)",
              borderRadius: "14px",
              padding: "24px 20px",
              textAlign: "center",
              boxShadow: "0 4px 16px rgba(58,54,50,0.06)",
              transition: "transform 0.22s ease, box-shadow 0.22s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 30px rgba(197,160,89,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(58,54,50,0.06)";
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{card.icon}</div>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "8px" }}>{card.title}</h3>
            <p style={{ fontSize: "0.76rem", color: "#888", lineHeight: 1.7, margin: 0 }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
