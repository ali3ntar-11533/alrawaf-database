import { useState, useEffect, useRef } from "react";
import logoImg from "@assets/logo_1776260992247.jpg";
import bgPhoto from "@assets/screenshot-1776492202470.png";

const GATE_KEY = "rawaf_gate_auth";

/* ─── All CSS keyframes injected once ─────────────────────────────────── */
const KEYFRAMES = `
@keyframes sg-ken-burns-1 {
  0%   { transform: scale(1)    translate(0%,    0%);    }
  100% { transform: scale(1.18) translate(-2.5%, -1.5%); }
}
@keyframes sg-ken-burns-2 {
  0%   { transform: scale(1.1) translate(1.5%, 1%); }
  100% { transform: scale(1)   translate(-1%, -0.5%); }
}
@keyframes sg-ken-burns-3 {
  0%   { transform: scale(1)    translate(0%, 1.5%);   }
  100% { transform: scale(1.14) translate(1%, -1%); }
}

/* Blueprint grid drift */
@keyframes sg-grid-drift {
  0%   { transform: translate(0, 0);    }
  100% { transform: translate(48px, 48px); }
}
/* Grid dot pulse */
@keyframes sg-dot-pulse {
  0%, 100% { opacity: 0.18; r: 2; }
  50%       { opacity: 0.6;  r: 3.5; }
}
/* Light beam sweep */
@keyframes sg-beam-sweep {
  0%   { opacity: 0;    transform: rotate(-35deg) translateX(-40%); }
  15%  { opacity: 0.18; }
  50%  { opacity: 0.12; transform: rotate(-35deg) translateX(0%); }
  85%  { opacity: 0.18; }
  100% { opacity: 0;    transform: rotate(-35deg) translateX(40%); }
}
@keyframes sg-beam-sweep2 {
  0%   { opacity: 0;    transform: rotate(-55deg) translateX(40%); }
  20%  { opacity: 0.12; }
  60%  { opacity: 0.08; transform: rotate(-55deg) translateX(-20%); }
  100% { opacity: 0;    transform: rotate(-55deg) translateX(-60%); }
}
/* Floating particles (sparks) */
@keyframes sg-spark-a {
  0%   { transform: translate(0, 0)      scale(1);    opacity: 0.7; }
  80%  { opacity: 0.3; }
  100% { transform: translate(20px,-90px) scale(0.4); opacity: 0;   }
}
@keyframes sg-spark-b {
  0%   { transform: translate(0, 0)       scale(1);    opacity: 0.6; }
  100% { transform: translate(-30px,-70px) scale(0.3); opacity: 0;   }
}
@keyframes sg-spark-c {
  0%   { transform: translate(0, 0)      scale(0.8); opacity: 0.8; }
  100% { transform: translate(15px,-110px) scale(0.2); opacity: 0;  }
}
/* Glowing orbs */
@keyframes sg-orb-pulse {
  0%, 100% { opacity: 0.1; transform: scale(1);    }
  50%       { opacity: 0.3; transform: scale(1.12); }
}

/* Shared helpers */
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
`;

/* ── Sparks data (random-ish but deterministic) ─────────────────────────── */
const SPARKS = [
  { x: "62%", y: "72%", delay: "0s",    dur: "2.2s", anim: "sg-spark-a", color: "#f5c542" },
  { x: "61%", y: "74%", delay: "0.4s",  dur: "1.8s", anim: "sg-spark-b", color: "#ff8c22" },
  { x: "63%", y: "73%", delay: "0.9s",  dur: "2.5s", anim: "sg-spark-c", color: "#fff5cc" },
  { x: "60%", y: "75%", delay: "1.3s",  dur: "2.0s", anim: "sg-spark-a", color: "#f5c542" },
  { x: "64%", y: "71%", delay: "1.8s",  dur: "1.6s", anim: "sg-spark-b", color: "#ff8c22" },
  { x: "62%", y: "76%", delay: "2.2s",  dur: "2.8s", anim: "sg-spark-c", color: "#fff5cc" },
];

const SLIDE_DURATION = 7000;

export default function SplashGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"splash" | "app">(() =>
    sessionStorage.getItem(GATE_KEY) === "1" ? "app" : "splash"
  );
  const [slideIdx, setSlideIdx]   = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [busy, setBusy]           = useState(false);
  const [shake, setShake]         = useState(false);
  const [btnHover, setBtnHover]   = useState(false);
  const [lBtnHover, setLBtnHover] = useState(false);
  const [logoutHover, setLogoutHover] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);

  /* Inject keyframes once */
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  /* Slideshow timer */
  useEffect(() => {
    if (phase !== "splash") return;
    const t = setInterval(() => setSlideIdx(i => (i + 1) % 3), SLIDE_DURATION);
    return () => clearInterval(t);
  }, [phase]);

  /* Focus username when login opens */
  useEffect(() => {
    if (showLogin) setTimeout(() => userRef.current?.focus(), 80);
  }, [showLogin]);

  /* ── Logout ── */
  function handleLogout() {
    sessionStorage.removeItem(GATE_KEY);
    setPhase("splash");
    setShowLogin(false);
    setUsername(""); setPassword(""); setError("");
  }

  /* ── Authenticated wrapper ── */
  if (phase === "app") {
    return (
      <div style={{ position: "relative" }}>
        {children}

        {/* ── Logout button: fixed, top-left, directly below nav tabs ── */}
        <button
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
          title="تسجيل الخروج من النظام"
          style={{
            position: "fixed",
            top: 78,
            left: 20,
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: logoutHover
              ? "linear-gradient(135deg, rgba(197,160,89,0.18), rgba(197,160,89,0.08))"
              : "rgba(10,8,6,0.72)",
            color: logoutHover ? "#e8d5a3" : "rgba(197,160,89,0.65)",
            border: `1px solid ${logoutHover ? "rgba(197,160,89,0.5)" : "rgba(197,160,89,0.2)"}`,
            borderRadius: 8,
            padding: "6px 12px 6px 10px",
            fontSize: "0.68rem",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "Tajawal, sans-serif",
            backdropFilter: "blur(12px)",
            boxShadow: logoutHover
              ? "0 4px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(197,160,89,0.12)"
              : "0 2px 12px rgba(0,0,0,0.35)",
            transition: "all 0.22s ease",
            transform: logoutHover ? "translateY(-1px)" : "none",
            direction: "rtl",
            whiteSpace: "nowrap",
            letterSpacing: "0.03em",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          خروج
        </button>
      </div>
    );
  }

  /* ── Login handler ── */
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
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

  /* ═══════════════════ SPLASH RENDER ═══════════════════ */
  return (
    <div
      dir="rtl"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Tajawal, sans-serif", overflow: "hidden",
        background: "#060402",
      }}
    >

      {/* ═══ BACKGROUND SLIDESHOW ═══ */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>

        {/* ── Slide 0: Real Alrawaf project photo — Ken Burns ── */}
        <div style={{ position: "absolute", inset: 0, opacity: slideIdx === 0 ? 1 : 0, transition: "opacity 2.2s ease", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: "-8%",
            backgroundImage: `url(${bgPhoto})`,
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            animation: "sg-ken-burns-1 24s ease-out infinite alternate",
          }} />
          {/* Sparks overlay — mimics welding from the photo */}
          {slideIdx === 0 && SPARKS.map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: s.x, top: s.y,
                width: 5, height: 5,
                borderRadius: "50%",
                background: s.color,
                boxShadow: `0 0 6px ${s.color}`,
                animation: `${s.anim} ${s.dur} ease-out ${s.delay} infinite`,
                pointerEvents: "none",
              }}
            />
          ))}
        </div>

        {/* ── Slide 1: Blueprint engineering night ── */}
        <div style={{ position: "absolute", inset: 0, opacity: slideIdx === 1 ? 1 : 0, transition: "opacity 2.2s ease", overflow: "hidden" }}>
          {/* Base deep-blue background */}
          <div style={{
            position: "absolute", inset: "-5%",
            background: "linear-gradient(160deg, #04080f 0%, #0a1525 45%, #060d1c 100%)",
            animation: "sg-ken-burns-2 22s ease-in-out infinite alternate",
          }} />
          {/* Blueprint grid — moving */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `
              linear-gradient(rgba(59,130,200,0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,130,200,0.12) 1px, transparent 1px),
              linear-gradient(rgba(59,130,200,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,130,200,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px, 80px 80px, 20px 20px, 20px 20px",
            animation: "sg-grid-drift 14s linear infinite",
          }} />
          {/* Glowing orbs (construction lights) */}
          <div style={{ position: "absolute", top: "22%", right: "28%", width: 280, height: 180, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(90,160,240,0.18) 0%, transparent 70%)", animation: "sg-orb-pulse 6s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "25%", left: "20%", width: 200, height: 140, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(197,160,89,0.14) 0%, transparent 70%)", animation: "sg-orb-pulse 8s ease-in-out infinite 2s" }} />
          <div style={{ position: "absolute", top: "55%", right: "10%", width: 160, height: 100, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(90,160,240,0.10) 0%, transparent 70%)", animation: "sg-orb-pulse 5s ease-in-out infinite 1s" }} />
          {/* Animated scan line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent 0%, rgba(59,130,200,0.5) 50%, transparent 100%)", animation: "sg-grid-drift 6s linear infinite" }} />
        </div>

        {/* ── Slide 2: Construction site / molten atmosphere ── */}
        <div style={{ position: "absolute", inset: 0, opacity: slideIdx === 2 ? 1 : 0, transition: "opacity 2.2s ease", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: "-5%",
            background: "linear-gradient(160deg, #100804 0%, #1e0e06 40%, #0c0503 100%)",
            animation: "sg-ken-burns-3 26s ease-in-out infinite alternate",
          }} />
          {/* Sweeping light beams (crane/searchlight effect) */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <div style={{
              position: "absolute",
              top: "-50%", left: "35%",
              width: "40%", height: "200%",
              background: "linear-gradient(transparent 0%, rgba(255,210,120,0.06) 30%, rgba(255,210,120,0.10) 50%, rgba(255,210,120,0.06) 70%, transparent 100%)",
              transformOrigin: "top center",
              animation: "sg-beam-sweep 12s ease-in-out infinite",
            }} />
            <div style={{
              position: "absolute",
              top: "-50%", left: "55%",
              width: "30%", height: "200%",
              background: "linear-gradient(transparent 0%, rgba(255,180,80,0.05) 30%, rgba(255,180,80,0.08) 50%, rgba(255,180,80,0.05) 70%, transparent 100%)",
              transformOrigin: "top center",
              animation: "sg-beam-sweep2 18s ease-in-out infinite 3s",
            }} />
          </div>
          {/* Warm glow pools */}
          <div style={{ position: "absolute", bottom: "5%", right: "15%", width: 420, height: 240, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(220,110,30,0.20) 0%, transparent 70%)", animation: "sg-orb-pulse 6s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "0%", left: "20%", width: 300, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(197,160,89,0.16) 0%, transparent 70%)", animation: "sg-orb-pulse 9s ease-in-out infinite 3s" }} />
          <div style={{ position: "absolute", top: "30%", right: "5%", width: 180, height: 120, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,130,30,0.12) 0%, transparent 70%)", animation: "sg-orb-pulse 7s ease-in-out infinite 1.5s" }} />
        </div>

        {/* ── Master overlays ── */}
        {/* Vertical vignette */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.52) 38%, rgba(0,0,0,0.30) 65%, rgba(0,0,0,0.65) 100%)", pointerEvents: "none" }} />
        {/* Side vignettes */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.55) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
        {/* Warm gold tone */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(16,10,4,0.38)", pointerEvents: "none" }} />
      </div>

      {/* ═══ SLIDE INDICATORS ═══ */}
      <div style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} onClick={() => setSlideIdx(i)} style={{ width: slideIdx === i ? 28 : 8, height: 4, borderRadius: 3, background: slideIdx === i ? "#c5a059" : "rgba(255,255,255,0.22)", transition: "all 0.4s ease", cursor: "pointer" }} />
        ))}
      </div>

      {/* ═══ DECORATIVE SHAPES ═══ */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
        <div style={{ position: "absolute", top: "10%", right: "7%", width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(197,160,89,0.18)", animation: "sg-float-a 10s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "14%", right: "10.5%", width: 100, height: 100, borderRadius: "50%", border: "1px solid rgba(197,160,89,0.10)", animation: "sg-float-a 10s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", bottom: "12%", left: "6%", width: 240, height: 240, borderRadius: "50%", border: "1px solid rgba(197,160,89,0.12)", animation: "sg-float-b 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "42%", left: "4%", width: 70, height: 70, border: "1px solid rgba(197,160,89,0.20)", transform: "rotate(45deg)", animation: "sg-float-c 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "22%", left: "18%", width: 38, height: 38, border: "1px solid rgba(197,160,89,0.16)", transform: "rotate(45deg)", animation: "sg-float-c 8s ease-in-out infinite 2.5s" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "9%", width: 55, height: 55, border: "1px solid rgba(197,160,89,0.14)", transform: "rotate(45deg)", animation: "sg-float-a 9s ease-in-out infinite 3s" }} />
        <div style={{ position: "absolute", top: "6%", left: "9%", width: 140, height: 140, borderRadius: "50%", border: "1px dashed rgba(197,160,89,0.10)", animation: "sg-spin 35s linear infinite" }} />
        <div style={{ position: "absolute", top: "6%", left: "9%", width: 100, height: 100, margin: "20px", borderRadius: "50%", border: "1px dashed rgba(197,160,89,0.07)", animation: "sg-spin-rev 25s linear infinite" }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "-60px", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(197,160,89,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)", width: 600, height: 320, background: "radial-gradient(ellipse, rgba(197,160,89,0.06) 0%, transparent 70%)" }} />
      </div>

      {/* ═══ رؤية 2030 BADGE (top-left) ═══ */}
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
        <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.20)", letterSpacing: "0.12em" }}>شركة تابعة لـ</div>
        <div style={{ fontSize: "0.62rem", color: "rgba(197,160,89,0.48)", fontWeight: 700, letterSpacing: "0.1em" }}>مجموعة ساكف القابضة</div>
      </div>

      {/* ═══ MAIN CENTER CONTENT ═══ */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 24px", maxWidth: 560, animation: "sg-fadeup 0.9s ease 0.1s both" }}>

        {/* Logo */}
        <div style={{ width: 108, height: 108, borderRadius: 22, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(197,160,89,0.3)", display: "flex", alignItems: "center", justifyContent: "center", padding: 13, marginBottom: 26, animation: "sg-logo-glow 4s ease-in-out infinite", backdropFilter: "blur(10px)" }}>
          <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        <div style={{ fontSize: "0.54rem", color: "rgba(197,160,89,0.55)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 9, fontFamily: "'Inter', sans-serif" }}>
          ALRAWAF CONTRACTING COMPANY
        </div>

        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.22, marginBottom: 10, textShadow: "0 4px 24px rgba(0,0,0,0.7)" }}>
          شركة الرواف للمقاولات
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, justifyContent: "center" }}>
          <div style={{ width: 44, height: 1, background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.55))" }} />
          <span style={{ fontSize: "0.74rem", color: "rgba(197,160,89,0.75)", fontWeight: 600, letterSpacing: "0.04em" }}>نظام إدارة الموردين والمقاولين</span>
          <div style={{ width: 44, height: 1, background: "linear-gradient(90deg, rgba(197,160,89,0.55), transparent)" }} />
        </div>

        <p style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.30)", lineHeight: 2, maxWidth: 380, marginBottom: 40, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
          منصة داخلية متكاملة لإدارة بيانات المقاولين والموردين<br />
          وتحليل الأسعار وتنسيق المشاريع الإنشائية
        </p>

        {/* Stats */}
        <div style={{ display: "flex", gap: 36, marginBottom: 46, justifyContent: "center", animation: "sg-fadein 1s ease 0.5s both" }}>
          {[
            { value: "١٩٩٦", label: "تأسست عام" },
            { value: "+٣٠",  label: "عام خبرة" },
            { value: "ISO",  label: "شهادة الجودة" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#c5a059", lineHeight: 1, marginBottom: 5, direction: "ltr", textShadow: "0 0 20px rgba(197,160,89,0.3)" }}>{s.value}</div>
              <div style={{ fontSize: "0.54rem", color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => { setShowLogin(true); setError(""); setUsername(""); setPassword(""); }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            padding: "16px 52px",
            backgroundImage: "linear-gradient(135deg, #c5a059 0%, #a88540 50%, #c5a059 100%)",
            backgroundSize: "200% auto",
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

        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 7, animation: "sg-fadein 1s ease 0.7s both" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2baa74", boxShadow: "0 0 6px #2baa74" }} />
          <span style={{ fontSize: "0.57rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em" }}>بيئة آمنة ومشفرة • للاستخدام الداخلي فقط</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 20, fontSize: "0.54rem", color: "rgba(255,255,255,0.15)", whiteSpace: "nowrap", letterSpacing: "0.08em", animation: "sg-fadein 1s ease 0.8s both" }}>
        © 2026 شركة الرواف للمقاولات — جميع الحقوق محفوظة
      </div>

      {/* ═════════════ LOGIN MODAL ═════════════ */}
      {showLogin && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            /* Lighter overlay — animated background is visible & beautifully blurred through it */
            background: "rgba(4,2,1,0.48)",
            backdropFilter: "blur(20px) saturate(0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "sg-fadein 0.25s ease both",
          }}
        >
          <div style={{
            /* Frosted-glass card — sits over the blurred bg */
            background: "linear-gradient(160deg, rgba(28,22,16,0.96) 0%, rgba(20,16,11,0.98) 100%)",
            border: "1px solid rgba(197,160,89,0.28)",
            borderRadius: 22,
            padding: "40px 38px",
            width: "100%", maxWidth: 410,
            boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(197,160,89,0.06) inset",
            position: "relative",
            backdropFilter: "blur(2px)",
            animation: "sg-scalein 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>

            <div style={{ animation: shake ? "sg-shake 0.5s ease" : "none" }}>

              {/* Close */}
              <button
                onClick={() => setShowLogin(false)}
                style={{ position: "absolute", top: 16, left: 16, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.38)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", lineHeight: 1 }}
              >×</button>

              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ width: 64, height: 64, borderRadius: 15, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(197,160,89,0.22)", display: "flex", alignItems: "center", justifyContent: "center", padding: 9, margin: "0 auto 13px" }}>
                  <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <div style={{ fontSize: "0.5rem", color: "rgba(197,160,89,0.5)", letterSpacing: "0.16em", marginBottom: 5 }}>ALRAWAF CONTRACTING</div>
                <h2 style={{ fontSize: "1.08rem", fontWeight: 800, color: "#fff", marginBottom: 4 }}>تسجيل الدخول</h2>
                <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>أدخل بيانات الدخول للوصول إلى النظام</p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {([
                  { key: "username" as const, label: "اسم المستخدم", type: "text",     placeholder: "أدخل اسم المستخدم", isRef: true },
                  { key: "password" as const, label: "كلمة المرور",   type: "password", placeholder: "أدخل كلمة المرور",   isRef: false },
                ] as const).map((f) => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: "0.62rem", color: "rgba(197,160,89,0.75)", fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em" }}>{f.label}</label>
                    <input
                      ref={f.isRef ? userRef : undefined}
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

                {error && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(231,76,60,0.10)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: 8, padding: "9px 12px", fontSize: "0.75rem", color: "#e74c3c", fontWeight: 600 }}>
                    <span>⚠</span>{error}
                  </div>
                )}

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

              <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.57rem", color: "rgba(255,255,255,0.16)", lineHeight: 1.7 }}>
                للاستخدام الداخلي الرسمي فقط<br />شركة الرواف للمقاولات — نظام إدارة الموردين
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
