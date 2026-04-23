import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getRecentActivity } from "./api";
import { ROLES, STAGES } from "./types";

const POLL_INTERVAL_MS = 30_000;

interface Options {
  role: string;
  actorName: string;
  enabled: boolean;
  onNewActivity?: () => void;
}

export function useContractNotifications({ role, actorName, enabled, onNewActivity }: Options) {
  const lastLogIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);

  const myRoleInfo = ROLES.find(r => r.name === role);
  const myStages = myRoleInfo?.stage ?? [];

  useEffect(() => {
    if (!enabled || myStages.length === 0) return;

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

          const resultingStage =
            entry.action === "reject" ? 1 : entry.stage + 1;

          const isRelevant = myStages.includes(resultingStage);
          if (!isRelevant) continue;

          relevantActivity = true;

          const stageLabel = STAGES[resultingStage - 1]?.label ?? `المرحلة ${resultingStage}`;
          const contractLabel = entry.contractNo
            ? `${entry.contractNo} — ${entry.title}`
            : entry.title;

          if (entry.action === "advance") {
            toast(`📋 عقد وصل إلى مرحلتك`, {
              description: `${contractLabel}\n${stageLabel}`,
              duration: 7000,
              style: {
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                direction: "rtl",
                textAlign: "right",
              },
            });
          } else if (entry.action === "reject") {
            toast(`↩ عقد أُعيد إلى مرحلتك`, {
              description: `${contractLabel}\nأعاده: ${entry.actorName}`,
              duration: 7000,
              style: {
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                direction: "rtl",
                textAlign: "right",
              },
            });
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
  }, [enabled, role, actorName, onNewActivity]);
}
