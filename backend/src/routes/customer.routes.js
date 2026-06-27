const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// GET ALL CUSTOMERS
router.get('/', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers.map(c => ({
      id: c.id,
      company_name: c.name,
      name: c.name,
      phone: c.phone,
      address: c.address,
      contact_person: c.contactPerson,
      customer_code: c.customerCode,
      createdAt: c.createdAt,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// CREATE CUSTOMER
router.post('/', async (req, res) => {
  try {
    const { company_name, name, phone, address, contact_person, customer_code } = req.body;
    if (!company_name && !name) return res.status(400).json({ message: 'Tên khách hàng không được để trống' });

    const customerName = company_name || name;
    const code = customer_code || 'KH' + String(Date.now()).slice(-6);

    const customer = await prisma.customer.create({
      data: {
        customerCode: code,
        name: customerName,
        phone: phone || null,
        address: address || null,
        contactPerson: contact_person || null,
      },
    });

    res.status(201).json({ message: 'Tạo khách hàng thành công!', id: customer.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi tạo khách hàng' });
  }
});

// DELETE CUSTOMER
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.delete({ where: { id } });
    res.json({ message: 'Xóa khách hàng thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không thể xóa khách hàng đang có đơn hàng' });
  }
});

module.exports = router;
