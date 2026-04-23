import { useEffect, useState } from "react";
import { GOLD, GOLD_BORDER, STAGES } from "./types";
import type { Contract } from "./types";
import { listContracts } from "./api";

const DARK = "#1A1A1A";
const DARK2 = "#2a2015";
const GOLD2 = "#a88540";
const GOLD_LIGHT = "#e8c96a";
const GREEN = "#27ae60";
const RED = "#c0392b";

interface Props {
  roleName: string;
  pendingContracts: Contract[];
  onOpenContract: (id: number) => void;
}

function arabicNum(n: number) {
  const map: Record<number,string> = {0:"٠",1:"١",2:"٢",3:"٣",4:"٤",5:"٥",6:"٦",7:"٧",8:"٨",9:"٩"};
  return String(n).split("").map(d => map[parseInt(d)] ?? d).join("");
}

export default function ContractDashboard({ roleName, pendingContracts, onOpenContract }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    listContracts()
      .then(setContracts)
      .finally(() => setLoading(false));
    const t = setInterval(() => setTick(p => p + 1), 30000);
    return () => clearInterval(t);
  }, [tick]);

  const total     = contracts.length;
  const newC      = contracts.filter(c => c.currentStage === 1  && c.status === "active").length;
  const inReview  = contracts.filter(c => c.currentStage >= 2   && c.currentStage <= 7 && c.status === "active").length;
  const senior    = contracts.filter(c => (c.currentStage === 8 || c.currentStage === 9) && c.status === "active").length;
  const done      = contracts.filter(c => c.status === "completed").length;
  const completePct = total > 0 ? Math.round((done / total) * 100) : 0;

  const stageCounts = STAGES.map((_, i) =>
    contracts.filter(c => c.currentStage === i + 1 && c.status === "active").length
  );
  const maxCount = Math.max(...stageCounts, 1);

  const kpis = [
    {
      label: "طلبات جديدة",
      sub: "المرحلة 1",
      value: newC,
      icon: "🆕",
      accent: "#3498db",
      glow: "rgba(52,152,219,0.25)",
    },
    {
      label: "قيد المراجعة",
      sub: "المراحل 2 – 7",
      value: inReview,
      icon: "⚙️",
      accent: "#f39c12",
      glow: "rgba(243,156,18,0.25)",
    },
    {
      label: "اعتماد الإدارة",
      sub: "المرحلتان 8 و9",
      value: senior,
      icon: "👑",
      accent: "#9b59b6",
      glow: "rgba(155,89,182,0.25)",
    },
    {
      label: "مكتملة وموقعة",
      sub: "المراحل 10 – 11",
      value: done,
      icon: "✅",
      accent: GREEN,
      glow: "rgba(39,174,96,0.25)",
    },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", background: "#F9F9F9", minHeight: "100vh" }}>

      <style>{`
        @keyframes golden-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(197,160,89,0.5); }
          50%       { box-shadow: 0 0 20px 6px rgba(197,160,89,0.15); }
        }
        @keyframes stage-glow {
          0%, 100% { box-shadow: 0 0 6px 2px rgba(197,160,89,0.4); }
          50%       { box-shadow: 0 0 16px 6px rgba(197,160,89,0.15); }
        }
        @keyframes float-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .kpi-card:hover { transform: translateY(-3px); }
        .contract-row:hover { background: rgba(197,160,89,0.06) !important; }
        .pending-row:hover  { box-shadow: 0 6px 22px rgba(197,160,89,0.28) !important; }
      `}</style>

      {/* ── Hero Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK} 0%, ${DARK2} 55%, #3a2e14 100%)`,
        padding: "28px 32px 32px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative rings */}
        <div style={{ position:"absolute", top:-60, left:-60, width:220, height:220, borderRadius:"50%", border:"1px solid rgba(197,160,89,0.12)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:-30, left:-30, width:140, height:140, borderRadius:"50%", border:"1px solid rgba(197,160,89,0.08)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-40, right:80, width:180, height:180, borderRadius:"50%", border:"1px solid rgba(197,160,89,0.07)", pointerEvents:"none" }} />

        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
            <div style={{
              width:52, height:52, borderRadius:14,
              background:`linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1.5rem",
              boxShadow:`0 4px 20px rgba(197,160,89,0.5)`,
            }}>🏛️</div>
            <div>
              <div style={{ fontSize:"1.35rem", fontWeight:900, color:"#fff", lineHeight:1.1 }}>
                لوحة التحكم الرئيسية
              </div>
              <div style={{ fontSize:"0.78rem", color:"rgba(197,160,89,0.8)", marginTop:2 }}>
                نظام إدارة العقود · الرواف للمقاولات
              </div>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{
              background:"rgba(197,160,89,0.15)",
              border:`1px solid rgba(197,160,89,0.3)`,
              borderRadius:10, padding:"8px 16px",
              fontSize:"0.8rem", color:GOLD_LIGHT, fontWeight:700,
              backdropFilter:"blur(8px)",
            }}>
              👤 {roleName}
            </div>
            <div style={{
              background:"rgba(255,255,255,0.06)",
              border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:10, padding:"8px 16px",
              fontSize:"0.8rem", color:"rgba(255,255,255,0.6)",
            }}>
              📁 {arabicNum(total)} عقد في النظام
            </div>
            <div style={{ marginRight:"auto", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.4)" }}>نسبة الإنجاز</div>
              <div style={{
                background:`linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
                backgroundSize:"200% auto",
                backgroundClip:"text",
                WebkitBackgroundClip:"text",
                WebkitTextFillColor:"transparent",
                fontSize:"1.6rem", fontWeight:900, lineHeight:1,
              }}>{arabicNum(completePct)}%</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:"rgba(255,255,255,0.08)", borderRadius:3, marginTop:20, position:"relative", zIndex:1 }}>
          <div style={{
            height:"100%", borderRadius:3,
            width:`${completePct}%`,
            background:`linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
            transition:"width 1s ease",
            boxShadow:`0 0 10px rgba(197,160,89,0.6)`,
          }} />
        </div>
      </div>

      <div style={{ padding:"24px 28px" }}>

        {/* ── KPI Cards ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
          {kpis.map((k, i) => (
            <div key={i} className="kpi-card" style={{
              background:`linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))`,
              border:`1.5px solid ${GOLD_BORDER}`,
              borderTop:`3px solid ${k.accent}`,
              borderRadius:14,
              padding:"18px 18px 14px",
              boxShadow:`0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)`,
              transition:"transform 0.2s, box-shadow 0.2s",
              position:"relative", overflow:"hidden",
              animation:"float-in 0.5s ease both",
              animationDelay:`${i * 0.08}s`,
            }}>
              <div style={{
                position:"absolute", top:10, left:12, fontSize:"2.2rem", opacity:0.07,
                filter:"grayscale(1)",
              }}>{k.icon}</div>
              <div style={{ fontSize:"0.68rem", fontWeight:800, color:k.accent, marginBottom:6, letterSpacing:"0.04em" }}>
                {k.icon} {k.label}
              </div>
              <div style={{ fontSize:"2.4rem", fontWeight:900, color:DARK, lineHeight:1 }}>
                {loading ? "—" : arabicNum(k.value)}
              </div>
              <div style={{ fontSize:"0.65rem", color:"#9b8060", marginTop:4 }}>{k.sub}</div>
              <div style={{
                position:"absolute", bottom:0, right:0, left:0, height:2,
                background:`linear-gradient(90deg, ${k.accent}, transparent)`,
                opacity:0.35,
              }} />
            </div>
          ))}
        </div>

        {/* ── Workflow Waterfall ── */}
        <div style={{
          background:"#fff",
          border:`1px solid ${GOLD_BORDER}`,
          borderRadius:16, marginBottom:22,
          overflow:"hidden",
          boxShadow:"0 4px 20px rgba(0,0,0,0.06)",
        }}>
          <div style={{
            padding:"14px 20px",
            background:`linear-gradient(135deg, ${DARK}, ${DARK2})`,
            borderBottom:`1px solid rgba(197,160,89,0.2)`,
            display:"flex", alignItems:"center", gap:10,
          }}>
            <div style={{
              width:32, height:32, borderRadius:9,
              background:`linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.9rem",
              boxShadow:`0 3px 10px rgba(197,160,89,0.4)`,
            }}>⛲</div>
            <div>
              <div style={{ fontSize:"0.88rem", fontWeight:800, color:"#fff" }}>
                شلال دورة حياة العقد
              </div>
              <div style={{ fontSize:"0.65rem", color:"rgba(197,160,89,0.7)" }}>
                عدد العقود في كل مرحلة — تُحدَّث تلقائياً
              </div>
            </div>
          </div>

          <div style={{
            padding:"16px 16px 14px",
            overflowX:"auto",
          }}>
            <div style={{
              display:"flex", alignItems:"flex-end", gap:4,
              minWidth:"max-content", direction:"rtl",
            }}>
              {STAGES.map((stage, idx) => {
                const stageNum = idx + 1;
                const count = stageCounts[idx] ?? 0;
                const hasContracts = count > 0;
                const barH = hasContracts ? Math.max(8, Math.round((count / maxCount) * 44)) : 4;

                return (
                  <div key={stageNum} style={{
                    display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                    minWidth:76,
                  }}>
                    {/* contract count badge */}
                    <div style={{
                      fontSize:"0.68rem", fontWeight:900,
                      color: hasContracts ? GOLD : "transparent",
                      background: hasContracts ? "rgba(197,160,89,0.12)" : "transparent",
                      border: hasContracts ? `1px solid ${GOLD_BORDER}` : "1px solid transparent",
                      borderRadius:6, padding:"1px 7px",
                      minWidth:24, textAlign:"center",
                    }}>
                      {hasContracts ? arabicNum(count) : "—"}
                    </div>

                    {/* bar */}
                    <div style={{
                      width:52, borderRadius:"6px 6px 0 0", position:"relative",
                      height: barH,
                      background: hasContracts
                        ? `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD2})`
                        : "rgba(0,0,0,0.07)",
                      boxShadow: hasContracts ? `0 0 10px rgba(197,160,89,0.35)` : "none",
                      animation: hasContracts ? "stage-glow 2.4s ease-in-out infinite" : "none",
                      transition:"height 0.6s ease",
                    }}>
                      {hasContracts && (
                        <div style={{
                          position:"absolute", top:0, left:0, right:0, bottom:0,
                          background:`linear-gradient(180deg, rgba(255,255,255,0.3), transparent)`,
                          borderRadius:"6px 6px 0 0",
                        }} />
                      )}
                    </div>

                    {/* stage circle + label */}
                    <div style={{
                      display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                      padding:"8px 6px 6px",
                      background: hasContracts
                        ? "rgba(197,160,89,0.08)"
                        : "rgba(0,0,0,0.02)",
                      border: hasContracts ? `1.5px solid ${GOLD_BORDER}` : "1.5px solid transparent",
                      borderRadius:10, width:"100%",
                      animation: hasContracts ? "golden-pulse 2.8s ease-in-out infinite" : "none",
                    }}>
                      <div style={{
                        width:30, height:30, borderRadius:"50%",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        background: hasContracts
                          ? `linear-gradient(135deg, ${GOLD}, ${GOLD2})`
                          : "rgba(0,0,0,0.06)",
                        color: hasContracts ? "#fff" : "#ccc",
                        fontSize:"0.7rem", fontWeight:900,
                        boxShadow: hasContracts ? `0 2px 10px rgba(197,160,89,0.4)` : "none",
                      }}>
                        {stage.icon}
                      </div>
                      <div style={{
                        fontSize:"0.5rem", textAlign:"center",
                        color: hasContracts ? "#8B6914" : "#bbb",
                        fontWeight: hasContracts ? 800 : 400,
                        maxWidth:68, lineHeight:1.35,
                      }}>
                        م{stageNum} · {stage.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Pending + Recent (two-column) ── */}
        <div style={{ display:"grid", gridTemplateColumns: pendingContracts.length > 0 ? "1fr 1fr" : "1fr", gap:18 }}>

          {/* Pending Contracts */}
          {pendingContracts.length > 0 && (
            <div style={{
              background:"#fff",
              border:`1.5px solid ${GOLD_BORDER}`,
              borderRadius:16,
              overflow:"hidden",
              boxShadow:"0 4px 20px rgba(197,160,89,0.12)",
              animation:"golden-pulse 3s ease-in-out infinite",
            }}>
              <div style={{
                padding:"14px 18px",
                background:`linear-gradient(135deg, rgba(197,160,89,0.15), rgba(197,160,89,0.06))`,
                borderBottom:`1px solid ${GOLD_BORDER}`,
                display:"flex", alignItems:"center", gap:10,
              }}>
                <div style={{
                  background:`linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                  borderRadius:8, padding:"5px 8px",
                  fontSize:"0.8rem",
                  boxShadow:`0 2px 8px rgba(197,160,89,0.4)`,
                }}>⚡</div>
                <div>
                  <div style={{ fontSize:"0.85rem", fontWeight:900, color:"#8B6914" }}>
                    تنتظر إجراءك
                  </div>
                  <div style={{ fontSize:"0.65rem", color:"#9b8060" }}>
                    {arabicNum(pendingContracts.length)} عقد في مرحلتك
                  </div>
                </div>
              </div>
              <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
                {pendingContracts.slice(0, 4).map(c => (
                  <div
                    key={c.id}
                    className="pending-row"
                    onClick={() => onOpenContract(c.id)}
                    style={{
                      display:"flex", alignItems:"center", gap:12,
                      background:"rgba(197,160,89,0.04)",
                      border:`1px solid ${GOLD_BORDER}`,
                      borderRadius:11, padding:"10px 13px",
                      cursor:"pointer",
                      transition:"box-shadow 0.2s, background 0.2s",
                    }}
                  >
                    <div style={{
                      width:36, height:36, borderRadius:10, flexShrink:0,
                      background:`linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"1rem",
                      boxShadow:`0 2px 8px rgba(197,160,89,0.35)`,
                    }}>
                      {STAGES[c.currentStage - 1]?.icon ?? "📄"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"0.8rem", fontWeight:800, color:"#1a1206", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize:"0.65rem", color:"#9b8060", marginTop:1 }}>
                        {c.contractNo} · م{c.currentStage}: {STAGES[c.currentStage - 1]?.label}
                      </div>
                    </div>
                    <span style={{
                      color:GOLD, fontSize:"1.1rem",
                      flexShrink:0,
                    }}>←</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Contracts */}
          <div style={{
            background:"#fff",
            border:`1px solid ${GOLD_BORDER}`,
            borderRadius:16,
            overflow:"hidden",
            boxShadow:"0 4px 20px rgba(0,0,0,0.05)",
          }}>
            <div style={{
              padding:"14px 18px",
              background:"linear-gradient(135deg, #faf9f5, #f5f0e8)",
              borderBottom:`1px solid ${GOLD_BORDER}`,
              display:"flex", alignItems:"center", gap:10,
            }}>
              <div style={{
                background:`linear-gradient(135deg, ${DARK}, ${DARK2})`,
                borderRadius:8, padding:"5px 8px", fontSize:"0.8rem",
              }}>📋</div>
              <div>
                <div style={{ fontSize:"0.85rem", fontWeight:900, color:"#1a1206" }}>
                  آخر العقود
                </div>
                <div style={{ fontSize:"0.65rem", color:"#9b8060" }}>أحدث 6 عقود في النظام</div>
              </div>
            </div>
            <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:6 }}>
              {loading ? (
                <div style={{ textAlign:"center", padding:32, color:"#bbb", fontSize:"0.82rem" }}>
                  جاري التحميل...
                </div>
              ) : contracts.length === 0 ? (
                <div style={{ textAlign:"center", padding:32, color:"#bbb", fontSize:"0.82rem" }}>
                  لا يوجد عقود بعد — ابدأ من قسم طلبات العقود
                </div>
              ) : contracts.slice(0, 6).map(c => {
                const pct = c.status === "completed" ? 100 : Math.round((c.currentStage / 11) * 100);
                const statusColor = c.status === "completed" ? GREEN : c.rejectionReason ? RED : GOLD;

                return (
                  <div
                    key={c.id}
                    className="contract-row"
                    onClick={() => onOpenContract(c.id)}
                    style={{
                      display:"flex", alignItems:"center", gap:12,
                      borderRadius:11, padding:"10px 12px",
                      cursor:"pointer", border:"1px solid transparent",
                      transition:"background 0.18s, border-color 0.18s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = GOLD_BORDER;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                    }}
                  >
                    <div style={{
                      width:8, height:8, borderRadius:"50%", flexShrink:0,
                      background:statusColor,
                      boxShadow:`0 0 6px ${statusColor}`,
                    }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"0.8rem", fontWeight:700, color:"#1a1206", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize:"0.62rem", color:"#9b8060", marginTop:1 }}>
                        {c.contractNo} · {c.vendorName}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:5 }}>
                        <div style={{ flex:1, height:3, borderRadius:3, background:"rgba(0,0,0,0.07)" }}>
                          <div style={{
                            height:"100%", borderRadius:3,
                            width:`${pct}%`,
                            background: c.status === "completed"
                              ? GREEN
                              : `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
                            transition:"width 0.7s ease",
                          }} />
                        </div>
                        <div style={{ fontSize:"0.62rem", fontWeight:800, color:statusColor, flexShrink:0 }}>
                          {arabicNum(pct)}%
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize:"0.6rem", fontWeight:700, color:statusColor,
                      background: c.status === "completed"
                        ? "rgba(39,174,96,0.1)"
                        : c.rejectionReason ? "rgba(192,57,43,0.1)" : "rgba(197,160,89,0.1)",
                      border:`1px solid ${statusColor}30`,
                      borderRadius:6, padding:"2px 7px", flexShrink:0,
                    }}>
                      م{c.currentStage}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
