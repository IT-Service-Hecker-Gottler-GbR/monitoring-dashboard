"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";

type ActionResult = { success: true; error?: never } | { success?: never; error: string };

const domainSchema = z.object({
  url: z.url("Please enter a valid URL"),
  customerName: z.string().min(1, "Customer name is required"),
  checkInterval: z.number().min(1).max(1440),
});

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function createDomain(formData: FormData): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();

  const parsed = domainSchema.safeParse({
    url: formData.get("url"),
    customerName: formData.get("customerName"),
    checkInterval: Number(formData.get("checkInterval")),
  });

  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  await prisma.domain.create({
    data: {
      url: parsed.data.url,
      customerName: parsed.data.customerName,
      checkInterval: parsed.data.checkInterval,
      userId,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateDomain(id: string, formData: FormData): Promise<ActionResult> {
  await getAuthenticatedUserId();

  const parsed = domainSchema.safeParse({
    url: formData.get("url"),
    customerName: formData.get("customerName"),
    checkInterval: Number(formData.get("checkInterval")),
  });

  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  await prisma.domain.update({
    where: { id },
    data: {
      url: parsed.data.url,
      customerName: parsed.data.customerName,
      checkInterval: parsed.data.checkInterval,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteDomain(id: string): Promise<ActionResult> {
  await getAuthenticatedUserId();

  await prisma.domain.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleDomain(id: string, isActive: boolean): Promise<ActionResult> {
  await getAuthenticatedUserId();

  await prisma.domain.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function triggerMonitor(): Promise<ActionResult> {
  await getAuthenticatedUserId();

  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/monitor/run`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.MONITOR_API_KEY || "",
    },
  });

  if (!res.ok) {
    return { error: "Failed to trigger monitoring" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

