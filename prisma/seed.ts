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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

