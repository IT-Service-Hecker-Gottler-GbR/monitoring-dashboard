"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { triggerMonitor } from "@/lib/actions";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function MonitorTrigger() {
  const [loading, setLoading] = useState(false);

  async function handleTrigger() {
    setLoading(true);
    try {
      const result = await triggerMonitor();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Monitoring check completed!");
      }
    } catch {
      toast.error("Failed to trigger monitoring");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleTrigger} disabled={loading} variant="outline">
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Running checks..." : "Run Manual Check"}
      </Button>
      <span className="text-sm text-muted-foreground">
        Trigger an immediate check of all active domains
      </span>
    </div>
  );
}

