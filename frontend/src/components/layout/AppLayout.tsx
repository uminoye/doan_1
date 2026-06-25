'use client';
import Sidebar from './Sidebar';
import Header from './Header';
import { authService } from '@/services';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = authService.getUser();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login/');
    }
  }, [router]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
