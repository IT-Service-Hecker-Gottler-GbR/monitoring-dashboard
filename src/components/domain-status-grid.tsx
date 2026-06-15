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
import { Globe, ShieldCheck, ShieldX, Clock, Server } from "lucide-react";

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

interface ServerGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface Domain {
  id: string;
  url: string;
  customerName: string;
  checkInterval: number;
  isActive: boolean;
  serverGroupId: string | null;
  serverGroup: ServerGroup | null;
  checkLogs: CheckLog[];
}

interface DomainStatusGridProps {
  domains: Domain[];
  groups: ServerGroup[];
}

export function DomainStatusGrid({ domains, groups }: DomainStatusGridProps) {
  if (domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
        <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Noch keine Domains</h3>
        <p className="text-sm text-muted-foreground">
          Füge deine erste Domain im &quot;Manage Domains&quot; Tab hinzu
        </p>
      </div>
    );
  }

  // Group domains by serverGroup
  const grouped = new Map<string | null, Domain[]>();
  for (const domain of domains) {
    const key = domain.serverGroupId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(domain);
  }

  // Build ordered sections: groups first (alphabetically), then ungrouped
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const groupIds = [...grouped.keys()]
    .filter((k) => k !== null)
    .sort((a, b) => {
      const ga = groupMap.get(a!);
      const gb = groupMap.get(b!);
      return (ga?.name ?? "").localeCompare(gb?.name ?? "");
    });

  const ungrouped = grouped.get(null) ?? [];

  return (
    <div className="space-y-8">
      {groupIds.map((groupId) => {
        const group = groupMap.get(groupId!);
        const groupDomains = grouped.get(groupId) ?? [];
        return (
          <GroupSection key={groupId} group={group!} domains={groupDomains} />
        );
      })}

      {ungrouped.length > 0 && (
        <div className="space-y-3">
          {groupIds.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">
                Ohne Gruppe
              </h3>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ungrouped.map((domain) => (
              <DomainCard key={domain.id} domain={domain} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupSection({ group, domains }: { group: ServerGroup; domains: Domain[] }) {
  const allUp = domains.every(
    (d) => !d.isActive || (d.checkLogs.length > 0 && d.checkLogs[0].isUp)
  );
  const anyDown = domains.some(
    (d) => d.isActive && d.checkLogs.length > 0 && !d.checkLogs[0].isUp
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ backgroundColor: group.color + "22" }}
        >
          <Server className="h-4 w-4" style={{ color: group.color }} />
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            {group.name}
          </h3>
          {group.description && (
            <span className="text-xs text-muted-foreground">
              — {group.description}
            </span>
          )}
        </div>
        <Badge
          variant="outline"
          className="ml-auto text-xs"
          style={{ borderColor: group.color, color: group.color }}
        >
          {domains.length} {domains.length === 1 ? "Domain" : "Domains"}
        </Badge>
        {anyDown ? (
          <Badge className="bg-red-100 text-red-800 text-xs">Störung</Badge>
        ) : allUp ? (
          <Badge className="bg-green-100 text-green-800 text-xs">Alles OK</Badge>
        ) : null}
      </div>
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 rounded-xl border p-4"
        style={{ borderColor: group.color + "44" }}
      >
        {domains.map((domain) => (
          <DomainCard key={domain.id} domain={domain} />
        ))}
      </div>
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

