import { useState, useMemo, type CSSProperties } from "react";
import type { Contract } from "./types";
import { tafqit } from "./tafqit";

/* ── Design tokens ─────────────────────────────────── */
const BLUE_M  = "#1976D2";
const BLUE    = "#1565C0";
const BLUE_L  = "#4A90D9";
const AMBER   = "#F5A623";
const DARK    = "#0C1427";
const GREEN   = "#22c55e";
const RED     = "#ef4444";
const BLUE_B  = "rgba(25,118,210,0.07)";
const BLUE_BR = "rgba(25,118,210,0.20)";
const BLUE_B2 = "rgba(25,118,210,0.04)";
const AMB_B   = "rgba(245,166,35,0.08)";
const AMB_BR  = "rgba(245,166,35,0.28)";

const TRACKING_ROLE = "مسؤول المتابعة";

interface ExecPhase { id: number; label: string; pct: number; }
interface BoqItem   { id: number; code: string; description: string; unit: string; qty: number; unitPrice: number; }
interface Payment   { id: number; no: number; date: string; amount: number; status: "paid" | "pending"; }

const UNITS = ["م²", "م³", "م.ط", "طن", "نقطة", "وحدة", "مقطوعي"];
const INIT_PHASES: ExecPhase[] = [
  { id: 1, label: "التصميم والتخطيط",  pct: 0 },
  { id: 2, label: "توريد المواد",       pct: 0 },
  { id: 3, label: "الأعمال الإنشائية", pct: 0 },
  { id: 4, label: "التشطيبات",         pct: 0 },
  { id: 5, label: "الاختبارات والفحص", pct: 0 },
  { id: 6, label: "التسليم النهائي",   pct: 0 },
];

function fmt(n: number) {
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SectionTitle({ children, accent }: { children: string; accent?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      paddingBottom: 10, marginBottom: 14,
      borderBottom: `2px solid ${accent ?? BLUE_BR}`,
    }}>
      <div style={{ width: 4, height: 18, borderRadius: 2, background: accent ?? BLUE_M }}/>
      <span style={{ fontSize: "0.82rem", fontWeight: 900, color: DARK }}>{children}</span>
    </div>
  );
}

function StatBox({ label, value, valueStyle }: { label: string; value: string; valueStyle?: CSSProperties }) {
  return (
    <div style={{
      background: "#fff", border: `1.5px solid #E8E8E8`,
      borderRadius: 10, padding: "10px 14px",
      display: "flex", flexDirection: "column", gap: 3,
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    }}>
      <span style={{ fontSize: "0.58rem", color: "#999", fontWeight: 700, letterSpacing: "0.03em" }}>{label}</span>
      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1A1A1A", ...valueStyle }}>{value}</span>
    </div>
  );
}

function CircleChart({ pct, size = 90 }: { pct: number; size?: number }) {
  const r    = 15.9155;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 100 ? GREEN : pct >= 50 ? BLUE_M : AMBER;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: size, height: size, transform: "rotate(-90deg)" }}>
        <path fill="none" stroke="#EEF2F8" strokeWidth="3"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size < 80 ? "0.8rem" : "1.05rem", fontWeight: 900, color }}>{pct}%</span>
      </div>
    </div>
  );
}

function ReadOnly({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 12px", borderRadius: 8,
      background: "rgba(0,0,0,0.03)", border: "1px solid #EEE",
      fontSize: "0.72rem", color: "#888",
    }}>
      <span style={{ fontSize: "0.58rem", color: BLUE_L, fontWeight: 700 }}>للاطلاع فقط</span>
      {children}
    </div>
  );
}

export default function ContractMonitor({ contract, role }: { contract: Contract; role: string }) {
  const canEdit = role === TRACKING_ROLE;

  const [phases, setPhases]           = useState<ExecPhase[]>(INIT_PHASES);
  const [editPhaseId, setEditPhaseId] = useState<number | null>(null);
  const [phaseDraft, setPhaseDraft]   = useState("");
  const [boqItems, setBoqItems]       = useState<BoqItem[]>([
    { id: 1, code: "01", description: "", unit: "م²", qty: 0, unitPrice: 0 },
  ]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const remainingDays = useMemo(() => {
    if (!contract.endDate) return null;
    return Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / 86_400_000);
  }, [contract.endDate]);

  const plannedDays = useMemo(() => {
    if (!contract.startDate || !contract.endDate) return null;
    return Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / 86_400_000);
  }, [contract.startDate, contract.endDate]);

  const elapsedDays = useMemo(() => {
    if (!contract.startDate) return null;
    return Math.ceil((Date.now() - new Date(contract.startDate).getTime()) / 86_400_000);
  }, [contract.startDate]);

  const boqTotal      = useMemo(() => boqItems.reduce((s, r) => s + r.qty * r.unitPrice, 0), [boqItems]);
  const contractValue = contract.value > 0 ? contract.value : boqTotal;
  const paidTotal     = useMemo(() => payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0), [payments]);
  const paidPct       = contractValue > 0 ? Math.min(100, Math.round((paidTotal / contractValue) * 100)) : 0;
  const overallPct    = useMemo(() => phases.length ? Math.round(phases.reduce((s, p) => s + p.pct, 0) / phases.length) : 0, [phases]);

  function updatePhasePct(id: number, val: number) {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, pct: Math.max(0, Math.min(100, val)) } : p));
  }
  function addBoqRow() {
    const id = Date.now();
    setBoqItems(prev => [...prev, { id, code: String(prev.length + 1).padStart(2, "0"), description: "", unit: "م²", qty: 0, unitPrice: 0 }]);
  }
  function updateBoq(id: number, field: keyof BoqItem, value: string | number) {
    setBoqItems(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  function removeBoqRow(id: number) { setBoqItems(prev => prev.filter(r => r.id !== id)); }
  function addPayment() {
    const no = payments.length + 1;
    setPayments(prev => [...prev, { id: Date.now(), no, date: new Date().toISOString().split("T")[0], amount: 0, status: "pending" }]);
  }
  function updatePayment(id: number, field: keyof Payment, value: string | number) {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }
  function removePayment(id: number) { setPayments(prev => prev.filter(p => p.id !== id)); }

  const inputSt: CSSProperties = {
    padding: "5px 8px", borderRadius: 7,
    border: `1.5px solid ${BLUE_BR}`, fontSize: "0.72rem",
    fontFamily: "'Cairo','Tajawal',sans-serif", outline: "none", width: "100%",
    background: canEdit ? "#fff" : "#F9FAFB", color: canEdit ? "#1A1A1A" : "#888",
  };
  const cellSt: CSSProperties  = { padding: "7px 8px", borderBottom: `1px solid #F0F0F0`, textAlign: "center", fontSize: "0.72rem" };
  const thSt:   CSSProperties  = { padding: "8px 10px", background: BLUE_B, color: BLUE, fontSize: "0.67rem", fontWeight: 800, borderBottom: `2px solid ${BLUE_BR}`, textAlign: "center" };
  const cardSt: CSSProperties  = { background: "#fff", border: `1px solid #E8E8E8`, borderRadius: 14, padding: "18px 20px", marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" };

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo','Tajawal',sans-serif", color: "#1A1A1A" }}>

      {/* ── Permission notice ── */}
      {!canEdit && (
        <div style={{
          background: BLUE_B, border: `1px solid ${BLUE_BR}`, borderRadius: 10,
          padding: "10px 16px", marginBottom: 16, fontSize: "0.72rem",
          color: BLUE_M, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: "0.9rem" }}>ℹ</span>
          هذه اللوحة للاطلاع فقط — التعديل متاح لمسؤول المتابعة
        </div>
      )}

      {/* ── Header Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, marginBottom: 16 }}>
        <StatBox label="اسم المشروع"          value={contract.projectName || "—"} />
        <StatBox label="اسم المورد / المقاول" value={contract.vendorName} />
        <StatBox label="رقم العقد"            value={contract.contractNo} />
        <StatBox label="نوع الأعمال"          value={contract.contractType || "—"} />
        <StatBox label="تاريخ البداية"         value={contract.startDate || "—"} />
        <StatBox label="تاريخ النهاية"         value={contract.endDate || "—"} />
        <StatBox label="حالة العقد" value="مكتمل" valueStyle={{ color: GREEN }} />
      </div>

      {/* ── Execution Path + Time Box ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 16 }}>

        {/* Phase stepper */}
        <div style={cardSt}>
          <SectionTitle>مسار تنفيذ العقد</SectionTitle>

          {/* Stepper nodes */}
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: "10px 0", margin: "0 28px" }}>
            <div style={{ position: "absolute", top: "50%", right: 0, left: 0, height: 2, background: "#EEF2F8", transform: "translateY(-50%)", zIndex: 1 }} />
            {(() => {
              const done = phases.filter(p => p.pct === 100).length;
              return (
                <div style={{
                  position: "absolute", top: "50%", right: 0, height: 2,
                  width: `${phases.length > 0 ? (done / phases.length) * 100 : 0}%`,
                  background: `linear-gradient(90deg, ${BLUE}, ${BLUE_L})`,
                  transform: "translateY(-50%)", zIndex: 2, borderRadius: 2, transition: "width 0.5s",
                }} />
              );
            })()}

            {[...phases].reverse().map(p => {
              const status = p.pct === 100 ? "completed" : p.pct > 0 ? "active" : "pending";
              return (
                <div key={p.id} style={{ position: "relative", zIndex: 3, textAlign: "center", width: 72 }}>
                  <span style={{ display: "block", fontSize: "0.58rem", marginBottom: 6, color: "#777", lineHeight: 1.2 }}>{p.label}</span>
                  <div
                    onClick={() => { if (canEdit) { setEditPhaseId(p.id); setPhaseDraft(String(p.pct)); } }}
                    title={canEdit ? "انقر لتعديل النسبة" : "للاطلاع فقط"}
                    style={{
                      width: 26, height: 26, borderRadius: "50%", margin: "0 auto 4px",
                      background: status === "completed" ? GREEN : status === "active" ? BLUE_B : "#F0F4FA",
                      border: `2px solid ${status === "completed" ? GREEN : status === "active" ? BLUE_M : "#D8E2F0"}`,
                      boxShadow: status === "active" ? `0 0 8px rgba(25,118,210,0.35)` : "none",
                      cursor: canEdit ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.65rem", fontWeight: 800,
                      color: status === "completed" ? "#fff" : status === "active" ? BLUE_M : "#ccc",
                      transition: "all 0.2s",
                    }}
                  >
                    {status === "completed" ? "✓" : p.id}
                  </div>
                  {canEdit && editPhaseId === p.id ? (
                    <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                      <input
                        autoFocus
                        value={phaseDraft}
                        onChange={e => setPhaseDraft(e.target.value)}
                        onBlur={() => { updatePhasePct(p.id, Number(phaseDraft)); setEditPhaseId(null); }}
                        onKeyDown={e => { if (e.key === "Enter") { updatePhasePct(p.id, Number(phaseDraft)); setEditPhaseId(null); } }}
                        style={{ width: 38, padding: "2px 4px", borderRadius: 5, border: `1.5px solid ${BLUE_BR}`, fontSize: "0.65rem", textAlign: "center", fontFamily: "'Cairo','Tajawal',sans-serif" }}
                      />
                      <span style={{ fontSize: "0.6rem", lineHeight: "22px", color: "#999" }}>%</span>
                    </div>
                  ) : (
                    <span style={{
                      fontSize: "0.62rem", fontWeight: 700,
                      color: status === "completed" ? GREEN : status === "active" ? BLUE_M : "#ccc",
                    }}>{p.pct}%</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: "0.6rem", color: "#999" }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#D8E2F0", marginLeft: 3 }} />لم يبدأ</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: BLUE_M, marginLeft: 3 }} />قيد التنفيذ</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: GREEN, marginLeft: 3 }} />مكتمل</span>
            {canEdit && <span style={{ color: BLUE_L }}>· انقر على الدائرة لتعديل النسبة</span>}
          </div>

          {/* Phase bars */}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {phases.map(p => (
              <div key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.64rem", marginBottom: 2, color: "#777" }}>
                  <span>{p.id}. {p.label}</span>
                  <span style={{ fontWeight: 700, color: p.pct === 100 ? GREEN : p.pct > 0 ? BLUE_M : "#ccc" }}>{p.pct}%</span>
                </div>
                <div style={{ height: 5, background: "#EEF2F8", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${p.pct}%`,
                    background: p.pct === 100 ? GREEN : `linear-gradient(90deg, ${BLUE}, ${BLUE_M})`,
                    borderRadius: 3, transition: "width 0.4s",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time box */}
        <div style={{
          ...cardSt, marginBottom: 0, minWidth: 130,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: "0.62rem", color: "#999", textAlign: "center" }}>المدة المتبقية</span>
          <span style={{
            fontSize: remainingDays != null ? "2.4rem" : "1.2rem", fontWeight: 900, lineHeight: 1,
            color: remainingDays == null ? "#ccc" : remainingDays <= 30 ? RED : remainingDays <= 90 ? AMBER : BLUE_M,
          }}>
            {remainingDays != null ? Math.abs(remainingDays) : "—"}
          </span>
          {remainingDays != null && (
            <span style={{ fontSize: "0.62rem", color: "#999" }}>
              {remainingDays < 0 ? "يوم (تأخير)" : "يوم"}
            </span>
          )}
          {plannedDays && (
            <div style={{ marginTop: 6, fontSize: "0.6rem", color: "#bbb", textAlign: "center", lineHeight: 1.7 }}>
              <div>المخططة</div>
              <div style={{ fontWeight: 700, color: "#777" }}>{plannedDays} يوم</div>
              {elapsedDays != null && (
                <>
                  <div style={{ marginTop: 2 }}>المنقضية</div>
                  <div style={{ fontWeight: 700, color: "#777" }}>{elapsedDays} يوم</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── BOQ Table ── */}
      <div style={cardSt}>
        <SectionTitle accent={AMB_BR}>نطاق العمل — جدول الكميات (BOQ)</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["رقم البند", "وصف البند", "الوحدة", "الكمية", "سعر الوحدة (ر.س)", "الإجمالي (ر.س)", ""].map(h => (
                  <th key={h} style={thSt}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {boqItems.map(row => (
                <tr key={row.id} style={{ background: "#fff" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = BLUE_B2; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                  <td style={cellSt}>
                    <input value={row.code} onChange={e => canEdit && updateBoq(row.id, "code", e.target.value)} readOnly={!canEdit} style={{ ...inputSt, width: 44 }} />
                  </td>
                  <td style={{ ...cellSt, textAlign: "right" }}>
                    <input value={row.description} onChange={e => canEdit && updateBoq(row.id, "description", e.target.value)} placeholder="وصف البند..." readOnly={!canEdit} style={{ ...inputSt, minWidth: 160 }} />
                  </td>
                  <td style={cellSt}>
                    <select value={row.unit} onChange={e => canEdit && updateBoq(row.id, "unit", e.target.value)} disabled={!canEdit} style={{ ...inputSt, width: 62 }}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td style={cellSt}>
                    <input type="number" value={row.qty || ""} onChange={e => canEdit && updateBoq(row.id, "qty", parseFloat(e.target.value) || 0)} readOnly={!canEdit} style={{ ...inputSt, width: 72 }} />
                  </td>
                  <td style={cellSt}>
                    <input type="number" value={row.unitPrice || ""} onChange={e => canEdit && updateBoq(row.id, "unitPrice", parseFloat(e.target.value) || 0)} readOnly={!canEdit} style={{ ...inputSt, width: 92 }} />
                  </td>
                  <td style={{ ...cellSt, fontWeight: 700, color: BLUE_M }}>
                    {fmt(row.qty * row.unitPrice)}
                  </td>
                  <td style={cellSt}>
                    {canEdit && boqItems.length > 1 && (
                      <button onClick={() => removeBoqRow(row.id)} style={{ background: "none", border: "none", cursor: "pointer", color: RED, fontSize: "0.8rem" }}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
              <tr style={{ background: AMB_B }}>
                <td colSpan={5} style={{ ...cellSt, textAlign: "right", fontWeight: 800, color: "#8B6914" }}>الإجمالي الكلي</td>
                <td style={{ ...cellSt, fontWeight: 900, color: AMBER, fontSize: "0.82rem" }}>{fmt(boqTotal)}</td>
                <td style={cellSt} />
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {canEdit ? (
            <button
              onClick={addBoqRow}
              style={{
                padding: "7px 18px", borderRadius: 9, border: `1.5px solid ${BLUE_BR}`,
                background: BLUE_B, color: BLUE_M, cursor: "pointer", fontSize: "0.75rem",
                fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif", transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(25,118,210,0.14)`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = BLUE_B; }}
            >+ إضافة بند</button>
          ) : <ReadOnly><span>لإضافة بنود يلزم صلاحية مسؤول المتابعة</span></ReadOnly>}
          {boqTotal > 0 && (
            <div style={{ fontSize: "0.68rem", color: "#888" }}>{tafqit(boqTotal)}</div>
          )}
        </div>
      </div>

      {/* ── Payments + KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Payments */}
        <div style={cardSt}>
          <SectionTitle>الدفعات والمستخلصات</SectionTitle>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            {/* Circle */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 100 }}>
              <CircleChart pct={paidPct} size={88} />
              <span style={{ fontSize: "0.58rem", color: "#999", textAlign: "center" }}>نسبة ما تم صرفه</span>
              <div style={{ fontSize: "0.63rem", lineHeight: 2, width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#bbb" }}>إجمالي العقد</span>
                  <span style={{ fontWeight: 700 }}>{fmt(contractValue)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: GREEN }}>
                  <span>ما تم صرفه</span>
                  <span style={{ fontWeight: 700 }}>{fmt(paidTotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: AMBER }}>
                  <span>المتبقي</span>
                  <span style={{ fontWeight: 700 }}>{fmt(Math.max(0, contractValue - paidTotal))}</span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["رقم", "تاريخ الصرف", "قيمة المستخلص", "الحالة", ""].map(h => (
                      <th key={h} style={{ ...thSt, padding: "6px 6px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && (
                    <tr><td colSpan={5} style={{ ...cellSt, color: "#ccc", padding: 16, textAlign: "center" }}>لا توجد دفعات مسجّلة</td></tr>
                  )}
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>{p.no}</td>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>
                        <input type="date" value={p.date} onChange={e => canEdit && updatePayment(p.id, "date", e.target.value)} readOnly={!canEdit} style={{ ...inputSt, width: 112 }} />
                      </td>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>
                        <input type="number" value={p.amount || ""} onChange={e => canEdit && updatePayment(p.id, "amount", parseFloat(e.target.value) || 0)} readOnly={!canEdit} style={{ ...inputSt, width: 90 }} />
                      </td>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>
                        <select value={p.status} onChange={e => canEdit && updatePayment(p.id, "status", e.target.value)} disabled={!canEdit} style={{ ...inputSt, width: 82 }}>
                          <option value="paid">تم الصرف</option>
                          <option value="pending">معلّق</option>
                        </select>
                      </td>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>
                        {canEdit && (
                          <button onClick={() => removePayment(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: RED, fontSize: "0.8rem" }}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length > 0 && (
                    <tr style={{ background: BLUE_B }}>
                      <td colSpan={2} style={{ ...cellSt, fontWeight: 700, textAlign: "right", color: DARK }}>إجمالي ما تم صرفه</td>
                      <td colSpan={3} style={{ ...cellSt, fontWeight: 900, color: BLUE_M }}>{fmt(paidTotal)} ر.س</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {canEdit ? (
                <button
                  onClick={addPayment}
                  style={{
                    marginTop: 8, padding: "6px 16px", borderRadius: 8,
                    background: BLUE_B, border: `1.5px solid ${BLUE_BR}`,
                    color: BLUE_M, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700,
                    fontFamily: "'Cairo','Tajawal',sans-serif", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(25,118,210,0.14)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = BLUE_B; }}
                >+ إضافة دفعة</button>
              ) : <ReadOnly><span>لإضافة دفعات يلزم صلاحية مسؤول المتابعة</span></ReadOnly>}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={cardSt}>
          <SectionTitle accent={AMB_BR}>مؤشرات الأداء (KPIs)</SectionTitle>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Circle */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 100 }}>
              <CircleChart pct={overallPct} size={88} />
              <span style={{ fontSize: "0.58rem", color: "#999", textAlign: "center" }}>نسبة الإنجاز الكلي</span>
            </div>

            {/* Detail */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                {phases.map(p => (
                  <div key={p.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.61rem", color: "#888", marginBottom: 1 }}>
                      <span>{p.id}. {p.label}</span>
                      <span style={{ fontWeight: 700, color: p.pct === 100 ? GREEN : p.pct > 0 ? BLUE_M : "#ccc" }}>{p.pct}%</span>
                    </div>
                    <div style={{ height: 4, background: "#EEF2F8", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${p.pct}%`,
                        background: p.pct === 100 ? GREEN : `linear-gradient(90deg, ${BLUE}, ${BLUE_M})`,
                        borderRadius: 2, transition: "width 0.4s",
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: `1px solid #EEF2F8`, paddingTop: 8, display: "flex", flexDirection: "column", gap: 4, fontSize: "0.64rem" }}>
                {[
                  { label: "المدة المخططة",  value: plannedDays  ? `${plannedDays} يوم`  : "—",  color: "#555" },
                  { label: "المدة المنقضية", value: elapsedDays != null ? `${elapsedDays} يوم` : "—", color: "#555" },
                  {
                    label: remainingDays != null && remainingDays < 0 ? "التأخير" : "المتبقي",
                    value: remainingDays != null ? `${Math.abs(remainingDays)} يوم` : "—",
                    color: remainingDays != null && remainingDays < 0 ? RED : BLUE_M,
                  },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#999" }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
