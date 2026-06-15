import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const alertCount = await prisma.alert.count({ where: { readAt: null } });

  return (
    <div className="min-h-screen bg-muted/40">
      <DashboardHeader user={session.user} alertCount={alertCount} />
      <main className="container mx-auto px-4 py-6 print:p-0">{children}</main>
    </div>
  );
}
