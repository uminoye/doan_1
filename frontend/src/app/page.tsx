'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

export default function RootRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/');
  }, [router]);
  return null;
}
