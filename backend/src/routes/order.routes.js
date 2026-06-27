const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// GET ALL ORDERS
router.get('/', async (req, res) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: true,
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = orders.map(o => {
      const total = o.items.reduce((sum, item) => {
        return sum + (Number(item.unitPrice) * item.quantity);
      }, 0);

      return {
        id: o.id,
        order_no: o.orderNo,
        customer_id: o.customerId,
        customer_name: o.customer?.name || '',
        order_date: o.orderDate?.toISOString().split('T')[0] || null,
        expected_delivery_date: o.expectedDeliveryDate?.toISOString().split('T')[0] || null,
        note: o.note || o.deliveryAddress || '',
        delivery_address: o.note || '',
        status: o.status,
        total_amount: total,
        items: o.items.map(i => ({
          id: i.id,
          product_id: i.productId,
          product_name: i.product?.name || '',
          product_sku: i.product?.sku || '',
          quantity: i.quantity,
          unit_price: Number(i.unitPrice),
        })),
        created_at: o.createdAt,
        updated_at: o.updatedAt,
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// GET ORDER ITEMS
router.get('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const items = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: id },
      include: { product: true },
    });
    res.json(items.map(i => ({
      id: i.id,
      product_id: i.productId,
      product_name: i.product?.name || '',
      product_sku: i.product?.sku || '',
      quantity: i.quantity,
      unit_price: Number(i.unitPrice),
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// CREATE ORDER
router.post('/', async (req, res) => {
  try {
    const { order_no, customer_id, order_date, expected_delivery_date, note, items, created_by_id } = req.body;
    if (!order_no || !customer_id || !items || items.length === 0) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin đơn hàng' });
    }

    const order = await prisma.salesOrder.create({
      data: {
        orderNo: order_no,
        customerId: customer_id,
        orderDate: order_date ? new Date(order_date) : new Date(),
        expectedDeliveryDate: expected_delivery_date ? new Date(expected_delivery_date) : null,
        note: note || null,
        status: 'pending',
        createdById: created_by_id || req.userId,
        items: {
          create: items.map(item => ({
            productId: item.product_id,
            quantity: parseInt(item.quantity),
            unitPrice: item.unit_price || 0,
          })),
        },
      },
    });

    res.status(201).json({ message: 'Tạo đơn hàng thành công!', id: order.id });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'Mã đơn hàng đã tồn tại!' });
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi tạo đơn hàng' });
  }
});

// UPDATE ORDER
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, expected_delivery_date, note, items } = req.body;

    await prisma.salesOrder.update({
      where: { id },
      data: {
        customerId: customer_id,
        expectedDeliveryDate: expected_delivery_date ? new Date(expected_delivery_date) : undefined,
        note: note || undefined,
      },
    });

    // Update items
    if (items && items.length > 0) {
      await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
      for (const item of items) {
        await prisma.salesOrderItem.create({
          data: {
            salesOrderId: id,
            productId: item.product_id,
            quantity: parseInt(item.quantity),
            unitPrice: item.unit_price || 0,
          },
        });
      }
    }

    res.json({ message: 'Cập nhật đơn hàng thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi cập nhật đơn hàng' });
  }
});

// DELETE ORDER
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.salesOrder.delete({ where: { id } });
    res.json({ message: 'Xóa đơn hàng thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không thể xóa đơn hàng' });
  }
});

// RETURN / CANCEL ORDER (restore stock if shipped)
router.put('/:id/return-inventory', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    // If was shipped, return stock to warehouses
    if (['warehouse_processing', 'shipping'].includes(order.status)) {
      const warehouses = await prisma.warehouse.findMany({ where: { isDefectiveWarehouse: false } });
      const perWarehouse = Math.floor(order.items.reduce((s, i) => s + i.quantity, 0) / warehouses.length);

      for (const item of order.items) {
        for (const wh of warehouses) {
          await prisma.inventoryBalance.upsert({
            where: { warehouseId_productId: { warehouseId: wh.id, productId: item.productId } },
            update: { onHandQty: { increment: perWarehouse } },
            create: { warehouseId: wh.id, productId: item.productId, onHandQty: perWarehouse },
          });
          await prisma.inventoryTransaction.create({
            data: {
              warehouseId: wh.id, productId: item.productId,
              transactionType: 'IN', quantity: perWarehouse,
              referenceType: 'return', referenceId: id,
              note: `Hoàn kho từ hủy đơn ${order.orderNo}`,
            },
          });
        }
      }
    }

    await prisma.salesOrder.update({ where: { id }, data: { status: 'canceled' } });
    res.json({ message: 'Hủy đơn hàng thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi hủy đơn hàng' });
  }
});

module.exports = router;
