import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { UnauthorizedError } from "../lib/errors";
import type { AdminRepository } from "../repositories/admin.repository";

export class AuthService {
  constructor(
    private readonly admins: AdminRepository,
    private readonly secret: string,
    private readonly expiresIn: NonNullable<SignOptions["expiresIn"]>,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.admins.findByEmail(email.toLowerCase());
    const passwordMatches = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!admin || !admin.active || !passwordMatches) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const token = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role }, this.secret, {
      expiresIn: this.expiresIn,
      issuer: "crisisdesk-api",
      audience: "crisisdesk-admin",
    });
    return { token, tokenType: "Bearer" as const, expiresIn: this.expiresIn };
  }

  verify(token: string) {
    return jwt.verify(token, this.secret, {
      issuer: "crisisdesk-api",
      audience: "crisisdesk-admin",
    });
  }
}
