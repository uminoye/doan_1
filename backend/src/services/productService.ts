import { productRepo } from '../repositories';

export class ProductService {
  async getAll(params?: { page?: number; limit?: number; search?: string; category?: string }) {
    const { page = 1, limit = 20, search, category } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const [products, total] = await Promise.all([
      productRepo.findAll({ skip, take: limit, where }),
      productRepo.count({ where }),
    ]);

    return {
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const product = await productRepo.findById(id);
    if (!product) throw new Error('Không tìm thấy sản phẩm');
    return product;
  }

  async create(data: { sku: string; name: string; unit?: string; category?: string; salePrice?: number }) {
    const existing = await productRepo.findBySku(data.sku);
    if (existing) throw new Error('Mã SKU đã tồn tại');
    return productRepo.create(data);
  }

  async update(id: string, data: Partial<{ name: string; unit: string; category: string; salePrice: number }>) {
    const product = await productRepo.findById(id);
    if (!product) throw new Error('Không tìm thấy sản phẩm');
    return productRepo.update(id, data);
  }

  async delete(id: string) {
    const product = await productRepo.findById(id);
    if (!product) throw new Error('Không tìm thấy sản phẩm');
    await productRepo.delete(id);
    return { message: 'Xóa sản phẩm thành công' };
  }

  async getCategories() {
    const products = await productRepo.findAll({ select: { category: true } });
    const cats = [...new Set(products.map((p: any) => p.category).filter(Boolean))];
    return cats;
  }
}
