import { useState, useEffect, useRef } from "react";
import logoImg from "@assets/logo_1776260992247.jpg";
import bgPhoto from "@assets/screenshot-1776492202470.png";

const GATE_KEY = "rawaf_gate_auth";

const KEYFRAMES = `
@keyframes sg-ken-burns-1 {
  0%   { transform: scale(1)    translate(0%,    0%);    }
  100% { transform: scale(1.18) translate(-2.5%, -1.5%); }
}
@keyframes sg-ken-burns-2 {
  0%   { transform: scale(1.12) translate(2%, 1%);  }
  100% { transform: scale(1)    translate(-1%, 0%); }
}
@keyframes sg-ken-burns-3 {
  0%   { transform: scale(1)    translate(0%, 2%);   }
  100% { transform: scale(1.14) translate(1.5%, -1%); }
}
@keyframes sg-bp-move {
  0%   { transform: translate(0, 0);    }
  100% { transform: translate(60px, 60px); }
}
@keyframes sg-glow-pulse {
  0%,100% { opacity: 0.12; transform: scale(1);    }
  50%      { opacity: 0.28; transform: scale(1.08); }
}
@keyframes sg-float-a {
  0%,100% { transform: translateY(0px)   rotate(0deg)   scale(1);    opacity: 0.4; }
  33%      { transform: translateY(-24px) rotate(6deg)   scale(1.04); opacity: 0.6; }
  66%      { transform: translateY(12px)  rotate(-3deg)  scale(0.97); opacity: 0.45; }
}
@keyframes sg-float-b {
  0%,100% { transform: translateY(0px)   rotate(0deg);  opacity: 0.25; }
  50%      { transform: translateY(-18px) rotate(180deg);opacity: 0.45; }
}
@keyframes sg-float-c {
  0%,100% { transform: translateX(0px)  scale(1);    opacity: 0.3; }
  50%      { transform: translateX(20px) scale(1.07); opacity: 0.5; }
}
@keyframes sg-spin      { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
@keyframes sg-spin-rev  { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
@keyframes sg-pulse-btn {
  0%,100% { box-shadow: 0 0 0 0   rgba(197,160,89,0.55), 0 8px 32px rgba(197,160,89,0.30); }
  50%      { box-shadow: 0 0 0 14px rgba(197,160,89,0),   0 12px 48px rgba(197,160,89,0.50); }
}
@keyframes sg-fadeup {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes sg-fadein   { from { opacity: 0; } to { opacity: 1; } }
@keyframes sg-scalein  {
  from { opacity: 0; transform: scale(0.88) translateY(24px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);    }
}
@keyframes sg-logo-glow {
  0%,100% { box-shadow: 0 12px 48px rgba(0,0,0,0.55), 0 0 0px  rgba(197,160,89,0);    }
  50%      { box-shadow: 0 12px 48px rgba(0,0,0,0.55), 0 0 28px rgba(197,160,89,0.42); }
}
@keyframes sg-shake {
  0%,100% { transform: translateX(0);  }
  20%      { transform: translateX(-7px); }
  40%      { transform: translateX(7px);  }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px);  }
}
@keyframes sg-particle {
  0%   { transform: translateY(0px)   rotate(0deg);   opacity: 0.6; }
  100% { transform: translateY(-80px) rotate(45deg);  opacity: 0;   }
}
`;

/* ── Slide definitions ──────────────────────────────────────────────────── */
const SLIDES = [
  {
    type: "photo",
    kbAnim: "sg-ken-burns-1 22s ease-out infinite alternate",
  },
  {
    /* Blueprint / engineering night scene */
    type: "css",
    bg: "linear-gradient(160deg, #060e1e 0%, #0b1830 40%, #030c1a 100%)",
    kbAnim: "sg-ken-burns-2 20s ease-in-out infinite alternate",
  },
  {
    /* Construction site / molten steel */
    type: "css",
    bg: "linear-gradient(160deg, #100804 0%, #221208 40%, #0d0502 100%)",
    kbAnim: "sg-ken-burns-3 24s ease-in-out infinite alternate",
  },
];

const SLIDE_DURATION = 7000;

export default function SplashGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"splash" | "app">(() =>
    sessionStorage.getItem(GATE_KEY) === "1" ? "app" : "splash"
  );
  const [slideIdx, setSlideIdx] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername]  = useState("");
  const [password, setPassword]  = useState("");
  const [error, setError]        = useState("");
  const [busy, setBusy]          = useState(false);
  const [shake, setShake]        = useState(false);
  const [btnHover, setBtnHover]  = useState(false);
  const [lBtnHover, setLBtnHover] = useState(false);
  const [logoutHover, setLogoutHover] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);

  /* Inject keyframes */
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  /* Slideshow timer */
  useEffect(() => {
    if (phase !== "splash") return;
    const t = setInterval(() => setSlideIdx(i => (i + 1) % SLIDES.length), SLIDE_DURATION);
    return () => clearInterval(t);
  }, [phase]);

  /* Focus username on login open */
  useEffect(() => {
    if (showLogin) setTimeout(() => userRef.current?.focus(), 80);
  }, [showLogin]);

  /* ── Logout ── */
  function handleLogout() {
    sessionStorage.removeItem(GATE_KEY);
    setPhase("splash");
    setShowLogin(false);
    setUsername("");
    setPassword("");
    setError("");
  }

  /* ── App (authenticated) wrapper ── */
  if (phase === "app") {
    return (
      <div style={{ position: "relative" }}>
        {children}
        {/* Floating logout button — fixed, bottom-left, never overlaps header */}
        <button
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
          title="تسجيل الخروج"
          style={{
            position: "fixed", bottom: 22, left: 22, zIndex: 9998,
            display: "flex", alignItems: "center", gap: 7,
            background: logoutHover
              ? "linear-gradient(135deg, #2c2420, #1a1410)"
              : "rgba(20,16,12,0.82)",
            color: logoutHover ? "#c5a059" : "rgba(255,255,255,0.5)",
            border: `1px solid ${logoutHover ? "rgba(197,160,89,0.45)" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "Tajawal, sans-serif",
            backdropFilter: "blur(10px)",
            boxShadow: logoutHover
              ? "0 6px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(197,160,89,0.15)"
              : "0 4px 16px rgba(0,0,0,0.4)",
            transition: "all 0.22s ease",
            transform: logoutHover ? "translateY(-2px)" : "none",
            direction: "rtl",
          }}
        >
          <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>🚪</span>
          تسجيل الخروج
        </button>
      </div>
    );
  }

  /* ── Login handler ── */
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

  /* ─────────────────── SPLASH RENDER ─────────────────── */
  return (
    <div
      dir="rtl"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Tajawal, sans-serif", overflow: "hidden",
        background: "#080604",
      }}
    >

      {/* ═══ BACKGROUND SLIDESHOW ═══ */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            style={{
              position: "absolute", inset: 0,
              opacity: slideIdx === i ? 1 : 0,
              transition: "opacity 2s ease",
              overflow: "hidden",
            }}
          >
            {slide.type === "photo" ? (
              /* Real photo slide with Ken Burns */
              <div style={{
                position: "absolute", inset: "-8%",
                backgroundImage: `url(${bgPhoto})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
                animation: slide.kbAnim,
              }} />
            ) : (
              /* CSS cinematic slide */
              <div style={{
                position: "absolute", inset: 0,
                background: slide.bg,
                animation: slide.kbAnim,
              }}>
                {/* Blueprint grid overlay (slide 1 — blue) */}
                {i === 1 && (
                  <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `
                      linear-gradient(rgba(59,139,204,0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(59,139,204,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: "40px 40px",
                    animation: "sg-bp-move 12s linear infinite",
                  }} />
                )}
                {/* Molten glow (slide 2 — orange/red) */}
                {i === 2 && (
                  <>
                    <div style={{
                      position: "absolute", bottom: "10%", right: "20%",
                      width: 500, height: 300, borderRadius: "50%",
                      background: "radial-gradient(ellipse, rgba(220,100,20,0.25) 0%, transparent 70%)",
                      animation: "sg-glow-pulse 5s ease-in-out infinite",
                    }} />
                    <div style={{
                      position: "absolute", top: "20%", left: "30%",
                      width: 300, height: 200, borderRadius: "50%",
                      background: "radial-gradient(ellipse, rgba(197,160,89,0.15) 0%, transparent 70%)",
                      animation: "sg-glow-pulse 7s ease-in-out infinite 2s",
                    }} />
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {/* ── Multi-layer overlay for depth ── */}
        {/* Bottom dark vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }} />
        {/* Sides vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.5) 100%)",
          pointerEvents: "none",
        }} />
        {/* Warm gold tint overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(18,12,6,0.4)",
          pointerEvents: "none",
        }} />
      </div>

      {/* ═══ SLIDE INDICATORS ═══ */}
      <div style={{
        position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 8, zIndex: 10,
      }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => setSlideIdx(i)}
            style={{
              width: slideIdx === i ? 28 : 8, height: 4, borderRadius: 3,
              background: slideIdx === i ? "#c5a059" : "rgba(255,255,255,0.25)",
              transition: "all 0.4s ease", cursor: "pointer",
            }}
          />
        ))}
      </div>

      {/* ═══ DECORATIVE FLOATING SHAPES ═══ */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
        <div style={{ position: "absolute", top: "10%", right: "7%", width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(197,160,89,0.2)", animation: "sg-float-a 10s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "14%", right: "10%", width: 100, height: 100, borderRadius: "50%", border: "1px solid rgba(197,160,89,0.12)", animation: "sg-float-a 10s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", bottom: "12%", left: "6%", width: 240, height: 240, borderRadius: "50%", border: "1px solid rgba(197,160,89,0.14)", animation: "sg-float-b 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "42%", left: "4%", width: 70, height: 70, border: "1px solid rgba(197,160,89,0.22)", transform: "rotate(45deg)", animation: "sg-float-c 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "22%", left: "18%", width: 38, height: 38, border: "1px solid rgba(197,160,89,0.18)", transform: "rotate(45deg)", animation: "sg-float-c 8s ease-in-out infinite 2.5s" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "9%", width: 55, height: 55, border: "1px solid rgba(197,160,89,0.16)", transform: "rotate(45deg)", animation: "sg-float-a 9s ease-in-out infinite 3s" }} />
        {/* Spinning rings */}
        <div style={{ position: "absolute", top: "6%", left: "9%", width: 140, height: 140, borderRadius: "50%", border: "1px dashed rgba(197,160,89,0.12)", animation: "sg-spin 35s linear infinite" }} />
        <div style={{ position: "absolute", top: "6%", left: "9%", width: 100, height: 100, margin: "20px", borderRadius: "50%", border: "1px dashed rgba(197,160,89,0.08)", animation: "sg-spin-rev 25s linear infinite" }} />
        {/* Corner glow */}
        <div style={{ position: "absolute", bottom: "-60px", right: "-60px", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(197,160,89,0.09) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)", width: 600, height: 320, background: "radial-gradient(ellipse, rgba(197,160,89,0.07) 0%, transparent 70%)" }} />
      </div>

      {/* ═══ رؤية 2030 BADGE ═══ */}
      <div style={{ position: "absolute", top: 28, left: 32, zIndex: 20, animation: "sg-fadein 1s ease 0.3s both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(197,160,89,0.08)", border: "1px solid rgba(197,160,89,0.22)", borderRadius: 10, padding: "6px 14px", backdropFilter: "blur(10px)" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #2b5f34, #1a4a24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.42rem", fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.3 }}>
            <span>رؤية<br />2030</span>
          </div>
          <div>
            <div style={{ fontSize: "0.52rem", color: "rgba(197,160,89,0.55)", letterSpacing: "0.12em" }}>VISION</div>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>رؤية المملكة 2030</div>
          </div>
        </div>
      </div>

      {/* ═══ TOP RIGHT LABEL ═══ */}
      <div style={{ position: "absolute", top: 34, right: 32, zIndex: 20, animation: "sg-fadein 1s ease 0.3s both", textAlign: "left" }}>
        <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em", textTransform: "uppercase" }}>شركة تابعة لـ</div>
        <div style={{ fontSize: "0.62rem", color: "rgba(197,160,89,0.5)", fontWeight: 700, letterSpacing: "0.1em" }}>مجموعة ساكف القابضة</div>
      </div>

      {/* ═══ MAIN CENTER CONTENT ═══ */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 24px", maxWidth: 560, animation: "sg-fadeup 0.9s ease 0.1s both" }}>

        {/* Logo */}
        <div style={{ width: 108, height: 108, borderRadius: 22, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(197,160,89,0.3)", display: "flex", alignItems: "center", justifyContent: "center", padding: 13, marginBottom: 26, animation: "sg-logo-glow 4s ease-in-out infinite", backdropFilter: "blur(10px)" }}>
          <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* EN brand */}
        <div style={{ fontSize: "0.54rem", color: "rgba(197,160,89,0.55)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 9, fontFamily: "'Inter', sans-serif" }}>
          ALRAWAF CONTRACTING COMPANY
        </div>

        {/* AR company name */}
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.22, marginBottom: 10, textShadow: "0 4px 24px rgba(0,0,0,0.7)" }}>
          شركة الرواف للمقاولات
        </h1>

        {/* Divider + subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, justifyContent: "center" }}>
          <div style={{ width: 44, height: 1, background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.55))" }} />
          <span style={{ fontSize: "0.74rem", color: "rgba(197,160,89,0.75)", fontWeight: 600, letterSpacing: "0.04em" }}>نظام إدارة الموردين والمقاولين</span>
          <div style={{ width: 44, height: 1, background: "linear-gradient(90deg, rgba(197,160,89,0.55), transparent)" }} />
        </div>

        {/* Description */}
        <p style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.32)", lineHeight: 2, maxWidth: 380, marginBottom: 40, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
          منصة داخلية متكاملة لإدارة بيانات المقاولين والموردين<br />
          وتحليل الأسعار وتنسيق المشاريع الإنشائية
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 36, marginBottom: 46, justifyContent: "center", animation: "sg-fadein 1s ease 0.5s both" }}>
          {[
            { value: "١٩٩٦", label: "تأسست عام" },
            { value: "+٣٠", label: "عام خبرة" },
            { value: "ISO", label: "شهادة الجودة" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#c5a059", lineHeight: 1, marginBottom: 5, direction: "ltr", textShadow: "0 0 20px rgba(197,160,89,0.3)" }}>{s.value}</div>
              <div style={{ fontSize: "0.54rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => { setShowLogin(true); setError(""); setUsername(""); setPassword(""); }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            padding: "16px 52px",
            backgroundImage: "linear-gradient(135deg, #c5a059 0%, #a88540 50%, #c5a059 100%)",
            backgroundSize: "300% auto",
            backgroundColor: "#c5a059",
            color: "#fff", border: "none", borderRadius: 14,
            fontSize: "0.95rem", fontWeight: 800, cursor: "pointer",
            fontFamily: "Tajawal, sans-serif", letterSpacing: "0.04em",
            animation: "sg-pulse-btn 2.8s ease-in-out infinite",
            transition: "transform 0.22s ease, box-shadow 0.22s ease",
            transform: btnHover ? "translateY(-4px) scale(1.04)" : "none",
            boxShadow: btnHover ? "0 16px 48px rgba(197,160,89,0.5)" : undefined,
            display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <span style={{ fontSize: "1.05rem" }}>🔐</span>
          الدخول للنظام الآمن
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.22)", fontSize: "0.7rem", transition: "transform 0.2s", transform: btnHover ? "translateX(-3px)" : "none" }}>←</span>
        </button>

        {/* Secure badge */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 7, animation: "sg-fadein 1s ease 0.7s both" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2baa74", boxShadow: "0 0 6px #2baa74" }} />
          <span style={{ fontSize: "0.57rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>بيئة آمنة ومشفرة • للاستخدام الداخلي فقط</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 20, fontSize: "0.54rem", color: "rgba(255,255,255,0.18)", whiteSpace: "nowrap", letterSpacing: "0.08em", animation: "sg-fadein 1s ease 0.8s both" }}>
        © 2026 شركة الرواف للمقاولات — جميع الحقوق محفوظة
      </div>

      {/* ═══════════ LOGIN MODAL ═══════════ */}
      {showLogin && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", animation: "sg-fadein 0.25s ease both" }}
        >
          <div style={{ background: "linear-gradient(160deg, #1e1a14 0%, #161210 100%)", border: "1px solid rgba(197,160,89,0.3)", borderRadius: 22, padding: "40px 38px", width: "100%", maxWidth: 410, boxShadow: "0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(197,160,89,0.08) inset", position: "relative", animation: "sg-scalein 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}>

            {/* Shake container */}
            <div style={{ animation: shake ? "sg-shake 0.5s ease" : "none" }}>

              {/* Close */}
              <button onClick={() => setShowLogin(false)} style={{ position: "absolute", top: 16, left: 16, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", lineHeight: 1 }}>×</button>

              {/* Modal header */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ width: 64, height: 64, borderRadius: 15, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(197,160,89,0.22)", display: "flex", alignItems: "center", justifyContent: "center", padding: 9, margin: "0 auto 13px" }}>
                  <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <div style={{ fontSize: "0.5rem", color: "rgba(197,160,89,0.5)", letterSpacing: "0.16em", marginBottom: 5 }}>ALRAWAF CONTRACTING</div>
                <h2 style={{ fontSize: "1.08rem", fontWeight: 800, color: "#fff", marginBottom: 4 }}>تسجيل الدخول</h2>
                <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.28)", lineHeight: 1.6 }}>أدخل بيانات الدخول للوصول إلى النظام</p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { key: "username" as const, label: "اسم المستخدم", type: "text",     placeholder: "أدخل اسم المستخدم",    ref: userRef },
                  { key: "password" as const, label: "كلمة المرور",   type: "password", placeholder: "أدخل كلمة المرور",     ref: undefined },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: "0.62rem", color: "rgba(197,160,89,0.75)", fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em" }}>{f.label}</label>
                    <input
                      ref={f.ref}
                      type={f.type}
                      value={f.key === "username" ? username : password}
                      onChange={(e) => { f.key === "username" ? setUsername(e.target.value) : setPassword(e.target.value); setError(""); }}
                      placeholder={f.placeholder}
                      autoComplete={f.key === "username" ? "username" : "current-password"}
                      style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: `1.5px solid ${error ? "#e74c3c" : "rgba(197,160,89,0.2)"}`, borderRadius: 10, color: "#fff", fontSize: "0.88rem", fontFamily: "Tajawal, sans-serif", direction: "rtl", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(197,160,89,0.65)")}
                      onBlur={(e)  => (e.target.style.borderColor = error ? "#e74c3c" : "rgba(197,160,89,0.2)")}
                    />
                  </div>
                ))}

                {/* Error */}
                {error && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: 8, padding: "9px 12px", fontSize: "0.75rem", color: "#e74c3c", fontWeight: 600 }}>
                    <span>⚠</span>{error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={busy}
                  onMouseEnter={() => setLBtnHover(true)}
                  onMouseLeave={() => setLBtnHover(false)}
                  style={{ marginTop: 4, padding: "13px", background: busy ? "rgba(197,160,89,0.4)" : lBtnHover ? "linear-gradient(135deg, #d4b070, #c5a059)" : "linear-gradient(135deg, #c5a059, #a88540)", color: "#fff", border: "none", borderRadius: 12, fontSize: "0.92rem", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", fontFamily: "Tajawal, sans-serif", transition: "all 0.2s ease", transform: lBtnHover && !busy ? "translateY(-1px)" : "none", boxShadow: lBtnHover && !busy ? "0 8px 28px rgba(197,160,89,0.45)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {busy ? (
                    <><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", display: "inline-block", animation: "sg-spin 0.7s linear infinite" }} />جاري التحقق...</>
                  ) : "تسجيل الدخول"}
                </button>
              </form>

              <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.57rem", color: "rgba(255,255,255,0.18)", lineHeight: 1.7 }}>
                للاستخدام الداخلي الرسمي فقط<br />شركة الرواف للمقاولات — نظام إدارة الموردين
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
