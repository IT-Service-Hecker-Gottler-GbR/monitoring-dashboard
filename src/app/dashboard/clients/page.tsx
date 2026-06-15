import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";
import { createClient, deleteClient } from "@/lib/pm-actions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true, invoices: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" subtitle="People and companies you work with" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add client</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createClient} className="space-y-3">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required placeholder="Jane Doe" />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" name="company" placeholder="Acme Inc." />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="jane@acme.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              <Button type="submit" className="w-full">
                Add client
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {clients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first client using the form on the left to start organising projects and invoices."
            />
          ) : (
            <Card className="divide-y p-0">
              {clients.map((c) => (
                <div key={c.id} className="flex items-start justify-between p-4">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[c.company, c.email].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c._count.projects} project(s) · {c._count.invoices} invoice(s) · added{" "}
                      {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <form action={deleteClient}>
                    <input type="hidden" name="id" value={c.id} />
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
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
