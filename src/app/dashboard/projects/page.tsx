import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { FolderKanban } from "lucide-react";
import { createProject } from "@/lib/pm-actions";
import {
  PROJECT_STATUSES,
  formatCurrency,
  labelize,
  selectClass,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        _count: { select: { tasks: true } },
        tasks: { where: { status: "done" }, select: { id: true } },
      },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" subtitle="Everything you're delivering" />

      <Card>
        <CardContent>
          <details>
            <summary className="cursor-pointer font-medium">+ New project</summary>
            <form action={createProject} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name" className="mb-1.5">
                  Name *
                </Label>
                <Input id="name" name="name" required placeholder="Website redesign" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description" className="mb-1.5">
                  Description
                </Label>
                <Input id="description" name="description" />
              </div>
              <div>
                <Label htmlFor="clientId" className="mb-1.5">
                  Client
                </Label>
                <select id="clientId" name="clientId" className={selectClass}>
                  <option value="">— None —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` (${c.company})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="status" className="mb-1.5">
                  Status
                </Label>
                <select id="status" name="status" defaultValue="active" className={selectClass}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {labelize(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="budget" className="mb-1.5">
                  Budget
                </Label>
                <Input id="budget" name="budget" type="number" step="0.01" />
              </div>
              <div>
                <Label htmlFor="hourlyRate" className="mb-1.5">
                  Hourly rate
                </Label>
                <Input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  step="0.01"
                  placeholder="Falls back to default"
                />
              </div>
              <div className="flex items-end sm:col-span-2">
                <Button type="submit">Create project</Button>
              </div>
            </form>
          </details>
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project above to start tracking tasks, time, and budget."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const done = p.tasks.length;
            const total = p._count.tasks;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{p.name}</h3>
                      <StatusBadge value={p.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {p.client?.name ?? "No client"}
                    </p>
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>
                          {done}/{total} tasks
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {p.budget != null && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Budget {formatCurrency(p.budget)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
