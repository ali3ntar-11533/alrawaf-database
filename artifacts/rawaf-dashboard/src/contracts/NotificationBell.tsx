import { useEffect, useRef, useState } from "react";
import type { StoredNotification } from "./useContractNotifications";

const GOLD       = "#C5A059";
const GOLD_BG    = "rgba(197,160,89,0.08)";
const GOLD_BOR   = "rgba(197,160,89,0.22)";

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} ي`;
}

interface Props {
  notifications: StoredNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onDismissOne: (id: string) => void;
  onDismissAll: () => void;
  onOpenContract: (id: number) => void;
}

export default function NotificationBell({
  notifications,
  unreadCount,
  onMarkAllRead,
  onDismissOne,
  onDismissAll,
  onOpenContract,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        title="الإشعارات"
        style={{
          position: "relative",
          background: open ? GOLD_BG : "transparent",
          border: `1px solid ${open ? GOLD_BOR : "transparent"}`,
          borderRadius: 8,
          cursor: "pointer",
          width: 34,
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.05rem",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          if (!open) (e.currentTarget as HTMLElement).style.background = GOLD_BG;
        }}
        onMouseLeave={e => {
          if (!open) (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 2,
            left: 2,
            background: "#e74c3c",
            color: "#fff",
            borderRadius: "50%",
            minWidth: 16,
            height: 16,
            padding: "0 3px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.52rem",
            fontWeight: 900,
            lineHeight: 1,
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          dir="rtl"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 310,
            maxHeight: 420,
            background: "#fff",
            border: `1px solid ${GOLD_BOR}`,
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${GOLD_BOR}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(135deg, #FBF9F4 0%, #F2EAD3 100%)",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#4a3520", flex: 1 }}>
              الإشعارات
              {unreadCount > 0 && (
                <span style={{
                  marginRight: 6,
                  background: "#e74c3c",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "1px 7px",
                  fontSize: "0.6rem",
                  fontWeight: 900,
                }}>{unreadCount}</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.62rem",
                  color: GOLD,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 5,
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GOLD_BG; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                قراءة الكل
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={onDismissAll}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.62rem",
                  color: "#c0392b",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 5,
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(231,76,60,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                مسح الكل
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: "28px 14px",
                textAlign: "center",
                color: "#bbb",
                fontSize: "0.78rem",
              }}>
                لا توجد إشعارات
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "10px 14px",
                    borderBottom: `1px solid rgba(197,160,89,0.1)`,
                    background: n.read ? "transparent" : "rgba(197,160,89,0.05)",
                    cursor: "pointer",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = GOLD_BG;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = n.read
                      ? "transparent"
                      : "rgba(197,160,89,0.05)";
                  }}
                  onClick={() => {
                    onOpenContract(n.contractId);
                    onDismissOne(n.id);
                    setOpen(false);
                  }}
                >
                  {/* Unread dot */}
                  <div style={{ paddingTop: 5, flexShrink: 0 }}>
                    <div style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: n.read ? "transparent" : "#e74c3c",
                      border: n.read ? "1.5px solid #ddd" : "none",
                    }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "0.72rem",
                      fontWeight: n.read ? 600 : 800,
                      color: "#2c1e0f",
                      lineHeight: 1.4,
                      marginBottom: 2,
                    }}>
                      {n.headline}
                    </div>
                    <div style={{
                      fontSize: "0.64rem",
                      color: "#7a6040",
                      lineHeight: 1.5,
                      whiteSpace: "pre-line",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}>
                      {n.description}
                    </div>
                    <div style={{ fontSize: "0.58rem", color: "#bbb", marginTop: 3 }}>
                      {formatTime(n.timestamp)}
                    </div>
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDismissOne(n.id);
                    }}
                    title="إزالة"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ccc",
                      fontSize: "0.7rem",
                      padding: "0 2px",
                      lineHeight: 1,
                      flexShrink: 0,
                      borderRadius: 4,
                      transition: "color 0.12s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e74c3c"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#ccc"; }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
