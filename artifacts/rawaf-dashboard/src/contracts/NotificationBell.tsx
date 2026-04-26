import { useEffect, useRef, useState, useCallback } from "react";
import type { StoredNotification } from "./useContractNotifications";
import { getMyApprovedContracts, type MyApprovedContract } from "./api";
import { STAGES } from "./types";

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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-SA", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return iso;
  }
}

function contractStatusLabel(c: MyApprovedContract): { label: string; color: string; bg: string } {
  if (c.status === "completed") return { label: "مكتمل", color: "#1a7a4a", bg: "rgba(26,122,74,0.1)" };
  if (c.status === "cancelled") return { label: "ملغى", color: "#c0392b", bg: "rgba(192,57,43,0.1)" };
  if (c.currentStage === 1 && c.status === "active") {
    return { label: "مُعاد", color: "#c0392b", bg: "rgba(192,57,43,0.1)" };
  }
  const stageLabel = STAGES[c.currentStage - 1]?.label ?? `المرحلة ${c.currentStage}`;
  const color = c.currentStage <= c.approvedStage ? "#c0392b" : "#2980b9";
  const bg    = c.currentStage <= c.approvedStage ? "rgba(192,57,43,0.1)" : "rgba(41,128,185,0.1)";
  return { label: stageLabel, color, bg };
}

function isRejected(c: MyApprovedContract): boolean {
  if (c.status === "completed") return false;
  if (c.status === "cancelled") return true;
  if (c.currentStage === 1 && c.status === "active") return true;
  if (c.currentStage <= c.approvedStage) return true;
  return false;
}

interface Props {
  actorName: string;
  notifications: StoredNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onDismissOne: (id: string) => void;
  onDismissAll: () => void;
  onOpenContract: (id: number) => void;
}

type Tab = "notifications" | "my-contracts";

export default function NotificationBell({
  actorName,
  notifications,
  unreadCount,
  onMarkAllRead,
  onDismissOne,
  onDismissAll,
  onOpenContract,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("notifications");
  const [myContracts, setMyContracts] = useState<MyApprovedContract[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myError, setMyError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!actorName.trim()) {
      setMyContracts([]);
      setMyError(null);
    }
  }, [actorName]);

  const fetchMyContracts = useCallback(async () => {
    if (!actorName.trim()) return;
    setMyLoading(true);
    setMyError(null);
    try {
      const data = await getMyApprovedContracts(actorName);
      setMyContracts(data);
    } catch {
      setMyError("تعذّر تحميل العقود");
    } finally {
      setMyLoading(false);
    }
  }, [actorName]);

  useEffect(() => {
    if (open && tab === "my-contracts") {
      fetchMyContracts();
    }
  }, [open, tab, fetchMyContracts]);

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

  const rejectedCount = myContracts.filter(isRejected).length;

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
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
            width: 320,
            maxHeight: 460,
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
            padding: "10px 14px 0",
            borderBottom: `1px solid ${GOLD_BOR}`,
            background: "linear-gradient(135deg, #FBF9F4 0%, #F2EAD3 100%)",
            flexShrink: 0,
          }}>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: 4, marginBottom: 0 }}>
              <button
                onClick={() => setTab("notifications")}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  borderBottom: tab === "notifications" ? `2.5px solid ${GOLD}` : "2.5px solid transparent",
                  cursor: "pointer",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  fontWeight: tab === "notifications" ? 800 : 600,
                  color: tab === "notifications" ? "#4a3520" : "#aaa",
                  fontSize: "0.72rem",
                  paddingBottom: 6,
                  paddingTop: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  transition: "all 0.15s",
                }}
              >
                الإشعارات
                {unreadCount > 0 && (
                  <span style={{
                    background: "#e74c3c",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "1px 6px",
                    fontSize: "0.58rem",
                    fontWeight: 900,
                  }}>{unreadCount}</span>
                )}
              </button>
              <button
                onClick={() => setTab("my-contracts")}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  borderBottom: tab === "my-contracts" ? `2.5px solid ${GOLD}` : "2.5px solid transparent",
                  cursor: "pointer",
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  fontWeight: tab === "my-contracts" ? 800 : 600,
                  color: tab === "my-contracts" ? "#4a3520" : "#aaa",
                  fontSize: "0.72rem",
                  paddingBottom: 6,
                  paddingTop: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  transition: "all 0.15s",
                }}
              >
                عقودي
                {tab === "my-contracts" && rejectedCount > 0 && (
                  <span style={{
                    background: "#e74c3c",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "1px 6px",
                    fontSize: "0.58rem",
                    fontWeight: 900,
                  }}>{rejectedCount} مرفوض</span>
                )}
              </button>
            </div>
          </div>

          {/* Action bar for notifications tab */}
          {tab === "notifications" && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 4,
              padding: "5px 14px",
              background: "linear-gradient(135deg, #FBF9F4 0%, #F2EAD3 100%)",
              borderBottom: `1px solid ${GOLD_BOR}`,
              flexShrink: 0,
            }}>
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
          )}

          {/* Action bar for my-contracts tab */}
          {tab === "my-contracts" && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 4,
              padding: "5px 14px",
              background: "linear-gradient(135deg, #FBF9F4 0%, #F2EAD3 100%)",
              borderBottom: `1px solid ${GOLD_BOR}`,
              flexShrink: 0,
            }}>
              <button
                onClick={fetchMyContracts}
                disabled={myLoading}
                style={{
                  background: "none",
                  border: "none",
                  cursor: myLoading ? "default" : "pointer",
                  fontSize: "0.62rem",
                  color: GOLD,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 5,
                  opacity: myLoading ? 0.5 : 1,
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (!myLoading) (e.currentTarget as HTMLElement).style.background = GOLD_BG; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                {myLoading ? "جارٍ التحميل…" : "تحديث"}
              </button>
            </div>
          )}

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {tab === "notifications" && (
              <>
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
              </>
            )}

            {tab === "my-contracts" && (
              <>
                {myLoading && (
                  <div style={{
                    padding: "28px 14px",
                    textAlign: "center",
                    color: "#aaa",
                    fontSize: "0.78rem",
                  }}>
                    جارٍ التحميل…
                  </div>
                )}
                {!myLoading && myError && (
                  <div style={{
                    padding: "28px 14px",
                    textAlign: "center",
                    color: "#c0392b",
                    fontSize: "0.75rem",
                  }}>
                    {myError}
                  </div>
                )}
                {!myLoading && !myError && myContracts.length === 0 && (
                  <div style={{
                    padding: "28px 14px",
                    textAlign: "center",
                    color: "#bbb",
                    fontSize: "0.78rem",
                  }}>
                    {actorName.trim() ? "لم تعتمد أي عقود بعد" : "اختر اسمك من القائمة الجانبية أولاً"}
                  </div>
                )}
                {!myLoading && !myError && myContracts.map(c => {
                  const rejected = isRejected(c);
                  const statusInfo = contractStatusLabel(c);
                  const contractLabel = c.contractNo ? `${c.contractNo} — ${c.title}` : c.title;
                  const approvedStageLabel = STAGES[c.approvedStage - 1]?.label ?? `المرحلة ${c.approvedStage}`;
                  return (
                    <div
                      key={c.contractId}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "10px 14px",
                        borderBottom: `1px solid rgba(197,160,89,0.1)`,
                        background: rejected ? "rgba(192,57,43,0.03)" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = rejected
                          ? "rgba(192,57,43,0.07)"
                          : GOLD_BG;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = rejected
                          ? "rgba(192,57,43,0.03)"
                          : "transparent";
                      }}
                      onClick={() => {
                        onOpenContract(c.contractId);
                        setOpen(false);
                      }}
                    >
                      {/* Status dot */}
                      <div style={{ paddingTop: 5, flexShrink: 0 }}>
                        <div style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: rejected ? "#e74c3c" : "#27ae60",
                        }} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: rejected ? "#c0392b" : "#2c1e0f",
                          lineHeight: 1.4,
                          marginBottom: 2,
                          textDecoration: rejected ? "line-through" : "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {contractLabel}
                        </div>
                        <div style={{
                          fontSize: "0.62rem",
                          color: "#7a6040",
                          lineHeight: 1.5,
                          marginBottom: 3,
                        }}>
                          اعتمدت في: {approvedStageLabel}
                        </div>
                        {rejected && c.rejectionReason && (
                          <div style={{
                            fontSize: "0.6rem",
                            color: "#c0392b",
                            lineHeight: 1.4,
                            marginBottom: 3,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}>
                            سبب الرفض: {c.rejectionReason}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          <span style={{
                            fontSize: "0.58rem",
                            fontWeight: 700,
                            color: statusInfo.color,
                            background: statusInfo.bg,
                            borderRadius: 8,
                            padding: "1px 7px",
                          }}>
                            {statusInfo.label}
                          </span>
                          <span style={{ fontSize: "0.56rem", color: "#bbb" }}>
                            {formatDate(c.approvedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
