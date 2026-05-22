import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useContractorsContext } from "../contractors/context";
import type { Contractor } from "../contractors/types";
import type { FilterState } from "./filterTypes";
import { EMPTY_FILTERS } from "./filterTypes";

interface FilterBarProps {
  filters:         FilterState;
  onFiltersChange: (f: FilterState) => void;
  search?:         string;
}

/* ── Arabic normalizer for in-dropdown search ── */
function normalize(s: string) {
  return (s ?? "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

/* ── Extract unique, sorted, non-empty values from a field ── */
function getUnique(contractors: Contractor[], getter: (c: Contractor) => string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of contractors) {
    const val = (getter(c) ?? "").trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      result.push(val);
    }
  }
  return result.sort((a, b) => a.localeCompare(b, "ar"));
}

/* ── Exact-match (for filter pills) ── */
function strictMatch(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return normalize(haystack) === normalize(needle);
}

/* ── Contains-match (for the global search bar) ── */
function matchesSearch(c: Contractor, q: string): boolean {
  if (!q) return true;
  const n = normalize(q);
  return [
    c.contractNo, c.contractor, c.project, c.portfolio,
    c.workType, c.technicalScope,
    c.businessProgram  ?? "",
    c.workFamily       ?? "",
    c.workCategory     ?? "",
    c.mainActivity     ?? "",
    c.itemScope        ?? "",
    c.techSpecs        ?? "",
    c.measurements     ?? "",
    c.unit             ?? "",
    String(c.price ?? ""),
    c.phone ?? "", c.email ?? "",
  ].some((field) => normalize(String(field)).includes(n));
}

/* ── Filter → DB column mapping ── */
const FILTER_DEFS: {
  key:    keyof FilterState;
  label:  string;
  getter: (c: Contractor) => string;
}[] = [
  { key: "contractor",      label: "المقاول / المورد",  getter: (c) => c.contractor },
  { key: "portfolio",       label: "المحفظة",            getter: (c) => c.portfolio },
  { key: "mainActivity",    label: "النشاط الرئيسي",     getter: (c) => c.mainActivity     ?? "" },
  { key: "businessProgram", label: "برنامج الأعمال",     getter: (c) => c.businessProgram  ?? "" },
  { key: "workFamily",      label: "عائلة الأعمال",      getter: (c) => c.workFamily       ?? "" },
  { key: "workType",        label: "نوع الأعمال",        getter: (c) => c.workType },
  { key: "itemScope",       label: "شمولية البند",       getter: (c) => c.itemScope        ?? "" },
  { key: "techSpecs",       label: "مواصفات فنية",       getter: (c) => c.techSpecs        ?? "" },
  { key: "measurements",    label: "قياسات",             getter: (c) => c.measurements     ?? "" },
  { key: "workCategory",    label: "نوع التعاقد",        getter: (c) => c.workCategory     ?? "" },
];

/* ═══════════════════════════════════════════════════════════
   Single dropdown — portal-based so it escapes any overflow /
   stacking-context boundary inside the header.
   ═══════════════════════════════════════════════════════════ */
function FilterDropdown({
  label,
  value,
  allOptions,
  onSelect,
  onClear,
}: {
  label:      string;
  value:      string;
  allOptions: string[];   // full list; computed lazily by parent when open
  onSelect:   (v: string) => void;
  onClear:    () => void;
}) {
  const [open, setOpen]               = useState(false);
  const [innerSearch, setInnerSearch] = useState("");
  const [rect, setRect]               = useState<DOMRect | null>(null);

  const triggerRef   = useRef<HTMLButtonElement>(null);
  const searchRef    = useRef<HTMLInputElement>(null);
  const panelRef     = useRef<HTMLDivElement>(null);

  const isActive = value !== "";

  /* Measure trigger position whenever the dropdown opens */
  function openDropdown() {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(true);
    setInnerSearch("");
  }

  /* Close on outside click (anywhere in document) */
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
      setInnerSearch("");
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* Close on scroll / resize so portal position stays consistent */
  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); setInnerSearch(""); };
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close, { passive: true });
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  /* Auto-focus inner search when panel mounts */
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 60);
  }, [open]);

  /* Portal panel position: anchored below the trigger button */
  const panelStyle: React.CSSProperties = rect
    ? {
        position:  "fixed",
        top:       rect.bottom + 8,
        right:     window.innerWidth - rect.right,
        width:     "max-content",
        minWidth:  Math.max(rect.width, 210),
        maxWidth:  340,
        zIndex:    9999,
      }
    : { display: "none" };

  /* Options filtered by the in-dropdown search */
  const filteredOpts = useMemo(
    () => allOptions.filter((o) => normalize(o).includes(normalize(innerSearch))),
    [allOptions, innerSearch],
  );

  function handleSelect(v: string) {
    onSelect(v);
    setOpen(false);
    setInnerSearch("");
  }

  /* ── Trigger pill ── */
  const pillStyle: React.CSSProperties = {
    display:        "flex",
    alignItems:     "center",
    gap:            "4px",
    padding:        "4px 9px",
    borderRadius:   "20px",
    border:         isActive ? "1.5px solid var(--gold)" : "1.5px solid rgba(197,160,89,0.30)",
    background:     isActive ? "rgba(197,160,89,0.18)" : "rgba(255,255,255,0.08)",
    color:          isActive ? "var(--gold)" : "rgba(255,255,255,0.80)",
    fontSize:       "0.63rem",
    fontWeight:     isActive ? 700 : 500,
    fontFamily:     "Tajawal, sans-serif",
    cursor:         "pointer",
    whiteSpace:     "nowrap",
    backdropFilter: "blur(8px)",
    boxShadow:      isActive ? "0 0 12px rgba(197,160,89,0.22)" : "none",
    letterSpacing:  "0.01em",
    transition:     "all 0.18s",
    flexShrink:     0,
  };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        onClick={() => (open ? (setOpen(false), setInnerSearch("")) : openDropdown())}
        style={pillStyle}
        onMouseEnter={(e) => {
          if (!isActive) {
            const b = e.currentTarget;
            b.style.borderColor = "rgba(197,160,89,0.55)";
            b.style.background  = "rgba(255,255,255,0.13)";
            b.style.color       = "#fff";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            const b = e.currentTarget;
            b.style.borderColor = "rgba(197,160,89,0.30)";
            b.style.background  = "rgba(255,255,255,0.08)";
            b.style.color       = "rgba(255,255,255,0.80)";
          }
        }}
      >
        <span style={{ maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis" }}>
          {isActive ? value : label}
        </span>

        {isActive ? (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "16px", height: "16px", borderRadius: "50%",
              background: "rgba(197,160,89,0.35)", color: "var(--gold)",
              cursor: "pointer", flexShrink: 0, transition: "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(197,160,89,0.6)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(197,160,89,0.35)")}
          >
            <X size={9} />
          </span>
        ) : (
          <ChevronDown
            size={12}
            style={{
              transition: "transform 0.18s",
              transform:  open ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          />
        )}
      </button>

      {/* ── Portal Panel — renders at <body> to escape all overflow contexts ── */}
      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            ...panelStyle,
            background:     "rgba(22,18,14,0.98)",
            border:         "1.5px solid rgba(197,160,89,0.28)",
            borderRadius:   "13px",
            boxShadow:      "0 20px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(197,160,89,0.06)",
            overflow:       "hidden",
            backdropFilter: "blur(24px)",
            animation:      "filterDropIn 0.15s ease",
          }}
        >
          {/* ── Inner search ── */}
          <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid rgba(197,160,89,0.10)", background: "rgba(197,160,89,0.04)" }}>
            <input
              ref={searchRef}
              type="text"
              placeholder={`بحث في ${label}...`}
              value={innerSearch}
              onChange={(e) => setInnerSearch(e.target.value)}
              style={{
                width: "100%", padding: "7px 11px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(197,160,89,0.22)",
                borderRadius: "8px",
                fontSize: "0.72rem", fontFamily: "Tajawal, sans-serif",
                direction: "rtl", color: "#fff", outline: "none",
                boxSizing: "border-box", transition: "border-color 0.18s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(197,160,89,0.75)")}
              onBlur={(e)  => (e.target.style.borderColor = "rgba(197,160,89,0.22)")}
            />
          </div>

          {/* ── Scrollable options ── */}
          <div className="dark-scroll" style={{ maxHeight: "260px", overflowY: "auto" }}>
            {filteredOpts.length === 0 ? (
              <div style={{ padding: "18px 14px", textAlign: "center", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontFamily: "Tajawal, sans-serif" }}>
                لا توجد نتائج مطابقة
              </div>
            ) : filteredOpts.map((opt) => {
              const sel = opt === value;
              return (
                <div
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: "9px 14px", fontSize: "0.75rem",
                    fontFamily: "Tajawal, sans-serif", direction: "rtl",
                    cursor: "pointer",
                    color:       sel ? "var(--gold)" : "rgba(255,255,255,0.80)",
                    background:  sel ? "rgba(197,160,89,0.10)" : "transparent",
                    fontWeight:  sel ? 700 : 400,
                    borderRight: sel ? "3px solid var(--gold)" : "3px solid transparent",
                    transition:  "background 0.12s, color 0.12s",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!sel) {
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(197,160,89,0.07)";
                      (e.currentTarget as HTMLDivElement).style.color      = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!sel) {
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      (e.currentTarget as HTMLDivElement).style.color      = "rgba(255,255,255,0.80)";
                    }
                  }}
                >
                  <span>{opt}</span>
                  {sel && <span style={{ fontSize: "0.65rem", color: "var(--gold)", flexShrink: 0 }}>✓</span>}
                </div>
              );
            })}
          </div>

          {/* ── Footer count ── */}
          <div style={{ padding: "5px 14px", borderTop: "1px solid rgba(197,160,89,0.07)", fontSize: "0.6rem", color: "rgba(255,255,255,0.22)", textAlign: "center", fontFamily: "Tajawal, sans-serif" }}>
            {filteredOpts.length} خيار متاح
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PriceInputPill — inline number entry in the same pill row
   ═══════════════════════════════════════════════════════════ */
function PriceInputPill({
  value,
  onChange,
  onClear,
  disabled,
}: {
  value:    string;
  onChange: (v: string) => void;
  onClear:  () => void;
  disabled: boolean;
}) {
  const isActive = !disabled && value.trim() !== "";

  const pillStyle: React.CSSProperties = {
    display:        "flex",
    alignItems:     "center",
    gap:            "4px",
    padding:        "2px 7px 2px 8px",
    borderRadius:   "20px",
    border:         disabled
      ? "1.5px solid rgba(197,160,89,0.12)"
      : isActive ? "1.5px solid var(--gold)" : "1.5px solid rgba(197,160,89,0.30)",
    background:     disabled
      ? "rgba(255,255,255,0.03)"
      : isActive ? "rgba(197,160,89,0.18)" : "rgba(255,255,255,0.08)",
    backdropFilter: "blur(8px)",
    boxShadow:      isActive ? "0 0 12px rgba(197,160,89,0.22)" : "none",
    transition:     "all 0.18s",
    flexShrink:     0,
    whiteSpace:     "nowrap",
    opacity:        disabled ? 0.38 : 1,
    cursor:         disabled ? "not-allowed" : "default",
  };

  return (
    <div style={pillStyle} title={disabled ? "يُفعَّل عند كتابة نص في البحث أو تحديد فلتر آخر" : undefined}>
      <span style={{ fontSize: "0.57rem", color: isActive ? "var(--gold)" : "rgba(255,255,255,0.55)", fontWeight: 600, fontFamily: "Tajawal, sans-serif", flexShrink: 0 }}>
        سعر البند
      </span>
      <input
        type="number"
        min={0}
        placeholder="0"
        value={value}
        disabled={disabled}
        onChange={(e) => !disabled && onChange(e.target.value)}
        className="price-no-spin"
        style={{
          width:       "40px",
          background:  "transparent",
          border:      "none",
          outline:     "none",
          fontSize:    "0.57rem",
          fontWeight:  isActive ? 700 : 400,
          color:       isActive ? "var(--gold)" : "rgba(255,255,255,0.45)",
          fontFamily:  "Tajawal, sans-serif",
          direction:   "ltr",
          textAlign:   "right",
          cursor:      disabled ? "not-allowed" : "text",
        }}
        onFocus={(e) => {
          if (disabled) return;
          (e.currentTarget.parentElement as HTMLDivElement).style.borderColor = "rgba(197,160,89,0.75)";
          (e.currentTarget.parentElement as HTMLDivElement).style.background  = "rgba(197,160,89,0.22)";
        }}
        onBlur={(e) => {
          if (disabled) return;
          (e.currentTarget.parentElement as HTMLDivElement).style.borderColor = isActive ? "var(--gold)" : "rgba(197,160,89,0.30)";
          (e.currentTarget.parentElement as HTMLDivElement).style.background  = isActive ? "rgba(197,160,89,0.18)" : "rgba(255,255,255,0.08)";
        }}
      />
      {isActive && (
        <span
          onClick={onClear}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "16px", height: "16px", borderRadius: "50%",
            background: "rgba(197,160,89,0.35)", color: "var(--gold)",
            cursor: "pointer", flexShrink: 0, transition: "background 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(197,160,89,0.6)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(197,160,89,0.35)")}
        >
          <X size={9} />
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FilterBar — main export
   ═══════════════════════════════════════════════════════════ */
export default function FilterBar({ filters, onFiltersChange, search = "" }: FilterBarProps) {
  const { data: contractors = [], isLoading, filterOptions } = useContractorsContext();

  /* ── Options strategy ─────────────────────────────────────────────────────
     1. SERVER BASE (`filterOptions`): fetched once on app load via a single
        lightweight SQL DISTINCT query — contains ALL possible values from the
        entire database regardless of how much data has been progressively loaded.
     2. CASCADING NARROWING: when the user activates a filter or types in the
        search bar, we narrow options to only values compatible with the current
        selection using the in-memory loaded records.
        • If the cascaded set is non-empty → use it (most precise).
        • If cascaded set is empty (data not yet fully loaded, or no match) →
          fall back to the complete server base so dropdowns never appear empty.
  ───────────────────────────────────────────────────────────────────────── */
  const options = useMemo((): Record<keyof FilterState, string[]> => {
    const all = contractors as Contractor[];
    const map = {} as Record<keyof FilterState, string[]>;

    for (const def of FILTER_DEFS) {
      /* Full server-provided list for this field (may be null on first render).
         `itemPrice` is a text input, not in FilterOptionsMap — safe to cast. */
      type FOMKey = keyof import("../contractors/api").FilterOptionsMap;
      const serverBase: string[] =
        filterOptions && (def.key as string) in filterOptions
          ? filterOptions[def.key as FOMKey]
          : [];

      /* Is any narrowing needed? (search text or another filter is active) */
      const needNarrowing =
        search.trim() !== "" ||
        FILTER_DEFS.some((other) => other.key !== def.key && filters[other.key] !== "");

      if (!needNarrowing) {
        /* No active context → show complete server list */
        map[def.key] = serverBase.length > 0 ? serverBase : getUnique(all, def.getter);
        continue;
      }

      /* Cascading: filter in-memory pool to records matching search + other filters */
      const pool = all.filter((c) => {
        if (!matchesSearch(c, search)) return false;
        for (const other of FILTER_DEFS) {
          if (other.key === def.key) continue;
          const activeVal = filters[other.key];
          if (activeVal && !strictMatch(other.getter(c), activeVal)) return false;
        }
        return true;
      });
      const cascaded = getUnique(pool, def.getter);

      /* Fall back to server base if cascaded set is empty (data still loading) */
      map[def.key] = cascaded.length > 0 ? cascaded : serverBase;
    }
    return map;
  }, [contractors, filterOptions, filters, search]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  /* "سعر البند" pill is enabled when there's a search term OR at least one other filter */
  const hasOtherFilters = search.trim() !== "" || FILTER_DEFS.some((def) => filters[def.key] !== "");

  function setFilter(key: keyof FilterState, value: string) {
    onFiltersChange({ ...filters, [key]: value });
  }
  function clearFilter(key: keyof FilterState) {
    onFiltersChange({ ...filters, [key]: "" });
  }
  function clearAll() {
    onFiltersChange(EMPTY_FILTERS);
  }

  return (
    <>
      <style>{`
        @keyframes filterDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .filter-pill-scroll::-webkit-scrollbar { display: none; }
        .filter-pill-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .price-no-spin::-webkit-inner-spin-button,
        .price-no-spin::-webkit-outer-spin-button { -webkit-appearance: none; appearance: none; margin: 0; }
        .price-no-spin { -moz-appearance: textfield; }
      `}</style>

      <div style={{ margin: "8px 0 0" }}>
        {/* Divider — aligned with search bar */}
        <div style={{ borderTop: "1px solid rgba(197,160,89,0.13)", marginBottom: "8px" }} />

        {/* Outer scroll viewport — full width, hides scrollbar, allows horizontal scroll */}
        <div
          className="filter-pill-scroll"
          style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any, paddingBottom: "4px" }}
        >
          {/* Inner flex row — centered when pills fit, expands to min-width when they overflow */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "6px", flexWrap: "nowrap", minWidth: "max-content",
            paddingInline: "8px",
          }}
        >
          {isLoading ? (
            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontFamily: "Tajawal, sans-serif" }}>
              جاري تحميل الفلاتر...
            </span>
          ) : (
            <>
              {FILTER_DEFS.map((def) => (
                <FilterDropdown
                  key={def.key}
                  label={def.label}
                  value={filters[def.key]}
                  allOptions={options[def.key] ?? []}
                  onSelect={(v) => setFilter(def.key, v)}
                  onClear={() => clearFilter(def.key)}
                />
              ))}
              <PriceInputPill
                value={filters.itemPrice}
                onChange={(v) => setFilter("itemPrice", v)}
                onClear={() => clearFilter("itemPrice")}
                disabled={!hasOtherFilters}
              />
            </>
          )}

          {/* Clear-all button — shown only when at least one filter is active */}
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "2px 5px", borderRadius: "20px",
                border: "1px solid rgba(231,76,60,0.4)",
                background: "rgba(231,76,60,0.10)",
                color: "rgba(231,76,60,0.85)",
                fontSize: "0.52rem", fontWeight: 700,
                fontFamily: "Tajawal, sans-serif",
                cursor: "pointer", whiteSpace: "nowrap",
                flexShrink: 0, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget;
                b.style.background  = "rgba(231,76,60,0.20)";
                b.style.borderColor = "rgba(231,76,60,0.70)";
                b.style.color       = "rgba(231,76,60,1)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget;
                b.style.background  = "rgba(231,76,60,0.10)";
                b.style.borderColor = "rgba(231,76,60,0.40)";
                b.style.color       = "rgba(231,76,60,0.85)";
              }}
            >
              <X size={10} />
              مسح الكل ({activeCount})
            </button>
          )}
          </div>{/* end inner flex row */}
        </div>{/* end outer scroll viewport */}

      </div>
    </>
  );
}
