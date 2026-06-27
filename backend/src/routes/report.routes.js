const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// GET DASHBOARD STATS
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      lowStockProducts,
      recentOrders,
      monthlyInbound,
      monthlyOutbound,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.salesOrder.count(),
      prisma.salesOrder.count({ where: { status: 'pending' } }),
      prisma.salesOrder.count({ where: { status: 'completed' } }),
      prisma.product.count({
        where: {
          inventoryBalances: {
            some: {
              onHandQty: { lt: prisma.product.fields.minStock },
            },
          },
        },
      }),
      prisma.salesOrder.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, items: true },
      }),
      prisma.inventoryTransaction.groupBy({
        by: ['transactionType'],
        where: { transactionType: 'IN' },
        _sum: { quantity: true },
      }),
      prisma.inventoryTransaction.groupBy({
        by: ['transactionType'],
        where: { transactionType: 'OUT' },
        _sum: { quantity: true },
      }),
    ]);

    // Total revenue from completed orders
    const completedOrdersData = await prisma.salesOrder.findMany({
      where: { status: 'completed' },
      include: { items: true },
    });
    const totalRevenue = completedOrdersData.reduce((sum, o) => {
      return sum + o.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
    }, 0);

    res.json({
      total_products: totalProducts,
      total_orders: totalOrders,
      pending_orders: pendingOrders,
      completed_orders: completedOrders,
      low_stock_products: lowStockProducts,
      total_revenue: totalRevenue,
      recent_orders: recentOrders.map(o => ({
        id: o.id,
        order_no: o.orderNo,
        customer_name: o.customer?.name || '',
        status: o.status,
        total: o.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0),
      })),
      monthly_inbound: monthlyInbound[0]?._sum?.quantity || 0,
      monthly_outbound: monthlyOutbound[0]?._sum?.quantity || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// GET INVENTORY REPORT
router.get('/inventory', async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    const where = warehouse_id ? { warehouseId: warehouse_id } : {};

    const balances = await prisma.inventoryBalance.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: { product: { name: 'asc' } },
    });

    const result = balances.map(b => ({
      id: b.id,
      product_id: b.productId,
      product_name: b.product?.name || '',
      product_sku: b.product?.sku || '',
      warehouse_id: b.warehouseId,
      warehouse_name: b.warehouse?.name || '',
      on_hand_qty: b.onHandQty,
      reserved_qty: b.reservedQty,
      min_stock: b.product?.minStock || 50,
      sale_price: Number(b.product?.salePrice) || 0,
      category: b.product?.category || '',
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// GET INBOUND REPORT
router.get('/inbound', async (req, res) => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      where: { transactionType: 'IN' },
      include: { product: true, warehouse: true },
      orderBy: { transactionDate: 'desc' },
      take: 200,
    });

    res.json(transactions.map(t => ({
      id: t.id,
      product_name: t.product?.name || '',
      warehouse_name: t.warehouse?.name || '',
      quantity: t.quantity,
      reference_type: t.referenceType,
      transaction_date: t.transactionDate?.toISOString().split('T')[0] || null,
      note: t.note || '',
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// GET OUTBOUND REPORT
router.get('/outbound', async (req, res) => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      where: { transactionType: 'OUT' },
      include: { product: true, warehouse: true },
      orderBy: { transactionDate: 'desc' },
      take: 200,
    });

    res.json(transactions.map(t => ({
      id: t.id,
      product_name: t.product?.name || '',
      warehouse_name: t.warehouse?.name || '',
      quantity: t.quantity,
      reference_type: t.referenceType,
      transaction_date: t.transactionDate?.toISOString().split('T')[0] || null,
      note: t.note || '',
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

module.exports = router;
