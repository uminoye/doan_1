import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WMS - Hệ thống Quản lý Kho hàng',
  description: 'Hệ thống quản lý xuất nhập tồn',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
