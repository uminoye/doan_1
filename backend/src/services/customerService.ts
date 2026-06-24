import { customerRepo } from '../repositories';

export class CustomerService {
  async getAll(params?: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { customerCode: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      customerRepo.findAll({ skip, take: limit, where }),
      customerRepo.count({ where }),
    ]);

    return {
      data: customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const customer = await customerRepo.findById(id);
    if (!customer) throw new Error('Không tìm thấy khách hàng');
    return customer;
  }

  async create(data: { customerCode: string; name: string; phone?: string; address?: string; contactPerson?: string }) {
    const existing = await customerRepo.findByCode(data.customerCode);
    if (existing) throw new Error('Mã khách hàng đã tồn tại');
    return customerRepo.create(data);
  }

  async update(id: string, data: Partial<{ name: string; phone: string; address: string; contactPerson: string }>) {
    const customer = await customerRepo.findById(id);
    if (!customer) throw new Error('Không tìm thấy khách hàng');
    return customerRepo.update(id, data);
  }

  async delete(id: string) {
    const customer = await customerRepo.findById(id);
    if (!customer) throw new Error('Không tìm thấy khách hàng');
    await customerRepo.delete(id);
    return { message: 'Xóa khách hàng thành công' };
  }
}
