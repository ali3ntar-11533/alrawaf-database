import { Building2, Mail, Phone, FileText, Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import type { Contractor } from "@workspace/api-client-react";

interface Props {
  contractor: Contractor | null;
  allContractors: Contractor[];
  filteredContractors: Contractor[];
  isLoading: boolean;
  onSelectId: (id: number) => void;
}

const BAR_COLORS = ["#2baa74", "#c5a059", "#3b8fcc", "#e8851c", "#9b59b6", "#e74c3c"];

function formatPrice(p: number) {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(2)}M`;
  if (p >= 1_000)     return `${(p / 1_000).toFixed(0)}K`;
  return String(p);
}

function avg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export default function MainContent({ contractor, allContractors, filteredContractors, isLoading, onSelectId }: Props) {
  if (isLoading) {
    return (
      <main className="content-area">
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ background: "#fff", borderRadius: "16px", height: "140px", marginBottom: "16px", animation: "pulse-gold 1.5s ease-in-out infinite" }} />
        ))}
      </main>
    );
  }

  const allPrices = allContractors.map((c) => c.price);
  const maxPrice  = allPrices.length > 0 ? Math.max(...allPrices) : 1;
  const minPrice  = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const avgPrice  = avg(allPrices);

  const contractorWithMin = allContractors.find((c) => c.price === minPrice);
  const contractorWithMax = allContractors.find((c) => c.price === maxPrice);
  const avgContractor     = [...allContractors].sort((a, b) => Math.abs(a.price - avgPrice) - Math.abs(b.price - avgPrice))[0];

  // Chart: best 5 = lowest prices (sorted ascending)
  const chartSet = filteredContractors.length > 0 ? filteredContractors : allContractors;
  const best5    = [...chartSet].sort((a, b) => a.price - b.price).slice(0, 5);
  const chartMax = best5.length > 0 ? Math.max(...best5.map((c) => c.price)) : 1;

  // Work history: same project, different contractor
  const workHistory = allContractors
    .filter((c) => contractor && c.id !== contractor.id && c.project === contractor.project)
    .slice(0, 4);

  if (!contractor) {
    return (
      <main className="content-area">
        <div className="card animate-fade-up" style={{ textAlign: "center", padding: "50px 24px" }}>
          <Building2 size={52} style={{ color: "#ddd", margin: "0 auto 14px" }} />
          <p style={{ color: "#bbb", fontSize: "0.9rem" }}>اختر مقاولاً من القائمة الجانبية أو استخدم الفلاتر للبحث</p>
        </div>
      </main>
    );
  }

  return (
    <main className="content-area">

      {/* ── 1. بطاقة بيانات المقاول ── */}
      <div className="card animate-fade-up" style={{ marginBottom: "16px", padding: 0, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg, var(--charcoal) 0%, #2d2420 100%)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.58rem", color: "rgba(197,160,89,0.65)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "3px" }}>
              بيانات المقاول الرئيسية
            </div>
            <h2 style={{ fontSize: "0.98rem", fontWeight: 800, color: "#ffffff", lineHeight: 1.3, marginBottom: "5px" }}>
              {contractor.contractor}
            </h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.65rem", background: "rgba(197,160,89,0.18)", color: "var(--gold)", borderRadius: "20px", padding: "2px 10px", fontWeight: 700, border: "1px solid rgba(197,160,89,0.28)" }}>
                {contractor.workType}
              </span>
              <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)" }}>
                {contractor.contractNo}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "left", flexShrink: 0 }}>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.08em" }}>سعر البند</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--gold)", lineHeight: 1, direction: "ltr" }}>
              {(contractor.price / 1_000_000).toFixed(2)}M
            </div>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.35)" }}>ريال سعودي</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: "1px solid #f0ebe0" }}>
          {[
            { icon: <MapPin size={12} />,    label: "المحفظة",    value: contractor.portfolio },
            { icon: <Building2 size={12} />, label: "المشروع",    value: contractor.project },
            { icon: <Briefcase size={12} />, label: "نوع الأعمال", value: contractor.workType },
          ].map((item, i) => (
            <div
              key={i}
              style={{ padding: "12px 16px", borderLeft: i < 2 ? "1px solid #f0ebe0" : "none", transition: "background 0.18s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(197,160,89,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                <span style={{ color: "var(--gold)" }}>{item.icon}</span>
                <span style={{ fontSize: "0.55rem", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</span>
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--charcoal)" }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", background: "#faf8f4" }}>
          {[
            { icon: <Phone size={11} />, label: "رقم التواصل",       value: contractor.phone },
            { icon: <Mail size={11} />,  label: "البريد الإلكتروني", value: contractor.email },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, padding: "10px 16px", display: "flex", alignItems: "center", gap: "7px", borderLeft: i === 0 ? "1px solid #f0ebe0" : "none" }}>
              <span style={{ color: "var(--gold)", flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: "0.55rem", color: "#ccc", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--charcoal)" }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. نطاق التوصيف الفني للبند ── */}
      <div className="card animate-fade-up" style={{ marginBottom: "16px", animationDelay: "0.05s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", paddingBottom: "10px", borderBottom: "2px solid rgba(197,160,89,0.12)" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, var(--gold), #a88540)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={14} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "1px" }}>نطاق التوصيف الفني للبند</h3>
            <div style={{ fontSize: "0.58rem", color: "#bbb" }}>البيانات الفنية للمقاول المختار</div>
          </div>
        </div>

        {/* نوع العمل + الوحدة side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(197,160,89,0.07), rgba(197,160,89,0.02))", border: "1px solid rgba(197,160,89,0.2)", borderRadius: "9px", padding: "12px 14px" }}>
            <div style={{ fontSize: "0.55rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>نوع العمل</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--charcoal)" }}>
              {(contractor as any).workCategory || contractor.workType}
            </div>
          </div>
          <div style={{ background: "linear-gradient(135deg, rgba(58,54,50,0.04), rgba(58,54,50,0.01))", border: "1px solid rgba(58,54,50,0.1)", borderRadius: "9px", padding: "12px 14px" }}>
            <div style={{ fontSize: "0.55rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>الوحدة</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--charcoal)" }}>
              {(contractor as any).unit || "—"}
            </div>
          </div>
        </div>

        {/* الوصف الفني للبند */}
        <div>
          <div style={{ fontSize: "0.55rem", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "7px", fontWeight: 700 }}>الوصف الفني للبند</div>
          <p style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.8, margin: 0, background: "#f9f7f3", borderRadius: "9px", padding: "12px 14px", borderRight: "3px solid var(--gold)" }}>
            {(contractor as any).workScopeText || (contractor as any).workDescription ||
              "يشتمل هذا البند على تنفيذ الأعمال الفنية وفقاً للمواصفات والمخططات المعتمدة ومتطلبات الجهة المالكة."}
          </p>
        </div>
      </div>

      {/* ── 3. سجل الأعمال المنفذة سابقاً — same project ── */}
      {workHistory.length > 0 && (
        <div className="card animate-fade-up" style={{ marginBottom: "16px", animationDelay: "0.1s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <Clock size={14} style={{ color: "var(--gold)" }} />
              <h3 style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--charcoal)" }}>سجل الأعمال المنفذة سابقاً</h3>
            </div>
            <span style={{ fontSize: "0.6rem", color: "#bbb", background: "#f5f0e8", borderRadius: "4px", padding: "2px 7px" }}>
              مشاريع مشتركة: {contractor.project}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {workHistory.map((w, i) => (
              <div
                key={w.id}
                onClick={() => onSelectId(w.id)}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", borderRadius: "9px", background: i % 2 === 0 ? "#faf8f4" : "#fff", border: "1px solid #f0ebe0", cursor: "pointer", transition: "transform 0.18s ease, box-shadow 0.18s ease" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
              >
                <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: `${BAR_COLORS[i % BAR_COLORS.length]}18`, border: `1.5px solid ${BAR_COLORS[i % BAR_COLORS.length]}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Building2 size={15} style={{ color: BAR_COLORS[i % BAR_COLORS.length] }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--charcoal)", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {w.contractor}
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.62rem", color: "#aaa" }}>{w.technicalScope}</span>
                    <span style={{ fontSize: "0.62rem", color: "#ddd" }}>•</span>
                    <span style={{ fontSize: "0.62rem", color: "#aaa" }}>{w.workType}</span>
                  </div>
                </div>
                <div style={{ textAlign: "left", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: BAR_COLORS[i % BAR_COLORS.length] }}>
                    {formatPrice(w.price)} ر.س
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. أفضل 5 أسعار (sorted ascending = lowest = best) ── */}
      {best5.length > 0 && (
        <div className="card animate-fade-up" style={{ marginBottom: "16px", animationDelay: "0.15s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--charcoal)", display: "flex", alignItems: "center", gap: "7px" }}>
              <DollarSign size={13} style={{ color: "var(--gold)" }} />
              مقارنة أسعار العطاءات
            </h3>
            <span style={{ fontSize: "0.62rem", color: "#bbb", background: "#f5f0e8", borderRadius: "4px", padding: "2px 7px" }}>
              أفضل {best5.length} أسعار
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {best5.map((c, i) => {
              const isCurrent = contractor && c.id === contractor.id;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectId(c.id)}
                  style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer" }}
                  title={`اضغط لعرض بيانات ${c.contractor}`}
                >
                  <div style={{ width: "120px", fontSize: "0.7rem", color: isCurrent ? "var(--gold)" : "var(--charcoal)", textAlign: "right", fontWeight: isCurrent ? 800 : 600, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.contractor}
                  </div>
                  <div style={{ flex: 1, background: "#f5f0e8", borderRadius: "5px", overflow: "hidden", height: "19px" }}>
                    <div
                      style={{
                        width: `${(c.price / chartMax) * 100}%`, height: "100%",
                        background: isCurrent
                          ? "linear-gradient(90deg, var(--gold), #e8c870)"
                          : i === 0 ? "linear-gradient(90deg, #2baa74, #36c786)" : BAR_COLORS[i % BAR_COLORS.length],
                        borderRadius: "5px", transition: "width 0.8s ease",
                        display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "6px",
                        boxShadow: isCurrent ? "0 0 8px rgba(197,160,89,0.35)" : i === 0 ? "0 0 8px rgba(43,170,116,0.3)" : "none",
                      }}
                    >
                      <span style={{ fontSize: "0.58rem", color: "#fff", fontWeight: 700 }}>{formatPrice(c.price)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.6rem", color: "#bbb", textAlign: "center" }}>
            مرتبة تصاعدياً • الأفضل سعراً يظهر أولاً • اضغط على أي مقاول لعرض بياناته
          </div>
        </div>
      )}

      {/* ── 5. Footer Stats: current → min → avg → max ── */}
      {allPrices.length > 0 && (
        <div
          className="animate-fade-up"
          style={{
            borderRadius: "14px", animationDelay: "0.2s",
            background: "linear-gradient(135deg, var(--charcoal) 0%, #2d2420 100%)",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(30,25,20,0.18)",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          {/* 4 clickable price stats: current → min → avg → max */}
            {[
              {
                label: "سعر المقاول الحالي",
                value: formatPrice(contractor.price),
                color: "var(--gold)",
                sub: contractor.contractor,
                highlight: true,
                id: contractor.id,
              },
              {
                label: "السعر الأدنى",
                value: formatPrice(minPrice),
                color: "#2baa74",
                sub: contractorWithMin?.contractor ?? "—",
                id: contractorWithMin?.id,
              },
              {
                label: "السعر المتوسط",
                value: formatPrice(Math.round(avgPrice)),
                color: "#3b8fcc",
                sub: avgContractor?.contractor ?? "—",
                id: avgContractor?.id,
              },
              {
                label: "السعر الأعلى",
                value: formatPrice(maxPrice),
                color: "#e74c3c",
                sub: contractorWithMax?.contractor ?? "—",
                id: contractorWithMax?.id,
              },
            ].map((stat, i) => (
              <div
                key={i}
                onClick={() => stat.id != null && onSelectId(stat.id)}
                style={{
                  padding: "16px 12px", textAlign: "center",
                  borderLeft: "1px solid rgba(255,255,255,0.06)",
                  position: "relative",
                  background: stat.highlight ? "rgba(197,160,89,0.06)" : "transparent",
                  cursor: stat.id != null ? "pointer" : "default",
                  transition: "background 0.18s",
                }}
                onMouseEnter={(e) => stat.id != null && ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.background = stat.highlight ? "rgba(197,160,89,0.06)" : "transparent"}
                title={stat.id != null ? `اضغط لعرض بيانات ${stat.sub}` : undefined}
              >
                <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: "4px", direction: "ltr" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 4px" }}>
                  {stat.sub}
                </div>
              </div>
            ))}
        </div>
      )}
    </main>
  );
}
