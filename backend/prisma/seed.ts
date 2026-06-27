import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ===== ROLES =====
  const roles = [
    { name: 'admin', description: 'Quản trị viên' },
    { name: 'sales', description: 'Nhân viên kinh doanh' },
    { name: 'logistics', description: 'Nhân viên logistics' },
    { name: 'warehouse', description: 'Nhân viên kho' },
    { name: 'factory', description: 'Nhân viên sản xuất' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('✅ Roles created');

  // ===== USERS =====
  const passwordHash = await bcrypt.hash('123456', 10);
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  const salesRole = await prisma.role.findUnique({ where: { name: 'sales' } });
  const logisticsRole = await prisma.role.findUnique({ where: { name: 'logistics' } });
  const warehouseRole = await prisma.role.findUnique({ where: { name: 'warehouse' } });
  const factoryRole = await prisma.role.findUnique({ where: { name: 'factory' } });

  const users = [
    { fullName: 'Nguyễn Văn Admin', email: 'admin@wms.com', roleId: adminRole!.id },
    { fullName: 'Trần Thị Sales', email: 'sales@wms.com', roleId: salesRole!.id },
    { fullName: 'Lê Văn Logistics', email: 'logistics@wms.com', roleId: logisticsRole!.id },
    { fullName: 'Phạm Văn Kho', email: 'warehouse@wms.com', roleId: warehouseRole!.id },
    { fullName: 'Hoàng Văn Sản Xuất', email: 'factory@wms.com', roleId: factoryRole!.id },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash, status: 'active' },
    });
  }
  console.log('✅ Users created (password: 123456 for all)');

  // ===== WAREHOUSES =====
  const warehouses = [
    { warehouseCode: 'KHO001', name: 'Kho Hà Nội', location: 'Quận Bắc Từ Liêm, Hà Nội' },
    { warehouseCode: 'KHO002', name: 'Kho HCM', location: 'Quận 9, TP.HCM' },
    { warehouseCode: 'KHO003', name: 'Kho Đà Nẵng', location: 'Quận Liên Chiểu, Đà Nẵng' },
  ];

  for (const wh of warehouses) {
    await prisma.warehouse.upsert({
      where: { warehouseCode: wh.warehouseCode },
      update: {},
      create: wh,
    });
  }
  console.log('✅ Warehouses created');

  // ===== DEFECTIVE WAREHOUSE =====
  await prisma.warehouse.upsert({
    where: { warehouseCode: 'KHO004' },
    update: {},
    create: { warehouseCode: 'KHO004', name: 'Kho Hàng Lỗi - Phân Loại', location: 'Khu vực phân loại', isDefectiveWarehouse: true },
  });
  console.log('✅ Defective warehouse created');

  // ===== CUSTOMERS =====
  const customers = [
    { customerCode: 'KH001', name: 'Công ty TNHH ABC', phone: '0241234567', address: 'Hà Nội', contactPerson: 'Nguyễn A' },
    { customerCode: 'KH002', name: 'Công ty CP XYZ', phone: '0281234567', address: 'TP.HCM', contactPerson: 'Trần B' },
    { customerCode: 'KH003', name: 'Doanh nghiệp Tân Phú', phone: '0231234567', address: 'Đà Nẵng', contactPerson: 'Lê C' },
    { customerCode: 'KH004', name: 'Trường ĐH Bách Khoa', phone: '0249876543', address: 'Hà Nội', contactPerson: 'Phạm D' },
    { customerCode: 'KH005', name: 'Công ty Viễn Thông V', phone: '0285551234', address: 'TP.HCM', contactPerson: 'Hoàng E' },
  ];

  for (const cust of customers) {
    await prisma.customer.upsert({
      where: { customerCode: cust.customerCode },
      update: {},
      create: cust,
    });
  }
  console.log('✅ Customers created');

  // ===== CARRIERS =====
  const carriers = [
    { name: 'Xe Công Ty (Nội bộ)', code: 'XCT', autoPrefix: 'XCT', isDefault: true },
    { name: 'Giao Hàng Tiết Kiệm', code: 'GHTK', autoPrefix: 'GHTK', isDefault: false },
    { name: 'Viettel Post', code: 'VTP', autoPrefix: 'VTP', isDefault: false },
    { name: 'Grab Express', code: 'GE', autoPrefix: 'GE', isDefault: false },
    { name: 'Ahamove', code: 'AHM', autoPrefix: 'AHM', isDefault: false },
  ];
  for (const c of carriers) {
    await prisma.carrier.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log('✅ Carriers created');

  console.log('\n🎉 Seed completed!');
  console.log('\n📋 Login credentials:');
  console.log('  admin@wms.com / 123456 (Admin)');
  console.log('  sales@wms.com / 123456 (Sales)');
  console.log('  logistics@wms.com / 123456 (Logistics)');
  console.log('  warehouse@wms.com / 123456 (Warehouse)');
  console.log('  factory@wms.com / 123456 (Factory)');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
