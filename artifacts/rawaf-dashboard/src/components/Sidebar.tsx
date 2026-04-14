import type { Contractor } from "@workspace/api-client-react";

interface Props {
  contractors: Contractor[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
}

const WORK_TYPE_COLOR: Record<string, string> = {
  "إنشائي": "#c5a059",
  "تشطيبات": "#3b8fcc",
  "كهربائي": "#e8851c",
  "ميكانيكي": "#2baa74",
  "صيانة": "#9b59b6",
};

export default function Sidebar({ contractors, selectedId, onSelect, isLoading }: Props) {
  const top = [...contractors].sort((a, b) => b.price - a.price).slice(0, 6);

  if (isLoading) {
    return (
      <aside className="sidebar animate-fade">
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ background: "#f5f0e8", borderRadius: "10px", height: "70px", marginBottom: "10px" }} />
        ))}
      </aside>
    );
  }

  return (
    <aside className="sidebar animate-slide-in">
      <h3
        style={{
          fontSize: "0.75rem", fontWeight: 700, color: "var(--gold)",
          textTransform: "uppercase", letterSpacing: "0.12em",
          borderBottom: "1px solid rgba(197,160,89,0.2)",
          paddingBottom: "8px", marginBottom: "12px",
        }}
      >
        أعلى المقاولين
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {top.map((c, i) => {
          const isSelected = c.id === selectedId;
          const color = WORK_TYPE_COLOR[c.workType] ?? "#c5a059";
          return (
            <div
              key={c.id}
              className={`rank-item${isSelected ? " active" : ""}`}
              onClick={() => onSelect(c.id)}
              style={{ cursor: "pointer", borderRight: `3px solid ${isSelected ? color : "transparent"}`, transition: "all 0.2s ease" }}
            >
              <div
                style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: isSelected ? color : "#f2ede6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: "0.72rem",
                  color: isSelected ? "#fff" : color,
                  flexShrink: 0, transition: "all 0.2s",
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--charcoal)", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.contractor}
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.65rem", color: "#888", background: "#f5f0e8", borderRadius: "4px", padding: "1px 5px" }}>
                    {c.workType}
                  </span>
                  <span style={{ fontSize: "0.65rem", color, fontWeight: 700 }}>
                    {(c.price / 1_000_000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {contractors.length === 0 && (
        <div style={{ textAlign: "center", color: "#aaa", padding: "24px 0", fontSize: "0.82rem" }}>
          لا توجد بيانات بعد
        </div>
      )}

      {contractors.length > 0 && (
        <div style={{ marginTop: "20px", borderRadius: "10px", background: "linear-gradient(135deg, var(--charcoal) 0%, #2d2420 100%)", padding: "14px", color: "#fff" }}>
          <div style={{ fontSize: "0.65rem", color: "rgba(197,160,89,0.8)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
            إجمالي المقاولين
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>
            {contractors.length}
          </div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
            إجمالي العقود:{" "}
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>
              {(contractors.reduce((s, c) => s + c.price, 0) / 1_000_000).toFixed(1)}M
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
