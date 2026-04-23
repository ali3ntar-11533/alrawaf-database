import { useEffect, useState } from "react";
import { GOLD, GOLD_BG, GOLD_BORDER, STAGES } from "./types";
import type { Contract, StageLog } from "./types";
import { getContract, getContractAudit, advanceStage } from "./api";
import WorkflowWaterfall from "./WorkflowWaterfall";
import { tafqit } from "./tafqit";

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
      <WorkflowWaterfall currentStage={isCompleted ? 12 : contract.currentStage} />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
        <button
          onClick={onBack}
          style={{
            border: "none", background: "none", cursor: "pointer",
            color: GOLD, fontSize: "0.82rem", fontWeight: 700,
            marginBottom: 16, display: "flex", alignItems: "center", gap: 6,
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
          }}
        >
          → رجوع للقائمة
        </button>

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

        {!isCompleted && (
          <div style={{
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
                {log.map((entry, i) => (
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

      {rejectModal && (
        <div
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
