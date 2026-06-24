import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ===== ROLES =====
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin', description: 'Quản trị hệ thống' } }),
    prisma.role.upsert({ where: { name: 'sales' }, update: {}, create: { name: 'sales', description: 'Nhân viên kinh doanh' } }),
    prisma.role.upsert({ where: { name: 'logistics' }, update: {}, create: { name: 'logistics', description: 'Nhân viên logistics' } }),
    prisma.role.upsert({ where: { name: 'warehouse' }, update: {}, create: { name: 'warehouse', description: 'Nhân viên kho' } }),
    prisma.role.upsert({ where: { name: 'factory' }, update: {}, create: { name: 'factory', description: 'Nhân viên nhà máy' } }),
  ]);
  console.log('✅ Roles created');

  const [adminRole, salesRole, logisticsRole, warehouseRole, factoryRole] = roles;

  // ===== USERS =====
  const hash = await bcrypt.hash('password123', 10);
  const users = await Promise.all([
    prisma.user.upsert({ where: { email: 'admin@wms.com' }, update: {}, create: { fullName: 'Nguyễn Văn Admin', email: 'admin@wms.com', passwordHash: hash, roleId: adminRole.id, status: 'active' } }),
    prisma.user.upsert({ where: { email: 'sales@wms.com' }, update: {}, create: { fullName: 'Trần Thị Sales', email: 'sales@wms.com', passwordHash: hash, roleId: salesRole.id, status: 'active' } }),
    prisma.user.upsert({ where: { email: 'logistics@wms.com' }, update: {}, create: { fullName: 'Lê Văn Logistics', email: 'logistics@wms.com', passwordHash: hash, roleId: logisticsRole.id, status: 'active' } }),
    prisma.user.upsert({ where: { email: 'warehouse@wms.com' }, update: {}, create: { fullName: 'Phạm Văn Kho', email: 'warehouse@wms.com', passwordHash: hash, roleId: warehouseRole.id, status: 'active' } }),
    prisma.user.upsert({ where: { email: 'factory@wms.com' }, update: {}, create: { fullName: 'Hoàng Văn Nhà Máy', email: 'factory@wms.com', passwordHash: hash, roleId: factoryRole.id, status: 'active' } }),
  ]);
  console.log('✅ Users created');
  const [adminUser, salesUser, logisticsUser, warehouseUser, factoryUser] = users;

  // ===== WAREHOUSES =====
  const warehouses = await Promise.all([
    prisma.warehouse.upsert({ where: { warehouseCode: 'KHO001' }, update: {}, create: { warehouseCode: 'KHO001', name: 'Kho Hà Nội', location: 'Hà Nội' } }),
    prisma.warehouse.upsert({ where: { warehouseCode: 'KHO002' }, update: {}, create: { warehouseCode: 'KHO002', name: 'Kho HCM', location: 'Hồ Chí Minh' } }),
  ]);
  console.log('✅ Warehouses created');
  const [warehouseHCM, warehouseHN] = warehouses;

  // ===== PRODUCTS =====
  const products = await Promise.all([
    prisma.product.upsert({ where: { sku: 'SKU001' }, update: {}, create: { sku: 'SKU001', name: 'Bánh Trung Thu Truyền Thống', unit: 'hộp', category: 'Bánh Trung Thu', salePrice: 150000 } }),
    prisma.product.upsert({ where: { sku: 'SKU002' }, update: {}, create: { sku: 'SKU002', name: 'Bánh Trung Thu Nhân Đậu Xanh', unit: 'hộp', category: 'Bánh Trung Thu', salePrice: 120000 } }),
    prisma.product.upsert({ where: { sku: 'SKU003' }, update: {}, create: { sku: 'SKU003', name: 'Bánh Trung Thu Nhân Gà', unit: 'hộp', category: 'Bánh Trung Thu', salePrice: 180000 } }),
    prisma.product.upsert({ where: { sku: 'SKU004' }, update: {}, create: { sku: 'SKU004', name: 'Bánh Pía Sóc Trăng', unit: 'hộp', category: 'Bánh Pía', salePrice: 85000 } }),
    prisma.product.upsert({ where: { sku: 'SKU005' }, update: {}, create: { sku: 'SKU005', name: 'Bánh Pía Nhân Sầu Riêng', unit: 'hộp', category: 'Bánh Pía', salePrice: 120000 } }),
    prisma.product.upsert({ where: { sku: 'SKU006' }, update: {}, create: { sku: 'SKU006', name: 'Bánh gai Nhật Hải', unit: 'cái', category: 'Bánh Gai', salePrice: 25000 } }),
    prisma.product.upsert({ where: { sku: 'SKU007' }, update: {}, create: { sku: 'SKU007', name: 'Bánh cống Sóc Trăng', unit: 'hộp', category: 'Bánh Đặc Sản', salePrice: 95000 } }),
    prisma.product.upsert({ where: { sku: 'SKU008' }, update: {}, create: { sku: 'SKU008', name: 'Bánh pía mặn', unit: 'hộp', category: 'Bánh Pía', salePrice: 78000 } }),
  ]);
  console.log('✅ Products created');

  // ===== CUSTOMERS =====
  const customers = await Promise.all([
    prisma.customer.upsert({ where: { customerCode: 'KH001' }, update: {}, create: { customerCode: 'KH001', name: 'Cửa hàng Bánh Ngọt Sài Gòn', phone: '02812345678', address: '123 Nguyễn Trãi, Q1, TP.HCM', contactPerson: 'Anh Tuấn' } }),
    prisma.customer.upsert({ where: { customerCode: 'KH002' }, update: {}, create: { customerCode: 'KH002', name: 'Siêu thị Hữu Nghị', phone: '02498765432', address: '45 Lê Duẩn, Ba Đình, Hà Nội', contactPerson: 'Chị Hương' } }),
    prisma.customer.upsert({ where: { customerCode: 'KH003' }, update: {}, create: { customerCode: 'KH003', name: 'Đại lý Bánh Ánh Dương', phone: '02711234567', address: '78 Trần Hưng Đạo, Cần Thơ', contactPerson: 'Anh Dũng' } }),
    prisma.customer.upsert({ where: { customerCode: 'KH004' }, update: {}, create: { customerCode: 'KH004', name: 'Cửa hàng Bánh Tươi Đà Nẵng', phone: '02361112222', address: '12 Ngô Quyền, Đà Nẵng', contactPerson: 'Chị Lan' } }),
    prisma.customer.upsert({ where: { customerCode: 'KH005' }, update: {}, create: { customerCode: 'KH005', name: 'Nhà phân phối Thuận Phát', phone: '02518889999', address: '56 Lý Thường Kiệt, Vũng Tàu', contactPerson: 'Anh Phát' } }),
  ]);
  console.log('✅ Customers created');

  // ===== PRODUCTION RECEIPTS (Nhập kho) =====
  const receipt1 = await prisma.productionReceipt.create({
    data: {
      receiptNo: 'PN000001',
      warehouseId: warehouseHCM.id,
      receiptDate: new Date('2026-06-01'),
      status: 'confirmed',
      createdById: factoryUser.id,
      note: 'Nhập bánh Trung thu đợt 1',
      items: {
        create: [
          { productId: products[0].id, quantity: 200 },
          { productId: products[1].id, quantity: 300 },
          { productId: products[2].id, quantity: 150 },
        ],
      },
    },
  });

  const receipt2 = await prisma.productionReceipt.create({
    data: {
      receiptNo: 'PN000002',
      warehouseId: warehouseHCM.id,
      receiptDate: new Date('2026-06-05'),
      status: 'confirmed',
      createdById: factoryUser.id,
      note: 'Nhập bánh pía đợt 1',
      items: {
        create: [
          { productId: products[3].id, quantity: 400 },
          { productId: products[4].id, quantity: 200 },
          { productId: products[7].id, quantity: 250 },
        ],
      },
    },
  });

  const receipt3 = await prisma.productionReceipt.create({
    data: {
      receiptNo: 'PN000003',
      warehouseId: warehouseHN.id,
      receiptDate: new Date('2026-06-10'),
      status: 'confirmed',
      createdById: factoryUser.id,
      note: 'Nhập bánh Trung thu đợt 2 cho kho Hà Nội',
      items: {
        create: [
          { productId: products[0].id, quantity: 100 },
          { productId: products[1].id, quantity: 150 },
          { productId: products[5].id, quantity: 300 },
          { productId: products[6].id, quantity: 200 },
        ],
      },
    },
  });
  console.log('✅ Production receipts created');

  // Update inventory balances for confirmed receipts
  await prisma.$transaction([
    // From receipt1
    prisma.inventoryBalance.upsert({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[0].id } }, update: { onHandQty: { increment: 200 } }, create: { warehouseId: warehouseHCM.id, productId: products[0].id, onHandQty: 200 } }),
    prisma.inventoryBalance.upsert({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[1].id } }, update: { onHandQty: { increment: 300 } }, create: { warehouseId: warehouseHCM.id, productId: products[1].id, onHandQty: 300 } }),
    prisma.inventoryBalance.upsert({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[2].id } }, update: { onHandQty: { increment: 150 } }, create: { warehouseId: warehouseHCM.id, productId: products[2].id, onHandQty: 150 } }),
    // From receipt2
    prisma.inventoryBalance.upsert({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[3].id } }, update: { onHandQty: { increment: 400 } }, create: { warehouseId: warehouseHCM.id, productId: products[3].id, onHandQty: 400 } }),
    prisma.inventoryBalance.upsert({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[4].id } }, update: { onHandQty: { increment: 200 } }, create: { warehouseId: warehouseHCM.id, productId: products[4].id, onHandQty: 200 } }),
    prisma.inventoryBalance.upsert({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[7].id } }, update: { onHandQty: { increment: 250 } }, create: { warehouseId: warehouseHCM.id, productId: products[7].id, onHandQty: 250 } }),
    // From receipt3
    prisma.inventoryBalance.upsert({ where: { warehouseId_productId: { warehouseId: warehouseHN.id, productId: products[0].id } }, update: { onHandQty: { increment: 100 } }, create: { warehouseId: warehouseHN.id, productId: products[0].id, onHandQty: 100 } }),
    prisma.inventoryBalance.upsert({ where: { warehouseId_productId: { warehouseId: warehouseHN.id, productId: products[1].id } }, update: { onHandQty: { increment: 150 } }, create: { warehouseId: warehouseHN.id, productId: products[1].id, onHandQty: 150 } }),
    prisma.inventoryBalance.upsert({ where: { warehouseId_productId: { warehouseId: warehouseHN.id, productId: products[5].id } }, update: { onHandQty: { increment: 300 } }, create: { warehouseId: warehouseHN.id, productId: products[5].id, onHandQty: 300 } }),
    prisma.inventoryBalance.upsert({ where: { warehouseId_productId: { warehouseId: warehouseHN.id, productId: products[6].id } }, update: { onHandQty: { increment: 200 } }, create: { warehouseId: warehouseHN.id, productId: products[6].id, onHandQty: 200 } }),
  ]);

  // Create inventory transactions
  await prisma.$transaction([
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[0].id, transactionType: 'IN', quantity: 200, referenceType: 'production_receipt', referenceId: receipt1.id, transactionDate: receipt1.receiptDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[1].id, transactionType: 'IN', quantity: 300, referenceType: 'production_receipt', referenceId: receipt1.id, transactionDate: receipt1.receiptDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[2].id, transactionType: 'IN', quantity: 150, referenceType: 'production_receipt', referenceId: receipt1.id, transactionDate: receipt1.receiptDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[3].id, transactionType: 'IN', quantity: 400, referenceType: 'production_receipt', referenceId: receipt2.id, transactionDate: receipt2.receiptDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[4].id, transactionType: 'IN', quantity: 200, referenceType: 'production_receipt', referenceId: receipt2.id, transactionDate: receipt2.receiptDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[7].id, transactionType: 'IN', quantity: 250, referenceType: 'production_receipt', referenceId: receipt2.id, transactionDate: receipt2.receiptDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHN.id, productId: products[0].id, transactionType: 'IN', quantity: 100, referenceType: 'production_receipt', referenceId: receipt3.id, transactionDate: receipt3.receiptDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHN.id, productId: products[1].id, transactionType: 'IN', quantity: 150, referenceType: 'production_receipt', referenceId: receipt3.id, transactionDate: receipt3.receiptDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHN.id, productId: products[5].id, transactionType: 'IN', quantity: 300, referenceType: 'production_receipt', referenceId: receipt3.id, transactionDate: receipt3.receiptDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHN.id, productId: products[6].id, transactionType: 'IN', quantity: 200, referenceType: 'production_receipt', referenceId: receipt3.id, transactionDate: receipt3.receiptDate } }),
  ]);
  console.log('✅ Inventory balances & transactions created');

  // ===== SALES ORDERS =====
  const order1 = await prisma.salesOrder.create({
    data: {
      orderNo: 'SO000001',
      customerId: customers[0].id,
      orderDate: new Date('2026-06-12'),
      deliveryDate: new Date('2026-06-15'),
      status: 'completed',
      createdById: salesUser.id,
      note: 'Đơn hàng bán lẻ',
      items: {
        create: [
          { productId: products[0].id, quantity: 30, unitPrice: 150000 },
          { productId: products[1].id, quantity: 40, unitPrice: 120000 },
        ],
      },
    },
  });

  const order2 = await prisma.salesOrder.create({
    data: {
      orderNo: 'SO000002',
      customerId: customers[1].id,
      orderDate: new Date('2026-06-13'),
      deliveryDate: new Date('2026-06-18'),
      status: 'completed',
      createdById: salesUser.id,
      note: 'Đơn hàng siêu thị',
      items: {
        create: [
          { productId: products[3].id, quantity: 80, unitPrice: 85000 },
          { productId: products[4].id, quantity: 50, unitPrice: 120000 },
          { productId: products[7].id, quantity: 60, unitPrice: 78000 },
        ],
      },
    },
  });

  const order3 = await prisma.salesOrder.create({
    data: {
      orderNo: 'SO000003',
      customerId: customers[2].id,
      orderDate: new Date('2026-06-18'),
      deliveryDate: new Date('2026-06-22'),
      status: 'warehouse_processing',
      createdById: salesUser.id,
      note: 'Đơn hàng đại lý Cần Thơ',
      items: {
        create: [
          { productId: products[0].id, quantity: 50, unitPrice: 150000 },
          { productId: products[2].id, quantity: 30, unitPrice: 180000 },
          { productId: products[5].id, quantity: 100, unitPrice: 25000 },
        ],
      },
    },
  });

  const order4 = await prisma.salesOrder.create({
    data: {
      orderNo: 'SO000004',
      customerId: customers[3].id,
      orderDate: new Date('2026-06-20'),
      deliveryDate: new Date('2026-06-25'),
      status: 'logistics_received',
      createdById: salesUser.id,
      note: 'Đơn khách Đà Nẵng',
      items: {
        create: [
          { productId: products[1].id, quantity: 60, unitPrice: 120000 },
          { productId: products[3].id, quantity: 40, unitPrice: 85000 },
        ],
      },
    },
  });

  const order5 = await prisma.salesOrder.create({
    data: {
      orderNo: 'SO000005',
      customerId: customers[4].id,
      orderDate: new Date('2026-06-22'),
      deliveryDate: new Date('2026-06-28'),
      status: 'submitted',
      createdById: salesUser.id,
      note: 'Đơn nhà phân phối Vũng Tàu',
      items: {
        create: [
          { productId: products[0].id, quantity: 70, unitPrice: 150000 },
          { productId: products[4].id, quantity: 45, unitPrice: 120000 },
          { productId: products[6].id, quantity: 35, unitPrice: 95000 },
        ],
      },
    },
  });
  console.log('✅ Sales orders created');

  // ===== DELIVERY REQUESTS =====
  await prisma.deliveryRequest.create({
    data: {
      salesOrderId: order4.id,
      receivedBy: logisticsUser.id,
      receivedAt: new Date('2026-06-21'),
      status: 'received',
      note: 'Đã kiểm tra thông tin giao hàng',
    },
  });
  console.log('✅ Delivery requests created');

  // ===== STOCK OUTBOUND NOTES (Xuất kho) =====
  const outbound1 = await prisma.stockOutboundNote.create({
    data: {
      noteNo: 'PX000001',
      salesOrderId: order1.id,
      warehouseId: warehouseHCM.id,
      exportDate: new Date('2026-06-15'),
      status: 'confirmed',
      createdById: warehouseUser.id,
      note: 'Xuất giao cho cửa hàng Sài Gòn',
      items: {
        create: [
          { productId: products[0].id, quantity: 30 },
          { productId: products[1].id, quantity: 40 },
        ],
      },
    },
  });

  const outbound2 = await prisma.stockOutboundNote.create({
    data: {
      noteNo: 'PX000002',
      salesOrderId: order2.id,
      warehouseId: warehouseHCM.id,
      exportDate: new Date('2026-06-18'),
      status: 'confirmed',
      createdById: warehouseUser.id,
      note: 'Xuất cho siêu thị Hữu Nghị',
      items: {
        create: [
          { productId: products[3].id, quantity: 80 },
          { productId: products[4].id, quantity: 50 },
          { productId: products[7].id, quantity: 60 },
        ],
      },
    },
  });
  console.log('✅ Stock outbound notes created');

  // Update inventory balances for confirmed outbound
  await prisma.$transaction([
    prisma.inventoryBalance.update({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[0].id } }, data: { onHandQty: { decrement: 30 } } }),
    prisma.inventoryBalance.update({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[1].id } }, data: { onHandQty: { decrement: 40 } } }),
    prisma.inventoryBalance.update({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[3].id } }, data: { onHandQty: { decrement: 80 } } }),
    prisma.inventoryBalance.update({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[4].id } }, data: { onHandQty: { decrement: 50 } } }),
    prisma.inventoryBalance.update({ where: { warehouseId_productId: { warehouseId: warehouseHCM.id, productId: products[7].id } }, data: { onHandQty: { decrement: 60 } } }),
  ]);

  // Create outbound transactions
  await prisma.$transaction([
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[0].id, transactionType: 'OUT', quantity: 30, referenceType: 'stock_outbound', referenceId: outbound1.id, transactionDate: outbound1.exportDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[1].id, transactionType: 'OUT', quantity: 40, referenceType: 'stock_outbound', referenceId: outbound1.id, transactionDate: outbound1.exportDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[3].id, transactionType: 'OUT', quantity: 80, referenceType: 'stock_outbound', referenceId: outbound2.id, transactionDate: outbound2.exportDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[4].id, transactionType: 'OUT', quantity: 50, referenceType: 'stock_outbound', referenceId: outbound2.id, transactionDate: outbound2.exportDate } }),
    prisma.inventoryTransaction.create({ data: { warehouseId: warehouseHCM.id, productId: products[7].id, transactionType: 'OUT', quantity: 60, referenceType: 'stock_outbound', referenceId: outbound2.id, transactionDate: outbound2.exportDate } }),
  ]);
  console.log('✅ Outbound inventory transactions created');

  console.log('');
  console.log('========================================');
  console.log('🎉 Database seeded successfully!');
  console.log('========================================');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('  Admin:     admin@wms.com / password123');
  console.log('  Sales:     sales@wms.com / password123');
  console.log('  Logistics: logistics@wms.com / password123');
  console.log('  Warehouse: warehouse@wms.com / password123');
  console.log('  Factory:   factory@wms.com / password123');
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
