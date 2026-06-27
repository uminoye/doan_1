const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// GET ALL OUTBOUND NOTES
router.get('/', async (req, res) => {
  try {
    const notes = await prisma.stockOutboundNote.findMany({
      include: {
        warehouse: true,
        salesOrder: { include: { customer: true } },
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = notes.map(n => ({
      id: n.id,
      note_no: n.noteNo,
      sales_order_id: n.salesOrderId,
      order_no: n.salesOrder?.orderNo || '',
      customer_name: n.salesOrder?.customer?.name || '',
      warehouse_id: n.warehouseId,
      warehouse_name: n.warehouse?.name || '',
      export_date: n.exportDate?.toISOString().split('T')[0] || null,
      note: n.note || '',
      logistics_note: n.logisticsNote || '',
      warehouse_note: n.warehouseNote || '',
      status: n.status,
      created_by_name: n.createdBy?.fullName || '',
      items: n.items.map(i => ({
        id: i.id,
        product_id: i.productId,
        product_name: i.product?.name || '',
        product_sku: i.product?.sku || '',
        quantity: i.quantity,
      })),
      created_at: n.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// CREATE OUTBOUND NOTE
router.post('/', async (req, res) => {
  try {
    const { note_no, sales_order_id, warehouse_id, export_date, note, items, created_by_id } = req.body;
    if (!note_no || !sales_order_id || !warehouse_id) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    const outbound = await prisma.stockOutboundNote.create({
      data: {
        noteNo: note_no,
        salesOrderId: sales_order_id,
        warehouseId: warehouse_id,
        exportDate: export_date ? new Date(export_date) : new Date(),
        note: note || null,
        status: 'pending',
        createdById: created_by_id || req.userId,
        items: items ? {
          create: items.map(item => ({
            productId: item.product_id,
            quantity: parseInt(item.quantity),
          })),
        } : {},
      },
      include: { items: true },
    });

    // Deduct stock for each item
    if (items) {
      for (const item of items) {
        await prisma.inventoryBalance.upsert({
          where: { warehouseId_productId: { warehouseId: warehouse_id, productId: item.product_id } },
          update: { onHandQty: { decrement: parseInt(item.quantity) } },
          create: { warehouseId: warehouse_id, productId: item.product_id, onHandQty: -parseInt(item.quantity) },
        });
        await prisma.inventoryTransaction.create({
          data: {
            warehouseId: warehouse_id,
            productId: item.product_id,
            transactionType: 'OUT',
            quantity: parseInt(item.quantity),
            referenceType: 'stock_outbound',
            referenceId: outbound.id,
            note: `Xuất kho ${note_no}`,
          },
        });
      }
    }

    // Update order status
    await prisma.salesOrder.update({
      where: { id: sales_order_id },
      data: { status: 'shipping' },
    });

    res.status(201).json({ message: 'Tạo phiếu xuất kho thành công!', id: outbound.id });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'Số phiếu xuất đã tồn tại!' });
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi tạo phiếu xuất kho' });
  }
});

// RESPOND (complete/reject) OUTBOUND NOTE
router.put('/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, warehouse_note } = req.body;

    const status = action === 'complete' ? 'completed' : action === 'reject' ? 'rejected' : 'pending';

    await prisma.stockOutboundNote.update({
      where: { id },
      data: { status, warehouseNote: warehouse_note || null },
    });

    if (action === 'complete') {
      const outbound = await prisma.stockOutboundNote.findUnique({ where: { id } });
      await prisma.salesOrder.update({
        where: { id: outbound.salesOrderId },
        data: { status: 'completed' },
      });
    }

    res.json({ message: 'Cập nhật trạng thái phiếu xuất thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi cập nhật phiếu xuất kho' });
  }
});

module.exports = router;
