'use client';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authService } from '@/services';

const LOGO_URL = 'https://cdn.haitrieu.com/wp-content/uploads/2023/03/Logo-Truong-Cao-dang-nghe-Cong-nghe-cao-Dong-An.png';

const MENU_GROUPS = [
  {
    title: 'TỔNG QUAN',
    items: [
      { path: '/', label: 'Dashboard', icon: 'ri-line-chart-line', roles: ['admin'] },
      { path: '/sales-dashboard', label: 'Dashboard Sales', icon: 'ri-line-chart-line', roles: ['sales'] },
      { path: '/warehouse-dashboard', label: 'Tổng Quan Kho', icon: 'ri-line-chart-line', roles: ['warehouse'] },
    ],
  },
  {
    title: 'NGHIỆP VỤ',
    items: [
      { path: '/products', label: 'Quản lý sản phẩm', icon: 'ri-box-3-line', roles: ['admin', 'sales', 'warehouse', 'factory'] },
      { path: '/receipts', label: 'Phiếu Nhập Kho', icon: 'ri-inbox-line', roles: ['admin', 'warehouse', 'factory'] },
      { path: '/outbounds', label: 'Phiếu Xuất Kho', icon: 'ri-send-plane-line', roles: ['admin', 'warehouse'] },
      { path: '/sales-orders', label: 'Quản lý đơn hàng', icon: 'ri-shopping-cart-2-line', roles: ['admin', 'sales'] },
      { path: '/logistics', label: 'Tiếp nhận giao hàng', icon: 'ri-truck-line', roles: ['admin', 'logistics'] },
      { path: '/reports', label: 'Báo cáo', icon: 'ri-bar-chart-box-line', roles: ['admin', 'warehouse'] },
      { path: '/customers', label: 'Khách Hàng', icon: 'ri-team-line', roles: ['admin', 'sales'] },
    ],
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { path: '/accounts', label: 'Quản lý tài khoản', icon: 'ri-shield-user-line', roles: ['admin'] },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const user = useMemo(() => authService.getUser(), []);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login/');
    }
  }, [router]);

  if (!user) return null;

  const userRole = user.role_name || 'guest';

  const visibleGroups = MENU_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(userRole)),
    }))
    .filter(group => group.items.length > 0);

  const activePath = pathname === '/' ? '/' : `/${pathname.split('/')[1]}`;

  const breadcrumbs = [
    { label: 'Trang chủ', path: '/' },
    ...(activePath !== '/' ? [{ label: MENU_GROUPS.flatMap(g => g.items).find(i => i.path === activePath)?.label || 'Trang', path: activePath }] : []),
  ];

  const handleLogout = () => {
    authService.logout();
    router.push('/login/');
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', width: '100%', backgroundColor: '#eef2f7', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: collapsed ? 64 : 256,
        minWidth: collapsed ? 64 : 256,
        transition: 'all 300ms ease',
        background: 'linear-gradient(180deg, #0F1C2E 0%, #1A2D45 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '12px 0 30px rgba(15,28,46,0.18)',
        overflow: 'hidden',
        height: '100dvh',
        position: 'sticky',
        top: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '18px 12px' : '20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: 999, background: 'rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
              <img src={LOGO_URL} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, letterSpacing: 0.4, fontSize: 15, lineHeight: 1.1 }}>STEEL STOCK</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Quản lý xuất nhập tồn</div>
              </div>
            )}
          </div>
        </div>

        {/* User info */}
        {!collapsed && (
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 999, background: 'linear-gradient(135deg, #22c55e, #10b981)', display: 'grid', placeItems: 'center', fontWeight: 800, color: '#082112', overflow: 'hidden' }}>
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0ea5e9&color=fff`}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name || 'Người dùng'}</div>
                <div style={{ fontSize: 12, color: '#34d399' }}>{userRole}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: collapsed ? '14px 8px' : '16px 12px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          {visibleGroups.map(group => (
            <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!collapsed && (
                <div style={{ padding: '0 10px', fontSize: 11, fontWeight: 800, letterSpacing: 1.1, color: 'rgba(255,255,255,0.35)' }}>{group.title}</div>
              )}
              {group.items.map(menu => {
                const isActive = activePath === menu.path;
                return (
                  <Link
                    key={menu.path}
                    href={menu.path}
                    title={collapsed ? menu.label : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      gap: collapsed ? 0 : 12,
                      padding: collapsed ? '12px 0' : '12px 14px',
                      borderRadius: 14,
                      textDecoration: 'none',
                      color: '#fff',
                      background: isActive ? 'rgba(16,185,129,0.95)' : 'transparent',
                      transition: 'all 180ms ease',
                      boxShadow: isActive ? '0 12px 20px rgba(16,185,129,0.18)' : 'none',
                      marginBottom: 2,
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }
                    }}
                  >
                    <i className={menu.icon} style={{ fontSize: 17, width: 18, textAlign: 'center' }} />
                    {!collapsed && <span style={{ fontSize: 14, fontWeight: 600 }}>{menu.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse button */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%',
              height: 40,
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              background: 'transparent',
              color: 'rgba(255,255,255,0.78)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10,
              paddingLeft: collapsed ? 0 : 12,
              transition: 'all 180ms ease',
            }}
          >
            <i className={collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-left-s-line'} style={{ fontSize: 18 }} />
            {!collapsed && <span style={{ fontWeight: 500, fontSize: 13 }}>Thu gọn</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100dvh', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ height: 64, flexShrink: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', boxShadow: '0 2px 18px rgba(15,23,42,0.06)', position: 'relative', zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, minWidth: 0 }}>
              {breadcrumbs.map((item, index) => (
                <div key={item.path} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {index > 0 && <i className="ri-arrow-right-s-line" />}
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160, color: index === breadcrumbs.length - 1 ? '#0f172a' : '#64748b', fontWeight: index === breadcrumbs.length - 1 ? 700 : 500 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 999, padding: '6px 10px 6px 6px', cursor: 'pointer' }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 999, background: 'linear-gradient(135deg, #10b981, #22c55e)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>
                {(user.full_name || 'U').slice(0, 1).toUpperCase()}
              </div>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.full_name || 'Người dùng'}</span>
              <i className="ri-arrow-down-s-line" style={{ color: '#64748b' }} />
            </button>
            {showUserMenu && (
              <div style={{ position: 'absolute', right: 0, top: 48, width: 180, background: '#fff', borderRadius: 14, boxShadow: '0 18px 32px rgba(15,23,42,0.12)', border: '1px solid #e2e8f0', padding: 8 }}>
                <div style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{user.full_name}</div>
                  <div style={{ fontSize: 12, color: '#10b981', marginTop: 2, textTransform: 'capitalize' }}>{userRole}</div>
                </div>
                <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', color: '#ef4444', fontWeight: 600 }}>
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, minHeight: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
