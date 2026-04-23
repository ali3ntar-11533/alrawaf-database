import { useEffect, useState } from "react";
import { STAGES, ROLES } from "./types";
import type { Contract, StageLog } from "./types";
import { getContractAudit } from "./api";

// ── Design tokens ────────────────────────────────────────────────────
const GOLD      = "#C5A059";
const GOLD2     = "#a88540";
const GOLD_END  = "#E2C275";
const GOLD_GLOW = "rgba(197,160,89,0.45)";
const GOLD_BOR  = "rgba(197,160,89,0.22)";
const CREAM     = "#FBF9F4";
const GREEN     = "#22c55e";
const AMBER     = "#f59e0b";
const RED       = "#ef4444";

// ── Time helpers ─────────────────────────────────────────────────────
function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function hoursSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
}
function formatAge(iso: string): { value: string; unit: string } {
  const h = hoursSince(iso);
  if (h < 24) return { value: String(h), unit: "ساعة" };
  const d = daysSince(iso);
  if (d < 30) return { value: String(d), unit: "يوم" };
  const m = Math.floor(d / 30);
  return { value: String(m), unit: "شهر" };
}
function urgencyColor(stageAge: number) {
  if (stageAge >= 7) return RED;
  if (stageAge >= 3) return AMBER;
  return GREEN;
}
function formatSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} مليون ر.س`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ألف ر.س`;
  return `${n} ر.س`;
}

// ── Audit Timeline (inside expanded card) ────────────────────────────
function AuditTimeline({ contractId }: { contractId: number }) {
  const [logs, setLogs]     = useState<StageLog[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContractAudit(contractId)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [contractId]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "12px 0", fontSize: "0.7rem", color: "#AAA" }}>
      جاري التحميل...
    </div>
  );
  if (!logs || logs.length === 0) return (
    <div style={{ textAlign: "center", padding: "12px 0", fontSize: "0.7rem", color: "#CCC" }}>
      لا سجل مراحل متاح
    </div>
  );

  // Compute duration per stage
  const sorted = [...logs].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const durations = sorted.map((log, i) => {
    const next = sorted[i + 1];
    const end  = next ? new Date(next.createdAt).getTime() : Date.now();
    const hrs  = Math.max(1, Math.floor((end - new Date(log.createdAt).getTime()) / 3_600_000));
    return { ...log, hrs };
  });
  const maxHrs = Math.max(...durations.map(d => d.hrs), 1);

  return (
    <div style={{ padding: "12px 16px", borderTop: `1px solid rgba(197,160,89,0.12)` }}>
      <div style={{
        fontSize: "0.6rem", fontWeight: 900, color: GOLD2, marginBottom: 10,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        ⏱️ سجل الإنجاز الزمني
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {durations.map((d, i) => {
          const stage = STAGES[d.stage - 1];
          const pct   = Math.round((d.hrs / maxHrs) * 100);
          const isLast = i === durations.length - 1;
          const barColor = d.action === "reject"
            ? RED
            : isLast ? GOLD : GREEN;
          const hrs = d.hrs;
          const label = hrs >= 24
            ? `${Math.floor(hrs / 24)} يوم`
            : `${hrs} ساعة`;
          return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 20, fontSize: "0.65rem", textAlign: "center", flexShrink: 0 }}>
                {stage?.icon ?? "📄"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: "0.55rem", color: "#888", marginBottom: 2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>م{d.stage}: {stage?.label}</div>
                <div style={{ height: 6, background: "#F0F0F0", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
                    boxShadow: isLast ? `0 0 6px ${GOLD_GLOW}` : "none",
                    transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
              <div style={{
                width: 44, fontSize: "0.55rem", fontWeight: 800,
                color: isLast ? GOLD2 : "#777",
                textAlign: "center", flexShrink: 0,
              }}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Contract card inside slide-over ──────────────────────────────────
function ContractCard({
  contract,
  allowed,
  onOpen,
}: {
  contract: Contract;
  allowed: boolean;
  onOpen: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalAge  = daysSince(contract.createdAt);
  const stageAge  = daysSince(contract.updatedAt);
  const urgColor  = urgencyColor(stageAge);
  const totalFmt  = formatAge(contract.createdAt);
  const stageFmt  = formatAge(contract.updatedAt);
  const stageInfo = STAGES[contract.currentStage - 1];

  return (
    <div style={{
      borderRadius: 16,
      border: expanded ? `2px solid ${GOLD_BOR}` : "1px solid rgba(0,0,0,0.07)",
      background: expanded ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.9)",
      boxShadow: expanded
        ? `0 6px 28px ${GOLD_GLOW}, 0 2px 8px rgba(0,0,0,0.05)`
        : "0 2px 10px rgba(0,0,0,0.05)",
      overflow: "hidden",
      transition: "box-shadow 0.2s, border 0.2s",
    }}>
      {/* Card header row */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Stage icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: allowed
            ? `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`
            : "#EBEBEB",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem",
          boxShadow: allowed ? `0 3px 12px ${GOLD_GLOW}` : "none",
        }}>
          {allowed ? (stageInfo?.icon ?? "📄") : "🔒"}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "0.82rem", fontWeight: 800, color: "#1A1A1A",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{contract.title}</div>
          <div style={{ fontSize: "0.62rem", color: "#9b8060", marginTop: 2 }}>
            {contract.contractNo}
            {contract.vendorName && ` · ${contract.vendorName}`}
            {contract.value > 0 && ` · ${formatSAR(contract.value)}`}
          </div>
        </div>

        {/* Expand chevron */}
        <div style={{
          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
          background: expanded ? GOLD_BOR : "#F5F5F5",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.6rem", color: expanded ? GOLD2 : "#AAA",
          transition: "transform 0.2s",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        }}>▼</div>
      </div>

      {/* Time badges row */}
      <div style={{
        display: "flex", gap: 8, padding: "0 16px 12px",
        flexWrap: "wrap",
      }}>
        {/* Total age */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "#F8F8F8", borderRadius: 20, padding: "4px 10px",
          border: "1px solid #EBEBEB",
        }}>
          <span style={{ fontSize: "0.65rem" }}>🕐</span>
          <span style={{ fontSize: "0.6rem", color: "#666" }}>
            عمر العقد:
          </span>
          <span style={{ fontSize: "0.65rem", fontWeight: 900, color: "#333" }}>
            {totalFmt.value} {totalFmt.unit}
          </span>
        </div>

        {/* Stage wait time */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: `${urgColor}10`,
          borderRadius: 20, padding: "4px 10px",
          border: `1px solid ${urgColor}25`,
        }}>
          <span style={{ fontSize: "0.65rem" }}>⏳</span>
          <span style={{ fontSize: "0.6rem", color: "#666" }}>في المرحلة:</span>
          <span style={{ fontSize: "0.65rem", fontWeight: 900, color: urgColor }}>
            {stageFmt.value} {stageFmt.unit}
          </span>
          {stageAge >= 5 && (
            <span style={{ fontSize: "0.55rem", color: urgColor, fontWeight: 800 }}>
              {stageAge >= 7 ? "⚠️ عاجل" : "🔔 انتبه"}
            </span>
          )}
        </div>

        {/* Rejection note if present */}
        {contract.rejectionReason && (
          <div style={{
            width: "100%", marginTop: 2,
            background: `${RED}08`, borderRadius: 10, padding: "5px 10px",
            border: `1px solid ${RED}18`,
            fontSize: "0.6rem", color: RED,
            display: "flex", gap: 5, alignItems: "flex-start",
          }}>
            <span>↩</span>
            <span>{contract.rejectionReason}</span>
          </div>
        )}
      </div>

      {/* Expanded: audit timeline + open button */}
      {expanded && (
        <div>
          <AuditTimeline contractId={contract.id} />

          {/* Open button */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid rgba(197,160,89,0.1)` }}>
            {allowed ? (
              <button
                onClick={() => onOpen(contract.id)}
                style={{
                  width: "100%",
                  background: `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`,
                  color: "#fff", border: "none", borderRadius: 12,
                  padding: "10px 16px", fontFamily: "'Cairo', sans-serif",
                  fontSize: "0.78rem", fontWeight: 800, cursor: "pointer",
                  boxShadow: `0 4px 16px ${GOLD_GLOW}`,
                  letterSpacing: "0.02em",
                }}
              >
                فتح العقد كاملاً ←
              </button>
            ) : (
              <div style={{
                textAlign: "center", fontSize: "0.7rem", color: "#CCC",
                background: "#F8F8F8", borderRadius: 12, padding: "10px",
              }}>
                🔒 ليس لديك صلاحية الوصول لهذه المرحلة
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main SlideOver ────────────────────────────────────────────────────
interface Props {
  stageNum: number;
  contracts: Contract[];
  role: string;
  onClose: () => void;
  onOpenContract: (id: number) => void;
}

export default function StageSlideOver({ stageNum, contracts, role, onClose, onOpenContract }: Props) {
  const [search, setSearch] = useState("");

  const stage     = STAGES[stageNum - 1];
  const myRole    = ROLES.find(r => r.name === role);
  const allowed   = !role || (myRole?.stage.includes(stageNum) ?? false);

  const filtered  = contracts.filter(c =>
    !search || c.title.includes(search) || c.contractNo.includes(search) || c.vendorName?.includes(search)
  );

  // Bottleneck indicator
  const maxStageCount = Math.max(
    ...STAGES.map((_, i) => contracts.filter(c => c.currentStage === i + 1).length), 1
  );
  const isBottleneck = contracts.length === maxStageCount && contracts.length > 0;

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div dir="rtl" style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "stretch",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          flex: 1,
          background: "rgba(10,8,4,0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Panel (slides from right) */}
      <div style={{
        width: 480, maxWidth: "94vw", height: "100%",
        background: "linear-gradient(160deg, #FEFDFB 0%, #F9F4EC 100%)",
        boxShadow: `-12px 0 60px rgba(0,0,0,0.20), -4px 0 20px ${GOLD_GLOW}`,
        display: "flex", flexDirection: "column",
        animation: "slide-over-in 0.28s cubic-bezier(0.22,1,0.36,1)",
        overflow: "hidden",
        fontFamily: "'Cairo','Tajawal',sans-serif",
      }}>
        <style>{`
          @keyframes slide-over-in {
            from { transform: translateX(100%); opacity: 0.7; }
            to   { transform: translateX(0);    opacity: 1;   }
          }
          .card-hover { transition: transform 0.15s, box-shadow 0.15s; }
          .card-hover:hover { transform: translateY(-1px); }
        `}</style>

        {/* Panel header */}
        <div style={{
          background: `linear-gradient(135deg, ${CREAM} 0%, #EEE3CC 100%)`,
          borderBottom: `2px solid ${GOLD_BOR}`,
          padding: "18px 20px 16px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14, flexShrink: 0,
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_END})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.3rem",
              boxShadow: `0 4px 18px ${GOLD_GLOW}`,
            }}>{stage?.icon ?? "📄"}</div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.58rem", fontWeight: 900, color: "rgba(197,160,89,0.8)", letterSpacing: "0.1em" }}>
                المرحلة {stageNum} من {STAGES.length}
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "#1A1108", letterSpacing: "-0.01em" }}>
                {stage?.label}
              </div>
              <div style={{ fontSize: "0.62rem", color: "#9b8060", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span>👤 {stage?.role}</span>
                <span>·</span>
                <span>{contracts.length} عقد في الانتظار</span>
                {isBottleneck && (
                  <span style={{
                    background: `${RED}15`, color: RED, border: `1px solid ${RED}20`,
                    borderRadius: 10, padding: "1px 7px", fontSize: "0.58rem", fontWeight: 800,
                  }}>🔴 عنق الزجاجة</span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)",
                fontSize: "0.85rem", cursor: "pointer", color: "#888",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
            >✕</button>
          </div>

          {/* Quick stats row */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {[
              {
                label: "متوسط الانتظار",
                value: contracts.length > 0
                  ? `${Math.round(contracts.reduce((s, c) => s + daysSince(c.updatedAt), 0) / contracts.length)} يوم`
                  : "—",
                icon: "⏱️",
                color: (() => {
                  const avg = contracts.length > 0 ? Math.round(contracts.reduce((s, c) => s + daysSince(c.updatedAt), 0) / contracts.length) : 0;
                  return avg >= 7 ? RED : avg >= 3 ? AMBER : GREEN;
                })(),
              },
              {
                label: "إجمالي القيمة",
                value: contracts.reduce((s, c) => s + (c.value || 0), 0) > 0
                  ? formatSAR(contracts.reduce((s, c) => s + (c.value || 0), 0))
                  : "—",
                icon: "💰",
                color: GOLD2,
              },
            ].map((stat, i) => (
              <div key={i} style={{
                flex: 1, background: "rgba(255,255,255,0.65)", borderRadius: 10,
                padding: "7px 10px", border: "1px solid rgba(255,255,255,0.8)",
                display: "flex", flexDirection: "column", gap: 1,
              }}>
                <div style={{ fontSize: "0.55rem", color: "#9b8060" }}>{stat.icon} {stat.label}</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 900, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{
            marginTop: 10, position: "relative",
          }}>
            <span style={{
              position: "absolute", top: "50%", right: 12, transform: "translateY(-50%)",
              fontSize: "0.8rem", pointerEvents: "none",
            }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث في هذه المرحلة…"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.75)",
                border: `1px solid rgba(197,160,89,0.18)`,
                borderRadius: 10, padding: "9px 36px 9px 12px",
                fontFamily: "'Cairo','Tajawal',sans-serif",
                fontSize: "0.76rem", color: "#1A1A1A",
                outline: "none", direction: "rtl",
              }}
            />
          </div>
        </div>

        {/* Contract list */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {filtered.length === 0 ? (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "#CCC", gap: 10, padding: "40px 0",
            }}>
              <span style={{ fontSize: "2.5rem" }}>📭</span>
              <span style={{ fontSize: "0.8rem" }}>
                {search ? "لا نتائج تطابق البحث" : "لا عقود في هذه المرحلة"}
              </span>
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="card-hover">
                <ContractCard
                  contract={c}
                  allowed={!role || (myRole?.stage.includes(stageNum) ?? false)}
                  onOpen={onOpenContract}
                />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!allowed && (
          <div style={{
            padding: "12px 20px",
            background: "rgba(239,68,68,0.04)",
            borderTop: `1px solid rgba(239,68,68,0.1)`,
            fontSize: "0.68rem", color: "#999",
            textAlign: "center",
          }}>
            🔒 دورك الحالي ({role || "غير محدد"}) لا يشمل هذه المرحلة
          </div>
        )}
      </div>
    </div>
  );
}
