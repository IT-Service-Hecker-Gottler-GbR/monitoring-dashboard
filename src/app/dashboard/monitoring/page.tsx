import { prisma } from "@/lib/prisma";
import { DomainStatusGrid } from "@/components/domain-status-grid";
import { DomainManagement } from "@/components/domain-management";
import { MonitorTrigger } from "@/components/monitor-trigger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { AlertsPanel } from "@/components/alerts-panel";
import { Activity, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

async function getDomains() {
  return prisma.domain.findMany({
    include: {
      checkLogs: {
        orderBy: { checkedAt: "desc" },
        take: 5,
      },
      serverGroup: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getGroups() {
  return prisma.serverGroup.findMany({ orderBy: { name: "asc" } });
}

async function getStats() {
  const [totalDomains, activeDomains, totalChecks, totalGroups] =
    await Promise.all([
      prisma.domain.count(),
      prisma.domain.count({ where: { isActive: true } }),
      prisma.checkLog.count(),
      prisma.serverGroup.count(),
    ]);

  const domains = await prisma.domain.findMany({
    where: { isActive: true },
    include: {
      checkLogs: {
        orderBy: { checkedAt: "desc" },
        take: 1,
      },
    },
  });

  const upCount = domains.filter(
    (d) => d.checkLogs.length > 0 && d.checkLogs[0].isUp
  ).length;
  const downCount = domains.filter(
    (d) => d.checkLogs.length > 0 && !d.checkLogs[0].isUp
  ).length;

  return { totalDomains, activeDomains, totalChecks, totalGroups, upCount, downCount };
}

async function getOpenAlerts() {
  return prisma.alert.findMany({
    where: { readAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, type: true, message: true, createdAt: true },
  });
}

export default async function MonitoringPage() {
  const [domains, groups, stats, alerts] = await Promise.all([
    getDomains(),
    getGroups(),
    getStats(),
    getOpenAlerts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring"
        subtitle="Uptime and SSL status for your customers' domains"
      />

      <AlertsPanel alerts={alerts} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Domains" value={stats.totalDomains} />
        <StatCard label="Groups" value={stats.totalGroups} />
        <StatCard label="Online" value={stats.upCount} className="text-green-600" />
        <StatCard label="Offline" value={stats.downCount} className="text-red-600" />
        <StatCard label="Total Checks" value={stats.totalChecks} />
      </div>

      <MonitorTrigger />

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">
            <Activity className="mr-2 h-4 w-4" />
            Status Overview
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Settings className="mr-2 h-4 w-4" />
            Manage Domains
          </TabsTrigger>
        </TabsList>
        <TabsContent value="status" className="mt-4">
          <DomainStatusGrid domains={domains} groups={groups} />
        </TabsContent>
        <TabsContent value="manage" className="mt-4">
          <DomainManagement domains={domains} groups={groups} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold ${className || ""}`}>{value}</p>
    </div>
  );
}
