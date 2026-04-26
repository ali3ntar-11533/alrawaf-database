import { useState } from "react";
import { ROLES, STAGES, GOLD, GOLD_BG, GOLD_BORDER, type Contract } from "./types";

const GOLD2 = "#a88540";
const GLASS = "rgba(255,255,255,0.88)";
const G_BOR = "rgba(197,160,89,0.24)";

interface Props {
  onSelect: (role: string, name: string) => void;
  pendingByRole: Record<string, number>;
}

export default function RoleSelector({ onSelect, pendingByRole }: Props) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [err, setErr] = useState("");

  function confirm() {
    if (!selected) { setErr("يرجى اختيار دورك الوظيفي"); return; }
    if (!name.trim()) { setErr("يرجى إدخال اسمك الكامل"); return; }
    onSelect(selected, name.trim());
  }

  return (
    <div dir="rtl" style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "linear-gradient(145deg, #F2EDE4 0%, #EDE8DC 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 780, padding: "0 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 14px",
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 24px rgba(197,160,89,0.35)`,
          }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.3)", border: "2px solid rgba(255,255,255,0.6)" }}/>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#1a1206", marginBottom: 6 }}>
            نظام الرواف لإدارة العقود
          </h2>
          <p style={{ color: "#6b5c3e", fontSize: "0.88rem" }}>اختر دورك الوظيفي للمتابعة</p>
        </div>

        {/* Role grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12, marginBottom: 24,
        }}>
          {ROLES.map(r => {
            const pending = pendingByRole[r.name] ?? 0;
            const active  = selected === r.name;
            const stageLabels = r.stage.map(n => {
              const st = STAGES[n - 1];
              return st ? st.label : `م${n}`;
            });
            return (
              <div
                key={r.name}
                onClick={() => { setSelected(r.name); setErr(""); }}
                style={{
                  border: `2px solid ${active ? GOLD : G_BOR}`,
                  borderRadius: 14, padding: "14px 12px",
                  background: active
                    ? `linear-gradient(135deg, rgba(197,160,89,0.12), rgba(197,160,89,0.06))`
                    : GLASS,
                  backdropFilter: "blur(12px)",
                  cursor: "pointer", textAlign: "center",
                  transition: "all 0.18s",
                  boxShadow: active
                    ? `0 0 0 3px rgba(197,160,89,0.18), 0 6px 20px rgba(197,160,89,0.15)`
                    : "0 2px 8px rgba(0,0,0,0.05)",
                  position: "relative",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.borderColor = GOLD_BORDER;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px rgba(197,160,89,0.12)`;
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.borderColor = G_BOR;
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                  }
                }}
              >
                {pending > 0 && (
                  <div style={{
                    position: "absolute", top: -8, left: -8,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#e74c3c", color: "#fff",
                    fontSize: "0.68rem", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(231,76,60,0.35)",
                  }}>{pending}</div>
                )}
                {/* Role color bar */}
                <div style={{
                  width: 32, height: 4, borderRadius: 2, margin: "0 auto 10px",
                  background: active ? `linear-gradient(90deg,${GOLD},${GOLD2})` : "rgba(0,0,0,0.1)",
                  transition: "background 0.18s",
                }}/>
                <div style={{ fontSize: "0.86rem", fontWeight: 800, color: active ? "#7d622a" : "#2d1f06", marginBottom: 4 }}>
                  {r.name}
                </div>
                {stageLabels.map((sl, i) => (
                  <div key={i} style={{
                    fontSize: "0.58rem", color: active ? "#9b7d38" : "#9b8060", marginTop: 2, lineHeight: 1.4,
                  }}>م{r.stage[i]}: {sl}</div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#4a3520", marginBottom: 6 }}>
            اسمك الكامل
          </label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setErr(""); }}
            onKeyDown={e => { if (e.key === "Enter") confirm(); }}
            placeholder="أدخل اسمك للسجلات الرسمية"
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              border: `1.5px solid ${G_BOR}`, fontSize: "0.9rem",
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              outline: "none", boxSizing: "border-box",
              background: GLASS, backdropFilter: "blur(8px)", color: "#1a1206",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.currentTarget.style.borderColor = GOLD}
            onBlur={e => e.currentTarget.style.borderColor = G_BOR}
          />
        </div>

        {err && (
          <div style={{ color: "#e74c3c", fontSize: "0.78rem", marginBottom: 12, textAlign: "center", padding: "8px", background: "rgba(231,76,60,0.06)", borderRadius: 8, border: "1px solid rgba(231,76,60,0.15)" }}>
            {err}
          </div>
        )}

        <button
          onClick={confirm}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
            color: "#fff", border: "none", cursor: "pointer",
            fontSize: "1rem", fontWeight: 800, fontFamily: "'Cairo', 'Tajawal', sans-serif",
            boxShadow: `0 6px 20px rgba(197,160,89,0.4)`,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          دخول النظام
        </button>
      </div>
    </div>
  );
}

export function computePendingByRole(contracts: Contract[]): Record<string, number> {
  const result: Record<string, number> = {};
  const stageToRole: Record<number, string> = {
    1: "مدير المشروع", 2: "مدير القطاع", 3: "مدير PMO", 4: "أخصائي العقود",
    5: "أدمن العقود", 6: "أدمن العقود", 7: "مدير الإدارة",
    8: "نائب الرئيس", 9: "الرئيس التنفيذي",
    10: "مسؤول التوقيعات", 11: "مسؤول التوقيعات",
  };
  for (const c of contracts) {
    if (c.status !== "completed") {
      const role = stageToRole[c.currentStage];
      if (role) result[role] = (result[role] ?? 0) + 1;
    }
  }
  return result;
}
