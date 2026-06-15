import { prisma } from "@/lib/prisma";

// Returns the singleton business profile, creating it on first access.
export async function getBusinessProfile() {
  return prisma.businessProfile.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}
