-- Drop existing foreign key constraints on Product
ALTER TABLE "ProductionReceiptItem" DROP CONSTRAINT IF EXISTS "ProductionReceiptItem_productId_fkey";
ALTER TABLE "SalesOrderItem" DROP CONSTRAINT IF EXISTS "SalesOrderItem_productId_fkey";
ALTER TABLE "StockOutboundItem" DROP CONSTRAINT IF EXISTS "StockOutboundItem_productId_fkey";
ALTER TABLE "InventoryBalance" DROP CONSTRAINT IF EXISTS "InventoryBalance_productId_fkey";
ALTER TABLE "InventoryTransaction" DROP CONSTRAINT IF EXISTS "InventoryTransaction_productId_fkey";

-- Re-create with ON DELETE CASCADE
ALTER TABLE "ProductionReceiptItem" ADD CONSTRAINT "ProductionReceiptItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockOutboundItem" ADD CONSTRAINT "StockOutboundItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
