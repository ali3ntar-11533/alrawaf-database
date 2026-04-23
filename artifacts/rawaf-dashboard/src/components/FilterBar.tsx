import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, X } from "lucide-react";
import { useListContractors } from "@workspace/api-client-react";
import type { Contractor } from "@workspace/api-client-react";

/* ── Types ── */
export interface FilterState {
  contractor:      string;
  portfolio:       string;
  project:         string;
  businessProgram: string;
  workType:        string;
  workCategory:    string;
}

export const EMPTY_FILTERS: FilterState = {
  contractor:      "",
  portfolio:       "",
  project:         "",
  businessProgram: "",
  workType:        "",
  workCategory:    "",
};

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
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

/* ── Filter descriptor ── */
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
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen]         = useState(false);
  const [innerSearch, setInnerSearch] = useState("");
  const containerRef            = useRef<HTMLDivElement>(null);
  const searchInputRef          = useRef<HTMLInputElement>(null);

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

  /* Auto-focus search when dropdown opens */
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [open]);

  const filtered = options.filter((o) =>
    normalize(o).includes(normalize(innerSearch))
  );

  function handleSelect(v: string) {
    onSelect(v);
    setOpen(false);
    setInnerSearch("");
  }

  return (
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen((p) => !p); setInnerSearch(""); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "7px 13px",
          borderRadius: "9px",
          border: isActive
            ? "1.5px solid var(--gold)"
            : "1.5px solid rgba(197,160,89,0.22)",
          background: isActive
            ? "rgba(197,160,89,0.14)"
            : "rgba(255,255,255,0.06)",
          color: isActive ? "var(--gold)" : "rgba(255,255,255,0.72)",
          fontSize: "0.72rem",
          fontWeight: isActive ? 700 : 600,
          fontFamily: "Tajawal, sans-serif",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 0.18s",
          backdropFilter: "blur(6px)",
          boxShadow: isActive ? "0 0 10px rgba(197,160,89,0.18)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,160,89,0.5)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,160,89,0.22)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
          }
        }}
      >
        <span>{isActive ? value : label}</span>
        {isActive ? (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "16px", height: "16px", borderRadius: "50%",
              background: "rgba(197,160,89,0.3)", color: "var(--gold)",
              fontSize: "10px", cursor: "pointer", flexShrink: 0,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(197,160,89,0.5)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(197,160,89,0.3)")}
          >
            <X size={9} />
          </span>
        ) : (
          <ChevronDown
            size={12}
            style={{
              transition: "transform 0.18s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          />
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "210px",
            maxWidth: "280px",
            background: "rgba(26,22,18,0.97)",
            border: "1.5px solid rgba(197,160,89,0.25)",
            borderRadius: "12px",
            boxShadow: "0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px rgba(197,160,89,0.08)",
            zIndex: 1000,
            overflow: "hidden",
            backdropFilter: "blur(16px)",
            animation: "filterDropIn 0.15s ease",
          }}
        >
          {/* Fixed header: inner search */}
          <div
            style={{
              padding: "10px",
              borderBottom: "1px solid rgba(197,160,89,0.12)",
              background: "rgba(197,160,89,0.04)",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`بحث في ${label}...`}
              value={innerSearch}
              onChange={(e) => setInnerSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 11px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(197,160,89,0.25)",
                borderRadius: "7px",
                fontSize: "0.72rem",
                fontFamily: "Tajawal, sans-serif",
                direction: "rtl",
                color: "#fff",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(197,160,89,0.7)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(197,160,89,0.25)")}
            />
          </div>

          {/* Scrollable options */}
          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{
                padding: "18px 14px",
                textAlign: "center",
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.3)",
                fontFamily: "Tajawal, sans-serif",
              }}>
                لا توجد نتائج مطابقة
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt === value;
                return (
                  <div
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    style={{
                      padding: "9px 14px",
                      fontSize: "0.75rem",
                      fontFamily: "Tajawal, sans-serif",
                      direction: "rtl",
                      cursor: "pointer",
                      color: isSelected ? "var(--gold)" : "rgba(255,255,255,0.78)",
                      background: isSelected ? "rgba(197,160,89,0.10)" : "transparent",
                      fontWeight: isSelected ? 700 : 400,
                      borderRight: isSelected ? "3px solid var(--gold)" : "3px solid transparent",
                      transition: "background 0.12s, color 0.12s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLDivElement).style.background = "rgba(197,160,89,0.06)";
                        (e.currentTarget as HTMLDivElement).style.color = "#fff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLDivElement).style.background = "transparent";
                        (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.78)";
                      }
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt}</span>
                    {isSelected && <span style={{ fontSize: "0.65rem", color: "var(--gold)", flexShrink: 0 }}>✓</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* Options count */}
          <div style={{
            padding: "5px 14px",
            borderTop: "1px solid rgba(197,160,89,0.08)",
            fontSize: "0.6rem",
            color: "rgba(255,255,255,0.25)",
            textAlign: "center",
            fontFamily: "Tajawal, sans-serif",
          }}>
            {filtered.length} خيار متاح
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

  const optionsMap = useCallback(() => {
    const map: Record<keyof FilterState, string[]> = {} as any;
    for (const def of FILTER_DEFS) {
      map[def.key] = getUnique(contractors as Contractor[], def.getter);
    }
    return map;
  }, [contractors]);

  const options = optionsMap();

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
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .filter-bar-scroll::-webkit-scrollbar { display: none; }
        .filter-bar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div
        style={{
          background: "linear-gradient(180deg, rgba(26,22,18,0.97) 0%, rgba(30,26,20,0.95) 100%)",
          borderBottom: "1px solid rgba(197,160,89,0.12)",
          padding: "10px 20px",
          position: "sticky",
          top: 0,
          zIndex: 200,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="filter-bar-scroll"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {/* Label */}
          <span style={{
            fontSize: "0.62rem",
            color: "rgba(197,160,89,0.55)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            flexShrink: 0,
            fontFamily: "'Inter', sans-serif",
          }}>
            فلترة
          </span>

          <div style={{ width: "1px", height: "18px", background: "rgba(197,160,89,0.15)", flexShrink: 0 }} />

          {/* Filter dropdowns */}
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

          {/* Clear all button — shown only when any filter is active */}
          {activeCount > 0 && (
            <>
              <div style={{ width: "1px", height: "18px", background: "rgba(197,160,89,0.15)", flexShrink: 0 }} />
              <button
                onClick={clearAll}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "7px 12px",
                  borderRadius: "9px",
                  border: "1.5px solid rgba(231,76,60,0.35)",
                  background: "rgba(231,76,60,0.08)",
                  color: "rgba(231,76,60,0.8)",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  fontFamily: "Tajawal, sans-serif",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(231,76,60,0.16)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(231,76,60,0.6)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(231,76,60,1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(231,76,60,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(231,76,60,0.35)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(231,76,60,0.8)";
                }}
              >
                <X size={10} />
                مسح الكل ({activeCount})
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
