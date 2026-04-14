"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { triggerMonitor, triggerCron } from "@/lib/actions";
import { toast } from "sonner";
import { RefreshCw, Timer, TimerOff } from "lucide-react";

const CRON_INTERVAL_MS = 60 * 1000; // 1 minute

export function MonitorTrigger() {
  const [loading, setLoading] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [lastCron, setLastCron] = useState<Date | null>(null);
  const [secondsUntilNext, setSecondsUntilNext] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Run the cron check (only checks due domains)
  const runCron = useCallback(async () => {
    try {
      const result = await triggerCron();
      setLastCron(new Date());
      setSecondsUntilNext(60);
      if (result.error) {
        console.error("Cron error:", result.error);
      }
    } catch (err) {
      console.error("Cron failed:", err);
    }
  }, []);

  // Auto-polling: run cron every minute
  useEffect(() => {
    if (autoEnabled) {
      // Run immediately on enable
      runCron();

      intervalRef.current = setInterval(runCron, CRON_INTERVAL_MS);

      // Countdown timer
      countdownRef.current = setInterval(() => {
        setSecondsUntilNext((prev) => (prev <= 1 ? 60 : prev - 1));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoEnabled, runCron]);

  // Manual trigger: checks ALL active domains
  async function handleManualTrigger() {
    setLoading(true);
    try {
      const result = await triggerMonitor();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Alle Domains wurden geprüft!");
      }
    } catch {
      toast.error("Monitoring konnte nicht gestartet werden");
    } finally {
      setLoading(false);
    }
  }

  function toggleAuto() {
    setAutoEnabled((prev) => !prev);
    if (!autoEnabled) {
      toast.success("Auto-Monitoring aktiviert");
    } else {
      toast.info("Auto-Monitoring pausiert");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleManualTrigger} disabled={loading} variant="outline">
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Prüfe..." : "Alle jetzt prüfen"}
      </Button>

      <Button
        onClick={toggleAuto}
        variant={autoEnabled ? "default" : "secondary"}
        size="sm"
      >
        {autoEnabled ? (
          <Timer className="mr-2 h-4 w-4" />
        ) : (
          <TimerOff className="mr-2 h-4 w-4" />
        )}
        {autoEnabled ? "Auto-Check aktiv" : "Auto-Check aus"}
      </Button>

      {autoEnabled && (
        <Badge variant="outline" className="font-mono text-xs">
          Nächster Check in {secondsUntilNext}s
        </Badge>
      )}

      {lastCron && (
        <span className="text-xs text-muted-foreground">
          Letzter Auto-Check: {lastCron.toLocaleTimeString("de-DE")}
        </span>
      )}
    </div>
  );
}
