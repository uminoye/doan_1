require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Roles
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin', description: 'Quản trị hệ thống' } }),
    prisma.role.upsert({ where: { name: 'sales' }, update: {}, create: { name: 'sales', description: 'Nhân viên kinh doanh' } }),
    prisma.role.upsert({ where: { name: 'logistics' }, update: {}, create: { name: 'logistics', description: 'Nhân viên logistics' } }),
    prisma.role.upsert({ where: { name: 'warehouse' }, update: {}, create: { name: 'warehouse', description: 'Nhân viên kho' } }),
    prisma.role.upsert({ where: { name: 'factory' }, update: {}, create: { name: 'factory', description: 'Nhân viên nhà máy' } }),
  ]);

  console.log('Roles created:', roles.length);

  // Users
  const password = bcrypt.hashSync('123456', 10);
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@wms.com' },
      update: {},
      create: { email: 'admin@wms.com', passwordHash: password, fullName: 'Nguyễn Văn An', roleId: roles[0].id },
    }),
    prisma.user.upsert({
      where: { email: 'sales@wms.com' },
      update: {},
      create: { email: 'sales@wms.com', passwordHash: password, fullName: 'Trần Thị Bình', roleId: roles[1].id },
    }),
    prisma.user.upsert({
      where: { email: 'logistics@wms.com' },
      update: {},
      create: { email: 'logistics@wms.com', passwordHash: password, fullName: 'Lê Văn Cường', roleId: roles[2].id },
    }),
    prisma.user.upsert({
      where: { email: 'warehouse@wms.com' },
      update: {},
      create: { email: 'warehouse@wms.com', passwordHash: password, fullName: 'Phạm Thị Dung', roleId: roles[3].id },
    }),
    prisma.user.upsert({
      where: { email: 'factory@wms.com' },
      update: {},
      create: { email: 'factory@wms.com', passwordHash: password, fullName: 'Hoàng Văn Em', roleId: roles[4].id },
    }),
  ]);

  console.log('Users created:', users.length);

  // Warehouses
  const warehouses = await Promise.all([
    prisma.warehouse.upsert({
      where: { warehouseCode: 'WH001' },
      update: {},
      create: { warehouseCode: 'WH001', name: 'Kho Tổng Hà Nội', location: 'Hà Nội', isDefectiveWarehouse: false },
    }),
    prisma.warehouse.upsert({
      where: { warehouseCode: 'WH002' },
      update: {},
      create: { warehouseCode: 'WH002', name: 'Kho Sài Gòn', location: 'TP.HCM', isDefectiveWarehouse: false },
    }),
    prisma.warehouse.upsert({
      where: { warehouseCode: 'WH003' },
      update: {},
      create: { warehouseCode: 'WH003', name: 'Kho Lỗi', location: 'Hà Nội', isDefectiveWarehouse: true },
    }),
  ]);

  console.log('Warehouses created:', warehouses.length);

  // Customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { customerCode: 'KH001' },
      update: {},
      create: { customerCode: 'KH001', name: 'Công ty TNHH Điện Lực Miền Bắc', phone: '024-12345678', address: 'Hà Nội', contactPerson: 'Nguyễn Văn Minh' },
    }),
    prisma.customer.upsert({
      where: { customerCode: 'KH002' },
      update: {},
      create: { customerCode: 'KH002', name: 'Công ty CP Xây Lắp Điện 1', phone: '028-87654321', address: 'TP.HCM', contactPerson: 'Trần Văn Tùng' },
    }),
    prisma.customer.upsert({
      where: { customerCode: 'KH003' },
      update: {},
      create: { customerCode: 'KH003', name: 'Công ty TNHH MTV Điện 2', phone: '027-11223344', address: 'Đà Nẵng', contactPerson: 'Lê Thị Hương' },
    }),
  ]);

  console.log('Customers created:', customers.length);

  // Products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'SP001' },
      update: {},
      create: { sku: 'SP001', name: 'Ống thép tròn DN25', unit: 'Cái', category: 'Ống thép', salePrice: 85000, minStock: 50 },
    }),
    prisma.product.upsert({
      where: { sku: 'SP002' },
      update: {},
      create: { sku: 'SP002', name: 'Ống thép tròn DN40', unit: 'Cái', category: 'Ống thép', salePrice: 135000, minStock: 30 },
    }),
    prisma.product.upsert({
      where: { sku: 'SP003' },
      update: {},
      create: { sku: 'SP003', name: 'Co cút DN25', unit: 'Cái', category: 'Phụ kiện', salePrice: 22000, minStock: 100 },
    }),
    prisma.product.upsert({
      where: { sku: 'SP004' },
      update: {},
      create: { sku: 'SP004', name: 'Van cổng DN50', unit: 'Cái', category: 'Van', salePrice: 450000, minStock: 10 },
    }),
    prisma.product.upsert({
      where: { sku: 'SP005' },
      update: {},
      create: { sku: 'SP005', name: 'Bulong M12x50', unit: 'Bộ', category: 'Vật tư', salePrice: 8500, minStock: 200 },
    }),
  ]);

  console.log('Products created:', products.length);

  // Initialize stock for each product in each warehouse
  for (const product of products) {
    for (const wh of warehouses.filter(w => !w.isDefectiveWarehouse)) {
      await prisma.inventoryBalance.upsert({
        where: { warehouseId_productId: { warehouseId: wh.id, productId: product.id } },
        update: {},
        create: { warehouseId: wh.id, productId: product.id, onHandQty: Math.floor(Math.random() * 80) + 20 },
      });
    }
  }

  console.log('Stock initialized');
  console.log('Seed completed!');
  console.log('\nLogin credentials:');
  console.log('  admin@wms.com / 123456 (Admin)');
  console.log('  sales@wms.com / 123456 (Sales)');
  console.log('  logistics@wms.com / 123456 (Logistics)');
  console.log('  warehouse@wms.com / 123456 (Warehouse)');
  console.log('  factory@wms.com / 123456 (Factory)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
