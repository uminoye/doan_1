import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fks: { table: string; col: string }[] = [
    { table: 'sales_order_items',       col: 'productId' },
    { table: 'stock_outbound_items',    col: 'productId' },
    { table: 'production_receipt_items', col: 'productId' },
    { table: 'inventory_balances',      col: 'productId' },
    { table: 'inventory_transactions',  col: 'productId' },
  ];

  for (const fk of fks) {
    const name = `${fk.table}_${fk.col}_fkey`;
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${fk.table}"
        DROP CONSTRAINT IF EXISTS "${name}",
        ADD CONSTRAINT "${name}"
          FOREIGN KEY ("${fk.col}") REFERENCES "products"("id") ON DELETE CASCADE
    `);
    console.log(`✅ ${fk.table}.${fk.col} → ON DELETE CASCADE`);
  }

  console.log('Done! All FK constraints updated.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
