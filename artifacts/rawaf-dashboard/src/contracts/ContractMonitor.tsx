import { useState, useMemo, type CSSProperties } from "react";
import { GOLD, GOLD_BG, GOLD_BORDER } from "./types";
import type { Contract } from "./types";
import { tafqit } from "./tafqit";

const GOLD_DARK = "#8B6914";
const GREEN = "#22c55e";
const RED = "#e74c3c";

interface ExecPhase {
  id: number;
  label: string;
  pct: number;
}

interface BoqItem {
  id: number;
  code: string;
  description: string;
  unit: string;
  qty: number;
  unitPrice: number;
}

interface Payment {
  id: number;
  no: number;
  date: string;
  amount: number;
  status: "paid" | "pending";
}

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

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{
      background: GOLD_BG, border: `1px solid ${GOLD_BORDER}`,
      borderRadius: 8, padding: "6px 14px", marginBottom: 12,
      fontSize: "0.83rem", fontWeight: 800, color: GOLD_DARK, textAlign: "center",
    }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, valueStyle }: { label: string; value: string; valueStyle?: CSSProperties }) {
  return (
    <div style={{
      background: "#fff", border: `1.5px solid ${GOLD_BORDER}`,
      borderRadius: 10, padding: "10px 12px",
      display: "flex", flexDirection: "column", gap: 3,
    }}>
      <span style={{ fontSize: "0.62rem", color: GOLD, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1a1206", ...valueStyle }}>{value}</span>
    </div>
  );
}

function CircleChart({ pct, size = 90 }: { pct: number; size?: number }) {
  const r = 15.9155;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const isGreen = pct >= 100;
  const color = isGreen ? GREEN : GOLD;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: size, height: size, transform: "rotate(-90deg)" }}>
        <path fill="none" stroke="#f0e8d4" strokeWidth="3"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size < 80 ? "0.8rem" : "1.05rem", fontWeight: 900, color }}>{pct}%</span>
      </div>
    </div>
  );
}

export default function ContractMonitor({ contract }: { contract: Contract }) {
  const [phases, setPhases] = useState<ExecPhase[]>(INIT_PHASES);
  const [editPhaseId, setEditPhaseId] = useState<number | null>(null);
  const [phaseDraft, setPhaseDraft] = useState("");

  const [boqItems, setBoqItems] = useState<BoqItem[]>([
    { id: 1, code: "01", description: "", unit: "م²", qty: 0, unitPrice: 0 },
  ]);

  const [payments, setPayments] = useState<Payment[]>([]);

  const remainingDays = useMemo(() => {
    if (!contract.endDate) return null;
    const end = new Date(contract.endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [contract.endDate]);

  const plannedDays = useMemo(() => {
    if (!contract.startDate || !contract.endDate) return null;
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [contract.startDate, contract.endDate]);

  const elapsedDays = useMemo(() => {
    if (!contract.startDate) return null;
    const start = new Date(contract.startDate);
    const today = new Date();
    return Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [contract.startDate]);

  const boqTotal = useMemo(() =>
    boqItems.reduce((s, r) => s + r.qty * r.unitPrice, 0), [boqItems]);

  const contractValue = contract.value > 0 ? contract.value : boqTotal;

  const paidTotal = useMemo(() =>
    payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0), [payments]);

  const paidPct = contractValue > 0 ? Math.min(100, Math.round((paidTotal / contractValue) * 100)) : 0;

  const overallPct = useMemo(() => {
    if (!phases.length) return 0;
    return Math.round(phases.reduce((s, p) => s + p.pct, 0) / phases.length);
  }, [phases]);

  function updatePhasePct(id: number, val: number) {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, pct: Math.max(0, Math.min(100, val)) } : p));
  }

  function addBoqRow() {
    const id = Date.now();
    const code = String(boqItems.length + 1).padStart(2, "0");
    setBoqItems(prev => [...prev, { id, code, description: "", unit: "م²", qty: 0, unitPrice: 0 }]);
  }

  function updateBoq(id: number, field: keyof BoqItem, value: string | number) {
    setBoqItems(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function removeBoqRow(id: number) {
    setBoqItems(prev => prev.filter(r => r.id !== id));
  }

  function addPayment() {
    const no = payments.length + 1;
    const id = Date.now();
    setPayments(prev => [...prev, {
      id, no, date: new Date().toISOString().split("T")[0],
      amount: 0, status: "pending",
    }]);
  }

  function updatePayment(id: number, field: keyof Payment, value: string | number) {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }

  function removePayment(id: number) {
    setPayments(prev => prev.filter(p => p.id !== id));
  }

  const statusLabel = contract.status === "completed" ? "مكتمل" :
                      contract.status === "active"    ? "نشط"   : "معلّق";
  const statusColor = contract.status === "completed" ? GREEN :
                      contract.status === "active"    ? GOLD   : "#f39c12";

  const inputSt: React.CSSProperties = {
    padding: "5px 7px", borderRadius: 6,
    border: `1px solid ${GOLD_BORDER}`, fontSize: "0.72rem",
    fontFamily: "'Cairo','Tajawal',sans-serif", outline: "none", width: "100%",
  };
  const cellSt: React.CSSProperties = { padding: "7px 8px", borderBottom: `1px solid ${GOLD_BORDER}`, textAlign: "center", fontSize: "0.72rem" };
  const thSt: React.CSSProperties  = { padding: "8px", background: GOLD_BG, color: GOLD_DARK, fontSize: "0.68rem", fontWeight: 800, borderBottom: `1px solid ${GOLD_BORDER}`, textAlign: "center" };

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo','Tajawal',sans-serif", color: "#1a1206" }}>

      {/* ── Header Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, marginBottom: 16 }}>
        <StatBox label="اسم المشروع"         value={contract.projectName || "—"} />
        <StatBox label="اسم المورد / المقاول" value={contract.vendorName} />
        <StatBox label="رقم العقد"           value={contract.contractNo} />
        <StatBox label="نوع الأعمال"         value={contract.contractType} />
        <StatBox label="تاريخ البداية"        value={contract.startDate || "—"} />
        <StatBox label="تاريخ النهاية"        value={contract.endDate || "—"} />
        <StatBox label="حالة العقد"           value={statusLabel} valueStyle={{ color: statusColor }} />
      </div>

      {/* ── Execution Path + Remaining Days ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 16 }}>
        {/* Stepper */}
        <div style={{
          background: "#fff", border: `1.5px solid ${GOLD_BORDER}`,
          borderRadius: 12, padding: "14px 16px",
        }}>
          <SectionTitle>مسار تنفيذ العقد</SectionTitle>

          {/* Phase bars (horizontal stepper) */}
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: "10px 0", margin: "0 30px" }}>
            {/* connector line */}
            <div style={{ position: "absolute", top: "50%", right: 0, left: 0, height: 2, background: "#f0e8d4", transform: "translateY(-50%)", zIndex: 1 }} />
            {/* progress */}
            {(() => {
              const done = phases.filter(p => p.pct === 100).length;
              const frac = phases.length > 0 ? (done / phases.length) : 0;
              return (
                <div style={{
                  position: "absolute", top: "50%", right: 0, height: 2,
                  width: `${frac * 100}%`, background: `linear-gradient(90deg, ${GOLD}, #a88540)`,
                  transform: "translateY(-50%)", zIndex: 2, borderRadius: 2, transition: "width 0.5s",
                }} />
              );
            })()}
            {[...phases].reverse().map(p => {
              const status = p.pct === 100 ? "completed" : p.pct > 0 ? "active" : "pending";
              return (
                <div key={p.id} style={{ position: "relative", zIndex: 3, textAlign: "center", width: 72 }}>
                  <span style={{ display: "block", fontSize: "0.6rem", marginBottom: 6, color: "#9b8060", lineHeight: 1.2 }}>{p.label}</span>
                  {/* circle */}
                  <div
                    onClick={() => { setEditPhaseId(p.id); setPhaseDraft(String(p.pct)); }}
                    title="انقر لتعديل النسبة"
                    style={{
                      width: 26, height: 26, borderRadius: "50%", margin: "0 auto 4px",
                      background: status === "completed" ? GREEN : status === "active" ? GOLD_BG : "#fff",
                      border: `2px solid ${status === "completed" ? GREEN : status === "active" ? GOLD : "#e5e0d6"}`,
                      boxShadow: status === "active" ? `0 0 8px rgba(197,160,89,0.5)` : "none",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.65rem", fontWeight: 800,
                      color: status === "completed" ? "#fff" : status === "active" ? GOLD_DARK : "#ccc",
                      transition: "all 0.2s",
                    }}
                  >
                    {status === "completed" ? "✓" : p.id}
                  </div>
                  {editPhaseId === p.id ? (
                    <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                      <input
                        autoFocus
                        value={phaseDraft}
                        onChange={e => setPhaseDraft(e.target.value)}
                        onBlur={() => { updatePhasePct(p.id, Number(phaseDraft)); setEditPhaseId(null); }}
                        onKeyDown={e => { if (e.key === "Enter") { updatePhasePct(p.id, Number(phaseDraft)); setEditPhaseId(null); } }}
                        style={{ width: 38, padding: "2px 4px", borderRadius: 5, border: `1px solid ${GOLD_BORDER}`, fontSize: "0.65rem", textAlign: "center", fontFamily: "'Cairo','Tajawal',sans-serif" }}
                      />
                      <span style={{ fontSize: "0.6rem", lineHeight: "22px", color: "#999" }}>%</span>
                    </div>
                  ) : (
                    <span style={{
                      fontSize: "0.62rem",
                      color: status === "completed" ? GREEN : status === "active" ? GOLD_DARK : "#ccc",
                      fontWeight: 700,
                    }}>{p.pct}%</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: "0.6rem", color: "#9b8060" }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#e5e0d6", marginLeft: 3 }} />لم يبدأ</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: GOLD, marginLeft: 3 }} />قيد التنفيذ</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: GREEN, marginLeft: 3 }} />مكتمل</span>
            <span style={{ color: "#aaa" }}>· انقر على الدائرة لتعديل النسبة</span>
          </div>

          {/* Phase progress bars */}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {phases.map(p => (
              <div key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", marginBottom: 2, color: "#9b8060" }}>
                  <span>{p.id}. {p.label}</span>
                  <span style={{ fontWeight: 700, color: p.pct === 100 ? GREEN : p.pct > 0 ? GOLD_DARK : "#ccc" }}>{p.pct}%</span>
                </div>
                <div style={{ height: 5, background: "#f5f0e8", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${p.pct}%`,
                    background: p.pct === 100 ? GREEN : `linear-gradient(90deg, ${GOLD}, #a88540)`,
                    borderRadius: 3, transition: "width 0.4s",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Remaining days */}
        <div style={{
          background: "#fff", border: `1.5px solid ${GOLD_BORDER}`,
          borderRadius: 12, padding: "16px 20px", minWidth: 120,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <span style={{ fontSize: "0.65rem", color: "#9b8060", textAlign: "center" }}>المدة المتبقية</span>
          <span style={{
            fontSize: remainingDays != null ? "2.4rem" : "1.2rem",
            fontWeight: 900,
            color: remainingDays == null ? "#ccc" : remainingDays <= 30 ? RED : remainingDays <= 90 ? "#f39c12" : GOLD,
            lineHeight: 1,
          }}>
            {remainingDays != null ? Math.abs(remainingDays) : "—"}
          </span>
          {remainingDays != null && (
            <span style={{ fontSize: "0.65rem", color: "#9b8060" }}>
              {remainingDays < 0 ? "يوم (تأخير)" : "يوم"}
            </span>
          )}
          {plannedDays && (
            <div style={{ marginTop: 8, fontSize: "0.6rem", color: "#bbb", textAlign: "center", lineHeight: 1.6 }}>
              <div>المدة المخططة</div>
              <div style={{ fontWeight: 700, color: "#9b8060" }}>{plannedDays} يوم</div>
              {elapsedDays != null && (
                <>
                  <div style={{ marginTop: 4 }}>المنقضية</div>
                  <div style={{ fontWeight: 700, color: "#9b8060" }}>{elapsedDays} يوم</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── BOQ Table ── */}
      <div style={{
        background: "#fff", border: `1.5px solid ${GOLD_BORDER}`,
        borderRadius: 12, padding: "14px 16px", marginBottom: 16,
      }}>
        <SectionTitle>نطاق العمل — جدول الكميات (BOQ)</SectionTitle>
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
                <tr key={row.id}>
                  <td style={cellSt}>
                    <input value={row.code} onChange={e => updateBoq(row.id, "code", e.target.value)} style={{ ...inputSt, width: 40 }} />
                  </td>
                  <td style={{ ...cellSt, textAlign: "right" }}>
                    <input value={row.description} onChange={e => updateBoq(row.id, "description", e.target.value)} placeholder="وصف البند..." style={{ ...inputSt, minWidth: 160 }} />
                  </td>
                  <td style={cellSt}>
                    <select value={row.unit} onChange={e => updateBoq(row.id, "unit", e.target.value)} style={{ ...inputSt, width: 60 }}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td style={cellSt}>
                    <input type="number" value={row.qty || ""} onChange={e => updateBoq(row.id, "qty", parseFloat(e.target.value) || 0)} style={{ ...inputSt, width: 70 }} />
                  </td>
                  <td style={cellSt}>
                    <input type="number" value={row.unitPrice || ""} onChange={e => updateBoq(row.id, "unitPrice", parseFloat(e.target.value) || 0)} style={{ ...inputSt, width: 90 }} />
                  </td>
                  <td style={{ ...cellSt, fontWeight: 700, color: GOLD_DARK }}>
                    {fmt(row.qty * row.unitPrice)}
                  </td>
                  <td style={cellSt}>
                    {boqItems.length > 1 && (
                      <button onClick={() => removeBoqRow(row.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c", fontSize: "0.8rem" }}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
              <tr style={{ background: GOLD_BG }}>
                <td colSpan={5} style={{ ...cellSt, textAlign: "right", fontWeight: 800, color: GOLD_DARK }}>الإجمالي الكلي</td>
                <td style={{ ...cellSt, fontWeight: 900, color: GOLD, fontSize: "0.82rem" }}>{fmt(boqTotal)}</td>
                <td style={cellSt} />
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={addBoqRow}
            style={{
              padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${GOLD_BORDER}`,
              background: GOLD_BG, color: GOLD_DARK, cursor: "pointer", fontSize: "0.75rem",
              fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif",
            }}
          >+ إضافة بند</button>
          {boqTotal > 0 && (
            <div style={{ fontSize: "0.68rem", color: "#9b8060" }}>
              {tafqit(boqTotal)}
            </div>
          )}
        </div>
      </div>

      {/* ── Payments + KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Payments */}
        <div style={{ background: "#fff", border: `1.5px solid ${GOLD_BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
          <SectionTitle>الدفعات والمستخلصات</SectionTitle>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Circle */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 100 }}>
              <CircleChart pct={paidPct} size={90} />
              <span style={{ fontSize: "0.6rem", color: "#9b8060", textAlign: "center" }}>نسبة ما تم صرفه</span>
              <div style={{ fontSize: "0.65rem", lineHeight: 1.8, width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#bbb" }}>إجمالي العقد</span>
                  <span style={{ fontWeight: 700 }}>{fmt(contractValue)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: GREEN }}>
                  <span>ما تم صرفه</span>
                  <span style={{ fontWeight: 700 }}>{fmt(paidTotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#f39c12" }}>
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
                    <tr><td colSpan={5} style={{ ...cellSt, color: "#ccc", fontStyle: "italic", padding: "16px" }}>لا توجد دفعات مسجّلة</td></tr>
                  )}
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>{p.no}</td>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>
                        <input type="date" value={p.date} onChange={e => updatePayment(p.id, "date", e.target.value)} style={{ ...inputSt, width: 110 }} />
                      </td>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>
                        <input type="number" value={p.amount || ""} onChange={e => updatePayment(p.id, "amount", parseFloat(e.target.value) || 0)} style={{ ...inputSt, width: 90 }} />
                      </td>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>
                        <select value={p.status} onChange={e => updatePayment(p.id, "status", e.target.value)} style={{ ...inputSt, width: 80 }}>
                          <option value="paid">تم الصرف</option>
                          <option value="pending">معلّق</option>
                        </select>
                      </td>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>
                        <button onClick={() => removePayment(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: RED, fontSize: "0.8rem" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {payments.length > 0 && (
                    <tr style={{ background: GOLD_BG }}>
                      <td colSpan={2} style={{ ...cellSt, fontWeight: 700, textAlign: "right", color: GOLD_DARK }}>إجمالي ما تم صرفه</td>
                      <td colSpan={3} style={{ ...cellSt, fontWeight: 900, color: GOLD }}>{fmt(paidTotal)} ر.س</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <button
                onClick={addPayment}
                style={{
                  marginTop: 8, padding: "6px 14px", borderRadius: 7,
                  border: `1.5px solid ${GOLD_BORDER}`, background: GOLD_BG,
                  color: GOLD_DARK, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700,
                  fontFamily: "'Cairo','Tajawal',sans-serif",
                }}
              >+ إضافة دفعة</button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ background: "#fff", border: `1.5px solid ${GOLD_BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
          <SectionTitle>مؤشرات الأداء (KPIs)</SectionTitle>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Circle */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 100 }}>
              <CircleChart pct={overallPct} size={90} />
              <span style={{ fontSize: "0.6rem", color: "#9b8060", textAlign: "center" }}>نسبة الإنجاز الكلي</span>
            </div>

            {/* Phases detail + time */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                {phases.map(p => (
                  <div key={p.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "#9b8060", marginBottom: 1 }}>
                      <span>{p.id}. {p.label}</span>
                      <span style={{ fontWeight: 700, color: p.pct === 100 ? GREEN : p.pct > 0 ? GOLD_DARK : "#ccc" }}>{p.pct}%</span>
                    </div>
                    <div style={{ height: 4, background: "#f5f0e8", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${p.pct}%`,
                        background: p.pct === 100 ? GREEN : `linear-gradient(90deg, ${GOLD}, #a88540)`,
                        borderRadius: 2, transition: "width 0.4s",
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                borderTop: `1px solid ${GOLD_BORDER}`, paddingTop: 8,
                display: "flex", flexDirection: "column", gap: 4, fontSize: "0.65rem",
              }}>
                {[
                  { icon: "📅", label: "المدة المخططة", value: plannedDays ? `${plannedDays} يوم` : "—", color: "#1a1206" },
                  { icon: "⏱️", label: "المدة المنقضية", value: elapsedDays != null ? `${elapsedDays} يوم` : "—", color: "#1a1206" },
                  {
                    icon: remainingDays != null && remainingDays < 0 ? "⚠️" : "🕒",
                    label: remainingDays != null && remainingDays < 0 ? "التأخير" : "المتبقي",
                    value: remainingDays != null ? `${Math.abs(remainingDays)} يوم` : "—",
                    color: remainingDays != null && remainingDays < 0 ? RED : "#1a1206",
                  },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", color: item.color }}>
                    <span>{item.icon} {item.label}</span>
                    <span style={{ fontWeight: 700 }}>{item.value}</span>
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
