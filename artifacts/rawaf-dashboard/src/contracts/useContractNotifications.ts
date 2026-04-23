import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getRecentActivity } from "./api";
import { ROLES, STAGES } from "./types";

const POLL_INTERVAL_MS = 30_000;
const MAX_NOTIFICATIONS = 20;

function storageKey(actorName: string): string {
  const safe = actorName.trim().replace(/\s+/g, "_").slice(0, 40) || "anonymous";
  return `rawaf_notifications_${safe}`;
}

export interface StoredNotification {
  id: string;
  headline: string;
  description: string;
  contractId: number;
  contractLabel: string;
  timestamp: number;
  read: boolean;
}

function loadNotifications(key: string): StoredNotification[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredNotification[]) : [];
  } catch {
    return [];
  }
}

function saveNotifications(key: string, list: StoredNotification[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

interface Options {
  role: string;
  actorName: string;
  enabled: boolean;
  onNewActivity?: () => void;
}

interface NotificationsResult {
  notifications: StoredNotification[];
  unreadCount: number;
  markAllRead: () => void;
  dismissOne: (id: string) => void;
  dismissAll: () => void;
}

export function useContractNotifications({
  role,
  actorName,
  enabled,
  onNewActivity,
}: Options): NotificationsResult {
  const lastLogIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);
  const prevActorNameRef = useRef(actorName);

  const [notifications, setNotifications] = useState<StoredNotification[]>(() =>
    loadNotifications(storageKey(actorName))
  );

  useEffect(() => {
    if (prevActorNameRef.current !== actorName) {
      prevActorNameRef.current = actorName;
      setNotifications(loadNotifications(storageKey(actorName)));
    }
  }, [actorName]);

  const myRoleInfo = ROLES.find(r => r.name === role);
  const myStages = myRoleInfo?.stage ?? [];

  const pushNotification = useCallback(
    (notif: StoredNotification) => {
      const key = storageKey(actorName);
      setNotifications(prev => {
        const next = [notif, ...prev].slice(0, MAX_NOTIFICATIONS);
        saveNotifications(key, next);
        return next;
      });
    },
    [actorName]
  );

  const markAllRead = useCallback(() => {
    const key = storageKey(actorName);
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      saveNotifications(key, next);
      return next;
    });
  }, [actorName]);

  const dismissOne = useCallback(
    (id: string) => {
      const key = storageKey(actorName);
      setNotifications(prev => {
        const next = prev.filter(n => n.id !== id);
        saveNotifications(key, next);
        return next;
      });
    },
    [actorName]
  );

  const dismissAll = useCallback(() => {
    const key = storageKey(actorName);
    saveNotifications(key, []);
    setNotifications([]);
  }, [actorName]);

  useEffect(() => {
    if (!enabled || myStages.length === 0) return;

    lastLogIdRef.current = null;
    initializedRef.current = false;

    let cancelled = false;

    async function poll() {
      try {
        const entries = await getRecentActivity();
        if (cancelled) return;

        consecutiveFailuresRef.current = 0;

        if (!initializedRef.current) {
          if (entries.length > 0) {
            lastLogIdRef.current = Math.max(...entries.map(e => e.logId));
          }
          initializedRef.current = true;
          return;
        }

        const lastId = lastLogIdRef.current ?? 0;
        const newEntries = entries.filter(e => e.logId > lastId);
        if (newEntries.length === 0) return;

        lastLogIdRef.current = Math.max(...newEntries.map(e => e.logId));

        let relevantActivity = false;

        for (const entry of newEntries) {
          if (entry.actorName === actorName) continue;

          const contractLabel = entry.contractNo
            ? `${entry.contractNo} — ${entry.title}`
            : entry.title;

          if (entry.action === "advance") {
            const resultingStage = entry.stage + 1;
            if (!myStages.includes(resultingStage)) continue;

            relevantActivity = true;
            const stageLabel = STAGES[resultingStage - 1]?.label ?? `المرحلة ${resultingStage}`;
            const headline = "📋 عقد وصل إلى مرحلتك";
            const description = `${contractLabel}\n${stageLabel}`;

            toast(headline, {
              description,
              duration: 7000,
              style: {
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                direction: "rtl",
                textAlign: "right",
              },
            });

            pushNotification({
              id: `${entry.logId}-advance`,
              headline,
              description,
              contractId: entry.contractId,
              contractLabel,
              timestamp: Date.now(),
              read: false,
            });
          } else if (entry.action === "reject") {
            if (myStages.includes(1)) {
              relevantActivity = true;
              const headline = "↩ عقد أُعيد إلى مرحلتك";
              const description = `${contractLabel}\nأعاده: ${entry.actorName}`;

              toast(headline, {
                description,
                duration: 7000,
                style: {
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  direction: "rtl",
                  textAlign: "right",
                },
              });

              pushNotification({
                id: `${entry.logId}-reject-stage1`,
                headline,
                description,
                contractId: entry.contractId,
                contractLabel,
                timestamp: Date.now(),
                read: false,
              });
            }

            const hadPreviouslyApproved = myStages.some(s => s > 1 && s < entry.stage);
            if (hadPreviouslyApproved) {
              relevantActivity = true;
              const rejectStageLabel =
                STAGES[entry.stage - 1]?.label ?? `المرحلة ${entry.stage}`;
              const headline = "⚠️ عقد وافقت عليه تم رفضه";
              const description = `${contractLabel}\nرُفض في: ${rejectStageLabel} — بواسطة: ${entry.actorName}`;

              toast(headline, {
                description,
                duration: 9000,
                style: {
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  direction: "rtl",
                  textAlign: "right",
                },
              });

              pushNotification({
                id: `${entry.logId}-reject-mid`,
                headline,
                description,
                contractId: entry.contractId,
                contractLabel,
                timestamp: Date.now(),
                read: false,
              });
            }
          }
        }

        if (relevantActivity && onNewActivity) {
          onNewActivity();
        }
      } catch (err) {
        consecutiveFailuresRef.current += 1;
        if (import.meta.env.DEV && consecutiveFailuresRef.current <= 3) {
          console.warn(
            `[ContractNotifications] poll failed (attempt ${consecutiveFailuresRef.current}):`,
            err
          );
        }
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, role, actorName, onNewActivity, myStages, pushNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markAllRead, dismissOne, dismissAll };
}
