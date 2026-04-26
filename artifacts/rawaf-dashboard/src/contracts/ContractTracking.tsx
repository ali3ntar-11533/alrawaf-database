import { useEffect, useState } from "react";
import type { Contract } from "./types";
import { listContracts, deleteContract, createContract } from "./api";
import ContractMonitor from "./ContractMonitor";
import logoImg from "@assets/logo_1776506524686.jpg";

const BLUE_M  = "#1976D2";
const BLUE    = "#1565C0";
const BLUE_L  = "#4A90D9";
const AMBER   = "#F5A623";
const DARK    = "#0C1427";
const DARK2   = "#152040";
const GREEN   = "#22c55e";
const RED     = "#ef4444";
const AMBER_B = "rgba(245,166,35,0.18)";
const AMBER_R = "rgba(245,166,35,0.30)";
const BLUE_B  = "rgba(25,118,210,0.07)";
const BLUE_BR = "rgba(25,118,210,0.20)";

const TRACKING_ROLE = "مسؤول المتابعة";

interface Props {
  role: string;
  actorName: string;
  onOpenContract: (id: number) => void;
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function formatSAR(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م ر.س`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ألف ر.س`;
  return `${n} ر.س`;
}

const inputSt: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1.5px solid #E2E8F0", fontSize: "0.76rem",
  fontFamily: "'Cairo','Tajawal',sans-serif",
  background: "#FAFBFF", outline: "none",
  boxSizing: "border-box",
};

const labelSt: React.CSSProperties = {
  fontSize: "0.64rem", fontWeight: 700, color: "#555",
  display: "block", marginBottom: 4,
};

interface NewMonitorDraft {
  title: string;
  contractNo: string;
  vendorName: string;
  projectName: string;
  startDate: string;
  endDate: string;
  value: string;
}

const EMPTY_DRAFT: NewMonitorDraft = {
  title: "", contractNo: "", vendorName: "",
  projectName: "", startDate: "", endDate: "", value: "",
};


export default function ContractTracking({ role, actorName, onOpenContract }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading]     = useState(true);
  const [monitorContract, setMonitorContract] = useState<Contract | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [draft, setDraft] = useState<NewMonitorDraft>(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState("");
  const [saving, setSaving] = useState(false);

  const isManager = role === TRACKING_ROLE;

  function load() {
    setLoading(true);
    listContracts({ status: "completed" })
      .then(setContracts)
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await deleteContract(id);
      setContracts(prev => prev.filter(c => c.id !== id));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function handleSaveMonitor() {
    if (!draft.vendorName.trim()) { setDraftError("يرجى إدخال اسم الطرف الثاني (المقاول) على الأقل"); return; }
    setDraftError("");
    setSaving(true);
    try {
      const saved = await createContract({
        title: draft.title.trim(),
        vendorName: draft.vendorName.trim(),
        value: parseFloat(draft.value) || 0,
        startDate: draft.startDate || undefined,
        endDate: draft.endDate || undefined,
        projectName: draft.projectName || undefined,
        createdBy: actorName,
      });
      setContracts(prev => [saved, ...prev]);
      setShowNewForm(false);
      setDraft(EMPTY_DRAFT);
    } catch {
      setDraftError("حدث خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى");
    } finally {
      setSaving(false);
    }
  }

  /* ── Monitor detail view ─────────────────────────────────── */
  if (monitorContract) {
    return (
      <div dir="rtl" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", minHeight: "100%" }}>
        {/* Sticky header bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 24px",
          background: `linear-gradient(135deg, ${DARK} 0%, ${DARK2} 100%)`,
          borderBottom: `2px solid rgba(25,118,210,0.25)`,
          position: "sticky", top: 0, zIndex: 50,
          boxShadow: "0 4px 20px rgba(12,20,39,0.22)",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${BLUE_M},${BLUE_L},${AMBER})` }}/>

          <button
            onClick={() => setMonitorContract(null)}
            style={{
              padding: "7px 16px", borderRadius: 9,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#E8E8E8", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer",
              fontFamily: "'Cairo', 'Tajawal', sans-serif", transition: "background 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
          >رجوع للقائمة</button>

          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.12)" }}/>

          <div style={{ width: 34, height: 34, borderRadius: 9, overflow: "hidden", flexShrink: 0 }}>
            <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#F0F0F0" }}>
              {monitorContract.title}
            </div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
              {monitorContract.contractNo} · {monitorContract.vendorName}
            </div>
          </div>

          <div style={{
            fontSize: "0.6rem", fontWeight: 800, padding: "4px 12px", borderRadius: 20,
            background: "rgba(34,197,94,0.15)", color: GREEN, border: "1px solid rgba(34,197,94,0.3)",
          }}>مكتمل — قيد المتابعة</div>

          {isManager && (
            <div style={{ fontSize: "0.58rem", padding: "4px 10px", borderRadius: 8, background: AMBER_B, color: AMBER, border: `1px solid ${AMBER_R}`, fontWeight: 700 }}>
              صلاحيات التعديل مفعّلة
            </div>
          )}
        </div>

        <div style={{ padding: "20px 24px" }}>
          <ContractMonitor contract={monitorContract} role={role} />
        </div>
      </div>
    );
  }

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: 300, fontFamily: "'Cairo', 'Tajawal', sans-serif", color: "#999",
    }}>جاري التحميل...</div>
  );

  /* ── Main list ───────────────────────────────────────────── */
  return (
    <div dir="rtl" style={{
      minHeight: "100%", background: "#F0F2F8",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
    }}>
      {/* Page header */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK} 0%, ${DARK2} 100%)`,
        borderBottom: `2px solid rgba(25,118,210,0.22)`,
        padding: "14px 28px",
        position: "sticky", top: 0, zIndex: 50,
        boxShadow: "0 4px 24px rgba(12,20,39,0.28)",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${BLUE_M},${BLUE_L},${AMBER})` }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, overflow: "hidden", flexShrink: 0, boxShadow: `0 0 0 2px rgba(25,118,210,0.4)` }}>
            <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.5rem", fontWeight: 900, color: BLUE_L, letterSpacing: "0.12em", marginBottom: 3 }}>
              متابعة العقود · نظام إدارة العقود
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#F0F0F0" }}>
              لوحة متابعة التنفيذ
            </div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              العقود المكتملة جاهزة للمتابعة التنفيذية
              {isManager && ` · ${actorName || TRACKING_ROLE} — صلاحيات التعديل مفعّلة`}
            </div>
          </div>

          {/* Stats strip + New button */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* عقود نشطة chip */}
            <div style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "7px 14px", textAlign: "center", backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.38)", marginBottom: 2 }}>عقود نشطة</div>
              <div style={{ fontSize: "0.86rem", fontWeight: 900, color: "#86EFAC" }}>{contracts.length}</div>
            </div>

            {/* إنشاء متابعة جديدة — visible for مسؤول المتابعة only */}
            {isManager && (
              <button
                onClick={() => { setDraft(EMPTY_DRAFT); setDraftError(""); setShowNewForm(true); }}
                style={{
                  padding: "8px 16px", borderRadius: 10,
                  background: `linear-gradient(135deg, ${BLUE}, ${BLUE_M})`,
                  border: "none", color: "#fff",
                  fontSize: "0.72rem", fontWeight: 800,
                  cursor: "pointer", fontFamily: "'Cairo','Tajawal',sans-serif",
                  boxShadow: "0 2px 10px rgba(25,118,210,0.35)",
                  transition: "opacity 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              >+ إنشاء متابعة جديدة</button>
            )}
          </div>
        </div>
      </div>

      {/* ── New Monitor Form ─────────────────────────────── */}
      {showNewForm && (
        <div style={{
          margin: "20px 28px 0", background: "#fff", borderRadius: 16,
          border: `1.5px solid ${BLUE_BR}`,
          boxShadow: "0 4px 24px rgba(25,118,210,0.10)",
          overflow: "hidden",
        }}>
          {/* Form header */}
          <div style={{
            background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_M} 100%)`,
            padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fff" }}>إنشاء متابعة جديدة</div>
              <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                أدخل بيانات العقد لفتح لوحة المتابعة التنفيذية
              </div>
            </div>
            <button
              onClick={() => setShowNewForm(false)}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "#fff", width: 28, height: 28, cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}
            >✕</button>
          </div>

          {/* Form body */}
          <div style={{ padding: "20px 20px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelSt}>الطرف الثاني (المقاول) <span style={{ color: RED }}>*</span></label>
              <input
                style={inputSt}
                value={draft.vendorName}
                onChange={e => setDraft(d => ({ ...d, vendorName: e.target.value }))}
                placeholder="اسم الشركة أو المقاول"
              />
            </div>
            <div>
              <label style={labelSt}>رقم العقد</label>
              <input style={inputSt} value={draft.contractNo} onChange={e => setDraft(d => ({ ...d, contractNo: e.target.value }))} placeholder="CON-2026-XXXX" />
            </div>
            <div>
              <label style={labelSt}>نوع الاعمال</label>
              <input style={inputSt} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="مثال: عقد إنشاء مبنى الإدارة الجديد" />
            </div>
            <div>
              <label style={labelSt}>المشروع</label>
              <input style={inputSt} value={draft.projectName} onChange={e => setDraft(d => ({ ...d, projectName: e.target.value }))} placeholder="اسم المشروع" />
            </div>
            <div>
              <label style={labelSt}>تاريخ البداية</label>
              <input type="date" style={inputSt} value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>تاريخ الانتهاء</label>
              <input type="date" style={inputSt} value={draft.endDate} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>قيمة العقد (ر.س)</label>
              <input type="number" style={inputSt} value={draft.value} onChange={e => setDraft(d => ({ ...d, value: e.target.value }))} placeholder="0" />
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "0 20px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            {draftError && (
              <span style={{ flex: 1, fontSize: "0.65rem", color: RED, fontWeight: 700 }}>{draftError}</span>
            )}
            <div style={{ flex: draftError ? undefined : 1 }} />
            <button
              onClick={() => { setShowNewForm(false); setDraft(EMPTY_DRAFT); }}
              style={{
                padding: "9px 20px", borderRadius: 9, border: "1.5px solid #E8E8E8",
                background: "#fff", color: "#666", fontSize: "0.74rem", cursor: "pointer",
                fontFamily: "'Cairo','Tajawal',sans-serif",
              }}
            >إلغاء</button>
            <button
              onClick={handleSaveMonitor}
              disabled={saving}
              style={{
                padding: "9px 24px", borderRadius: 9, border: "none",
                background: saving ? "#93B5E1" : `linear-gradient(135deg, ${BLUE}, ${BLUE_M})`,
                color: "#fff", fontSize: "0.76rem", fontWeight: 800,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "'Cairo','Tajawal',sans-serif",
                boxShadow: "0 2px 8px rgba(25,118,210,0.28)",
              }}
            >{saving ? "جاري الحفظ..." : "حفظ المتابعة"}</button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ padding: showNewForm ? "16px 28px 20px" : "20px 28px" }}>
        {contracts.length === 0 ? (
          <div style={{
            background: "#fff", borderRadius: 16, padding: "60px 40px",
            textAlign: "center", border: "1px solid #EEE",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: "0.9rem", color: "#aaa", marginBottom: 8 }}>
              لا توجد عقود مكتملة في المتابعة حالياً
            </div>
            <div style={{ fontSize: "0.72rem", color: "#ccc" }}>
              ستظهر العقود هنا تلقائياً بعد اكتمال مرحلة الأرشفة والإغلاق
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {contracts.map(c => {
              const age = daysSince(c.updatedAt);
              const ageColor = age >= 30 ? RED : age >= 14 ? AMBER : GREEN;

              return (
                <div
                  key={c.id}
                  style={{
                    background: "#fff", borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.07)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    overflow: "hidden",
                  }}
                >
                  {/* Top accent line */}
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${BLUE}, ${BLUE_M}, ${BLUE_L})` }}/>

                  <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>

                    {/* Status icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: "rgba(34,197,94,0.08)",
                      border: "1.5px solid rgba(34,197,94,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.1rem",
                    }}>✓</div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#1A1A1A" }}>{c.title}</span>
                        {c.contractNo && (
                          <span style={{
                            fontSize: "0.62rem", padding: "2px 8px", borderRadius: 20,
                            background: BLUE_B, color: BLUE_M, fontWeight: 700, border: `1px solid ${BLUE_BR}`,
                          }}>{c.contractNo}</span>
                        )}
                        <span style={{
                          fontSize: "0.6rem", padding: "2px 8px", borderRadius: 20,
                          background: "rgba(34,197,94,0.08)", color: GREEN,
                          fontWeight: 700, border: "1px solid rgba(34,197,94,0.22)",
                        }}>مكتمل</span>
                      </div>

                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.68rem", color: "#666" }}>
                        {c.vendorName && <span>الطرف الثاني: <strong style={{ color: "#333" }}>{c.vendorName}</strong></span>}
                        {c.projectName && <span>المشروع: <strong style={{ color: "#333" }}>{c.projectName}</strong></span>}
                        {c.value > 0 && <span>القيمة: <strong style={{ color: BLUE_M }}>{formatSAR(c.value)}</strong></span>}
                        {c.endDate && <span>انتهاء العقد: <strong style={{ color: "#333" }}>{new Date(c.endDate).toLocaleDateString("ar-SA")}</strong></span>}
                      </div>

                      {/* Full-width progress bar */}
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: "100%",
                            background: `linear-gradient(90deg, ${BLUE}, ${BLUE_M}, ${GREEN})`,
                            borderRadius: 3,
                          }} />
                        </div>
                        <span style={{ fontSize: "0.68rem", fontWeight: 900, color: GREEN, flexShrink: 0 }}>100%</span>
                        <span style={{ fontSize: "0.62rem", color: ageColor, fontWeight: 700, flexShrink: 0 }}>
                          منذ {age} يوم
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                      {/* Open Monitor */}
                      <button
                        onClick={() => setMonitorContract(c)}
                        style={{
                          padding: "8px 16px", borderRadius: 9,
                          background: BLUE_B, border: `1.5px solid ${BLUE_BR}`,
                          color: BLUE_M, fontSize: "0.72rem", fontWeight: 700,
                          cursor: "pointer", fontFamily: "'Cairo', 'Tajawal', sans-serif",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(25,118,210,0.14)`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = BLUE_B; }}
                      >فتح لوحة المتابعة</button>

                      {/* Delete — مسؤول المتابعة only */}
                      {isManager && (
                        confirmDeleteId === c.id ? (
                          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                            <span style={{ fontSize: "0.6rem", color: "#666" }}>تأكيد؟</span>
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deletingId === c.id}
                              style={{
                                padding: "6px 12px", borderRadius: 8,
                                background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.35)",
                                color: RED, fontSize: "0.68rem", fontWeight: 700,
                                cursor: "pointer", fontFamily: "'Cairo', 'Tajawal', sans-serif",
                              }}
                            >{deletingId === c.id ? "..." : "نعم، حذف"}</button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{
                                padding: "6px 10px", borderRadius: 8,
                                background: "rgba(0,0,0,0.04)", border: "1px solid #E8E8E8",
                                color: "#666", fontSize: "0.68rem", cursor: "pointer",
                                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                              }}
                            >إلغاء</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            style={{
                              padding: "7px 12px", borderRadius: 9,
                              background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.22)",
                              color: "#F87171", fontSize: "0.68rem", fontWeight: 700,
                              cursor: "pointer", fontFamily: "'Cairo', 'Tajawal', sans-serif",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)"; }}
                          >إزالة</button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
