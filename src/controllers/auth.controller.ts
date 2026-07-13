import type { Request, Response } from "express";
import type { AuthService } from "../services/auth.service";

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  login = async (request: Request, response: Response) => {
    const result = await this.auth.login(request.body.email, request.body.password);
    response.json({ success: true, ...result });
  };
}
