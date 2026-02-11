"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe, ShieldCheck, ShieldX, Clock } from "lucide-react";

interface CheckLog {
  id: string;
  statusCode: number | null;
  latency: number | null;
  isUp: boolean;
  sslValid: boolean | null;
  sslExpiry: Date | null;
  error: string | null;
  checkedAt: Date;
}

interface Domain {
  id: string;
  url: string;
  customerName: string;
  checkInterval: number;
  isActive: boolean;
  checkLogs: CheckLog[];
}

interface DomainStatusGridProps {
  domains: Domain[];
}

export function DomainStatusGrid({ domains }: DomainStatusGridProps) {
  if (domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
        <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No domains yet</h3>
        <p className="text-sm text-muted-foreground">
          Add your first domain in the &quot;Manage Domains&quot; tab
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {domains.map((domain) => (
        <DomainCard key={domain.id} domain={domain} />
      ))}
    </div>
  );
}

function DomainCard({ domain }: { domain: Domain }) {
  const latestCheck = domain.checkLogs[0];
  const isUp = latestCheck?.isUp ?? null;
  const hasChecks = domain.checkLogs.length > 0;

  return (
    <Card
      className={`transition-all ${
        !domain.isActive
          ? "opacity-60"
          : isUp === true
          ? "border-green-200 dark:border-green-900"
          : isUp === false
          ? "border-red-200 dark:border-red-900"
          : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">
              {domain.customerName}
            </CardTitle>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {domain.url}
            </p>
          </div>
          <StatusBadge isUp={isUp} isActive={domain.isActive} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasChecks && latestCheck && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Response</span>
              <span className="font-mono">
                {latestCheck.statusCode ?? "N/A"} · {latestCheck.latency}ms
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SSL</span>
              <span className="flex items-center gap-1">
                {latestCheck.sslValid === true ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Valid</span>
                  </>
                ) : latestCheck.sslValid === false ? (
                  <>
                    <ShieldX className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">Invalid</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </span>
            </div>
            {latestCheck.sslExpiry && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">SSL Expiry</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(latestCheck.sslExpiry).toLocaleDateString()}
                </span>
              </div>
            )}
          </>
        )}

        {/* Sparkline: last 5 checks */}
        {hasChecks && (
          <div className="pt-2">
            <p className="mb-1 text-xs text-muted-foreground">
              Last {domain.checkLogs.length} checks
            </p>
            <TooltipProvider>
              <div className="flex gap-1">
                {[...domain.checkLogs].reverse().map((log) => (
                  <Tooltip key={log.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`h-6 flex-1 rounded-sm ${
                          log.isUp
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {log.isUp ? "Up" : "Down"} ·{" "}
                        {log.statusCode ?? "N/A"} · {log.latency}ms
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.checkedAt).toLocaleString()}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        )}

        {!hasChecks && (
          <p className="text-center text-xs text-muted-foreground">
            No checks yet — run a manual check
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Interval: {domain.checkInterval}min</span>
          {!domain.isActive && <Badge variant="secondary">Paused</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  isUp,
  isActive,
}: {
  isUp: boolean | null;
  isActive: boolean;
}) {
  if (!isActive) {
    return <Badge variant="secondary">Paused</Badge>;
  }
  if (isUp === null) {
    return <Badge variant="outline">Pending</Badge>;
  }
  return isUp ? (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
      Online
    </Badge>
  ) : (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200">
      Offline
    </Badge>
  );
}

