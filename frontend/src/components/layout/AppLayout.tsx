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
    <div className="h-screen w-full flex overflow-hidden bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
