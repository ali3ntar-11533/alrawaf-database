import { useState } from "react";
import { ROLES, GOLD, GOLD_BG, GOLD_BORDER, type Contract } from "./types";

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
    if (!name.trim()) { setErr("يرجى إدخال اسمك"); return; }
    onSelect(selected, name.trim());
  }

  return (
    <div dir="rtl" style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "linear-gradient(135deg, #faf9f5 0%, #f5f0e8 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 760, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>👔</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#1a1206", marginBottom: 8 }}>
            نظام الرواف لإدارة العقود
          </h2>
          <p style={{ color: "#6b5c3e", fontSize: "0.9rem" }}>اختر دورك الوظيفي للمتابعة</p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14, marginBottom: 28,
        }}>
          {ROLES.map(r => {
            const pending = pendingByRole[r.name] ?? 0;
            const active = selected === r.name;
            return (
              <div
                key={r.name}
                onClick={() => { setSelected(r.name); setErr(""); }}
                style={{
                  border: `2px solid ${active ? GOLD : GOLD_BORDER}`,
                  borderRadius: 14,
                  padding: "16px 12px",
                  background: active ? GOLD_BG : "#fff",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.18s",
                  boxShadow: active ? `0 0 0 3px rgba(197,160,89,0.18)` : "0 2px 8px rgba(0,0,0,0.06)",
                  position: "relative",
                }}
              >
                {pending > 0 && (
                  <div style={{
                    position: "absolute", top: -8, left: -8,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#e74c3c", color: "#fff",
                    fontSize: "0.68rem", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{pending}</div>
                )}
                <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{r.icon}</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: active ? "#8B6914" : "#2d1f06" }}>
                  {r.name}
                </div>
                {r.stage.length > 0 && (
                  <div style={{ fontSize: "0.62rem", color: "#9b8060", marginTop: 4 }}>
                    المرحلة {r.stage.join("، ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#4a3520", marginBottom: 6 }}>
            اسمك الكامل
          </label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setErr(""); }}
            placeholder="أدخل اسمك للسجلات الرسمية"
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              border: `1.5px solid ${GOLD_BORDER}`, fontSize: "0.9rem",
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              outline: "none", boxSizing: "border-box",
              background: "#fff", color: "#1a1206",
            }}
          />
        </div>

        {err && (
          <div style={{ color: "#e74c3c", fontSize: "0.78rem", marginBottom: 12, textAlign: "center" }}>
            ⚠ {err}
          </div>
        )}

        <button
          onClick={confirm}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            background: `linear-gradient(135deg, ${GOLD}, #a88540)`,
            color: "#fff", border: "none", cursor: "pointer",
            fontSize: "1rem", fontWeight: 800, fontFamily: "'Cairo', 'Tajawal', sans-serif",
          }}
        >
          دخول النظام ←
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
