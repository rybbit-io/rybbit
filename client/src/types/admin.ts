export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
  createdAt: string | Date;
  twoFactorEnabled?: boolean | null;
};

export interface UsersResponse {
  data?: {
    users: AdminUser[];
    total: number;
    limit?: number;
    offset?: number;
  };
}
