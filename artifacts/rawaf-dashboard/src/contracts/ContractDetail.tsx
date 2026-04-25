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

/* ── Colored file-type icon ── */
type FileType = "pdf" | "excel" | "word" | "image" | "generic";
const FILE_CFG: Record<FileType, { bg: string; color: string; icon: string; abbr: string }> = {
  pdf:     { bg: "rgba(231,76,60,0.1)",   color: "#e74c3c", icon: "📕", abbr: "PDF"  },
  excel:   { bg: "rgba(39,174,96,0.1)",   color: "#27ae60", icon: "📗", abbr: "XLS"  },
  word:    { bg: "rgba(41,128,185,0.1)",  color: "#2980b9", icon: "📘", abbr: "DOC"  },
  image:   { bg: "rgba(142,68,173,0.1)",  color: "#8e44ad", icon: "🖼️", abbr: "IMG"  },
  generic: { bg: "rgba(0,0,0,0.05)",      color: "#7f8c8d", icon: "📄", abbr: "ملف" },
};
function FileIcon({ fileType = "generic", label }: { fileType?: FileType; label: string }) {
  const c = FILE_CFG[fileType];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, background: c.bg, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem",
        border: `1px solid ${c.color}22`,
      }}>{c.icon}</div>
      <div>
        <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "#3a2d1a", lineHeight: 1.3 }}>{label}</div>
        <div style={{
          fontSize: "0.55rem", color: c.color, fontWeight: 800,
          background: c.bg, padding: "1px 7px", borderRadius: 8,
          display: "inline-block", marginTop: 2,
        }}>{c.abbr}</div>
      </div>
      <div style={{ marginRight: "auto", fontSize: "0.62rem", color: "#ccc", paddingLeft: 6 }}>↑ رفع</div>
    </div>
  );
}

/* ── Single info row inside a section card ── */
function InfoRow({ label, value, even }: { label: string; value: React.ReactNode; even: boolean }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "190px 1fr",
      borderBottom: "1px solid rgba(197,160,89,0.12)",
      background: even ? "#fff" : "#fafaf8",
    }}>
      <div style={{
        background: LABEL_BG, color: LABEL_COLOR,
        padding: "10px 14px", fontSize: "0.74rem", fontWeight: 700,
        whiteSpace: "nowrap", lineHeight: 1.45, wordBreak: "keep-all",
      }}>{label}</div>
      <div style={{
        padding: "10px 16px", fontSize: "0.8rem", color: "#2d2416",
        lineHeight: 1.45, wordBreak: "break-word",
      }}>
        {(value === null || value === undefined || value === "") ? <span style={{ color: "#ccc" }}>—</span> : value}
      </div>
    </div>
  );
}

/* ── Section card wrapper ── */
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, overflow: "hidden",
      border: "1.5px solid rgba(197,160,89,0.22)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      marginBottom: 14,
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
        padding: "12px 18px", color: "#fff",
        display: "flex", alignItems: "center", gap: 9,
        fontSize: "0.88rem", fontWeight: 800,
      }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>{title}
      </div>
      {children}
    </div>
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
  const [notesExpanded, setNotesExpanded] = useState(false);
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
      setNotesExpanded(false);
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
          <div>
            {/* Section 1: بيانات المشروع */}
            <SectionCard title="بيانات المشروع" icon="🏗️">
              <InfoRow label="جهة إصدار الطلب"     value={contract.issuerEntity}    even={true}  />
              <InfoRow label="اسم المشروع"           value={contract.projectName}     even={false} />
              <InfoRow label="رقم المشروع"           value={contract.projectNo}       even={true}  />
              <InfoRow label="نوع الأعمال"           value={contract.workType}        even={false} />
              <InfoRow label="نوع العقد"             value={contract.contractType}    even={true}  />
              <InfoRow
                label="قيمة العقد"
                value={contract.value > 0 ? (
                  <span>
                    <strong style={{ color: "#8B6914" }}>{contract.value.toLocaleString("ar-SA")} ريال</strong>
                    <span style={{ fontSize: "0.72rem", color: "#9b8060", marginRight: 6 }}>— {tafqit(contract.value)}</span>
                  </span>
                ) : null}
                even={false}
              />
              <InfoRow label="مدة العقد"   value={contract.contractDuration ? `${contract.contractDuration} يوماً` : null} even={true} />
              <InfoRow label="تاريخ الطلب" value={formattedDate} even={false} />
            </SectionCard>

            {/* Section 2: التحليل الفني والتوثيق */}
            <SectionCard title="التحليل الفني والتوثيق" icon="📊">
              <InfoRow label="قسم تقدير التكاليف" value={contract.costEstimationDept}   even={true}  />
              <InfoRow label="حالة تحليل السعر"   value={contract.priceAnalysisStatus}  even={false} />
              <InfoRow label="تحليل السعر"         value={<FileIcon fileType="excel"   label="تحليل السعر" />}          even={true}  />
              <InfoRow label="مقارنة مالية فنية"   value={<FileIcon fileType="excel"   label="مقارنة فنية مالية" />}   even={false} />
              <InfoRow label="عرض سعر - 1"         value={<FileIcon fileType="pdf"     label="عرض السعر الأول" />}     even={true}  />
              <InfoRow label="عرض سعر - 2"         value={<FileIcon fileType="pdf"     label="عرض السعر الثاني" />}    even={false} />
              <InfoRow label="عرض سعر - 3"         value={<FileIcon fileType="pdf"     label="عرض السعر الثالث" />}   even={true}  />
              <InfoRow label="عقد مماثل"            value={<FileIcon fileType="pdf"     label="عقد مماثل" />}           even={false} />
              <InfoRow label="مخططات"              value={<FileIcon fileType="image"   label="مخططات المشروع" />}     even={true}  />
              <InfoRow label="توصيفات"             value={<FileIcon fileType="word"    label="توصيفات المشروع" />}    even={false} />
            </SectionCard>

            {/* Section 3: بيانات الطرف الثاني */}
            <SectionCard title="بيانات الطرف الثاني" icon="🏢">
              <InfoRow label="اسم الطرف الثاني"                         value={contract.vendorName}       even={true}  />
              <InfoRow label="مؤسسة / شركة"                             value={contract.vendorEntityType} even={false} />
              <InfoRow label="رقم الآيبان"                              value={contract.vendorIban}       even={true}  />
              <InfoRow label="الرقم الضريبي"                            value={contract.vendorTaxNo}      even={false} />
              <InfoRow label="شهادة ضريبة القيمة المضافة / الزكاة"     value={<FileIcon fileType="pdf"   label="شهادة الزكاة والضريبة" />}  even={true}  />
              <InfoRow label="تفويض التوقيع"                            value={<FileIcon fileType="pdf"   label="خطاب التفويض" />}           even={false} />
              <InfoRow label="السجل التجاري"                            value={<FileIcon fileType="pdf"   label="السجل التجاري" />}          even={true}  />
              <InfoRow label="تاريخ انتهاء السجل التجاري"               value={contract.vendorRegExpiry}  even={false} />
              <InfoRow label="الهوية / الإقامة للمفوض"                 value={<FileIcon fileType="image" label="صورة الهوية" />}            even={true}  />
            </SectionCard>

            {/* Section 4: بيانات التواصل */}
            <SectionCard title="بيانات التواصل" icon="📞">
              <InfoRow label="اسم المفوض"                value={contract.vendorDelegate}      even={true}  />
              <InfoRow label="المسمى الوظيفي للمفوض"    value={contract.vendorDelegateTitle} even={false} />
              <InfoRow label="رقم الهوية / الإقامة"    value={contract.vendorDelegateId}    even={true}  />
              <InfoRow label="رقم التواصل"               value={contract.vendorContact}       even={false} />
              <InfoRow label="البريد الإلكتروني"         value={contract.vendorEmail}         even={true}  />
              <InfoRow label="الرمز البريدي"             value={contract.vendorPostalCode}    even={false} />
              <InfoRow label="العنوان"                   value={contract.vendorAddress}       even={true}  />
            </SectionCard>

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

      {/* ── Sticky action bar ── */}
      {!isCompleted && (
        <div className="no-print" style={{
          borderTop: "1.5px solid rgba(197,160,89,0.22)",
          background: "#fff",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}>
          {/* Slide-down notes / return panel */}
          <div style={{
            overflow: "hidden",
            maxHeight: notesExpanded ? 220 : 0,
            transition: "max-height 0.32s cubic-bezier(0.4,0,0.2,1)",
          }}>
            <div style={{
              padding: "14px 20px 10px",
              borderBottom: "1px solid rgba(231,76,60,0.15)",
              background: "rgba(231,76,60,0.02)",
            }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#c0392b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 3, height: 14, background: "#e74c3c", borderRadius: 2, display: "inline-block" }} />
                سبب الإعادة / الملاحظات
              </div>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="اذكر سبب الإعادة أو ملاحظاتك بالتفصيل..."
                rows={3}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 10,
                  border: "1.5px solid rgba(231,76,60,0.3)", fontSize: "0.82rem",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif", resize: "none",
                  outline: "none", boxSizing: "border-box", lineHeight: 1.55,
                  background: "#fff",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => doAction("reject")}
                  disabled={!rejectReason.trim() || actionBusy}
                  style={{
                    padding: "9px 22px", borderRadius: 10,
                    background: rejectReason.trim() && !actionBusy ? "rgba(231,76,60,0.9)" : "#ddd",
                    color: "#fff", border: "none",
                    cursor: rejectReason.trim() && !actionBusy ? "pointer" : "not-allowed",
                    fontSize: "0.82rem", fontWeight: 800,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    boxShadow: rejectReason.trim() ? "0 3px 10px rgba(231,76,60,0.3)" : "none",
                    transition: "all 0.2s",
                  }}
                >↩ إرسال وإعادة للمرحلة الأولى</button>
                {err && <div style={{ fontSize: "0.72rem", color: "#e74c3c", display: "flex", alignItems: "center" }}>⚠ {err}</div>}
              </div>
            </div>
          </div>

          {/* File input row (for stages that need a file) */}
          {needsFile && canAct && !notesExpanded && (
            <div style={{ padding: "10px 20px 0" }}>
              <input
                value={filename} onChange={e => setFilename(e.target.value)}
                placeholder={contract.currentStage === 6 ? "اسم ملف Word (عقد.docx)" : "اسم الملف الموقع (عقد_موقع.pdf)"}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 9,
                  border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Main action buttons */}
          <div style={{ padding: "12px 20px", display: "flex", gap: 10, alignItems: "center" }}>
            {canAct ? (
              <>
                <button
                  onClick={() => doAction("advance")}
                  disabled={actionBusy || (needsFile && !filename.trim())}
                  style={{
                    flex: 1, padding: "13px 20px", borderRadius: 12,
                    background: actionBusy ? "#ccc" : "linear-gradient(135deg, #2ecc71, #27ae60)",
                    color: "#fff", border: "none",
                    cursor: actionBusy || (needsFile && !filename.trim()) ? "not-allowed" : "pointer",
                    fontSize: "0.9rem", fontWeight: 800,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    boxShadow: actionBusy ? "none" : "0 4px 16px rgba(39,174,96,0.35)",
                    transition: "all 0.2s",
                  }}
                >
                  {actionBusy ? "⏳ جاري المعالجة..." : contract.currentStage < 11
                    ? `✅ قبول واعتماد — الانتقال للمرحلة ${contract.currentStage + 1}`
                    : "✅ قبول واعتماد الختم والإنهاء"}
                </button>
                <button
                  onClick={() => { setNotesExpanded(v => !v); setErr(""); }}
                  disabled={actionBusy}
                  style={{
                    padding: "13px 18px", borderRadius: 12,
                    background: notesExpanded ? "rgba(231,76,60,0.1)" : GOLD_BG,
                    color: notesExpanded ? "#c0392b" : "#8B6914",
                    border: `1.5px solid ${notesExpanded ? "rgba(231,76,60,0.35)" : GOLD_BORDER}`,
                    cursor: actionBusy ? "not-allowed" : "pointer",
                    fontSize: "0.82rem", fontWeight: 800,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    transition: "all 0.22s", whiteSpace: "nowrap",
                  }}
                >
                  {notesExpanded ? "✕ إلغاء" : "📝 إضافة ملاحظات / إعادة"}
                </button>
              </>
            ) : (
              <div style={{
                flex: 1, padding: "12px 18px", borderRadius: 12,
                background: "rgba(0,0,0,0.03)", border: "1.5px dashed rgba(0,0,0,0.1)",
                textAlign: "center", fontSize: "0.78rem", color: "#bbb",
              }}>
                المرحلة الحالية ({stage?.label}) مخصصة لدور{" "}
                <strong style={{ color: "#9b8060" }}>{STAGE_ALLOWED[contract.currentStage]?.join(" / ")}</strong>
              </div>
            )}
          </div>

          {success && (
            <div style={{ margin: "0 20px 12px", background: "rgba(39,174,96,0.08)", borderRadius: 10, padding: "10px 14px", color: "#27ae60", fontSize: "0.78rem", fontWeight: 700 }}>
              {success}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
