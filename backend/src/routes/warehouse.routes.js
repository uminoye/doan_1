const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// GET ALL WAREHOUSES
router.get('/', async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: 'asc' },
    });
    res.json(warehouses.map(w => ({
      id: w.id,
      name: w.name,
      warehouse_code: w.warehouseCode,
      location: w.location,
      is_defective_warehouse: w.isDefectiveWarehouse,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// CREATE WAREHOUSE
router.post('/', async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ message: 'Tên kho không được để trống' });

    const code = 'WH' + String(Date.now()).slice(-4);
    const warehouse = await prisma.warehouse.create({
      data: { warehouseCode: code, name, location: location || null },
    });

    res.status(201).json({ message: 'Tạo kho thành công!', id: warehouse.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi tạo kho' });
  }
});

// DELETE WAREHOUSE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (warehouse?.isDefectiveWarehouse) {
      return res.status(400).json({ message: 'Không thể xóa kho lỗi!' });
    }
    await prisma.warehouse.delete({ where: { id } });
    res.json({ message: 'Xóa kho thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không thể xóa kho đang có dữ liệu' });
  }
});

module.exports = router;
