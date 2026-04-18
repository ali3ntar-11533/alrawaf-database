import type { Contractor } from "@workspace/api-client-react";

interface Props {
  filtered: Contractor[];
  allContractors: Contractor[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
  hasFilter: boolean;
}

const WORK_TYPE_COLOR: Record<string, string> = {
  "إنشائي":   "#c5a059",
  "تشطيبات":  "#3b8fcc",
  "كهربائي":  "#e8851c",
  "ميكانيكي": "#2baa74",
  "صيانة":    "#9b59b6",
};

const TYPE_ICON: Record<string, string> = {
  "إنشائي":   "🏗",
  "تشطيبات":  "🎨",
  "كهربائي":  "⚡",
  "ميكانيكي": "⚙️",
  "صيانة":    "🔧",
};

function formatPrice(value: number): string {
  if (value == null || value === 0) return "—";
  return value.toLocaleString("en");
}

export default function Sidebar({
  filtered,
  allContractors,
  selectedId,
  onSelect,
  isLoading,
  hasFilter,
}: Props) {
  if (isLoading) {
    return (
      <aside className="sidebar animate-fade">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{ background: "#f5f0e8", borderRadius: "10px", height: "66px", marginBottom: "8px" }} />
        ))}
      </aside>
    );
  }

  return (
    <aside
      className="sidebar animate-slide-in"
      style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}
    >
      {/* Section Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "2px solid rgba(197,160,89,0.25)", flexShrink: 0 }}>
        <div style={{ fontSize: "0.62rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: "3px" }}>
          المتخصصون بالأعمال المطلوبة
        </div>
        {hasFilter ? (
          <div style={{ fontSize: "0.68rem", color: "#bbb" }}>
            {filtered.length} جهة مطابقة
          </div>
        ) : (
          <div style={{ fontSize: "0.68rem", color: "#aaa" }}>
            ابحث لعرض المتخصصين المرتبطين
          </div>
        )}
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", scrollbarWidth: "thin", scrollbarColor: "rgba(197,160,89,0.3) transparent" }}>
        {!hasFilter ? (
          /* Empty state — no filter applied yet */
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px", opacity: 0.35 }}>🔍</div>
            <p style={{ fontSize: "0.75rem", color: "#ccc", lineHeight: 1.7, margin: 0 }}>
              استخدم فلتر "نوع الأعمال" أو أي بحث آخر لعرض المتخصصين المرتبطين بالعمل المطلوب
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#ccc", padding: "28px 0", fontSize: "0.8rem" }}>
            لا توجد نتائج مطابقة
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {filtered.map((c, i) => {
              const isSelected = c.id === selectedId;
              const color = WORK_TYPE_COLOR[c.workType] ?? "#c5a059";
              const icon = TYPE_ICON[c.workType] ?? "🏢";
              return (
                <div
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "9px 12px", borderRadius: "10px",
                    background: isSelected ? `linear-gradient(135deg, ${color}18, ${color}08)` : i % 2 === 0 ? "#fff" : "#faf8f4",
                    border: isSelected ? `1.5px solid ${color}40` : "1px solid #f0ebe0",
                    cursor: "pointer", transition: "all 0.18s ease",
                    boxShadow: isSelected ? `0 2px 12px ${color}20` : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLDivElement).style.background = `${color}0a`;
                      (e.currentTarget as HTMLDivElement).style.transform = "translateX(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? "#fff" : "#faf8f4";
                      (e.currentTarget as HTMLDivElement).style.transform = "";
                    }
                  }}
                >
                  <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: isSelected ? color : `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, color: isSelected ? "#fff" : color, flexShrink: 0, transition: "all 0.18s" }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.76rem", color: "var(--charcoal)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "3px" }}>
                      {c.contractor}
                    </div>
                    <div style={{ display: "flex", gap: "5px", alignItems: "center", minWidth: 0 }}>
                      {(() => {
                        const activity = (c as any).mainActivity as string | null | undefined;
                        const label = activity?.trim() || c.workType || "—";
                        return (
                          <span
                            title={label}
                            style={{
                              fontSize: "0.6rem", color: "#888", background: "#f0ebe0",
                              borderRadius: "4px", padding: "1px 5px",
                              maxWidth: "120px", overflow: "hidden",
                              whiteSpace: "nowrap", textOverflow: "ellipsis",
                              display: "inline-block", flexShrink: 1,
                            }}
                          >
                            {icon} {label}
                          </span>
                        );
                      })()}
                      <span style={{ fontSize: "0.6rem", color: "#bbb", whiteSpace: "nowrap", flexShrink: 0 }}>{c.portfolio}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "left", flexShrink: 0 }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 800, color, direction: "ltr" }}>
                      {formatPrice(c.price)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom summary — only when there are results */}
      {hasFilter && filtered.length > 0 && (
        <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(197,160,89,0.15)", background: "#faf8f4", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.62rem", color: "#aaa" }}>{filtered.length} متخصص</span>
          <span style={{ fontSize: "0.62rem", color: "var(--gold)", fontWeight: 700 }}>
            {formatPrice(filtered.reduce((s, c) => s + c.price, 0))}
          </span>
        </div>
      )}
    </aside>
  );
}
