# Hệ thống Quản lý Xuất Nhập Tồn (WMS)

Hệ thống web quản lý kho, đơn hàng và xuất - nhập - tồn cho doanh nghiệp sản xuất.

## Công nghệ sử dụng

| Phần | Công nghệ | Nềền tảng miễn phí |
|------|-----------|---------------------|
| Database | PostgreSQL | [Neon](https://neon.tech) |
| Backend | Node.js + Express + Prisma | [Render](https://render.com) |
| Frontend | Next.js 14 + TailwindCSS | [Vercel](https://vercel.com) |

## Chức năng chính

- Quản lý danh mục: Sản phẩm, Khách hàng, Kho hàng, Người dùng
- Nhập kho thành phẩm từ nhà máy
- Tạo đơn hàng bán cho khách
- Xử lý đơn hàng qua logistics và kho
- Báo cáo nhập kho, xuất kho, tồn kho

## Luồng nghiệp vụ

```
Nhà máy nhập hàng → Sales tạo đơn → Logistics tiếp nhận → Kho xuất hàng → Hệ thống cập nhật tồn → Báo cáo
```

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|-----------|
| Admin | admin@wms.com | password123 |
| Sales | sales@wms.com | password123 |
| Logistics | logistics@wms.com | password123 |
| Warehouse | warehouse@wms.com | password123 |
| Factory | factory@wms.com | password123 |

## Hướng dẫn deploy lên các nền tảng miễn phí

### 1. Database - Neon PostgreSQL

1. Truy cập [neon.tech](https://neon.tech) và đăng ký tài khoản miễn phí
2. Tạo project mới → Copy connection string
3. Connection string có dạng: `postgresql://user:password@ep-xxx-xxx-123456.us-east-2.aws.neon.tech/neon_dbname?sslmode=require`

### 2. Backend - Render

1. Fork repo này lên GitHub
2. Truy cập [render.com](https://render.com) → Connect GitHub repo
3. Tạo **Web Service** mới:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npx prisma db push`
   - **Start Command**: `npm start`
4. Thêm Environment Variables:
   - `DATABASE_URL` = connection string từ Neon
   - `JWT_SECRET` = chuỗi secret bất kỳ
   - `PORT` = 3001
5. Sau khi deploy thành công, copy URL (VD: `https://wms-api.onrender.com`)

### 3. Frontend - Vercel

1. Truy cập [vercel.com](https://vercel.com) → Import GitHub repo
2. **Root Directory**: `frontend`
3. Thêm Environment Variable:
   - `NEXT_PUBLIC_API_URL` = URL backend (VD: `https://wms-api.onrender.com`)
4. Deploy

### 4. Chạy Seed Data

Sau khi backend deploy xong, chạy lệnh seed để tạo dữ liệu mẫu:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

Hoặc chạy trực tiếp trên Render bằng cách tạo một **Cron Job** với command:
```
/app/node_modules/.bin/tsx /app/prisma/seed.ts
```

## Cấu trúc thư mục

```
doan_1/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Dữ liệu mẫu
│   ├── src/
│   │   ├── config/          # Cấu hình
│   │   ├── controllers/     # Xử lý request
│   │   ├── services/        # Logic nghiệp vụ
│   │   ├── repositories/    # Truy vấn database
│   │   ├── routes/          # API routes
│   │   ├── middlewares/     # Auth, error handling
│   │   └── models/          # Prisma client, types
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # UI components
│   │   ├── services/        # API calls
│   │   └── types/           # TypeScript types
│   └── package.json
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/profile` - Thông tin user

### Master Data
- `GET/POST /api/master/products`
- `GET/POST /api/master/customers`
- `GET/POST /api/master/warehouses`

### Transactions
- `GET/POST /api/transactions/production-receipts`
- `POST /api/transactions/production-receipts/:id/confirm`
- `GET/POST /api/transactions/sales-orders`
- `POST /api/transactions/logistics/receive`
- `POST /api/transactions/logistics/forward`
- `GET/POST /api/transactions/stock-outbound`
- `POST /api/transactions/stock-outbound/:id/confirm`

### Reports
- `GET /api/reports/dashboard`
- `GET /api/reports/inventory`
- `GET /api/reports/inbound`
- `GET /api/reports/outbound`
