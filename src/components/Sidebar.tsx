'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Settings,
  LogOut,
  ShoppingCart,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Tableau de bord',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: '/admin/orders',
    label: 'Commandes',
    icon: <ShoppingCart className="w-5 h-5" />,
  },
  {
    href: '/admin/products',
    label: 'Produits',
    icon: <Package className="w-5 h-5" />,
  },
  {
    href: '/admin/categories',
    label: 'Catégories',
    icon: <FolderTree className="w-5 h-5" />,
  },
  {
    href: '/admin/statuses',
    label: 'Statuts',
    icon: <Tags className="w-5 h-5" />,
  },
  {
    href: '/admin/settings',
    label: 'Paramètres',
    icon: <Settings className="w-5 h-5" />,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="bg-farine-green text-white w-64 min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-farine-green-light">
        <h1 className="text-2xl font-bold">FARINE</h1>
        <p className="text-farine-beige text-sm mt-1">Back-Office</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-farine-green-dark text-white'
                      : 'text-farine-beige hover:bg-farine-green-light hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-farine-green-light">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full text-farine-beige hover:bg-farine-green-light hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
