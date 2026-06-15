import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  FolderKanban,
  ListChecks,
  Users,
  Receipt,
  Activity,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getOverview() {
  const [
    activeProjects,
    openTasks,
    clients,
    unpaidInvoices,
    totalDomains,
    activeDomains,
    upcomingTasks,
  ] = await Promise.all([
    prisma.project.count({ where: { status: "active" } }),
    prisma.task.count({ where: { status: { not: "done" } } }),
    prisma.client.count(),
    prisma.invoice.findMany({
      where: { status: { not: "paid" } },
      include: { items: true },
    }),
    prisma.domain.count(),
    prisma.domain.findMany({
      where: { isActive: true },
      include: { checkLogs: { orderBy: { checkedAt: "desc" }, take: 1 } },
    }),
    prisma.task.findMany({
      where: { status: { not: "done" } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 6,
      include: { project: true },
    }),
  ]);

  const outstanding = unpaidInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, i) => s + i.quantity * i.rate, 0),
    0
  );
  const downCount = activeDomains.filter(
    (d) => d.checkLogs.length > 0 && !d.checkLogs[0].isUp
  ).length;

  return {
    activeProjects,
    openTasks,
    clients,
    outstanding,
    unpaidCount: unpaidInvoices.length,
    totalDomains,
    downCount,
    upcomingTasks,
  };
}

export default async function DashboardPage() {
  const o = await getOverview();

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" subtitle="Your whole business at a glance" />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Business</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LinkStat href="/dashboard/projects" label="Active projects" value={o.activeProjects} icon={FolderKanban} />
          <LinkStat href="/dashboard/projects" label="Open tasks" value={o.openTasks} icon={ListChecks} />
          <LinkStat href="/dashboard/clients" label="Clients" value={o.clients} icon={Users} />
          <LinkStat
            href="/dashboard/invoices"
            label="Outstanding"
            value={formatCurrency(o.outstanding)}
            icon={Receipt}
            hint={`${o.unpaidCount} unpaid invoice(s)`}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming tasks</CardTitle>
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {o.upcomingTasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No open tasks 🎉
              </p>
            ) : (
              <ul className="divide-y">
                {o.upcomingTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/projects/${t.projectId}`}
                        className="font-medium hover:text-primary"
                      >
                        {t.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.project.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge value={t.priority} />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(t.dueDate)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Monitoring summary */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Monitoring
            </CardTitle>
            <Link
              href="/dashboard/monitoring"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Open <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Domains monitored</p>
              <p className="text-3xl font-bold">{o.totalDomains}</p>
            </div>
            {o.downCount > 0 ? (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {o.downCount} domain(s) currently offline
              </div>
            ) : (
              <div className="rounded-lg bg-green-500/10 p-3 text-sm font-medium text-green-600 dark:text-green-400">
                All monitored domains are online
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LinkStat({
  href,
  label,
  value,
  icon: Icon,
  hint,
}: {
  href: string;
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Link>
  );
}
