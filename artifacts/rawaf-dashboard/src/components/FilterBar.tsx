import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, X } from "lucide-react";
import { useListContractors } from "@workspace/api-client-react";
import type { Contractor } from "@workspace/api-client-react";
import type { FilterState } from "./filterTypes";
import { EMPTY_FILTERS } from "./filterTypes";

interface FilterBarProps {
  filters:          FilterState;
  onFiltersChange:  (f: FilterState) => void;
}

/* ── Helpers ── */
function normalize(s: string) {
  return (s ?? "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

function getUnique(contractors: Contractor[], getter: (c: Contractor) => string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of contractors) {
    const val = getter(c).trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      result.push(val);
    }
  }
  return result.sort((a, b) => a.localeCompare(b, "ar"));
}

/* ── Filter descriptors ── */
const FILTER_DEFS: { key: keyof FilterState; label: string; getter: (c: Contractor) => string }[] = [
  { key: "contractor",      label: "المقاول / المورد",  getter: (c) => c.contractor },
  { key: "portfolio",       label: "المحفظة",           getter: (c) => c.portfolio },
  { key: "project",         label: "المشروع",           getter: (c) => c.project },
  { key: "businessProgram", label: "برنامج الأعمال",    getter: (c) => (c as any).businessProgram ?? "" },
  { key: "workType",        label: "نوع الأعمال",       getter: (c) => c.workType },
  { key: "workCategory",    label: "نوع البند",         getter: (c) => (c as any).workCategory ?? "" },
];

/* ── Single Dropdown ── */
function FilterDropdown({
  label,
  value,
  options,
  onSelect,
  onClear,
}: {
  label:    string;
  value:    string;
  options:  string[];
  onSelect: (v: string) => void;
  onClear:  () => void;
}) {
  const [open, setOpen]               = useState(false);
  const [innerSearch, setInnerSearch] = useState("");
  const containerRef                  = useRef<HTMLDivElement>(null);
  const searchInputRef                = useRef<HTMLInputElement>(null);

  const isActive = value !== "";

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setInnerSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  /* Auto-focus search field when dropdown opens */
  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 60);
  }, [open]);

  const filteredOpts = options.filter((o) => normalize(o).includes(normalize(innerSearch)));

  function handleSelect(v: string) {
    onSelect(v);
    setOpen(false);
    setInnerSearch("");
  }

  return (
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
      {/* ── Trigger pill ── */}
      <button
        onClick={() => { setOpen((p) => !p); setInnerSearch(""); }}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            "6px",
          padding:        "7px 14px",
          borderRadius:   "20px",
          border:         isActive ? "1.5px solid var(--gold)" : "1.5px solid rgba(197,160,89,0.3)",
          background:     isActive ? "rgba(197,160,89,0.18)" : "rgba(255,255,255,0.08)",
          color:          isActive ? "var(--gold)" : "rgba(255,255,255,0.80)",
          fontSize:       "0.73rem",
          fontWeight:     isActive ? 700 : 500,
          fontFamily:     "Tajawal, sans-serif",
          cursor:         "pointer",
          whiteSpace:     "nowrap",
          transition:     "all 0.18s",
          backdropFilter: "blur(8px)",
          boxShadow:      isActive ? "0 0 12px rgba(197,160,89,0.22)" : "none",
          letterSpacing:  "0.01em",
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          if (!isActive) {
            btn.style.borderColor = "rgba(197,160,89,0.55)";
            btn.style.background  = "rgba(255,255,255,0.13)";
            btn.style.color       = "#fff";
          }
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          if (!isActive) {
            btn.style.borderColor = "rgba(197,160,89,0.3)";
            btn.style.background  = "rgba(255,255,255,0.08)";
            btn.style.color       = "rgba(255,255,255,0.80)";
          }
        }}
      >
        <span style={{ maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis" }}>
          {isActive ? value : label}
        </span>

        {isActive ? (
          /* Clear (×) badge */
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{
              display:         "inline-flex",
              alignItems:      "center",
              justifyContent:  "center",
              width:           "16px",
              height:          "16px",
              borderRadius:    "50%",
              background:      "rgba(197,160,89,0.35)",
              color:           "var(--gold)",
              cursor:          "pointer",
              flexShrink:      0,
              transition:      "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(197,160,89,0.6)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(197,160,89,0.35)")}
          >
            <X size={9} />
          </span>
        ) : (
          <ChevronDown
            size={12}
            style={{ transition: "transform 0.18s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
          />
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          style={{
            position:       "absolute",
            top:            "calc(100% + 8px)",
            right:          0,
            /* auto-fit width to longest content; min 200px */
            width:          "max-content",
            minWidth:       "200px",
            maxWidth:       "320px",
            background:     "rgba(22,18,14,0.98)",
            border:         "1.5px solid rgba(197,160,89,0.28)",
            borderRadius:   "13px",
            boxShadow:      "0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(197,160,89,0.06)",
            zIndex:         2000,
            overflow:       "hidden",
            backdropFilter: "blur(20px)",
            animation:      "filterDropIn 0.15s ease",
          }}
        >
          {/* Fixed search header */}
          <div
            style={{
              padding:         "10px 10px 8px",
              borderBottom:    "1px solid rgba(197,160,89,0.10)",
              background:      "rgba(197,160,89,0.04)",
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`بحث في ${label}...`}
              value={innerSearch}
              onChange={(e) => setInnerSearch(e.target.value)}
              style={{
                width:       "100%",
                padding:     "7px 11px",
                background:  "rgba(255,255,255,0.07)",
                border:      "1px solid rgba(197,160,89,0.22)",
                borderRadius: "8px",
                fontSize:    "0.72rem",
                fontFamily:  "Tajawal, sans-serif",
                direction:   "rtl",
                color:       "#fff",
                outline:     "none",
                boxSizing:   "border-box",
                transition:  "border-color 0.18s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(197,160,89,0.75)")}
              onBlur={(e)  => (e.target.style.borderColor = "rgba(197,160,89,0.22)")}
            />
          </div>

          {/* Scrollable options list */}
          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
            {filteredOpts.length === 0 ? (
              <div style={{ padding: "18px 14px", textAlign: "center", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontFamily: "Tajawal, sans-serif" }}>
                لا توجد نتائج مطابقة
              </div>
            ) : filteredOpts.map((opt) => {
              const isSelected = opt === value;
              return (
                <div
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding:       "9px 14px",
                    fontSize:      "0.75rem",
                    fontFamily:    "Tajawal, sans-serif",
                    direction:     "rtl",
                    cursor:        "pointer",
                    color:         isSelected ? "var(--gold)" : "rgba(255,255,255,0.80)",
                    background:    isSelected ? "rgba(197,160,89,0.10)" : "transparent",
                    fontWeight:    isSelected ? 700 : 400,
                    borderRight:   isSelected ? "3px solid var(--gold)" : "3px solid transparent",
                    transition:    "background 0.12s, color 0.12s",
                    display:       "flex",
                    alignItems:    "center",
                    justifyContent:"space-between",
                    gap:           "12px",
                    whiteSpace:    "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(197,160,89,0.07)";
                      (e.currentTarget as HTMLDivElement).style.color      = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      (e.currentTarget as HTMLDivElement).style.color      = "rgba(255,255,255,0.80)";
                    }
                  }}
                >
                  <span>{opt}</span>
                  {isSelected && <span style={{ fontSize: "0.65rem", color: "var(--gold)", flexShrink: 0 }}>✓</span>}
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          <div style={{ padding: "5px 14px", borderTop: "1px solid rgba(197,160,89,0.07)", fontSize: "0.6rem", color: "rgba(255,255,255,0.22)", textAlign: "center", fontFamily: "Tajawal, sans-serif" }}>
            {filteredOpts.length} خيار متاح
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main FilterBar ── */
export default function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const { data: contractors = [] } = useListContractors();

  const activeCount = Object.values(filters).filter(Boolean).length;

  const options = useCallback((): Record<keyof FilterState, string[]> => {
    const map = {} as Record<keyof FilterState, string[]>;
    for (const def of FILTER_DEFS) {
      map[def.key] = getUnique(contractors as Contractor[], def.getter);
    }
    return map;
  }, [contractors])();

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
          from { opacity: 0; transform: translateY(-5px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .filter-pill-scroll::-webkit-scrollbar { display: none; }
        .filter-pill-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Centered row of filter pills — sits inside the hero banner */}
      <div style={{ marginTop: "14px", maxWidth: "720px", margin: "14px auto 0" }}>
        {/* Divider line */}
        <div style={{ borderTop: "1px solid rgba(197,160,89,0.13)", marginBottom: "12px" }} />

        <div
          className="filter-pill-scroll"
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "8px",
            overflowX:      "auto",
            flexWrap:       "wrap",
            rowGap:         "6px",
          }}
        >
          {FILTER_DEFS.map((def) => (
            <FilterDropdown
              key={def.key}
              label={def.label}
              value={filters[def.key]}
              options={options[def.key] ?? []}
              onSelect={(v) => setFilter(def.key, v)}
              onClear={() => clearFilter(def.key)}
            />
          ))}

          {/* Clear-all — only when filters are active */}
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "5px",
                padding:      "7px 13px",
                borderRadius: "20px",
                border:       "1.5px solid rgba(231,76,60,0.4)",
                background:   "rgba(231,76,60,0.10)",
                color:        "rgba(231,76,60,0.85)",
                fontSize:     "0.68rem",
                fontWeight:   700,
                fontFamily:   "Tajawal, sans-serif",
                cursor:       "pointer",
                whiteSpace:   "nowrap",
                flexShrink:   0,
                transition:   "all 0.15s",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background   = "rgba(231,76,60,0.20)";
                b.style.borderColor  = "rgba(231,76,60,0.7)";
                b.style.color        = "rgba(231,76,60,1)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background   = "rgba(231,76,60,0.10)";
                b.style.borderColor  = "rgba(231,76,60,0.4)";
                b.style.color        = "rgba(231,76,60,0.85)";
              }}
            >
              <X size={10} />
              مسح الكل ({activeCount})
            </button>
          )}
        </div>

        {/* Hint text */}
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
