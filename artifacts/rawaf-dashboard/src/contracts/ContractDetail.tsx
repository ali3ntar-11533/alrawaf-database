import { useEffect, useMemo, useRef, useState } from "react";
import { STAGES } from "./types";
import type { Contract, ContractComment, StageLog } from "./types";
import { getContract, getContractAudit, advanceStage, getContractComments, addContractComment } from "./api";
import { tafqit } from "./tafqit";

const PRINT_STYLE_ID = "print-contract-detail-style";

/* ── Design tokens ── */
const GOLD2       = "#a88540";
const BLUE_M      = "#1976D2";
const BLUE        = "#1565C0";
const BLUE_L      = "#4A90D9";
const AMBER       = "#F5A623";
const GOLD        = BLUE_M;
const GOLD_BG     = "rgba(25,118,210,0.07)";
const GOLD_BORDER = "rgba(25,118,210,0.18)";
const GLASS_BG    = "rgba(255,255,255,0.97)";
const GLASS_BG2   = "rgba(255,255,255,0.85)";
const GLASS_BORDER= "rgba(0,0,0,0.07)";
const SHADOW_SM   = "0 2px 10px rgba(0,0,0,0.05)";
const SHADOW_MD   = "0 6px 28px rgba(0,0,0,0.08)";
const SHADOW_GOLD = "0 4px 20px rgba(25,118,210,0.14)";
const BLUR        = "blur(18px)";
const BLUR_SM     = "blur(10px)";

const LABEL_BG    = "linear-gradient(135deg, #1565C0, #0D47A1)";
const VALUE_BG_E  = "rgba(255,255,255,0.97)";
const VALUE_BG_O  = "rgba(248,250,255,0.97)";

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
    <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: "rgba(25,118,210,0.08)", border: "1px solid rgba(25,118,210,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.82rem",
      }}>📎</div>
      <span style={{ fontSize: "0.62rem", color: BLUE_M, fontWeight: 700 }}>رفع ملف</span>
    </div>
  );
}

function Attach3Cell() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {[1,2,3].map(n => (
        <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
            background: "rgba(25,118,210,0.07)", border: "1px solid rgba(25,118,210,0.16)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem",
          }}>📎</div>
          <span style={{ fontSize: "0.6rem", color: BLUE_M, fontWeight: 700 }}>عرض {n}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Table cell types ── */
interface ValueWithAttach { text: string | null | undefined; hasAttach: true }
type CellContent = string | null | undefined | "ATTACH" | "ATTACH3" | "EMPTY" | ValueWithAttach;
function renderCell(content: CellContent) {
  if (content === "ATTACH") return <AttachCell />;
  if (content === "ATTACH3") return <Attach3Cell />;
  if (content !== null && typeof content === "object" && "hasAttach" in content) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {content.text
          ? <span>{content.text}</span>
          : <span style={{ color: "#ccc" }}>—</span>}
        <AttachCell />
      </div>
    );
  }
  if (content === "EMPTY" || content === null || content === undefined || content === "")
    return <span style={{ color: "#ccc" }}>—</span>;
  return <>{content}</>;
}

/* ── 4-column data row ── */
function DataRow({
  rightLabel, rightContent,
  leftLabel,  leftContent,
  evenRow,
}: {
  rightLabel: string; rightContent: CellContent;
  leftLabel:  string; leftContent:  CellContent;
  evenRow: boolean;
}) {
  const valueBg = evenRow ? VALUE_BG_E : VALUE_BG_O;
  const labelStyle: React.CSSProperties = {
    background: LABEL_BG, color: "#fff",
    padding: "9px 13px", fontSize: "0.73rem", fontWeight: 700,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    lineHeight: 1.4, whiteSpace: "nowrap",
  };
  const valueStyle: React.CSSProperties = {
    background: valueBg, color: "#1a2535",
    padding: "9px 13px", fontSize: "0.79rem",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    lineHeight: 1.4, wordBreak: "break-word",
  };
  return (
    <>
      <div style={labelStyle}>{rightLabel}</div>
      <div style={valueStyle}>{renderCell(rightContent)}</div>
      <div style={{ ...labelStyle, borderRight: "1px solid rgba(255,255,255,0.12)" }}>{leftLabel}</div>
      <div style={{ ...valueStyle, borderRight: "1px solid rgba(25,118,210,0.1)" }}>{renderCell(leftContent)}</div>
    </>
  );
}

/* ── Section card wrapper ── */
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: GLASS_BG, backdropFilter: BLUR_SM,
      borderRadius: 16, overflow: "hidden",
      border: `1.5px solid ${GLASS_BORDER}`,
      boxShadow: SHADOW_MD,
      marginBottom: 14,
    }}>
      {/* Top color band */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${BLUE_M}, ${BLUE_L}, ${AMBER})` }}/>
      <div style={{
        background: `linear-gradient(135deg, ${BLUE}, ${BLUE_M})`,
        padding: "12px 18px", color: "#fff",
        display: "flex", alignItems: "center", gap: 9,
        fontSize: "0.88rem", fontWeight: 800,
      }}>
        <span style={{ fontSize: "0.92rem" }}>{icon}</span>{title}
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
      background: GLASS_BG, backdropFilter: BLUR_SM,
      borderRadius: 16, overflow: "hidden",
      border: `1.5px solid ${GLASS_BORDER}`,
      boxShadow: SHADOW_MD,
      display: "flex", flexDirection: "column", minHeight: 480,
    }}>
      <div style={{
        padding: "14px 20px", borderBottom: `1.5px solid rgba(0,0,0,0.06)`,
        background: `linear-gradient(135deg, rgba(25,118,210,0.08), rgba(25,118,210,0.02))`,
        backdropFilter: BLUR_SM,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: `linear-gradient(135deg, ${BLUE_M}, ${BLUE})`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
          boxShadow: "0 4px 12px rgba(25,118,210,0.25)",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div>
          <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0C1427" }}>المحادثة الداخلية</div>
          <div style={{ fontSize: "0.62rem", color: "#64748B" }}>{comments.length} رسالة</div>
        </div>
        <button onClick={loadComments} title="تحديث" style={{
          marginRight: "auto", border: "none", background: "transparent",
          cursor: "pointer", color: BLUE_M, fontSize: "0.9rem", padding: 4,
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
                  boxShadow: `0 2px 8px ${color}44`,
                }}>{getInitials(c.actorName)}</div>
                <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 2, alignItems: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{ fontSize: "0.6rem", color: "#bbb", display: "flex", gap: 4 }}>
                    <span style={{ fontWeight: 700, color: BLUE_M }}>{c.actorName}</span>
                    <span>·</span><span>{c.actorRole}</span>
                  </div>
                  <div style={{
                    background: isMe ? `linear-gradient(135deg, ${BLUE_M}, ${BLUE})` : GLASS_BG,
                    backdropFilter: BLUR_SM,
                    color: isMe ? "#fff" : "#1a2535",
                    borderRadius: isMe ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    padding: "9px 13px", fontSize: "0.8rem", lineHeight: 1.55,
                    border: isMe ? "none" : `1px solid ${GLASS_BORDER}`,
                    boxShadow: isMe ? SHADOW_GOLD : SHADOW_SM,
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

      <div style={{ padding: "12px 16px", borderTop: `1.5px solid rgba(0,0,0,0.06)`, background: "rgba(248,250,255,0.9)", backdropFilter: BLUR_SM }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={msg} onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="اكتب رسالتك… (Enter للإرسال)"
            rows={2}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 10,
              border: `1.5px solid rgba(0,0,0,0.12)`, fontSize: "0.82rem",
              fontFamily: "'Cairo', 'Tajawal', sans-serif", resize: "none", outline: "none", lineHeight: 1.5,
              background: "rgba(255,255,255,0.97)",
            }}
          />
          <button onClick={handleSend} disabled={!canSend} style={{
            width: 42, height: 42, borderRadius: "50%", border: "none", flexShrink: 0,
            background: canSend ? `linear-gradient(135deg, ${BLUE}, ${BLUE_M})` : "#ddd",
            color: "#fff", cursor: canSend ? "pointer" : "not-allowed",
            fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: canSend ? "0 4px 12px rgba(25,118,210,0.35)" : "none", transition: "all 0.2s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
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
  { id: "log",      label: "سجل الإجراءات", icon: "📅" },
  { id: "request",  label: "بيانات الطلب",  icon: "📋" },
  { id: "chat",     label: "المحادثات",      icon: "💬" },
  { id: "contract", label: "",               icon: "📄" },
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
      setSuccess(action === "advance" ? "✅ تم الاعتماد والانتقال للمرحلة التالية" : "تم إرجاع العقد للمرحلة الأولى");
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 14, color: "#bbb" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid rgba(25,118,210,0.2)`, borderTopColor: BLUE_M, animation: "spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: "0.82rem" }}>جاري تحميل بيانات العقد…</span>
    </div>
  );
  if (!contract) return <div style={{ padding: 32, color: "#e74c3c" }}>لم يُعثر على العقد</div>;

  const canAct      = STAGE_ALLOWED[contract.currentStage]?.includes(role);
  const isCompleted = contract.status === "completed";
  const pct         = isCompleted ? 100 : Math.round(((contract.currentStage - 1) / 11) * 100);
  const stage       = STAGES[contract.currentStage - 1];
  const needsFile   = contract.currentStage === 6 || contract.currentStage === 10;

  const formattedDate = contract.createdAt
    ? new Date(contract.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }) +
      " — " + new Date(contract.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", height: "100%", display: "flex", flexDirection: "column", background: "#FFFFFF" }}>

      <style>{`
        @keyframes stg-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(25,118,210,0.22); }
          50%       { box-shadow: 0 0 0 7px rgba(25,118,210,0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media print { .print-only-bar { display: block !important; } }
      `}</style>

      {/* Main scroll area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>

        {/* ── Top bar ── */}
        <div className="no-print" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16, gap: 10,
        }}>
          <button
            onClick={onBack}
            style={{
              border: `1px solid ${GLASS_BORDER}`,
              background: GLASS_BG,
              backdropFilter: BLUR_SM,
              cursor: "pointer",
              color: "#64748B",
              fontSize: "0.82rem",
              fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              padding: "8px 16px", borderRadius: 10,
              boxShadow: SHADOW_SM,
              transition: "all 0.18s",
            }}
          >
            رجوع للقائمة
          </button>

          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>رقم الطلب</span>
              <span style={{
                fontSize: "0.78rem", fontWeight: 900, color: BLUE_M,
                background: "rgba(25,118,210,0.06)", backdropFilter: BLUR_SM,
                border: `1px solid rgba(25,118,210,0.18)`, borderRadius: 20,
                padding: "5px 16px", boxShadow: SHADOW_SM,
              }}>
                {contract.contractNo}
              </span>
            </div>
          </div>

          <button
            onClick={handlePrint}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 18px", borderRadius: 10,
              background: `linear-gradient(135deg, ${BLUE}, ${BLUE_M})`,
              color: "#fff", border: "none", cursor: "pointer",
              fontSize: "0.82rem", fontWeight: 800,
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              boxShadow: `0 3px 14px rgba(25,118,210,0.35)`,
              transition: "all 0.18s",
            }}
          >
            طباعة
          </button>
        </div>

        {/* ── Contract header card (glassmorphism) ── */}
        <div style={{
          background: GLASS_BG,
          backdropFilter: BLUR,
          borderRadius: 18,
          padding: "20px 24px",
          marginBottom: 14,
          border: `1.5px solid ${GLASS_BORDER}`,
          boxShadow: `${SHADOW_MD}, ${SHADOW_GOLD}`,
          animation: "fadeSlideUp 0.32s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: isCompleted
                ? "rgba(39,174,96,0.12)"
                : `linear-gradient(135deg, rgba(25,118,210,0.15), rgba(25,118,210,0.06))`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem",
              border: `1.5px solid ${isCompleted ? "rgba(39,174,96,0.3)" : "rgba(25,118,210,0.18)"}`,
              boxShadow: isCompleted ? "0 4px 16px rgba(39,174,96,0.15)" : "0 4px 16px rgba(25,118,210,0.12)",
            }}>
              {stage?.icon ?? "📄"}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "#0C1427", marginBottom: 4, lineHeight: 1.4 }}>
                {contract.title}
              </div>
              {(contract.projectName || contract.projectNo) && (
                <div style={{ fontSize: "0.72rem", color: "#64748B", marginBottom: 4, display: "flex", flexWrap: "wrap", gap: "0 8px" }}>
                  {contract.projectName && <span>م/ {contract.projectName}</span>}
                  {contract.projectNo  && <span>· {contract.projectNo}</span>}
                </div>
              )}
              {/* Stage status badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6,
                background: isCompleted ? "rgba(39,174,96,0.1)" : "rgba(25,118,210,0.08)",
                border: `1px solid ${isCompleted ? "rgba(39,174,96,0.25)" : "rgba(25,118,210,0.2)"}`,
                borderRadius: 20, padding: "4px 12px",
              }}>
                <span style={{ fontSize: "0.78rem" }}>{stage?.icon ?? "📄"}</span>
                <span style={{ fontSize: "0.68rem", fontWeight: 800, color: isCompleted ? "#27ae60" : BLUE_M }}>
                  {isCompleted ? "مكتمل" : stage?.label ?? "—"}
                </span>
                {!isCompleted && (
                  <span style={{ fontSize: "0.6rem", color: "#64748B" }}>· {stage?.role}</span>
                )}
              </div>
            </div>

            <div style={{
              textAlign: "center",
              background: isCompleted
                ? "rgba(39,174,96,0.1)"
                : `linear-gradient(135deg, rgba(25,118,210,0.12), rgba(25,118,210,0.05))`,
              backdropFilter: BLUR_SM,
              border: `1.5px solid ${isCompleted ? "rgba(39,174,96,0.3)" : "rgba(25,118,210,0.18)"}`,
              borderRadius: 12, padding: "10px 18px", flexShrink: 0,
              boxShadow: isCompleted ? "0 4px 16px rgba(39,174,96,0.12)" : "0 4px 16px rgba(25,118,210,0.12)",
            }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: isCompleted ? "#27ae60" : BLUE_M }}>{pct}%</div>
              <div style={{ fontSize: "0.56rem", color: "#64748B", marginTop: 2 }}>إنجاز</div>
            </div>
          </div>

          {/* ── Stage timeline ── */}
          <div className="no-print" style={{ marginTop: 18, overflowX: "auto", paddingBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content", direction: "rtl" }}>
              {STAGES.map((stg, idx) => {
                const sNum   = idx + 1;
                const isDone = isCompleted ? true : sNum < contract.currentStage;
                const isCur  = !isCompleted && sNum === contract.currentStage;
                const dur    = stageDurations[sNum];
                return (
                  <div key={sNum} style={{ display: "flex", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60, padding: "0 3px" }}>
                      {/* Circle */}
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: isDone ? "0.88rem" : "0.72rem", fontWeight: 900,
                        background: isDone
                          ? `linear-gradient(135deg, ${BLUE}, ${BLUE_M})`
                          : isCur
                            ? GLASS_BG2
                            : "rgba(0,0,0,0.05)",
                        color: isDone ? "#fff" : isCur ? BLUE_M : "#ccc",
                        border: isCur ? `2px solid ${BLUE_M}` : isDone ? "2px solid transparent" : "2px solid rgba(0,0,0,0.08)",
                        boxShadow: isDone ? SHADOW_GOLD : isCur ? `0 0 0 4px rgba(25,118,210,0.18)` : "none",
                        animation: isCur ? "stg-pulse 2s ease-in-out infinite" : "none",
                        transition: "all 0.3s",
                      }}>
                        {isDone ? "✓" : sNum}
                      </div>
                      {/* Label */}
                      <div style={{
                        fontSize: "0.47rem", marginTop: 5, textAlign: "center",
                        color: isDone ? BLUE : isCur ? BLUE_M : "#bbb",
                        fontWeight: isCur ? 800 : 500,
                        lineHeight: 1.35, maxWidth: 58,
                      }}>
                        {stg.label}
                      </div>
                      {/* Duration badge */}
                      {isDone && dur && (
                        <div style={{
                          fontSize: "0.41rem", color: BLUE, marginTop: 3,
                          background: "rgba(25,118,210,0.08)", borderRadius: 8,
                          padding: "1px 5px", fontWeight: 600,
                          border: "1px solid rgba(25,118,210,0.18)",
                        }}>{dur}</div>
                      )}
                      {isCur && (
                        <div style={{
                          fontSize: "0.41rem", color: BLUE_M, marginTop: 3, fontWeight: 800,
                          background: "rgba(25,118,210,0.1)", borderRadius: 8, padding: "1px 5px",
                          border: `1px solid rgba(25,118,210,0.25)`,
                          animation: "stg-pulse 2s ease-in-out infinite",
                        }}>جارٍ</div>
                      )}
                    </div>
                    {/* Connector */}
                    {idx < STAGES.length - 1 && (
                      <div style={{
                        width: 14, height: 2, marginTop: 15, flexShrink: 0,
                        background: isDone
                          ? `linear-gradient(90deg, ${BLUE}, ${BLUE_L})`
                          : "rgba(0,0,0,0.07)",
                        borderRadius: 2,
                        transition: "background 0.4s",
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Print-only bar */}
          <div className="print-only-bar" style={{ display: "none", marginTop: 8, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: isCompleted ? "#27ae60" : `linear-gradient(90deg, ${BLUE}, ${BLUE_M})` }} />
          </div>

          {/* Rejection reason */}
          {contract.rejectionReason && !isCompleted && (
            <div style={{
              marginTop: 12, background: "rgba(231,76,60,0.06)", borderRadius: 10, padding: "10px 14px",
              border: "1px solid rgba(231,76,60,0.2)", fontSize: "0.76rem", color: "#c0392b",
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
              <div><strong>سبب الإعادة: </strong>{contract.rejectionReason}</div>
            </div>
          )}
        </div>

        {/* ── Tab bar (glassmorphism) ── */}
        <div className="no-print" style={{
          display: "flex", borderRadius: 14, overflow: "hidden",
          border: `1.5px solid ${GLASS_BORDER}`, marginBottom: 14,
          background: GLASS_BG, backdropFilter: BLUR_SM,
          boxShadow: SHADOW_SM,
          animation: "fadeSlideUp 0.36s ease 0.05s both",
        }}>
          {TABS.map((tab, idx) => {
            const isActive = activeTab === tab.id;
            const label = tab.id === "contract" ? (contract?.title ?? "وثيقة العقد") : tab.label;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.id === "contract" ? contract?.title : undefined}
                style={{
                  flex: tab.id === "contract" ? 1.4 : 1, padding: "11px 6px",
                  border: "none",
                  borderLeft: idx < TABS.length - 1 ? `1px solid ${GLASS_BORDER}` : "none",
                  background: isActive ? `linear-gradient(135deg, ${BLUE}, ${BLUE_M})` : "transparent",
                  color: isActive ? "#fff" : "#64748B",
                  cursor: "pointer", fontSize: "0.72rem", fontWeight: isActive ? 800 : 600,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  transition: "all 0.2s",
                  boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(25,118,210,0.3)" : "none",
                  overflow: "hidden",
                }}
              >
                <span style={{ fontSize: "0.88rem", flexShrink: 0 }}>{tab.icon}</span>
                <span style={{
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  maxWidth: tab.id === "contract" ? 110 : undefined,
                }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB: بيانات الطلب ── */}
        {activeTab === "request" && (() => {
          const rows: { r: string; rv: CellContent; l: string; lv: CellContent }[] = [
            { r: "اسم الطرف الثاني",                         rv: contract.vendorName,          l: "تاريخ الطلب",              lv: formattedDate },
            { r: "رقم الآيبان",                              rv: { text: contract.vendorIban, hasAttach: true },             l: "جهة إصدار الطلب",          lv: contract.issuerEntity },
            { r: "الرقم / شهادة ضريبة القيمة المضافة",       rv: { text: contract.vendorTaxNo, hasAttach: true },            l: "اسم المشروع",              lv: contract.projectName },
            { r: "ممثل الطرف الثاني",                        rv: contract.vendorDelegate,      l: "رقم المشروع",              lv: contract.projectNo },
            { r: "صفته",                                     rv: contract.vendorDelegateTitle, l: "نوع الأعمال",              lv: contract.workType },
            { r: "رقم الهوية / الإقامة للمفوض",              rv: contract.vendorDelegateId,    l: "نوع العقد",                lv: contract.contractType },
            { r: "رقم التواصل الرسمي للمنشأة",               rv: contract.vendorContact,       l: "قيمة العقد",               lv: contract.value > 0 ? `${contract.value.toLocaleString("ar-SA")} ريال` : null },
            { r: "البريد الإلكتروني الرسمي للمنشأة",          rv: contract.vendorEmail,         l: "مدة العقد",                lv: contract.contractDuration ? `${contract.contractDuration} يوماً` : null },
            { r: "العنوان الوطني",                            rv: { text: contract.vendorAddress, hasAttach: true },          l: "حالة تحليل السعر",         lv: { text: contract.priceAnalysisStatus, hasAttach: true } },
            { r: "الرمز البريدي",                             rv: contract.vendorPostalCode,    l: "مقارنة مالية وفنية",       lv: "ATTACH" },
            { r: "السجل التجاري",                             rv: "ATTACH",                     l: "عقد مماثل",                lv: "ATTACH" },
            { r: "عقد التأسيس",                              rv: "ATTACH",                     l: "المخططات",                 lv: "ATTACH" },
            { r: "العرض الفني والمالي للمنشأة",               rv: "ATTACH",                     l: "توصيفات",                  lv: "ATTACH" },
            { r: "عروض أسعار مماثلة",                        rv: "ATTACH3",                    l: "طلب إصدار العقد BOQ",       lv: "ATTACH" },
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeSlideUp 0.3s ease both" }}>
              {/* 4-column data table */}
              <div style={{
                borderRadius: 16, overflow: "hidden",
                border: `1.5px solid rgba(25,118,210,0.15)`,
                boxShadow: SHADOW_MD,
                background: GLASS_BG,
                backdropFilter: BLUR_SM,
              }}>
                {/* Top color band */}
                <div style={{ height: 4, background: `linear-gradient(90deg, ${BLUE_M}, ${BLUE_L}, ${AMBER})` }}/>
                {/* Table title — glass style */}
                <div style={{
                  background: "rgba(25,118,210,0.07)",
                  backdropFilter: BLUR_SM,
                  color: BLUE, textAlign: "center",
                  padding: "12px 20px", fontSize: "0.88rem", fontWeight: 900,
                  letterSpacing: "0.04em",
                  borderBottom: "1px solid rgba(25,118,210,0.12)",
                }}>بيانات الطلب والعقد</div>

                {/* Column sub-headers — glass style */}
                <div style={{ display: "grid", gridTemplateColumns: "170px 1fr 170px 1fr" }}>
                  {[
                    { label: "بيانات الطرف الثاني" },
                    { label: "" },
                    { label: "بيانات المشروع",  borderRight: true },
                    { label: "",                borderRight: true },
                  ].map((col, i) => (
                    <div key={i} style={{
                      background: "rgba(25,118,210,0.05)",
                      backdropFilter: BLUR_SM,
                      color: col.label ? BLUE : "transparent",
                      padding: "7px 13px", fontSize: "0.69rem", fontWeight: 800,
                      textAlign: "center",
                      borderBottom: "1px solid rgba(25,118,210,0.1)",
                      borderLeft: i === 2 ? "1px solid rgba(25,118,210,0.1)" : undefined,
                    }}>{col.label || "‎"}</div>
                  ))}
                </div>

                {/* Data rows */}
                <div style={{ display: "grid", gridTemplateColumns: "170px 1fr 170px 1fr" }}>
                  {rows.map((row, i) => (
                    <DataRow
                      key={i}
                      rightLabel={row.r === "EMPTY" ? "" : row.r}
                      rightContent={row.r === "EMPTY" ? "EMPTY" : row.rv}
                      leftLabel={row.l}
                      leftContent={row.lv}
                      evenRow={i % 2 === 0}
                    />
                  ))}
                </div>
              </div>

              {isCompleted && (
                <div style={{
                  background: "rgba(39,174,96,0.08)", borderRadius: 14, padding: "16px 20px",
                  border: "1.5px solid rgba(39,174,96,0.25)", textAlign: "center",
                  fontSize: "0.9rem", color: "#27ae60", fontWeight: 800,
                  backdropFilter: BLUR_SM,
                }}>
                  🏆 العقد مكتمل ومُوقَّع — {contract.contractNo}
                  {contract.signedFilename && <div style={{ fontSize: "0.75rem", marginTop: 5, opacity: 0.8 }}>📜 {contract.signedFilename}</div>}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── TAB: وثيقة العقد ── */}
        {activeTab === "contract" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeSlideUp 0.3s ease both" }}>

            {/* Contract document section */}
            <div style={{
              background: GLASS_BG, backdropFilter: BLUR_SM,
              borderRadius: 16, overflow: "hidden",
              border: "1.5px solid rgba(25,118,210,0.15)",
              boxShadow: SHADOW_MD,
            }}>
              <div style={{ height: 4, background: `linear-gradient(90deg, ${BLUE_M}, ${BLUE_L}, ${AMBER})` }}/>
              <div style={{
                background: "rgba(25,118,210,0.07)", backdropFilter: BLUR_SM,
                padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
                borderBottom: "1px solid rgba(25,118,210,0.1)",
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: `linear-gradient(135deg, ${BLUE_M}, ${BLUE})`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
                  boxShadow: "0 4px 14px rgba(25,118,210,0.25)",
                }}>📄</div>
                <div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 900, color: "#0C1427" }}>{contract.title}</div>
                  <div style={{ fontSize: "0.66rem", color: "#64748B", marginTop: 3 }}>{contract.contractNo} · {contract.contractType}</div>
                </div>
                <div style={{ marginRight: "auto", display: "flex", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(25,118,210,0.08)", borderRadius: 20, padding: "5px 14px", border: "1px solid rgba(25,118,210,0.18)", cursor: "pointer" }}>
                    <span style={{ fontSize: "0.82rem" }}>📎</span>
                    <span style={{ fontSize: "0.66rem", fontWeight: 700, color: BLUE_M }}>رفع وثيقة العقد</span>
                  </div>
                </div>
              </div>
              {(contract.wordFilename || contract.signedFilename) && (
                <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {contract.wordFilename && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(39,174,96,0.06)", backdropFilter: BLUR_SM, borderRadius: 12, padding: "11px 16px", border: "1px solid rgba(39,174,96,0.2)", boxShadow: SHADOW_SM }}>
                      <span style={{ fontSize: "1.3rem" }}>📄</span>
                      <div>
                        <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#1a1206" }}>مسودة Word</div>
                        <div style={{ fontSize: "0.65rem", color: "#64748B" }}>{contract.wordFilename}</div>
                      </div>
                      <div style={{ marginRight: "auto", fontSize: "0.6rem", color: "#27ae60", fontWeight: 700, background: "rgba(39,174,96,0.1)", padding: "3px 10px", borderRadius: 20 }}>مرفوع</div>
                    </div>
                  )}
                  {contract.signedFilename && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(25,118,210,0.06)", backdropFilter: BLUR_SM, borderRadius: 12, padding: "11px 16px", border: `1px solid rgba(25,118,210,0.18)`, boxShadow: SHADOW_SM }}>
                      <span style={{ fontSize: "1.3rem" }}>✒️</span>
                      <div>
                        <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#1a1206" }}>نسخة موقعة</div>
                        <div style={{ fontSize: "0.65rem", color: "#64748B" }}>{contract.signedFilename}</div>
                      </div>
                      <div style={{ marginRight: "auto", fontSize: "0.6rem", color: BLUE_M, fontWeight: 700, background: "rgba(25,118,210,0.1)", padding: "3px 10px", borderRadius: 20 }}>موقع</div>
                    </div>
                  )}
                </div>
              )}
              {!contract.wordFilename && !contract.signedFilename && (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: "0.78rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📋</div>
                  لم يُرفع ملف العقد بعد
                </div>
              )}
            </div>

            {/* Smart attachments */}
            <div style={{
              background: GLASS_BG, backdropFilter: BLUR_SM,
              borderRadius: 16, padding: "18px 20px",
              border: `1.5px solid ${GLASS_BORDER}`,
              boxShadow: SHADOW_MD,
            }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: BLUE, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 16, background: `linear-gradient(180deg,${BLUE_M},${BLUE_L})`, borderRadius: 2, display: "inline-block" }} />
                مرفقات العقد
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {SMART_DOCS.map((doc, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(25,118,210,0.04)",
                      backdropFilter: BLUR_SM,
                      borderRadius: 12, padding: "16px 10px",
                      border: `1.5px solid rgba(25,118,210,0.1)`, textAlign: "center",
                      cursor: "pointer", transition: "all 0.2s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                      boxShadow: SHADOW_SM,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 18px rgba(25,118,210,0.14)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(25,118,210,0.22)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = SHADOW_SM;
                      (e.currentTarget as HTMLDivElement).style.transform = "none";
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(25,118,210,0.1)";
                    }}
                  >
                    <div style={{ fontSize: "1.8rem" }}>{doc.icon}</div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1a2535", lineHeight: 1.4 }}>{doc.label}</div>
                    <div style={{ fontSize: "0.56rem", color: "#94a3b8" }}>{doc.hint}</div>
                    <div style={{
                      marginTop: 3, padding: "3px 10px", borderRadius: 20,
                      background: "rgba(25,118,210,0.07)", fontSize: "0.58rem",
                      color: BLUE_M, fontWeight: 700,
                      border: `1px solid rgba(25,118,210,0.15)`,
                    }}>رفع ملف</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: سجل الإجراءات ── */}
        {activeTab === "log" && (
          <div style={{
            background: GLASS_BG, backdropFilter: BLUR_SM,
            borderRadius: 16, padding: "20px 22px",
            border: `1.5px solid ${GLASS_BORDER}`,
            boxShadow: SHADOW_MD,
            animation: "fadeSlideUp 0.3s ease both",
          }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: BLUE, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 4, height: 16, background: `linear-gradient(180deg,${BLUE_M},${BLUE_L})`, borderRadius: 2, display: "inline-block" }} />
              سجل الإجراءات والعمليات
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", right: 15, top: 0, bottom: 0, width: 2, background: `linear-gradient(180deg, rgba(25,118,210,0.2), rgba(25,118,210,0.04))`, borderRadius: 2 }} />
              {log.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: "0.82rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📋</div>
                  لا يوجد سجلات بعد
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {log.map((entry) => (
                    <div key={entry.id} style={{ display: "flex", gap: 16, alignItems: "flex-start", paddingRight: 38 }}>
                      <div style={{
                        position: "absolute", right: 5, width: 22, height: 22, borderRadius: "50%",
                        background: entry.action === "reject"
                          ? "linear-gradient(135deg,#e74c3c,#c0392b)"
                          : `linear-gradient(135deg,${BLUE},${BLUE_M})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.6rem", color: "#fff", fontWeight: 900, zIndex: 1,
                        boxShadow: entry.action === "reject" ? "0 2px 8px rgba(231,76,60,0.35)" : "0 2px 8px rgba(25,118,210,0.3)",
                      }}>
                        {entry.action === "reject" ? "✕" : "✓"}
                      </div>
                      <div style={{
                        flex: 1, minWidth: 0,
                        background: GLASS_BG2, backdropFilter: BLUR_SM,
                        borderRadius: 12, padding: "12px 16px",
                        border: `1px solid ${entry.action === "reject" ? "rgba(231,76,60,0.12)" : GLASS_BORDER}`,
                        boxShadow: SHADOW_SM,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1a1206" }}>
                            م{entry.stage}: {STAGES[entry.stage - 1]?.label}
                          </span>
                          <span style={{
                            fontSize: "0.62rem", padding: "2px 9px", borderRadius: 20,
                            background: entry.action === "reject" ? "rgba(231,76,60,0.1)" : "rgba(39,174,96,0.1)",
                            color: entry.action === "reject" ? "#e74c3c" : "#27ae60",
                            fontWeight: 700,
                            border: `1px solid ${entry.action === "reject" ? "rgba(231,76,60,0.2)" : "rgba(39,174,96,0.2)"}`,
                          }}>
                            {entry.action === "reject" ? "رُفض" : entry.action === "create" ? "أُنشئ" : "اعتُمد"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#9b8060", marginTop: 4 }}>
                          {entry.actorName} ({entry.actorRole}) · {new Date(entry.createdAt).toLocaleString("ar-SA")}
                        </div>
                        {entry.notes && entry.notes !== `اعتماد المرحلة ${entry.stage}` && entry.notes !== "إنشاء العقد" && (
                          <div style={{ fontSize: "0.7rem", color: "#6b5c3e", marginTop: 5, paddingTop: 5, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                            💬 {entry.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div style={{
                    background: `linear-gradient(135deg, rgba(25,118,210,0.08), rgba(25,118,210,0.03))`,
                    backdropFilter: BLUR_SM,
                    borderRadius: 14, padding: "14px 18px",
                    border: `1.5px solid rgba(25,118,210,0.18)`, textAlign: "center",
                    boxShadow: "0 4px 16px rgba(25,118,210,0.1)",
                  }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 900, color: BLUE_M }}>
                      {pct}% مكتمل
                    </div>
                    <div style={{ fontSize: "0.66rem", color: "#64748B", marginTop: 3 }}>
                      {isCompleted ? "تم اكتمال جميع المراحل بنجاح" : `المرحلة الحالية: ${stage?.label}`}
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

      {/* ── Sticky action bar (glassmorphism) ── */}
      {!isCompleted && (
        <div className="no-print" style={{
          borderTop: `1.5px solid ${GLASS_BORDER}`,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: BLUR,
          boxShadow: "0 -6px 28px rgba(0,0,0,0.1)",
          flexShrink: 0,
        }}>

          {/* Slide-down notes / return panel */}
          <div style={{
            overflow: "hidden",
            maxHeight: notesExpanded ? 240 : 0,
            transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}>
            <div style={{
              padding: "16px 20px 12px",
              borderBottom: "1px solid rgba(231,76,60,0.12)",
              background: "rgba(254,246,246,0.92)",
              backdropFilter: BLUR_SM,
            }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#c0392b", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 3, height: 14, background: "#e74c3c", borderRadius: 2, display: "inline-block" }} />
                سبب الإعادة / الملاحظات
              </div>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="اذكر سبب الإعادة أو ملاحظاتك بالتفصيل..."
                rows={3}
                style={{
                  width: "100%", padding: "10px 13px", borderRadius: 10,
                  border: "1.5px solid rgba(231,76,60,0.28)", fontSize: "0.82rem",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif", resize: "none",
                  outline: "none", boxSizing: "border-box", lineHeight: 1.55,
                  background: "rgba(255,255,255,0.95)",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "rgba(231,76,60,0.5)"}
                onBlur={e => e.currentTarget.style.borderColor = "rgba(231,76,60,0.28)"}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                <button
                  onClick={() => doAction("reject")}
                  disabled={!rejectReason.trim() || actionBusy}
                  style={{
                    padding: "9px 22px", borderRadius: 10,
                    background: rejectReason.trim() && !actionBusy
                      ? "linear-gradient(135deg, #e74c3c, #c0392b)"
                      : "#ddd",
                    color: "#fff", border: "none",
                    cursor: rejectReason.trim() && !actionBusy ? "pointer" : "not-allowed",
                    fontSize: "0.82rem", fontWeight: 800,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    boxShadow: rejectReason.trim() ? "0 3px 12px rgba(231,76,60,0.35)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  {actionBusy ? "جاري الإعادة..." : "إعادة العقد للمرحلة الأولى"}
                </button>
                {err && (
                  <div style={{ fontSize: "0.72rem", color: "#e74c3c", display: "flex", alignItems: "center", gap: 4 }}>
                    ⚠ {err}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* File input row */}
          {needsFile && canAct && !notesExpanded && (
            <div style={{ padding: "10px 20px 0" }}>
              <input
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder={contract.currentStage === 6 ? "اسم ملف Word (عقد.docx)" : "اسم الملف الموقع (عقد_موقع.pdf)"}
                style={{
                  width: "100%", padding: "9px 13px", borderRadius: 10,
                  border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif", outline: "none",
                  boxSizing: "border-box", background: "rgba(255,255,255,0.9)",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.currentTarget.style.borderColor = GOLD}
                onBlur={e => e.currentTarget.style.borderColor = GOLD_BORDER}
              />
            </div>
          )}

          {/* Main action buttons */}
          <div style={{ padding: "13px 20px", display: "flex", gap: 10, alignItems: "center" }}>
            {canAct ? (
              <>
                <button
                  onClick={() => doAction("advance")}
                  disabled={actionBusy || (needsFile && !filename.trim())}
                  style={{
                    flex: 1, padding: "13px 20px", borderRadius: 12,
                    background: actionBusy
                      ? "#ccc"
                      : "linear-gradient(135deg, #2ecc71, #27ae60)",
                    color: "#fff", border: "none",
                    cursor: actionBusy || (needsFile && !filename.trim()) ? "not-allowed" : "pointer",
                    fontSize: "0.9rem", fontWeight: 800,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    boxShadow: actionBusy ? "none" : "0 5px 18px rgba(39,174,96,0.38)",
                    transition: "all 0.2s",
                    letterSpacing: "0.01em",
                  }}
                >
                  {actionBusy
                    ? "⏳ جاري المعالجة..."
                    : contract.currentStage < 11
                      ? `✅ قبول واعتماد — الانتقال للمرحلة ${contract.currentStage + 1}`
                      : "✅ قبول واعتماد الختم والإنهاء"}
                </button>

                <button
                  onClick={() => { setNotesExpanded(v => !v); setErr(""); }}
                  disabled={actionBusy}
                  style={{
                    padding: "13px 18px", borderRadius: 12,
                    background: notesExpanded
                      ? "rgba(231,76,60,0.1)"
                      : "rgba(255,255,255,0.85)",
                    backdropFilter: BLUR_SM,
                    color: notesExpanded ? "#c0392b" : "#64748B",
                    border: `1.5px solid ${notesExpanded ? "rgba(231,76,60,0.35)" : GLASS_BORDER}`,
                    cursor: actionBusy ? "not-allowed" : "pointer",
                    fontSize: "0.82rem", fontWeight: 800,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    transition: "all 0.22s", whiteSpace: "nowrap",
                    boxShadow: SHADOW_SM,
                  }}
                >
                  {notesExpanded ? "إلغاء" : "إضافة ملاحظات / إعادة"}
                </button>
              </>
            ) : (
              <div style={{
                flex: 1, padding: "13px 18px", borderRadius: 12,
                background: "rgba(255,255,255,0.6)", backdropFilter: BLUR_SM,
                border: `1.5px dashed rgba(0,0,0,0.1)`,
                textAlign: "center", fontSize: "0.78rem", color: "#bbb",
              }}>
                المرحلة الحالية (<strong style={{ color: BLUE_M }}>{stage?.label}</strong>) مخصصة لدور{" "}
                <strong style={{ color: BLUE }}>{STAGE_ALLOWED[contract.currentStage]?.join(" / ")}</strong>
              </div>
            )}
          </div>

          {success && (
            <div style={{
              margin: "0 20px 13px",
              background: "rgba(39,174,96,0.09)", backdropFilter: BLUR_SM,
              borderRadius: 10, padding: "10px 16px",
              color: "#27ae60", fontSize: "0.78rem", fontWeight: 700,
              border: "1px solid rgba(39,174,96,0.2)",
              boxShadow: "0 2px 10px rgba(39,174,96,0.1)",
            }}>
              {success}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
