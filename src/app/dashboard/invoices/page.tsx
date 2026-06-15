import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Receipt } from "lucide-react";
import { createInvoice } from "@/lib/pm-actions";
import { formatCurrency, formatDate, selectClass } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [invoices, clients] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: true, items: true },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle="Bill your clients and track payment" />

      <Card>
        <CardContent>
          <details>
            <summary className="cursor-pointer font-medium">+ New invoice</summary>
            <form action={createInvoice} className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="clientId" className="mb-1.5">
                  Client
                </Label>
                <select id="clientId" name="clientId" className={selectClass}>
                  <option value="">— None —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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
              <div className="sm:col-span-3">
                <Label htmlFor="notes" className="mb-1.5">
                  Notes
                </Label>
                <Input id="notes" name="notes" />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit">Create invoice</Button>
              </div>
            </form>
          </details>
        </CardContent>
      </Card>

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Create an invoice above, then add line items to bill a client."
        />
      ) : (
        <Card className="divide-y p-0">
          {invoices.map((inv) => {
            const total = inv.items.reduce((s, i) => s + i.quantity * i.rate, 0);
            return (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="flex items-center justify-between p-4 hover:bg-accent/50"
              >
                <div>
                  <p className="font-medium">{inv.number}</p>
                  <p className="text-sm text-muted-foreground">
                    {inv.client?.name ?? "No client"} · issued {formatDate(inv.issuedDate)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">{formatCurrency(total)}</span>
                  <StatusBadge value={inv.status} />
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
