'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authService } from '@/services';
import { User } from '@/types';

interface SidebarProps {
  user: User;
}

const menuItems = [
  { label: 'Tổng quan', href: '/', icon: '📊', roles: ['admin', 'sales', 'logistics', 'warehouse', 'factory'] },
  { label: 'Sản phẩm', href: '/products/', icon: '📦', roles: ['admin'] },
  { label: 'Khách hàng', href: '/customers/', icon: '👥', roles: ['admin', 'sales'] },
  { label: 'Kho hàng', href: '/warehouses/', icon: '🏭', roles: ['admin'] },
  { label: 'Người dùng', href: '/users/', icon: '👤', roles: ['admin'] },
  { label: 'Phiếu nhập kho', href: '/production-receipts/', icon: '📥', roles: ['admin', 'factory'] },
  { label: 'Đơn hàng bán', href: '/sales-orders/', icon: '🛒', roles: ['admin', 'sales'] },
  { label: 'Logistics', href: '/logistics/', icon: '🚚', roles: ['admin', 'logistics'] },
  { label: 'Xuất kho', href: '/warehouse-outbound/', icon: '📤', roles: ['admin', 'warehouse'] },
  { label: 'Báo cáo nhập', href: '/reports/inbound/', icon: '📈', roles: ['admin'] },
  { label: 'Báo cáo xuất', href: '/reports/outbound/', icon: '📉', roles: ['admin'] },
  { label: 'Tồn kho', href: '/reports/inventory/', icon: '🏬', roles: ['admin'] },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-56 min-h-screen bg-slate-800 text-white flex flex-col overflow-hidden flex-shrink-0">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold text-blue-400">WMS System</h1>
        <p className="text-xs text-slate-400 mt-1">Quản lý Kho hàng</p>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {filteredItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span className="mr-3 text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-700 text-xs text-slate-400">
        <p className="truncate">
          <span className="text-slate-500">Đăng nhập: </span>
          <span className="text-slate-200 font-medium">{user.fullName}</span>
        </p>
        <p className="truncate capitalize">
          <span className="text-slate-500">Vai trò: </span>{user.role}
        </p>
      </div>
    </aside>
  );
}
