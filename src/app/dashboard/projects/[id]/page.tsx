import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import {
  createTask,
  setTaskStatus,
  deleteTask,
  createTimeEntry,
  deleteTimeEntry,
  updateProjectStatus,
  deleteProject,
} from "@/lib/pm-actions";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  PROJECT_STATUSES,
  formatCurrency,
  formatDate,
  formatHours,
  labelize,
  selectClass,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { key: "todo", title: "To Do" },
  { key: "in_progress", title: "In Progress" },
  { key: "done", title: "Done" },
];

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      tasks: { orderBy: [{ priority: "desc" }, { createdAt: "asc" }] },
      timeEntries: { orderBy: { date: "desc" }, include: { task: true } },
    },
  });
  if (!project) notFound();

  const totalMinutes = project.timeEntries.reduce((s, e) => s + e.minutes, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/projects" className="text-sm text-primary hover:underline">
          ← Projects
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <StatusBadge value={project.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.client?.name ?? "No client"}
              {project.budget != null && ` · Budget ${formatCurrency(project.budget)}`}
              {` · ${formatHours(totalMinutes)} tracked`}
            </p>
            {project.description && (
              <p className="mt-2 max-w-2xl text-sm text-foreground/80">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <form action={updateProjectStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={project.id} />
              <select
                name="status"
                defaultValue={project.status}
                className={`${selectClass} w-auto`}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {labelize(s)}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline" size="sm">
                Update
              </Button>
            </form>
            <form action={deleteProject}>
              <input type="hidden" name="id" value={project.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Add task */}
      <Card>
        <CardContent>
          <details>
            <summary className="cursor-pointer font-medium">+ Add task</summary>
            <form action={createTask} className="mt-4 grid gap-3 sm:grid-cols-4">
              <input type="hidden" name="projectId" value={project.id} />
              <div className="sm:col-span-4">
                <Label htmlFor="title" className="mb-1.5">
                  Title *
                </Label>
                <Input id="title" name="title" required placeholder="Design homepage" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="priority" className="mb-1.5">
                  Priority
                </Label>
                <select id="priority" name="priority" defaultValue="medium" className={selectClass}>
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {labelize(p)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="taskStatus" className="mb-1.5">
                  Status
                </Label>
                <select id="taskStatus" name="status" defaultValue="todo" className={selectClass}>
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {labelize(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="dueDate" className="mb-1.5">
                  Due date
                </Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>
              <div className="sm:col-span-4">
                <Button type="submit">Add task</Button>
              </div>
            </form>
          </details>
        </CardContent>
      </Card>

      {/* Task board */}
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const tasks = project.tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="rounded-xl bg-muted/50 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold">{col.title}</h3>
                <span className="text-xs text-muted-foreground">{tasks.length}</span>
              </div>
              <div className="space-y-2">
                {tasks.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{t.title}</p>
                        <StatusBadge value={t.priority} />
                      </div>
                      {t.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                      )}
                      {t.dueDate && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due {formatDate(t.dueDate)}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <form action={setTaskStatus} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="projectId" value={project.id} />
                          <select
                            name="status"
                            defaultValue={t.status}
                            className="rounded border bg-transparent px-1.5 py-1 text-xs"
                          >
                            {TASK_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {labelize(s)}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="ghost" size="xs">
                            Move
                          </Button>
                        </form>
                        <form action={deleteTask}>
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="projectId" value={project.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="xs"
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {tasks.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                    No tasks
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time tracking */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Log time</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTimeEntry} className="space-y-3">
              <input type="hidden" name="projectId" value={project.id} />
              <div>
                <Label htmlFor="description" className="mb-1.5">
                  Description
                </Label>
                <Input id="description" name="description" placeholder="Client call" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="hours" className="mb-1.5">
                    Hours *
                  </Label>
                  <Input
                    id="hours"
                    name="hours"
                    type="number"
                    step="0.25"
                    required
                    placeholder="1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="date" className="mb-1.5">
                    Date
                  </Label>
                  <Input id="date" name="date" type="date" />
                </div>
              </div>
              <div>
                <Label htmlFor="taskId" className="mb-1.5">
                  Task (optional)
                </Label>
                <select id="taskId" name="taskId" className={selectClass}>
                  <option value="">— None —</option>
                  {project.tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input name="billable" type="checkbox" defaultChecked className="h-4 w-4" />
                Billable
              </label>
              <Button type="submit" className="w-full">
                Log time
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Time entries · {formatHours(totalMinutes)}</CardTitle>
          </CardHeader>
          <CardContent>
            {project.timeEntries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No time logged yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Hours</th>
                    <th className="pb-2 font-medium"></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {project.timeEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 text-muted-foreground">{formatDate(e.date)}</td>
                      <td className="py-2">
                        {e.description || "—"}
                        {e.task && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({e.task.title})
                          </span>
                        )}
                      </td>
                      <td className="py-2">{formatHours(e.minutes)}</td>
                      <td className="py-2">
                        {e.billable ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                            Billable
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Non-billable</Badge>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <form action={deleteTimeEntry}>
                          <input type="hidden" name="id" value={e.id} />
                          <input type="hidden" name="projectId" value={project.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="xs"
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
