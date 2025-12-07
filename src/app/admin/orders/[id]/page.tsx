'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Order, OrderItem, OrderStatus } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { ArrowLeft, Save, Printer, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = parseInt(params.id as string);

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    pickup_date: '',
    pickup_time: '',
    customer_comment: '',
    farine_comment: '',
    status: '',
  });

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  async function fetchOrderDetails() {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);
      setFormData({
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        pickup_date: orderData.pickup_date,
        pickup_time: orderData.pickup_time,
        customer_comment: orderData.customer_comment || '',
        farine_comment: orderData.farine_comment || '',
        status: orderData.status,
      });

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      const { data: statusesData, error: statusesError } = await supabase
        .from('order_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (statusesError) throw statusesError;
      setStatuses(statusesData || []);
    } catch (error) {
      console.error('Erreur chargement commande:', error);
      alert('Erreur lors du chargement de la commande');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          pickup_date: formData.pickup_date,
          pickup_time: formData.pickup_time,
          customer_comment: formData.customer_comment || null,
          farine_comment: formData.farine_comment || null,
          status: formData.status,
        })
        .eq('id', orderId);

      if (error) throw error;

      alert('Commande mise à jour avec succès !');
      fetchOrderDetails();
    } catch (error) {
      console.error('Erreur sauvegarde commande:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      alert('Commande supprimée');
      router.push('/admin/orders');
    } catch (error) {
      console.error('Erreur suppression commande:', error);
      alert('Erreur lors de la suppression');
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farine-green"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Commande introuvable</p>
        <Link href="/admin/orders" className="text-farine-green hover:underline mt-4 inline-block">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const status = statuses.find(s => s.name === order.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Commande {order.order_number}
            </h1>
            <p className="text-gray-600 mt-1">
              Créée le {formatDate(new Date(order.created_at), 'PPP à HH:mm')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Imprimer
          </button>
          <button
            onClick={handleDelete}
            className="btn-danger flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Supprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Informations client
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du client
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_phone: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Date et heure d'enlèvement
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.pickup_date}
                  onChange={(e) =>
                    setFormData({ ...formData, pickup_date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure
                </label>
                <input
                  type="time"
                  value={formData.pickup_time}
                  onChange={(e) =>
                    setFormData({ ...formData, pickup_time: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Commentaires
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire client
                </label>
                <div className="whitespace-pre-line px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 min-h-[76px] text-gray-800">
                  {formData.customer_comment || <span className="text-gray-400 italic">Aucun commentaire</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire FARINE (interne)
                </label>
                <textarea
                  value={formData.farine_comment}
                  onChange={(e) =>
                    setFormData({ ...formData, farine_comment: e.target.value })
                  }
                  rows={3}
                  className="resize-none"
                  placeholder="Notes internes pour cette commande..."
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Produits commandés
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-farine-beige">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Prix unitaire
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Sous-total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">{item.product_name}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        {formatPrice(item.unit_price_ttc)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatPrice(item.subtotal_ttc)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-farine-beige font-bold">
                    <td colSpan={3} className="px-4 py-3 text-right">
                      Total TTC
                    </td>
                    <td className="px-4 py-3 text-right text-lg text-farine-green">
                      {formatPrice(order.total_ttc)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Statut</h2>
            <div className="mb-4">
              <div
                className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-4"
                style={{
                  backgroundColor: status ? status.color + '33' : '#gray',
                  color: status?.color || '#333',
                }}
              >
                {order.status}
              </div>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modifier le statut
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full"
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Informations
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">N° de commande :</span>
                <div className="font-mono font-semibold">{order.order_number}</div>
              </div>
              <div>
                <span className="text-gray-600">Date de création :</span>
                <div className="font-medium">
                  {formatDate(new Date(order.created_at), 'PPP à HH:mm')}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Montant total :</span>
                <div className="font-bold text-lg text-farine-green">
                  {formatPrice(order.total_ttc)}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer les modifications
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
