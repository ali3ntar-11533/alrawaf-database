import { Building2, Mail, Phone, FileText, Briefcase, MapPin, DollarSign, Clock, ChevronLeft } from "lucide-react";
import type { Contractor } from "@workspace/api-client-react";

interface Props {
  contractor: Contractor | null;
  allContractors: Contractor[];
  isLoading: boolean;
}

const BAR_COLORS = ["#c5a059", "#3b8fcc", "#2baa74", "#e8851c", "#9b59b6", "#e74c3c"];

function formatPrice(p: number) {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000) return `${(p / 1_000).toFixed(0)}K`;
  return String(p);
}

function avg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

const DEFAULT_DESCRIPTION =
  "يشتمل هذا البند على تنفيذ وصب القواعد الخرسانية والأعمدة والجوائز والأسقف وفقاً للمواصفات الفنية وبما يتوافق مع الكود السعودي للإنشاءات والمخططات المعتمدة من الجهة المالكة.";

const DEFAULT_SCOPE =
  "يتضمن النطاق توريد كافة المواد والعمالة والمعدات اللازمة لتنفيذ الأعمال وفق المخططات المعتمدة، ومتطلبات المشروع، وإجراء الاختبارات والفحوصات المطلوبة حتى القبول النهائي.";

export default function MainContent({ contractor, allContractors, isLoading }: Props) {
  if (isLoading) {
    return (
      <main className="content-area">
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ background: "#fff", borderRadius: "16px", height: "140px", marginBottom: "16px", animation: "pulse-gold 1.5s ease-in-out infinite" }} />
        ))}
      </main>
    );
  }

  const prices = allContractors.map((c) => c.price);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 1;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const avgPrice = avg(prices);
  const top5 = [...allContractors].sort((a, b) => b.price - a.price).slice(0, 5);

  // Related work history: other contractors in same portfolio (excluding selected)
  const relatedWork = allContractors
    .filter((c) => contractor && c.id !== contractor.id && c.portfolio === contractor.portfolio)
    .slice(0, 3);
  // If not enough, fill from any others
  const extra = allContractors.filter(
    (c) => contractor && c.id !== contractor.id && !relatedWork.some((r) => r.id === c.id)
  );
  const workHistory = [...relatedWork, ...extra].slice(0, 3);

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

      {/* ── 1. بطاقة بيانات المقاول الرئيسية ── */}
      <div
        className="card animate-fade-up"
        style={{ marginBottom: "18px", padding: 0, overflow: "hidden" }}
      >
        {/* Header band */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--charcoal) 0%, #2d2420 100%)",
            padding: "18px 22px",
            display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.62rem", color: "rgba(197,160,89,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
              بيانات المقاول الرئيسية
            </div>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#ffffff", lineHeight: 1.3, marginBottom: "6px" }}>
              {contractor.contractor}
            </h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.68rem", background: "rgba(197,160,89,0.2)", color: "var(--gold)", borderRadius: "20px", padding: "2px 10px", fontWeight: 700, border: "1px solid rgba(197,160,89,0.3)" }}>
                {contractor.workType}
              </span>
              <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>
                {contractor.contractNo}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "left", flexShrink: 0 }}>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>سعر البند</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--gold)", lineHeight: 1, direction: "ltr" }}>
              {(contractor.price / 1_000_000).toFixed(2)}M
            </div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>ريال سعودي</div>
          </div>
        </div>

        {/* Middle grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderBottom: "1px solid #f0ebe0" }}>
          {[
            { icon: <MapPin size={13} />, label: "المحفظة", value: contractor.portfolio },
            { icon: <Building2 size={13} />, label: "المشروع", value: contractor.project },
            { icon: <Briefcase size={13} />, label: "نوع الأعمال", value: contractor.workType },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: "14px 18px",
                borderLeft: i < 2 ? "1px solid #f0ebe0" : "none",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(197,160,89,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                <span style={{ color: "var(--gold)" }}>{item.icon}</span>
                <span style={{ fontSize: "0.58rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</span>
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--charcoal)" }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Bottom strip: phone + email */}
        <div
          style={{
            display: "flex", gap: 0, background: "#faf8f4",
          }}
        >
          {[
            { icon: <Phone size={12} />, label: "رقم التواصل", value: contractor.phone },
            { icon: <Mail size={12} />, label: "البريد الإلكتروني", value: contractor.email },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                flex: 1, padding: "11px 18px",
                display: "flex", alignItems: "center", gap: "8px",
                borderLeft: i === 0 ? "1px solid #f0ebe0" : "none",
                direction: "rtl",
              }}
            >
              <span style={{ color: "var(--gold)", flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: "0.58rem", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal)" }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. نطاق التوصيف الفني للبند ── */}
      <div
        className="card animate-fade-up"
        style={{ marginBottom: "18px", animationDelay: "0.05s" }}
      >
        {/* Section header */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            marginBottom: "14px", paddingBottom: "12px",
            borderBottom: "2px solid rgba(197,160,89,0.15)",
          }}
        >
          <div
            style={{
              width: "34px", height: "34px", borderRadius: "9px",
              background: "linear-gradient(135deg, var(--gold), #a88540)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FileText size={15} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "1px" }}>
              نطاق التوصيف الفني للبند
            </h3>
            <div style={{ fontSize: "0.62rem", color: "#aaa" }}>البيانات الفنية للمقاول المختار</div>
          </div>
        </div>

        {/* Inner title */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(197,160,89,0.08) 0%, rgba(197,160,89,0.03) 100%)",
            border: "1px solid rgba(197,160,89,0.2)",
            borderRadius: "10px", padding: "12px 16px", marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "0.62rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>
            عنوان البند
          </div>
          <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--charcoal)" }}>
            {contractor.technicalScope}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "0.62rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>
            الوصف الفني
          </div>
          <p style={{ fontSize: "0.8rem", color: "#555", lineHeight: 1.75, margin: 0, fontWeight: 400 }}>
            {(contractor as any).workDescription || DEFAULT_DESCRIPTION}
          </p>
        </div>

        {/* Scope text */}
        <div
          style={{
            background: "#f9f7f3", borderRadius: "10px", padding: "12px 16px",
            borderRight: "3px solid var(--gold)",
          }}
        >
          <div style={{ fontSize: "0.62rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
            نطاق الأعمال
          </div>
          <p style={{ fontSize: "0.78rem", color: "#666", lineHeight: 1.7, margin: 0 }}>
            {(contractor as any).workScopeText || DEFAULT_SCOPE}
          </p>
        </div>
      </div>

      {/* ── 3. سجل الأعمال المنفذة (تاريخية) ── */}
      {workHistory.length > 0 && (
        <div
          className="card animate-fade-up"
          style={{ marginBottom: "18px", animationDelay: "0.1s" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={15} style={{ color: "var(--gold)" }} />
              <h3 style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--charcoal)" }}>
                سجل الأعمال المنفذة
              </h3>
            </div>
            <span style={{ fontSize: "0.62rem", color: "#bbb", background: "#f5f0e8", borderRadius: "4px", padding: "2px 8px" }}>
              مشاريع ذات صلة
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {workHistory.map((w, i) => (
              <div
                key={w.id}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "12px 16px", borderRadius: "10px",
                  background: i % 2 === 0 ? "#faf8f4" : "#fff",
                  border: "1px solid #f0ebe0",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.07)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                }}
              >
                <div
                  style={{
                    width: "36px", height: "36px", borderRadius: "9px",
                    background: `linear-gradient(135deg, ${BAR_COLORS[i % BAR_COLORS.length]}20, ${BAR_COLORS[i % BAR_COLORS.length]}10)`,
                    border: `1.5px solid ${BAR_COLORS[i % BAR_COLORS.length]}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Building2 size={16} style={{ color: BAR_COLORS[i % BAR_COLORS.length] }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--charcoal)", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {w.project} — {w.technicalScope}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.65rem", color: "#999" }}>{w.portfolio}</span>
                    <span style={{ fontSize: "0.65rem", color: "#ccc" }}>•</span>
                    <span style={{ fontSize: "0.65rem", color: "#999" }}>{w.contractor}</span>
                  </div>
                </div>
                <div style={{ textAlign: "left", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: BAR_COLORS[i % BAR_COLORS.length] }}>
                    {formatPrice(w.price)} ر.س
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "3px", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: "0.6rem", color: "#bbb" }}>{w.workType}</span>
                    <ChevronLeft size={10} style={{ color: "#ddd" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. مقارنة أسعار العطاءات ── */}
      {top5.length > 0 && (
        <div className="card animate-fade-up" style={{ marginBottom: "18px", animationDelay: "0.15s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--charcoal)", display: "flex", alignItems: "center", gap: "8px" }}>
              <DollarSign size={14} style={{ color: "var(--gold)" }} />
              مقارنة أسعار العطاءات
            </h3>
            <span style={{ fontSize: "0.65rem", color: "#aaa", background: "#f5f0e8", borderRadius: "4px", padding: "3px 8px" }}>
              أعلى {top5.length} مقاولين
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {top5.map((c, i) => {
              const isCurrent = contractor && c.id === contractor.id;
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "130px", fontSize: "0.72rem", color: isCurrent ? "var(--gold)" : "var(--charcoal)", textAlign: "right", fontWeight: isCurrent ? 800 : 600, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.contractor}
                  </div>
                  <div style={{ flex: 1, background: "#f5f0e8", borderRadius: "6px", overflow: "hidden", height: "20px" }}>
                    <div
                      style={{
                        width: `${(c.price / maxPrice) * 100}%`,
                        height: "100%",
                        background: isCurrent
                          ? "linear-gradient(90deg, var(--gold), #e8c870)"
                          : BAR_COLORS[i % BAR_COLORS.length],
                        borderRadius: "6px",
                        transition: "width 0.8s ease",
                        display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "6px",
                        boxShadow: isCurrent ? "0 0 10px rgba(197,160,89,0.4)" : "none",
                      }}
                    >
                      <span style={{ fontSize: "0.6rem", color: "#fff", fontWeight: 700 }}>{formatPrice(c.price)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. Footer / Summary Stats Bar ── */}
      {prices.length > 0 && (
        <div
          className="animate-fade-up"
          style={{
            borderRadius: "14px", animationDelay: "0.2s",
            background: "linear-gradient(135deg, var(--charcoal) 0%, #2d2420 100%)",
            padding: "18px 22px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(30,25,20,0.18)",
          }}
        >
          {[
            { label: "السعر الأعلى",         value: formatPrice(maxPrice),                    color: "#e74c3c", sub: "أعلى عطاء" },
            { label: "السعر المتوسط",         value: formatPrice(Math.round(avgPrice)),          color: "#3b8fcc", sub: "المتوسط الحسابي" },
            { label: "سعر المقاول الحالي",   value: formatPrice(contractor.price),              color: "var(--gold)", sub: contractor.contractor, highlight: true },
            { label: "السعر الأدنى",          value: formatPrice(minPrice),                    color: "#2baa74", sub: "أدنى عطاء" },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                padding: "6px 18px",
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                textAlign: "center",
                position: "relative",
              }}
            >
              {stat.highlight && (
                <div
                  style={{
                    position: "absolute", inset: 0,
                    background: "rgba(197,160,89,0.07)",
                    borderRadius: "6px",
                    border: "1px solid rgba(197,160,89,0.15)",
                  }}
                />
              )}
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px", position: "relative" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: "3px", position: "relative", direction: "ltr" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", position: "relative", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
