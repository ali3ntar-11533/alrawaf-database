import { useEffect, useRef, useState } from "react";
import { GOLD, GOLD_BG, GOLD_BORDER, STAGES } from "./types";
import type { Contract, ContractComment, StageLog } from "./types";
import { getContract, getContractAudit, advanceStage, getContractComments, addContractComment } from "./api";
import WorkflowWaterfall from "./WorkflowWaterfall";
import { tafqit } from "./tafqit";

const PRINT_STYLE_ID = "print-contract-detail-style";

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

function Field({ label, value, wide }: { label: string; value: string | null | undefined; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? "span 2" : undefined }}>
      <div style={{ fontSize: "0.6rem", color: "#b0a08a", marginBottom: 4, letterSpacing: "0.03em", fontWeight: 700, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{
        fontSize: "0.84rem", fontWeight: 600, color: value ? "#1a1206" : "#ccc",
        background: "rgba(0,0,0,0.025)", borderRadius: 8, padding: "8px 12px",
        border: "1px solid rgba(0,0,0,0.06)", minHeight: 36, display: "flex", alignItems: "center",
        wordBreak: "break-all",
      }}>
        {value || "—"}
      </div>
    </div>
  );
}

function ChatPanel({ contractId, actorName, actorRole }: { contractId: number; actorName: string; actorRole: string }) {
  const [comments, setComments] = useState<ContractComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const canSend = !!actorName.trim() && !!msg.trim() && !sending;

  async function loadComments() {
    try {
      const data = await getContractComments(contractId);
      setComments(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadComments(); }, [contractId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments]);

  async function handleSend() {
    if (!canSend) return;
    if (!actorName.trim()) { setSendErr("اختر دورك من القائمة الجانبية أولاً"); return; }
    setSending(true); setSendErr("");
    try {
      const created = await addContractComment(contractId, { actorName, actorRole, message: msg.trim() });
      setComments(prev => [...prev, created]);
      setMsg("");
    } catch (e: unknown) {
      setSendErr(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div style={{
      width: 290, flexShrink: 0, display: "flex", flexDirection: "column",
      background: "#fff", borderLeft: "1px solid rgba(0,0,0,0.07)",
      height: "100%", overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 16px 10px", borderBottom: `1.5px solid ${GOLD_BORDER}`,
        background: GOLD_BG, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem",
          }}>💬</div>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#4a3520" }}>المحادثة الداخلية</div>
            <div style={{ fontSize: "0.6rem", color: "#9b8060" }}>{comments.length} رسالة</div>
          </div>
          <button onClick={loadComments} title="تحديث" style={{
            marginRight: "auto", border: "none", background: "transparent",
            cursor: "pointer", color: GOLD, fontSize: "0.8rem", padding: 4,
          }}>↻</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#bbb", fontSize: "0.75rem", paddingTop: 20 }}>جاري التحميل…</div>
        ) : comments.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#ccc", textAlign: "center", gap: 8 }}>
            <div style={{ fontSize: "2rem" }}>💬</div>
            <div style={{ fontSize: "0.72rem" }}>لا توجد رسائل بعد<br />ابدأ المحادثة!</div>
          </div>
        ) : (
          comments.map(c => {
            const isMe = c.actorName === actorName;
            const color = ROLE_COLORS[c.actorRole] ?? GOLD;
            const initials = getInitials(c.actorName);
            const timeStr = new Date(c.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
            const dateStr = new Date(c.createdAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
            return (
              <div key={c.id} style={{ display: "flex", gap: 7, flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: color, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.58rem", color: "#fff", fontWeight: 900,
                }}>{initials}</div>
                <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: 2, alignItems: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{ fontSize: "0.58rem", color: "#bbb", display: "flex", gap: 4 }}>
                    <span style={{ fontWeight: 700, color: "#9b8060" }}>{c.actorName}</span>
                    <span>·</span>
                    <span>{c.actorRole}</span>
                  </div>
                  <div style={{
                    background: isMe ? `linear-gradient(135deg, ${GOLD}, #a88540)` : "rgba(0,0,0,0.04)",
                    color: isMe ? "#fff" : "#2d2416",
                    borderRadius: isMe ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    padding: "8px 11px", fontSize: "0.76rem", lineHeight: 1.5,
                    border: isMe ? "none" : "1px solid rgba(0,0,0,0.07)",
                  }}>{c.message}</div>
                  <div style={{ fontSize: "0.55rem", color: "#ccc" }}>{dateStr} · {timeStr}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "10px", borderTop: `1.5px solid ${GOLD_BORDER}`, background: "#fafafa", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <textarea
            value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={handleKey}
            placeholder="اكتب رسالتك…" rows={2}
            style={{
              flex: 1, padding: "8px 10px", borderRadius: 10,
              border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.76rem",
              fontFamily: "'Cairo', 'Tajawal', sans-serif", resize: "none", outline: "none", lineHeight: 1.5,
            }}
          />
          <button onClick={handleSend} disabled={!canSend} style={{
            width: 36, height: 36, borderRadius: "50%", border: "none", flexShrink: 0,
            background: canSend ? `linear-gradient(135deg, ${GOLD}, #a88540)` : "#ddd",
            color: "#fff", cursor: canSend ? "pointer" : "not-allowed",
            fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: canSend ? `0 3px 10px rgba(197,160,89,0.4)` : "none",
            transition: "all 0.2s",
          }}>➤</button>
        </div>
        {sendErr && <div style={{ fontSize: "0.62rem", color: "#e74c3c", marginTop: 4 }}>⚠ {sendErr}</div>}
        {!actorName.trim() && !sendErr && (
          <div style={{ fontSize: "0.58rem", color: "#ccc", marginTop: 4, textAlign: "center" }}>اختر دورك للمشاركة</div>
        )}
        {actorName.trim() && !sendErr && (
          <div style={{ fontSize: "0.58rem", color: "#ccc", marginTop: 4, textAlign: "center" }}>Enter للإرسال · Shift+Enter سطر جديد</div>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: "project",     label: "بيانات المشروع",   icon: "📋" },
  { id: "party2",      label: "الطرف الثاني",      icon: "🏢" },
  { id: "attachments", label: "المرفقات الذكية",   icon: "📎" },
  { id: "log",         label: "سجل الإجراءات",     icon: "📅" },
] as const;
type TabId = typeof TABS[number]["id"];

const SMART_DOCS = [
  { icon: "📜", label: "السجل التجاري",         hint: "Commercial Registration" },
  { icon: "🧾", label: "شهادة الزكاة والضريبة", hint: "VAT & Zakat Certificate" },
  { icon: "📝", label: "خطاب التفويض",           hint: "Delegation Letter" },
  { icon: "📑", label: "عقد التأسيس",            hint: "Articles of Association" },
  { icon: "📁", label: "الملف التعريفي",          hint: "Company Profile" },
  { icon: "📊", label: "جداول الكميات",          hint: "Bill of Quantities" },
  { icon: "🗂️",label: "جداول الكميات (Excel)",   hint: "BoQ — Excel Format" },
  { icon: "✒️", label: "نسخة العقد الموقعة",     hint: "Signed Contract Copy" },
];

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
  const [activeTab, setActiveTab] = useState<TabId>("project");

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
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    `;
    document.head.appendChild(style);
    const originalTitle = document.title;
    document.title = `عقد — ${contract.contractNo} — ${contract.title}`;
    let cleaned = false;
    function cleanup() {
      if (cleaned) return; cleaned = true;
      document.title = originalTitle;
      const s = document.getElementById(PRINT_STYLE_ID);
      if (s) s.remove();
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
      const newLog = await getContractAudit(contractId);
      setLog(newLog);
      setRejectModal(false);
      setNotes(""); setFilename(""); setRejectReason("");
      setSuccess(action === "advance" ? "✅ تم الاعتماد والانتقال للمرحلة التالية" : "↩ تم إرجاع العقد للمرحلة الأولى");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#bbb" }}>
      جاري التحميل...
    </div>
  );
  if (!contract) return (
    <div style={{ padding: 32, color: "#e74c3c" }}>لم يُعثر على العقد</div>
  );

  const canAct = STAGE_ALLOWED[contract.currentStage]?.includes(role);
  const isCompleted = contract.status === "completed";
  const pct = isCompleted ? 100 : Math.round(((contract.currentStage - 1) / 11) * 100);
  const stage = STAGES[contract.currentStage - 1];
  const needsFile = contract.currentStage === 6 || contract.currentStage === 10;
  const isExecutive = [7, 8, 9].includes(contract.currentStage);

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Workflow waterfall */}
      <div className="no-print">
        <WorkflowWaterfall currentStage={isCompleted ? 12 : contract.currentStage} />
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Chat panel */}
        <div className="no-print">
          <ChatPanel contractId={contractId} actorName={actorName} actorRole={role} />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Top bar */}
          <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <button onClick={onBack} style={{
              border: "none", background: "none", cursor: "pointer",
              color: GOLD, fontSize: "0.82rem", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
            }}>
              → رجوع للقائمة
            </button>
            <button onClick={handlePrint} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 18px", borderRadius: 10,
              background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
              color: "#fff", border: "none", cursor: "pointer",
              fontSize: "0.82rem", fontWeight: 800,
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              boxShadow: `0 3px 12px rgba(197,160,89,0.35)`,
            }}>
              🖨️ طباعة / تصدير PDF
            </button>
          </div>

          {/* Contract header card */}
          <div style={{
            background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 16,
            border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: isCompleted ? "rgba(39,174,96,0.1)" : GOLD_BG,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem",
                border: `1.5px solid ${isCompleted ? "rgba(39,174,96,0.3)" : GOLD_BORDER}`,
              }}>
                {isCompleted ? "✅" : stage?.icon ?? "📄"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "1rem", fontWeight: 900, color: "#1a1206", marginBottom: 3, lineHeight: 1.4 }}>
                  {contract.title}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#9b8060" }}>
                  {contract.contractNo}
                  {contract.projectNo && <span> · مشروع رقم {contract.projectNo}</span>}
                  {" · "}{contract.contractType}
                </div>
                {contract.value > 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#8B6914", fontWeight: 700, marginTop: 3 }}>
                    💰 {contract.value.toLocaleString("ar-SA")} ريال
                  </div>
                )}
              </div>
              <div style={{
                textAlign: "center", background: isCompleted ? "rgba(39,174,96,0.08)" : GOLD_BG,
                border: `1.5px solid ${isCompleted ? "rgba(39,174,96,0.3)" : GOLD_BORDER}`,
                borderRadius: 12, padding: "8px 16px", flexShrink: 0,
              }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: isCompleted ? "#27ae60" : GOLD }}>{pct}%</div>
                <div style={{ fontSize: "0.58rem", color: "#9b8060" }}>إنجاز</div>
              </div>
            </div>
            <div style={{ marginTop: 12, height: 7, borderRadius: 4, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`, borderRadius: 4,
                background: isCompleted ? "#27ae60" : `linear-gradient(90deg, ${GOLD}, #a88540)`,
                transition: "width 0.6s",
              }} />
            </div>
          </div>

          {/* ── TAB BAR ── */}
          <div className="no-print" style={{
            display: "flex", borderRadius: 12, overflow: "hidden",
            border: `1.5px solid ${GOLD_BORDER}`, marginBottom: 16,
            background: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          }}>
            {TABS.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1, padding: "11px 8px",
                    border: "none",
                    borderLeft: idx < TABS.length - 1 ? `1px solid ${GOLD_BORDER}` : "none",
                    background: isActive ? `linear-gradient(135deg, ${GOLD}, #a88540)` : "transparent",
                    color: isActive ? "#fff" : "#9b8060",
                    cursor: "pointer", fontSize: "0.78rem", fontWeight: isActive ? 800 : 600,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    transition: "all 0.18s",
                  }}
                >
                  <span style={{ fontSize: "0.9rem" }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── TAB: بيانات المشروع ── */}
          {activeTab === "project" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{
                background: "#fff", borderRadius: 16, padding: "20px 22px",
                border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#4a3520", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    width: 4, height: 16, background: GOLD, borderRadius: 2, display: "inline-block",
                  }} />
                  تفاصيل المشروع
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  <Field label="اسم المشروع"      value={contract.projectName} wide />
                  <Field label="رقم المشروع"       value={contract.projectNo} />
                  <Field label="نوع العقد"          value={contract.contractType} />
                  <Field label="نوع الأعمال"        value={contract.workType} wide />
                  <Field label="قيمة العقد (ريال)"  value={contract.value > 0 ? contract.value.toLocaleString("ar-SA") : null} />
                  <Field label="مدة العقد"          value={contract.contractDuration} />
                  <Field label="تاريخ البدء"        value={contract.startDate} />
                  <Field label="تاريخ الانتهاء"     value={contract.endDate} />
                  <Field label="أُنشئ بواسطة"       value={contract.createdBy} />
                  <Field label="تحليل السعر"        value={contract.priceAnalysisStatus} />
                </div>

                {contract.value > 0 && (
                  <div style={{
                    marginTop: 14, background: GOLD_BG, borderRadius: 10, padding: "11px 14px",
                    border: `1px solid ${GOLD_BORDER}`, fontSize: "0.74rem", color: "#8B6914", lineHeight: 1.7,
                  }}>
                    📝 <strong>التفقيط:</strong> {tafqit(contract.value)}
                  </div>
                )}

                {contract.rejectionReason && !isCompleted && (
                  <div style={{
                    marginTop: 14, background: "rgba(231,76,60,0.06)", borderRadius: 10, padding: "12px 14px",
                    border: "1px solid rgba(231,76,60,0.2)", fontSize: "0.78rem", color: "#e74c3c",
                  }}>
                    ↩ <strong>سبب الإعادة للمرحلة 1:</strong> {contract.rejectionReason}
                  </div>
                )}
              </div>

              {/* Action panel */}
              {!isCompleted && canAct && (
                <div style={{
                  background: "#fff", borderRadius: 16, padding: "20px 22px",
                  border: `1.5px solid ${GOLD_BORDER}`,
                  boxShadow: `0 2px 12px rgba(197,160,89,0.12)`,
                }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#4a3520", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 4, height: 16, background: GOLD, borderRadius: 2, display: "inline-block" }} />
                    اتخاذ إجراء — المرحلة {contract.currentStage}: {stage?.label}
                  </div>

                  {!isExecutive && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", display: "block", marginBottom: 6 }}>
                        ملاحظات الاعتماد
                      </label>
                      <textarea
                        value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="ملاحظات اختيارية..."
                        rows={2}
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
                        {contract.currentStage === 6 ? "اسم ملف Word" : "اسم الملف الموقع"} *
                      </label>
                      <input
                        value={filename} onChange={e => setFilename(e.target.value)}
                        placeholder={contract.currentStage === 6 ? "عقد_الجودة_الشاملة.docx" : "عقد_موقع.pdf"}
                        style={{
                          width: "100%", padding: "8px 12px", borderRadius: 9,
                          border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
                          fontFamily: "'Cairo', 'Tajawal', sans-serif",
                          outline: "none", boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
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
                        transition: "all 0.2s",
                      }}
                    >
                      {actionBusy ? "جاري المعالجة..." : (contract.currentStage < 11 ? `✅ اعتماد والانتقال للمرحلة ${contract.currentStage + 1}` : "✅ اعتماد الختم والإنهاء")}
                    </button>
                    <button
                      onClick={() => setRejectModal(true)}
                      disabled={actionBusy}
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

                  {isCompleted && (
                    <div style={{
                      background: "rgba(39,174,96,0.08)", borderRadius: 10, padding: "14px",
                      textAlign: "center", fontSize: "0.85rem", color: "#27ae60", fontWeight: 700,
                      border: "1.5px solid rgba(39,174,96,0.25)", marginTop: 10,
                    }}>
                      ✅ العقد مكتمل ومُوقَّع — {contract.contractNo}
                      {contract.signedFilename && <div style={{ fontSize: "0.72rem", marginTop: 4, opacity: 0.8 }}>📜 {contract.signedFilename}</div>}
                    </div>
                  )}

                  {err && (
                    <div style={{ marginTop: 12, background: "rgba(231,76,60,0.08)", borderRadius: 9, padding: "10px 14px", color: "#e74c3c", fontSize: "0.78rem" }}>
                      ⚠ {err}
                    </div>
                  )}
                  {success && (
                    <div style={{ marginTop: 12, background: "rgba(39,174,96,0.08)", borderRadius: 9, padding: "10px 14px", color: "#27ae60", fontSize: "0.78rem" }}>
                      {success}
                    </div>
                  )}
                </div>
              )}

              {isCompleted && (
                <div style={{
                  background: "rgba(39,174,96,0.07)", borderRadius: 16, padding: "18px 22px",
                  border: "1.5px solid rgba(39,174,96,0.25)", textAlign: "center",
                  fontSize: "0.92rem", color: "#27ae60", fontWeight: 800,
                }}>
                  🏆 العقد مكتمل ومُوقَّع — {contract.contractNo}
                  {contract.signedFilename && <div style={{ fontSize: "0.78rem", marginTop: 6, opacity: 0.8 }}>📜 {contract.signedFilename}</div>}
                </div>
              )}

              {!isCompleted && !canAct && (
                <div style={{
                  background: "rgba(0,0,0,0.03)", borderRadius: 14, padding: "16px 18px",
                  border: "1.5px dashed rgba(0,0,0,0.1)", textAlign: "center",
                  fontSize: "0.8rem", color: "#bbb",
                }}>
                  المرحلة الحالية ({stage?.label}) مخصصة لدور <strong style={{ color: "#9b8060" }}>{STAGE_ALLOWED[contract.currentStage]?.join(" / ")}</strong>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: الطرف الثاني ── */}
          {activeTab === "party2" && (
            <div style={{
              background: "#fff", borderRadius: 16, padding: "20px 22px",
              border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#4a3520", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 4, height: 16, background: GOLD, borderRadius: 2, display: "inline-block" }} />
                بيانات الطرف الثاني (المورد / المقاول)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <Field label="اسم الشركة / المورد"  value={contract.vendorName} wide />
                <Field label="رقم التواصل"           value={contract.vendorContact} />
                <Field label="البريد الإلكتروني"     value={contract.vendorEmail} />
                <Field label="رقم الآيبان (IBAN)"   value={contract.vendorIban} wide />
                <Field label="الرقم الضريبي"         value={contract.vendorTaxNo} />
                <Field label="انتهاء السجل التجاري"  value={contract.vendorRegExpiry} />
                <Field label="اسم المفوض"            value={contract.vendorDelegate} />
                <Field label="صفة المفوض"            value={contract.vendorDelegateTitle} />
                <Field label="رقم هوية المفوض"       value={contract.vendorDelegateId} />
                <Field label="العنوان"               value={contract.vendorAddress} wide />
              </div>
            </div>
          )}

          {/* ── TAB: المرفقات الذكية ── */}
          {activeTab === "attachments" && (
            <div style={{
              background: "#fff", borderRadius: 16, padding: "20px 22px",
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
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#4a3520", marginBottom: 10 }}>المرفقات المرفوعة</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {contract.wordFilename && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: "rgba(39,174,96,0.05)", borderRadius: 10, padding: "10px 14px",
                        border: "1px solid rgba(39,174,96,0.2)",
                      }}>
                        <span style={{ fontSize: "1.2rem" }}>📄</span>
                        <div>
                          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#1a1206" }}>نسخة Word</div>
                          <div style={{ fontSize: "0.65rem", color: "#9b8060" }}>{contract.wordFilename}</div>
                        </div>
                        <div style={{ marginRight: "auto", fontSize: "0.6rem", color: "#27ae60", fontWeight: 700, background: "rgba(39,174,96,0.1)", padding: "3px 8px", borderRadius: 20 }}>مرفوع ✓</div>
                      </div>
                    )}
                    {contract.signedFilename && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: "rgba(197,160,89,0.06)", borderRadius: 10, padding: "10px 14px",
                        border: `1px solid ${GOLD_BORDER}`,
                      }}>
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
              background: "#fff", borderRadius: 16, padding: "20px 22px",
              border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#4a3520", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 4, height: 16, background: GOLD, borderRadius: 2, display: "inline-block" }} />
                سجل الإجراءات والعمليات
              </div>

              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", right: 15, top: 0, bottom: 0, width: 2, background: "rgba(197,160,89,0.2)" }} />

                {log.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "#bbb", fontSize: "0.82rem" }}>
                    لا يوجد سجلات بعد
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {log.map((entry) => (
                      <div key={entry.id} style={{ display: "flex", gap: 16, alignItems: "flex-start", paddingRight: 36 }}>
                        <div style={{
                          position: "absolute", right: 6, width: 20, height: 20, borderRadius: "50%",
                          background: entry.action === "reject" ? "#e74c3c" : GOLD,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.58rem", color: "#fff", fontWeight: 900, zIndex: 1, flexShrink: 0,
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
                            <div style={{ fontSize: "0.7rem", color: "#6b5c3e", marginTop: 3 }}>
                              💬 {entry.notes}
                            </div>
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

        </div>
      </div>

      {/* Reject modal — no popup style, inline modal */}
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
            <p style={{ fontSize: "0.78rem", color: "#9b8060", marginBottom: 20 }}>
              سيعود العقد للمرحلة الأولى. يُرجى تحديد سبب الإرجاع.
            </p>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", marginBottom: 6 }}>
              سبب الإرجاع *
            </label>
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
