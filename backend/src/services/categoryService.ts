import { categoryRepo } from '../repositories';
import { prisma } from '../models/prisma';

export class CategoryService {
  async getAll() {
    return categoryRepo.findAll();
  }

  async getById(id: string) {
    const category = await categoryRepo.findById(id);
    if (!category) throw new Error('Không tìm thấy danh mục');
    return category;
  }

  async create(data: { categoryCode?: string; name: string }) {
    let code = data.categoryCode;
    if (!code) {
      const count = await categoryRepo.count();
      code = `DANHMUC${String(count + 1).padStart(3, '0')}`;
    }
    const existing = await categoryRepo.findByCode(code);
    if (existing) throw new Error('Mã danh mục đã tồn tại');
    return categoryRepo.create({ categoryCode: code, name: data.name });
  }

  async update(id: string, data: { name?: string }) {
    const category = await categoryRepo.findById(id);
    if (!category) throw new Error('Không tìm thấy danh mục');
    return categoryRepo.update(id, data);
  }

  async delete(id: string) {
    const category = await categoryRepo.findById(id);
    if (!category) throw new Error('Không tìm thấy danh mục');
    await categoryRepo.delete(id);
    return { message: 'Xóa danh mục thành công' };
  }
}
