import { prisma } from '../models/prisma';
import { AppError } from '../middlewares/errorHandler';

export class CarrierService {
  async getAll() {
    return prisma.carrier.findMany({ orderBy: { name: 'asc' } });
  }

  async getById(id: string) {
    const c = await prisma.carrier.findUnique({ where: { id } });
    if (!c) throw new AppError(404, 'Không tìm thấy đơn vị vận chuyển');
    return c;
  }

  async create(data: { name: string; code: string; autoPrefix?: string }) {
    if (!data.name || !data.code) throw new AppError(400, 'Tên và mã đơn vị vận chuyển là bắt buộc');
    const existing = await prisma.carrier.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code }] },
    });
    if (existing) throw new AppError(400, 'Tên hoặc mã đơn vị vận chuyển đã tồn tại');

    const prefix = data.autoPrefix || data.code.toUpperCase().slice(0, 3);
    return prisma.carrier.create({
      data: { name: data.name, code: data.code.toUpperCase(), autoPrefix: prefix, isDefault: false },
    });
  }

  async update(id: string, data: { name?: string; autoPrefix?: string }) {
    const c = await prisma.carrier.findUnique({ where: { id } });
    if (!c) throw new AppError(404, 'Không tìm thấy đơn vị vận chuyển');
    return prisma.carrier.update({
      where: { id },
      data: { name: data.name || c.name, autoPrefix: data.autoPrefix || c.autoPrefix },
    });
  }

  async delete(id: string) {
    const c = await prisma.carrier.findUnique({ where: { id } });
    if (!c) throw new AppError(404, 'Không tìm thấy đơn vị vận chuyển');
    const shipment = await prisma.shipment.findFirst({ where: { carrierId: id } });
    if (shipment) throw new AppError(400, 'Không thể xóa đơn vị đang có đơn vận chuyển');
    await prisma.carrier.delete({ where: { id } });
    return { message: `Đã xóa đơn vị vận chuyển "${c.name}"` };
  }

  generateTrackingNo(carrier: { code: string; autoPrefix: string }): string {
    const num = Math.floor(Math.random() * 900000) + 100000;
    return `${carrier.autoPrefix || carrier.code}-${num}`;
  }
}
