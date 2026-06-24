# Hệ thống Quản lý Xuất Nhập Tồn - SPEC.md

## 1. Project Overview

**Tên dự án**: WMS - Warehouse Management System
**Loại**: Full-stack Web Application (Đồ án môn học)
**Mục tiêu**: Xây dựng hệ thống quản lý kho, đơn hàng, xuất-nhập-tồn cho doanh nghiệp sản xuất/cung cấp.

## 2. Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, Shadcn/UI, Axios
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL (Neon - free tier)
- **Deployment**: Vercel (Frontend), Render (Backend), Neon (Database)
- **Repository**: GitHub

## 3. Database Schema

### Tables
- `roles` - Vai trò (Admin, Sales, Logistics, Warehouse, Factory)
- `users` - Tài khoản người dùng
- `customers` - Khách hàng
- `warehouses` - Kho hàng
- `products` - Sản phẩm
- `production_receipts` - Phiếu nhập thành phẩm
- `production_receipt_items` - Chi tiết phiếu nhập
- `sales_orders` - Đơn hàng bán
- `sales_order_items` - Chi tiết đơn hàng
- `delivery_requests` - Yêu cầu giao hàng (Logistics)
- `stock_outbound_notes` - Phiếu xuất kho
- `stock_outbound_note_items` - Chi tiết phiếu xuất
- `inventory_balances` - Tồn kho hiện tại
- `inventory_transactions` - Lịch sử giao dịch kho

### Trạng thái đơn hàng
`draft` → `submitted` → `logistics_received` → `warehouse_processing` → `completed` | `cancelled`

## 4. Luồng nghiệp vụ

1. **Nhà máy nhập kho**: Tạo phiếu nhập → Xác nhận → Tồn tăng
2. **Sales tạo đơn**: Tạo đơn hàng → Gửi logistics
3. **Logistics tiếp nhận**: Kiểm tra → Xác nhận tiếp nhận → Chuyển kho
4. **Kho xuất hàng**: Tạo phiếu xuất → Xác nhận xuất → Tồn giảm
5. **Báo cáo**: Nhập / Xuất / Tồn theo thời gian

## 5. Vai trò & Quyền

| Vai trò | Quyền |
|---------|-------|
| Admin | Toàn quyền |
| Sales | Tạo khách hàng, đơn hàng, xem đơn |
| Logistics | Tiếp nhận đơn, kiểm tra giao hàng |
| Warehouse | Tạo phiếu xuất, xác nhận xuất |
| Factory | Tạo phiếu nhập kho |

## 6. Screens (Frontend Pages)

- `/login` - Đăng nhập
- `/` - Dashboard tổng quan
- `/products` - Quản lý sản phẩm
- `/customers` - Quản lý khách hàng
- `/warehouses` - Quản lý kho
- `/users` - Quản lý người dùng
- `/production-receipts` - Phiếu nhập kho (Nhà máy)
- `/sales-orders` - Đơn hàng bán (Sales)
- `/logistics` - Xử lý logistics
- `/warehouse-outbound` - Xuất kho (Kho)
- `/reports/inbound` - Báo cáo nhập kho
- `/reports/outbound` - Báo cáo xuất kho
- `/reports/inventory` - Báo cáo tồn kho
