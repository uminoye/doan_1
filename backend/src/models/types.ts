import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}
