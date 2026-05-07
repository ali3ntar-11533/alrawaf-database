import { useState, useRef, useCallback } from "react";
import { X, Cloud, Clipboard, Save, AlertCircle, CheckCircle, Loader, Plus, Trash2 } from "lucide-react";
import { createContractor } from "../contractors/api";
import type { Contractor } from "../contractors/types";

/* ─── Types ─────────────────────────────────────────────── */
interface RowData {
  contractNo:      string;
  contractor:      string;
  project:         string;
  portfolio:       string;
  mainActivity:    string;
  businessProgram: string;
  workType:        string;
  technicalScope:  string;
  workCategory:    string;
  unit:            string;
  price:           string;
  localContent:    string;
  phone:           string;
  email:           string;
  rating:          string;
}

type RowStatus = "idle" | "saving" | "saved" | "duplicate" | "error";

interface Row {
  id:     string;
  data:   RowData;
  status: RowStatus;
  error?: string;
}

interface Props {
  existingContractors: Contractor[];
  onClose:             () => void;
  onSaved:             () => void;
}

/* ─── Columns definition ─────────────────────────────────── */
const COLUMNS: { key: keyof RowData; label: string; width: number; type?: "number" | "dropdown"; options?: string[] }[] = [
  { key: "contractNo",      label: "رقم العقد",             width: 110 },
  { key: "contractor",      label: "المقاول / المورد",      width: 160 },
  { key: "project",         label: "المشروع",               width: 140 },
  { key: "portfolio",       label: "المحفظة",               width: 90  },
  { key: "mainActivity",    label: "النشاط الرئيسي",        width: 120 },
  { key: "businessProgram", label: "برنامج الأعمال",        width: 100 },
  { key: "workType",        label: "نوع الأعمال",           width: 90  },
  { key: "technicalScope",  label: "الوصف الفني للبند",     width: 200 },
  { key: "workCategory",    label: "نوع العمل",             width: 90  },
  { key: "unit",            label: "الوحدة",                width: 70  },
  { key: "price",           label: "السعر",                  width: 100, type: "number" },
  { key: "localContent",    label: "المحتوى المحلي",        width: 100, type: "dropdown", options: ["", "مسجل", "غير مسجل"] },
  { key: "phone",           label: "رقم التواصل",           width: 120 },
  { key: "email",           label: "البريد الإلكتروني",     width: 160 },
  { key: "rating",          label: "التقييم (0-5)",         width: 80, type: "number" },
];

/* ─── Helpers ───────────────────────────────────────────── */
function emptyRow(): Row {
  return {
    id: Math.random().toString(36).slice(2),
    status: "idle",
    data: {
      contractNo: "", contractor: "", project: "", portfolio: "",
      mainActivity: "", businessProgram: "", workType: "", technicalScope: "",
      workCategory: "", unit: "", price: "", localContent: "",
      phone: "", email: "", rating: "",
    },
  };
}

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, emptyRow);
}

function isRowEmpty(r: RowData): boolean {
  return Object.values(r).every((v) => !v.trim());
}

function parsePasted(text: string): RowData[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    const cells = line.split("\t").map((c) => c.trim());
    const get = (i: number) => cells[i] ?? "";
    return {
      contractNo:      get(0),
      contractor:      get(1),
      project:         get(2),
      portfolio:       get(3),
      mainActivity:    get(4),
      businessProgram: get(5),
      workType:        get(6),
      technicalScope:  get(7),
      workCategory:    get(8),
      unit:            get(9),
      price:           get(10),
      localContent:    get(11),
      phone:           get(12),
      email:           get(13),
      rating:          get(14),
    };
  });
}

/* ─── Status Badge ──────────────────────────────────────── */
function StatusBadge({ status, error }: { status: RowStatus; error?: string }) {
  if (status === "idle")      return null;
  if (status === "saving")    return <Loader size={14} style={{ color: "#3b8fcc", animation: "spin-loader 0.9s linear infinite" }} />;
  if (status === "saved")     return <CheckCircle size={14} style={{ color: "#2baa74" }} />;
  if (status === "duplicate") return (
    <span title="رقم العقد موجود مسبقاً">
      <AlertCircle size={14} style={{ color: "#e67e22" }} />
    </span>
  );
  return (
    <span title={error}>
      <AlertCircle size={14} style={{ color: "#e74c3c" }} />
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function CloudSyncModal({ existingContractors, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>(() => makeRows(10));
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState<{ saved: number; duplicates: number; errors: number } | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const pasteAreaRef = useRef<HTMLTextAreaElement>(null);

  const existingNos = new Set(existingContractors.map((c) => c.contractNo.trim().toLowerCase()));

  /* ── Update a single cell ── */
  const updateCell = useCallback((rowId: string, key: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) =>
      r.id === rowId ? { ...r, data: { ...r.data, [key]: value }, status: "idle", error: undefined } : r
    ));
  }, []);

  /* ── Add empty rows ── */
  function addRows(n = 5) {
    setRows((prev) => [...prev, ...makeRows(n)]);
  }

  /* ── Remove a row ── */
  function removeRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }

  /* ── Parse and apply pasted text ── */
  function applyPaste() {
    if (!pasteText.trim()) return;
    const parsed = parsePasted(pasteText);
    const newRows: Row[] = parsed.map((data) => ({ id: Math.random().toString(36).slice(2), data, status: "idle" }));
    // Append after current non-empty rows or replace all empty
    setRows((prev) => {
      const nonEmpty = prev.filter((r) => !isRowEmpty(r.data));
      return [...nonEmpty, ...newRows, ...makeRows(Math.max(0, 3))];
    });
    setPasteText("");
    setPasteMode(false);
  }

  /* ── Save all non-empty rows ── */
  async function handleSave() {
    const toSave = rows.filter((r) => !isRowEmpty(r.data));
    if (toSave.length === 0) return;

    setIsSaving(true);
    setSummary(null);

    /* Mark duplicates before saving */
    setRows((prev) =>
      prev.map((r) => {
        if (isRowEmpty(r.data)) return r;
        const no = r.data.contractNo.trim().toLowerCase();
        if (no && existingNos.has(no)) return { ...r, status: "duplicate" };
        return { ...r, status: "saving" };
      })
    );

    let saved = 0, duplicates = 0, errors = 0;

    /* Save each non-duplicate row sequentially */
    for (const row of toSave) {
      const no = row.data.contractNo.trim().toLowerCase();
      if (no && existingNos.has(no)) {
        duplicates++;
        continue;
      }
      try {
        await createContractor({
          contractNo:      row.data.contractNo.trim(),
          contractor:      row.data.contractor.trim(),
          project:         row.data.project.trim(),
          portfolio:       row.data.portfolio.trim(),
          workType:        row.data.workType.trim(),
          technicalScope:  row.data.technicalScope.trim(),
          price:           Math.min(Math.round(parseFloat(row.data.price) || 0), 2_000_000_000),
          phone:           row.data.phone.trim(),
          email:           row.data.email.trim(),
          mainActivity:    row.data.mainActivity.trim()    || null,
          businessProgram: row.data.businessProgram.trim() || null,
          workCategory:    row.data.workCategory.trim()    || null,
          unit:            row.data.unit.trim()            || null,
          localContent:    row.data.localContent.trim()    || null,
          rating:          row.data.rating ? Math.min(5, Math.max(0, Math.round(parseFloat(row.data.rating)))) : null,
          workDescription: null,
          workScopeText:   null,
        });
        /* Mark as saved + add to in-memory set so duplicates within the batch are caught */
        if (no) existingNos.add(no);
        saved++;
        setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: "saved" } : r));
      } catch (e: unknown) {
        errors++;
        const msg = e instanceof Error ? e.message : "خطأ غير معروف";
        setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: "error", error: msg } : r));
      }
    }

    setSummary({ saved, duplicates, errors });
    setIsSaving(false);
    if (saved > 0) onSaved();
  }

  const nonEmptyCount = rows.filter((r) => !isRowEmpty(r.data)).length;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(10,8,5,0.72)", backdropFilter: "blur(6px)",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a5c 100%)",
        borderBottom: "2px solid rgba(59,143,204,0.4)",
        padding: "14px 24px",
        display: "flex", alignItems: "center", gap: "14px", flexShrink: 0,
        direction: "rtl",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "10px",
            background: "linear-gradient(135deg, #1e6fa8, #3b8fcc)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(59,143,204,0.4)",
          }}>
            <Cloud size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
              إدخال بيانات سحابي
            </div>
            <div style={{ fontSize: "0.62rem", color: "rgba(59,143,204,0.85)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Excel Online Sync · Cloud Database Entry
            </div>
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ background: "rgba(59,143,204,0.18)", border: "1px solid rgba(59,143,204,0.35)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.72rem", color: "#7ec8f0", fontWeight: 700 }}>
            {rows.length} صف
          </span>
          <span style={{ background: "rgba(43,170,116,0.15)", border: "1px solid rgba(43,170,116,0.3)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.72rem", color: "#5dd6a8", fontWeight: 700 }}>
            {nonEmptyCount} مدخل
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setPasteMode(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(59,143,204,0.15)", border: "1.5px solid rgba(59,143,204,0.4)",
              color: "#7ec8f0", borderRadius: "9px", padding: "7px 14px",
              fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif",
            }}
          >
            <Clipboard size={13} />
            لصق من Excel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || nonEmptyCount === 0}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: isSaving || nonEmptyCount === 0
                ? "rgba(59,143,204,0.25)"
                : "linear-gradient(135deg, #1e6fa8, #3b8fcc)",
              border: "none", color: "#fff", borderRadius: "9px", padding: "8px 18px",
              fontSize: "0.82rem", fontWeight: 700, cursor: isSaving || nonEmptyCount === 0 ? "not-allowed" : "pointer",
              fontFamily: "Tajawal, sans-serif",
              boxShadow: isSaving || nonEmptyCount === 0 ? "none" : "0 4px 14px rgba(59,143,204,0.4)",
              opacity: isSaving || nonEmptyCount === 0 ? 0.6 : 1,
            }}
          >
            {isSaving ? <Loader size={13} style={{ animation: "spin-loader 0.9s linear infinite" }} /> : <Save size={13} />}
            {isSaving ? "جاري الحفظ..." : `حفظ (${nonEmptyCount})`}
          </button>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#aaa", borderRadius: "8px", padding: "7px 10px", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Summary Banner ── */}
      {summary && (
        <div style={{
          background: summary.errors > 0
            ? "rgba(231,76,60,0.12)"
            : summary.duplicates > 0
              ? "rgba(230,126,34,0.12)"
              : "rgba(43,170,116,0.12)",
          borderBottom: `1px solid ${summary.errors > 0 ? "rgba(231,76,60,0.3)" : summary.duplicates > 0 ? "rgba(230,126,34,0.3)" : "rgba(43,170,116,0.3)"}`,
          padding: "10px 24px",
          fontSize: "0.8rem",
          fontWeight: 700,
          color: summary.errors > 0 ? "#e74c3c" : summary.duplicates > 0 ? "#e67e22" : "#2baa74",
          display: "flex", gap: "20px", alignItems: "center", direction: "rtl", flexShrink: 0,
        }}>
          <span>✅ تم حفظ {summary.saved} سجل</span>
          {summary.duplicates > 0 && <span>⚠️ {summary.duplicates} مكرر (تم تخطيه)</span>}
          {summary.errors > 0 && <span>❌ {summary.errors} خطأ في الحفظ</span>}
          {summary.saved > 0 && (
            <span style={{ marginRight: "auto", fontSize: "0.72rem", color: "#aaa", fontWeight: 400 }}>
              تم تحديث قاعدة البيانات السحابية بنجاح
            </span>
          )}
        </div>
      )}

      {/* ── Instructions bar ── */}
      <div style={{
        background: "#0a1628",
        padding: "8px 24px",
        fontSize: "0.68rem", color: "rgba(126,200,240,0.7)",
        display: "flex", gap: "20px", alignItems: "center", direction: "rtl", flexShrink: 0,
        borderBottom: "1px solid rgba(59,143,204,0.15)",
      }}>
        <span>💡 انقر على أي خلية لتعديلها مباشرة</span>
        <span>📋 استخدم "لصق من Excel" لإدخال بيانات ضخمة دفعة واحدة</span>
        <span>🔒 رقم العقد المكرر يُتخطى تلقائياً دون حذف البيانات الموجودة</span>
        <span>☁️ البيانات تُرفع فور الضغط على "حفظ"</span>
      </div>

      {/* ── Grid ── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", background: "#0d1a2e" }}>
        <table style={{
          borderCollapse: "collapse", tableLayout: "fixed", direction: "rtl",
          minWidth: COLUMNS.reduce((s, c) => s + c.width, 0) + 90,
          width: "100%",
        }}>
          {/* ColGroup */}
          <colgroup>
            <col style={{ width: 36 }} /> {/* row number */}
            {COLUMNS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
            <col style={{ width: 54 }} /> {/* status + delete */}
          </colgroup>

          {/* Header */}
          <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <tr style={{ background: "#0a1525", borderBottom: "2px solid rgba(59,143,204,0.35)" }}>
              <th style={{ padding: "9px 6px", fontSize: "0.6rem", color: "rgba(59,143,204,0.5)", textAlign: "center", borderLeft: "1px solid rgba(59,143,204,0.1)" }}>#</th>
              {COLUMNS.map((c) => (
                <th key={c.key} style={{
                  padding: "9px 8px", fontSize: "0.62rem", fontWeight: 700, color: "rgba(59,143,204,0.9)",
                  textAlign: "right", letterSpacing: "0.04em", whiteSpace: "nowrap",
                  borderLeft: "1px solid rgba(59,143,204,0.12)",
                }}>
                  {c.label}
                </th>
              ))}
              <th style={{ padding: "9px 6px", fontSize: "0.6rem", color: "rgba(59,143,204,0.5)", textAlign: "center" }}>حالة</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const isEmpty = isRowEmpty(row.data);
              const isDup = row.status === "duplicate";
              const isSaved = row.status === "saved";
              const isErr = row.status === "error";
              const rowBg = isSaved
                ? "rgba(43,170,116,0.07)"
                : isDup
                  ? "rgba(230,126,34,0.07)"
                  : isErr
                    ? "rgba(231,76,60,0.07)"
                    : idx % 2 === 0 ? "#0f1f38" : "#0d1b33";

              return (
                <tr key={row.id} style={{ background: rowBg, borderBottom: "1px solid rgba(59,143,204,0.08)" }}>
                  {/* Row number */}
                  <td style={{ padding: "3px 6px", fontSize: "0.6rem", color: "rgba(59,143,204,0.4)", textAlign: "center", borderLeft: "1px solid rgba(59,143,204,0.08)", verticalAlign: "middle" }}>
                    {isEmpty ? <span style={{ color: "rgba(59,143,204,0.2)" }}>·</span> : idx + 1}
                  </td>

                  {/* Data cells */}
                  {COLUMNS.map((col) => (
                    <td key={col.key} style={{ padding: "2px 3px", borderLeft: "1px solid rgba(59,143,204,0.08)", verticalAlign: "middle" }}>
                      {col.type === "dropdown" ? (
                        <select
                          value={row.data[col.key]}
                          onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                          disabled={isSaved}
                          style={{
                            width: "100%", background: "transparent", border: "none",
                            color: isSaved ? "#2baa74" : isDup ? "#e67e22" : "#c8dff0",
                            fontSize: "0.72rem", fontFamily: "Tajawal, sans-serif",
                            outline: "none", cursor: isSaved ? "not-allowed" : "pointer",
                            padding: "5px 4px", direction: "rtl",
                          }}
                        >
                          {(col.options ?? []).map((opt) => (
                            <option key={opt} value={opt} style={{ background: "#0d1f3c" }}>
                              {opt || "— اختر —"}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={col.type === "number" ? "number" : "text"}
                          value={row.data[col.key]}
                          onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                          disabled={isSaved}
                          min={col.type === "number" ? 0 : undefined}
                          style={{
                            width: "100%", background: "transparent", border: "none",
                            color: isSaved ? "#2baa74" : isDup ? "#e67e22" : isErr ? "#e74c3c" : "#c8dff0",
                            fontSize: "0.72rem", fontFamily: "Tajawal, sans-serif",
                            outline: "none", padding: "5px 6px", direction: "rtl",
                            cursor: isSaved ? "not-allowed" : "text",
                          }}
                          onFocus={(e) => {
                            if (!isSaved) {
                              (e.target.parentElement as HTMLElement).style.background = "rgba(59,143,204,0.12)";
                              (e.target.parentElement as HTMLElement).style.borderRadius = "4px";
                            }
                          }}
                          onBlur={(e) => {
                            (e.target.parentElement as HTMLElement).style.background = "";
                          }}
                        />
                      )}
                    </td>
                  ))}

                  {/* Status + delete */}
                  <td style={{ padding: "3px 6px", textAlign: "center", verticalAlign: "middle", borderLeft: "1px solid rgba(59,143,204,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      <StatusBadge status={row.status} error={row.error} />
                      {!isSaved && (
                        <button
                          onClick={() => removeRow(row.id)}
                          style={{ background: "none", border: "none", color: "rgba(231,76,60,0.4)", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                          title="حذف الصف"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Add more rows */}
        <div style={{ padding: "12px 24px", display: "flex", gap: "10px", direction: "rtl" }}>
          <button
            onClick={() => addRows(5)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(59,143,204,0.1)", border: "1px dashed rgba(59,143,204,0.35)",
              color: "rgba(59,143,204,0.7)", borderRadius: "8px", padding: "7px 16px",
              fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif",
            }}
          >
            <Plus size={13} />
            إضافة 5 صفوف
          </button>
          <button
            onClick={() => addRows(20)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(59,143,204,0.1)", border: "1px dashed rgba(59,143,204,0.35)",
              color: "rgba(59,143,204,0.7)", borderRadius: "8px", padding: "7px 16px",
              fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif",
            }}
          >
            <Plus size={13} />
            إضافة 20 صفاً
          </button>
        </div>
      </div>

      {/* ── Paste Mode Overlay ── */}
      {pasteMode && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 3000,
          background: "rgba(5,10,20,0.85)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "40px", direction: "rtl",
        }}>
          <div style={{
            background: "#0d1f3c", borderRadius: "16px",
            border: "1.5px solid rgba(59,143,204,0.4)",
            padding: "32px", maxWidth: "700px", width: "100%",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Clipboard size={20} color="#3b8fcc" />
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff" }}>لصق بيانات من Excel</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(59,143,204,0.7)", marginTop: "2px" }}>
                  حدد الخلايا في Excel ثم انسخها (Ctrl+C) والصقها هنا (Ctrl+V)
                </div>
              </div>
            </div>

            {/* Column order hint */}
            <div style={{
              background: "rgba(59,143,204,0.08)", border: "1px solid rgba(59,143,204,0.2)",
              borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "0.65rem",
              color: "rgba(59,143,204,0.8)", lineHeight: 1.8,
            }}>
              <div style={{ fontWeight: 700, marginBottom: "4px", color: "#7ec8f0" }}>ترتيب الأعمدة المتوقع من Excel:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {COLUMNS.map((c, i) => (
                  <span key={c.key} style={{
                    background: "rgba(59,143,204,0.15)", borderRadius: "4px", padding: "2px 7px",
                    fontSize: "0.63rem", color: "#7ec8f0",
                  }}>
                    {i + 1}. {c.label}
                  </span>
                ))}
              </div>
            </div>

            <textarea
              ref={pasteAreaRef}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="الصق البيانات هنا (Ctrl+V)..."
              autoFocus
              style={{
                width: "100%", height: "200px", background: "#07111f",
                border: "1.5px solid rgba(59,143,204,0.3)", borderRadius: "10px",
                color: "#c8dff0", fontSize: "0.72rem", fontFamily: "monospace",
                padding: "12px", direction: "ltr", resize: "vertical",
                outline: "none", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b8fcc")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(59,143,204,0.3)")}
            />
            <div style={{ fontSize: "0.65rem", color: "rgba(59,143,204,0.5)", marginTop: "6px" }}>
              {pasteText ? `✅ ${pasteText.split("\n").filter((l) => l.trim()).length} صف مكتشف` : "في انتظار البيانات..."}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => { setPasteMode(false); setPasteText(""); }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#aaa", borderRadius: "9px", padding: "10px 20px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}>
                إلغاء
              </button>
              <button
                onClick={applyPaste}
                disabled={!pasteText.trim()}
                style={{
                  flex: 1, background: pasteText.trim() ? "linear-gradient(135deg, #1e6fa8, #3b8fcc)" : "rgba(59,143,204,0.2)",
                  border: "none", color: "#fff", borderRadius: "9px", padding: "10px",
                  fontSize: "0.85rem", fontWeight: 700, cursor: pasteText.trim() ? "pointer" : "not-allowed",
                  fontFamily: "Tajawal, sans-serif", opacity: pasteText.trim() ? 1 : 0.5,
                }}>
                تطبيق البيانات ({pasteText.split("\n").filter((l) => l.trim()).length} صف)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
