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

/* ── 3-Tier comparison based on the unique item-code prefix ─────────────
   Code format: `<L>-<14 digits>` where the 14 digits are 7 slots×2.
   Tier 1 (دقيق):    full 16-char code matches            → identical item
   Tier 2 (متماثل):  letter + first 5 slots (12 chars)     → same scope
   Tier 3 (موسّع):   letter + first 3 slots (8 chars)      → same family
*/
type Tier = "exact" | "similar" | "broad";

const TIER_META: Record<Tier, { label: string; icon: string; color: string; slots: number; tip: string }> = {
  exact:   { label: "دقيق",   icon: "🎯", color: "#2baa74", slots: 7, tip: "تطابق كامل للكود الفريد للبند — أعدل مقارنة" },
  similar: { label: "متماثل", icon: "⚖️", color: "#c5a059", slots: 5, tip: "تطابق المحفظة + النشاط + البرنامج + العائلة + نوع الأعمال + الشمولية" },
  broad:   { label: "موسّع",  icon: "🌐", color: "#3b8fcc", slots: 3, tip: "تطابق المحفظة + النشاط + البرنامج + العائلة" },
};

function codePrefix(code: string | null | undefined, slots: number): string {
  if (!code) return "";
  const want = 2 + slots * 2; // "L-" + slots×2 digits
  return code.length >= want ? code.slice(0, want) : "";
}

function buildMask(code: string | null | undefined, slots: number): string {
  if (!code) return "—";
  const prefix    = codePrefix(code, slots);
  const remaining = Math.max(0, 14 - slots * 2);
  return prefix + "_".repeat(remaining);
}

export default function MainContent({ contractor, allContractors, filteredContractors, isLoading, onSelectId, customPrice, emptyStateMessage }: Props) {
  // Active stat tab index (0=custom/current, 1=min, 2=avg, 3=max)
  const [activeStat, setActiveStat] = useState(0);
  // Prevents resetting activeStat when contractor change was triggered by clicking a stat cell
  const skipStatReset = useRef(false);
  // Cycle indices for min / avg / max cells
  const [minCycleIdx, setMinCycleIdx] = useState(0);
  const [avgCycleIdx, setAvgCycleIdx] = useState(0);
  const [maxCycleIdx, setMaxCycleIdx] = useState(0);
  // Comparison tier — null means "auto-pick the most precise tier with ≥2 records"
  const [userTier, setUserTier] = useState<Tier | null>(null);

  useEffect(() => {
    if (skipStatReset.current) { skipStatReset.current = false; return; }
    setActiveStat(customPrice && customPrice > 0 ? 2 : 0);
    setMinCycleIdx(0);
    setAvgCycleIdx(0);
    setMaxCycleIdx(0);
    setUserTier(null); // reset to auto-pick on contractor change
  }, [contractor?.id]);
  // When a custom price is entered for the first time, highlight the "السعر المقارن" cell (index 0)
  const prevCustomPrice = useRef<number | null | undefined>(null);
  useEffect(() => {
    const had = prevCustomPrice.current && prevCustomPrice.current > 0;
    const has  = customPrice && customPrice > 0;
    if (has && !had) setActiveStat(0);
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

  // ── Price pools: 3-tier hierarchical match driven by the unique item code ──
  // Tier 1 (exact):   identical 14-digit code      → identical item
  // Tier 2 (similar): same letter + first 5 slots  → same scope/type
  // Tier 3 (broad):   same letter + first 3 slots  → same work family
  // Legacy fallback: when the current record has no itemCode, fall back to
  // text-based workType matching (so old data stays comparable).
  const currentCode = (contractor as any)?.itemCode as string | null | undefined;
  const hasCode     = !!currentCode;
  const prefix5     = codePrefix(currentCode, 5);
  const prefix3     = codePrefix(currentCode, 3);

  const workTypeKey   = contractor ? normalize(contractor.workType) : "";
  const legacyPool: Contractor[] = (!hasCode && workTypeKey)
    ? filteredContractors.filter((c) => normalize(c.workType) === workTypeKey)
    : [];

  const poolExact: Contractor[] = hasCode
    ? filteredContractors.filter((c) => (c as any).itemCode === currentCode)
    : legacyPool;
  const poolSimilar: Contractor[] = hasCode && prefix5
    ? filteredContractors.filter((c) => {
        const code = (c as any).itemCode as string | null | undefined;
        return !!code && code.startsWith(prefix5);
      })
    : legacyPool;
  const poolBroad: Contractor[] = hasCode && prefix3
    ? filteredContractors.filter((c) => {
        const code = (c as any).itemCode as string | null | undefined;
        return !!code && code.startsWith(prefix3);
      })
    : legacyPool;

  const tierPools: Record<Tier, Contractor[]> = {
    exact:   poolExact,
    similar: poolSimilar,
    broad:   poolBroad,
  };

  // Auto-pick the most precise tier that has ≥2 records (so the comparison
  // is actually meaningful); else fall through to the next tier.
  const autoTier: Tier =
    poolExact.length   >= 2 ? "exact"
    : poolSimilar.length >= 2 ? "similar"
    : poolBroad.length   >= 2 ? "broad"
    : "exact";
  const tier: Tier = userTier ?? autoTier;

  let pricePool: Contractor[] = tierPools[tier];
  if (pricePool.length === 0 && contractor) pricePool = [contractor];

  const scopePoolSize = pricePool.length;

  // Mask ribbon for the active tier — shows which digits are "fixed" vs free.
  const tierMask  = buildMask(currentCode, TIER_META[tier].slots);
  const tierMeta  = TIER_META[tier];
  // Human-readable scope label (shown in the dark footer header)
  const poolLabel: string = !contractor
    ? "—"
    : tier === "exact"
      ? (currentCode || contractor.workType || "—")
      : tier === "similar"
        ? `${contractor.workFamily ?? ""} › ${contractor.workType ?? ""} › ${contractor.itemScope ?? ""}`.replace(/^›|›$/g, "").trim()
        : `${contractor.mainActivity ?? ""} › ${contractor.workFamily ?? ""}`.replace(/^›|›$/g, "").trim();

  // Only consider records with a valid price > 0 for min/max/avg calculations
  const validPricePool = pricePool.filter((c) => c.price > 0);
  const allPrices      = validPricePool.map((c) => c.price);
  const maxPrice       = allPrices.length > 0 ? Math.max(...allPrices) : 1;
  const minPrice       = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const avgPrice       = avg(allPrices);

  // ── Price under evaluation ─────────────────────────────────────────────
  //    Use the user-entered custom price when present (an external offer
  //    being benchmarked), otherwise the current contractor's stored price.
  //    All deviation/ranking logic below pivots on this single value so
  //    custom offers are scored against the internal tier pool exactly the
  //    same way the contractor's own price is.
  const hasCustomPrice = !!(customPrice && customPrice > 0);
  const priceUnderEval = hasCustomPrice ? (customPrice as number) : (contractor?.price ?? 0);
  const evalLabel      = hasCustomPrice ? "السعر المُدخل" : "سعر المقاول الحالي";

  // ── Price-deviation alarm: when the price under evaluation diverges
  //    from the tier's average by more than 30%, flip the tier indicator
  //    to red regardless of which tier is active (financial-protection rule).
  const deviationPct = (priceUnderEval > 0 && avgPrice > 0)
    ? Math.abs(priceUnderEval - avgPrice) / avgPrice
    : 0;
  const isHighDeviation = deviationPct > 0.30 && validPricePool.length >= 2;
  const activeTierColor = isHighDeviation ? "#e74c3c" : tierMeta.color;

  // ── Rank of the evaluated price inside the current tier ────────────────
  //    `cheaperCount` = how many tier records strictly undercut us.
  //    Rank = cheaperCount + 1.  Useful both for the contractor's own
  //    price AND for benchmarking an externally-typed offer.
  const cheaperCount = validPricePool.filter((c) => c.price < priceUnderEval).length;
  const evalRank     = priceUnderEval > 0 ? cheaperCount + 1 : 0;
  const evalTotal    = validPricePool.length + (hasCustomPrice ? 1 : 0);
  // For custom price: is it strictly the cheapest? (would dethrone min)
  const customBeatsMin = hasCustomPrice && validPricePool.length > 0 && priceUnderEval < minPrice;
  const savingsVsMin   = hasCustomPrice ? Math.max(0, minPrice - priceUnderEval) : 0;
  const overhangVsAvg  = hasCustomPrice && avgPrice > 0 ? Math.round(priceUnderEval - avgPrice) : 0;

  /* TierTabs — switchable 3-tier comparison selector.
     `dark` swaps the palette for the dark-themed footer header. */
  const renderTierTabs = (dark: boolean) => (
    <div style={{
      display: "inline-flex", gap: "2px",
      background: dark ? "rgba(255,255,255,0.06)" : "#f5f0e8",
      borderRadius: "7px", padding: "2px", flexShrink: 0,
    }}>
      {(["exact", "similar", "broad"] as Tier[]).map((t) => {
        const meta     = TIER_META[t];
        const isActive = tier === t;
        const count    = tierPools[t].length;
        const disabled = count === 0;
        const activeColor = (isActive && isHighDeviation) ? "#e74c3c" : meta.color;
        return (
          <button
            key={t}
            disabled={disabled}
            onClick={() => {
              setUserTier(t);
              // Reset stat-cell cycle indices so the new tier starts fresh
              setMinCycleIdx(0);
              setAvgCycleIdx(0);
              setMaxCycleIdx(0);
            }}
            title={`${meta.tip}${disabled ? " — لا توجد بنود" : ""}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              fontSize: "0.58rem", fontWeight: 700,
              padding: "3px 8px", borderRadius: "5px", border: "none",
              cursor: disabled ? "not-allowed" : "pointer",
              background: isActive ? activeColor : "transparent",
              color: isActive ? "#fff" : (dark ? "rgba(255,255,255,0.55)" : "#888"),
              opacity: disabled ? 0.35 : 1,
              transition: "all 0.18s",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "0.62rem", lineHeight: 1 }}>{meta.icon}</span>
            {meta.label}
            <span style={{
              background: isActive ? "rgba(255,255,255,0.28)" : (dark ? "rgba(255,255,255,0.10)" : "#e8e0d0"),
              borderRadius: "3px", padding: "0 4px", fontWeight: 800,
              fontSize: "0.54rem", minWidth: "14px", textAlign: "center",
            }}>{count}</span>
          </button>
        );
      })}
    </div>
  );

  /* MaskRibbon — shows the matching prefix for the active tier, with
     trailing underscores for the "free" digits.  Helps the user see
     exactly which parts of the code drove the comparison. */
  const renderMaskRibbon = (dark: boolean) => (
    <span
      title={`القناع المُستخدم في المقارنة — الخانات الثابتة ظاهرة بالأرقام والخانات الحرة بـ _`}
      style={{
        fontFamily: "monospace", fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.06em",
        color: dark ? "rgba(255,255,255,0.85)" : "var(--charcoal)",
        background: dark ? "rgba(197,160,89,0.18)" : "rgba(197,160,89,0.12)",
        border: `1px solid ${dark ? "rgba(197,160,89,0.35)" : "rgba(197,160,89,0.30)"}`,
        borderRadius: "4px", padding: "2px 7px",
        whiteSpace: "nowrap", flexShrink: 0,
        direction: "ltr",
      }}
    >{tierMask}</span>
  );

  /* Deviation warning chip — only shown when |evaluated − avg| / avg > 30%.
     The label adapts to whichever price is under evaluation. */
  const renderDeviationChip = () => isHighDeviation ? (
    <span
      title={`${evalLabel} (${formatExact(priceUnderEval)}) ينحرف بنسبة ${(deviationPct * 100).toFixed(0)}٪ عن متوسط هذا المستوى (${formatExact(Math.round(avgPrice))})`}
      style={{
        display: "inline-flex", alignItems: "center", gap: "3px",
        fontSize: "0.55rem", fontWeight: 800, color: "#fff",
        background: "#e74c3c", borderRadius: "4px", padding: "2px 6px",
        whiteSpace: "nowrap", flexShrink: 0,
        animation: "pulse-gold 1.5s ease-in-out infinite",
      }}
    >🔴 {hasCustomPrice ? "السعر المُدخل" : "انحراف"} {(deviationPct * 100).toFixed(0)}٪</span>
  ) : null;

  /* Rank chip — shows where the evaluated price would sit in the tier pool.
     Always visible when there is something to compare against (≥2 records).
     For custom price the chip is purple (to match the existing "السعر المقارن" cell color). */
  const renderRankChip = (dark: boolean) => {
    if (validPricePool.length < 2 || priceUnderEval <= 0) return null;
    const color   = hasCustomPrice ? "#9b59b6" : "#c5a059";
    const isBest  = evalRank === 1;
    const icon    = isBest ? "🏆" : hasCustomPrice ? "💡" : "📊";
    return (
      <span
        title={`${evalLabel} (${formatExact(priceUnderEval)}) يحتل الترتيب ${evalRank} من ${evalTotal} في هذا المستوى`}
        style={{
          display: "inline-flex", alignItems: "center", gap: "3px",
          fontSize: "0.55rem", fontWeight: 800,
          color: isBest ? "#fff" : color,
          background: isBest ? color : (dark ? `${color}22` : `${color}14`),
          border: `1px solid ${color}${dark ? "55" : "40"}`,
          borderRadius: "4px", padding: "2px 6px",
          whiteSpace: "nowrap", flexShrink: 0, direction: "rtl",
        }}
      >{icon} الترتيب {evalRank}/{evalTotal}</span>
    );
  };

  // All contractors sharing the exact min / max price (for cycling)
  const contractorsAtMin = validPricePool.filter((c) => c.price === minPrice);
  const contractorsAtMax = validPricePool.filter((c) => c.price === maxPrice);

  // A meaningful average only exists when at least one contractor has a price
  // strictly BETWEEN min and max (not equal to either extreme).
  const hasMidContractor = validPricePool.some((c) => c.price > minPrice && c.price < maxPrice);

  // Current cycle position for min/max — wraps around
  const contractorWithMin = contractorsAtMin[minCycleIdx % Math.max(1, contractorsAtMin.length)] ?? contractorsAtMin[0];
  const contractorWithMax = contractorsAtMax[maxCycleIdx % Math.max(1, contractorsAtMax.length)] ?? contractorsAtMax[0];

  // Find contractor closest to the average price (for the fallback single-navigation case)
  const _sortedByAvgDiff = [...validPricePool].sort(
    (a, b) => Math.abs(a.price - avgPrice) - Math.abs(b.price - avgPrice)
  );
  const avgContractor =
    _sortedByAvgDiff.find(
      (c) => c.id !== contractorWithMin?.id && c.id !== contractorWithMax?.id
    ) ?? _sortedByAvgDiff[0];

  // Contractors sharing the EXACT rounded average price (for cycling — same as min/max approach)
  const avgPriceRounded     = Math.round(avgPrice);
  const contractorsAtAvgPrice = validPricePool.filter((c) => c.price === avgPriceRounded);
  // Resolved avg contractor for the current cycle position (or closest-to-avg if no exact match)
  const contractorAtAvgCycle = contractorsAtAvgPrice.length > 0
    ? contractorsAtAvgPrice[avgCycleIdx % contractorsAtAvgPrice.length]
    : avgContractor;

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

  // ── Work history: same contractor + same item tier (mirrors comparison pool) ──
  // When the current record has an itemCode we match by code prefix — the same
  // tier logic used by the price-comparison chart — so only bids on the same
  // (or similar) item family are shown, preventing unrelated work types from
  // bleeding in.  When there is no itemCode (legacy data) we fall back to
  // workType matching, identical to the legacy comparison fallback above.
  const contractorNameKey = contractor ? normalize(contractor.contractor) : "";
  const workHistory: Contractor[] = contractor && contractorNameKey.length > 0
    ? (() => {
        const sameContractor = (c: Contractor) =>
          c.id !== contractor.id && normalize(c.contractor) === contractorNameKey;

        if (hasCode) {
          // Similar tier — same first 5 code slots
          if (prefix5) {
            const similar = allContractors.filter((c) => {
              if (!sameContractor(c)) return false;
              const code = (c as any).itemCode as string | null | undefined;
              return !!code && code.startsWith(prefix5);
            });
            if (similar.length > 0) return similar.slice(0, 50);
          }
          // Broad tier — same first 3 code slots
          if (prefix3) {
            const broad = allContractors.filter((c) => {
              if (!sameContractor(c)) return false;
              const code = (c as any).itemCode as string | null | undefined;
              return !!code && code.startsWith(prefix3);
            });
            if (broad.length > 0) return broad.slice(0, 50);
          }
        }

        // Legacy fallback — no itemCode on current record (or no prefix match found)
        const workTypeKey = normalize(contractor.workType ?? "");
        return allContractors
          .filter((c) => sameContractor(c) && normalize(c.workType) === workTypeKey)
          .slice(0, 50);
      })()
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
    // Show avg only when at least one contractor has a price strictly between min and max.
    // Without a true middle value the avg collapses to the same price as min or max.
    hasMidContractor
      ? {
          label: "متوسط الأسعار لهذا البند",
          sub2: (() => {
            const n = contractorsAtAvgPrice.length;
            if (n > 1) return `${contractorAtAvgCycle?.contractor ?? "—"} (${avgCycleIdx % n + 1}/${n})`;
            return contractorAtAvgCycle?.contractor ?? "—";
          })(),
          value: formatExact(contractorAtAvgCycle?.price ?? avgPriceRounded),
          color: "#3b8fcc",
          id: contractorAtAvgCycle?.id ?? null,
          rawPrice: contractorAtAvgCycle?.price ?? avgPriceRounded,
          cycleCount: contractorsAtAvgPrice.length, cyclePos: avgCycleIdx,
        }
      : {
          label: "متوسط الأسعار لهذا البند",
          sub2: "لا يوجد سعر متوسط",
          value: "—",
          color: "#3b8fcc",
          id: null,
          rawPrice: 0,
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
  // النشاط الرئيسي: يُعطى الأولوية لقيمة السجل الحالي، وإذا كانت فارغة
  // نبحث عن أي سجل آخر لنفس المقاول يحتوي على النشاط الرئيسي.
  const rawMainActivity = (contractor as any).mainActivity as string | null | undefined;
  const mainActivity: string | null | undefined = rawMainActivity || (() => {
    const cName = normalize(contractor.contractor);
    const found = allContractors.find(
      (c) => normalize(c.contractor) === cName && !!(c as any).mainActivity
    );
    return found ? ((found as any).mainActivity as string) : undefined;
  })();

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
            {/* Contract number + contract year side by side */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
                {contractor.contractNo}
              </div>
              {contractor.contractYear && (
                <div style={{ fontSize: "0.58rem", color: "rgba(197,160,89,0.6)", background: "rgba(197,160,89,0.1)", borderRadius: "4px", padding: "1px 7px", letterSpacing: "0.04em", fontWeight: 700 }}>
                  {contractor.contractYear}
                </div>
              )}
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
            { icon: <MapPin size={12} />,    label: "المحفظة",        value: contractor.portfolio },
            { icon: <Building2 size={12} />, label: "المشروع",        value: contractor.project },
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
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "1px" }}>نطاق التوصيف الفني للبند</h3>
            <div style={{ fontSize: "0.58rem", color: "#bbb" }}>البيانات الفنية للمقاول المختار</div>
          </div>
          {contractor.itemCode && (
            <div style={{ textAlign: "left", flexShrink: 0, background: "rgba(59,143,204,0.07)", border: "1px solid rgba(59,143,204,0.2)", borderRadius: "8px", padding: "5px 12px" }}>
              <div style={{ fontSize: "0.48rem", color: "#3b8fcc", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "2px" }}>كود الفريد للبند</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--charcoal)", fontFamily: "monospace", letterSpacing: "0.05em" }}>{contractor.itemCode}</div>
            </div>
          )}
        </div>

        {/* الوصف الفني للبند */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "0.55rem", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "7px", fontWeight: 700 }}>الوصف الفني للبند</div>
          <p style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.8, margin: 0, background: "#f9f7f3", borderRadius: "9px", padding: "12px 14px", borderRight: "3px solid var(--gold)" }}>
            {contractor.technicalScope || "—"}
          </p>
        </div>

        {/* Grid 4 أعمدة × صفين:
              صف 1: برنامج الأعمال | عائلة الأعمال | نوع الأعمال | نوع التعاقد
              صف 2: شمولية البند   | مواصفات فنية  | قياسات       | الوحدة       */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 0.62fr", gridTemplateRows: "auto auto", gap: "10px" }}>
          {[
            { label: "برنامج الأعمال", value: contractor.businessProgram || "—", gold: true,  blue: false },
            { label: "عائلة الأعمال",  value: contractor.workFamily      || "—", gold: true,  blue: false },
            { label: "نوع الأعمال",    value: contractor.workType        || "—", gold: false, blue: false },
            { label: "نوع التعاقد",    value: contractor.workCategory    || "—", gold: false, blue: false },
            { label: "شمولية البند",   value: contractor.itemScope       || "—", gold: false, blue: true  },
            { label: "مواصفات فنية",   value: contractor.techSpecs       || "—", gold: false, blue: true  },
            { label: "قياسات",         value: contractor.measurements    || "—", gold: false, blue: true  },
            { label: "الوحدة",         value: contractor.unit            || "—", gold: false, blue: false },
          ].map(({ label, value, gold, blue }) => (
            <div key={label} title={value} style={{
              background: gold ? "linear-gradient(135deg,rgba(197,160,89,0.07),rgba(197,160,89,0.02))"
                         : blue ? "linear-gradient(135deg,rgba(59,143,204,0.05),rgba(59,143,204,0.01))"
                         : "linear-gradient(135deg,rgba(58,54,50,0.04),rgba(58,54,50,0.01))",
              border: `1px solid ${gold ? "rgba(197,160,89,0.2)" : blue ? "rgba(59,143,204,0.15)" : "rgba(58,54,50,0.1)"}`,
              borderRadius: "9px", padding: "10px 12px", minWidth: 0, overflow: "hidden",
              height: "58px", display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <div style={{ fontSize: "0.52rem", color: gold ? "var(--gold)" : blue ? "#3b8fcc" : "#aaa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px", fontWeight: 700, flexShrink: 0 }}>{label}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--charcoal)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. سجل الأعمال المنفذة سابقاً ── */}
      {workHistory.length > 0 && (
        <div className="card animate-fade-up" style={{ marginBottom: "16px", animationDelay: "0.1s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
            <Clock size={14} style={{ color: "var(--gold)" }} />
            <h3 style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--charcoal)" }}>سجل الأعمال المنفذة سابقاً</h3>
            <span style={{ fontSize: "0.62rem", color: "#bbb", background: "#f5f0e8", borderRadius: "4px", padding: "2px 7px", marginRight: "auto" }}>
              {workHistory.length} مشروع • {contractor?.workType}
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
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--charcoal)", marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {w.project}
                  </div>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "nowrap", overflow: "hidden", minWidth: 0 }}>
                    {w.workType && (
                      <span title={w.workType} style={{ fontSize: "0.56rem", background: "rgba(197,160,89,0.1)", border: "1px solid rgba(197,160,89,0.2)", borderRadius: "4px", padding: "1px 6px", color: "var(--gold)", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}>{w.workType}</span>
                    )}
                    {w.itemCode && (
                      <span style={{ fontSize: "0.56rem", background: "rgba(59,143,204,0.08)", border: "1px solid rgba(59,143,204,0.2)", borderRadius: "4px", padding: "1px 6px", color: "#3b8fcc", fontWeight: 700, whiteSpace: "nowrap", fontFamily: "monospace", flexShrink: 0 }}>{w.itemCode}</span>
                    )}
                    {!w.itemCode && w.technicalScope && (
                      <span title={w.technicalScope} style={{ fontSize: "0.58rem", color: "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1 1 0", minWidth: 0 }}>{w.technicalScope}</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "left", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: BAR_COLORS[i % BAR_COLORS.length], direction: "ltr" }}>
                    {formatExact(w.price)} ر.س
                  </div>
                  <div style={{ fontSize: "0.56rem", color: "#bbb", direction: "ltr", marginTop: "2px", whiteSpace: "nowrap" }}>
                    {w.contractNo}
                    {w.contractYear && (
                      <span style={{ color: "var(--gold)", fontWeight: 700, marginRight: "4px" }}> · {w.contractYear}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. مقارنة الأسعار — مرتبة حسب أفضل قيمة (نفس مجموعة البند: برنامج الأعمال + نوع الأعمال) ── */}
      {best5.length > 0 && (() => {
        const maxBestScore = Math.max(...best5.map((x) => (x as any)._bestValueScore ?? 0), 0.001);
        return (
          <div className="card animate-fade-up" style={{ marginBottom: "16px", animationDelay: "0.15s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--charcoal)", display: "flex", alignItems: "center", gap: "7px" }}>
                <DollarSign size={13} style={{ color: "var(--gold)" }} />
                مقارنة الأسعار
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {renderTierTabs(false)}
                {renderMaskRibbon(false)}
                {renderRankChip(false)}
                {renderDeviationChip()}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {best5.map((c, i) => {
                const isCurrent   = contractor && c.id === contractor.id;
                const cRating     = Math.max(0, Math.min(5, Math.round(Number((c as any).rating ?? 0))));
                const score       = (c as any)._bestValueScore ?? 0;
                const barWidthPct = (score / maxBestScore) * 100;
                const barColor    = isCurrent
                  ? "linear-gradient(90deg, var(--gold), #e8c870)"
                  : i === 0 ? "linear-gradient(90deg, #2baa74, #36c786)" : BAR_COLORS[i % BAR_COLORS.length];
                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectId(c.id)}
                    style={{ display: "flex", flexDirection: "column", gap: "4px", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "18px", height: "18px", borderRadius: "5px", background: i === 0 ? "#2baa74" : isCurrent ? "var(--gold)" : "#e0dbd0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "0.55rem", fontWeight: 800, color: i === 0 || isCurrent ? "#fff" : "#aaa" }}>{i + 1}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.7rem", color: isCurrent ? "var(--gold)" : "var(--charcoal)", fontWeight: isCurrent ? 800 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.contractor}
                        </div>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center", marginTop: "1px" }}>
                          {c.project && (
                            <span style={{ fontSize: "0.54rem", color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>{c.project}</span>
                          )}
                          {c.itemCode && (
                            <span style={{ fontSize: "0.52rem", background: "rgba(59,143,204,0.07)", border: "1px solid rgba(59,143,204,0.18)", borderRadius: "3px", padding: "0px 4px", color: "#3b8fcc", fontFamily: "monospace", flexShrink: 0, whiteSpace: "nowrap" }}>{c.itemCode}</span>
                          )}
                        </div>
                      </div>
                      {/* Rating stars */}
                      <span style={{ display: "inline-flex", gap: "1px", flexShrink: 0, alignSelf: "flex-start", marginTop: "2px" }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} style={{ fontSize: "0.6rem", color: s <= cRating ? "#f5c518" : "#e0dbd0", lineHeight: 1 }}>★</span>
                        ))}
                      </span>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, color: i === 0 ? "#2baa74" : isCurrent ? "var(--gold)" : "#888", flexShrink: 0, direction: "ltr", alignSelf: "flex-start", marginTop: "2px" }}>
                        {formatExact(c.price)}
                      </span>
                    </div>
                    {/* Bar width = best-value score so rank #1 always gets the widest bar */}
                    <div style={{ background: "#f5f0e8", borderRadius: "5px", overflow: "hidden", height: "7px" }}>
                      <div
                        style={{
                          width: `${barWidthPct}%`,
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
              مرتبة حسب أفضل قيمة (60% سعر + 40% تقييم) • مستوى المقارنة: <strong style={{ color: activeTierColor }}>{tierMeta.label}</strong> ({scopePoolSize} {scopePoolSize === 1 ? "سجل" : "سجلات"}) • اضغط لعرض بيانات أي مقاول
            </div>
          </div>
        );
      })()}

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
          <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <span style={{ fontSize: "0.62rem", color: "rgba(197,160,89,0.85)", fontWeight: 700, letterSpacing: "0.05em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              تحليل الأسعار • {poolLabel}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {renderTierTabs(true)}
              {renderMaskRibbon(true)}
              {renderRankChip(true)}
              {renderDeviationChip()}
            </div>
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
                    const scrollToTop = () => requestAnimationFrame(() => {
                      const area = document.querySelector<HTMLElement>(".content-area");
                      if (area) area.scrollTo({ top: 0, behavior: "smooth" });
                      else window.scrollTo({ top: 0, behavior: "smooth" });
                    });

                    // ── Cycling logic for min (i=1), avg (i=2), max (i=3) ──
                    // First click on the cell → navigate to what is currently displayed.
                    // Repeated clicks on the SAME active cell → advance to the next contractor.
                    if (i === 1 && contractorsAtMin.length > 1) {
                      const curIdx  = minCycleIdx % contractorsAtMin.length;
                      const nextIdx = activeStat === 1
                        ? (curIdx + 1) % contractorsAtMin.length  // already active → advance
                        : curIdx;                                   // first click → show current
                      setMinCycleIdx(nextIdx);
                      skipStatReset.current = true;
                      onSelectId(contractorsAtMin[nextIdx].id);
                      scrollToTop();
                      return;
                    }
                    if (i === 2 && contractorsAtAvgPrice.length > 1) {
                      const curIdx  = avgCycleIdx % contractorsAtAvgPrice.length;
                      const nextIdx = activeStat === 2
                        ? (curIdx + 1) % contractorsAtAvgPrice.length
                        : curIdx;
                      setAvgCycleIdx(nextIdx);
                      skipStatReset.current = true;
                      onSelectId(contractorsAtAvgPrice[nextIdx].id);
                      scrollToTop();
                      return;
                    }
                    if (i === 3 && contractorsAtMax.length > 1) {
                      const curIdx  = maxCycleIdx % contractorsAtMax.length;
                      const nextIdx = activeStat === 3
                        ? (curIdx + 1) % contractorsAtMax.length
                        : curIdx;
                      setMaxCycleIdx(nextIdx);
                      skipStatReset.current = true;
                      onSelectId(contractorsAtMax[nextIdx].id);
                      scrollToTop();
                      return;
                    }
                    // Default: navigate to the stat's contractor (single contractor or avg fallback)
                    if (stat.id != null) {
                      skipStatReset.current = true;
                      onSelectId(stat.id);
                      scrollToTop();
                    }
                  }}
                  style={{
                    padding: "16px 10px", textAlign: "center",
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
                  <div style={{ fontSize: "0.6rem", color: isActive ? stat.color : "rgba(255,255,255,0.45)", letterSpacing: "0.02em", marginBottom: "6px", lineHeight: 1.4, fontWeight: isActive ? 700 : 400, wordBreak: "keep-all", overflowWrap: "break-word" }}>{stat.label}</div>
                  <div style={{ fontSize: "1rem", fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: "3px", direction: "ltr", fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: isActive ? `0 0 14px ${colorHex}88` : "none" }}>{stat.value}</div>
                  <div style={{ fontSize: "0.56rem", color: isActive ? `${colorHex}99` : "rgba(255,255,255,0.25)", marginBottom: "5px" }}>ريال سعودي</div>
                  <div style={{ fontSize: "0.56rem", color: isActive ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)", textAlign: "center", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stat.sub2}</div>
                </div>
              );
            })}
          </div>

          {/* Custom price comparison indicator — updates live based on clicked stat cell */}
          {customPrice && customPrice > 0 && scopePoolSize > 0 && (() => {
            // Use the clicked stat (1=min, 2=avg, 3=max); if index 0 (السعر المقارن itself) fall back to min
            const refIdx   = activeStat > 0 && activeStat <= 3 ? activeStat : 1;
            const refStat  = footerStats[refIdx];
            const refPrice = refStat?.rawPrice ?? Math.round(avgPrice);
            const diff     = Math.round(Math.abs(customPrice - refPrice));
            const pct      = refPrice > 0 ? ((diff / refPrice) * 100).toFixed(1) : "0.0";
            const isHigher = customPrice > refPrice;
            const isEqual  = diff === 0;
            const refLabel = refStat?.label ?? "الأدنى";
            // Note color = color of the ACTIVE cell (not the reference cell)
            // so each cell lights up the note strip in its own color
            const noteColor = footerStats[activeStat]?.color ?? refStat?.color ?? "#9b59b6";
            const text = isEqual
              ? `السعر المقارن (${formatExact(customPrice)}) يساوي ${refLabel}`
              : isHigher
                ? `▲ السعر المقارن (${formatExact(customPrice)}) أعلى من ${refLabel} بـ ${formatExact(diff)} ر.س (${pct}%)`
                : `✓ السعر المقارن (${formatExact(customPrice)}) أقل من ${refLabel} بـ ${formatExact(diff)} ر.س (${pct}%)`;
            return (
              <div style={{ padding: "8px 16px", borderTop: `1px solid ${noteColor}55`, background: `${noteColor}14`, textAlign: "center", transition: "background 0.25s, border-color 0.25s" }}>
                <span style={{ fontSize: "0.6rem", color: noteColor, fontWeight: 700 }}>{text}</span>
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
