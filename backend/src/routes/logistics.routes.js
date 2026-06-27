const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// GET ALL DELIVERY REQUESTS
router.get('/', async (req, res) => {
  try {
    const requests = await prisma.deliveryRequest.findMany({
      include: {
        salesOrder: {
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = requests.map(r => ({
      id: r.id,
      sales_order_id: r.salesOrderId,
      order_no: r.salesOrder?.orderNo || '',
      customer_name: r.salesOrder?.customer?.name || '',
      delivery_address: r.salesOrder?.note || '',
      received_by: r.receivedBy || '',
      received_at: r.receivedAt,
      note: r.note || '',
      status: r.status,
      items: r.salesOrder?.items?.map(i => ({
        product_name: i.product?.name || '',
        quantity: i.quantity,
      })) || [],
      created_at: r.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// PROCESS DELIVERY REQUEST
router.post('/process', async (req, res) => {
  try {
    const { sales_order_id, action, received_by, received_at, note } = req.body;
    if (!sales_order_id || !action) return res.status(400).json({ message: 'Thiếu thông tin' });

    // Find or create delivery request
    let request = await prisma.deliveryRequest.findUnique({
      where: { salesOrderId: sales_order_id },
    });

    if (!request) {
      request = await prisma.deliveryRequest.create({
        data: {
          salesOrderId: sales_order_id,
          status: action === 'receive' ? 'received' : 'pending',
          receivedBy: received_by || null,
          receivedAt: received_at ? new Date(received_at) : null,
          note: note || null,
        },
      });
    } else {
      await prisma.deliveryRequest.update({
        where: { id: request.id },
        data: {
          status: action === 'receive' ? 'received' : action === 'forward' ? 'forwarded' : request.status,
          receivedBy: received_by || request.receivedBy,
          receivedAt: received_at ? new Date(received_at) : request.receivedAt,
          note: note || request.note,
        },
      });
    }

    // Update order status
    await prisma.salesOrder.update({
      where: { id: sales_order_id },
      data: { status: action === 'receive' ? 'warehouse_processing' : 'pending' },
    });

    res.json({ message: 'Xử lý yêu cầu giao hàng thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi xử lý yêu cầu giao hàng' });
  }
});

module.exports = router;
