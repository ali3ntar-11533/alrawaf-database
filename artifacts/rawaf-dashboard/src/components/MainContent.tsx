import { useState, useEffect, useRef } from "react";
import { Building2, Mail, Phone, FileText, Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import type { Contractor } from "../contractors/types";

interface Props {
  contractor: Contractor | null;
  allContractors: Contractor[];
  filteredContractors: Contractor[];
  isLoading: boolean;
  onSelectId: (id: number) => void;
  customPrice?: number | null;
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

function TruncatedBadge({
  value,
  title,
}: {
  value: string;
  title?: string;
}) {
  return (
    <span
      title={title ?? value}
      onMouseEnter={(e) => {
        e.currentTarget.style.whiteSpace = "normal";
        e.currentTarget.style.overflow = "visible";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.whiteSpace = "nowrap";
        e.currentTarget.style.overflow = "hidden";
      }}
      style={{
        display: "block",
        minWidth: 0,
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        direction: "rtl",
        position: "relative",
        zIndex: 1,
      }}
    >
      {value}
    </span>
  );
}

export default function MainContent({ contractor, allContractors, filteredContractors, isLoading, onSelectId, customPrice, emptyStateMessage }: Props) {
  // Active stat tab index (0=custom/current, 1=min, 2=avg, 3=max)
  const [activeStat, setActiveStat] = useState(0);
  // Prevents resetting activeStat when contractor change was triggered by clicking a stat cell
  const skipStatReset = useRef(false);
  // Cycle indices for min/max cells — cycling through same-price contractors
  const [minCycleIdx, setMinCycleIdx] = useState(0);
  const [maxCycleIdx, setMaxCycleIdx] = useState(0);

  useEffect(() => {
    if (skipStatReset.current) { skipStatReset.current = false; return; }
    setActiveStat(customPrice && customPrice > 0 ? 2 : 0);
    setMinCycleIdx(0);
    setMaxCycleIdx(0);
  }, [contractor?.id]);
  // When a custom price is entered for the first time, default to avg comparison (index 2)
  const prevCustomPrice = useRef<number | null | undefined>(null);
  useEffect(() => {
    const had = prevCustomPrice.current && prevCustomPrice.current > 0;
    const has  = customPrice && customPrice > 0;
    if (has && !had) setActiveStat(2);
    if (!has && had) setActiveStat(0);
    prevCustomPrice.current = customPrice;
  }, [customPrice]);

  if (isLoading) {
    return (
      <main className="content-area">
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ background: "#fff", borderRadius: "16px", height: "140px", marginBottom: "16px", animation: "pulse-gold 1.5s ease-in-out infinite" }} />
        ))}
      </main>
    );
  }

  // ── Global price pool: ALL records sharing the same نوع الأعمال + برنامج الأعمال ──
  // Both workType AND businessProgram must match (if businessProgram is set on the selected record).
  // This gives a focused, meaningful price comparison for the same work category.
  const workTypeKey        = contractor ? normalize(contractor.workType) : "";
  const businessProgramKey = contractor ? normalize((contractor as any).businessProgram ?? "") : "";

  const globalPricePool: Contractor[] = contractor && workTypeKey.length > 0
    ? allContractors.filter((c) => {
        const typeMatch = normalize(c.workType) === workTypeKey;
        if (!businessProgramKey) return typeMatch;
        // Also match businessProgram when the selected contractor has one
        return typeMatch && normalize((c as any).businessProgram ?? "") === businessProgramKey;
      })
    : contractor ? [contractor] : [];

  // Fallback: if pool is empty (no match on both fields), widen to workType only
  const pricePool = globalPricePool.length > 0
    ? globalPricePool
    : contractor && workTypeKey.length > 0
      ? allContractors.filter((c) => normalize(c.workType) === workTypeKey)
      : contractor ? [contractor] : [];
  const scopePoolSize = pricePool.length;

  // Only consider records with a valid price > 0 for min/max/avg calculations
  const validPricePool = pricePool.filter((c) => c.price > 0);
  const allPrices      = validPricePool.map((c) => c.price);
  const maxPrice       = allPrices.length > 0 ? Math.max(...allPrices) : 1;
  const minPrice       = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const avgPrice       = avg(allPrices);

  // All contractors sharing the exact min / max price (for cycling)
  const contractorsAtMin = validPricePool.filter((c) => c.price === minPrice);
  const contractorsAtMax = validPricePool.filter((c) => c.price === maxPrice);

  // Current cycle position for min/max — wraps around
  const contractorWithMin = contractorsAtMin[minCycleIdx % Math.max(1, contractorsAtMin.length)] ?? contractorsAtMin[0];
  const contractorWithMax = contractorsAtMax[maxCycleIdx % Math.max(1, contractorsAtMax.length)] ?? contractorsAtMax[0];

  // Find contractor closest to the average price (excluding min/max to avoid duplicate labels)
  const _sortedByAvgDiff = [...validPricePool].sort(
    (a, b) => Math.abs(a.price - avgPrice) - Math.abs(b.price - avgPrice)
  );
  const avgContractor =
    _sortedByAvgDiff.find(
      (c) => c.id !== contractorWithMin?.id && c.id !== contractorWithMax?.id
    ) ?? _sortedByAvgDiff[0];

  // ── Best 5: Best Value scoring = 60% price competitiveness + 40% rating ──
  // A contractor with a high rating and a competitive price ranks above one that
  // is cheapest but has a low rating (Best Value = Quality × Price together).
  const _maxPoolPrice = maxPrice > 0 ? maxPrice : 1;
  const best5 = validPricePool.length > 0
    ? [...validPricePool]
        .map((c) => {
          const rating = Math.max(0, Math.min(5, Number((c as any).rating ?? 0)));
          const normalizedRating       = rating / 5;
          const normalizedPriceScore   = 1 - (c.price / _maxPoolPrice); // lower price → higher score
          const bestValueScore         = normalizedRating * 0.4 + normalizedPriceScore * 0.6;
          return { ...c, _bestValueScore: bestValueScore };
        })
        .sort((a, b) => b._bestValueScore - a._bestValueScore)
        .slice(0, 5)
    : [];

  // ── Work history: same contractor name, any project (other records for this contractor) ──
  const contractorNameKey = contractor ? normalize(contractor.contractor) : "";
  const workHistory: Contractor[] = contractor && contractorNameKey.length > 0
    ? allContractors
        .filter((c) => {
          if (c.id === contractor.id) return false;
          return normalize(c.contractor) === contractorNameKey;
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

  // ── Footer stats array — shared by grid cells AND comparison bar ──
  const footerStats: Array<{
    label: string; sub2: string; value: string; color: string;
    id: number | null; rawPrice: number; isCustom?: boolean; isBest?: boolean;
    cycleCount?: number; cyclePos?: number;
  }> = [
    customPrice && customPrice > 0
      ? { label: "السعر المقارن", sub2: "مقاول خارج القاعدة", value: formatExact(customPrice), color: "#9b59b6", id: null, isCustom: true, rawPrice: customPrice }
      : { label: "سعر المقاول الحالي", sub2: contractor.contractor ?? "—", value: formatExact(contractor.price), color: "var(--gold)", id: contractor.id as number | null, isCustom: false, rawPrice: contractor.price },
    {
      label: "أدنى سعر لهذا البند",
      sub2: contractorsAtMin.length > 1
        ? `${contractorWithMin?.contractor ?? "—"} (${minCycleIdx % contractorsAtMin.length + 1}/${contractorsAtMin.length})`
        : contractorWithMin?.contractor ?? "—",
      value: formatExact(minPrice), color: "#2baa74",
      id: contractorWithMin?.id ?? null, isBest: contractor.price === minPrice, rawPrice: minPrice,
      cycleCount: contractorsAtMin.length, cyclePos: minCycleIdx,
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
      value: formatExact(Math.round(avgPrice)), color: "#3b8fcc",
      id: avgContractor?.id ?? null, rawPrice: Math.round(avgPrice),
    },
    {
      label: "أعلى سعر لهذا البند",
      sub2: contractorsAtMax.length > 1
        ? `${contractorWithMax?.contractor ?? "—"} (${maxCycleIdx % contractorsAtMax.length + 1}/${contractorsAtMax.length})`
        : contractorWithMax?.contractor ?? "—",
      value: formatExact(maxPrice), color: "#e74c3c",
      id: contractorWithMax?.id ?? null, rawPrice: maxPrice,
      cycleCount: contractorsAtMax.length, cyclePos: maxCycleIdx,
    },
  ];
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

        {/* Grid: نوع الأعمال — نوع العمل — الوحدة — برنامج الأعمال */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(197,160,89,0.07), rgba(197,160,89,0.02))", border: "1px solid rgba(197,160,89,0.2)", borderRadius: "9px", padding: "12px 14px", minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: "0.55rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>نوع الأعمال</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--charcoal)", minWidth: 0, overflow: "hidden" }}>
              <TruncatedBadge value={contractor.workType || "—"} title={contractor.workType || "—"} />
            </div>
          </div>
          <div style={{ background: "linear-gradient(135deg, rgba(58,54,50,0.04), rgba(58,54,50,0.01))", border: "1px solid rgba(58,54,50,0.1)", borderRadius: "9px", padding: "12px 14px" }}>
            <div style={{ fontSize: "0.55rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>نوع العمل</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--charcoal)" }}>
              <TruncatedBadge value={(contractor as any).workCategory || "—"} title={(contractor as any).workCategory || "—"} />
            </div>
          </div>
          <div style={{ background: "linear-gradient(135deg, rgba(58,54,50,0.04), rgba(58,54,50,0.01))", border: "1px solid rgba(58,54,50,0.1)", borderRadius: "9px", padding: "12px 14px" }}>
            <div style={{ fontSize: "0.55rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>الوحدة</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--charcoal)" }}>
              <TruncatedBadge value={(contractor as any).unit || "—"} title={(contractor as any).unit || "—"} />
            </div>
          </div>
          <div style={{ background: "linear-gradient(135deg, rgba(58,54,50,0.04), rgba(58,54,50,0.01))", border: "1px solid rgba(58,54,50,0.1)", borderRadius: "9px", padding: "12px 14px" }}>
            <div style={{ fontSize: "0.55rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>برنامج الأعمال</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--charcoal)" }}>
              <TruncatedBadge value={(contractor as any).businessProgram || "—"} title={(contractor as any).businessProgram || "—"} />
            </div>
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
              أفضل {best5.length} قيمة • سعر + تقييم مدمجان
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {best5.map((c, i) => {
              const isCurrent     = contractor && c.id === contractor.id;
              const cRating       = Math.max(0, Math.min(5, Math.round(Number((c as any).rating ?? 0))));
              const barColor      = isCurrent
                ? "linear-gradient(90deg, var(--gold), #e8c870)"
                : i === 0 ? "linear-gradient(90deg, #2baa74, #36c786)" : BAR_COLORS[i % BAR_COLORS.length];
              const maxBest5Price = Math.max(...best5.map((x) => x.price), 1);
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectId(c.id)}
                  style={{ display: "flex", flexDirection: "column", gap: "4px", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "5px", background: i === 0 ? "#2baa74" : isCurrent ? "var(--gold)" : "#e0dbd0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.55rem", fontWeight: 800, color: i === 0 || isCurrent ? "#fff" : "#aaa" }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1, fontSize: "0.7rem", color: isCurrent ? "var(--gold)" : "var(--charcoal)", fontWeight: isCurrent ? 800 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.contractor}
                    </div>
                    {cRating > 0 && (
                      <span style={{ display: "inline-flex", gap: "1px", flexShrink: 0 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} style={{ fontSize: "0.6rem", color: s <= cRating ? "#f5c518" : "#e0dbd0", lineHeight: 1 }}>★</span>
                        ))}
                      </span>
                    )}
                    <span style={{ fontSize: "0.68rem", fontWeight: 800, color: i === 0 ? "#2baa74" : isCurrent ? "var(--gold)" : "#888", flexShrink: 0, direction: "ltr" }}>
                      {formatExact(c.price)}
                    </span>
                  </div>
                  <div style={{ background: "#f5f0e8", borderRadius: "5px", overflow: "hidden", height: "7px" }}>
                    <div
                      style={{
                        width: `${(c.price / maxBest5Price) * 100}%`,
                        height: "100%",
                        background: barColor,
                        borderRadius: "5px",
                        transition: "width 0.8s ease",
                        boxShadow: isCurrent ? "0 0 6px rgba(197,160,89,0.35)" : i === 0 ? "0 0 6px rgba(43,170,116,0.3)" : "none",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.6rem", color: "#bbb", textAlign: "center" }}>
            مرتبة حسب أفضل قيمة (60% سعر + 40% تقييم) • اضغط على أي مقاول لعرض بياناته
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
          <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.6rem", color: "rgba(197,160,89,0.75)", fontWeight: 700, letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              تحليل الأسعار • {contractor?.technicalScope || contractor?.workType || "—"}
            </span>
            <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.06)", borderRadius: "5px", padding: "2px 9px", flexShrink: 0 }}>
              {scopePoolSize > 1 ? `${scopePoolSize} سجل مطابق` : "سجل واحد — لا توجد مقارنة بعد"}
            </span>
          </div>

          {/* 4 stat cells — tab-style: active cell gets a colored top border + brighter bg */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", width: "100%" }}>
            {footerStats.map((stat, i) => {
              const isActive = activeStat === i;
              // Active cell uses the stat's own color as tinted background
              const colorHex = stat.color.startsWith("#") ? stat.color : "#c5a059";
              const baseBg   = isActive ? `${colorHex}28` : "transparent";
              const hoverBg  = isActive ? `${colorHex}38` : `${colorHex}12`;
              return (
                <div
                  key={i}
                  onClick={() => {
                    setActiveStat(i);
                    // ── Cycling logic for min (i=1) and max (i=3) cells ──
                    if (i === 1 && contractorsAtMin.length > 1) {
                      const nextIdx = (minCycleIdx + 1) % contractorsAtMin.length;
                      setMinCycleIdx(nextIdx);
                      skipStatReset.current = true;
                      onSelectId(contractorsAtMin[nextIdx].id);
                      requestAnimationFrame(() => {
                        const area = document.querySelector<HTMLElement>(".content-area");
                        if (area) area.scrollTo({ top: 0, behavior: "smooth" });
                        else window.scrollTo({ top: 0, behavior: "smooth" });
                      });
                      return;
                    }
                    if (i === 3 && contractorsAtMax.length > 1) {
                      const nextIdx = (maxCycleIdx + 1) % contractorsAtMax.length;
                      setMaxCycleIdx(nextIdx);
                      skipStatReset.current = true;
                      onSelectId(contractorsAtMax[nextIdx].id);
                      requestAnimationFrame(() => {
                        const area = document.querySelector<HTMLElement>(".content-area");
                        if (area) area.scrollTo({ top: 0, behavior: "smooth" });
                        else window.scrollTo({ top: 0, behavior: "smooth" });
                      });
                      return;
                    }
                    // Default: navigate to the stat's contractor
                    if (stat.id != null) {
                      skipStatReset.current = true;
                      onSelectId(stat.id);
                      requestAnimationFrame(() => {
                        const area = document.querySelector<HTMLElement>(".content-area");
                        if (area) area.scrollTo({ top: 0, behavior: "smooth" });
                        else window.scrollTo({ top: 0, behavior: "smooth" });
                      });
                    }
                  }}
                  style={{
                    padding: "14px 8px", textAlign: "center",
                    borderLeft: i < 3 ? `1px solid ${colorHex}22` : "none",
                    borderTop: isActive ? `2px solid ${stat.color}` : "2px solid rgba(255,255,255,0.05)",
                    background: baseBg,
                    minWidth: 0,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "background 0.2s, border-top 0.2s",
                    position: "relative",
                    boxShadow: isActive ? `inset 0 -2px 0 ${colorHex}55` : "none",
                  }}
                  title={`${stat.label}: ${stat.value} — ${stat.sub2}`}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = hoverBg)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = baseBg)}
                >
                  {(stat as any).isBest && (
                    <div style={{ position: "absolute", top: "4px", right: "4px", fontSize: "0.45rem", color: "#2baa74", background: "rgba(43,170,116,0.18)", borderRadius: "4px", padding: "1px 4px", fontWeight: 700, whiteSpace: "nowrap" }}>
                      ✓ الأفضل
                    </div>
                  )}
                  {/* Active badge */}
                  {isActive && customPrice && customPrice > 0 && i > 0 && (
                    <div style={{ position: "absolute", top: "4px", left: "4px", fontSize: "0.42rem", color: colorHex, background: `${colorHex}22`, borderRadius: "4px", padding: "1px 5px", fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${colorHex}55` }}>
                      مرجع المقارنة
                    </div>
                  )}
                  {/* Cycling badge — shown when multiple contractors share the same price */}
                  {(stat.cycleCount ?? 0) > 1 && !(isActive && customPrice && customPrice > 0) && (
                    <div style={{ position: "absolute", top: "4px", left: "4px", fontSize: "0.42rem", color: colorHex, background: `${colorHex}18`, borderRadius: "4px", padding: "1px 5px", fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${colorHex}33` }}>
                      ↻ {stat.cycleCount}
                    </div>
                  )}
                  <div style={{ fontSize: "0.48rem", color: isActive ? stat.color : "rgba(255,255,255,0.32)", letterSpacing: "0.04em", marginBottom: "5px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isActive ? 700 : 400 }}>{stat.label}</div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: "4px", direction: "ltr", fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: isActive ? `0 0 14px ${colorHex}88` : "none" }}>{stat.value}</div>
                  <div style={{ fontSize: "0.45rem", color: isActive ? `${colorHex}88` : "rgba(255,255,255,0.18)", marginBottom: "3px", whiteSpace: "nowrap" }}>ريال سعودي</div>
                  <div style={{ fontSize: "0.48rem", color: isActive ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.22)", textAlign: "center", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stat.sub2}</div>
                </div>
              );
            })}
          </div>

          {/* Custom price comparison indicator — updates live based on clicked stat cell */}
          {customPrice && customPrice > 0 && scopePoolSize > 0 && (() => {
            // Use the clicked stat (1=min, 2=avg, 3=max); if index 0 (السعر المقارن itself) fall back to avg
            const refIdx   = activeStat > 0 && activeStat <= 3 ? activeStat : 2;
            const refStat  = footerStats[refIdx];
            const refPrice = refStat?.rawPrice ?? Math.round(avgPrice);
            const diff     = Math.round(Math.abs(customPrice - refPrice));
            const pct      = refPrice > 0 ? ((diff / refPrice) * 100).toFixed(1) : "0.0";
            const isHigher = customPrice > refPrice;
            const isEqual  = diff === 0;
            const refColor = refStat?.color ?? "#3b8fcc";
            const refLabel = refStat?.label ?? "المتوسط";
            const text = isEqual
              ? `السعر المقارن (${formatExact(customPrice)}) يساوي ${refLabel}`
              : isHigher
                ? `▲ السعر المقارن (${formatExact(customPrice)}) أعلى من ${refLabel} بـ ${formatExact(diff)} ر.س (${pct}%)`
                : `✓ السعر المقارن (${formatExact(customPrice)}) أقل من ${refLabel} بـ ${formatExact(diff)} ر.س (${pct}%)`;
            return (
              <div style={{ padding: "8px 16px", borderTop: `1px solid ${refColor}55`, background: `${refColor}14`, textAlign: "center", transition: "background 0.25s, border-color 0.25s" }}>
                <span style={{ fontSize: "0.6rem", color: refColor, fontWeight: 700 }}>{text}</span>
              </div>
            );
          })()}

          {/* Saving indicator — only shown when current contractor IS the lowest in the pool */}
          {!customPrice && scopePoolSize > 1 && contractor.price === minPrice && (
            <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(43,170,116,0.2)", background: "rgba(43,170,116,0.07)", textAlign: "center" }}>
              <span style={{ fontSize: "0.6rem", color: "#2baa74", fontWeight: 700 }}>
                ✓ المقاول الحالي يقدم أفضل سعر مسجل في قاعدة البيانات لهذا البند
              </span>
            </div>
          )}
          {!customPrice && scopePoolSize > 1 && contractor.price > minPrice && (
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
