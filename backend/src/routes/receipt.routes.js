const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// GET ALL RECEIPTS
router.get('/', async (req, res) => {
  try {
    const receipts = await prisma.productionReceipt.findMany({
      include: {
        warehouse: true,
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = receipts.map(r => ({
      id: r.id,
      receipt_no: r.receiptNo,
      warehouse_id: r.warehouseId,
      warehouse_name: r.warehouse?.name || '',
      receipt_date: r.receiptDate?.toISOString().split('T')[0] || null,
      note: r.note || '',
      status: r.status,
      created_by_id: r.createdById,
      created_by_name: r.createdBy?.fullName || '',
      items: r.items.map(i => ({
        id: i.id,
        product_id: i.productId,
        product_name: i.product?.name || '',
        product_sku: i.product?.sku || '',
        quantity: i.quantity,
      })),
      created_at: r.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// CREATE RECEIPT
router.post('/', async (req, res) => {
  try {
    const { receipt_no, warehouse_id, receipt_date, note, items, created_by_id } = req.body;
    if (!receipt_no || !warehouse_id || !items || items.length === 0) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin phiếu nhập' });
    }

    const receipt = await prisma.productionReceipt.create({
      data: {
        receiptNo: receipt_no,
        warehouseId: warehouse_id,
        receiptDate: receipt_date ? new Date(receipt_date) : new Date(),
        note: note || null,
        status: 'PENDING',
        createdById: created_by_id || req.userId,
        items: {
          create: items.map(item => ({
            productId: item.product_id,
            quantity: parseInt(item.quantity),
          })),
        },
      },
    });

    res.status(201).json({ message: 'Tạo phiếu nhập thành công!', id: receipt.id });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'Số phiếu nhập đã tồn tại!' });
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi tạo phiếu nhập' });
  }
});

// RESPOND (accept/reject) RECEIPT
router.put('/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, expected_delivery_date } = req.body;

    const status = action === 'accept' ? 'PROCESSING' : 'REJECTED';
    await prisma.productionReceipt.update({
      where: { id },
      data: {
        status,
        respondedReason: reason || null,
        expectedDeliveryDate: expected_delivery_date ? new Date(expected_delivery_date) : null,
      },
    });

    res.json({ message: action === 'accept' ? 'Đã chấp nhận phiếu nhập!' : 'Đã từ chối phiếu nhập!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi phản hồi phiếu nhập' });
  }
});

// CONFIRM RECEIPT (mark as COMPLETED, update inventory)
router.put('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await prisma.productionReceipt.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!receipt) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập' });

    // Update inventory
    for (const item of receipt.items) {
      await prisma.inventoryBalance.upsert({
        where: { warehouseId_productId: { warehouseId: receipt.warehouseId, productId: item.productId } },
        update: { onHandQty: { increment: item.quantity } },
        create: { warehouseId: receipt.warehouseId, productId: item.productId, onHandQty: item.quantity },
      });
      await prisma.inventoryTransaction.create({
        data: {
          warehouseId: receipt.warehouseId,
          productId: item.productId,
          transactionType: 'IN',
          quantity: item.quantity,
          referenceType: 'production_receipt',
          referenceId: id,
          note: `Nhập kho ${receipt.receiptNo}`,
        },
      });
    }

    await prisma.productionReceipt.update({ where: { id }, data: { status: 'COMPLETED' } });
    res.json({ message: 'Đã xác nhận nhập kho thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi xác nhận nhập kho' });
  }
});

module.exports = router;
