import { useState, useEffect } from "react";
import { Building2, Mail, Phone, FileText, Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import type { Contractor } from "@workspace/api-client-react";

interface Props {
  contractor: Contractor | null;
  allContractors: Contractor[];
  filteredContractors: Contractor[];
  isLoading: boolean;
  onSelectId: (id: number) => void;
  emptyStateMessage?: string;
}

const BAR_COLORS = ["#2baa74", "#c5a059", "#3b8fcc", "#e8851c", "#9b59b6", "#e74c3c"];

function normalize(s: string) {
  return (s ?? "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

function formatExact(p: number) {
  if (p == null) return "—";
  return p.toLocaleString("en");
}

function avg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/** Inline read-only stars — shown next to contractor name */
function StarInline({ rating }: { rating?: number | null }) {
  const r = Math.max(0, Math.min(5, Math.round(rating ?? 0)));
  if (r === 0) return null;
  return (
    <span style={{ display: "inline-flex", gap: "1px", alignItems: "center", verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            fontSize: "0.8rem",
            color: i <= r ? "#f5c518" : "rgba(255,255,255,0.2)",
            lineHeight: 1,
            filter: i <= r ? "drop-shadow(0 0 2px rgba(245,197,24,0.5))" : "none",
          }}
        >★</span>
      ))}
      <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.4)", marginRight: "3px" }}>
        {r}/5
      </span>
    </span>
  );
}

export default function MainContent({ contractor, allContractors, filteredContractors, isLoading, onSelectId, emptyStateMessage }: Props) {
  // Active stat tab index (0=current, 1=min, 2=avg, 3=max) — resets when contractor changes
  const [activeStat, setActiveStat] = useState(0);
  useEffect(() => { setActiveStat(0); }, [contractor?.id]);

  if (isLoading) {
    return (
      <main className="content-area">
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ background: "#fff", borderRadius: "16px", height: "140px", marginBottom: "16px", animation: "pulse-gold 1.5s ease-in-out infinite" }} />
        ))}
      </main>
    );
  }

  // ── Global price pool: all records with matching technicalScope ──
  const scopeKey = contractor ? normalize(contractor.technicalScope) : "";
  const globalPricePool: Contractor[] = contractor && scopeKey.length >= 3
    ? allContractors.filter((c) => {
        if (c.id === contractor.id) return true; // always include current
        const s = normalize(c.technicalScope);
        if (!s || s.length < 3) return false;
        return s === scopeKey || s.includes(scopeKey) || scopeKey.includes(s);
      })
    : contractor ? [contractor] : [];

  // pricePool is STRICTLY the global scope pool — never fall back to unrelated data.
  // When no other contractors share this scope, the pool contains only the current contractor.
  // Guard: never put null into pricePool — if contractor is null, pricePool is empty.
  const pricePool     = globalPricePool.length > 0 ? globalPricePool : contractor ? [contractor] : [];
  const scopePoolSize = globalPricePool.length; // how many records match this scope
  const allPrices     = pricePool.map((c) => c.price);
  const maxPrice      = allPrices.length > 0 ? Math.max(...allPrices) : 1;
  const minPrice      = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const avgPrice      = avg(allPrices);

  const contractorWithMin = pricePool.find((c) => c.price === minPrice);
  const contractorWithMax = pricePool.find((c) => c.price === maxPrice);

  // Find contractor closest to the average price.
  // Prefer one that is not the min or max contractor to avoid confusing overlaps.
  // If pool has only 2 entries (both are min+max), fall back to the first sorted result.
  const _sortedByAvgDiff = [...pricePool].sort(
    (a, b) => Math.abs(a.price - avgPrice) - Math.abs(b.price - avgPrice)
  );
  const avgContractor =
    _sortedByAvgDiff.find(
      (c) => c.id !== contractorWithMin?.id && c.id !== contractorWithMax?.id
    ) ?? _sortedByAvgDiff[0];

  // Best 5 cheapest from the global pool (scope-filtered)
  const best5 = [...pricePool].sort((a, b) => a.price - b.price).slice(0, 5);

  // ── Work history: same contractor name + same technicalScope ──
  const workHistory: Contractor[] = contractor && scopeKey.length >= 3
    ? allContractors
        .filter((c) => {
          if (c.id === contractor.id) return false;
          if (normalize(c.contractor) !== normalize(contractor.contractor)) return false;
          const s = normalize(c.technicalScope);
          if (!s || s.length < 3) return false;
          return s === scopeKey || s.includes(scopeKey) || scopeKey.includes(s);
        })
        .slice(0, 6)
    : [];

  if (!contractor) {
    return (
      <main className="content-area">
        <div className="card animate-fade-up" style={{ textAlign: "center", padding: "50px 24px" }}>
          <Building2 size={52} style={{ color: "#ddd", margin: "0 auto 14px" }} />
          <p style={{ color: "#bbb", fontSize: "0.9rem" }}>
            {emptyStateMessage ?? "اختر مقاولاً من القائمة الجانبية أو استخدم البحث الشامل"}
          </p>
        </div>
      </main>
    );
  }

  const rating       = (contractor as any).rating as number | null | undefined;
  const localContent = (contractor as any).localContent as string | null | undefined;
  const mainActivity = (contractor as any).mainActivity as string | null | undefined;

  return (
    <main className="content-area">

      {/* ── 1. بطاقة بيانات المقاول ── */}
      <div className="card animate-fade-up" style={{ marginBottom: "16px", padding: 0, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg, var(--charcoal) 0%, #2d2420 100%)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.58rem", color: "rgba(197,160,89,0.65)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "5px" }}>
              بيانات المقاول الرئيسية
            </div>
            {/* Contractor name */}
            <h2 style={{ fontSize: "0.98rem", fontWeight: 800, color: "#ffffff", lineHeight: 1.3, margin: "0 0 5px 0" }}>
              {contractor.contractor}
            </h2>
            {/* Contract number directly under name, right-aligned */}
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
              {contractor.contractNo}
            </div>
          </div>
          <div style={{ textAlign: "left", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.08em" }}>سعر البند</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--gold)", lineHeight: 1, direction: "ltr" }}>
              {formatExact(contractor.price)}
            </div>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.35)", marginBottom: "6px" }}>ريال سعودي</div>
            {/* Stars under price, bottom-left of price column */}
            <StarInline rating={rating} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: "1px solid #f0ebe0" }}>
          {[
            { icon: <MapPin size={12} />,    label: "المحفظة",       value: contractor.portfolio },
            { icon: <Building2 size={12} />, label: "المشروع",       value: contractor.project },
            { icon: <Briefcase size={12} />, label: "النشاط الرئيسي", value: mainActivity || "—" },
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

        {/* Contact + Local Content row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#faf8f4" }}>
          {[
            { icon: <Phone size={11} />, label: "رقم التواصل",       value: contractor.phone },
            { icon: <Mail size={11} />,  label: "البريد الإلكتروني", value: contractor.email },
            {
              icon: <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--gold)" }}>🏭</span>,
              label: "المحتوى المحلي",
              value: localContent || "—",
            },
          ].map((item, i) => (
            <div key={i} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "7px", borderLeft: i < 2 ? "1px solid #f0ebe0" : "none" }}>
              <span style={{ color: "var(--gold)", flexShrink: 0 }}>{item.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.55rem", color: "#ccc", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--charcoal)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
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

        {/* الوصف الفني للبند */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "0.55rem", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "7px", fontWeight: 700 }}>الوصف الفني للبند</div>
          <p style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.8, margin: 0, background: "#f9f7f3", borderRadius: "9px", padding: "12px 14px", borderRight: "3px solid var(--gold)" }}>
            {contractor.technicalScope || "—"}
          </p>
        </div>

        {/* Grid: نوع الأعمال — نوع العمل — الوحدة */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(197,160,89,0.07), rgba(197,160,89,0.02))", border: "1px solid rgba(197,160,89,0.2)", borderRadius: "9px", padding: "12px 14px" }}>
            <div style={{ fontSize: "0.55rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>نوع الأعمال</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--charcoal)" }}>{contractor.workType || "—"}</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, rgba(58,54,50,0.04), rgba(58,54,50,0.01))", border: "1px solid rgba(58,54,50,0.1)", borderRadius: "9px", padding: "12px 14px" }}>
            <div style={{ fontSize: "0.55rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>نوع العمل</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--charcoal)" }}>{(contractor as any).workCategory || "—"}</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, rgba(58,54,50,0.04), rgba(58,54,50,0.01))", border: "1px solid rgba(58,54,50,0.1)", borderRadius: "9px", padding: "12px 14px" }}>
            <div style={{ fontSize: "0.55rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>الوحدة</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--charcoal)" }}>{(contractor as any).unit || "—"}</div>
          </div>
        </div>
      </div>

      {/* ── 3. سجل الأعمال المنفذة سابقاً ── */}
      {workHistory.length > 0 && (
        <div className="card animate-fade-up" style={{ marginBottom: "16px", animationDelay: "0.1s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
            <Clock size={14} style={{ color: "var(--gold)" }} />
            <h3 style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--charcoal)" }}>سجل الأعمال المنفذة سابقاً</h3>
            <span style={{ fontSize: "0.62rem", color: "#bbb", background: "#f5f0e8", borderRadius: "4px", padding: "2px 7px", marginRight: "auto" }}>
              مشاريع أخرى لنفس المقاول
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
                    {w.project}
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.62rem", color: "#aaa" }}>{w.technicalScope}</span>
                  </div>
                </div>
                <div style={{ textAlign: "left", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: BAR_COLORS[i % BAR_COLORS.length], direction: "ltr" }}>
                    {formatExact(w.price)} ر.س
                  </div>
                  <div style={{ fontSize: "0.58rem", color: "#bbb", direction: "ltr", marginTop: "3px" }}>
                    {w.contractNo}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. أفضل 5 أسعار ── */}
      {best5.length > 0 && (
        <div className="card animate-fade-up" style={{ marginBottom: "16px", animationDelay: "0.15s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--charcoal)", display: "flex", alignItems: "center", gap: "7px" }}>
              <DollarSign size={13} style={{ color: "var(--gold)" }} />
              مقارنة الأسعار
            </h3>
            <span style={{ fontSize: "0.62rem", color: "#bbb", background: "#f5f0e8", borderRadius: "4px", padding: "2px 7px" }}>
              أفضل {best5.length} أسعار • بحث شامل في قاعدة البيانات
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
                >
                  <div style={{ width: "120px", fontSize: "0.7rem", color: isCurrent ? "var(--gold)" : "var(--charcoal)", textAlign: "right", fontWeight: isCurrent ? 800 : 600, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.contractor}
                  </div>
                  <div style={{ flex: 1, background: "#f5f0e8", borderRadius: "5px", overflow: "hidden", height: "19px" }}>
                    <div
                      style={{
                        width: `${(c.price / Math.max(...best5.map(x => x.price))) * 100}%`, height: "100%",
                        background: isCurrent
                          ? "linear-gradient(90deg, var(--gold), #e8c870)"
                          : i === 0 ? "linear-gradient(90deg, #2baa74, #36c786)" : BAR_COLORS[i % BAR_COLORS.length],
                        borderRadius: "5px", transition: "width 0.8s ease",
                        display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "6px",
                        boxShadow: isCurrent ? "0 0 8px rgba(197,160,89,0.35)" : i === 0 ? "0 0 8px rgba(43,170,116,0.3)" : "none",
                      }}
                    >
                      <span style={{ fontSize: "0.58rem", color: "#fff", fontWeight: 700 }}>{formatExact(c.price)}</span>
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

      {/* ── 5. Footer Stats — مقارنة أسعار البند في كامل قاعدة البيانات ── */}
      {allPrices.length > 0 && (
        <div
          className="animate-fade-up"
          style={{
            borderRadius: "14px", animationDelay: "0.2s",
            background: "linear-gradient(135deg, var(--charcoal) 0%, #2d2420 100%)",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(30,25,20,0.18)",
          }}
        >
          {/* Context header */}
          <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.6rem", color: "rgba(197,160,89,0.75)", fontWeight: 700, letterSpacing: "0.06em" }}>
              تحليل أسعار البند • بحث شامل في قاعدة البيانات
            </span>
            <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.06)", borderRadius: "5px", padding: "2px 9px" }}>
              {scopePoolSize > 1 ? `${scopePoolSize} سجل مطابق للوصف الفني` : "سجل واحد — لا توجد مقارنة بعد"}
            </span>
          </div>

          {/* 4 stat cells — tab-style: active cell gets a colored top border + brighter bg */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              {
                label: "سعر المقاول الحالي",
                sub2: contractor.contractor ?? "—",
                value: formatExact(contractor.price),
                color: "var(--gold)",
                id: contractor.id,
              },
              {
                label: "أدنى سعر لهذا البند",
                sub2: contractorWithMin?.contractor ?? "—",
                value: formatExact(minPrice),
                color: "#2baa74",
                id: contractorWithMin?.id ?? null,
                isBest: contractor.price === minPrice,
              },
              {
                label: "متوسط الأسعار لهذا البند",
                sub2: (() => {
                  const names = [...new Set(pricePool.map((c) => c.contractor))];
                  if (names.length === 0) return "—";
                  if (names.length === 1) return names[0];
                  if (names.length === 2) return `${names[0]} + ${names[1]}`;
                  return `${names[0]} + ${names[1]} (+${names.length - 2})`;
                })(),
                value: formatExact(Math.round(avgPrice)),
                color: "#3b8fcc",
                id: avgContractor?.id ?? null,
              },
              {
                label: "أعلى سعر لهذا البند",
                sub2: contractorWithMax?.contractor ?? "—",
                value: formatExact(maxPrice),
                color: "#e74c3c",
                id: contractorWithMax?.id ?? null,
              },
            ].map((stat, i) => {
              const isActive = activeStat === i;
              const baseBg   = isActive ? "rgba(255,255,255,0.09)" : "transparent";
              return (
                <div
                  key={i}
                  onClick={() => {
                    setActiveStat(i);
                    if (stat.id != null) {
                      onSelectId(stat.id);
                      // Scroll content area back to top so contractor panel is visible
                      requestAnimationFrame(() => {
                        const area = document.querySelector<HTMLElement>(".content-area");
                        if (area) area.scrollTo({ top: 0, behavior: "smooth" });
                        else window.scrollTo({ top: 0, behavior: "smooth" });
                      });
                    }
                  }}
                  style={{
                    padding: "14px 10px", textAlign: "center",
                    borderLeft: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    borderTop: isActive ? `2px solid ${stat.color}` : "2px solid transparent",
                    background: baseBg,
                    cursor: "pointer",
                    transition: "background 0.18s, border-top 0.18s",
                    position: "relative",
                  }}
                  title={stat.label}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.13)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = baseBg)}
                >
                  {(stat as any).isBest && (
                    <div style={{ position: "absolute", top: "6px", right: "6px", fontSize: "0.48rem", color: "#2baa74", background: "rgba(43,170,116,0.15)", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>
                      ✓ الأفضل
                    </div>
                  )}
                  <div style={{ fontSize: "0.5rem", color: isActive ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", lineHeight: 1.4 }}>{stat.label}</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: "4px", direction: "ltr", fontVariantNumeric: "tabular-nums" }}>{stat.value}</div>
                  <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.2)", marginBottom: "3px" }}>ريال سعودي</div>
                  <div style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "0 4px", lineHeight: 1.5 }}>{stat.sub2}</div>
                </div>
              );
            })}
          </div>

          {/* Saving indicator — only shown when current contractor IS the lowest in the pool */}
          {scopePoolSize > 1 && contractor.price === minPrice && (
            <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(43,170,116,0.2)", background: "rgba(43,170,116,0.07)", textAlign: "center" }}>
              <span style={{ fontSize: "0.6rem", color: "#2baa74", fontWeight: 700 }}>
                ✓ المقاول الحالي يقدم أفضل سعر مسجل في قاعدة البيانات لهذا البند
              </span>
            </div>
          )}
          {scopePoolSize > 1 && contractor.price > minPrice && (
            <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.08)", textAlign: "center" }}>
              <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)" }}>
                فارق السعر عن الأدنى التاريخي:{" "}
                <span style={{ color: "#e8851c", fontWeight: 700 }}>
                  {formatExact(contractor.price - minPrice)} ر.س
                  {" "}({((contractor.price - minPrice) / (minPrice || 1) * 100).toFixed(1)}%)
                </span>
                {" "}— أدنى سعر: {contractorWithMin?.contractor ?? "—"}
              </span>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
