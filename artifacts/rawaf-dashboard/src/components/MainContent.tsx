import { useEffect, useRef } from "react";
import { Building2, Mail, Phone } from "lucide-react";

const infoFields = [
  { label: "نوع الأعمال",  value: "إنشائي - خرسانات" },
  { label: "التصنيف",     value: "درجة أولى" },
  { label: "المشروع",     value: "نقل المياه الحلقي" },
  { label: "المحفظة",     value: "محفظة الرياض" },
];

const priceData = [
  { label: "السعر الأعلى",       value: 7.3, bg: "rgba(192,57,43,0.07)",  border: "rgba(192,57,43,0.5)",  text: "#c0392b", bold: false },
  { label: "السعر المتوسط",       value: 6.1, bg: "rgba(41,128,185,0.07)", border: "rgba(41,128,185,0.5)", text: "#2980b9", bold: false },
  { label: "سعر المقاول الحالي", value: 6.2, bg: "rgba(197,160,89,0.12)", border: "var(--gold)",           text: "var(--gold-dark)", bold: true, active: true },
  { label: "السعر الأدنى",        value: 4.9, bg: "rgba(39,174,96,0.07)",  border: "rgba(39,174,96,0.5)",  text: "#219a52",  bold: false },
];

const workHistory = [
  { project: "مشروع مياه الرياض",    work: "تمديدات الأنابيب الكبرى",   price: "2.1M ر.س", year: "2022" },
  { project: "مشروع توسعة الطرق",   work: "أعمال الخرسانة المسلحة",    price: "3.4M ر.س", year: "2023" },
  { project: "مجمع سكني النرجس",    work: "أعمال البنية التحتية",      price: "1.8M ر.س", year: "2021" },
  { project: "مشروع الطرق السريعة", work: "خرسانات مسلحة للجسور",     price: "4.2M ر.س", year: "2020" },
];

export default function MainContent() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let chartInstance: { destroy: () => void } | null = null;

    async function initChart() {
      if (!chartRef.current) return;
      try {
        const { Chart, registerables } = await import("chart.js");
        Chart.register(...registerables);
        const ctx = chartRef.current.getContext("2d");
        if (!ctx) return;

        chartInstance = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["الأعلى", "المتوسط", "الحالي", "الأدنى"],
            datasets: [{
              data: [7.3, 6.1, 6.2, 4.9],
              backgroundColor: ["rgba(192,57,43,0.75)", "rgba(41,128,185,0.75)", "#c5a059", "rgba(39,174,96,0.75)"],
              borderRadius: 8,
              barThickness: 28,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: "#9e9590", font: { size: 10, weight: "bold" as const, family: "Tajawal" } },
                border: { display: false },
              },
              y: { display: false },
            },
            animation: { duration: 900, easing: "easeOutQuart" },
          },
        } as Parameters<typeof Chart>[1]);
      } catch { /* ignore */ }
    }

    initChart();
    return () => { chartInstance?.destroy(); };
  }, []);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Contractor Info Card ── */}
      <div className="glass-card animate-fade-up">
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div
              style={{
                width: "54px",
                height: "54px",
                background: "linear-gradient(135deg, rgba(197,160,89,0.15), rgba(197,160,89,0.05))",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid rgba(197,160,89,0.3)",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(197,160,89,0.1)",
              }}
            >
              <Building2 size={22} color="var(--gold-dark)" />
            </div>

            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--charcoal)", margin: "0 0 6px" }}>
                مؤسسة نجد الحديثة للمقاولات
              </h2>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "0.65rem",
                    background: "rgba(197,160,89,0.1)",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    color: "var(--gold-dark)",
                    border: "1px solid rgba(197,160,89,0.3)",
                    fontWeight: 700,
                  }}
                >
                  عقد رقم: CN-2024-089
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    background: "var(--section-bg)",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  سعر البند الحالي: 6,200,000 ر.س
                </span>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(39,174,96,0.08)",
              border: "1px solid rgba(39,174,96,0.25)",
              borderRadius: "8px",
              padding: "6px 14px",
            }}
          >
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#27ae60",
                boxShadow: "0 0 6px rgba(39,174,96,0.6)",
              }}
            />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#219a52" }}>عقد نشط</span>
          </div>
        </div>

        {/* Fields grid */}
        <div
          className="stagger"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}
        >
          {infoFields.map((f) => (
            <div key={f.label} className="info-field animate-fade-up">
              <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {f.label}
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--charcoal)" }}>{f.value}</span>
            </div>
          ))}

          <div className="info-field animate-fade-up" style={{ gridColumn: "span 2" }}>
            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              البريد الإلكتروني
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <Mail size={13} color="var(--gold-dark)" />
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--charcoal)" }}>info@najd-con.sa</span>
            </div>
          </div>

          <div className="info-field animate-fade-up" style={{ gridColumn: "span 2" }}>
            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              رقم التواصل
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <Phone size={13} color="var(--gold-dark)" />
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--charcoal)", direction: "ltr" }}>055 123 4567</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Work History ── */}
      <div className="glass-card animate-fade-up">
        <span className="label-gold">سجل الأعمال المنفذة (تاريخية)</span>
        <div
          className="custom-scroll"
          style={{ display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "8px", marginTop: "4px" }}
        >
          {workHistory.map((item) => (
            <div key={item.project} className="history-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <p style={{ fontSize: "0.65rem", color: "var(--gold-dark)", fontWeight: 700, margin: 0 }}>
                  {item.project}
                </p>
                <span
                  style={{
                    fontSize: "0.6rem",
                    background: "rgba(197,160,89,0.1)",
                    color: "var(--gold-dark)",
                    padding: "1px 7px",
                    borderRadius: "10px",
                    fontWeight: 700,
                  }}
                >
                  {item.year}
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--charcoal)", margin: "0 0 12px" }}>
                {item.work}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--card-border)",
                  paddingTop: "10px",
                  fontSize: "0.68rem",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>سعر البند</span>
                <span style={{ color: "var(--charcoal)", fontWeight: 800 }}>{item.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Competitiveness Analysis ── */}
      <div className="glass-card animate-fade-up" style={{ flex: 1 }}>
        <span className="label-gold">تحليل التنافسية ومقارنة الأسعار</span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px",
            alignItems: "center",
            marginTop: "8px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {priceData.map((item) => (
              <div
                key={item.label}
                className="price-row"
                style={{
                  background: item.bg,
                  borderRightColor: item.border,
                  boxShadow: item.active ? "0 2px 10px rgba(197,160,89,0.15)" : "none",
                }}
              >
                <span style={{ fontSize: "0.72rem", color: item.text, fontWeight: item.bold ? 700 : 400 }}>
                  {item.label}
                </span>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: item.text }}>
                  {item.value}M
                </span>
              </div>
            ))}
          </div>

          <div style={{ height: "165px" }}>
            <canvas ref={chartRef} />
          </div>
        </div>
      </div>
    </main>
  );
}
