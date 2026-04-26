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
      background: `linear-gradient(145deg, #0C1427 0%, #152040 50%, #0C1427 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
      overflow: "hidden",
    }}>
      {/* Background decoration */}
      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(197,160,89,0.06) 0%,transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", bottom: -100, left: -100, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(74,144,217,0.06) 0%,transparent 70%)", pointerEvents: "none" }}/>
      {/* Top gold line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#C5A059,transparent)" }}/>

      <div style={{ width: "100%", maxWidth: 820, padding: "0 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 32px rgba(197,160,89,0.40), 0 0 0 1px rgba(197,160,89,0.3)`,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.5)" }}/>
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#E2C275", marginBottom: 6, letterSpacing: "-0.02em" }}>
            نظام الرواف لإدارة العقود
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.86rem" }}>اختر دورك الوظيفي للمتابعة</p>
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
                  border: `1.5px solid ${active ? GOLD : "rgba(255,255,255,0.10)"}`,
                  borderRadius: 14, padding: "14px 12px",
                  background: active
                    ? `linear-gradient(135deg, rgba(197,160,89,0.18), rgba(197,160,89,0.08))`
                    : "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(12px)",
                  cursor: "pointer", textAlign: "center",
                  transition: "all 0.18s",
                  boxShadow: active
                    ? `0 0 0 3px rgba(197,160,89,0.20), 0 8px 24px rgba(197,160,89,0.18)`
                    : "0 2px 8px rgba(0,0,0,0.12)",
                  position: "relative",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(197,160,89,0.35)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
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
                    boxShadow: "0 2px 8px rgba(231,76,60,0.45)",
                  }}>{pending}</div>
                )}
                {/* Role color bar */}
                <div style={{
                  width: 32, height: 3, borderRadius: 2, margin: "0 auto 10px",
                  background: active ? `linear-gradient(90deg,${GOLD},${GOLD2})` : "rgba(255,255,255,0.12)",
                  transition: "background 0.18s",
                }}/>
                <div style={{ fontSize: "0.84rem", fontWeight: 800, color: active ? "#E2C275" : "rgba(255,255,255,0.80)", marginBottom: 4 }}>
                  {r.name}
                </div>
                {stageLabels.map((sl, i) => (
                  <div key={i} style={{
                    fontSize: "0.56rem", color: active ? "rgba(197,160,89,0.75)" : "rgba(255,255,255,0.38)", marginTop: 2, lineHeight: 1.4,
                  }}>م{r.stage[i]}: {sl}</div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", marginBottom: 8, letterSpacing: "0.04em" }}>
            اسمك الكامل
          </label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setErr(""); }}
            onKeyDown={e => { if (e.key === "Enter") confirm(); }}
            placeholder="أدخل اسمك للسجلات الرسمية"
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 11,
              border: `1.5px solid rgba(197,160,89,0.25)`, fontSize: "0.9rem",
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              outline: "none", boxSizing: "border-box",
              background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.88)",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.currentTarget.style.borderColor = GOLD}
            onBlur={e => e.currentTarget.style.borderColor = "rgba(197,160,89,0.25)"}
          />
        </div>

        {err && (
          <div style={{ color: "#FCA5A5", fontSize: "0.78rem", marginBottom: 12, textAlign: "center", padding: "10px", background: "rgba(239,68,68,0.1)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)" }}>
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
            boxShadow: `0 6px 24px rgba(197,160,89,0.42)`,
            transition: "all 0.2s ease",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 10px 32px rgba(197,160,89,0.55)"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = "0 6px 24px rgba(197,160,89,0.42)"; }}
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
