import { useEffect, useMemo, useRef, useState } from "react";
import { GOLD, GOLD_BG, GOLD_BORDER, STAGES } from "./types";
import type { Contract, ContractComment, StageLog } from "./types";
import { getContract, getContractAudit, advanceStage, getContractComments, addContractComment } from "./api";
import { tafqit } from "./tafqit";

const PRINT_STYLE_ID = "print-contract-detail-style";
const LABEL_BG    = "#9b7d38";
const LABEL_COLOR = "#fff";
const VALUE_BG    = "#fff";
const VALUE_BG2   = "#fafaf8";
const BORDER      = "rgba(197,160,89,0.25)";

interface Props {
  contractId: number;
  role: string;
  actorName: string;
  onBack: () => void;
}

const STAGE_ALLOWED: Record<number, string[]> = {
  1:  ["مدير المشروع"],
  2:  ["مدير القطاع"],
  3:  ["مدير PMO"],
  4:  ["أخصائي العقود"],
  5:  ["أدمن العقود"],
  6:  ["أدمن العقود"],
  7:  ["مدير الإدارة"],
  8:  ["نائب الرئيس"],
  9:  ["الرئيس التنفيذي"],
  10: ["مسؤول التوقيعات"],
  11: ["مسؤول التوقيعات"],
};

const ROLE_COLORS: Record<string, string> = {
  "مدير المشروع":    "#6c5ce7",
  "مدير القطاع":     "#0984e3",
  "مدير PMO":        "#00b894",
  "أخصائي العقود":   "#e17055",
  "أدمن العقود":     "#fdcb6e",
  "مدير الإدارة":    "#a29bfe",
  "نائب الرئيس":     "#fd79a8",
  "الرئيس التنفيذي": "#C5A059",
  "مسؤول التوقيعات": "#55efc4",
};

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
}

/* ── Attachment placeholder cell ── */
function AttachCell() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      color: "#bbb", fontSize: "0.78rem", cursor: "pointer",
      padding: "2px 0",
    }}>
      <span style={{
        fontSize: "1.1rem", background: "rgba(0,0,0,0.04)",
        borderRadius: 6, padding: "2px 8px",
        border: "1px solid rgba(0,0,0,0.08)",
      }}>📎</span>
    </div>
  );
}

/* ── Table cell types ── */
type CellContent = string | null | undefined | "ATTACH" | "EMPTY";

function renderCell(content: CellContent) {
  if (content === "ATTACH") return <AttachCell />;
  if (content === "EMPTY" || content === null || content === undefined || content === "") {
    return <span style={{ color: "#ccc" }}>—</span>;
  }
  return <>{content}</>;
}

/* ── Data row in the 4-column table ── */
function DataRow({
  rightLabel, rightContent,
  leftLabel,  leftContent,
  evenRow,
}: {
  rightLabel: string; rightContent: CellContent;
  leftLabel: string;  leftContent: CellContent;
  evenRow: boolean;
}) {
  const bg = evenRow ? VALUE_BG : VALUE_BG2;
  const labelStyle: React.CSSProperties = {
    background: LABEL_BG, color: LABEL_COLOR,
    padding: "9px 14px", fontSize: "0.74rem", fontWeight: 700,
    borderBottom: `1px solid rgba(255,255,255,0.12)`,
    whiteSpace: "nowrap", lineHeight: 1.4,
  };
  const valueStyle: React.CSSProperties = {
    background: bg, color: "#2d2416",
    padding: "9px 14px", fontSize: "0.8rem",
    borderBottom: `1px solid ${BORDER}`,
    lineHeight: 1.4, wordBreak: "break-word",
  };
  return (
    <>
      <div style={labelStyle}>{rightLabel}</div>
      <div style={valueStyle}>{renderCell(rightContent)}</div>
      <div style={{ ...labelStyle, borderRight: `1px solid rgba(255,255,255,0.15)` }}>{leftLabel}</div>
      <div style={{ ...valueStyle, borderRight: `1px solid ${BORDER}` }}>{renderCell(leftContent)}</div>
    </>
  );
}

/* ── Chat panel (inline version for tab) ── */
function ChatPanel({ contractId, actorName, actorRole }: { contractId: number; actorName: string; actorRole: string }) {
  const [comments, setComments] = useState<ContractComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const canSend = !!actorName.trim() && !!msg.trim() && !sending;

  async function loadComments() {
    try { setComments(await getContractComments(contractId)); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadComments(); }, [contractId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments]);

  async function handleSend() {
    if (!canSend) return;
    setSending(true); setSendErr("");
    try {
      const created = await addContractComment(contractId, { actorName, actorRole, message: msg.trim() });
      setComments(prev => [...prev, created]);
      setMsg("");
    } catch (e: unknown) {
      setSendErr(e instanceof Error ? e.message : "حدث خطأ");
    } finally { setSending(false); }
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 16, overflow: "hidden",
      border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      display: "flex", flexDirection: "column", minHeight: 480,
    }}>
      <div style={{
        padding: "14px 20px", borderBottom: `1.5px solid ${GOLD_BORDER}`,
        background: GOLD_BG, display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
        }}>💬</div>
        <div>
          <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#4a3520" }}>المحادثة الداخلية</div>
          <div style={{ fontSize: "0.62rem", color: "#9b8060" }}>{comments.length} رسالة</div>
        </div>
        <button onClick={loadComments} title="تحديث" style={{
          marginRight: "auto", border: "none", background: "transparent",
          cursor: "pointer", color: GOLD, fontSize: "0.9rem", padding: 4,
        }}>↻</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12, minHeight: 300 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#bbb", fontSize: "0.8rem", paddingTop: 30 }}>جاري التحميل…</div>
        ) : comments.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#ccc", textAlign: "center", gap: 10, paddingTop: 60 }}>
            <div style={{ fontSize: "2.5rem" }}>💬</div>
            <div style={{ fontSize: "0.78rem" }}>لا توجد رسائل بعد<br />ابدأ المحادثة!</div>
          </div>
        ) : (
          comments.map(c => {
            const isMe = c.actorName === actorName;
            const color = ROLE_COLORS[c.actorRole] ?? GOLD;
            return (
              <div key={c.id} style={{ display: "flex", gap: 8, flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: color, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.6rem", color: "#fff", fontWeight: 900,
                }}>{getInitials(c.actorName)}</div>
                <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 2, alignItems: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{ fontSize: "0.6rem", color: "#bbb", display: "flex", gap: 4 }}>
                    <span style={{ fontWeight: 700, color: "#9b8060" }}>{c.actorName}</span>
                    <span>·</span><span>{c.actorRole}</span>
                  </div>
                  <div style={{
                    background: isMe ? `linear-gradient(135deg, ${GOLD}, #a88540)` : "rgba(0,0,0,0.04)",
                    color: isMe ? "#fff" : "#2d2416",
                    borderRadius: isMe ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    padding: "9px 13px", fontSize: "0.8rem", lineHeight: 1.55,
                    border: isMe ? "none" : "1px solid rgba(0,0,0,0.07)",
                  }}>{c.message}</div>
                  <div style={{ fontSize: "0.56rem", color: "#ccc" }}>
                    {new Date(c.createdAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short" })} · {new Date(c.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 16px", borderTop: `1.5px solid ${GOLD_BORDER}`, background: "#fafafa" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={msg} onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="اكتب رسالتك… (Enter للإرسال)"
            rows={2}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 10,
              border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
              fontFamily: "'Cairo', 'Tajawal', sans-serif", resize: "none", outline: "none", lineHeight: 1.5,
            }}
          />
          <button onClick={handleSend} disabled={!canSend} style={{
            width: 40, height: 40, borderRadius: "50%", border: "none", flexShrink: 0,
            background: canSend ? `linear-gradient(135deg, ${GOLD}, #a88540)` : "#ddd",
            color: "#fff", cursor: canSend ? "pointer" : "not-allowed",
            fontSize: "1.05rem", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: canSend ? `0 3px 12px rgba(197,160,89,0.4)` : "none", transition: "all 0.2s",
          }}>➤</button>
        </div>
        {sendErr && <div style={{ fontSize: "0.64rem", color: "#e74c3c", marginTop: 5 }}>⚠ {sendErr}</div>}
        {!actorName.trim() && <div style={{ fontSize: "0.6rem", color: "#ccc", marginTop: 5, textAlign: "center" }}>اختر دورك من القائمة الجانبية للمشاركة</div>}
      </div>
    </div>
  );
}

const SMART_DOCS = [
  { icon: "📜", label: "السجل التجاري",          hint: "Commercial Registration" },
  { icon: "🧾", label: "شهادة الزكاة والضريبة",  hint: "VAT & Zakat Certificate" },
  { icon: "📝", label: "خطاب التفويض",            hint: "Delegation Letter" },
  { icon: "📑", label: "عقد التأسيس",             hint: "Articles of Association" },
  { icon: "📁", label: "الملف التعريفي",           hint: "Company Profile" },
  { icon: "📊", label: "جداول الكميات",           hint: "Bill of Quantities" },
  { icon: "🗂️", label: "جداول الكميات (Excel)",   hint: "BoQ — Excel Format" },
  { icon: "✒️", label: "نسخة العقد الموقعة",      hint: "Signed Contract Copy" },
];

const TABS = [
  { id: "request",     label: "بيانات الطلب",    icon: "📋" },
  { id: "attachments", label: "المرفقات الذكية",  icon: "📎" },
  { id: "log",         label: "سجل الإجراءات",    icon: "📅" },
  { id: "chat",        label: "المحادثة",          icon: "💬" },
] as const;
type TabId = typeof TABS[number]["id"];

export default function ContractDetail({ contractId, role, actorName, onBack }: Props) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [log, setLog] = useState<StageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [notes, setNotes] = useState("");
  const [filename, setFilename] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("request");

  function handlePrint() {
    if (!contract) return;
    const existingStyle = document.getElementById(PRINT_STYLE_ID);
    if (existingStyle) existingStyle.remove();
    const style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    style.textContent = `
      @media print {
        .no-print { display: none !important; }
        .contract-app-wrapper { position: static !important; display: block !important; height: auto !important; overflow: visible !important; }
        .contract-main-content { overflow: visible !important; height: auto !important; }
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
    `;
    document.head.appendChild(style);
    const originalTitle = document.title;
    document.title = `عقد — ${contract.contractNo} — ${contract.title}`;
    let cleaned = false;
    function cleanup() {
      if (cleaned) return; cleaned = true;
      document.title = originalTitle;
      document.getElementById(PRINT_STYLE_ID)?.remove();
      window.removeEventListener("afterprint", cleanup);
    }
    window.addEventListener("afterprint", cleanup);
    setTimeout(cleanup, 60000);
    window.print();
  }

  function reload() {
    setLoading(true);
    Promise.all([getContract(contractId), getContractAudit(contractId)])
      .then(([c, l]) => { setContract(c); setLog(l); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { reload(); }, [contractId]);

  async function doAction(action: "advance" | "reject") {
    if (!contract) return;
    setActionBusy(true); setErr(""); setSuccess("");
    try {
      const payload: Parameters<typeof advanceStage>[1] = {
        action, actorRole: role, actorName,
        notes: action === "reject" ? rejectReason : notes,
      };
      if (filename && contract.currentStage === 6) payload.wordFilename = filename;
      if (filename && contract.currentStage === 10) payload.signedFilename = filename;
      const updated = await advanceStage(contractId, payload);
      setContract(updated);
      setLog(await getContractAudit(contractId));
      setRejectModal(false);
      setNotes(""); setFilename(""); setRejectReason("");
      setSuccess(action === "advance" ? "✅ تم الاعتماد والانتقال للمرحلة التالية" : "↩ تم إرجاع العقد للمرحلة الأولى");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "حدث خطأ");
    } finally { setActionBusy(false); }
  }

  /* ── Stage durations from audit log ── */
  const stageDurations = useMemo(() => {
    const durations: Record<number, string> = {};
    const sorted = [...log].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      if (entry.action !== "advance" && entry.action !== "reject") continue;
      const prevTime = i > 0
        ? new Date(sorted[i - 1].createdAt).getTime()
        : new Date(entry.createdAt).getTime();
      const currTime = new Date(entry.createdAt).getTime();
      const ms = currTime - prevTime;
      if (ms <= 0) { durations[entry.stage] = "< د"; continue; }
      const days  = Math.floor(ms / 86400000);
      const hours = Math.floor((ms % 86400000) / 3600000);
      const mins  = Math.floor((ms % 3600000) / 60000);
      if (days >= 1)       durations[entry.stage] = `${days} يوم`;
      else if (hours >= 1) durations[entry.stage] = `${hours} ساعة`;
      else if (mins >= 1)  durations[entry.stage] = `${mins} دقيقة`;
      else                 durations[entry.stage] = "< دقيقة";
    }
    return durations;
  }, [log]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#bbb" }}>
      جاري التحميل...
    </div>
  );
  if (!contract) return <div style={{ padding: 32, color: "#e74c3c" }}>لم يُعثر على العقد</div>;

  const canAct    = STAGE_ALLOWED[contract.currentStage]?.includes(role);
  const isCompleted = contract.status === "completed";
  const pct       = isCompleted ? 100 : Math.round(((contract.currentStage - 1) / 11) * 100);
  const stage     = STAGES[contract.currentStage - 1];
  const needsFile = contract.currentStage === 6 || contract.currentStage === 10;

  /* ── Build table rows ── */
  const formattedDate = contract.createdAt
    ? new Date(contract.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }) +
      " — " + new Date(contract.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
    : null;

  type RowDef = { r: string; rv: CellContent; l: string; lv: CellContent };
  const rows: RowDef[] = [
    { r: "الطرف الثاني",                           rv: contract.vendorName,        l: "تاريخ الطلب",              lv: formattedDate },
    { r: "رقم الآيبان",                            rv: contract.vendorIban,        l: "جهة إصدار الطلب",          lv: contract.issuerEntity },
    { r: "الرقم الضريبي",                          rv: contract.vendorTaxNo,       l: "اسم المشروع",              lv: contract.projectName },
    { r: "شهادة ضريبة القيمة المضافة / الزكاة والدخل", rv: "ATTACH",             l: "رقم المشروع",              lv: contract.projectNo },
    { r: "تفويض التوقيع",                          rv: "ATTACH",                   l: "نوع الأعمال",              lv: contract.workType },
    { r: "اسم المفوض",                             rv: contract.vendorDelegate,    l: "نوع العقد",                lv: contract.contractType },
    { r: "المسمى الوظيفي للمفوض",                  rv: contract.vendorDelegateTitle, l: "قيمة العقد",             lv: contract.value > 0 ? `${contract.value.toLocaleString("ar-SA")} ريال` : null },
    { r: "رقم الهوية / الإقامة للمفوض",            rv: contract.vendorDelegateId,  l: "مدة العقد",               lv: contract.contractDuration ? `${contract.contractDuration} يوماً` : null },
    { r: "الهوية / الإقامة للمفوض",                rv: "ATTACH",                   l: "قسم تقدير التكاليف",       lv: contract.costEstimationDept },
    { r: "رقم التواصل",                            rv: contract.vendorContact,     l: "حالة تحليل السعر",         lv: contract.priceAnalysisStatus },
    { r: "البريد الإلكتروني",                      rv: contract.vendorEmail,       l: "تحليل السعر",              lv: "ATTACH" },
    { r: "الرمز البريدي",                          rv: contract.vendorPostalCode,  l: "مقارنة مالية فنية",        lv: "ATTACH" },
    { r: "العنوان",                                rv: contract.vendorAddress,     l: "عرض سعر - 1",              lv: "ATTACH" },
    { r: "السجل التجاري",                          rv: "ATTACH",                   l: "عرض سعر - 2",              lv: "ATTACH" },
    { r: "تاريخ انتهاء السجل التجاري",             rv: contract.vendorRegExpiry,   l: "عرض سعر - 3",              lv: "ATTACH" },
    { r: "مؤسسة / شركة",                          rv: contract.vendorEntityType,  l: "عقد مماثل",                lv: "ATTACH" },
    { r: "EMPTY",                                  rv: "EMPTY",                    l: "مخططات",                   lv: "ATTACH" },
    { r: "EMPTY",                                  rv: "EMPTY",                    l: "توصيفات",                  lv: "ATTACH" },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Main scroll area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>

        {/* Top bar */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={onBack} style={{
            border: "none", background: "none", cursor: "pointer",
            color: GOLD, fontSize: "0.82rem", fontWeight: 700,
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
          }}>→ رجوع للقائمة</button>
          <button onClick={handlePrint} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 18px", borderRadius: 10,
            background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
            color: "#fff", border: "none", cursor: "pointer",
            fontSize: "0.82rem", fontWeight: 800,
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            boxShadow: `0 3px 12px rgba(197,160,89,0.35)`,
          }}>🖨️ طباعة / تصدير PDF</button>
        </div>

        {/* Contract header card */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: "18px 22px", marginBottom: 14,
          border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: isCompleted ? "rgba(39,174,96,0.1)" : GOLD_BG,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
              border: `1.5px solid ${isCompleted ? "rgba(39,174,96,0.3)" : GOLD_BORDER}`,
            }}>
              {isCompleted ? "✅" : stage?.icon ?? "📄"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.96rem", fontWeight: 900, color: "#1a1206", marginBottom: 2, lineHeight: 1.4 }}>
                {contract.title}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#9b8060" }}>
                {contract.contractNo}
                {contract.projectNo && <span> · م {contract.projectNo}</span>}
                {" · "}{contract.contractType}
              </div>
              {contract.value > 0 && (
                <div style={{ fontSize: "0.76rem", color: "#8B6914", fontWeight: 700, marginTop: 2 }}>
                  💰 {contract.value.toLocaleString("ar-SA")} ريال — {tafqit(contract.value)}
                </div>
              )}
            </div>
            <div style={{
              textAlign: "center", background: isCompleted ? "rgba(39,174,96,0.08)" : GOLD_BG,
              border: `1.5px solid ${isCompleted ? "rgba(39,174,96,0.3)" : GOLD_BORDER}`,
              borderRadius: 10, padding: "7px 14px", flexShrink: 0,
            }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: isCompleted ? "#27ae60" : GOLD }}>{pct}%</div>
              <div style={{ fontSize: "0.56rem", color: "#9b8060" }}>إنجاز</div>
            </div>
          </div>
          {/* ── Stage timeline (replaces thin progress bar) ── */}
          <div className="no-print" style={{ marginTop: 14, overflowX: "auto", paddingBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content", direction: "rtl" }}>
              {STAGES.map((stg, idx) => {
                const sNum    = idx + 1;
                const isDone  = isCompleted ? true : sNum < contract.currentStage;
                const isCur   = !isCompleted && sNum === contract.currentStage;
                const dur     = stageDurations[sNum];
                return (
                  <div key={sNum} style={{ display: "flex", alignItems: "flex-start" }}>
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      minWidth: 62, padding: "0 3px",
                    }}>
                      {/* Circle */}
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: isDone ? "0.85rem" : "0.7rem", fontWeight: 900,
                        background: isDone
                          ? `linear-gradient(135deg, ${GOLD}, #a88540)`
                          : isCur
                            ? "rgba(197,160,89,0.15)"
                            : "rgba(0,0,0,0.06)",
                        color: isDone ? "#fff" : isCur ? GOLD : "#ccc",
                        border: isCur ? `2px solid ${GOLD}` : "2px solid transparent",
                        boxShadow: isCur ? `0 0 0 3px rgba(197,160,89,0.18)` : "none",
                        animation: isCur ? "stg-pulse 2s ease-in-out infinite" : "none",
                        transition: "all 0.3s",
                      }}>
                        {isDone ? "✓" : sNum}
                      </div>
                      {/* Stage label */}
                      <div style={{
                        fontSize: "0.48rem", marginTop: 5, textAlign: "center",
                        color: isDone ? "#8B6914" : isCur ? GOLD : "#bbb",
                        fontWeight: isCur ? 800 : 500,
                        lineHeight: 1.35, maxWidth: 60,
                      }}>
                        {stg.label}
                      </div>
                      {/* Duration or status */}
                      {isDone && dur && (
                        <div style={{
                          fontSize: "0.42rem", color: "#b8a57c", marginTop: 3,
                          background: "rgba(197,160,89,0.1)", borderRadius: 8,
                          padding: "1px 5px", fontWeight: 600,
                        }}>{dur}</div>
                      )}
                      {isCur && (
                        <div style={{
                          fontSize: "0.42rem", color: GOLD, marginTop: 3, fontWeight: 800,
                          background: "rgba(197,160,89,0.1)", borderRadius: 8, padding: "1px 5px",
                        }}>جارٍ</div>
                      )}
                    </div>
                    {/* Connector line */}
                    {idx < STAGES.length - 1 && (
                      <div style={{
                        width: 16, height: 2, marginTop: 14, flexShrink: 0,
                        background: isDone
                          ? `linear-gradient(90deg, #a88540, ${GOLD})`
                          : "rgba(0,0,0,0.08)",
                        transition: "background 0.4s",
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Print-only thin bar */}
          <div className="print-only-bar" style={{ marginTop: 8, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: 3,
              background: isCompleted ? "#27ae60" : `linear-gradient(90deg, ${GOLD}, #a88540)`,
            }} />
          </div>
          <style>{`
            @keyframes stg-pulse {
              0%, 100% { box-shadow: 0 0 0 3px rgba(197,160,89,0.18); }
              50%       { box-shadow: 0 0 0 6px rgba(197,160,89,0); }
            }
            @media print { .print-only-bar { display: block !important; } }
          `}</style>
          {contract.rejectionReason && !isCompleted && (
            <div style={{
              marginTop: 10, background: "rgba(231,76,60,0.06)", borderRadius: 9, padding: "10px 14px",
              border: "1px solid rgba(231,76,60,0.2)", fontSize: "0.76rem", color: "#e74c3c",
            }}>
              ↩ <strong>سبب الإعادة:</strong> {contract.rejectionReason}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="no-print" style={{
          display: "flex", borderRadius: 11, overflow: "hidden",
          border: `1.5px solid ${GOLD_BORDER}`, marginBottom: 14,
          background: "#fff", boxShadow: "0 1px 5px rgba(0,0,0,0.04)",
        }}>
          {TABS.map((tab, idx) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: "11px 6px",
                  border: "none",
                  borderLeft: idx < TABS.length - 1 ? `1px solid ${GOLD_BORDER}` : "none",
                  background: isActive ? `linear-gradient(135deg, ${GOLD}, #a88540)` : "transparent",
                  color: isActive ? "#fff" : "#9b8060",
                  cursor: "pointer", fontSize: "0.76rem", fontWeight: isActive ? 800 : 600,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  transition: "all 0.18s",
                }}
              >
                <span style={{ fontSize: "0.88rem" }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── TAB: بيانات الطلب ── */}
        {activeTab === "request" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* 4-column data table */}
            <div style={{
              borderRadius: 12, overflow: "hidden",
              border: `1.5px solid ${GOLD_BORDER}`,
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}>
              {/* Table header */}
              <div style={{
                background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
                color: "#fff", textAlign: "center",
                padding: "13px 20px", fontSize: "0.92rem", fontWeight: 900,
                letterSpacing: "0.03em",
              }}>
                بيانات الطلب
              </div>

              {/* Column sub-headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 180px 1fr",
              }}>
                <div style={{
                  background: "#8b7030", color: "#fff",
                  padding: "7px 14px", fontSize: "0.7rem", fontWeight: 800,
                  textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.2)",
                }}>بيانات الطرف الثاني</div>
                <div style={{
                  background: "#7a6228", color: "rgba(255,255,255,0.8)",
                  padding: "7px 14px", fontSize: "0.7rem", fontWeight: 600,
                  textAlign: "center",
                }} />
                <div style={{
                  background: "#8b7030", color: "#fff",
                  padding: "7px 14px", fontSize: "0.7rem", fontWeight: 800,
                  textAlign: "center",
                  borderRight: `1px solid ${GOLD_BORDER}`,
                  borderLeft: "1px solid rgba(255,255,255,0.2)",
                }}>بيانات المشروع</div>
                <div style={{
                  background: "#7a6228", color: "rgba(255,255,255,0.8)",
                  padding: "7px 14px", fontSize: "0.7rem", fontWeight: 600,
                  textAlign: "center",
                  borderRight: `1px solid ${GOLD_BORDER}`,
                }} />
              </div>

              {/* Data rows */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 180px 1fr" }}>
                {rows.map((row, i) => {
                  if (row.r === "EMPTY" && row.rv === "EMPTY") {
                    return (
                      <DataRow
                        key={i}
                        rightLabel="" rightContent="EMPTY"
                        leftLabel={row.l} leftContent={row.lv}
                        evenRow={i % 2 === 0}
                      />
                    );
                  }
                  return (
                    <DataRow
                      key={i}
                      rightLabel={row.r} rightContent={row.rv}
                      leftLabel={row.l} leftContent={row.lv}
                      evenRow={i % 2 === 0}
                    />
                  );
                })}
              </div>
            </div>

            {/* Action panel */}
            {!isCompleted && canAct && (
              <div style={{
                background: "#fff", borderRadius: 14, padding: "18px 20px",
                border: `1.5px solid ${GOLD_BORDER}`,
                boxShadow: `0 2px 12px rgba(197,160,89,0.1)`,
              }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#4a3520", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 4, height: 16, background: GOLD, borderRadius: 2, display: "inline-block" }} />
                  اتخاذ إجراء — المرحلة {contract.currentStage}: {stage?.label}
                </div>

                {![7,8,9].includes(contract.currentStage) && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", display: "block", marginBottom: 6 }}>ملاحظات الاعتماد</label>
                    <textarea
                      value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="ملاحظات اختيارية..." rows={2}
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 9,
                        border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
                        fontFamily: "'Cairo', 'Tajawal', sans-serif", resize: "vertical",
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}

                {needsFile && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", display: "block", marginBottom: 6 }}>
                      {contract.currentStage === 6 ? "اسم ملف Word *" : "اسم الملف الموقع *"}
                    </label>
                    <input
                      value={filename} onChange={e => setFilename(e.target.value)}
                      placeholder={contract.currentStage === 6 ? "عقد.docx" : "عقد_موقع.pdf"}
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 9,
                        border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
                        fontFamily: "'Cairo', 'Tajawal', sans-serif", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => doAction("advance")}
                    disabled={actionBusy || (needsFile && !filename.trim())}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 10,
                      background: actionBusy ? "#ccc" : `linear-gradient(135deg, ${GOLD}, #a88540)`,
                      color: "#fff", border: "none",
                      cursor: actionBusy ? "not-allowed" : "pointer",
                      fontSize: "0.88rem", fontWeight: 800,
                      fontFamily: "'Cairo', 'Tajawal', sans-serif",
                      boxShadow: actionBusy ? "none" : `0 3px 12px rgba(197,160,89,0.35)`,
                    }}
                  >
                    {actionBusy ? "جاري المعالجة..." : contract.currentStage < 11 ? `✅ اعتماد والانتقال للمرحلة ${contract.currentStage + 1}` : "✅ اعتماد الختم والإنهاء"}
                  </button>
                  <button
                    onClick={() => setRejectModal(true)} disabled={actionBusy}
                    style={{
                      padding: "12px 20px", borderRadius: 10,
                      background: "rgba(231,76,60,0.08)", color: "#e74c3c",
                      border: "1.5px solid rgba(231,76,60,0.3)",
                      cursor: actionBusy ? "not-allowed" : "pointer",
                      fontSize: "0.88rem", fontWeight: 800,
                      fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    }}
                  >↩ رفض وإعادة</button>
                </div>

                {err && <div style={{ marginTop: 10, background: "rgba(231,76,60,0.08)", borderRadius: 9, padding: "10px 14px", color: "#e74c3c", fontSize: "0.78rem" }}>⚠ {err}</div>}
                {success && <div style={{ marginTop: 10, background: "rgba(39,174,96,0.08)", borderRadius: 9, padding: "10px 14px", color: "#27ae60", fontSize: "0.78rem" }}>{success}</div>}
              </div>
            )}

            {isCompleted && (
              <div style={{
                background: "rgba(39,174,96,0.07)", borderRadius: 14, padding: "18px 22px",
                border: "1.5px solid rgba(39,174,96,0.25)", textAlign: "center",
                fontSize: "0.92rem", color: "#27ae60", fontWeight: 800,
              }}>
                🏆 العقد مكتمل ومُوقَّع — {contract.contractNo}
                {contract.signedFilename && <div style={{ fontSize: "0.78rem", marginTop: 6, opacity: 0.8 }}>📜 {contract.signedFilename}</div>}
              </div>
            )}

            {!isCompleted && !canAct && (
              <div style={{
                background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: "14px 18px",
                border: "1.5px dashed rgba(0,0,0,0.1)", textAlign: "center",
                fontSize: "0.8rem", color: "#bbb",
              }}>
                المرحلة الحالية ({stage?.label}) مخصصة لدور <strong style={{ color: "#9b8060" }}>{STAGE_ALLOWED[contract.currentStage]?.join(" / ")}</strong>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: المرفقات الذكية ── */}
        {activeTab === "attachments" && (
          <div style={{
            background: "#fff", borderRadius: 14, padding: "20px 22px",
            border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#4a3520", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 4, height: 16, background: GOLD, borderRadius: 2, display: "inline-block" }} />
              المرفقات الذكية
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {SMART_DOCS.map((doc, i) => (
                <div
                  key={i}
                  style={{
                    background: GOLD_BG, borderRadius: 12, padding: "18px 12px",
                    border: `1.5px solid ${GOLD_BORDER}`, textAlign: "center",
                    cursor: "pointer", transition: "all 0.18s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px rgba(197,160,89,0.25)`;
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLDivElement).style.transform = "none";
                  }}
                >
                  <div style={{ fontSize: "2rem" }}>{doc.icon}</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", lineHeight: 1.4 }}>{doc.label}</div>
                  <div style={{ fontSize: "0.58rem", color: "#b0a08a" }}>{doc.hint}</div>
                  <div style={{
                    marginTop: 4, padding: "4px 10px", borderRadius: 20,
                    background: "rgba(197,160,89,0.15)", fontSize: "0.6rem",
                    color: "#8B6914", fontWeight: 700,
                  }}>غير مرفق بعد</div>
                </div>
              ))}
            </div>
            {(contract.wordFilename || contract.signedFilename) && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#4a3520", marginBottom: 10 }}>المرفقات المرفوعة</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {contract.wordFilename && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(39,174,96,0.05)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(39,174,96,0.2)" }}>
                      <span style={{ fontSize: "1.2rem" }}>📄</span>
                      <div>
                        <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#1a1206" }}>نسخة Word</div>
                        <div style={{ fontSize: "0.65rem", color: "#9b8060" }}>{contract.wordFilename}</div>
                      </div>
                      <div style={{ marginRight: "auto", fontSize: "0.6rem", color: "#27ae60", fontWeight: 700, background: "rgba(39,174,96,0.1)", padding: "3px 8px", borderRadius: 20 }}>مرفوع ✓</div>
                    </div>
                  )}
                  {contract.signedFilename && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: GOLD_BG, borderRadius: 10, padding: "10px 14px", border: `1px solid ${GOLD_BORDER}` }}>
                      <span style={{ fontSize: "1.2rem" }}>✒️</span>
                      <div>
                        <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#1a1206" }}>نسخة موقعة</div>
                        <div style={{ fontSize: "0.65rem", color: "#9b8060" }}>{contract.signedFilename}</div>
                      </div>
                      <div style={{ marginRight: "auto", fontSize: "0.6rem", color: GOLD, fontWeight: 700, background: GOLD_BG, padding: "3px 8px", borderRadius: 20 }}>موقع ✓</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: سجل الإجراءات ── */}
        {activeTab === "log" && (
          <div style={{
            background: "#fff", borderRadius: 14, padding: "20px 22px",
            border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#4a3520", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 4, height: 16, background: GOLD, borderRadius: 2, display: "inline-block" }} />
              سجل الإجراءات والعمليات
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", right: 15, top: 0, bottom: 0, width: 2, background: "rgba(197,160,89,0.2)" }} />
              {log.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#bbb", fontSize: "0.82rem" }}>لا يوجد سجلات بعد</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {log.map((entry) => (
                    <div key={entry.id} style={{ display: "flex", gap: 16, alignItems: "flex-start", paddingRight: 36 }}>
                      <div style={{
                        position: "absolute", right: 6, width: 20, height: 20, borderRadius: "50%",
                        background: entry.action === "reject" ? "#e74c3c" : GOLD,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.58rem", color: "#fff", fontWeight: 900, zIndex: 1,
                      }}>
                        {entry.action === "reject" ? "✕" : "✓"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1a1206" }}>
                            م{entry.stage}: {STAGES[entry.stage - 1]?.label}
                          </span>
                          <span style={{
                            fontSize: "0.62rem", padding: "2px 8px", borderRadius: 20,
                            background: entry.action === "reject" ? "rgba(231,76,60,0.1)" : "rgba(39,174,96,0.1)",
                            color: entry.action === "reject" ? "#e74c3c" : "#27ae60", fontWeight: 700,
                          }}>
                            {entry.action === "reject" ? "رُفض" : entry.action === "create" ? "أُنشئ" : "اعتُمد"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#9b8060", marginTop: 2 }}>
                          {entry.actorName} ({entry.actorRole}) · {new Date(entry.createdAt).toLocaleString("ar-SA")}
                        </div>
                        {entry.notes && entry.notes !== `اعتماد المرحلة ${entry.stage}` && entry.notes !== "إنشاء العقد" && (
                          <div style={{ fontSize: "0.7rem", color: "#6b5c3e", marginTop: 3 }}>💬 {entry.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div style={{
                    background: `linear-gradient(135deg, rgba(197,160,89,0.08), transparent)`,
                    borderRadius: 12, padding: "10px 14px",
                    border: `1px solid ${GOLD_BORDER}`, textAlign: "center",
                  }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 900, color: GOLD }}>
                      {isCompleted ? "🏆 " : "⚡ "}{pct}% مكتمل
                    </div>
                    <div style={{ fontSize: "0.66rem", color: "#9b8060" }}>
                      {isCompleted ? "تم اكتمال جميع المراحل" : `المرحلة الحالية: ${stage?.label}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: المحادثة ── */}
        {activeTab === "chat" && (
          <ChatPanel contractId={contractId} actorName={actorName} actorRole={role} />
        )}

      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div
          className="no-print"
          onClick={e => { if (e.target === e.currentTarget) setRejectModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div dir="rtl" style={{
            background: "#fff", borderRadius: 20, padding: "28px 26px",
            width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
          }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "#e74c3c", marginBottom: 6 }}>↩ رفض وإعادة العقد</h3>
            <p style={{ fontSize: "0.78rem", color: "#9b8060", marginBottom: 20 }}>سيعود العقد للمرحلة الأولى. يُرجى تحديد سبب الإرجاع.</p>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", marginBottom: 6 }}>سبب الإرجاع *</label>
            <textarea
              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="اذكر السبب بالتفصيل..." rows={3}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 9,
                border: "1.5px solid rgba(231,76,60,0.35)", fontSize: "0.85rem",
                fontFamily: "'Cairo', 'Tajawal', sans-serif", resize: "vertical",
                outline: "none", boxSizing: "border-box", marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => doAction("reject")} disabled={!rejectReason.trim() || actionBusy}
                style={{
                  flex: 1, padding: "11px", borderRadius: 10,
                  background: rejectReason.trim() ? "rgba(231,76,60,0.9)" : "#ccc",
                  color: "#fff", border: "none",
                  cursor: rejectReason.trim() ? "pointer" : "not-allowed",
                  fontSize: "0.85rem", fontWeight: 800,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                }}
              >تأكيد الرفض</button>
              <button
                onClick={() => setRejectModal(false)}
                style={{
                  padding: "11px 20px", borderRadius: 10,
                  border: `1.5px solid ${GOLD_BORDER}`, background: "transparent",
                  cursor: "pointer", fontSize: "0.85rem", color: "#6b5c3e",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                }}
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
