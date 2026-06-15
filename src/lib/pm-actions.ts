"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/business";
import { formatHours } from "@/lib/format";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

function str(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}
function optStr(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  return s === "" ? null : s;
}
function optFloat(v: FormDataEntryValue | null): number | null {
  const s = str(v);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function optDate(v: FormDataEntryValue | null): Date | null {
  const s = str(v);
  if (s === "") return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/* ----------------------------- Clients ----------------------------- */

export async function createClient(formData: FormData) {
  const userId = await getUserId();
  await prisma.client.create({
    data: {
      name: str(formData.get("name")),
      company: optStr(formData.get("company")),
      email: optStr(formData.get("email")),
      phone: optStr(formData.get("phone")),
      notes: optStr(formData.get("notes")),
      userId,
    },
  });
  revalidatePath("/dashboard/clients");
}

export async function deleteClient(formData: FormData) {
  await getUserId();
  await prisma.client.delete({ where: { id: str(formData.get("id")) } });
  revalidatePath("/dashboard/clients");
}

/* ----------------------------- Projects ----------------------------- */

export async function createProject(formData: FormData) {
  const userId = await getUserId();
  const project = await prisma.project.create({
    data: {
      name: str(formData.get("name")),
      description: optStr(formData.get("description")),
      status: str(formData.get("status")) || "active",
      budget: optFloat(formData.get("budget")),
      hourlyRate: optFloat(formData.get("hourlyRate")),
      clientId: optStr(formData.get("clientId")),
      userId,
    },
  });
  revalidatePath("/dashboard/projects");
  redirect(`/dashboard/projects/${project.id}`);
}

export async function updateProjectStatus(formData: FormData) {
  await getUserId();
  const id = str(formData.get("id"));
  await prisma.project.update({
    where: { id },
    data: { status: str(formData.get("status")) },
  });
  revalidatePath(`/dashboard/projects/${id}`);
  revalidatePath("/dashboard/projects");
}

export async function deleteProject(formData: FormData) {
  await getUserId();
  await prisma.project.delete({ where: { id: str(formData.get("id")) } });
  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}

/* ----------------------------- Tasks ----------------------------- */

export async function createTask(formData: FormData) {
  await getUserId();
  const projectId = str(formData.get("projectId"));
  await prisma.task.create({
    data: {
      title: str(formData.get("title")),
      description: optStr(formData.get("description")),
      status: str(formData.get("status")) || "todo",
      priority: str(formData.get("priority")) || "medium",
      dueDate: optDate(formData.get("dueDate")),
      projectId,
    },
  });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function setTaskStatus(formData: FormData) {
  await getUserId();
  const id = str(formData.get("id"));
  const projectId = str(formData.get("projectId"));
  await prisma.task.update({
    where: { id },
    data: { status: str(formData.get("status")) },
  });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function deleteTask(formData: FormData) {
  await getUserId();
  const id = str(formData.get("id"));
  const projectId = str(formData.get("projectId"));
  await prisma.task.delete({ where: { id } });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

/* ----------------------------- Time ----------------------------- */

export async function createTimeEntry(formData: FormData) {
  await getUserId();
  const projectId = str(formData.get("projectId"));
  const hours = optFloat(formData.get("hours")) ?? 0;
  await prisma.timeEntry.create({
    data: {
      description: optStr(formData.get("description")),
      minutes: Math.round(hours * 60),
      date: optDate(formData.get("date")) ?? new Date(),
      billable: str(formData.get("billable")) === "on",
      projectId,
      taskId: optStr(formData.get("taskId")),
    },
  });
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/time");
}

export async function deleteTimeEntry(formData: FormData) {
  await getUserId();
  const id = str(formData.get("id"));
  await prisma.timeEntry.delete({ where: { id } });
  revalidatePath(`/dashboard/projects/${str(formData.get("projectId"))}`);
  revalidatePath("/dashboard/time");
}

/* ----------------------------- Invoices ----------------------------- */

export async function createInvoice(formData: FormData) {
  const userId = await getUserId();
  const profile = await getBusinessProfile();
  const count = await prisma.invoice.count();
  const number = `INV-${String(count + 1).padStart(4, "0")}`;
  const invoice = await prisma.invoice.create({
    data: {
      number,
      status: "draft",
      clientId: optStr(formData.get("clientId")),
      dueDate: optDate(formData.get("dueDate")),
      notes: optStr(formData.get("notes")) ?? profile.invoiceNotes,
      taxRate: profile.taxRate,
      userId,
    },
  });
  revalidatePath("/dashboard/invoices");
  redirect(`/dashboard/invoices/${invoice.id}`);
}

// Bill all unbilled, billable time on a project as a single invoice line item.
export async function addProjectTimeToInvoice(formData: FormData) {
  await getUserId();
  const invoiceId = str(formData.get("invoiceId"));
  const projectId = str(formData.get("projectId"));
  if (!invoiceId || !projectId) return;

  const [profile, project, entries] = await Promise.all([
    getBusinessProfile(),
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.timeEntry.findMany({
      where: { projectId, billable: true, invoiceId: null },
    }),
  ]);

  if (!project || entries.length === 0) return;

  const minutes = entries.reduce((s, e) => s + e.minutes, 0);
  const hours = minutes / 60;
  const rate = project.hourlyRate ?? profile.defaultHourlyRate;

  await prisma.$transaction([
    prisma.invoiceItem.create({
      data: {
        invoiceId,
        description: `${project.name} — tracked time (${formatHours(minutes)})`,
        quantity: Math.round(hours * 100) / 100,
        rate,
      },
    }),
    prisma.timeEntry.updateMany({
      where: { id: { in: entries.map((e) => e.id) } },
      data: { invoiceId },
    }),
  ]);

  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

export async function addInvoiceItem(formData: FormData) {
  await getUserId();
  const invoiceId = str(formData.get("invoiceId"));
  await prisma.invoiceItem.create({
    data: {
      invoiceId,
      description: str(formData.get("description")),
      quantity: optFloat(formData.get("quantity")) ?? 1,
      rate: optFloat(formData.get("rate")) ?? 0,
    },
  });
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

export async function deleteInvoiceItem(formData: FormData) {
  await getUserId();
  const invoiceId = str(formData.get("invoiceId"));
  await prisma.invoiceItem.delete({ where: { id: str(formData.get("id")) } });
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

export async function setInvoiceStatus(formData: FormData) {
  await getUserId();
  const id = str(formData.get("id"));
  await prisma.invoice.update({
    where: { id },
    data: { status: str(formData.get("status")) },
  });
  revalidatePath(`/dashboard/invoices/${id}`);
  revalidatePath("/dashboard/invoices");
}

export async function deleteInvoice(formData: FormData) {
  await getUserId();
  await prisma.invoice.delete({ where: { id: str(formData.get("id")) } });
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
