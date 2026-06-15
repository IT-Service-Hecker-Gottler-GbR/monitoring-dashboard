import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/business";
import { PrintButton } from "@/components/print-button";
import { formatCurrency, formatDate, labelize } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage({
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

  return (
    <div className="mx-auto max-w-3xl">
      {/* Toolbar — hidden when printing */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/dashboard/invoices/${invoice.id}`}
          className="text-sm text-primary hover:underline"
        >
          ← Back to invoice
        </Link>
        <PrintButton />
      </div>

      {/* Invoice document — a white sheet that prints cleanly */}
      <div className="rounded-xl border bg-white p-10 text-slate-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-xl font-bold">{profile.companyName}</h1>
            <div className="mt-1 text-sm text-slate-500">
              {profile.addressLine1 && <p>{profile.addressLine1}</p>}
              {profile.addressLine2 && <p>{profile.addressLine2}</p>}
              {profile.email && <p>{profile.email}</p>}
              {profile.phone && <p>{profile.phone}</p>}
              {profile.taxId && <p>Tax ID: {profile.taxId}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold tracking-tight">INVOICE</h2>
            <p className="mt-1 text-sm font-medium">{invoice.number}</p>
            <p className="text-sm text-slate-500">
              Issued {formatDate(invoice.issuedDate)}
            </p>
            {invoice.dueDate && (
              <p className="text-sm text-slate-500">Due {formatDate(invoice.dueDate)}</p>
            )}
            <p className="mt-1 text-sm text-slate-500">
              Status: {labelize(invoice.status)}
            </p>
          </div>
        </div>

        {invoice.client && (
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Bill to
            </p>
            <p className="mt-1 font-medium">{invoice.client.name}</p>
            {invoice.client.company && (
              <p className="text-sm text-slate-500">{invoice.client.company}</p>
            )}
            {invoice.client.email && (
              <p className="text-sm text-slate-500">{invoice.client.email}</p>
            )}
          </div>
        )}

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((i) => (
              <tr key={i.id} className="border-b border-slate-100">
                <td className="py-2">{i.description}</td>
                <td className="py-2 text-right">{i.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(i.rate, currency)}</td>
                <td className="py-2 text-right">
                  {formatCurrency(i.quantity * i.rate, currency)}
                </td>
              </tr>
            ))}
            {invoice.items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  No line items.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax ({invoice.taxRate}%)</span>
              <span>{formatCurrency(tax, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>
          </div>
        </div>

        {(invoice.notes || profile.invoiceNotes) && (
          <div className="mt-10 border-t border-slate-200 pt-4 text-sm text-slate-500">
            {invoice.notes || profile.invoiceNotes}
          </div>
        )}
      </div>
    </div>
  );
}
