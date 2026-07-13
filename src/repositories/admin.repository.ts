export interface AdminAccount {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  active: boolean;
}

export interface AdminRepository {
  findByEmail(email: string): Promise<AdminAccount | null>;
}
