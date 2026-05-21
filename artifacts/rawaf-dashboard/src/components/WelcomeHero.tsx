import logoImg from "@assets/logo_1776506524686.jpg";

export default function WelcomeHero() {
  return (
    <div
      className="animate-fade-up"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        textAlign: "center",
        maxWidth: "860px",
        margin: "0 auto",
        gap: "clamp(10px, 2vh, 28px)",
      }}
    >
      {/* Logo circle */}
      <div
        style={{
          width: "clamp(85px, 11vh, 130px)",
          height: "clamp(85px, 11vh, 130px)",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #fff 60%, #f5efe2 100%)",
          border: "3px solid rgba(197,160,89,0.35)",
          boxShadow: "0 12px 48px rgba(197,160,89,0.22), 0 4px 16px rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", padding: "12px",
          flexShrink: 0,
        }}
      >
        <img
          src={logoImg}
          alt="شركة الرواف للمقاولات"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Gold divider line */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", width: "100%", justifyContent: "center" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.4), transparent)", maxWidth: "200px" }} />
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px rgba(197,160,89,0.6)", flexShrink: 0 }} />
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.4), transparent)", maxWidth: "200px" }} />
      </div>

      {/* Main welcome text */}
      <h2
        style={{
          fontSize: "clamp(1.3rem, 3vh, 2.1rem)",
          fontWeight: 800,
          color: "var(--charcoal)",
          lineHeight: 1.4,
          letterSpacing: "-0.01em",
          margin: 0,
        }}
      >
        نحو بناء مستقبل ريادي..
      </h2>

      <p
        style={{
          fontSize: "clamp(0.82rem, 1.6vh, 1.05rem)",
          color: "#5a524a",
          lineHeight: 1.8,
          fontWeight: 500,
          maxWidth: "680px",
          margin: 0,
        }}
      >
        إدارة المشتريات والعقود بشركة الرواف ترحب بكم في قاعدة بيانات المقاولين والموردين ومقدمي الخدمات،
        حيث تلتقي <span style={{ color: "var(--gold-dark)", fontWeight: 700 }}>الدقة في التنفيذ</span>{" "}
        مع <span style={{ color: "var(--gold-dark)", fontWeight: 700 }}>كفاءة الاختيار</span>{" "}
        لضمان أعلى معايير الجودة في مشاريعنا.
      </p>

      {/* Gold divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", width: "100%", justifyContent: "center" }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.4), transparent)", maxWidth: "200px" }} />
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px rgba(197,160,89,0.6)", flexShrink: 0 }} />
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
          padding: "clamp(8px, 1.2vh, 12px) 28px",
        }}
      >
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)", animation: "pulse-gold 2s ease-in-out infinite", flexShrink: 0 }} />
        <span style={{ fontSize: "clamp(0.8rem, 1.4vh, 0.93rem)", color: "var(--gold-dark)", fontWeight: 700 }}>
          ابدأ بالبحث الشامل في الحقل أعلاه لعرض المتخصصين
        </span>
      </div>

      {/* 3 feature cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(8px, 1.5vh, 16px)", width: "100%" }}>
        {[
          {
            icon: "🔍",
            title: "البحث الذكي",
            desc: "ابحث بأي معيار: نوع التعاقد، المحفظة، المشروع أو اسم المقاول",
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
              padding: "clamp(14px, 2vh, 24px) 20px",
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
            <div style={{ fontSize: "clamp(1.3rem, 2.5vh, 2rem)", marginBottom: "clamp(6px, 1vh, 12px)" }}>{card.icon}</div>
            <h3 style={{ fontSize: "clamp(0.72rem, 1.2vh, 0.85rem)", fontWeight: 800, color: "var(--charcoal)", marginBottom: "clamp(4px, 0.8vh, 8px)" }}>{card.title}</h3>
            <p style={{ fontSize: "clamp(0.65rem, 1.1vh, 0.76rem)", color: "#888", lineHeight: 1.6, margin: 0 }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
