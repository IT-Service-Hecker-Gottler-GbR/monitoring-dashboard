import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { Printer } from "lucide-react";
import {
  addInvoiceItem,
  deleteInvoiceItem,
  setInvoiceStatus,
  deleteInvoice,
  addProjectTimeToInvoice,
} from "@/lib/pm-actions";
import {
  INVOICE_STATUSES,
  formatCurrency,
  formatDate,
  formatHours,
  labelize,
  selectClass,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, profile] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { client: true, items: true },
    }),
    getBusinessProfile(),
  ]);
  if (!invoice) notFound();

  const currency = profile.currency;
  const subtotal = invoice.items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const tax = subtotal * (invoice.taxRate / 100);
  const total = subtotal + tax;

  // Unbilled, billable time available to add — scoped to this invoice's client.
  const unbilledEntries = await prisma.timeEntry.findMany({
    where: {
      billable: true,
      invoiceId: null,
      project: invoice.clientId ? { clientId: invoice.clientId } : undefined,
    },
    include: { project: true },
  });

  const byProject = new Map<
    string,
    { name: string; minutes: number; rate: number }
  >();
  for (const e of unbilledEntries) {
    const rate = e.project.hourlyRate ?? profile.defaultHourlyRate;
    const cur = byProject.get(e.projectId) ?? {
      name: e.project.name,
      minutes: 0,
      rate,
    };
    cur.minutes += e.minutes;
    byProject.set(e.projectId, cur);
  }
  const unbilledGroups = [...byProject.entries()];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/invoices" className="text-sm text-primary hover:underline">
          ← Invoices
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.number}</h1>
              <StatusBadge value={invoice.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {invoice.client?.name ?? "No client"} · issued {formatDate(invoice.issuedDate)}
              {invoice.dueDate && ` · due ${formatDate(invoice.dueDate)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/invoices/${invoice.id}/print`}>
                <Printer className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Print / PDF</span>
              </Link>
            </Button>
            <form action={setInvoiceStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={invoice.id} />
              <select
                name="status"
                defaultValue={invoice.status}
                className={`${selectClass} w-auto`}
              >
                {INVOICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {labelize(s)}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline" size="sm">
                Update
              </Button>
            </form>
            <form action={deleteInvoice}>
              <input type="hidden" name="id" value={invoice.id} />
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

      {/* Unbilled time available to add */}
      {unbilledGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unbilled time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unbilledGroups.map(([projectId, g]) => {
              const amount = (g.minutes / 60) * g.rate;
              return (
                <div
                  key={projectId}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="text-sm">
                    <p className="font-medium">{g.name}</p>
                    <p className="text-muted-foreground">
                      {formatHours(g.minutes)} @ {formatCurrency(g.rate, currency)}/h ={" "}
                      {formatCurrency(amount, currency)}
                    </p>
                  </div>
                  <form action={addProjectTimeToInvoice}>
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <Button type="submit" size="sm" variant="secondary">
                      Add to invoice
                    </Button>
                  </form>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Rate</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoice.items.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">{i.description}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.quantity}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatCurrency(i.rate, currency)}
                </td>
                <td className="px-4 py-3 font-medium">
                  {formatCurrency(i.quantity * i.rate, currency)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteInvoiceItem}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="xs"
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
            {invoice.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No line items yet.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t">
            <tr>
              <td colSpan={3} className="px-4 pt-3 text-right text-muted-foreground">
                Subtotal
              </td>
              <td className="px-4 pt-3">{formatCurrency(subtotal, currency)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-1 text-right text-muted-foreground">
                Tax ({invoice.taxRate}%)
              </td>
              <td className="px-4 py-1">{formatCurrency(tax, currency)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 pb-3 text-right font-medium">
                Total
              </td>
              <td className="px-4 pb-3 text-lg font-bold">
                {formatCurrency(total, currency)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add line item</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addInvoiceItem} className="grid gap-3 sm:grid-cols-6">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <div className="sm:col-span-3">
              <Label htmlFor="description" className="mb-1.5">
                Description *
              </Label>
              <Input id="description" name="description" required placeholder="Consulting hours" />
            </div>
            <div>
              <Label htmlFor="quantity" className="mb-1.5">
                Qty
              </Label>
              <Input id="quantity" name="quantity" type="number" step="0.01" defaultValue="1" />
            </div>
            <div>
              <Label htmlFor="rate" className="mb-1.5">
                Rate
              </Label>
              <Input id="rate" name="rate" type="number" step="0.01" defaultValue="0" />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {invoice.notes && (
        <p className="text-sm text-muted-foreground">Notes: {invoice.notes}</p>
      )}
    </div>
  );
}
