'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authService } from '@/services';
import { User } from '@/types';
import { clsx } from 'clsx';

interface SidebarProps {
  user: User;
}

interface MenuSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: string;
    color?: string;
    roles: string[];
  }[];
}

const menuSections: MenuSection[] = [
  {
    title: 'Tổng quan',
    items: [
      { label: 'Dashboard', href: '/', icon: '📊', color: 'text-blue-400', roles: ['admin'] },
      { label: 'Đơn hàng của tôi', href: '/', icon: '📈', color: 'text-blue-400', roles: ['sales'] },
      { label: 'Tổng quan Kho', href: '/', icon: '🏢', color: 'text-blue-400', roles: ['warehouse'] },
      { label: 'Sản xuất', href: '/', icon: '🏭', color: 'text-blue-400', roles: ['factory'] },
      { label: 'Tiếp nhận Giao', href: '/', icon: '🚚', color: 'text-blue-400', roles: ['logistics'] },
    ],
  },
  {
    title: 'Quản lý danh mục',
    items: [
      { label: 'Sản phẩm', href: '/products/', icon: '📦', color: 'text-blue-400', roles: ['admin'] },
      { label: 'Khách hàng', href: '/customers/', icon: '🤝', color: 'text-blue-400', roles: ['admin', 'sales'] },
      { label: 'Tài khoản', href: '/users/', icon: '👥', color: 'text-blue-400', roles: ['admin'] },
    ],
  },
  {
    title: 'Nghiệp vụ Kho',
    items: [
      { label: 'Đơn hàng', href: '/sales-orders/', icon: '🛒', color: 'text-blue-400', roles: ['admin', 'sales'] },
      { label: 'Tiếp nhận Giao hàng', href: '/logistics/', icon: '🚚', color: 'text-blue-400', roles: ['admin', 'logistics'] },
      { label: 'Phiếu Nhập Kho', href: '/production-receipts/', icon: '📥', color: 'text-blue-400', roles: ['admin', 'warehouse', 'factory'] },
      { label: 'Phiếu Xuất Kho', href: '/warehouse-outbound/', icon: '📤', color: 'text-blue-400', roles: ['admin', 'warehouse'] },
    ],
  },
  {
    title: 'Báo cáo',
    items: [
      { label: 'Tồn kho', href: '/reports/inventory/', icon: '🏬', color: 'text-green-400', roles: ['admin', 'warehouse'] },
      { label: 'Nhập kho', href: '/reports/inbound/', icon: '📥', color: 'text-green-400', roles: ['admin'] },
      { label: 'Xuất kho', href: '/reports/outbound/', icon: '📤', color: 'text-green-400', roles: ['admin'] },
    ],
  },
];

const STORAGE_KEY = 'wms-sidebar-collapsed';

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === 'true');
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const initials = user.fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className={clsx(
        'h-full min-h-0 bg-slate-800 text-white flex flex-col flex-shrink-0 overflow-hidden',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 h-14 border-b border-slate-700 flex-shrink-0">
        <button
          onClick={toggleCollapsed}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold">W</span>
            </div>
            <span className="font-bold text-blue-400 truncate">WMS System</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {menuSections.map(section => {
          const filteredItems = section.items.filter(item => item.roles.includes(user.role));
          if (filteredItems.length === 0) return null;

          return (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {filteredItems.map(item => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'flex items-center rounded-lg text-sm transition-colors relative group',
                        collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className={clsx('text-base flex-shrink-0', !isActive && item.color)}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {/* Tooltip when collapsed */}
                      {collapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer - User Info */}
      <div className="p-2.5 border-t border-slate-700 flex-shrink-0">
        <div className={clsx('flex items-center gap-2.5', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user.fullName}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{user.role}</p>
            </div>
          )}
          {!collapsed && (
            <span className="relative flex-shrink-0">
              <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-slate-800" />
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
