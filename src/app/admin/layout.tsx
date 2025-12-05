'use client';

import { AuthProvider } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  return (
    <AuthProvider>
      {isLoginPage ? (
        // Page de login sans sidebar
        children
      ) : (
        // Pages admin avec sidebar
        <ProtectedRoute>
          <div className="flex min-h-screen bg-farine-beige-light">
            <Sidebar />
            <main className="flex-1 p-8">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </ProtectedRoute>
      )}
    </AuthProvider>
  );
}
