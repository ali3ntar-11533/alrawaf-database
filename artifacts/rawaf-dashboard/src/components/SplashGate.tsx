import { useState, useEffect, useRef } from "react";
import logoImg from "@assets/logo_1776260992247.jpg";

const GATE_KEY = "rawaf_gate_auth";

const KEYFRAMES = `
@keyframes sg-float-a {
  0%,100% { transform: translateY(0px) rotate(0deg) scale(1); opacity: 0.35; }
  33%      { transform: translateY(-28px) rotate(8deg) scale(1.05); opacity: 0.55; }
  66%      { transform: translateY(14px) rotate(-4deg) scale(0.97); opacity: 0.4; }
}
@keyframes sg-float-b {
  0%,100% { transform: translateY(0px) rotate(0deg); opacity: 0.2; }
  50%      { transform: translateY(-18px) rotate(180deg); opacity: 0.38; }
}
@keyframes sg-float-c {
  0%,100% { transform: translateX(0px) scale(1); opacity: 0.25; }
  50%      { transform: translateX(22px) scale(1.08); opacity: 0.45; }
}
@keyframes sg-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes sg-spin-rev {
  from { transform: rotate(0deg); }
  to   { transform: rotate(-360deg); }
}
@keyframes sg-pulse-btn {
  0%,100% { box-shadow: 0 0 0 0 rgba(197,160,89,0.55), 0 8px 32px rgba(197,160,89,0.3); }
  50%      { box-shadow: 0 0 0 14px rgba(197,160,89,0), 0 12px 48px rgba(197,160,89,0.45); }
}
@keyframes sg-shimmer-btn {
  0%   { background-position: -300% center; }
  100% { background-position: 300% center; }
}
@keyframes sg-fadeup {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sg-fadein {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes sg-scalein {
  from { opacity: 0; transform: scale(0.88) translateY(24px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes sg-logo-glow {
  0%,100% { filter: drop-shadow(0 0 0px rgba(197,160,89,0)); }
  50%      { filter: drop-shadow(0 0 18px rgba(197,160,89,0.45)); }
}
@keyframes sg-grid-move {
  0%   { transform: translateY(0); }
  100% { transform: translateY(60px); }
}
@keyframes sg-shake {
  0%,100% { transform: translateX(0); }
  20%      { transform: translateX(-6px); }
  40%      { transform: translateX(6px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}
`;

export default function SplashGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"splash" | "app">(() =>
    sessionStorage.getItem(GATE_KEY) === "1" ? "app" : "splash"
  );
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [busy, setBusy]           = useState(false);
  const [shake, setShake]         = useState(false);
  const [btnHover, setBtnHover]   = useState(false);
  const [loginBtnHover, setLoginBtnHover] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  useEffect(() => {
    if (showLogin) setTimeout(() => userRef.current?.focus(), 80);
  }, [showLogin]);

  if (phase === "app") return <>{children}</>;

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setTimeout(() => {
      if (username.trim() === "admin" && password === "maged@2026") {
        sessionStorage.setItem(GATE_KEY, "1");
        setPhase("app");
      } else {
        setError("بيانات الدخول غير صحيحة");
        setBusy(false);
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    }, 700);
  }

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Tajawal, sans-serif", overflow: "hidden",
        background: "linear-gradient(160deg, #0f0c08 0%, #1c1410 35%, #100e0a 65%, #1a1208 100%)",
      }}
    >

      {/* ── Animated background grid ── */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(197,160,89,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(197,160,89,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        animation: "sg-grid-move 8s linear infinite",
      }} />

      {/* ── Decorative floating shapes ── */}
      <div style={{
        position: "absolute", top: "8%", right: "6%",
        width: 220, height: 220, borderRadius: "50%",
        border: "1.5px solid rgba(197,160,89,0.18)",
        animation: "sg-float-a 9s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", top: "12%", right: "9%",
        width: 120, height: 120, borderRadius: "50%",
        border: "1px solid rgba(197,160,89,0.12)",
        animation: "sg-float-a 9s ease-in-out infinite 1.5s",
      }} />
      <div style={{
        position: "absolute", bottom: "10%", left: "5%",
        width: 260, height: 260, borderRadius: "50%",
        border: "1.5px solid rgba(197,160,89,0.14)",
        animation: "sg-float-b 11s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", top: "40%", left: "3%",
        width: 80, height: 80,
        border: "1px solid rgba(197,160,89,0.2)",
        transform: "rotate(45deg)",
        animation: "sg-float-c 7s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", top: "20%", left: "15%",
        width: 40, height: 40,
        border: "1px solid rgba(197,160,89,0.18)",
        transform: "rotate(45deg)",
        animation: "sg-float-c 7s ease-in-out infinite 2s",
      }} />
      <div style={{
        position: "absolute", bottom: "18%", right: "8%",
        width: 60, height: 60,
        border: "1px solid rgba(197,160,89,0.15)",
        transform: "rotate(45deg)",
        animation: "sg-float-a 8s ease-in-out infinite 3s",
      }} />
      {/* Spinning ring top-left */}
      <div style={{
        position: "absolute", top: "5%", left: "8%",
        width: 150, height: 150, borderRadius: "50%",
        border: "1px dashed rgba(197,160,89,0.12)",
        animation: "sg-spin 30s linear infinite",
      }} />
      <div style={{
        position: "absolute", top: "5%", left: "8%",
        width: 110, height: 110, borderRadius: "50%",
        margin: "20px",
        border: "1px dashed rgba(197,160,89,0.08)",
        animation: "sg-spin-rev 20s linear infinite",
      }} />
      {/* Bottom right glow */}
      <div style={{
        position: "absolute", bottom: "-60px", right: "-60px",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(197,160,89,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      {/* Top center glow */}
      <div style={{
        position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)",
        width: 500, height: 300,
        background: "radial-gradient(ellipse, rgba(197,160,89,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── رؤية 2030 badge — top left ── */}
      <div style={{
        position: "absolute", top: 28, left: 32,
        animation: "sg-fadein 1s ease 0.3s both",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(197,160,89,0.07)",
          border: "1px solid rgba(197,160,89,0.2)",
          borderRadius: 10, padding: "6px 14px",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #2b5f34, #1a4a24)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.45rem", fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.2,
          }}>
            <span>رؤية<br />2030</span>
          </div>
          <div>
            <div style={{ fontSize: "0.55rem", color: "rgba(197,160,89,0.6)", letterSpacing: "0.1em" }}>VISION</div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>رؤية المملكة 2030</div>
          </div>
        </div>
      </div>

      {/* ── مجموعة ساكف — top right ── */}
      <div style={{
        position: "absolute", top: 28, right: 32,
        animation: "sg-fadein 1s ease 0.3s both",
      }}>
        <div style={{
          fontSize: "0.6rem", color: "rgba(197,160,89,0.45)",
          letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "left",
          lineHeight: 1.8,
        }}>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.52rem" }}>شركة تابعة لـ</div>
          مجموعة ساكف القابضة
        </div>
      </div>

      {/* ── Main center card ── */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "0 24px", maxWidth: 540,
        animation: "sg-fadeup 0.9s ease 0.1s both",
      }}>

        {/* Logo */}
        <div style={{
          width: 110, height: 110, borderRadius: 24,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(197,160,89,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 14, marginBottom: 28,
          boxShadow: "0 12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          animation: "sg-logo-glow 4s ease-in-out infinite",
        }}>
          <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* Company name */}
        <div style={{
          fontSize: "0.55rem", color: "rgba(197,160,89,0.55)",
          letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10,
          fontFamily: "'Inter', sans-serif",
        }}>
          ALRAWAF CONTRACTING COMPANY
        </div>
        <h1 style={{
          fontSize: "1.85rem", fontWeight: 900,
          color: "#ffffff", lineHeight: 1.25, marginBottom: 10,
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
        }}>
          شركة الرواف للمقاولات
        </h1>
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 6,
          justifyContent: "center",
        }}>
          <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.5))" }} />
          <span style={{ fontSize: "0.72rem", color: "rgba(197,160,89,0.7)", fontWeight: 600, letterSpacing: "0.06em" }}>
            نظام إدارة الموردين والمقاولين
          </span>
          <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, rgba(197,160,89,0.5), transparent)" }} />
        </div>
        <p style={{
          fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.9,
          maxWidth: 360, marginBottom: 44,
        }}>
          منصة داخلية متكاملة لإدارة بيانات المقاولين والموردين<br />
          وتحليل الأسعار وتنسيق المشاريع الإنشائية
        </p>

        {/* Stats row */}
        <div style={{
          display: "flex", gap: 32, marginBottom: 50, justifyContent: "center",
          animation: "sg-fadein 1s ease 0.5s both",
        }}>
          {[
            { value: "١٩٩٦", label: "تأسست عام" },
            { value: "+٣٠", label: "عام خبرة" },
            { value: "ISO", label: "شهادة الجودة" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "1.1rem", fontWeight: 900,
                color: "var(--gold, #c5a059)", lineHeight: 1,
                marginBottom: 4, direction: "ltr",
              }}>{s.value}</div>
              <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={() => { setShowLogin(true); setError(""); setUsername(""); setPassword(""); }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            padding: "16px 48px",
            background: btnHover
              ? "linear-gradient(135deg, #d4b070, #c5a059, #a88540, #c5a059)"
              : "linear-gradient(135deg, #c5a059 0%, #a88540 50%, #c5a059 100%)",
            backgroundSize: "300% auto",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontSize: "0.95rem",
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "Tajawal, sans-serif",
            letterSpacing: "0.04em",
            animation: "sg-pulse-btn 2.8s ease-in-out infinite",
            transition: "transform 0.2s ease, background 0.3s ease",
            transform: btnHover ? "translateY(-3px) scale(1.03)" : "none",
            display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🔐</span>
          الدخول للنظام الآمن
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)", fontSize: "0.7rem",
            transform: btnHover ? "translateX(-3px)" : "none",
            transition: "transform 0.2s",
          }}>←</span>
        </button>

        {/* Secure badge */}
        <div style={{
          marginTop: 22, display: "flex", alignItems: "center", gap: 7,
          animation: "sg-fadein 1s ease 0.7s both",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2baa74", boxShadow: "0 0 6px #2baa74" }} />
          <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.22)", letterSpacing: "0.08em" }}>
            بيئة آمنة ومشفرة • للاستخدام الداخلي فقط
          </span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        fontSize: "0.55rem", color: "rgba(255,255,255,0.18)", whiteSpace: "nowrap",
        letterSpacing: "0.08em", animation: "sg-fadein 1s ease 0.8s both",
      }}>
        © 2026 شركة الرواف للمقاولات — جميع الحقوق محفوظة
      </div>

      {/* ══════════════ Login Modal ══════════════ */}
      {showLogin && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(6px)",
            animation: "sg-fadein 0.25s ease both",
          }}
        >
          <div
            style={{
              background: "linear-gradient(160deg, #1e1a14 0%, #161210 100%)",
              border: "1px solid rgba(197,160,89,0.3)",
              borderRadius: 20,
              padding: "40px 36px",
              width: "100%", maxWidth: 400,
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(197,160,89,0.1) inset",
              animation: "sg-scalein 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
              position: "relative",
            }}
            style2={{ animation: shake ? "sg-shake 0.5s ease" : undefined } as any}
          >
            {/* Shake wrapper */}
            <div style={{ animation: shake ? "sg-shake 0.5s ease" : "none" }}>

              {/* Close */}
              <button
                onClick={() => setShowLogin(false)}
                style={{
                  position: "absolute", top: 16, left: 16,
                  width: 30, height: 30, borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.85rem", lineHeight: 1,
                }}
              >×</button>

              {/* Modal logo */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 16,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(197,160,89,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 10, margin: "0 auto 14px",
                }}>
                  <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <div style={{ fontSize: "0.52rem", color: "rgba(197,160,89,0.5)", letterSpacing: "0.14em", marginBottom: 5 }}>
                  ALRAWAF CONTRACTING
                </div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                  تسجيل الدخول
                </h2>
                <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                  أدخل بيانات الدخول للوصول إلى النظام
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Username */}
                <div>
                  <label style={{
                    display: "block", fontSize: "0.62rem", color: "rgba(197,160,89,0.7)",
                    fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em",
                  }}>
                    اسم المستخدم
                  </label>
                  <input
                    ref={userRef}
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    placeholder="أدخل اسم المستخدم"
                    autoComplete="username"
                    style={{
                      width: "100%", padding: "12px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${error ? "#e74c3c" : "rgba(197,160,89,0.2)"}`,
                      borderRadius: 10, color: "#fff",
                      fontSize: "0.88rem", fontFamily: "Tajawal, sans-serif",
                      direction: "rtl", outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(197,160,89,0.6)")}
                    onBlur={(e) => (e.target.style.borderColor = error ? "#e74c3c" : "rgba(197,160,89,0.2)")}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{
                    display: "block", fontSize: "0.62rem", color: "rgba(197,160,89,0.7)",
                    fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em",
                  }}>
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="أدخل كلمة المرور"
                    autoComplete="current-password"
                    style={{
                      width: "100%", padding: "12px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${error ? "#e74c3c" : "rgba(197,160,89,0.2)"}`,
                      borderRadius: 10, color: "#fff",
                      fontSize: "0.88rem", fontFamily: "Tajawal, sans-serif",
                      direction: "rtl", outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(197,160,89,0.6)")}
                    onBlur={(e) => (e.target.style.borderColor = error ? "#e74c3c" : "rgba(197,160,89,0.2)")}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: "rgba(231,76,60,0.1)",
                    border: "1px solid rgba(231,76,60,0.3)",
                    borderRadius: 8, padding: "9px 12px",
                    fontSize: "0.75rem", color: "#e74c3c", fontWeight: 600,
                  }}>
                    <span>⚠</span>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={busy}
                  onMouseEnter={() => setLoginBtnHover(true)}
                  onMouseLeave={() => setLoginBtnHover(false)}
                  style={{
                    marginTop: 4,
                    padding: "13px",
                    background: busy
                      ? "rgba(197,160,89,0.4)"
                      : loginBtnHover
                      ? "linear-gradient(135deg, #d4b070, #c5a059)"
                      : "linear-gradient(135deg, #c5a059, #a88540)",
                    color: "#fff", border: "none",
                    borderRadius: 12, fontSize: "0.92rem",
                    fontWeight: 800, cursor: busy ? "not-allowed" : "pointer",
                    fontFamily: "Tajawal, sans-serif",
                    transition: "all 0.2s ease",
                    transform: loginBtnHover && !busy ? "translateY(-1px)" : "none",
                    boxShadow: loginBtnHover && !busy ? "0 6px 24px rgba(197,160,89,0.4)" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {busy ? (
                    <>
                      <span style={{
                        width: 14, height: 14, borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTop: "2px solid #fff",
                        display: "inline-block",
                        animation: "sg-spin 0.7s linear infinite",
                      }} />
                      جاري التحقق...
                    </>
                  ) : "تسجيل الدخول"}
                </button>
              </form>

              {/* Footer note */}
              <div style={{
                marginTop: 20, textAlign: "center",
                fontSize: "0.57rem", color: "rgba(255,255,255,0.2)",
                lineHeight: 1.7,
              }}>
                للاستخدام الداخلي الرسمي فقط<br />
                شركة الرواف للمقاولات — نظام إدارة الموردين
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
