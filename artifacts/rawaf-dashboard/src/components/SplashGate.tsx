import { useState, useEffect, useRef, useCallback } from "react";
import logoImg from "@assets/logo_1776506524686.jpg";
import ContractApp from "../contracts/ContractApp";
/* ── Three new Alrawaf branded background images ── */
import bg1 from "@assets/Image_jo77t3jo77t3jo1_1776495109728.png"; // equipment at golden sunset
import bg2 from "@assets/Image_jo77t3jo77t3jo2_1776495109727.png"; // buildings at night — golden LED lines
import bg3 from "@assets/Image_jo77t3jo77t3jo3_1776495109728.png"; // steel beam close-up — brand identity

const GATE_KEY      = "rawaf_gate_auth";
const DB_KEY        = "rawaf_db_auth";
const CONTRACTS_KEY = "rawaf_contracts_gate";
const IDLE_MS       = 5 * 60 * 1000; // 5 minutes — applies to whole-app session

/* ─── CSS keyframes injected once ─────────────────────────────────────── */
const KEYFRAMES = `
@keyframes sg-ken-burns-1 {
  0%   { transform: scale(1)    translate(0%,   0%);    }
  100% { transform: scale(1.14) translate(-1.5%, -1%);  }
}
@keyframes sg-ken-burns-2 {
  0%   { transform: scale(1.1) translate(0%, 1.5%);  }
  100% { transform: scale(1)   translate(0%, -1%);   }
}
@keyframes sg-ken-burns-3 {
  0%   { transform: scale(1)    translate(1%, 0%);    }
  100% { transform: scale(1.18) translate(-1%, -0.5%); }
}
@keyframes sg-float-a {
  0%,100% { transform: translateY(0px)   rotate(0deg)   scale(1);    opacity: 0.4; }
  33%      { transform: translateY(-22px) rotate(5deg)   scale(1.03); opacity: 0.6; }
  66%      { transform: translateY(10px)  rotate(-3deg)  scale(0.97); opacity: 0.45; }
}
@keyframes sg-float-b {
  0%,100% { transform: translateY(0px)   rotate(0deg);  opacity: 0.22; }
  50%      { transform: translateY(-16px) rotate(180deg);opacity: 0.42; }
}
@keyframes sg-float-c {
  0%,100% { transform: translateX(0px)  scale(1);    opacity: 0.28; }
  50%      { transform: translateX(18px) scale(1.06); opacity: 0.48; }
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
@keyframes sg-fadein  { from { opacity: 0; } to { opacity: 1; } }
@keyframes sg-scalein {
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
@keyframes sg-orb-pulse {
  0%, 100% { opacity: 0.08; transform: scale(1);    }
  50%       { opacity: 0.22; transform: scale(1.10); }
}
`;

/* ── Slides: all real branded photos ─────────────────────────────────── */
const SLIDES = [
  { src: bg1, anim: "sg-ken-burns-1 26s ease-out    infinite alternate", pos: "center bottom" },
  { src: bg2, anim: "sg-ken-burns-2 22s ease-in-out infinite alternate", pos: "center center" },
  { src: bg3, anim: "sg-ken-burns-3 28s ease-in-out infinite alternate", pos: "center 40%"   },
];

const SLIDE_DURATION = 7000;

export default function SplashGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"splash" | "app" | "contracts">(() => {
    if (sessionStorage.getItem(GATE_KEY) === "1") return "app";
    if (sessionStorage.getItem(CONTRACTS_KEY) === "1") return "contracts";
    return "splash";
  });
  const [slideIdx, setSlideIdx]   = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [busy, setBusy]           = useState(false);
  const [shake, setShake]         = useState(false);
  const [btnHover, setBtnHover]   = useState(false);
  const [cBtnHover, setCBtnHover] = useState(false);
  const [lBtnHover, setLBtnHover] = useState(false);
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
    const t = setInterval(() => setSlideIdx(i => (i + 1) % SLIDES.length), SLIDE_DURATION);
    return () => clearInterval(t);
  }, [phase]);

  /* Focus username when login opens */
  useEffect(() => {
    if (showLogin) setTimeout(() => userRef.current?.focus(), 80);
  }, [showLogin]);

  /* ── Logout — stable reference via useCallback ── */
  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(GATE_KEY);
    setPhase("splash");
    setShowLogin(false);
    setSlideIdx(0);
    setUsername(""); setPassword(""); setError(""); setBusy(false);
  }, []);

  /* ── Contracts phase ── */
  if (phase === "contracts") {
    return (
      <ContractApp onExit={() => {
        sessionStorage.removeItem(CONTRACTS_KEY);
        setPhase("splash");
      }} />
    );
  }

  /* ── App phase: listen for logo-click logout event from Header ── */
  if (phase === "app") {
    return (
      <div style={{ position: "relative" }}>
        <LogoutListener onLogout={handleLogout} />
        {children}
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
        /* bg1 as permanent base — ensures no black gap during slide crossfades */
        backgroundImage: `url(${bg1})`,
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
      }}
    >

      {/* ═══ BACKGROUND SLIDESHOW — 3 real Alrawaf branded photos ═══ */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            style={{
              position: "absolute", inset: 0,
              opacity: slideIdx === i ? 1 : 0,
              transition: "opacity 2.5s ease",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute", inset: "-8%",
                backgroundImage: `url(${slide.src})`,
                backgroundSize: "cover",
                backgroundPosition: slide.pos,
                animation: slide.anim,
              }}
            />
          </div>
        ))}

        {/* ── Warm gold ambiance overlay for slide 2 (steel beam) — tones down the grey ── */}
        {slideIdx === 2 && (
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 60% 50%, rgba(197,140,40,0.12) 0%, transparent 70%)",
            animation: "sg-orb-pulse 6s ease-in-out infinite",
            pointerEvents: "none",
          }} />
        )}

        {/* ── Master overlays — keep text readable over all photos ── */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.44) 38%, rgba(0,0,0,0.22) 65%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.48) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.48) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(12,7,2,0.22)", pointerEvents: "none" }} />
      </div>

      {/* ═══ SLIDE INDICATORS ═══ */}
      <div style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => setSlideIdx(i)}
            style={{ width: slideIdx === i ? 28 : 8, height: 4, borderRadius: 3, background: slideIdx === i ? "#c5a059" : "rgba(255,255,255,0.25)", transition: "all 0.4s ease", cursor: "pointer" }}
          />
        ))}
      </div>

      {/* ═══ DECORATIVE FLOATING SHAPES ═══ */}
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
      <div style={{ position: "absolute", top: 32, right: 32, zIndex: 20, animation: "sg-fadein 1s ease 0.3s both", textAlign: "left" }}>
        <div style={{
          fontSize: "0.82rem",
          fontWeight: 900,
          color: "#e8c96a",
          letterSpacing: "0.04em",
          textShadow: "0 0 22px rgba(232,201,106,0.55), 0 2px 10px rgba(0,0,0,0.75)",
          background: "rgba(0,0,0,0.28)",
          borderRadius: "8px",
          padding: "5px 13px",
          border: "1px solid rgba(232,201,106,0.22)",
          backdropFilter: "blur(8px)",
        }}>إحدى شركات مجموعة ساكف القابضة</div>
      </div>

      {/* ═══ MAIN CENTER CONTENT ═══ */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 24px", maxWidth: 560, animation: "sg-fadeup 0.9s ease 0.1s both" }}>

        {/* Logo — original white card style restored */}
        <div style={{
          width: 112, height: 112,
          background: "#fff",
          borderRadius: 22,
          border: "2px solid rgba(197,160,89,0.45)",
          boxShadow: "0 0 0 4px rgba(197,160,89,0.10), 0 0 32px rgba(197,160,89,0.55), 0 0 72px rgba(197,160,89,0.18), 0 16px 48px rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 13,
          marginBottom: 28,
          animation: "sg-logo-glow 4s ease-in-out infinite",
          flexShrink: 0,
        }}>
          <img
            src={logoImg}
            alt="الرواف"
            style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }}
          />
        </div>

        <div style={{ fontSize: "0.62rem", color: "rgba(197,160,89,0.95)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Inter', sans-serif", textShadow: "0 0 12px rgba(197,160,89,0.4)" }}>
          ALRAWAF CONTRACTING COMPANY
        </div>

        <h1 style={{ fontSize: "2.3rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.18, marginBottom: 12, textShadow: "0 4px 28px rgba(0,0,0,0.75)", letterSpacing: "-0.01em" }}>
          شركة الرواف للمقاولات
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10, justifyContent: "center" }}>
          <div style={{ width: 48, height: 1.5, background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.65))" }} />
          <span style={{ fontSize: "0.88rem", color: "rgba(197,160,89,0.92)", fontWeight: 700, letterSpacing: "0.04em", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>نظام إدارة الموردين والمقاولين</span>
          <div style={{ width: 48, height: 1.5, background: "linear-gradient(90deg, rgba(197,160,89,0.65), transparent)" }} />
        </div>

        <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.90)", lineHeight: 1.9, maxWidth: 420, marginBottom: 42, textShadow: "0 2px 12px rgba(0,0,0,0.8)", fontWeight: 500 }}>
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
              <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#d4aa66", lineHeight: 1, marginBottom: 6, direction: "ltr", textShadow: "0 0 24px rgba(197,160,89,0.55), 0 2px 8px rgba(0,0,0,0.5)" }}>{s.value}</div>
              <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.85)", letterSpacing: "0.09em", fontWeight: 600, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", width: "100%" }}>
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
              width: "100%", justifyContent: "center",
            }}
          >
            الدخول للنظام الآمن
          </button>

          <button
            onClick={() => {
              sessionStorage.setItem(CONTRACTS_KEY, "1");
              setPhase("contracts");
            }}
            onMouseEnter={() => setCBtnHover(true)}
            onMouseLeave={() => setCBtnHover(false)}
            style={{
              padding: "14px 40px",
              border: "1.5px solid rgba(197,160,89,0.55)",
              color: "#e8c96a", borderRadius: 14,
              fontSize: "0.92rem", fontWeight: 800, cursor: "pointer",
              fontFamily: "Tajawal, sans-serif", letterSpacing: "0.04em",
              transition: "transform 0.22s ease, background 0.22s ease, box-shadow 0.22s ease",
              transform: cBtnHover ? "translateY(-3px) scale(1.03)" : "none",
              background: cBtnHover ? "rgba(197,160,89,0.18)" : "rgba(197,160,89,0.10)",
              boxShadow: cBtnHover ? "0 10px 32px rgba(197,160,89,0.3)" : "0 4px 16px rgba(197,160,89,0.12)",
              backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", justifyContent: "center",
            }}
          >
            نظام إدارة العقود
          </button>
        </div>

        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 7, animation: "sg-fadein 1s ease 0.7s both" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2baa74", boxShadow: "0 0 6px #2baa74" }} />
          <span style={{ fontSize: "0.66rem", fontWeight: 700, color: "rgba(220,210,185,0.92)", letterSpacing: "0.07em", textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>بيئة آمنة ومشفرة • للاستخدام الداخلي فقط</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 20, fontSize: "0.64rem", fontWeight: 700, color: "rgba(220,210,185,0.85)", whiteSpace: "nowrap", letterSpacing: "0.07em", animation: "sg-fadein 1s ease 0.8s both", textShadow: "0 1px 6px rgba(0,0,0,0.75)" }}>
        © 2026 شركة الرواف للمقاولات — جميع الحقوق محفوظة
      </div>

      {/* ═════════════ LOGIN MODAL ═════════════ */}
      {showLogin && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(2,1,0,0.12)",
            backdropFilter: "blur(22px) saturate(0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "sg-fadein 0.25s ease both",
          }}
        >
          <div style={{
            background: "rgba(12,9,5,0.42)",
            border: "1px solid rgba(197,160,89,0.35)",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 22,
            padding: "40px 38px",
            width: "100%", maxWidth: 410,
            boxShadow: "0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
            position: "relative",
            backdropFilter: "blur(32px) saturate(1.3)",
            animation: "sg-scalein 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            <div style={{ animation: shake ? "sg-shake 0.5s ease" : "none" }}>

              {/* Close */}
              <button onClick={() => setShowLogin(false)} style={{ position: "absolute", top: 16, left: 16, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.38)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", lineHeight: 1 }}>×</button>

              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ width: 72, height: 72, borderRadius: 16, background: "#fff", border: "1.5px solid rgba(197,160,89,0.35)", boxShadow: "0 6px 28px rgba(0,0,0,0.35), 0 0 0 3px rgba(197,160,89,0.12)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10, margin: "0 auto 13px", overflow: "hidden" }}>
                  <img src={logoImg} alt="الرواف" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <div style={{ fontSize: "0.5rem", color: "rgba(197,160,89,0.85)", letterSpacing: "0.16em", marginBottom: 5 }}>ALRAWAF CONTRACTING</div>
                <h2 style={{ fontSize: "1.08rem", fontWeight: 800, color: "#fff", marginBottom: 4, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>تسجيل الدخول</h2>
                <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>أدخل بيانات الدخول للوصول إلى النظام</p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {([
                  { key: "username" as const, label: "اسم المستخدم", type: "text",     placeholder: "أدخل اسم المستخدم", isRef: true  },
                  { key: "password" as const, label: "كلمة المرور",   type: "password", placeholder: "أدخل كلمة المرور",  isRef: false },
                ] as const).map((f) => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: "0.62rem", color: "rgba(197,160,89,0.85)", fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em" }}>{f.label}</label>
                    <input
                      ref={f.isRef ? userRef : undefined}
                      type={f.type}
                      value={f.key === "username" ? username : password}
                      onChange={(e) => { f.key === "username" ? setUsername(e.target.value) : setPassword(e.target.value); setError(""); }}
                      placeholder={f.placeholder}
                      autoComplete={f.key === "username" ? "username" : "current-password"}
                      style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.10)", border: `1.5px solid ${error ? "#e74c3c" : "rgba(197,160,89,0.35)"}`, borderRadius: 10, color: "#fff", fontSize: "0.88rem", fontFamily: "Tajawal, sans-serif", direction: "rtl", outline: "none", transition: "border-color 0.2s, background 0.2s", boxSizing: "border-box" }}
                      onFocus={(e) => { e.target.style.borderColor = "rgba(197,160,89,0.7)"; e.target.style.background = "rgba(255,255,255,0.14)"; }}
                      onBlur={(e)  => { e.target.style.borderColor = error ? "#e74c3c" : "rgba(197,160,89,0.35)"; e.target.style.background = "rgba(255,255,255,0.10)"; }}
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

              <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.57rem", color: "rgba(255,255,255,0.22)", lineHeight: 1.7 }}>
                للاستخدام الداخلي الرسمي فقط<br />شركة الرواف للمقاولات — نظام إدارة الموردين
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Security layer: logout events + 5-min idle + session wipe on exit ──
   Mounted only while phase === "app". All three guards share one stable ref
   so the freshest handleLogout is always called without re-registering. ── */
function LogoutListener({ onLogout }: { onLogout: () => void }) {
  const callbackRef = useRef(onLogout);
  useEffect(() => { callbackRef.current = onLogout; });

  /* 1 ── Logo-click logout (rawaf-logout custom event from Header) */
  useEffect(() => {
    const handler = () => callbackRef.current();
    window.addEventListener("rawaf-logout", handler);
    return () => window.removeEventListener("rawaf-logout", handler);
  }, []);

  /* 2 ── 5-minute idle auto-logout for the whole app session
          Resets on any mouse / keyboard / touch / scroll activity. */
  useEffect(() => {
    const idleRef: { timer: ReturnType<typeof setTimeout> | null } = { timer: null };

    function resetTimer() {
      if (idleRef.timer) clearTimeout(idleRef.timer);
      idleRef.timer = setTimeout(() => {
        sessionStorage.removeItem(DB_KEY); // lock DB sub-session first
        callbackRef.current();             // then full splash logout
      }, IDLE_MS);
    }

    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    EVENTS.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer(); // arm immediately on mount

    return () => {
      EVENTS.forEach((ev) => window.removeEventListener(ev, resetTimer));
      if (idleRef.timer) clearTimeout(idleRef.timer);
    };
  }, []); // mount-once — always calls freshest callback via ref

  /* 3 ── Session wipe on tab-close / navigate-away (belt + suspenders over
          sessionStorage's built-in per-tab clearing). */
  useEffect(() => {
    function clearOnExit() {
      sessionStorage.removeItem(GATE_KEY);
      sessionStorage.removeItem(DB_KEY);
    }
    window.addEventListener("beforeunload", clearOnExit);
    return () => window.removeEventListener("beforeunload", clearOnExit);
  }, []);

  return null;
}
