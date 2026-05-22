import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { TabType } from "../App";
import type { CurrentUser } from "../App";
import { Search } from "lucide-react";
import logoImg from "@assets/logo_1776506524686.jpg";
import heroBg from "@assets/Image_jo77t3jo77t3jo1_1776495109728.png";
import FilterBar from "./FilterBar";
import type { FilterState } from "./filterTypes";
import UserManagementPanel from "./UserManagementPanel";
import SelfEditModal from "./SelfEditModal";
import { useContractorsContext } from "../contractors/context";
import type { FilterOptionsMap } from "../contractors/api";

interface HeaderProps {
  activeTab:       TabType;
  onTabChange:     (tab: TabType) => void;
  search:          string;
  onSearchChange:  (value: string) => void;
  filters:         FilterState;
  onFiltersChange: (f: FilterState) => void;
  currentUser:     CurrentUser | null;
}

/* Arabic normalizer — strips diacritics, unifies alef/teh-marbuta/alef-maqsura */
function norm(s: string) {
  return (s ?? "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

/* All fields we collect suggestion values from */
const SUGGESTION_KEYS: (keyof FilterOptionsMap)[] = [
  "contractor", "portfolio", "mainActivity", "businessProgram",
  "workFamily", "workType", "workCategory", "itemScope", "techSpecs", "measurements",
];

export default function Header({ activeTab, onTabChange, search, onSearchChange, filters, onFiltersChange, currentUser }: HeaderProps) {
  const [logoHover,    setLogoHover]    = useState(false);
  const [gearHover,    setGearHover]    = useState(false);
  const [showPanel,    setShowPanel]    = useState(false);
  const [showSelfEdit, setShowSelfEdit] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIdx,       setFocusedIdx]      = useState(-1);

  /* Local input state — updates instantly on every keystroke */
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const { filterOptions } = useContractorsContext();

  const isSuperAdmin   = currentUser?.role === "superadmin";
  const isAdmin        = isSuperAdmin || currentUser?.role === "admin";
  const canSeeDatabase = isAdmin;
  const canManageUsers = isSuperAdmin;

  const { data: contractors = [] } = useContractorsContext();

  /* Sync localSearch if parent clears/changes search externally */
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  /* Debounced propagation — fires 120ms after typing stops */
  const handleInputChange = useCallback((value: string) => {
    setLocalSearch(value);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 120);
  }, [onSearchChange]);

  /* Immediate propagation — for suggestion clicks / clear button */
  const applySearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalSearch(value);
    onSearchChange(value);
  }, [onSearchChange]);

  /* ── Pre-compute Pass 2 unique values from contractors ──────────────────
     Computed once when contractors array changes — NOT on every keystroke. */
  const pass2Candidates = useMemo((): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of contractors) {
      for (const v of [c.contractNo, c.project, c.technicalScope ?? "", String(c.price ?? "")]) {
        const clean = (v ?? "").trim();
        if (clean && !seen.has(clean)) { seen.add(clean); result.push(clean); }
      }
    }
    return result;
  }, [contractors]);

  /* ── Compute flat suggestions across the FULL dataset ──────────────────
     Pass 1: filterOptions (10 categorical fields — full DB distinct values).
     Pass 2: pre-computed unique values from contractors rows.
     Results are deduplicated and capped at 12.                           */
  const suggestions = useMemo((): string[] => {
    const term = localSearch.trim();
    if (!term) return [];
    const normTerm = norm(term);
    const seen   = new Set<string>();
    const result: string[] = [];

    function push(v: string) {
      const clean = (v ?? "").trim();
      if (!clean || seen.has(clean)) return;
      if (norm(clean).includes(normTerm)) {
        seen.add(clean);
        result.push(clean);
      }
    }

    /* Pass 1 — filterOptions (categorical) */
    if (filterOptions) {
      for (const key of SUGGESTION_KEYS) {
        for (const v of (filterOptions[key] ?? [])) {
          push(v);
          if (result.length >= 12) return result;
        }
      }
    }

    /* Pass 2 — pre-computed unique values (no full row scan per keystroke) */
    if (result.length < 12) {
      for (const v of pass2Candidates) {
        push(v);
        if (result.length >= 12) break;
      }
    }

    return result;
  }, [localSearch, filterOptions, pass2Candidates]);

  /* Reset focused index when suggestions list changes */
  useEffect(() => { setFocusedIdx(-1); }, [suggestions]);

  /* Close suggestions on outside click */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleLogoClick() {
    window.dispatchEvent(new CustomEvent("rawaf-logout"));
  }

  function selectSuggestion(value: string) {
    applySearch(value);
    setShowSuggestions(false);
    setFocusedIdx(-1);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && focusedIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[focusedIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setFocusedIdx(-1);
    }
  }

  return (
    <>
      <header
        className="hero-banner animate-fade"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(26,22,18,0.88) 0%, rgba(58,54,50,0.75) 50%, rgba(26,22,18,0.92) 100%), url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          {/* Logo + Title */}
          <div className="animate-slide-in" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              onClick={handleLogoClick}
              onMouseEnter={() => setLogoHover(true)}
              onMouseLeave={() => setLogoHover(false)}
              title="تسجيل الخروج من النظام"
              style={{
                width: "60px", height: "60px",
                background: "#fff",
                borderRadius: "12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: logoHover
                  ? "0 8px 28px rgba(0,0,0,0.5), 0 0 0 2px rgba(197,160,89,0.75), 0 0 22px rgba(197,160,89,0.35)"
                  : "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1.5px rgba(197,160,89,0.4)",
                flexShrink: 0, overflow: "hidden", padding: "6px",
                cursor: "pointer",
                opacity: logoHover ? 0.82 : 1,
                transform: logoHover ? "scale(1.08)" : "scale(1)",
                transition: "opacity 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease",
                position: "relative",
              }}
            >
              <img
                src={logoImg}
                alt="شركة الرواف للمقاولات — اضغط للخروج"
                style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "7px" }}
              />
              {logoHover && (
                <div style={{
                  position: "absolute",
                  bottom: "-34px",
                  right: "50%",
                  transform: "translateX(50%)",
                  background: "rgba(20,14,8,0.92)",
                  border: "1px solid rgba(197,160,89,0.35)",
                  borderRadius: 7,
                  padding: "4px 10px",
                  fontSize: "0.58rem",
                  color: "rgba(197,160,89,0.9)",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 100,
                  backdropFilter: "blur(8px)",
                  fontFamily: "Tajawal, sans-serif",
                  letterSpacing: "0.04em",
                }}>
                  تسجيل الخروج
                </div>
              )}
            </div>

            <div>
              <h1
                style={{
                  fontSize: "clamp(0.95rem, 2.2vw, 1.45rem)",
                  fontWeight: 800, color: "#ffffff",
                  lineHeight: 1.25, letterSpacing: "-0.01em",
                  textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                  margin: 0,
                }}
              >
                قاعدة بيانات المقاولين والموردين ومقدمي الخدمات
              </h1>
              <p
                style={{
                  fontSize: "clamp(0.72rem, 1.4vw, 0.88rem)",
                  fontWeight: 700,
                  color: "var(--gold)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "4px 0 5px",
                  fontFamily: "'Inter', sans-serif",
                  textShadow: "0 1px 6px rgba(0,0,0,0.35)",
                }}
              >
                Database · Alrawaf Contracting Company
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold)", flexShrink: 0, boxShadow: "0 0 6px var(--gold)" }} />
                <p style={{ fontSize: "0.82rem", color: "rgba(232,213,163,0.9)", fontWeight: 500, margin: 0 }}>
                  إدارة المشتريات والعقود — شركة الرواف للمقاولات
                </p>
              </div>
            </div>
          </div>

          {/* Nav tabs + Gear icon */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>

            {/* User info bar */}
            {currentUser && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.78rem", color: "rgba(232,213,163,0.85)", fontWeight: 600, letterSpacing: "0.02em" }}>
                  {currentUser.jobTitle ? `${currentUser.jobTitle} — ` : ""}{currentUser.name}
                </span>
                <button
                  onClick={() => setShowSelfEdit(true)}
                  title="تعديل بيانات الدخول"
                  style={{
                    background: "none", border: "none", padding: "2px 4px",
                    color: "rgba(197,160,89,0.65)", cursor: "pointer",
                    display: "flex", alignItems: "center", lineHeight: 1,
                    transition: "color 0.18s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#c5a059")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(197,160,89,0.65)")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <nav
              className="animate-fade"
              style={{
                display: "flex", gap: "28px", alignSelf: "flex-start", paddingTop: "6px",
                background: "rgba(255,255,255,0.06)", borderRadius: "10px",
                padding: "8px 20px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
              }}
            >
              {([
                { key: "main"     as TabType, label: "لوحة التنسيق الفني", adminOnly: false },
                { key: "database" as TabType, label: "قاعدة البيانات",     adminOnly: true  },
              ]).filter(tab => !tab.adminOnly || canSeeDatabase).map((tab) => (
                <span
                  key={tab.key}
                  className={`nav-tab ${activeTab === tab.key ? "active" : "inactive"}`}
                  onClick={() => onTabChange(tab.key)}
                >
                  {tab.label}
                </span>
              ))}
            </nav>

            {/* Gear icon — admin only */}
            {canManageUsers && (
              <button
                onClick={() => setShowPanel(true)}
                onMouseEnter={() => setGearHover(true)}
                onMouseLeave={() => setGearHover(false)}
                title={`إدارة المستخدمين — ${currentUser?.name ?? ""}`}
                style={{
                  width: 40, height: 40,
                  borderRadius: 10,
                  background: gearHover
                    ? "rgba(197,160,89,0.18)"
                    : "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${gearHover ? "rgba(197,160,89,0.55)" : "rgba(255,255,255,0.14)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.22s ease",
                  transform: gearHover ? "rotate(45deg)" : "rotate(0deg)",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                <svg
                  width="18" height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={gearHover ? "#c5a059" : "rgba(255,255,255,0.65)"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transition: "stroke 0.22s ease" }}
                >
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            )}
            </div>{/* end inner row (nav + gear) */}
          </div>{/* end column (user info + tabs) */}
        </div>{/* end space-between */}

        {/* ── Unified Search Bar + Autocomplete ── */}
        <div style={{ marginTop: "12px" }}>
          <div ref={wrapperRef} style={{ position: "relative", maxWidth: "720px", margin: "0 auto" }}>

            {/* Search icon */}
            <div style={{
              position: "absolute", top: "50%", right: "18px",
              transform: "translateY(-50%)",
              color: "rgba(197,160,89,0.7)",
              pointerEvents: "none",
              zIndex: 1,
            }}>
              <Search size={17} />
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              placeholder="ابحث بأي معلومة: اسم المقاول، المشروع، نوع الأعمال، المحفظة، رقم العقد..."
              value={localSearch}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(197,160,89,0.9)";
                e.target.style.background  = "rgba(255,255,255,0.15)";
                e.target.style.boxShadow   = "0 0 0 4px rgba(197,160,89,0.12)";
                if (localSearch.trim()) setShowSuggestions(true);
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(197,160,89,0.35)";
                e.target.style.background  = "rgba(255,255,255,0.10)";
                e.target.style.boxShadow   = "none";
                /* Delay close so suggestion clicks can register first */
                setTimeout(() => {
                  if (!wrapperRef.current?.contains(document.activeElement)) {
                    setShowSuggestions(false);
                  }
                }, 150);
              }}
              onKeyDown={handleKeyDown}
              style={{
                width: "100%",
                padding: "14px 50px 14px 20px",
                background: "rgba(255,255,255,0.10)",
                border: "1.5px solid rgba(197,160,89,0.35)",
                borderRadius: showSuggestions && suggestions.length > 0 ? "14px 14px 0 0" : "14px",
                fontSize: "0.9rem",
                fontFamily: "Tajawal, sans-serif",
                direction: "rtl",
                outline: "none",
                color: "#fff",
                backdropFilter: "blur(8px)",
                boxSizing: "border-box",
                transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
                position: "relative",
                zIndex: 1,
              }}
            />

            {/* Clear button */}
            {localSearch && (
              <button
                onMouseDown={(e) => { e.preventDefault(); applySearch(""); setShowSuggestions(false); }}
                style={{
                  position: "absolute", top: "50%", left: "14px",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.15)", border: "none",
                  borderRadius: "50%", width: "24px", height: "24px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: "14px",
                  lineHeight: 1, transition: "background 0.15s",
                  zIndex: 2,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                title="مسح البحث"
              >
                ×
              </button>
            )}

            {/* ── Suggestions dropdown ── */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0, left: 0,
                background: "rgba(22,17,12,0.97)",
                border: "1.5px solid rgba(197,160,89,0.40)",
                borderTop: "1px solid rgba(197,160,89,0.15)",
                borderRadius: "0 0 14px 14px",
                backdropFilter: "blur(16px)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
                overflow: "hidden",
                zIndex: 9999,
                direction: "rtl",
              }}>
                {suggestions.map((value, i) => {
                  const isFocused = i === focusedIdx;
                  return (
                    <div
                      key={value}
                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(value); }}
                      onMouseEnter={() => setFocusedIdx(i)}
                      onMouseLeave={() => setFocusedIdx(-1)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 18px",
                        cursor: "pointer",
                        background: isFocused ? "rgba(197,160,89,0.10)" : "transparent",
                        borderRight: isFocused ? "3px solid var(--gold)" : "3px solid transparent",
                        borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        transition: "background 0.12s",
                      }}
                    >
                      {/* Search icon */}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke={isFocused ? "rgba(197,160,89,0.9)" : "rgba(255,255,255,0.25)"}
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ flexShrink: 0, transition: "stroke 0.12s" }}>
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>

                      {/* Matched value */}
                      <span style={{
                        fontSize: "0.83rem",
                        fontFamily: "Tajawal, sans-serif",
                        color: isFocused ? "#fff" : "rgba(255,255,255,0.80)",
                        fontWeight: isFocused ? 600 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}>
                        {value}
                      </span>

                      {/* Enter hint on focused item */}
                      {isFocused && (
                        <span style={{
                          fontSize: "0.58rem",
                          color: "rgba(197,160,89,0.5)",
                          flexShrink: 0,
                          fontFamily: "monospace",
                        }}>
                          ↵
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Footer */}
                <div style={{
                  padding: "5px 18px",
                  borderTop: "1px solid rgba(197,160,89,0.07)",
                  fontSize: "0.6rem",
                  color: "rgba(255,255,255,0.20)",
                  fontFamily: "Tajawal, sans-serif",
                  display: "flex",
                  justifyContent: "space-between",
                }}>
                  <span>↑↓ للتنقل · Enter للاختيار · Esc للإغلاق</span>
                  <span>{suggestions.length} اقتراح</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Advanced Filter Bar ── */}
        <FilterBar filters={filters} onFiltersChange={onFiltersChange} search={search} />
      </header>

      {/* ── User Management Panel ── */}
      {showPanel && currentUser && (
        <UserManagementPanel
          currentUser={currentUser}
          onClose={() => setShowPanel(false)}
        />
      )}

      {/* ── Self Edit Modal ── */}
      {showSelfEdit && currentUser && (
        <SelfEditModal
          currentUser={currentUser}
          onClose={() => setShowSelfEdit(false)}
          onSaved={(updated) => {
            setShowSelfEdit(false);
            sessionStorage.setItem("rawaf_current_user", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("rawaf-profile-updated", { detail: updated }));
          }}
        />
      )}
    </>
  );
}
