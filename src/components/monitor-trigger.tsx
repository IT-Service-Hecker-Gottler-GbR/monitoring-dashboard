"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { triggerMonitor } from "@/lib/actions";
import { toast } from "sonner";
import { RefreshCw, Server } from "lucide-react";

export function MonitorTrigger() {
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleManualTrigger} disabled={loading} variant="outline">
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Prüfe..." : "Alle jetzt prüfen"}
      </Button>

      <Badge variant="outline" className="font-mono text-xs">
        <Server className="mr-1 h-3 w-3" />
        Server-Side Monitoring aktiv (60s Intervall)
      </Badge>
    </div>
  );
}
