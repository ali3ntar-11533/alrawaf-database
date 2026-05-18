import { useState, useEffect, useCallback } from "react";

interface UserRecord {
  id: number;
  name: string;
  loginName: string;
  jobTitle: string;
  role: string;
  isActive: number;
  lastActive: string | null;
  createdAt: string;
}

interface LogEntry {
  id: number;
  userId: number;
  loginName: string;
  loginAt: string;
}

interface Props {
  currentUser: { loginName: string; role: string; name: string };
  onClose: () => void;
}

function isOnline(lastActive: string | null): boolean {
  if (!lastActive) return false;
  return Date.now() - new Date(lastActive).getTime() < 2 * 60 * 1000;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] ?? "") + (parts[1][0] ?? "");
  return name.slice(0, 2);
}

const ROLE_LABELS: Record<string, string> = { admin: "مسؤول", user: "مستخدم" };

const BTN_ICON: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "none",
  cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", fontSize: "0.82rem", transition: "background 0.2s",
};

export default function UserManagementPanel({ currentUser, onClose }: Props) {
  const [users, setUsers]           = useState<UserRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingUser, setEditingUser]           = useState<UserRecord | null>(null);
  const [selectedUserForLog, setSelectedUserForLog] = useState<UserRecord | null>(null);
  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<UserRecord | null>(null);

  const [formName,     setFormName]     = useState("");
  const [formLogin,    setFormLogin]    = useState("");
  const [formJob,      setFormJob]      = useState("");
  const [formRole,     setFormRole]     = useState("user");
  const [formPassword, setFormPassword] = useState("");
  const [formError,    setFormError]    = useState("");
  const [formBusy,     setFormBusy]     = useState(false);

  const adminHeaders = {
    "Content-Type": "application/json",
    "x-admin-login": currentUser.loginName,
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users", { headers: { "x-admin-login": currentUser.loginName } });
      if (r.ok) setUsers(await r.json() as UserRecord[]);
    } finally { setLoading(false); }
  }, [currentUser.loginName]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);
  useEffect(() => {
    const t = setInterval(() => void fetchUsers(), 30_000);
    return () => clearInterval(t);
  }, [fetchUsers]);

  const onlineCount = users.filter(u => isOnline(u.lastActive)).length;

  function openAdd() {
    setEditingUser(null);
    setFormName(""); setFormLogin(""); setFormJob("");
    setFormRole("user"); setFormPassword(""); setFormError("");
    setShowForm(true);
  }

  function openEdit(u: UserRecord) {
    setEditingUser(u);
    setFormName(u.name); setFormLogin(u.loginName); setFormJob(u.jobTitle);
    setFormRole(u.role); setFormPassword(""); setFormError("");
    setShowForm(true);
  }

  async function submitForm() {
    if (!formName.trim() || !formLogin.trim()) { setFormError("الاسم واسم الدخول مطلوبان"); return; }
    if (!editingUser && !formPassword.trim()) { setFormError("كلمة المرور مطلوبة للمستخدم الجديد"); return; }
    setFormBusy(true); setFormError("");
    try {
      const body: Record<string, string> = { name: formName, loginName: formLogin, jobTitle: formJob, role: formRole };
      if (formPassword) body.password = formPassword;
      const url    = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: adminHeaders, body: JSON.stringify(body) });
      if (!r.ok) { const j = await r.json() as { error?: string }; setFormError(j.error ?? "حدث خطأ"); return; }
      setShowForm(false);
      await fetchUsers();
    } finally { setFormBusy(false); }
  }

  async function doDelete(u: UserRecord) {
    await fetch(`/api/admin/users/${u.id}`, { method: "DELETE", headers: { "x-admin-login": currentUser.loginName } });
    setDeleteConfirm(null);
    await fetchUsers();
  }

  async function toggleActive(u: UserRecord) {
    await fetch(`/api/admin/users/${u.id}`, { method: "PUT", headers: adminHeaders, body: JSON.stringify({ isActive: u.isActive ? 0 : 1 }) });
    await fetchUsers();
  }

  async function openLogs(u: UserRecord) {
    setSelectedUserForLog(u);
    setLogsLoading(true);
    try {
      const r = await fetch(`/api/admin/users/${u.id}/logs`, { headers: { "x-admin-login": currentUser.loginName } });
      if (r.ok) setLogs(await r.json() as LogEntry[]);
    } finally { setLogsLoading(false); }
  }

  const panelStyle: React.CSSProperties = {
    background: "linear-gradient(160deg, #1a1510 0%, #110e0a 100%)",
    border: "1px solid rgba(197,160,89,0.4)",
    borderRadius: 20,
    width: "100%", maxWidth: 920,
    maxHeight: "90vh",
    display: "flex", flexDirection: "column",
    boxShadow: "0 32px 120px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(197,160,89,0.06)",
    overflow: "hidden",
    fontFamily: "Tajawal, sans-serif",
    direction: "rtl",
  };

  return (
    <>
      {/* MAIN OVERLAY */}
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.78)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}
      >
        <div style={panelStyle}>
          {/* ── HEADER ── */}
          <div style={{
            padding: "20px 26px 16px",
            borderBottom: "1px solid rgba(197,160,89,0.2)",
            background: "linear-gradient(135deg, rgba(197,160,89,0.07) 0%, transparent 60%)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Icon */}
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(197,160,89,0.12)", border: "1px solid rgba(197,160,89,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="1.8">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#fff" }}>إدارة المستخدمين</h2>
                <p style={{ margin: 0, fontSize: "0.65rem", color: "rgba(197,160,89,0.75)", letterSpacing: "0.06em" }}>USER MANAGEMENT — ALRAWAF SYSTEM</p>
              </div>
              {/* Online badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(43,170,116,0.1)", border: "1px solid rgba(43,170,116,0.28)", borderRadius: 20, padding: "5px 12px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2baa74", boxShadow: "0 0 8px #2baa74" }} />
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#2baa74" }}>{onlineCount} متصل الآن</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={openAdd}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #c5a059, #a88540)", border: "none", borderRadius: 10, color: "#fff", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif", boxShadow: "0 4px 16px rgba(197,160,89,0.3)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(197,160,89,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(197,160,89,0.3)"; }}
              >
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>+</span> إضافة مستخدم
              </button>
              <button
                onClick={onClose}
                style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
              >×</button>
            </div>
          </div>

          {/* ── TABLE ── */}
          <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 70, gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2.5px solid rgba(197,160,89,0.25)", borderTop: "2.5px solid #c5a059", animation: "sg-spin 0.8s linear infinite" }} />
                <span style={{ fontSize: "0.85rem", color: "rgba(197,160,89,0.65)" }}>جاري تحميل المستخدمين...</span>
              </div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.25)", fontSize: "0.85rem" }}>لا يوجد مستخدمون مسجلون بعد</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(197,160,89,0.15)" }}>
                    {["الحالة", "المستخدم", "اسم الدخول", "المسمى الوظيفي", "الصلاحية", "الإجراءات"].map(h => (
                      <th key={h} style={{ padding: "10px 20px", textAlign: "right", fontSize: "0.62rem", fontWeight: 700, color: "rgba(197,160,89,0.65)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => {
                    const online = isOnline(u.lastActive);
                    return (
                      <tr
                        key={u.id}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(197,160,89,0.04)")}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)")}
                      >
                        {/* Status dot */}
                        <td style={{ padding: "14px 20px", textAlign: "center" }}>
                          <div
                            title={online ? "متصل الآن" : u.lastActive ? `آخر ظهور: ${new Date(u.lastActive).toLocaleString("ar-SA")}` : "لم يسجل دخولاً بعد"}
                            style={{ width: 10, height: 10, borderRadius: "50%", background: online ? "#2baa74" : "#444", boxShadow: online ? "0 0 8px #2baa74" : "none", margin: "0 auto", transition: "all 0.3s" }}
                          />
                        </td>
                        {/* User name + avatar */}
                        <td style={{ padding: "12px 20px" }}>
                          <button
                            onClick={() => void openLogs(u)}
                            title="عرض سجل النشاط"
                            style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Tajawal, sans-serif" }}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              background: `linear-gradient(135deg, rgba(197,160,89,${0.15 + (u.id % 5) * 0.06}), rgba(197,160,89,0.05))`,
                              border: "1px solid rgba(197,160,89,0.3)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.7rem", fontWeight: 800, color: "#c5a059",
                            }}>
                              {getInitials(u.name)}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{u.name}</div>
                              <div style={{ fontSize: "0.6rem", color: u.isActive ? "rgba(43,170,116,0.8)" : "rgba(255,90,90,0.8)", fontWeight: 700 }}>{u.isActive ? "مفعّل" : "معطّل"}</div>
                            </div>
                          </button>
                        </td>
                        {/* Login name */}
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.6)", fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 6 }}>{u.loginName}</span>
                        </td>
                        {/* Job title */}
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>{u.jobTitle || "—"}</span>
                        </td>
                        {/* Role badge */}
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{
                            fontSize: "0.68rem", fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                            background: u.role === "admin" ? "rgba(197,160,89,0.14)" : "rgba(100,120,255,0.1)",
                            border: `1px solid ${u.role === "admin" ? "rgba(197,160,89,0.4)" : "rgba(100,120,255,0.22)"}`,
                            color: u.role === "admin" ? "#c5a059" : "rgba(150,160,255,0.9)",
                          }}>{ROLE_LABELS[u.role] ?? u.role}</span>
                        </td>
                        {/* Actions */}
                        <td style={{ padding: "12px 20px" }}>
                          <div style={{ display: "flex", gap: 7, justifyContent: "flex-end", alignItems: "center" }}>
                            <button
                              onClick={() => openEdit(u)} title="تعديل"
                              style={{ ...BTN_ICON, background: "rgba(197,160,89,0.1)", color: "#c5a059" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(197,160,89,0.22)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "rgba(197,160,89,0.1)")}
                            >✏️</button>
                            {u.loginName !== "admin" && (
                              <button
                                onClick={() => void toggleActive(u)}
                                title={u.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                                style={{ ...BTN_ICON, background: u.isActive ? "rgba(255,90,90,0.08)" : "rgba(43,170,116,0.1)", color: u.isActive ? "#ff6464" : "#2baa74", border: `1px solid ${u.isActive ? "rgba(255,90,90,0.25)" : "rgba(43,170,116,0.25)"}` }}
                              >{u.isActive ? "🚫" : "✅"}</button>
                            )}
                            {u.loginName !== "admin" ? (
                              <button
                                onClick={() => setDeleteConfirm(u)} title="حذف"
                                style={{ ...BTN_ICON, background: "rgba(200,40,40,0.08)", color: "#e05555", border: "1px solid rgba(200,40,40,0.22)" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,40,40,0.18)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "rgba(200,40,40,0.08)")}
                              >🗑️</button>
                            ) : (
                              <span title="المسؤول الرئيسي محمي من الحذف" style={{ fontSize: "0.6rem", color: "rgba(197,160,89,0.5)", padding: "4px 8px", border: "1px solid rgba(197,160,89,0.2)", borderRadius: 8, whiteSpace: "nowrap" }}>محمي 🔒</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── FOOTER STATS ── */}
          <div style={{ padding: "12px 28px", borderTop: "1px solid rgba(197,160,89,0.15)", display: "flex", gap: 28, flexShrink: 0, background: "rgba(0,0,0,0.25)" }}>
            {[
              { label: "إجمالي المستخدمين",  value: users.length },
              { label: "المفعّلون",           value: users.filter(u => u.isActive).length },
              { label: "المتصلون الآن",       value: onlineCount },
              { label: "المسؤولون",           value: users.filter(u => u.role === "admin").length },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#c5a059", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.38)", letterSpacing: "0.06em", marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ADD / EDIT FORM MODAL ── */}
      {showForm && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 9100, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{
            background: "linear-gradient(160deg, #1e1912 0%, #14100b 100%)",
            border: "1px solid rgba(197,160,89,0.4)", borderRadius: 18,
            padding: "28px 30px", width: "100%", maxWidth: 440,
            boxShadow: "0 24px 80px rgba(0,0,0,0.75)",
            fontFamily: "Tajawal, sans-serif", direction: "rtl",
          }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "1rem", fontWeight: 800, color: "#fff" }}>
              {editingUser ? `تعديل بيانات: ${editingUser.name}` : "إضافة مستخدم جديد"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {([
                { label: "الاسم الكامل",              value: formName,     set: setFormName,     type: "text",     req: true  },
                { label: "اسم الدخول (Username)",     value: formLogin,    set: setFormLogin,    type: "text",     req: true  },
                { label: "المسمى الوظيفي",            value: formJob,      set: setFormJob,      type: "text",     req: false },
                { label: editingUser ? "كلمة مرور جديدة (اتركها فارغة للإبقاء)" : "كلمة المرور", value: formPassword, set: setFormPassword, type: "password", req: !editingUser },
              ] as const).map((f, i) => (
                <div key={i}>
                  <label style={{ display: "block", fontSize: "0.63rem", color: "rgba(197,160,89,0.82)", fontWeight: 700, marginBottom: 5, letterSpacing: "0.05em" }}>
                    {f.label}{f.req && <span style={{ color: "#e05050" }}> *</span>}
                  </label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={e => { f.set(e.target.value); setFormError(""); }}
                    style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(197,160,89,0.28)", borderRadius: 9, color: "#fff", fontSize: "0.87rem", fontFamily: "Tajawal, sans-serif", direction: "rtl", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(197,160,89,0.7)")}
                    onBlur={e  => (e.target.style.borderColor = "rgba(197,160,89,0.28)")}
                  />
                </div>
              ))}
              {editingUser?.loginName !== "admin" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.63rem", color: "rgba(197,160,89,0.82)", fontWeight: 700, marginBottom: 5, letterSpacing: "0.05em" }}>الصلاحية</label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", background: "rgba(20,16,11,0.98)", border: "1.5px solid rgba(197,160,89,0.28)", borderRadius: 9, color: "#fff", fontSize: "0.87rem", fontFamily: "Tajawal, sans-serif", direction: "rtl", outline: "none", boxSizing: "border-box", cursor: "pointer" }}
                  >
                    <option value="user">مستخدم</option>
                    <option value="admin">مسؤول</option>
                  </select>
                </div>
              )}
              {formError && (
                <div style={{ background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: 8, padding: "9px 12px", fontSize: "0.74rem", color: "#e05050", fontWeight: 600 }}>
                  ⚠ {formError}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => void submitForm()}
                  disabled={formBusy}
                  style={{ flex: 1, padding: "12px", background: formBusy ? "rgba(197,160,89,0.35)" : "linear-gradient(135deg, #c5a059, #a88540)", border: "none", borderRadius: 10, color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: formBusy ? "not-allowed" : "pointer", fontFamily: "Tajawal, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {formBusy ? (
                    <><span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", display: "inline-block", animation: "sg-spin 0.7s linear infinite" }} />جاري الحفظ...</>
                  ) : editingUser ? "حفظ التعديلات" : "إضافة مستخدم"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ padding: "12px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}
                >إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVITY LOG MODAL ── */}
      {selectedUserForLog && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelectedUserForLog(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 9100, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{
            background: "linear-gradient(160deg, #1e1912 0%, #14100b 100%)",
            border: "1px solid rgba(197,160,89,0.4)", borderRadius: 18,
            width: "100%", maxWidth: 500,
            maxHeight: "72vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 24px 80px rgba(0,0,0,0.75)",
            fontFamily: "Tajawal, sans-serif", direction: "rtl", overflow: "hidden",
          }}>
            {/* Log header */}
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid rgba(197,160,89,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>سجل نشاط المستخدم</h3>
                <p style={{ margin: "3px 0 0", fontSize: "0.7rem", color: "rgba(197,160,89,0.75)" }}>
                  {selectedUserForLog.name} · {selectedUserForLog.loginName} · آخر 30 يوماً
                </p>
              </div>
              <button
                onClick={() => setSelectedUserForLog(null)}
                style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}
              >×</button>
            </div>
            {/* Status banner */}
            <div style={{ padding: "9px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.22)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline(selectedUserForLog.lastActive) ? "#2baa74" : "#555", boxShadow: isOnline(selectedUserForLog.lastActive) ? "0 0 6px #2baa74" : "none" }} />
              <span style={{ fontSize: "0.7rem", color: isOnline(selectedUserForLog.lastActive) ? "#2baa74" : "rgba(255,255,255,0.38)", fontWeight: 700 }}>
                {isOnline(selectedUserForLog.lastActive) ? "متصل الآن" : selectedUserForLog.lastActive ? `آخر ظهور: ${new Date(selectedUserForLog.lastActive).toLocaleString("ar-SA")}` : "لم يسجل دخولاً"}
              </span>
              <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.28)", marginRight: "auto" }}>{logs.length} عملية دخول في 7 أيام</span>
            </div>
            {/* Log entries */}
            <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
              {logsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(197,160,89,0.3)", borderTop: "2px solid #c5a059", animation: "sg-spin 0.8s linear infinite" }} />
                </div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: "center", padding: 50, color: "rgba(255,255,255,0.22)", fontSize: "0.82rem" }}>لا توجد عمليات دخول خلال آخر 7 أيام</div>
              ) : logs.map((log, i) => {
                const dt = new Date(log.loginAt);
                return (
                  <div
                    key={log.id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 22px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(197,160,89,0.09)", border: "1px solid rgba(197,160,89,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>🔑</div>
                      <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff" }}>تسجيل دخول</div>
                        <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)" }}>ID #{log.id}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "left", direction: "ltr" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c5a059" }}>
                        {dt.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </div>
                      <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.42)" }}>
                        {dt.toLocaleDateString("ar-SA", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteConfirm && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 9200, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{ background: "#1e1810", border: "1px solid rgba(200,40,40,0.4)", borderRadius: 16, padding: "26px 28px", maxWidth: 380, width: "100%", textAlign: "center", fontFamily: "Tajawal, sans-serif", direction: "rtl", boxShadow: "0 16px 60px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 10 }}>⚠️</div>
            <h3 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#fff" }}>تأكيد حذف المستخدم</h3>
            <p style={{ margin: "0 0 22px", fontSize: "0.82rem", color: "rgba(255,255,255,0.58)", lineHeight: 1.75 }}>
              هل تريد حذف مستخدم <strong style={{ color: "#fff" }}>{deleteConfirm.name}</strong> نهائياً؟<br />
              <span style={{ fontSize: "0.72rem", color: "rgba(255,90,90,0.75)" }}>سيتم حذف جميع سجلات نشاطه بشكل دائم</span>
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => void doDelete(deleteConfirm)}
                style={{ flex: 1, padding: "11px", background: "linear-gradient(135deg, #c0392b, #962820)", border: "none", borderRadius: 10, color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}
              >نعم، احذف نهائياً</button>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: "11px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "rgba(255,255,255,0.65)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "Tajawal, sans-serif" }}
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
