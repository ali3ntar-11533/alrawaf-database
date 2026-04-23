import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { STAGES, ROLES } from "./types";
import type { Contract } from "./types";

// ── Design tokens ──────────────────────────────────────────────────
const GOLD       = "#C5A059";
const GOLD2      = "#a88540";
const GOLD_LIGHT = "#e8c96a";
const GOLD_BG    = "rgba(197,160,89,0.07)";
const GOLD_BOR   = "rgba(197,160,89,0.22)";
const CREAM      = "#FBF9F4";
const GREEN      = "#27ae60";
const RED        = "#c0392b";
const AMBER      = "#f39c12";
const SHADOW_G   = "0 4px 24px rgba(197,160,89,0.14)";

const PIE_COLORS = [GOLD, GREEN, RED, "#9b59b6"];

// ── Helpers ────────────────────────────────────────────────────────
function arabicNum(n: number) {
  const m: Record<string, string> = { "0":"٠","1":"١","2":"٢","3":"٣","4":"٤","5":"٥","6":"٦","7":"٧","8":"٨","9":"٩" };
  return String(n).replace(/[0-9]/g, d => m[d] ?? d);
}
function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function formatSAR(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} مليون ر.س`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ألف ر.س`;
  return `${n} ر.س`;
}
function urgencyColor(days: number) {
  return days >= 7 ? RED : days >= 3 ? AMBER : GREEN;
}

// ── Card wrapper ───────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: `1px solid ${GOLD_BOR}`,
      boxShadow: SHADOW_G,
      overflow: "hidden",
      ...style,
    }}>{children}</div>
  );
}
function CardHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{
      padding: "14px 20px", borderBottom: `1px solid ${GOLD_BOR}`,
      background: CREAM, display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.9rem", boxShadow: `0 3px 10px rgba(197,160,89,0.35)`, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#1A1A1A" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "0.62rem", color: "#9b8060" }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────
interface Props {
  role: string;
  actorName: string;
  contracts: Contract[];
  pendingContracts: Contract[];
  onOpenContract: (id: number) => void;
}

export default function ContractDashboard({ role, actorName, contracts, pendingContracts, onOpenContract }: Props) {
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);

  // ── Computed ──
  const total    = contracts.length;
  const active   = contracts.filter(c => c.status === "active").length;
  const done     = contracts.filter(c => c.status === "completed").length;
  const rejected = contracts.filter(c => c.rejectionReason && c.status !== "completed").length;
  const totalSAR = contracts.filter(c => c.status === "active").reduce((s, c) => s + (c.value || 0), 0);
  const completePct = total > 0 ? Math.round((done / total) * 100) : 0;
  const avgDays = active > 0
    ? Math.round(contracts.filter(c => c.status === "active").reduce((s, c) => s + daysAgo(c.updatedAt), 0) / active)
    : 0;

  const stageCounts = STAGES.map((_, i) =>
    contracts.filter(c => c.currentStage === i + 1 && c.status === "active")
  );

  const adminData = ROLES.map(r => ({
    name: r.name.replace("مدير ", "").replace("أخصائي ", "").replace("مسؤول ", ""),
    fullName: r.name, icon: r.icon,
    count: r.stage.reduce((s, stg) =>
      s + contracts.filter(c => c.currentStage === stg && c.status === "active").length, 0
    ),
  })).filter(d => d.count > 0);

  const pieData = [
    { name: "قيد الإجراء", value: active },
    { name: "مكتملة",      value: done },
    { name: "مُعادة",      value: rejected },
  ].filter(d => d.value > 0);

  const tableContracts = [...contracts].sort((a, b) => {
    const myRole = role ? ROLES.find(r => r.name === role) : null;
    const aM = myRole?.stage.includes(a.currentStage) && a.status !== "completed";
    const bM = myRole?.stage.includes(b.currentStage) && b.status !== "completed";
    if (aM && !bM) return -1;
    if (!aM && bM)  return  1;
    return daysAgo(b.updatedAt) - daysAgo(a.updatedAt);
  });

  const myRoleInfo = ROLES.find(r => r.name === role);

  return (
    <div dir="rtl" style={{
      background: "#F8F9FA",
      minHeight: "100vh",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
    }}>
      <style>{`
        @keyframes pulse-gold {
          0%,100% { box-shadow: 0 0 0 0 rgba(197,160,89,.4); }
          50%      { box-shadow: 0 0 18px 5px rgba(197,160,89,.1); }
        }
        @keyframes slide-up {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .hover-lift { transition: transform 0.18s, box-shadow 0.18s; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(197,160,89,0.22) !important; }
        .tr-row { cursor:pointer; transition:background 0.12s; }
        .tr-row:hover { background: rgba(197,160,89,0.05) !important; }
        .stage-node { transition: transform 0.18s, box-shadow 0.18s; cursor:default; }
        .stage-node:hover { transform: scale(1.08); }
        .popover-enter { animation: slide-up 0.18s ease; }
      `}</style>

      {/* ── Cream Hero Bar ── */}
      <div style={{
        background: `linear-gradient(135deg, ${CREAM} 0%, #F5EED9 100%)`,
        borderBottom: `2px solid ${GOLD_BOR}`,
        padding: "20px 28px 18px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circle */}
        <div style={{ position:"absolute", top:-60, left:-60, width:200, height:200, borderRadius:"50%", background:"rgba(197,160,89,0.06)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-40, right:80, width:150, height:150, borderRadius:"50%", background:"rgba(197,160,89,0.04)", pointerEvents:"none" }} />

        <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:"0.58rem", fontWeight:800, letterSpacing:"0.12em", color:"rgba(197,160,89,0.8)", marginBottom:4 }}>
              AL-RAWAF CONTRACT MANAGEMENT SYSTEM
            </div>
            <h1 style={{ fontSize:"1.45rem", fontWeight:900, color:"#1A1A1A", margin:0, lineHeight:1.2 }}>
              لوحة القيادة التنفيذية
            </h1>
            <p style={{ fontSize:"0.76rem", color:"#6b5b3e", marginTop:4 }}>
              {role
                ? `مرحباً ${actorName || role} · ${pendingContracts.length} عقد بانتظار قرارك`
                : "اختر دورك من القائمة الجانبية لتفعيل منطقة العمل الشخصية"
              }
            </p>
          </div>

          {/* Live Progress Indicator */}
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"#fff", border:`1px solid ${GOLD_BOR}`,
            borderRadius:12, padding:"8px 16px",
            boxShadow: SHADOW_G,
          }}>
            <div style={{
              width:42, height:42, borderRadius:"50%",
              background:`conic-gradient(${GOLD} ${completePct * 3.6}deg, #e8e8e8 0deg)`,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:"0.55rem", fontWeight:900, color:GOLD }}>{arabicNum(completePct)}%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize:"0.68rem", fontWeight:800, color:"#1A1A1A" }}>نسبة الإنجاز</div>
              <div style={{ fontSize:"0.6rem", color:"#9b8060" }}>{arabicNum(done)} من {arabicNum(total)} عقد</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:20 }}>

        {/* ── KPI Tiles ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14 }}>
          {[
            { label:"إجمالي العقود",         val:arabicNum(total),            icon:"📁", color:"#2980b9",  sub:"كل الحالات"            },
            { label:"العقود النشطة",          val:arabicNum(active),           icon:"⚡", color:GOLD,       sub:"قيد التنفيذ الآن"       },
            { label:"قيمة العقود النشطة",     val:formatSAR(totalSAR),         icon:"💰", color:GREEN,      sub:"ريال سعودي"             },
            { label:"متوسط زمن الاعتماد",     val:`${arabicNum(avgDays)} يوم`, icon:"⏱️", color:active>0 && avgDays>5 ? RED : GREEN, sub:"لكل مرحلة" },
          ].map((k, i) => (
            <div key={i} className="hover-lift" style={{
              background:"#fff", border:`1px solid ${GOLD_BOR}`,
              borderRadius:14, padding:"16px 18px",
              boxShadow: SHADOW_G,
              borderTop:`3px solid ${k.color}`,
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ fontSize:"0.7rem", fontWeight:700, color:"#6b5b3e" }}>{k.label}</div>
                <div style={{
                  width:32, height:32, borderRadius:9, flexShrink:0,
                  background:`${k.color}15`, border:`1px solid ${k.color}30`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem",
                }}>{k.icon}</div>
              </div>
              <div style={{ fontSize:"1.25rem", fontWeight:900, color:"#1A1A1A" }}>{k.val}</div>
              <div style={{ fontSize:"0.58rem", color:"#aaa", marginTop:2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── My Tasks ── (only if role + pending) */}
        {role && pendingContracts.length > 0 && (
          <Card style={{ animation:"pulse-gold 3s ease-in-out infinite, slide-up 0.35s ease" }}>
            <CardHeader icon="⚡" title={`منطقة عملك — ${role}`} subtitle={`${arabicNum(pendingContracts.length)} عقد في مرحلتك`} />
            <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
              {pendingContracts.map(c => {
                const days = daysAgo(c.updatedAt);
                const urg  = urgencyColor(days);
                return (
                  <div
                    key={c.id}
                    onClick={() => onOpenContract(c.id)}
                    className="hover-lift"
                    style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"11px 14px", borderRadius:11,
                      background: GOLD_BG, border:`1px solid ${GOLD_BOR}`,
                      cursor:"pointer",
                    }}
                  >
                    <div style={{
                      width:38, height:38, borderRadius:10, flexShrink:0,
                      background:`linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"1.05rem", boxShadow:`0 2px 8px rgba(197,160,89,0.35)`,
                    }}>{STAGES[c.currentStage - 1]?.icon ?? "📄"}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"0.82rem", fontWeight:800, color:"#1A1A1A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                      <div style={{ fontSize:"0.64rem", color:"#9b8060", marginTop:1 }}>{c.contractNo} · م{c.currentStage}: {STAGES[c.currentStage-1]?.label}</div>
                    </div>
                    <div style={{ textAlign:"center", flexShrink:0 }}>
                      <div style={{ fontSize:"0.72rem", fontWeight:900, color:urg, background:`${urg}14`, borderRadius:6, padding:"2px 8px" }}>
                        {arabicNum(days)} يوم
                      </div>
                    </div>
                    <span style={{ color:GOLD, fontWeight:800 }}>←</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── Charts Row ── */}
        {total > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Card>
              <CardHeader icon="🍩" title="توزيع حالة العقود" subtitle="رسم بياني دائري تفاعلي" />
              <div style={{ padding:"12px 16px 16px" }}>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: unknown) => [`${v} عقد`, ""]}
                      contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.78rem", direction:"rtl", border:`1px solid ${GOLD_BOR}`, borderRadius:10, boxShadow:SHADOW_G }}
                    />
                    <Legend
                      formatter={(val) => <span style={{ fontSize:"0.7rem", fontFamily:"'Cairo',sans-serif", color:"#4a3520" }}>{val}</span>}
                      iconSize={9} iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader icon="📊" title="ضغط العمل على كل مسؤول" subtitle="نقاط الاختناق الفعلية في المسار" />
              <div style={{ padding:"12px 16px 16px" }}>
                {adminData.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:"#ccc", fontSize:"0.8rem" }}>لا عقود نشطة</div>
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={adminData} margin={{ top:5, right:10, left:-20, bottom:36 }}>
                      <defs>
                        <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={GOLD_LIGHT} />
                          <stop offset="100%" stopColor={GOLD2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize:9, fill:"#6b6360", fontFamily:"'Cairo',sans-serif" }} angle={-25} textAnchor="end" interval={0} height={44} />
                      <YAxis tick={{ fontSize:9, fill:"#9b8060" }} allowDecimals={false} />
                      <Tooltip
                        formatter={(v: unknown) => [`${v} عقد`, ""]}
                        labelFormatter={(l: unknown) => adminData.find(d => d.name === l)?.fullName ?? String(l)}
                        contentStyle={{ fontFamily:"'Cairo',sans-serif", fontSize:"0.78rem", direction:"rtl", border:`1px solid ${GOLD_BOR}`, borderRadius:10, boxShadow:SHADOW_G }}
                        cursor={{ fill:"rgba(197,160,89,0.07)" }}
                      />
                      <Bar dataKey="count" fill="url(#barG)" radius={[5,5,0,0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── Interactive Roadmap ── */}
        <Card>
          <CardHeader
            icon="🗺️"
            title="خريطة دورة حياة العقد التفاعلية"
            subtitle="مرر المؤشر فوق أي مرحلة لمشاهدة العقود الموجودة فيها حالياً"
          />
          {myRoleInfo && (
            <div style={{
              padding:"6px 20px",
              background:`linear-gradient(135deg, ${GOLD_BG}, rgba(197,160,89,0.03))`,
              borderBottom:`1px solid ${GOLD_BOR}`,
              fontSize:"0.68rem", fontWeight:700, color:"#8B6914",
              display:"flex", alignItems:"center", gap:6,
            }}>
              {myRoleInfo.icon} مرحلتك: {myRoleInfo.stage.map(s => `م${s} ${STAGES[s-1]?.label}`).join("  ·  ")}
            </div>
          )}

          <div style={{ padding:"22px 16px 20px", overflowX:"auto" }}>
            <div style={{ display:"flex", alignItems:"center", minWidth:"max-content", direction:"rtl", gap:0, position:"relative" }}>
              {/* Connecting line */}
              <div style={{
                position:"absolute", top:28, right:36, left:36,
                height:2, background:`linear-gradient(90deg, ${GOLD_BOR}, ${GOLD_BOR})`,
                zIndex:0,
              }} />

              {STAGES.map((stage, idx) => {
                const stageNum = idx + 1;
                const stageContracts = stageCounts[idx] ?? [];
                const hasC    = stageContracts.length > 0;
                const isMyStage = myRoleInfo?.stage.includes(stageNum) ?? false;
                const isHov   = hoveredStage === stageNum;

                return (
                  <div
                    key={stageNum}
                    style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", zIndex:1, minWidth:76 }}
                    onMouseEnter={() => setHoveredStage(stageNum)}
                    onMouseLeave={() => setHoveredStage(null)}
                  >
                    {/* Popover */}
                    {isHov && (
                      <div className="popover-enter" style={{
                        position:"absolute", bottom:"100%", marginBottom:10,
                        background:"#fff", border:`1.5px solid ${GOLD_BOR}`,
                        borderRadius:12, padding:"10px 14px",
                        minWidth:190, maxWidth:220,
                        boxShadow:"0 8px 32px rgba(0,0,0,0.12)",
                        zIndex:50,
                        left:"50%", transform:"translateX(-50%)",
                      }}>
                        <div style={{ fontSize:"0.68rem", fontWeight:800, color:GOLD, marginBottom:6, borderBottom:`1px solid ${GOLD_BOR}`, paddingBottom:5 }}>
                          {stage.icon} م{stageNum}: {stage.label}
                        </div>
                        {stageContracts.length === 0 ? (
                          <div style={{ fontSize:"0.64rem", color:"#ccc", textAlign:"center", padding:"4px 0" }}>لا عقود في هذه المرحلة</div>
                        ) : (
                          stageContracts.map(c => (
                            <div
                              key={c.id}
                              onClick={() => onOpenContract(c.id)}
                              style={{
                                fontSize:"0.68rem", color:"#1A1A1A", padding:"4px 0",
                                borderBottom:"1px solid #f0f0f0", cursor:"pointer",
                                display:"flex", alignItems:"center", gap:6,
                              }}
                            >
                              <span style={{ fontSize:"0.55rem", color:GOLD }}>◆</span>
                              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</span>
                            </div>
                          ))
                        )}
                        {/* Arrow */}
                        <div style={{
                          position:"absolute", bottom:-7, left:"50%", transform:"translateX(-50%) rotate(45deg)",
                          width:12, height:12, background:"#fff", border:`1px solid ${GOLD_BOR}`,
                          borderTop:"none", borderRight:"none",
                        }} />
                      </div>
                    )}

                    {/* Count Badge */}
                    <div style={{
                      height:20, display:"flex", alignItems:"center", justifyContent:"center",
                      marginBottom:6,
                    }}>
                      {hasC && (
                        <div style={{
                          background:`linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                          color:"#fff", borderRadius:"50%",
                          width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"0.6rem", fontWeight:900,
                          boxShadow:`0 2px 8px rgba(197,160,89,0.45)`,
                        }}>{stageContracts.length}</div>
                      )}
                    </div>

                    {/* Node */}
                    <div className="stage-node" style={{
                      width:56, height:56, borderRadius:"50%", flexShrink:0,
                      background: isMyStage
                        ? `linear-gradient(135deg, ${GOLD}, ${GOLD2})`
                        : hasC ? `linear-gradient(135deg, ${GOLD}88, ${GOLD2}66)`
                               : "#f0f0f0",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"1.1rem",
                      border: isMyStage ? `3px solid ${GOLD}` : hasC ? `2px solid ${GOLD_BOR}` : "2px solid #e0e0e0",
                      boxShadow: isMyStage
                        ? `0 0 0 4px rgba(197,160,89,0.2), 0 4px 16px rgba(197,160,89,0.4)`
                        : hasC ? `0 4px 14px rgba(197,160,89,0.25)` : "0 2px 6px rgba(0,0,0,0.06)",
                      animation: isMyStage ? "pulse-gold 2.5s ease-in-out infinite" : "none",
                      zIndex:2,
                    }}>
                      {stage.icon}
                    </div>

                    {/* Label */}
                    <div style={{
                      marginTop:7, textAlign:"center",
                      padding:"4px 3px",
                      background: isMyStage ? GOLD_BG : "transparent",
                      border: isMyStage ? `1px solid ${GOLD_BOR}` : "1px solid transparent",
                      borderRadius:7,
                    }}>
                      <div style={{ fontSize:"0.52rem", fontWeight:900, color:isMyStage ? "#8B6914" : hasC ? GOLD2 : "#aaa" }}>
                        م{stageNum}
                      </div>
                      <div style={{ fontSize:"0.5rem", color:isMyStage ? "#6b5b3e" : hasC ? "#6b5b3e" : "#ccc", lineHeight:1.3, maxWidth:68 }}>
                        {stage.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ── Smart Contract Table ── */}
        <Card>
          <CardHeader
            icon="📋"
            title="جدول العقود الذكي"
            subtitle={total === 0 ? "لا توجد عقود بعد" : `${arabicNum(total)} عقد · مرتبة حسب الأولوية${role ? " · مرحلتك مُميّزة" : ""}`}
          />
          {total === 0 ? (
            <div style={{ padding:"50px 20px", textAlign:"center" }}>
              <div style={{ fontSize:"2.5rem", marginBottom:10 }}>📭</div>
              <div style={{ fontSize:"0.88rem", color:"#bbb" }}>لا يوجد عقود بعد — ابدأ من قسم طلبات العقود</div>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:CREAM }}>
                    {["رقم العقد","العنوان","المورد","المرحلة","الأيام","الحالة","التقدم"].map(h => (
                      <th key={h} style={{
                        padding:"10px 16px", textAlign:"right",
                        fontSize:"0.68rem", fontWeight:800, color:"#8B6914",
                        borderBottom:`1.5px solid ${GOLD_BOR}`,
                        whiteSpace:"nowrap", letterSpacing:"0.02em",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableContracts.map((c, i) => {
                    const myRole = role ? ROLES.find(r => r.name === role) : null;
                    const isMine = myRole?.stage.includes(c.currentStage) && c.status !== "completed";
                    const days   = daysAgo(c.updatedAt);
                    const urg    = urgencyColor(days);
                    const statusColor = c.status === "completed" ? GREEN : c.rejectionReason ? RED : GOLD;
                    const statusLabel = c.status === "completed" ? "مكتمل" : c.rejectionReason ? "مُعاد" : "نشط";
                    const pct = c.status === "completed" ? 100 : Math.round((c.currentStage / 11) * 100);

                    return (
                      <tr
                        key={c.id}
                        className="tr-row"
                        onClick={() => onOpenContract(c.id)}
                        style={{
                          background: isMine ? "rgba(197,160,89,0.05)" : i % 2 === 0 ? "#fff" : "#fdfcfa",
                          borderBottom:`1px solid rgba(0,0,0,0.04)`,
                          borderRight: isMine ? `3px solid ${GOLD}` : "3px solid transparent",
                        }}
                      >
                        <td style={{ padding:"11px 16px", fontSize:"0.7rem", fontWeight:800, color:"#8B6914", whiteSpace:"nowrap" }}>
                          {c.contractNo}
                        </td>
                        <td style={{ padding:"11px 16px" }}>
                          <div style={{ fontSize:"0.8rem", fontWeight:700, color:"#1A1A1A", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {c.title}
                          </div>
                          {isMine && (
                            <div style={{ fontSize:"0.58rem", color:GOLD, fontWeight:800, marginTop:1 }}>⚡ في مرحلتك</div>
                          )}
                        </td>
                        <td style={{ padding:"11px 16px", fontSize:"0.74rem", color:"#4a3520", whiteSpace:"nowrap" }}>
                          {c.vendorName}
                        </td>
                        <td style={{ padding:"11px 16px" }}>
                          <span style={{
                            display:"inline-flex", alignItems:"center", gap:4,
                            background: isMine ? GOLD_BG : "#f8f8f8",
                            border: isMine ? `1px solid ${GOLD_BOR}` : "1px solid #eee",
                            borderRadius:7, padding:"3px 9px",
                            fontSize:"0.65rem", fontWeight:700,
                            color: isMine ? "#8B6914" : "#4a3520", whiteSpace:"nowrap",
                          }}>
                            {STAGES[c.currentStage - 1]?.icon} م{c.currentStage} {STAGES[c.currentStage - 1]?.label?.slice(0,10)}
                          </span>
                        </td>
                        <td style={{ padding:"11px 16px", textAlign:"center" }}>
                          <span style={{
                            fontSize:"0.72rem", fontWeight:900, color:urg,
                            background:`${urg}14`, borderRadius:6, padding:"2px 8px",
                          }}>
                            {arabicNum(days)}
                          </span>
                        </td>
                        <td style={{ padding:"11px 16px" }}>
                          <span style={{
                            fontSize:"0.65rem", fontWeight:700, color:statusColor,
                            background:`${statusColor}14`, border:`1px solid ${statusColor}28`,
                            borderRadius:7, padding:"3px 9px",
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding:"11px 16px", minWidth:100 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ flex:1, height:5, borderRadius:3, background:"#ececec" }}>
                              <div style={{
                                height:"100%", borderRadius:3,
                                width:`${pct}%`,
                                background: c.status === "completed"
                                  ? `linear-gradient(90deg, ${GREEN}, #2ecc71)`
                                  : `linear-gradient(90deg, ${GOLD2}, ${GOLD_LIGHT})`,
                              }} />
                            </div>
                            <span style={{ fontSize:"0.6rem", fontWeight:900, color:statusColor, flexShrink:0 }}>
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
        </Card>

      </div>
    </div>
  );
}
