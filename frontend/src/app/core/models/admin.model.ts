export interface AdminUser {
  id: number;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  admin: AdminUser;
}
