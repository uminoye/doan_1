import { warehouseRepo } from '../repositories';

export class WarehouseService {
  async getAll() {
    return warehouseRepo.findAll();
  }

  async getById(id: string) {
    const warehouse = await warehouseRepo.findById(id);
    if (!warehouse) throw new Error('Không tìm thấy kho');
    return warehouse;
  }

  async create(data: { warehouseCode: string; name: string; location?: string }) {
    const existing = await warehouseRepo.findByCode(data.warehouseCode);
    if (existing) throw new Error('Mã kho đã tồn tại');
    return warehouseRepo.create(data);
  }

  async update(id: string, data: Partial<{ name: string; location: string }>) {
    const warehouse = await warehouseRepo.findById(id);
    if (!warehouse) throw new Error('Không tìm thấy kho');
    return warehouseRepo.update(id, data);
  }

  async delete(id: string) {
    const warehouse = await warehouseRepo.findById(id);
    if (!warehouse) throw new Error('Không tìm thấy kho');
    await warehouseRepo.delete(id);
    return { message: 'Xóa kho thành công' };
  }
}
