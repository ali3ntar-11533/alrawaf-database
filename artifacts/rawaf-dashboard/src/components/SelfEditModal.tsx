import { useState } from "react";
import type { CurrentUser } from "../App";

interface Props {
  currentUser: CurrentUser;
  onClose: () => void;
  onSaved: (updated: CurrentUser) => void;
}

const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9000,
  background: "rgba(10,8,5,0.82)", backdropFilter: "blur(6px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "Tajawal, sans-serif", direction: "rtl",
};

const CARD: React.CSSProperties = {
  background: "linear-gradient(145deg, #1a120a 0%, #14100b 100%)",
  border: "1.5px solid rgba(197,160,89,0.3)",
  borderRadius: 16, padding: "32px 28px", width: "100%", maxWidth: 440,
  boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(197,160,89,0.08)",
  position: "relative",
};

const LABEL: React.CSSProperties = {
  display: "block", fontSize: "0.63rem", color: "rgba(197,160,89,0.82)",
  fontWeight: 700, marginBottom: 5, letterSpacing: "0.05em",
};

const INPUT: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  background: "rgba(20,16,11,0.98)", border: "1.5px solid rgba(197,160,89,0.28)",
  borderRadius: 9, color: "#fff", fontSize: "0.87rem",
  fontFamily: "Tajawal, sans-serif", direction: "rtl", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.18s",
};

export default function SelfEditModal({ currentUser, onClose, onSaved }: Props) {
  const [name,      setName]      = useState(currentUser.name);
  const [jobTitle,  setJobTitle]  = useState(currentUser.jobTitle);
  const [loginName, setLoginName] = useState(currentUser.loginName);
  const [password,  setPassword]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) { setError("الاسم الكامل مطلوب"); return; }
    if (!loginName.trim()) { setError("اسم المستخدم مطلوب"); return; }
    setSaving(true); setError(null);
    try {
      const body: Record<string, string> = {
        userId:    String(currentUser.id),
        name:      name.trim(),
        jobTitle:  jobTitle.trim(),
        loginName: loginName.trim(),
      };
      if (password) body.password = password;
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) { setError((data.error as string) || "خطأ في الحفظ"); return; }
      onSaved(data as unknown as CurrentUser);
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={OVERLAY} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={CARD}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
            تعديل بياناتي الشخصية
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1, padding: "2px 6px" }}
          >×</button>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LABEL}>الاسم الكامل</label>
            <input
              style={INPUT} value={name} onChange={e => setName(e.target.value)}
              onFocus={e => (e.target.style.borderColor = "rgba(197,160,89,0.8)")}
              onBlur={e  => (e.target.style.borderColor = "rgba(197,160,89,0.28)")}
            />
          </div>
          <div>
            <label style={LABEL}>المسمى الوظيفي</label>
            <input
              style={INPUT} value={jobTitle} onChange={e => setJobTitle(e.target.value)}
              onFocus={e => (e.target.style.borderColor = "rgba(197,160,89,0.8)")}
              onBlur={e  => (e.target.style.borderColor = "rgba(197,160,89,0.28)")}
            />
          </div>
          <div>
            <label style={LABEL}>اسم المستخدم (للدخول)</label>
            <input
              style={INPUT} value={loginName} onChange={e => setLoginName(e.target.value)}
              onFocus={e => (e.target.style.borderColor = "rgba(197,160,89,0.8)")}
              onBlur={e  => (e.target.style.borderColor = "rgba(197,160,89,0.28)")}
            />
          </div>
          <div>
            <label style={LABEL}>كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية)</label>
            <input
              type="password" style={INPUT}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onFocus={e => (e.target.style.borderColor = "rgba(197,160,89,0.8)")}
              onBlur={e  => (e.target.style.borderColor = "rgba(197,160,89,0.28)")}
            />
          </div>

          {error && (
            <div style={{ background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: 8, padding: "9px 12px", fontSize: "0.74rem", color: "#e05050", fontWeight: 600 }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                flex: 1, padding: "11px 0",
                background: saving ? "rgba(197,160,89,0.35)" : "linear-gradient(135deg, #c5a059 0%, #a88540 100%)",
                border: "none", borderRadius: 10,
                color: saving ? "rgba(255,255,255,0.5)" : "#1a120a",
                fontFamily: "Tajawal, sans-serif", fontWeight: 800,
                fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
              }}
            >{saving ? "جارٍ الحفظ..." : "حفظ البيانات"}</button>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: "11px 0",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10, color: "rgba(255,255,255,0.6)",
                fontFamily: "Tajawal, sans-serif", fontWeight: 700,
                fontSize: "0.9rem", cursor: "pointer",
              }}
            >إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}
