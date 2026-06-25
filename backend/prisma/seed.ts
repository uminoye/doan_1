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

  // ===== CATEGORIES =====
  const catNames = ['Nội thất', 'Điện tử', 'Thực phẩm', 'Dược phẩm', 'May mặc'];
  for (let i = 0; i < catNames.length; i++) {
    await prisma.category.upsert({
      where: { categoryCode: `DM${String(i + 1).padStart(3, '0')}` },
      update: {},
      create: { categoryCode: `DM${String(i + 1).padStart(3, '0')}`, name: catNames[i] },
    });
  }
  console.log('✅ Categories created');

  // ===== WAREHOUSES =====
  const warehouses = [
    { warehouseCode: 'KHO001', name: 'Kho Hà Nội', location: 'Quận Bắc Từ Liêm, Hà Nội' },
    { warehouseCode: 'KHO002', name: 'Kho HCM', location: 'Quận 9, TP.HCM' },
    { warehouseCode: 'KHO003', name: 'Kho Đà Nẵng', location: 'Quận Liên Chiểu, Đà Nẵng' },
  ];

  const createdWarehouses: any[] = [];
  for (const wh of warehouses) {
    const created = await prisma.warehouse.upsert({
      where: { warehouseCode: wh.warehouseCode },
      update: {},
      create: wh,
    });
    createdWarehouses.push(created);
  }
  console.log('✅ Warehouses created');

  // ===== PRODUCTS =====
  const products = [
    { sku: 'SP001', name: 'Bàn ghế văn phòng', unit: 'bộ', category: 'Nội thất', salePrice: 2500000, minStock: 10 },
    { sku: 'SP002', name: 'Máy tính xách tay Dell XPS', unit: 'cái', category: 'Điện tử', salePrice: 18500000, minStock: 5 },
    { sku: 'SP003', name: 'Máy in HP LaserJet', unit: 'cái', category: 'Điện tử', salePrice: 4500000, minStock: 3 },
    { sku: 'SP004', name: 'Ghế ergonomic', unit: 'cái', category: 'Nội thất', salePrice: 3200000, minStock: 10 },
    { sku: 'SP005', name: 'Màn hình LG 27 inch', unit: 'cái', category: 'Điện tử', salePrice: 5500000, minStock: 8 },
    { sku: 'SP006', name: 'Bàn làm việc', unit: 'cái', category: 'Nội thất', salePrice: 1800000, minStock: 15 },
    { sku: 'SP007', name: 'Điện thoại Samsung Galaxy', unit: 'cái', category: 'Điện tử', salePrice: 8900000, minStock: 5 },
    { sku: 'SP008', name: 'Tủ hồ sơ 3 ngăn', unit: 'cái', category: 'Nội thất', salePrice: 1200000, minStock: 10 },
  ];

  const createdProducts: any[] = [];
  for (const prod of products) {
    const created = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {},
      create: prod,
    });
    createdProducts.push(created);
  }
  console.log('✅ Products created');

  // ===== CUSTOMERS =====
  const customers = [
    { customerCode: 'KH001', name: 'Công ty TNHH ABC', phone: '0241234567', address: 'Hà Nội', contactPerson: 'Nguyễn A' },
    { customerCode: 'KH002', name: 'Công ty CP XYZ', phone: '0281234567', address: 'TP.HCM', contactPerson: 'Trần B' },
    { customerCode: 'KH003', name: 'Doanh nghiệp Tân Phú', phone: '0231234567', address: 'Đà Nẵng', contactPerson: 'Lê C' },
    { customerCode: 'KH004', name: 'Trường ĐH Bách Khoa', phone: '0249876543', address: 'Hà Nội', contactPerson: 'Phạm D' },
    { customerCode: 'KH005', name: 'Công ty Viễn Thông V', phone: '0285551234', address: 'TP.HCM', contactPerson: 'Hoàng E' },
  ];

  const createdCustomers: any[] = [];
  for (const cust of customers) {
    const created = await prisma.customer.upsert({
      where: { customerCode: cust.customerCode },
      update: {},
      create: cust,
    });
    createdCustomers.push(created);
  }
  console.log('✅ Customers created');

  // ===== INITIAL INVENTORY =====
  const hanoiWh = createdWarehouses[0];
  for (const product of createdProducts) {
    await prisma.inventoryBalance.upsert({
      where: { warehouseId_productId: { warehouseId: hanoiWh.id, productId: product.id } },
      update: {},
      create: { warehouseId: hanoiWh.id, productId: product.id, onHandQty: 50, reservedQty: 0 },
    });
  }
  console.log('✅ Inventory balances created');

  // ===== SALES ORDERS (for logistics demo) =====
  const salesUser = await prisma.user.findFirst({ where: { email: 'sales@wms.com' } });
  const abcCustomer = createdCustomers[0]; // Công ty TNHH ABC
  const hanoiWh = createdWarehouses[0];
  const sampleProducts = createdProducts.slice(0, 3);

  const salesOrder = await prisma.salesOrder.create({
    data: {
      orderNo: 'DH-2024-001',
      customerId: abcCustomer.id,
      createdById: salesUser!.id,
      status: 'submitted',
      orderDate: new Date(),
      items: {
        create: sampleProducts.map((p) => ({
          productId: p.id,
          quantity: 10,
          unitPrice: p.salePrice,
        })),
      },
    },
  });
  console.log('✅ Sales orders created (ready for logistics)');

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
