"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dismissAlert, dismissAllAlerts } from "@/lib/actions";
import { formatDate } from "@/lib/format";

type Alert = {
  id: string;
  type: string;
  message: string;
  createdAt: string | Date;
};

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const [busy, setBusy] = useState(false);
  if (alerts.length === 0) return null;

  async function dismiss(id: string) {
    setBusy(true);
    const res = await dismissAlert(id);
    setBusy(false);
    if (res.error) toast.error(res.error);
  }

  async function dismissAll() {
    setBusy(true);
    const res = await dismissAllAlerts();
    setBusy(false);
    if (res.error) toast.error(res.error);
    else toast.success("All alerts dismissed");
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Active alerts ({alerts.length})
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={dismissAll} disabled={busy}>
          Dismiss all
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a) => {
          const Icon = a.type === "ssl_expiring" ? ShieldAlert : AlertTriangle;
          return (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-destructive/5 p-3"
            >
              <div className="flex items-start gap-2 text-sm">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(a.createdAt)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Dismiss alert"
                onClick={() => dismiss(a.id)}
                disabled={busy}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
