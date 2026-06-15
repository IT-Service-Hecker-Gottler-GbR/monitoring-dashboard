"use server";

import { revalidatePath } from "next/cache";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type ActionResult =
  | { success: true; error?: never }
  | { success?: never; error: string };

function str(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}
function optStr(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  return s === "" ? null : s;
}
function num(v: FormDataEntryValue | null): number {
  const n = Number(str(v));
  return Number.isFinite(n) ? n : 0;
}

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function updateBusinessProfile(
  formData: FormData
): Promise<ActionResult> {
  await getUserId();

  const data = {
    companyName: str(formData.get("companyName")) || "My Business",
    addressLine1: optStr(formData.get("addressLine1")),
    addressLine2: optStr(formData.get("addressLine2")),
    email: optStr(formData.get("email")),
    phone: optStr(formData.get("phone")),
    taxId: optStr(formData.get("taxId")),
    taxRate: num(formData.get("taxRate")),
    defaultHourlyRate: num(formData.get("defaultHourlyRate")),
    currency: str(formData.get("currency")) || "USD",
    invoiceNotes: optStr(formData.get("invoiceNotes")),
  };

  await prisma.businessProfile.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function changePassword(
  formData: FormData
): Promise<ActionResult> {
  const userId = await getUserId();

  const current = str(formData.get("currentPassword"));
  const next = str(formData.get("newPassword"));
  const confirm = str(formData.get("confirmPassword"));

  if (!current || !next) return { error: "All password fields are required." };
  if (next.length < 8)
    return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found." };

  const ok = await compare(current, user.hashedPassword);
  if (!ok) return { error: "Current password is incorrect." };

  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword: await hash(next, 12) },
  });

  return { success: true };
}
