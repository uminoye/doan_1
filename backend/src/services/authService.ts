import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../models/prisma';

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    if (!user) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }
    if (user.status !== 'active') {
      throw new Error('Tài khoản đã bị vô hiệu hóa');
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
    };
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: '7d',
    });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role.name,
        roleId: user.roleId,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new Error('Không tìm thấy người dùng');
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      roleId: user.roleId,
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Không tìm thấy người dùng');
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) throw new Error('Mật khẩu cũ không đúng');
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Đổi mật khẩu thành công' };
  }
}

export class UserService {
  async getAll(params: { page?: number; limit?: number; search?: string; roleId?: string }) {
    const { page = 1, limit = 20, search, roleId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (roleId) where.roleId = roleId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({ skip, take: limit, where, include: { role: true }, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        roleId: u.roleId,
        roleName: u.role.name,
        status: u.status,
        createdAt: u.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new Error('Không tìm thấy người dùng');
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      status: user.status,
    };
  }

  async create(data: { fullName: string; email: string; password: string; roleId: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('Email đã tồn tại');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { fullName: data.fullName, email: data.email, passwordHash, roleId: data.roleId, status: 'active' },
    });
    return { id: user.id, fullName: user.fullName, email: user.email, roleId: user.roleId };
  }

  async update(id: string, data: { fullName?: string; roleId?: string; status?: string }) {
    const user = await prisma.user.update({ where: { id }, data });
    return { id: user.id, fullName: user.fullName, email: user.email, roleId: user.roleId, status: user.status };
  }

  async delete(id: string) {
    await prisma.user.delete({ where: { id } });
    return { message: 'Xóa người dùng thành công' };
  }

  async getRoles() {
    return prisma.role.findMany({ orderBy: { name: 'asc' } });
  }
}
