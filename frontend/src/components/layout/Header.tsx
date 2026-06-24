'use client';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';

export default function Header() {
  const router = useRouter();
  const user = authService.getUser();

  const handleLogout = () => {
    authService.logout();
    router.push('/login/');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      <div className="text-sm text-gray-600">
        Hệ thống Quản lý Kho hàng - Xuất Nhập Tồn
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-800">{user?.fullName}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
