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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

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
      width: 300, flexShrink: 0, display: "flex", flexDirection: "column",
      background: "#fff", borderLeft: "1px solid rgba(0,0,0,0.07)",
      borderTop: "none", height: "100%", overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: `1.5px solid ${GOLD_BORDER}`,
        background: GOLD_BG,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.85rem",
          }}>💬</div>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#4a3520" }}>المحادثة الداخلية</div>
            <div style={{ fontSize: "0.6rem", color: "#9b8060" }}>{comments.length} رسالة</div>
          </div>
          <button
            onClick={loadComments}
            title="تحديث"
            style={{
              marginRight: "auto", border: "none", background: "transparent",
              cursor: "pointer", color: GOLD, fontSize: "0.8rem", padding: 4,
            }}
          >↻</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#bbb", fontSize: "0.75rem", paddingTop: 20 }}>جاري التحميل…</div>
        ) : comments.length === 0 ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", color: "#ccc", textAlign: "center", gap: 8,
          }}>
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
                    padding: "8px 11px",
                    fontSize: "0.76rem",
                    lineHeight: 1.5,
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

      <div style={{
        padding: "10px",
        borderTop: `1.5px solid ${GOLD_BORDER}`,
        background: "#fafafa",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={handleKey}
            placeholder="اكتب رسالتك…"
            rows={2}
            style={{
              flex: 1, padding: "8px 10px", borderRadius: 10,
              border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.76rem",
              fontFamily: "'Cairo', 'Tajawal', sans-serif", resize: "none",
              outline: "none", lineHeight: 1.5,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none", flexShrink: 0,
              background: canSend ? `linear-gradient(135deg, ${GOLD}, #a88540)` : "#ddd",
              color: "#fff", cursor: canSend ? "pointer" : "not-allowed",
              fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: canSend ? `0 3px 10px rgba(197,160,89,0.4)` : "none",
              transition: "all 0.2s",
            }}
          >➤</button>
        </div>
        {sendErr && (
          <div style={{ fontSize: "0.62rem", color: "#e74c3c", marginTop: 4 }}>⚠ {sendErr}</div>
        )}
        {!actorName.trim() && !sendErr && (
          <div style={{ fontSize: "0.58rem", color: "#ccc", marginTop: 4, textAlign: "center" }}>
            اختر دورك من القائمة الجانبية للمشاركة
          </div>
        )}
        {actorName.trim() && !sendErr && (
          <div style={{ fontSize: "0.58rem", color: "#ccc", marginTop: 4, textAlign: "center" }}>
            Enter للإرسال · Shift+Enter لسطر جديد
          </div>
        )}
      </div>
    </div>
  );
}

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

  function handlePrint() {
    if (!contract) return;
    const existingStyle = document.getElementById(PRINT_STYLE_ID);
    if (existingStyle) existingStyle.remove();

    const style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    style.textContent = `
      @media print {
        .no-print { display: none !important; }
        .contract-app-wrapper {
          position: static !important;
          display: block !important;
          height: auto !important;
          overflow: visible !important;
        }
        .contract-main-content {
          overflow: visible !important;
          height: auto !important;
        }
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    `;
    document.head.appendChild(style);

    const originalTitle = document.title;
    document.title = `عقد — ${contract.contractNo} — ${contract.title}`;

    let cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
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
      if (filename && (contract.currentStage === 6)) payload.wordFilename = filename;
      if (filename && (contract.currentStage === 10)) payload.signedFilename = filename;

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
      <div className="no-print">
        <WorkflowWaterfall currentStage={isCompleted ? 12 : contract.currentStage} />
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div className="no-print">
          <ChatPanel contractId={contractId} actorName={actorName} actorRole={role} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button
              onClick={onBack}
              style={{
                border: "none", background: "none", cursor: "pointer",
                color: GOLD, fontSize: "0.82rem", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
              }}
            >
              → رجوع للقائمة
            </button>
            <button
              onClick={handlePrint}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 18px", borderRadius: 10,
                background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
                color: "#fff", border: "none", cursor: "pointer",
                fontSize: "0.82rem", fontWeight: 800,
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                boxShadow: `0 3px 12px rgba(197,160,89,0.35)`,
                transition: "opacity 0.2s",
              }}
              title="طباعة أو تصدير كـ PDF"
            >
              🖨️ طباعة / تصدير PDF
            </button>
          </div>

          <div style={{
            background: "#fff", borderRadius: 16, padding: "22px 24px", marginBottom: 20,
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
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1a1206", marginBottom: 4 }}>{contract.title}</div>
                <div style={{ fontSize: "0.72rem", color: "#9b8060" }}>
                  {contract.contractNo} · {contract.vendorName} · {contract.contractType}
                </div>
                {contract.value > 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#8B6914", fontWeight: 700, marginTop: 4 }}>
                    💰 {contract.value.toLocaleString("ar-SA")} ريال
                  </div>
                )}
              </div>
              <div style={{
                textAlign: "center", background: isCompleted ? "rgba(39,174,96,0.08)" : GOLD_BG,
                border: `1.5px solid ${isCompleted ? "rgba(39,174,96,0.3)" : GOLD_BORDER}`,
                borderRadius: 12, padding: "8px 16px",
              }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: isCompleted ? "#27ae60" : GOLD }}>{pct}%</div>
                <div style={{ fontSize: "0.58rem", color: "#9b8060" }}>إنجاز</div>
              </div>
            </div>

            <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`, borderRadius: 4,
                background: isCompleted ? "#27ae60" : `linear-gradient(90deg, ${GOLD}, #a88540)`,
                transition: "width 0.6s",
              }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
              {[
                { label: "اسم المورد",    value: contract.vendorName },
                { label: "بيانات التواصل", value: contract.vendorContact || "—" },
                { label: "المشروع",       value: contract.projectName || "—" },
                { label: "تاريخ البدء",   value: contract.startDate || "—" },
                { label: "تاريخ الانتهاء",value: contract.endDate || "—" },
                { label: "أُنشئ بواسطة", value: contract.createdBy },
              ].map((info, i) => (
                <div key={i}>
                  <div style={{ fontSize: "0.62rem", color: "#bbb", marginBottom: 2 }}>{info.label}</div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1a1206" }}>{info.value}</div>
                </div>
              ))}
            </div>

            {contract.value > 0 && (
              <div style={{
                marginTop: 14, background: GOLD_BG, borderRadius: 10, padding: "10px 14px",
                border: `1px solid ${GOLD_BORDER}`, fontSize: "0.72rem", color: "#8B6914", lineHeight: 1.7,
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

          <div style={{
            background: "#fff", borderRadius: 16, padding: "18px 24px", marginBottom: 20,
            border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#4a3520", marginBottom: 14 }}>
              📋 المرحلة الحالية والمستندات
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: isCompleted ? "rgba(39,174,96,0.1)" : GOLD_BG,
                border: `1.5px solid ${isCompleted ? "rgba(39,174,96,0.3)" : GOLD_BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
              }}>
                {isCompleted ? "✅" : stage?.icon ?? "📄"}
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1a1206" }}>
                  {isCompleted ? "مكتمل — جميع المراحل اجتازت بنجاح" : `المرحلة ${contract.currentStage}: ${stage?.label}`}
                </div>
                {!isCompleted && (
                  <div style={{ fontSize: "0.68rem", color: "#9b8060", marginTop: 2 }}>
                    المسؤول: {stage?.role}
                  </div>
                )}
              </div>
            </div>

            {(contract.wordFilename || contract.signedFilename) ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {contract.wordFilename && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: GOLD_BG, borderRadius: 8, padding: "8px 12px",
                    border: `1px solid ${GOLD_BORDER}`, fontSize: "0.76rem", color: "#8B6914",
                  }}>
                    <span>📄</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.68rem", color: "#9b8060" }}>مسودة العقد (Word)</div>
                      <div>{contract.wordFilename}</div>
                    </div>
                  </div>
                )}
                {contract.signedFilename && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "rgba(39,174,96,0.06)", borderRadius: 8, padding: "8px 12px",
                    border: "1px solid rgba(39,174,96,0.2)", fontSize: "0.76rem", color: "#27ae60",
                  }}>
                    <span>📜</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.68rem", color: "#9b8060" }}>النسخة الموقّعة (PDF)</div>
                      <div>{contract.signedFilename}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "0.72rem", color: "#ccc", fontStyle: "italic" }}>
                لا توجد مستندات مرفقة حتى الآن
              </div>
            )}
          </div>

          {!isCompleted && (
            <div className="no-print" style={{
              background: "#fff", borderRadius: 16, padding: "22px 24px", marginBottom: 20,
              border: canAct ? `2px solid ${GOLD}` : "1px solid rgba(0,0,0,0.07)",
              boxShadow: canAct ? `0 0 0 4px rgba(197,160,89,0.1)` : "0 2px 10px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                  background: canAct ? GOLD_BG : "rgba(0,0,0,0.06)",
                  border: `2px solid ${canAct ? GOLD : "rgba(0,0,0,0.1)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1rem",
                }}>{stage?.icon ?? "📄"}</div>
                <div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#1a1206" }}>
                    المرحلة {contract.currentStage}: {stage?.label}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#9b8060" }}>
                    المسؤول: {stage?.role} {canAct ? "· أنت مخوّل للتصرف" : "· دورك لا يتطابق مع هذه المرحلة"}
                  </div>
                </div>
              </div>

              {isExecutive && (
                <div style={{
                  background: "linear-gradient(135deg, rgba(197,160,89,0.12), rgba(197,160,89,0.04))",
                  border: `1.5px solid ${GOLD_BORDER}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16,
                }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#8B6914", marginBottom: 10 }}>
                    🏆 ملخص العقد للاعتماد العلوي
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "العقد", value: contract.contractNo },
                      { label: "المورد", value: contract.vendorName },
                      { label: "القيمة", value: contract.value > 0 ? contract.value.toLocaleString("ar-SA") + " ر.س" : "—" },
                      { label: "النوع", value: contract.contractType },
                    ].map((item, i) => (
                      <div key={i} style={{ fontSize: "0.75rem" }}>
                        <span style={{ color: "#bbb" }}>{item.label}: </span>
                        <span style={{ fontWeight: 700, color: "#1a1206" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  {contract.wordFilename && (
                    <div style={{ marginTop: 8, fontSize: "0.72rem", color: "#8B6914" }}>
                      📄 المسودة: {contract.wordFilename}
                    </div>
                  )}
                </div>
              )}

              {(contract.currentStage === 1 || contract.currentStage === 5) && canAct && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", marginBottom: 5 }}>
                    ملاحظات {contract.currentStage === 1 ? "(اختياري)" : ""}
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="أضف ملاحظاتك..."
                    rows={2}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 9,
                      border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
                      fontFamily: "'Cairo', 'Tajawal', sans-serif", resize: "vertical",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              {needsFile && canAct && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", marginBottom: 5 }}>
                    {contract.currentStage === 6 ? "📄 اسم ملف العقد Word" : "📜 اسم ملف النسخة الموقعة PDF"}
                  </label>
                  <input
                    value={filename}
                    onChange={e => setFilename(e.target.value)}
                    placeholder={contract.currentStage === 6 ? "contract_draft.docx" : "signed_contract.pdf"}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 9,
                      border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.82rem",
                      fontFamily: "'Cairo', 'Tajawal', sans-serif", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              {canAct && !isCompleted && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => doAction("advance")}
                    disabled={actionBusy}
                    style={{
                      flex: 1, padding: "12px 20px", borderRadius: 11, border: "none",
                      background: actionBusy ? "#ccc" : `linear-gradient(135deg, ${GOLD}, #a88540)`,
                      color: "#fff", cursor: actionBusy ? "not-allowed" : "pointer",
                      fontSize: "0.88rem", fontWeight: 800,
                      fontFamily: "'Cairo', 'Tajawal', sans-serif",
                      boxShadow: actionBusy ? "none" : `0 4px 14px rgba(197,160,89,0.4)`,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {contract.currentStage === 9 ? "👑 الختم الذهبي — اعتماد نهائي" :
                     contract.currentStage === 11 ? "🏦 أرشفة وإغلاق العقد" :
                     "✅ اعتماد والانتقال للمرحلة التالية"}
                  </button>
                  {contract.currentStage !== 11 && (
                    <button
                      onClick={() => { setRejectModal(true); setRejectReason(""); }}
                      disabled={actionBusy}
                      style={{
                        padding: "12px 20px", borderRadius: 11,
                        border: "1.5px solid rgba(231,76,60,0.35)",
                        background: "rgba(231,76,60,0.06)", color: "#e74c3c",
                        cursor: actionBusy ? "not-allowed" : "pointer",
                        fontSize: "0.88rem", fontWeight: 800,
                        fontFamily: "'Cairo', 'Tajawal', sans-serif",
                      }}
                    >
                      ↩ رفض وإعادة
                    </button>
                  )}
                </div>
              )}

              {!canAct && !isCompleted && (
                <div style={{
                  background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: "14px",
                  textAlign: "center", fontSize: "0.8rem", color: "#bbb",
                  border: "1px dashed rgba(0,0,0,0.1)",
                }}>
                  🔒 هذه المرحلة تتطلب دور "{stage?.role}" للتصرف
                </div>
              )}

              {isCompleted && (
                <div style={{
                  background: "rgba(39,174,96,0.08)", borderRadius: 10, padding: "14px",
                  textAlign: "center", fontSize: "0.85rem", color: "#27ae60", fontWeight: 700,
                  border: "1.5px solid rgba(39,174,96,0.25)",
                }}>
                  ✅ العقد مكتمل ومُوقَّع — الرقم: {contract.contractNo}
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

          <div style={{
            background: "#fff", borderRadius: 16, padding: "22px 24px",
            border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#4a3520", marginBottom: 16 }}>
              📅 الجدول الزمني وسجل العمليات
            </div>

            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", right: 15, top: 0, bottom: 0,
                width: 2, background: "rgba(197,160,89,0.2)",
              }} />

              {log.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#bbb", fontSize: "0.82rem" }}>
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
                        fontSize: "0.58rem", color: "#fff", fontWeight: 900,
                        zIndex: 1, flexShrink: 0,
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
                            color: entry.action === "reject" ? "#e74c3c" : "#27ae60",
                            fontWeight: 700,
                          }}>
                            {entry.action === "reject" ? "رُفض" : "اعتُمد"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#9b8060", marginTop: 2 }}>
                          {entry.actorName} ({entry.actorRole}) · {new Date(entry.createdAt).toLocaleString("ar-SA")}
                        </div>
                        {entry.notes && entry.notes !== `اعتماد المرحلة ${entry.stage}` && (
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
                      {isCompleted ? "🏆 " : "⚡ "}
                      {pct}% مكتمل
                    </div>
                    <div style={{ fontSize: "0.66rem", color: "#9b8060" }}>
                      {isCompleted ? "تم اكتمال جميع المراحل" : `المرحلة الحالية: ${stage?.label}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {rejectModal && (
        <div
          className="no-print"
          onClick={e => { if (e.target === e.currentTarget) setRejectModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div dir="rtl" style={{
            background: "#fff", borderRadius: 20, padding: "28px 26px",
            width: "100%", maxWidth: 420,
            boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
          }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "#e74c3c", marginBottom: 6 }}>
              ↩ رفض وإعادة العقد
            </h3>
            <p style={{ fontSize: "0.78rem", color: "#9b8060", marginBottom: 20 }}>
              سيعود العقد فوراً للمرحلة الأولى. يُرجى تحديد سبب الإرجاع.
            </p>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#4a3520", marginBottom: 6 }}>
              سبب الإرجاع *
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="اذكر السبب بالتفصيل..."
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 9,
                border: "1.5px solid rgba(231,76,60,0.35)", fontSize: "0.85rem",
                fontFamily: "'Cairo', 'Tajawal', sans-serif", resize: "vertical",
                outline: "none", boxSizing: "border-box", marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => doAction("reject")}
                disabled={!rejectReason.trim() || actionBusy}
                style={{
                  flex: 1, padding: "11px", borderRadius: 10,
                  background: rejectReason.trim() ? "rgba(231,76,60,0.9)" : "#ccc",
                  color: "#fff", border: "none",
                  cursor: rejectReason.trim() ? "pointer" : "not-allowed",
                  fontSize: "0.85rem", fontWeight: 800,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                }}
              >
                تأكيد الرفض
              </button>
              <button
                onClick={() => setRejectModal(false)}
                style={{
                  padding: "11px 20px", borderRadius: 10,
                  border: `1.5px solid ${GOLD_BORDER}`, background: "transparent",
                  cursor: "pointer", fontSize: "0.85rem", color: "#6b5c3e",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
