import { Request, Response } from 'express';
import { AuthService, UserService } from '../services/authService';
import { asyncHandler } from '../middlewares/errorHandler';

const authService = new AuthService();
const userService = new UserService();

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
    return;
  }
  const result = await authService.login(email, password);
  res.json(result);
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await authService.getProfile(userId);
  res.json(result);
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, roleId } = req.query;
  const result = await userService.getAll({
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    search: search as string,
    roleId: roleId as string,
  });
  res.json(result);
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.getById(req.params.id);
  res.json(result);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.create(req.body);
  res.status(201).json(result);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.update(req.params.id, req.body);
  res.json(result);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.delete(req.params.id);
  res.json(result);
});

export const getRoles = asyncHandler(async (_req: Request, res: Response) => {
  const result = await userService.getRoles();
  res.json(result);
});
