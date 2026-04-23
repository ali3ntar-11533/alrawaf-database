import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { GOLD, GOLD_BG, GOLD_BORDER, STAGES, ROLES } from "./types";
import type { Contract } from "./types";

const DARK  = "#1A1A1A";
const DARK2 = "#2a2015";
const GOLD2 = "#a88540";
const GOLD_LIGHT = "#e8c96a";
const GREEN = "#27ae60";
const RED   = "#c0392b";
const BLUE  = "#2980b9";
const PIE_COLORS = [GOLD, GREEN, RED, "#9b59b6", BLUE];

interface Props {
  role: string;
  actorName: string;
  contracts: Contract[];
  pendingContracts: Contract[];
  onOpenContract: (id: number) => void;
}

function arabicNum(n: number) {
  const m: Record<number,string> = {0:"٠",1:"١",2:"٢",3:"٣",4:"٤",5:"٥",6:"٦",7:"٧",8:"٨",9:"٩"};
  return String(n).split("").map(d => m[parseInt(d)] ?? d).join("");
}

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function formatSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ك`;
  return String(n);
}

export default function ContractDashboard({ role, actorName, contracts, pendingContracts, onOpenContract }: Props) {
  const total    = contracts.length;
  const active   = contracts.filter(c => c.status === "active").length;
  const done     = contracts.filter(c => c.status === "completed").length;
  const rejected = contracts.filter(c => c.rejectionReason && c.status !== "completed").length;
  const totalSAR = contracts.filter(c => c.status === "active").reduce((s, c) => s + (c.value || 0), 0);
  const maxSAR   = contracts.reduce((s, c) => s + (c.value || 0), 0);
  const completePct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Stage distribution
  const stageCounts = STAGES.map((_, i) =>
    contracts.filter(c => c.currentStage === i + 1 && c.status === "active").length
  );
  const maxCount = Math.max(...stageCounts, 1);

  // Per-admin bar chart data
  const adminData = ROLES.map(r => ({
    name: r.name.replace("مدير ", "").replace("أخصائي ", "").replace("مسؤول ", ""),
    fullName: r.name,
    icon: r.icon,
    count: r.stage.reduce((s, stg) =>
      s + contracts.filter(c => c.currentStage === stg && c.status === "active").length, 0
    ),
  })).filter(d => d.count > 0);

  // Donut chart data
  const pieData = [
    { name: "قيد الإجراء", value: active },
    { name: "مكتملة",      value: done },
    { name: "مُعادة",      value: rejected },
  ].filter(d => d.value > 0);

  // Smart table — all contracts sorted by urgency (most days at stage first)
  const tableContracts = [...contracts].sort((a, b) => {
    const dA = daysAgo(a.updatedAt);
    const dB = daysAgo(b.updatedAt);
    const myRole = role ? ROLES.find(r => r.name === role) : null;
    const aIsMine = myRole?.stage.includes(a.currentStage) && a.status !== "completed";
    const bIsMine = myRole?.stage.includes(b.currentStage) && b.status !== "completed";
    if (aIsMine && !bIsMine) return -1;
    if (!aIsMine && bIsMine) return  1;
    return dB - dA;
  });

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", background: "#F9F9F9", minHeight: "100vh" }}>

      <style>{`
        @keyframes golden-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(197,160,89,0.45); }
          50%       { box-shadow: 0 0 22px 6px rgba(197,160,89,0.12); }
        }
        @keyframes stage-bar-glow {
          0%, 100% { box-shadow: 0 0 6px 2px rgba(197,160,89,0.35); }
          50%       { box-shadow: 0 0 14px 4px rgba(197,160,89,0.12); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tr-hover:hover { background: rgba(197,160,89,0.05) !important; cursor:pointer; }
        .kpi-card:hover { transform: translateY(-2px); }
      `}</style>

      {/* ── Hero Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK} 0%, ${DARK2} 55%, #3a2e14 100%)`,
        padding: "24px 28px 28px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position:"absolute", top:-50, left:-50, width:200, height:200, borderRadius:"50%", border:"1px solid rgba(197,160,89,0.10)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-30, right:60, width:160, height:160, borderRadius:"50%", border:"1px solid rgba(197,160,89,0.06)", pointerEvents:"none" }} />

        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontSize:"0.65rem", fontWeight:700, color:"rgba(197,160,89,0.7)", letterSpacing:"0.1em", marginBottom:4 }}>
                AL-RAWAF CONTRACTS MANAGEMENT
              </div>
              <h1 style={{ fontSize:"1.4rem", fontWeight:900, color:"#fff", marginBottom:4, lineHeight:1.2 }}>
                لوحة التحكم التفاعلية
              </h1>
              <p style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.5)" }}>
                {role
                  ? `مرحباً ${actorName || role} — مرحلتك تحتوي على ${arabicNum(pendingContracts.length)} عقد بانتظار إجراءك`
                  : "اختر دورك من القائمة الجانبية لتفعيل منطقة العمل الشخصية"
                }
              </p>
            </div>

            {/* Financial Counter */}
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              {[
                { label:"إجمالي قيمة العقود النشطة", val:`${formatSAR(totalSAR)} ر.س`, icon:"💰", color:GOLD_LIGHT },
                { label:"نسبة الإنجاز الكلية", val:`${arabicNum(completePct)}%`, icon:"📈", color:GREEN },
                { label:"إجمالي العقود", val:arabicNum(total), icon:"📁", color:"rgba(255,255,255,0.7)" },
              ].map((c,i) => (
                <div key={i} style={{
                  background:"rgba(255,255,255,0.06)",
                  border:"1px solid rgba(255,255,255,0.1)",
                  borderRadius:12, padding:"10px 16px", textAlign:"center",
                  minWidth:110,
                }}>
                  <div style={{ fontSize:"0.62rem", color:"rgba(255,255,255,0.4)", marginBottom:3 }}>{c.label}</div>
                  <div style={{ fontSize:"1.05rem", fontWeight:900, color:c.color }}>{c.icon} {c.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Overall progress bar */}
          <div style={{ height:3, background:"rgba(255,255,255,0.08)", borderRadius:3, marginTop:18 }}>
            <div style={{
              height:"100%", borderRadius:3,
              width:`${completePct}%`,
              background:`linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
              transition:"width 1.2s ease",
              boxShadow:`0 0 10px rgba(197,160,89,0.6)`,
            }} />
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:18 }}>

        {/* ── My Tasks (only when role is set + has pending) ── */}
        {role && pendingContracts.length > 0 && (
          <div style={{
            background:"#fff",
            border:`1.5px solid ${GOLD_BORDER}`,
            borderRadius:14,
            overflow:"hidden",
            animation:"golden-pulse 3s ease-in-out infinite, slide-in 0.4s ease",
          }}>
            <div style={{
              padding:"12px 18px",
              background:`linear-gradient(135deg, rgba(197,160,89,0.15), rgba(197,160,89,0.06))`,
              borderBottom:`1px solid ${GOLD_BORDER}`,
              display:"flex", alignItems:"center", gap:10,
            }}>
              <div style={{
                background:`linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                borderRadius:8, width:32, height:32,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"0.9rem", boxShadow:`0 2px 10px rgba(197,160,89,0.45)`,
              }}>⚡</div>
              <div>
                <div style={{ fontSize:"0.88rem", fontWeight:900, color:"#8B6914" }}>
                  منطقة عملك — {role}
                </div>
                <div style={{ fontSize:"0.65rem", color:"#9b8060" }}>
                  {arabicNum(pendingContracts.length)} عقد في مرحلتك تنتظر قرارك
                </div>
              </div>
            </div>
            <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:8 }}>
              {pendingContracts.map(c => {
                const days = daysAgo(c.updatedAt);
                const urgency = days >= 7 ? RED : days >= 3 ? "#f39c12" : GREEN;
                return (
                  <div
                    key={c.id}
                    onClick={() => onOpenContract(c.id)}
                    style={{
                      display:"flex", alignItems:"center", gap:12,
                      background: GOLD_BG,
                      border:`1px solid ${GOLD_BORDER}`,
                      borderRadius:10, padding:"10px 14px",
                      cursor:"pointer", transition:"box-shadow 0.2s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(197,160,89,0.28)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                  >
                    <div style={{
                      width:38, height:38, borderRadius:10, flexShrink:0,
                      background:`linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"1.05rem", boxShadow:`0 2px 8px rgba(197,160,89,0.35)`,
                    }}>{STAGES[c.currentStage - 1]?.icon ?? "📄"}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"0.8rem", fontWeight:800, color:"#1a1206", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize:"0.64rem", color:"#9b8060", marginTop:1 }}>
                        {c.contractNo} · م{c.currentStage}: {STAGES[c.currentStage-1]?.label}
                      </div>
                    </div>
                    <div style={{ textAlign:"center", flexShrink:0 }}>
                      <div style={{ fontSize:"0.68rem", fontWeight:900, color:urgency }}>
                        {arabicNum(days)} يوم
                      </div>
                      <div style={{ fontSize:"0.55rem", color:"#bbb" }}>في المرحلة</div>
                    </div>
                    <span style={{ color:GOLD, fontSize:"1.1rem" }}>←</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Workflow Stepper ── */}
        <div style={{
          background:"#fff",
          border:`1px solid ${GOLD_BORDER}`,
          borderRadius:14, overflow:"hidden",
          boxShadow:"0 4px 20px rgba(0,0,0,0.05)",
        }}>
          <div style={{
            padding:"13px 20px",
            background:`linear-gradient(135deg, ${DARK}, ${DARK2})`,
            borderBottom:`1px solid rgba(197,160,89,0.2)`,
            display:"flex", alignItems:"center", gap:10,
          }}>
            <div style={{
              width:30, height:30, borderRadius:8,
              background:`linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem",
              boxShadow:`0 2px 10px rgba(197,160,89,0.4)`,
            }}>⛲</div>
            <div>
              <div style={{ fontSize:"0.85rem", fontWeight:800, color:"#fff" }}>
                شريط تتبع المسار الحي — 11 مرحلة
              </div>
              <div style={{ fontSize:"0.62rem", color:"rgba(197,160,89,0.7)" }}>
                العقود الفعّالة في كل مرحلة · مضيئة تلقائياً
              </div>
            </div>
            {role && (
              <div style={{
                marginRight:"auto",
                background:"rgba(197,160,89,0.2)", border:"1px solid rgba(197,160,89,0.4)",
                borderRadius:6, padding:"3px 10px",
                fontSize:"0.6rem", fontWeight:700, color:GOLD_LIGHT,
              }}>
                {ROLES.find(r => r.name === role)?.icon} مرحلتك: {ROLES.find(r => r.name === role)?.stage.join("، ")}
              </div>
            )}
          </div>

          <div style={{ padding:"14px 14px 12px", overflowX:"auto" }}>
            <div style={{ display:"flex", alignItems:"flex-end", gap:3, minWidth:"max-content", direction:"rtl" }}>
              {STAGES.map((stage, idx) => {
                const stageNum = idx + 1;
                const count = stageCounts[idx] ?? 0;
                const hasC = count > 0;
                const isMyStage = role && ROLES.find(r => r.name === role)?.stage.includes(stageNum);
                const barH = hasC ? Math.max(10, Math.round((count / maxCount) * 48)) : 4;

                return (
                  <div key={stageNum} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:74 }}>
                    <div style={{
                      fontSize:"0.65rem", fontWeight:900,
                      color: hasC ? GOLD : "transparent",
                      background: hasC ? "rgba(197,160,89,0.12)" : "transparent",
                      border: hasC ? `1px solid ${GOLD_BORDER}` : "1px solid transparent",
                      borderRadius:5, padding:"1px 6px", minWidth:22, textAlign:"center",
                    }}>
                      {hasC ? arabicNum(count) : "—"}
                    </div>

                    <div style={{
                      width:50, borderRadius:"5px 5px 0 0",
                      height: barH,
                      background: hasC
                        ? `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD2})`
                        : "rgba(0,0,0,0.07)",
                      boxShadow: hasC ? "0 0 10px rgba(197,160,89,0.3)" : "none",
                      animation: hasC ? "stage-bar-glow 2.5s ease-in-out infinite" : "none",
                      transition:"height 0.7s ease",
                      position:"relative",
                    }}>
                      {hasC && (
                        <div style={{
                          position:"absolute", top:0, left:0, right:0, height:"40%",
                          background:"linear-gradient(180deg,rgba(255,255,255,0.25),transparent)",
                          borderRadius:"5px 5px 0 0",
                        }}/>
                      )}
                    </div>

                    <div style={{
                      display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                      padding:"6px 5px 5px", width:"100%",
                      background: isMyStage
                        ? "rgba(197,160,89,0.12)"
                        : hasC ? "rgba(197,160,89,0.05)" : "rgba(0,0,0,0.02)",
                      border: isMyStage
                        ? `2px solid ${GOLD}`
                        : hasC ? `1px solid ${GOLD_BORDER}` : "1.5px solid transparent",
                      borderRadius:9,
                      animation: isMyStage ? "golden-pulse 2.5s ease-in-out infinite" : "none",
                    }}>
                      <div style={{
                        width:28, height:28, borderRadius:"50%",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        background: isMyStage
                          ? `linear-gradient(135deg, ${GOLD}, ${GOLD2})`
                          : hasC ? `linear-gradient(135deg, ${GOLD2}, #6b5010)` : "rgba(0,0,0,0.06)",
                        color: (hasC || isMyStage) ? "#fff" : "#ccc",
                        fontSize:"0.7rem", fontWeight:900,
                        boxShadow: isMyStage ? `0 2px 10px rgba(197,160,89,0.5)` : hasC ? `0 1px 6px rgba(197,160,89,0.3)` : "none",
                      }}>
                        {stage.icon}
                      </div>
                      <div style={{
                        fontSize:"0.48rem", textAlign:"center",
                        color: isMyStage ? "#8B6914" : hasC ? "#8B6914" : "#bbb",
                        fontWeight: (hasC || isMyStage) ? 800 : 400,
                        maxWidth:66, lineHeight:1.3,
                      }}>
                        م{stageNum} {stage.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Charts Row ── */}
        {total > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

            {/* Donut Chart */}
            <div style={{
              background:"#fff", border:`1px solid ${GOLD_BORDER}`,
              borderRadius:14, padding:"18px 16px",
              boxShadow:"0 4px 20px rgba(0,0,0,0.05)",
            }}>
              <div style={{ fontSize:"0.85rem", fontWeight:800, color:"#1a1206", marginBottom:2 }}>
                توزيع حالة العقود
              </div>
              <div style={{ fontSize:"0.65rem", color:"#9b8060", marginBottom:8 }}>رسم بياني دائري</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: unknown) => [`${v} عقد`, ""]}
                    contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.75rem", direction:"rtl", border:`1px solid ${GOLD_BORDER}`, borderRadius:8 }}
                  />
                  <Legend
                    formatter={(val) => <span style={{ fontSize:"0.68rem", fontFamily:"'Cairo',sans-serif", color:"#4a3520" }}>{val}</span>}
                    iconSize={9} iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart — contracts per admin */}
            <div style={{
              background:"#fff", border:`1px solid ${GOLD_BORDER}`,
              borderRadius:14, padding:"18px 16px",
              boxShadow:"0 4px 20px rgba(0,0,0,0.05)",
            }}>
              <div style={{ fontSize:"0.85rem", fontWeight:800, color:"#1a1206", marginBottom:2 }}>
                العقود المتوقفة لدى كل مسؤول
              </div>
              <div style={{ fontSize:"0.65rem", color:"#9b8060", marginBottom:8 }}>يحدد نقاط الاختناق الفعلية</div>
              {adminData.length === 0 ? (
                <div style={{ textAlign:"center", padding:40, color:"#bbb", fontSize:"0.8rem" }}>لا عقود نشطة</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={adminData} margin={{ top:5, right:5, left:-20, bottom:30 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD_LIGHT} />
                        <stop offset="100%" stopColor={GOLD2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize:9, fill:"#6b6360", fontFamily:"'Cairo',sans-serif" }} angle={-30} textAnchor="end" interval={0} height={40} />
                    <YAxis tick={{ fontSize:9, fill:"#9b8060" }} allowDecimals={false} />
                    <Tooltip
                      formatter={(v: unknown) => [`${v} عقد`, ""]}
                      labelFormatter={(l: unknown) => adminData.find(d => d.name === l)?.fullName ?? String(l)}
                      contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.75rem", direction:"rtl", border:`1px solid ${GOLD_BORDER}`, borderRadius:8 }}
                      cursor={{ fill:"rgba(197,160,89,0.08)" }}
                    />
                    <Bar dataKey="count" fill="url(#barGrad)" radius={[4,4,0,0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ── Smart Contract Table ── */}
        <div style={{
          background:"#fff", border:`1px solid ${GOLD_BORDER}`,
          borderRadius:14, overflow:"hidden",
          boxShadow:"0 4px 20px rgba(0,0,0,0.05)",
        }}>
          <div style={{
            padding:"13px 20px", borderBottom:`1px solid ${GOLD_BORDER}`,
            background:"linear-gradient(135deg, #faf9f5, #f5f0e8)",
            display:"flex", alignItems:"center", gap:10,
          }}>
            <div style={{
              background:`linear-gradient(135deg, ${DARK}, ${DARK2})`,
              borderRadius:7, padding:"5px 7px", fontSize:"0.82rem",
            }}>📋</div>
            <div>
              <div style={{ fontSize:"0.85rem", fontWeight:800, color:"#1a1206" }}>جدول العقود الذكي</div>
              <div style={{ fontSize:"0.62rem", color:"#9b8060" }}>
                {total === 0 ? "لا توجد عقود بعد" : `${arabicNum(total)} عقد · مرتبة بالأولوية`}
                {role ? " · مرحلتك مُميّزة بالذهبي" : ""}
              </div>
            </div>
          </div>

          {total === 0 ? (
            <div style={{ padding:"40px 20px", textAlign:"center", color:"#bbb", fontSize:"0.85rem" }}>
              <div style={{ fontSize:"2rem", marginBottom:10 }}>📭</div>
              لا يوجد عقود بعد — ابدأ بإنشاء عقد جديد من قسم طلبات العقود
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#faf9f5" }}>
                    {["رقم العقد","العنوان","المورد","المرحلة الحالية","أيام في المرحلة","الحالة","تقدم"].map(h => (
                      <th key={h} style={{
                        padding:"9px 14px", textAlign:"right",
                        fontSize:"0.68rem", fontWeight:700, color:"#8B6914",
                        borderBottom:`1px solid ${GOLD_BORDER}`,
                        whiteSpace:"nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableContracts.map((c, i) => {
                    const myRole = role ? ROLES.find(r => r.name === role) : null;
                    const isMine = myRole?.stage.includes(c.currentStage) && c.status !== "completed";
                    const days = daysAgo(c.updatedAt);
                    const urgency = days >= 7 ? RED : days >= 3 ? "#f39c12" : GREEN;
                    const statusColor = c.status === "completed" ? GREEN : c.rejectionReason ? RED : GOLD;
                    const statusLabel = c.status === "completed" ? "مكتمل" : c.rejectionReason ? "مُعاد" : "نشط";
                    const pct = c.status === "completed" ? 100 : Math.round((c.currentStage / 11) * 100);

                    return (
                      <tr
                        key={c.id}
                        className="tr-hover"
                        onClick={() => onOpenContract(c.id)}
                        style={{
                          background: isMine ? "rgba(197,160,89,0.06)" : i % 2 === 0 ? "#fff" : "#fdfcfa",
                          borderBottom:`1px solid rgba(0,0,0,0.04)`,
                          borderRight: isMine ? `3px solid ${GOLD}` : "3px solid transparent",
                          transition:"background 0.15s",
                        }}
                      >
                        <td style={{ padding:"10px 14px", fontSize:"0.68rem", fontWeight:700, color:"#8B6914", whiteSpace:"nowrap" }}>
                          {c.contractNo}
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#1a1206", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {c.title}
                          </div>
                          {isMine && (
                            <div style={{ fontSize:"0.58rem", color:GOLD, fontWeight:800, marginTop:1 }}>
                              ⚡ في مرحلتك
                            </div>
                          )}
                        </td>
                        <td style={{ padding:"10px 14px", fontSize:"0.72rem", color:"#4a3520", whiteSpace:"nowrap" }}>
                          {c.vendorName}
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{
                            display:"inline-flex", alignItems:"center", gap:4,
                            background: isMine ? GOLD_BG : "rgba(0,0,0,0.04)",
                            border: isMine ? `1px solid ${GOLD_BORDER}` : "1px solid rgba(0,0,0,0.08)",
                            borderRadius:6, padding:"3px 8px",
                            fontSize:"0.65rem", fontWeight:700,
                            color: isMine ? "#8B6914" : "#4a3520",
                            whiteSpace:"nowrap",
                          }}>
                            {STAGES[c.currentStage - 1]?.icon} م{c.currentStage} {STAGES[c.currentStage - 1]?.label?.substring(0,12)}
                          </span>
                        </td>
                        <td style={{ padding:"10px 14px", textAlign:"center" }}>
                          <span style={{
                            fontSize:"0.7rem", fontWeight:900, color:urgency,
                            background:`${urgency}15`,
                            borderRadius:5, padding:"2px 7px",
                          }}>
                            {arabicNum(days)} يوم
                          </span>
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{
                            fontSize:"0.65rem", fontWeight:700, color:statusColor,
                            background:`${statusColor}15`, border:`1px solid ${statusColor}30`,
                            borderRadius:6, padding:"2px 8px",
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding:"10px 14px", minWidth:90 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <div style={{ flex:1, height:4, borderRadius:3, background:"rgba(0,0,0,0.07)" }}>
                              <div style={{
                                height:"100%", borderRadius:3,
                                width:`${pct}%`,
                                background: c.status === "completed"
                                  ? GREEN
                                  : `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
                                transition:"width 0.7s",
                              }} />
                            </div>
                            <span style={{ fontSize:"0.6rem", fontWeight:800, color:statusColor, flexShrink:0 }}>
                              {arabicNum(pct)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
