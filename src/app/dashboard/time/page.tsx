import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatHours } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TimePage() {
  const entries = await prisma.timeEntry.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: { project: true, task: true },
  });

  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const billableMinutes = entries
    .filter((e) => e.billable)
    .reduce((s, e) => s + e.minutes, 0);

  const byProject = new Map<string, { name: string; minutes: number }>();
  for (const e of entries) {
    const cur = byProject.get(e.projectId) ?? { name: e.project.name, minutes: 0 };
    cur.minutes += e.minutes;
    byProject.set(e.projectId, cur);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Time" subtitle="Recent time across all projects" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total tracked" value={formatHours(totalMinutes)} />
        <StatCard label="Billable" value={formatHours(billableMinutes)} />
        <StatCard label="Entries" value={String(entries.length)} />
      </div>

      {byProject.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...byProject.entries()]
              .sort((a, b) => b[1].minutes - a[1].minutes)
              .map(([pid, v]) => (
                <div key={pid} className="flex items-center justify-between text-sm">
                  <Link href={`/dashboard/projects/${pid}`} className="hover:text-primary">
                    {v.name}
                  </Link>
                  <span className="text-muted-foreground">{formatHours(v.minutes)}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No time logged. Open a project to log time.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Project</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 text-muted-foreground">{formatDate(e.date)}</td>
                    <td className="py-2">
                      <Link
                        href={`/dashboard/projects/${e.projectId}`}
                        className="hover:text-primary"
                      >
                        {e.project.name}
                      </Link>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {e.description || "—"}
                      {e.task && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({e.task.title})
                        </span>
                      )}
                    </td>
                    <td className="py-2">{formatHours(e.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
