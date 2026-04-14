import { useEffect, useRef } from "react";
import { Building2 } from "lucide-react";

const infoFields = [
  { label: "نوع الأعمال", value: "إنشائي - خرسانات" },
  { label: "التصنيف", value: "درجة أولى" },
  { label: "المشروع", value: "نقل المياه الحلقي" },
  { label: "المحفظة", value: "محفظة الرياض" },
];

const priceData = [
  { label: "السعر الأعلى", value: 7.3, color: "rgba(239,68,68,0.4)", borderColor: "rgba(239,68,68,0.4)", textColor: "white" },
  { label: "السعر المتوسط", value: 6.1, color: "rgba(59,130,246,0.15)", borderColor: "rgba(59,130,246,0.4)", textColor: "white" },
  { label: "سعر المقاول الحالي", value: 6.2, color: "rgba(197,160,89,0.15)", borderColor: "var(--rawaf-gold)", textColor: "var(--rawaf-gold)", active: true },
  { label: "السعر الأدنى", value: 4.9, color: "rgba(34,197,94,0.05)", borderColor: "rgba(34,197,94,0.4)", textColor: "#4ade80" },
];

export default function MainContent() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let chartInstance: unknown = null;

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
            datasets: [
              {
                data: [7.3, 6.1, 6.2, 4.9],
                backgroundColor: (c: { dataIndex: number }) =>
                  c.dataIndex === 2 ? "#c5a059" : "#334155",
                borderRadius: 6,
                barThickness: 30,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  color: "#94a3b8",
                  font: { size: 10, weight: "bold" as const },
                },
              },
              y: { display: false },
            },
          },
        } as Parameters<typeof Chart>[1]);
      } catch {
      }
    }

    initChart();

    return () => {
      if (chartInstance && typeof (chartInstance as { destroy?: () => void }).destroy === "function") {
        (chartInstance as { destroy: () => void }).destroy();
      }
    };
  }, []);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Contractor info card */}
      <div className="glass-card" style={{ minHeight: "250px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                background: "rgba(197,160,89,0.15)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(197,160,89,0.3)",
                flexShrink: 0,
              }}
            >
              <Building2 size={22} color="var(--rawaf-gold)" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "white", margin: 0 }}>
                مؤسسة نجد الحديثة للمقاولات
              </h2>
              <div style={{ display: "flex", gap: "12px", marginTop: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "0.625rem",
                    background: "rgba(255,255,255,0.05)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    color: "var(--rawaf-gold)",
                    border: "1px solid rgba(197,160,89,0.2)",
                  }}
                >
                  عقد رقم: CN-2024-089
                </span>
                <span
                  style={{
                    fontSize: "0.625rem",
                    background: "rgba(255,255,255,0.05)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    color: "#94a3b8",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  سعر البند الحالي: 6,200,000 ر.س
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {infoFields.map((field) => (
            <div
              key={field.label}
              style={{
                background: "rgba(0,0,0,0.25)",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span style={{ fontSize: "0.5625rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                {field.label}
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e5e7eb" }}>{field.value}</span>
            </div>
          ))}

          <div
            style={{
              background: "rgba(0,0,0,0.25)",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.05)",
              gridColumn: "span 2",
            }}
          >
            <span style={{ fontSize: "0.5625rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>
              البريد الإلكتروني
            </span>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e5e7eb" }}>info@najd-con.sa</span>
          </div>
          <div
            style={{
              background: "rgba(0,0,0,0.25)",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.05)",
              gridColumn: "span 2",
            }}
          >
            <span style={{ fontSize: "0.5625rem", color: "#6b7280", display: "block", marginBottom: "4px" }}>
              رقم التواصل
            </span>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e5e7eb" }}>055 123 4567</span>
          </div>
        </div>
      </div>

      {/* Work history */}
      <div className="glass-card" style={{ minHeight: "180px" }}>
        <span className="label-gold">سجل الأعمال المنفذة (تاريخية)</span>
        <div
          className="custom-scroll"
          style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "16px", marginTop: "8px" }}
        >
          {[
            { project: "مشروع مياه الرياض", work: "تمديدات الأنابيب الكبرى", price: "2.1M ر.س" },
            { project: "مشروع توسعة الطرق", work: "أعمال الخرسانة المسلحة", price: "3.4M ر.س" },
            { project: "مجمع سكني النرجس", work: "أعمال البنية التحتية", price: "1.8M ر.س" },
          ].map((item) => (
            <div
              key={item.project}
              style={{
                minWidth: "280px",
                background: "rgba(0,0,0,0.4)",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid rgba(100,116,139,0.5)",
              }}
            >
              <p style={{ fontSize: "0.625rem", color: "var(--rawaf-gold)", fontWeight: 700, margin: "0 0 4px" }}>
                {item.project}
              </p>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "12px", color: "white", margin: "4px 0 12px" }}>
                {item.work}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  paddingTop: "8px",
                  fontSize: "0.625rem",
                }}
              >
                <span style={{ color: "#6b7280" }}>سعر البند:</span>
                <span style={{ color: "white", fontWeight: 700 }}>{item.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Competitiveness analysis */}
      <div className="glass-card" style={{ flex: 1 }}>
        <span className="label-gold">تحليل التنافسية ومقارنة الأسعار</span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            alignItems: "center",
            marginTop: "8px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {priceData.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px",
                  background: item.color,
                  borderRadius: "6px",
                  borderRight: `2px solid ${item.borderColor}`,
                  boxShadow: item.active ? "0 4px 12px rgba(197,160,89,0.15)" : "none",
                }}
              >
                <span style={{ fontSize: "0.6875rem", color: item.textColor, fontWeight: item.active ? 700 : 400 }}>
                  {item.label}
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: item.textColor }}>
                  {item.value}M
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: "160px" }}>
            <canvas ref={chartRef} />
          </div>
        </div>
      </div>
    </main>
  );
}
