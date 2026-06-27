const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// GET ALL PRODUCTS (with stock info per warehouse)
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventoryBalances: {
          include: { warehouse: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = products.map(p => {
      const totalStock = p.inventoryBalances.reduce((sum, b) => sum + b.onHandQty, 0);
      const breakdown = p.inventoryBalances
        .map(b => `${b.warehouse.name}: ${b.onHandQty}`)
        .join(' | ');

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        category: p.category,
        sale_price: Number(p.salePrice),
        image_url: p.imageUrl,
        min_stock: p.minStock,
        total_stock: totalStock,
        stock_breakdown: breakdown,
        createdAt: p.createdAt,
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// CREATE PRODUCT
router.post('/', async (req, res) => {
  try {
    const { sku, name, sale_price, unit, category, image_url, min_stock, initial_stock, warehouse_id } = req.body;

    if (!sku || !name) return res.status(400).json({ message: 'SKU và tên sản phẩm không được để trống' });

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        salePrice: sale_price || 0,
        unit: unit || 'Cái',
        category: category || null,
        imageUrl: image_url || null,
        minStock: min_stock ? parseInt(min_stock) : 50,
      },
    });

    // Initialize stock
    if (warehouse_id && warehouse_id !== 'all' && initial_stock > 0) {
      await prisma.inventoryBalance.upsert({
        where: { warehouseId_productId: { warehouseId: warehouse_id, productId: product.id } },
        update: { onHandQty: { increment: parseInt(initial_stock) } },
        create: { warehouseId: warehouse_id, productId: product.id, onHandQty: parseInt(initial_stock) },
      });
      await prisma.inventoryTransaction.create({
        data: {
          warehouseId: warehouse_id,
          productId: product.id,
          transactionType: 'IN',
          quantity: parseInt(initial_stock),
          referenceType: 'initial',
          referenceId: product.id,
        },
      });
    } else if (warehouse_id === 'all' && initial_stock > 0) {
      const warehouses = await prisma.warehouse.findMany({ where: { isDefectiveWarehouse: false } });
      const perWarehouse = Math.floor(parseInt(initial_stock) / warehouses.length);
      for (const wh of warehouses) {
        await prisma.inventoryBalance.upsert({
          where: { warehouseId_productId: { warehouseId: wh.id, productId: product.id } },
          update: { onHandQty: { increment: perWarehouse } },
          create: { warehouseId: wh.id, productId: product.id, onHandQty: perWarehouse },
        });
        await prisma.inventoryTransaction.create({
          data: {
            warehouseId: wh.id, productId: product.id, transactionType: 'IN',
            quantity: perWarehouse, referenceType: 'initial', referenceId: product.id,
          },
        });
      }
    }

    res.status(201).json({ message: 'Tạo sản phẩm thành công!', id: product.id });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'SKU đã tồn tại!' });
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi tạo sản phẩm' });
  }
});

// UPDATE PRODUCT
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, sale_price, unit, category, image_url, min_stock, adjust_stock, target_warehouse } = req.body;

    await prisma.product.update({
      where: { id },
      data: {
        sku,
        name,
        salePrice: sale_price !== undefined ? sale_price : undefined,
        unit,
        category,
        imageUrl: image_url,
        minStock: min_stock ? parseInt(min_stock) : undefined,
      },
    });

    // Adjust stock
    if (adjust_stock && target_warehouse && adjust_stock !== 0) {
      await prisma.inventoryBalance.upsert({
        where: { warehouseId_productId: { warehouseId: target_warehouse, productId: id } },
        update: { onHandQty: { increment: parseInt(adjust_stock) } },
        create: { warehouseId: target_warehouse, productId: id, onHandQty: parseInt(adjust_stock) },
      });
      await prisma.inventoryTransaction.create({
        data: {
          warehouseId: target_warehouse, productId: id,
          transactionType: parseInt(adjust_stock) >= 0 ? 'IN' : 'OUT',
          quantity: Math.abs(parseInt(adjust_stock)),
          referenceType: 'adjust', referenceId: id,
        },
      });
    }

    res.json({ message: 'Cập nhật thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi cập nhật sản phẩm' });
  }
});

// DELETE PRODUCT
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Xóa sản phẩm thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không thể xóa sản phẩm đang có dữ liệu liên quan' });
  }
});

module.exports = router;
