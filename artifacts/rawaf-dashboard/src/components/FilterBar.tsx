import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useListContractors } from "@workspace/api-client-react";
import type { Contractor } from "@workspace/api-client-react";
import type { FilterState } from "./filterTypes";
import { EMPTY_FILTERS } from "./filterTypes";

interface FilterBarProps {
  filters:         FilterState;
  onFiltersChange: (f: FilterState) => void;
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

/* ── Filter → DB column mapping ── */
const FILTER_DEFS: {
  key:    keyof FilterState;
  label:  string;
  getter: (c: Contractor) => string;
}[] = [
  { key: "contractor",      label: "المقاول / المورد",  getter: (c) => c.contractor },
  { key: "portfolio",       label: "المحفظة",            getter: (c) => c.portfolio },
  { key: "project",         label: "المشروع",            getter: (c) => c.project },
  { key: "businessProgram", label: "برنامج الأعمال",     getter: (c) => (c as any).businessProgram ?? "" },
  { key: "workType",        label: "نوع الأعمال",        getter: (c) => c.workType },
  { key: "workCategory",    label: "نوع البند",          getter: (c) => (c as any).workCategory ?? "" },
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
    gap:            "6px",
    padding:        "7px 14px",
    borderRadius:   "20px",
    border:         isActive ? "1.5px solid var(--gold)" : "1.5px solid rgba(197,160,89,0.30)",
    background:     isActive ? "rgba(197,160,89,0.18)" : "rgba(255,255,255,0.08)",
    color:          isActive ? "var(--gold)" : "rgba(255,255,255,0.80)",
    fontSize:       "0.73rem",
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
          <div style={{ maxHeight: "260px", overflowY: "auto" }}>
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
   FilterBar — main export
   ═══════════════════════════════════════════════════════════ */
export default function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  /* Single shared API call — React Query caches it across the app */
  const { data: contractors = [], isLoading } = useListContractors();

  /* Compute all unique-value lists up-front from cached data */
  const options = useMemo((): Record<keyof FilterState, string[]> => {
    const map = {} as Record<keyof FilterState, string[]>;
    for (const def of FILTER_DEFS) {
      map[def.key] = getUnique(contractors as Contractor[], def.getter);
    }
    return map;
  }, [contractors]);

  const activeCount = Object.values(filters).filter(Boolean).length;

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
      `}</style>

      <div style={{ marginTop: "14px", maxWidth: "720px", margin: "14px auto 0" }}>
        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(197,160,89,0.13)", marginBottom: "12px" }} />

        {/* Pills row */}
        <div
          className="filter-pill-scroll"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "8px", overflowX: "auto", flexWrap: "wrap", rowGap: "6px",
          }}
        >
          {isLoading ? (
            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontFamily: "Tajawal, sans-serif" }}>
              جاري تحميل الفلاتر...
            </span>
          ) : (
            FILTER_DEFS.map((def) => (
              <FilterDropdown
                key={def.key}
                label={def.label}
                value={filters[def.key]}
                allOptions={options[def.key] ?? []}
                onSelect={(v) => setFilter(def.key, v)}
                onClear={() => clearFilter(def.key)}
              />
            ))
          )}

          {/* Clear-all button — shown only when at least one filter is active */}
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "7px 13px", borderRadius: "20px",
                border: "1.5px solid rgba(231,76,60,0.4)",
                background: "rgba(231,76,60,0.10)",
                color: "rgba(231,76,60,0.85)",
                fontSize: "0.68rem", fontWeight: 700,
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
        </div>

        {/* Status hint */}
        <div style={{ textAlign: "center", marginTop: "8px" }}>
          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em", fontFamily: "Tajawal, sans-serif" }}>
            {activeCount > 0
              ? `${activeCount} فلتر نشط — النتائج تتحدث تلقائياً`
              : "اختر فلتراً لتضييق نطاق البحث"}
          </span>
        </div>
      </div>
    </>
  );
}
