'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { ShoppingCart, Package, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  todayRevenue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    todayRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentOrders();
  }, []);

  async function fetchStats() {
    try {
      // Nombre total de commandes
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Commandes en attente
      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'A préparer');

      // Nombre de produits actifs
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // CA du jour
      const today = new Date().toISOString().split('T')[0];
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_ttc')
        .eq('created_date', today);

      const todayRevenue = todayOrders?.reduce((sum, order) => sum + Number(order.total_ttc), 0) || 0;

      setStats({
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        totalProducts: totalProducts || 0,
        todayRevenue,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecentOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentOrders(data || []);
    } catch (error) {
      console.error('Erreur chargement commandes récentes:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farine-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-2">
          Vue d'ensemble de votre activité
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total commandes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total commandes</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Commandes en attente */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">À préparer</p>
              <p className="text-3xl font-bold text-orange-600">{stats.pendingOrders}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Produits actifs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Produits actifs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* CA du jour */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">CA aujourd'hui</p>
              <p className="text-3xl font-bold text-farine-green">
                {formatPrice(stats.todayRevenue)}
              </p>
            </div>
            <div className="bg-farine-beige p-3 rounded-lg">
              <CheckCircle className="w-8 h-8 text-farine-green" />
            </div>
          </div>
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Commandes récentes</h2>
          <Link
            href="/admin/orders"
            className="text-farine-green hover:text-farine-green-dark text-sm font-medium"
          >
            Voir toutes →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune commande pour le moment</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-farine-beige">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">N° Commande</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date enlèvement</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Montant</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-farine-beige transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">{order.order_number}</td>
                    <td className="px-4 py-3 text-sm">{order.customer_name}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(order.pickup_date).toLocaleDateString('fr-FR')} à {order.pickup_time}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatPrice(order.total_ttc)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/orders"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="font-bold text-lg text-gray-900 mb-2">Gérer les commandes</h3>
          <p className="text-gray-600 text-sm">
            Consulter, modifier et traiter les commandes clients
          </p>
        </Link>

        <Link
          href="/admin/products"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="font-bold text-lg text-gray-900 mb-2">Gérer les produits</h3>
          <p className="text-gray-600 text-sm">
            Ajouter, modifier ou supprimer des produits du catalogue
          </p>
        </Link>

        <Link
          href="/admin/settings"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="font-bold text-lg text-gray-900 mb-2">Paramètres</h3>
          <p className="text-gray-600 text-sm">
            Configurer les horaires et le message d'accueil
          </p>
        </Link>
      </div>
    </div>
  );
}
