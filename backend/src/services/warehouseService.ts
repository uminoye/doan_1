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

  async create(data: { warehouseCode?: string; name: string; location?: string }) {
    let code = data.warehouseCode;
    if (!code) {
      const all = await warehouseRepo.findAll();
      code = `KHO${String(all.length + 1).padStart(3, '0')}`;
    }
    const existing = await warehouseRepo.findByCode(code);
    if (existing) throw new Error('Mã kho đã tồn tại');
    return warehouseRepo.create({ warehouseCode: code, name: data.name, location: data.location || '' });
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
