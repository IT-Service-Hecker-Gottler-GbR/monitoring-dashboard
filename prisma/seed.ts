import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@it-service-hg.de" },
    update: {},
    create: {
      email: "admin@it-service-hg.de",
      name: "Admin",
      hashedPassword,
    },
  });

  console.log("Seeded admin user:", admin.email);

  // Business profile (used on invoices / for billing tracked time)
  await prisma.businessProfile.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "IT-Service Hecker & Gottler GbR",
      currency: "EUR",
      taxRate: 19,
      defaultHourlyRate: 90,
      invoiceNotes: "Payment due within 14 days. Thank you for your business!",
    },
  });

  // Seed example server group
  const existingGroups = await prisma.serverGroup.count();
  let hetznerGroup: { id: string } | null = null;
  if (existingGroups === 0) {
    hetznerGroup = await prisma.serverGroup.create({
      data: {
        name: "Hetzner Server #1",
        description: "4 vCPU, 8 GB RAM, Falkenstein",
        color: "#6366f1",
        userId: admin.id,
      },
    });
    console.log("Seeded example server group:", hetznerGroup.id);
  }

  // Seed example domains
  const existingDomains = await prisma.domain.count();
  if (existingDomains === 0) {
    await prisma.domain.createMany({
      data: [
        {
          url: "https://it-service-hg.de",
          customerName: "IT-Service HG",
          checkInterval: 5,
          isActive: true,
          userId: admin.id,
          serverGroupId: hetznerGroup?.id ?? null,
        },
        {
          url: "https://google.com",
          customerName: "Google (Test)",
          checkInterval: 10,
          isActive: true,
          userId: admin.id,
        },
      ],
    });
    console.log("Seeded example domains");
  }

  // Seed example project-management data
  const existingClients = await prisma.client.count();
  if (existingClients === 0) {
    const acme = await prisma.client.create({
      data: {
        name: "Sarah Chen",
        company: "Acme Co.",
        email: "sarah@acme.co",
        phone: "555-0142",
        userId: admin.id,
      },
    });

    const project = await prisma.project.create({
      data: {
        name: "Website Redesign",
        description: "Full marketing site rebuild with new brand.",
        status: "active",
        budget: 12000,
        hourlyRate: 120,
        userId: admin.id,
        clientId: acme.id,
        tasks: {
          create: [
            { title: "Discovery workshop", status: "done", priority: "high" },
            { title: "Wireframes", status: "in_progress", priority: "high" },
            { title: "Homepage design", status: "todo", priority: "medium" },
            { title: "Build & launch", status: "todo", priority: "low" },
          ],
        },
      },
      include: { tasks: true },
    });

    await prisma.timeEntry.create({
      data: {
        description: "Kickoff call",
        minutes: 90,
        projectId: project.id,
        taskId: project.tasks[0].id,
      },
    });

    await prisma.invoice.create({
      data: {
        number: "INV-0001",
        status: "sent",
        userId: admin.id,
        clientId: acme.id,
        items: {
          create: [
            { description: "Discovery & strategy", quantity: 10, rate: 150 },
            { description: "Wireframing", quantity: 8, rate: 150 },
          ],
        },
      },
    });

    console.log("Seeded example project, client and invoice");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

