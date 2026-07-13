import type { PrismaClient } from "@prisma/client";
import type { AdminRepository } from "./admin.repository";

export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string) {
    return this.prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, passwordHash: true, role: true, active: true },
    });
  }
}
