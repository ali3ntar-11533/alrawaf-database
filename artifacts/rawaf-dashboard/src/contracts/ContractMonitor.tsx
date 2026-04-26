import { useState, useMemo, useEffect, type CSSProperties } from "react";
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

interface ExecPhase  { id: number; label: string; pct: number; durationDays: number; }
interface BoqItem    { id: number; code: string; description: string; unit: string; qty: number; executedQty: number; unitPrice: number; }
interface Payment    { id: number; no: number; invoiceRef: string; date: string; amount: number; status: "paid" | "pending"; }
interface PhaseReport {
  id: number;
  phaseId: number;
  date: string;
  completionPct: number;
  recipientName: string;
  summary: string;
  challenges: string;
  nextSteps: string;
  requestedSupport: string;
  submittedBy: string;
  status: "draft" | "submitted";
}

const SYSTEM_RECIPIENTS = [
  "مدير المشروع",
  "مدير العقود",
  "المدير العام",
  "المشرف الهندسي",
  "مدير التشغيل",
];

const UNITS = ["م²", "م³", "م.ط", "طن", "نقطة", "وحدة", "مقطوعي"];
const INIT_PHASES: ExecPhase[] = [
  { id: 1, label: "التصميم والتخطيط",  pct: 0, durationDays: 30  },
  { id: 2, label: "توريد المواد",       pct: 0, durationDays: 45  },
  { id: 3, label: "الأعمال الإنشائية", pct: 0, durationDays: 90  },
  { id: 4, label: "التشطيبات",         pct: 0, durationDays: 30  },
  { id: 5, label: "الاختبارات والفحص", pct: 0, durationDays: 14  },
  { id: 6, label: "التسليم النهائي",   pct: 0, durationDays: 7   },
];

function fmt(n: number) {
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SectionTitle({ children, accent, extra }: { children: string; accent?: string; extra?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, marginBottom: 14, borderBottom: `2px solid ${accent ?? BLUE_BR}` }}>
      <div style={{ width: 4, height: 18, borderRadius: 2, background: accent ?? BLUE_M }}/>
      <span style={{ fontSize: "0.82rem", fontWeight: 900, color: DARK, flex: 1 }}>{children}</span>
      {extra}
    </div>
  );
}

function StatBox({ label, value, valueStyle }: { label: string; value: string; valueStyle?: CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: `1.5px solid #E8E8E8`, borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 3, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <span style={{ fontSize: "0.58rem", color: "#999", fontWeight: 700, letterSpacing: "0.03em" }}>{label}</span>
      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1A1A1A", ...valueStyle }}>{value}</span>
    </div>
  );
}

function CircleChart({ pct, size = 90 }: { pct: number; size?: number }) {
  const r = 15.9155, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  const color = pct >= 100 ? GREEN : pct >= 50 ? BLUE_M : AMBER;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: size, height: size, transform: "rotate(-90deg)" }}>
        <path fill="none" stroke="#EEF2F8" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size < 80 ? "0.8rem" : "1.05rem", fontWeight: 900, color }}>{pct}%</span>
      </div>
    </div>
  );
}

function ReadOnly({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,0.03)", border: "1px solid #EEE", fontSize: "0.72rem", color: "#888" }}>
      <span style={{ fontSize: "0.58rem", color: BLUE_L, fontWeight: 700 }}>للاطلاع فقط</span>
      {children}
    </div>
  );
}

/* ── Phase Editor Modal ────────────────────────────── */
function PhaseEditorModal({
  phases, onSave, onClose,
}: { phases: ExecPhase[]; onSave: (p: ExecPhase[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ExecPhase[]>(phases.map(p => ({ ...p })));

  function updateDraft(id: number, field: "label" | "durationDays", val: string | number) {
    setDraft(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  }
  function addPhase() {
    const maxId = Math.max(0, ...draft.map(p => p.id));
    setDraft(prev => [...prev, { id: maxId + 1, label: "مرحلة جديدة", pct: 0, durationDays: 30 }]);
  }
  function removePhase(id: number) {
    if (draft.length <= 1) return;
    setDraft(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(12,20,39,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div dir="rtl" style={{ background: "#fff", borderRadius: 18, padding: "28px 32px", width: "min(560px,90vw)", boxShadow: "0 24px 80px rgba(0,0,0,0.22)", fontFamily: "'Cairo','Tajawal',sans-serif", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, borderBottom: `2px solid ${BLUE_BR}`, paddingBottom: 14 }}>
          <div style={{ width: 4, height: 20, borderRadius: 2, background: BLUE_M }}/>
          <span style={{ fontSize: "0.9rem", fontWeight: 900, color: DARK, flex: 1 }}>تعديل مسارات التنفيذ</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#999" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {draft.map((p, idx) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#F8FAFC", borderRadius: 10, border: `1px solid #E8E8E8` }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: BLUE_B, border: `1.5px solid ${BLUE_BR}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: BLUE_M, flexShrink: 0 }}>{idx + 1}</div>
              <input
                value={p.label}
                onChange={e => updateDraft(p.id, "label", e.target.value)}
                placeholder="اسم المرحلة"
                style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${BLUE_BR}`, fontSize: "0.76rem", fontFamily: "'Cairo','Tajawal',sans-serif", outline: "none" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <input
                  type="number"
                  value={p.durationDays || ""}
                  onChange={e => updateDraft(p.id, "durationDays", parseInt(e.target.value) || 0)}
                  style={{ width: 64, padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${AMB_BR}`, fontSize: "0.72rem", fontFamily: "'Cairo','Tajawal',sans-serif", outline: "none", textAlign: "center" }}
                />
                <span style={{ fontSize: "0.62rem", color: "#999" }}>يوم</span>
              </div>
              <button onClick={() => removePhase(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: draft.length <= 1 ? "#ddd" : RED, fontSize: "0.85rem", padding: 2, flexShrink: 0 }} disabled={draft.length <= 1}>✕</button>
            </div>
          ))}
        </div>

        <button
          onClick={addPhase}
          style={{ marginTop: 12, width: "100%", padding: "9px", borderRadius: 10, border: `1.5px dashed ${BLUE_BR}`, background: BLUE_B, color: BLUE_M, fontSize: "0.76rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif" }}
        >+ إضافة مرحلة</button>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={() => { onSave(draft.map((p, i) => ({ ...p, id: i + 1 }))); onClose(); }}
            style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${BLUE}, ${BLUE_M})`, color: "#fff", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif" }}
          >حفظ التعديلات</button>
          <button
            onClick={onClose}
            style={{ padding: "10px 20px", borderRadius: 10, border: `1.5px solid #E8E8E8`, background: "#fff", color: "#666", fontSize: "0.78rem", cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif" }}
          >إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ── Report Form Modal ─────────────────────────────── */
function ReportFormModal({
  report, phase, contract, onSave, onClose,
}: { report: PhaseReport; phase: ExecPhase | undefined; contract: Contract; onSave: (r: PhaseReport) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<PhaseReport>({ ...report });
  const isSubmitted = report.status === "submitted";

  const inputStyle: CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 9,
    border: `1.5px solid ${BLUE_BR}`, fontSize: "0.76rem",
    fontFamily: "'Cairo','Tajawal',sans-serif", outline: "none",
    boxSizing: "border-box", resize: "vertical",
    background: isSubmitted ? "#F8FAFC" : "#fff",
    color: isSubmitted ? "#555" : "#1A1A1A",
  };

  /* ── Read-only answer display ── */
  function AnswerBlock({ label, value }: { label: string; value: string }) {
    return (
      <div>
        <div style={{ fontSize: "0.64rem", fontWeight: 700, color: "#777", marginBottom: 4 }}>{label}</div>
        <div style={{
          padding: "10px 14px", borderRadius: 9, background: "#F4F7FC",
          border: `1px solid #E8EEF8`, fontSize: "0.76rem", color: "#1A1A1A",
          lineHeight: 1.7, minHeight: 36, whiteSpace: "pre-wrap",
        }}>
          {value || <span style={{ color: "#ccc" }}>لم يتم التعبئة</span>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(12,20,39,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={onClose}>
      <div dir="rtl" style={{ background: "#fff", borderRadius: 18, width: "min(640px,94vw)", boxShadow: "0 24px 80px rgba(0,0,0,0.28)", fontFamily: "'Cairo','Tajawal',sans-serif", overflow: "hidden" }} onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ background: `linear-gradient(135deg, ${DARK}, #152040)`, padding: "18px 24px", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${BLUE_M},${BLUE_L},${AMBER})` }}/>
          <div style={{ fontSize: "0.52rem", color: BLUE_L, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 4 }}>تقرير متابعة المرحلة · نظام إدارة العقود</div>
          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#F0F0F0" }}>{phase?.label ?? "مرحلة غير محددة"}</div>
          <div style={{ fontSize: "0.64rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
            {contract.contractNo} · {contract.vendorName} · الإنجاز: {draft.completionPct}%
          </div>
          <button onClick={onClose} style={{ position: "absolute", top: 16, left: 16, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "#ccc", fontSize: "0.85rem" }}>✕</button>
        </div>

        {/* ── Submitted state: show filled data ── */}
        {isSubmitted ? (
          <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Success banner */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: `1.5px solid rgba(34,197,94,0.3)` }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>✓</div>
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 900, color: GREEN }}>تم الإرسال وتم التعبئة</div>
                <div style={{ fontSize: "0.62rem", color: "#888", marginTop: 2 }}>
                  أُرسل إلى: <strong style={{ color: DARK }}>{draft.recipientName || "—"}</strong>
                  {draft.submittedBy && <> &nbsp;·&nbsp; بواسطة: <strong style={{ color: DARK }}>{draft.submittedBy}</strong></>}
                  {draft.date && <> &nbsp;·&nbsp; {draft.date}</>}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ padding: "10px 14px", background: "#F4F7FC", borderRadius: 9, border: `1px solid #E8EEF8` }}>
                <div style={{ fontSize: "0.62rem", color: "#999", marginBottom: 2 }}>تاريخ التقرير</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700 }}>{draft.date}</div>
              </div>
              <div style={{ padding: "10px 14px", background: "#F4F7FC", borderRadius: 9, border: `1px solid #E8EEF8`, display: "flex", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontSize: "0.62rem", color: "#999", marginBottom: 2 }}>نسبة الإنجاز</div>
                  <div style={{ fontSize: "1rem", fontWeight: 900, color: BLUE_M }}>{draft.completionPct}%</div>
                </div>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#E0E8F4", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${draft.completionPct}%`, background: `linear-gradient(90deg, ${BLUE}, ${BLUE_M})`, borderRadius: 3 }} />
                </div>
              </div>
            </div>

            {/* Answers */}
            <AnswerBlock label="ملخص الأعمال المنجزة في هذه المرحلة" value={draft.summary} />
            <AnswerBlock label="التحديات والعقبات التي واجهتها" value={draft.challenges} />
            <AnswerBlock label="الخطوات التالية المخطط لها" value={draft.nextSteps} />
            <AnswerBlock label="الدعم المطلوب" value={draft.requestedSupport} />

            <button onClick={onClose} style={{ marginTop: 4, padding: "11px", borderRadius: 10, border: `1.5px solid #E8E8E8`, background: "#fff", color: "#666", fontSize: "0.78rem", cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif" }}>إغلاق</button>
          </div>
        ) : (

        /* ── Draft state: editable form ── */
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Recipient + Meta */}
          <div>
            <label style={{ fontSize: "0.64rem", fontWeight: 700, color: "#555", display: "block", marginBottom: 5 }}>إرسال إلى (داخل النظام)</label>
            <select
              value={draft.recipientName}
              onChange={e => setDraft(d => ({ ...d, recipientName: e.target.value }))}
              style={{ ...inputStyle, resize: "none", cursor: "pointer" }}
            >
              <option value="">— اختر الجهة المستلِمة —</option>
              {SYSTEM_RECIPIENTS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: "0.64rem", fontWeight: 700, color: "#777", display: "block", marginBottom: 5 }}>تاريخ التقرير</label>
              <input type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} style={{ ...inputStyle, resize: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.64rem", fontWeight: 700, color: "#777", display: "block", marginBottom: 5 }}>نسبة الإنجاز المُبلَّغة</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="number" min={0} max={100} value={draft.completionPct} onChange={e => setDraft(d => ({ ...d, completionPct: parseInt(e.target.value) || 0 }))} style={{ ...inputStyle, width: 72, resize: "none" }} />
                <span style={{ fontSize: "0.72rem", color: "#999" }}>%</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#EEF2F8", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${draft.completionPct}%`, background: `linear-gradient(90deg, ${BLUE}, ${BLUE_M})`, borderRadius: 3, transition: "width 0.3s" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Questions */}
          {[
            { key: "summary"          as const, label: "ملخص الأعمال المنجزة في هذه المرحلة", rows: 3 },
            { key: "challenges"       as const, label: "التحديات والعقبات التي واجهتها", rows: 2 },
            { key: "nextSteps"        as const, label: "الخطوات التالية المخطط لها", rows: 2 },
            { key: "requestedSupport" as const, label: "الدعم المطلوب من مدير المشروع", rows: 2 },
          ].map(q => (
            <div key={q.key}>
              <label style={{ fontSize: "0.66rem", fontWeight: 700, color: "#555", display: "block", marginBottom: 5 }}>{q.label}</label>
              <textarea rows={q.rows} value={draft[q.key]} onChange={e => setDraft(d => ({ ...d, [q.key]: e.target.value }))} placeholder="أكتب هنا..." style={{ ...inputStyle }} />
            </div>
          ))}

          {/* Submitted by */}
          <div>
            <label style={{ fontSize: "0.64rem", fontWeight: 700, color: "#777", display: "block", marginBottom: 5 }}>اسم منفذ التقرير</label>
            <input value={draft.submittedBy} onChange={e => setDraft(d => ({ ...d, submittedBy: e.target.value }))} placeholder="الاسم الكامل..." style={{ ...inputStyle, resize: "none" }} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
            <button
              onClick={() => {
                if (!draft.recipientName) { alert("يرجى اختيار الجهة المستلِمة أولاً"); return; }
                onSave({ ...draft, status: "submitted" });
                onClose();
              }}
              style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${BLUE}, ${BLUE_M})`, color: "#fff", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif" }}
            >إرسال التقرير</button>
            <button
              onClick={() => { onSave({ ...draft, status: "draft" }); onClose(); }}
              style={{ padding: "11px 18px", borderRadius: 10, border: `1.5px solid #E8E8E8`, background: "#fff", color: "#666", fontSize: "0.76rem", cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif" }}
            >حفظ مسودة</button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════ */
export default function ContractMonitor({ contract, role }: { contract: Contract; role: string }) {
  const canEdit = role === TRACKING_ROLE;

  const [phases, setPhases]           = useState<ExecPhase[]>(INIT_PHASES);
  const [editPhaseId, setEditPhaseId] = useState<number | null>(null);
  const [phaseDraft, setPhaseDraft]   = useState("");
  const [showPhaseEditor, setShowPhaseEditor] = useState(false);

  const [boqItems, setBoqItems] = useState<BoqItem[]>([
    { id: 1, code: "01", description: "", unit: "م²", qty: 0, executedQty: 0, unitPrice: 0 },
  ]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [reports, setReports]       = useState<PhaseReport[]>([]);
  const [openReportId, setOpenReportId] = useState<number | null>(null);

  const [durationOverride, setDurationOverride] = useState<number | null>(null);
  const [editingDuration, setEditingDuration]   = useState(false);
  const [durationInput, setDurationInput]       = useState("");

  /* ── Live clock (updates every minute so day counters stay current) ── */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  /* ── Computed ── */
  const remainingDays = useMemo(() => {
    if (!contract.endDate) return null;
    return Math.ceil((new Date(contract.endDate).getTime() - now) / 86_400_000);
  }, [contract.endDate, now]);
  const plannedDays = useMemo(() => {
    if (!contract.startDate || !contract.endDate) return null;
    return Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / 86_400_000);
  }, [contract.startDate, contract.endDate]);
  const elapsedDays = useMemo(() => {
    if (!contract.startDate) return null;
    return Math.ceil((now - new Date(contract.startDate).getTime()) / 86_400_000);
  }, [contract.startDate, now]);

  /* When the user overrides the total duration, remaining = override - elapsed */
  const displayRemainingDays = durationOverride != null && elapsedDays != null
    ? durationOverride - elapsedDays
    : remainingDays;

  const boqTotal      = useMemo(() => boqItems.reduce((s, r) => s + r.qty * r.unitPrice, 0), [boqItems]);
  const contractValue = contract.value > 0 ? contract.value : boqTotal;
  const paidTotal     = useMemo(() => payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0), [payments]);
  const paidPct       = contractValue > 0 ? Math.min(100, Math.round((paidTotal / contractValue) * 100)) : 0;

  const stepperDone = phases.filter(p => p.pct === 100).length;

  /* ── Phase handlers ── */
  function updatePhasePct(id: number, val: number) {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, pct: Math.max(0, Math.min(100, val)) } : p));
  }

  /* ── BOQ handlers ── */
  function addBoqRow() {
    setBoqItems(prev => [...prev, { id: Date.now(), code: String(prev.length + 1).padStart(2, "0"), description: "", unit: "م²", qty: 0, executedQty: 0, unitPrice: 0 }]);
  }
  function updateBoq(id: number, field: keyof BoqItem, value: string | number) {
    setBoqItems(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  function removeBoqRow(id: number) { setBoqItems(prev => prev.filter(r => r.id !== id)); }

  /* ── Payment handlers ── */
  function addPayment() {
    setPayments(prev => [...prev, { id: Date.now(), no: prev.length + 1, invoiceRef: "", date: new Date().toISOString().split("T")[0], amount: 0, status: "pending" }]);
  }
  function updatePayment(id: number, field: keyof Payment, value: string | number) {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }
  function removePayment(id: number) { setPayments(prev => prev.filter(p => p.id !== id)); }

  /* ── Report handlers ── */
  function addReport(phaseId: number) {
    const phase = phases.find(p => p.id === phaseId);
    const newReport: PhaseReport = {
      id: Date.now(), phaseId,
      date: new Date().toISOString().split("T")[0],
      completionPct: phase?.pct ?? 0,
      recipientName: "",
      summary: "", challenges: "", nextSteps: "", requestedSupport: "", submittedBy: "",
      status: "draft",
    };
    setReports(prev => [...prev, newReport]);
    setOpenReportId(newReport.id);
  }
  function saveReport(updated: PhaseReport) {
    setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
  }
  function removeReport(id: number) { setReports(prev => prev.filter(r => r.id !== id)); }

  /* ── Style helpers ── */
  const inputSt: CSSProperties = {
    padding: "5px 8px", borderRadius: 7, border: `1.5px solid ${BLUE_BR}`, fontSize: "0.72rem",
    fontFamily: "'Cairo','Tajawal',sans-serif", outline: "none", width: "100%",
    background: canEdit ? "#fff" : "#F9FAFB", color: canEdit ? "#1A1A1A" : "#888",
  };
  const cellSt: CSSProperties  = { padding: "7px 8px", borderBottom: `1px solid #F0F0F0`, textAlign: "center", fontSize: "0.72rem" };
  const thSt:   CSSProperties  = { padding: "8px 10px", background: BLUE_B, color: BLUE, fontSize: "0.67rem", fontWeight: 800, borderBottom: `2px solid ${BLUE_BR}`, textAlign: "center" };
  const cardSt: CSSProperties  = { background: "#fff", border: `1px solid #E8E8E8`, borderRadius: 14, padding: "18px 20px", marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" };

  const openReport = reports.find(r => r.id === openReportId);

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo','Tajawal',sans-serif", color: "#1A1A1A" }}>

      {/* Modals */}
      {showPhaseEditor && (
        <PhaseEditorModal
          phases={phases}
          onSave={setPhases}
          onClose={() => setShowPhaseEditor(false)}
        />
      )}
      {openReport && (
        <ReportFormModal
          report={openReport}
          phase={phases.find(p => p.id === openReport.phaseId)}
          contract={contract}
          onSave={saveReport}
          onClose={() => setOpenReportId(null)}
        />
      )}

      {/* ── Permission notice ── */}
      {!canEdit && (
        <div style={{ background: BLUE_B, border: `1px solid ${BLUE_BR}`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: "0.72rem", color: BLUE_M, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
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
        <StatBox label="حالة العقد"            value="مكتمل" valueStyle={{ color: GREEN }} />
      </div>

      {/* ── Execution Path + Time Box ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 16 }}>

        {/* Phase stepper card */}
        <div style={cardSt}>
          <SectionTitle
            extra={
              canEdit ? (
                <button
                  onClick={() => setShowPhaseEditor(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${BLUE_BR}`,
                    background: BLUE_B, color: BLUE_M, fontSize: "0.64rem", fontWeight: 700,
                    cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(25,118,210,0.14)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = BLUE_B; }}
                >
                  <span style={{ fontSize: "0.8rem" }}>✎</span> تعديل المسارات
                </button>
              ) : undefined
            }
          >مسار تنفيذ العقد</SectionTitle>

          {/* ─ Stepper nodes (phase 1 at RIGHT in RTL, phase N at LEFT) ─ */}
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: "10px 0", margin: "0 28px" }}>
            {/* Grey track */}
            <div style={{ position: "absolute", top: "50%", right: 0, left: 0, height: 2, background: "#EEF2F8", transform: "translateY(-50%)", zIndex: 1 }} />
            {/* Progress track — grows from RIGHT (phase 1 side) */}
            <div style={{
              position: "absolute", top: "50%", right: 0, height: 2,
              width: `${phases.length > 0 ? (stepperDone / phases.length) * 100 : 0}%`,
              background: `linear-gradient(to left, ${BLUE_L}, ${BLUE})`,
              transform: "translateY(-50%)", zIndex: 2, borderRadius: 2, transition: "width 0.5s",
            }} />

            {/* Nodes in natural order — phase 1 appears at RIGHT in RTL flex */}
            {phases.map(p => {
              const status = p.pct === 100 ? "completed" : p.pct > 0 ? "active" : "pending";
              const nodeWidth = Math.max(64, Math.floor(260 / phases.length));
              return (
                <div key={p.id} style={{ position: "relative", zIndex: 3, textAlign: "center", width: nodeWidth }}>
                  <span style={{ display: "block", fontSize: "0.56rem", marginBottom: 5, color: "#777", lineHeight: 1.2 }}>{p.label}</span>
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
                        autoFocus value={phaseDraft}
                        onChange={e => setPhaseDraft(e.target.value)}
                        onBlur={() => { updatePhasePct(p.id, Number(phaseDraft)); setEditPhaseId(null); }}
                        onKeyDown={e => { if (e.key === "Enter") { updatePhasePct(p.id, Number(phaseDraft)); setEditPhaseId(null); } }}
                        style={{ width: 38, padding: "2px 4px", borderRadius: 5, border: `1.5px solid ${BLUE_BR}`, fontSize: "0.65rem", textAlign: "center", fontFamily: "'Cairo','Tajawal',sans-serif" }}
                      />
                      <span style={{ fontSize: "0.6rem", lineHeight: "22px", color: "#999" }}>%</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, color: status === "completed" ? GREEN : status === "active" ? BLUE_M : "#ccc" }}>{p.pct}%</span>
                  )}
                  {p.durationDays > 0 && (
                    <div style={{ fontSize: "0.52rem", color: "#bbb", marginTop: 2 }}>{p.durationDays} ي</div>
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
            {canEdit && <span style={{ color: BLUE_L }}>· انقر على الدائرة لتحديث النسبة</span>}
          </div>

          {/* Phase progress bars */}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {phases.map(p => (
              <div key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.64rem", marginBottom: 2, color: "#777" }}>
                  <span>{p.id}. {p.label}{p.durationDays > 0 ? ` (${p.durationDays} يوم)` : ""}</span>
                  <span style={{ fontWeight: 700, color: p.pct === 100 ? GREEN : p.pct > 0 ? BLUE_M : "#ccc" }}>{p.pct}%</span>
                </div>
                <div style={{ height: 5, background: "#EEF2F8", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p.pct}%`, background: p.pct === 100 ? GREEN : `linear-gradient(90deg, ${BLUE}, ${BLUE_M})`, borderRadius: 3, transition: "width 0.4s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Time box (1. change مخططة → مدة التنفيذ) ── */}
        <div style={{ ...cardSt, marginBottom: 0, minWidth: 134, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: "0.62rem", color: "#999", textAlign: "center" }}>المدة المتبقية</span>
          <span style={{
            fontSize: displayRemainingDays != null ? "2.4rem" : "1.2rem", fontWeight: 900, lineHeight: 1,
            color: displayRemainingDays == null ? "#ccc" : displayRemainingDays <= 30 ? RED : displayRemainingDays <= 90 ? AMBER : BLUE_M,
          }}>
            {displayRemainingDays != null ? Math.abs(displayRemainingDays) : "—"}
          </span>
          {displayRemainingDays != null && (
            <span style={{ fontSize: "0.62rem", color: "#999" }}>{displayRemainingDays < 0 ? "يوم (تأخير)" : "يوم"}</span>
          )}
          {(plannedDays || durationOverride) && (
            <div style={{ marginTop: 6, fontSize: "0.6rem", color: "#bbb", textAlign: "center", lineHeight: 1.8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span>مدة التنفيذ</span>
                {canEdit && (
                  <button
                    title="تعديل المدة"
                    onClick={() => { setDurationInput(String(durationOverride ?? plannedDays ?? "")); setEditingDuration(true); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: BLUE_M, display: "flex", alignItems: "center" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                )}
              </div>
              {editingDuration ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 2 }}>
                  <input
                    type="number"
                    value={durationInput}
                    onChange={e => setDurationInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const v = parseInt(durationInput);
                        if (!isNaN(v) && v > 0) setDurationOverride(v);
                        setEditingDuration(false);
                      }
                      if (e.key === "Escape") setEditingDuration(false);
                    }}
                    autoFocus
                    style={{ width: 52, fontSize: "0.65rem", padding: "2px 4px", borderRadius: 5, border: `1.5px solid ${BLUE_M}`, textAlign: "center", fontFamily: "'Cairo','Tajawal',sans-serif", outline: "none" }}
                  />
                  <button
                    onClick={() => { const v = parseInt(durationInput); if (!isNaN(v) && v > 0) setDurationOverride(v); setEditingDuration(false); }}
                    style={{ background: BLUE_M, border: "none", borderRadius: 4, color: "#fff", fontSize: "0.6rem", padding: "2px 6px", cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif" }}
                  >حفظ</button>
                </div>
              ) : (
                <div style={{ fontWeight: 700, color: "#777" }}>{durationOverride ?? plannedDays} يوم</div>
              )}
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

      {/* ── BOQ Table (with Executed Qty + Remaining Qty columns) ── */}
      <div style={cardSt}>
        <SectionTitle accent={AMB_BR}>نطاق العمل — جدول الكميات (BOQ)</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["رقم البند", "وصف البند", "الوحدة", "الكمية الإجمالية", "الكمية المنفذة", "الكمية المتبقية", "سعر الوحدة (ر.س)", "الإجمالي (ر.س)", ""].map(h => (
                  <th key={h} style={thSt}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {boqItems.map(row => {
                const remaining = Math.max(0, row.qty - row.executedQty);
                const execColor = row.executedQty >= row.qty && row.qty > 0 ? GREEN : row.executedQty > 0 ? BLUE_M : "#ccc";
                return (
                  <tr key={row.id} style={{ background: "#fff" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = BLUE_B2; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                    <td style={cellSt}>
                      <input value={row.code} onChange={e => canEdit && updateBoq(row.id, "code", e.target.value)} readOnly={!canEdit} style={{ ...inputSt, width: 44 }} />
                    </td>
                    <td style={{ ...cellSt, textAlign: "right" }}>
                      <input value={row.description} onChange={e => canEdit && updateBoq(row.id, "description", e.target.value)} placeholder="وصف البند..." readOnly={!canEdit} style={{ ...inputSt, minWidth: 140 }} />
                    </td>
                    <td style={cellSt}>
                      <select value={row.unit} onChange={e => canEdit && updateBoq(row.id, "unit", e.target.value)} disabled={!canEdit} style={{ ...inputSt, width: 62 }}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td style={cellSt}>
                      <input type="number" value={row.qty || ""} onChange={e => canEdit && updateBoq(row.id, "qty", parseFloat(e.target.value) || 0)} readOnly={!canEdit} style={{ ...inputSt, width: 72 }} />
                    </td>
                    {/* الكمية المنفذة */}
                    <td style={cellSt}>
                      <input
                        type="number" min={0} max={row.qty}
                        value={row.executedQty || ""}
                        onChange={e => canEdit && updateBoq(row.id, "executedQty", Math.min(row.qty, parseFloat(e.target.value) || 0))}
                        readOnly={!canEdit}
                        style={{ ...inputSt, width: 72, color: execColor, fontWeight: 700 }}
                      />
                    </td>
                    {/* الكمية المتبقية (auto) */}
                    <td style={{ ...cellSt, fontWeight: 700, color: remaining === 0 && row.qty > 0 ? GREEN : remaining > 0 ? AMBER : "#ccc" }}>
                      {row.qty > 0 ? fmt(remaining) : "—"}
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
                );
              })}
              <tr style={{ background: AMB_B }}>
                <td colSpan={7} style={{ ...cellSt, textAlign: "right", fontWeight: 800, color: "#8B6914" }}>الإجمالي الكلي</td>
                <td style={{ ...cellSt, fontWeight: 900, color: AMBER, fontSize: "0.82rem" }}>{fmt(boqTotal)}</td>
                <td style={cellSt} />
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {canEdit ? (
            <button onClick={addBoqRow} style={{ padding: "7px 18px", borderRadius: 9, border: `1.5px solid ${BLUE_BR}`, background: BLUE_B, color: BLUE_M, cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif", transition: "background 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(25,118,210,0.14)`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = BLUE_B; }}
            >+ إضافة بند</button>
          ) : <ReadOnly><span>لإضافة بنود يلزم صلاحية مسؤول المتابعة</span></ReadOnly>}
          {boqTotal > 0 && <div style={{ fontSize: "0.68rem", color: "#888" }}>{tafqit(boqTotal)}</div>}
        </div>
      </div>

      {/* ── Payments + Reports ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Payments */}
        <div style={cardSt}>
          <SectionTitle>الدفعات والمستخلصات</SectionTitle>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 100 }}>
              <CircleChart pct={paidPct} size={86} />
              <span style={{ fontSize: "0.58rem", color: "#999", textAlign: "center" }}>نسبة ما تم صرفه</span>
              <div style={{ fontSize: "0.63rem", lineHeight: 2, width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#bbb" }}>إجمالي العقد</span>
                  <span style={{ fontWeight: 700 }}>{fmt(contractValue)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: GREEN }}>
                  <span>تم صرفه</span>
                  <span style={{ fontWeight: 700 }}>{fmt(paidTotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: AMBER }}>
                  <span>المتبقي</span>
                  <span style={{ fontWeight: 700 }}>{fmt(Math.max(0, contractValue - paidTotal))}</span>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["رقم", "تاريخ الصرف", "قيمة المستخلص", "الحالة", ""].map(h => <th key={h} style={{ ...thSt, padding: "6px 6px" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {payments.length === 0 && (
                    <tr><td colSpan={5} style={{ ...cellSt, color: "#ccc", padding: 14, textAlign: "center" }}>لا توجد دفعات مسجّلة</td></tr>
                  )}
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ ...cellSt, padding: "5px 6px" }}>
                        <input type="text" value={p.invoiceRef ?? ""} onChange={e => canEdit && updatePayment(p.id, "invoiceRef", e.target.value)} readOnly={!canEdit} placeholder="رقم الاستخلاص" style={{ ...inputSt, width: 90 }} />
                      </td>
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
                        {canEdit && <button onClick={() => removePayment(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: RED, fontSize: "0.8rem" }}>✕</button>}
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
                <button onClick={addPayment} style={{ marginTop: 8, padding: "6px 16px", borderRadius: 8, background: BLUE_B, border: `1.5px solid ${BLUE_BR}`, color: BLUE_M, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, fontFamily: "'Cairo','Tajawal',sans-serif" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(25,118,210,0.14)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = BLUE_B; }}
                >+ إضافة دفعة</button>
              ) : <ReadOnly><span>لإضافة دفعات يلزم صلاحية مسؤول المتابعة</span></ReadOnly>}
            </div>
          </div>
        </div>

        {/* ── Reports panel (replaces KPIs) ── */}
        <div style={cardSt}>
          <SectionTitle
            accent={AMB_BR}
            extra={
              canEdit ? (
                <div style={{ display: "flex", gap: 6 }}>
                  {phases.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addReport(p.id)}
                      title={`إضافة تقرير للمرحلة: ${p.label}`}
                      style={{
                        padding: "4px 9px", borderRadius: 7, border: `1px solid ${AMB_BR}`,
                        background: AMB_B, color: "#8B6914", fontSize: "0.58rem", fontWeight: 700,
                        cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif",
                      }}
                    >م{p.id}</button>
                  ))}
                </div>
              ) : undefined
            }
          >سجل التقارير</SectionTitle>

          {reports.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: 6 }}>لا توجد تقارير مسجّلة</div>
              {canEdit && (
                <div style={{ fontSize: "0.66rem", color: "#bbb" }}>
                  اختر المرحلة من الأزرار أعلاه لإضافة تقرير
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reports.map(r => {
                const ph = phases.find(p => p.id === r.phaseId);
                const statusColor = r.status === "submitted" ? GREEN : AMBER;
                const statusLabel = r.status === "submitted" ? "مُرسَل" : "مسودة";
                return (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 10,
                    border: `1px solid ${r.status === "submitted" ? "rgba(34,197,94,0.2)" : AMB_BR}`,
                    background: r.status === "submitted" ? "rgba(34,197,94,0.04)" : AMB_B,
                  }}>
                    {/* Phase badge */}
                    <div style={{ flexShrink: 0, textAlign: "center", minWidth: 44 }}>
                      <div style={{ fontSize: "0.6rem", fontWeight: 900, color: BLUE_M, background: BLUE_B, border: `1px solid ${BLUE_BR}`, borderRadius: 6, padding: "2px 6px", marginBottom: 3 }}>م{r.phaseId}</div>
                      <div style={{ fontSize: "0.56rem", color: "#bbb" }}>{r.completionPct}%</div>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1A1A1A", marginBottom: 2 }}>{ph?.label ?? "مرحلة"}</div>
                      <div style={{ fontSize: "0.6rem", color: "#999" }}>{r.date}</div>
                      {r.submittedBy && <div style={{ fontSize: "0.58rem", color: "#bbb" }}>بواسطة: {r.submittedBy}</div>}
                    </div>
                    {/* Status */}
                    <div style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 8px", borderRadius: 20, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}44`, flexShrink: 0 }}>
                      {statusLabel}
                    </div>
                    {/* Open button */}
                    <button
                      onClick={() => setOpenReportId(r.id)}
                      style={{
                        padding: "5px 12px", borderRadius: 8,
                        border: `1.5px solid ${BLUE_BR}`, background: BLUE_B,
                        color: BLUE_M, fontSize: "0.62rem", fontWeight: 700,
                        cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif",
                        flexShrink: 0,
                      }}
                    >{r.status === "submitted" ? "عرض" : "فتح النموذج"}</button>
                    {/* Remove */}
                    {canEdit && (
                      <button onClick={() => removeReport(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: RED, fontSize: "0.75rem", flexShrink: 0 }}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
