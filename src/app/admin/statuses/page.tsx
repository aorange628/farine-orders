'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderStatus } from '@/types';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

export default function StatusesPage() {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<OrderStatus | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#FCD34D',
  });

  useEffect(() => {
    fetchStatuses();
  }, []);

  async function fetchStatuses() {
    try {
      const { data, error } = await supabase
        .from('order_statuses')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      console.error('Erreur chargement statuts:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingStatus(null);
    setFormData({
      name: '',
      color: '#FCD34D',
    });
    setShowModal(true);
  }

  function openEditModal(status: OrderStatus) {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      color: status.color,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingStatus) {
        const { error } = await supabase
          .from('order_statuses')
          .update({
            name: formData.name,
            color: formData.color,
          })
          .eq('id', editingStatus.id);

        if (error) throw error;
      } else {
        const maxSortOrder = Math.max(...statuses.map(s => s.sort_order), 0);
        const { error } = await supabase
          .from('order_statuses')
          .insert({
            name: formData.name,
            color: formData.color,
            sort_order: maxSortOrder + 1,
          });

        if (error) throw error;
      }

      setShowModal(false);
      fetchStatuses();
    } catch (error) {
      console.error('Erreur sauvegarde statut:', error);
      alert('Erreur lors de la sauvegarde');
    }
  }

  async function toggleActive(status: OrderStatus) {
    try {
      const { error } = await supabase
        .from('order_statuses')
        .update({ is_active: !status.is_active })
        .eq('id', status.id);

      if (error) throw error;
      fetchStatuses();
    } catch (error) {
      console.error('Erreur changement statut:', error);
    }
  }

  async function deleteStatus(status: OrderStatus) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le statut "${status.name}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('order_statuses')
        .delete()
        .eq('id', status.id);

      if (error) throw error;
      fetchStatuses();
    } catch (error) {
      console.error('Erreur suppression statut:', error);
      alert('Erreur : des commandes utilisent peut-être ce statut');
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Statuts de commande</h1>
          <p className="text-gray-600 mt-2">Gérez les statuts utilisables pour les commandes</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouveau statut
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <table className="w-full">
          <thead className="bg-farine-beige">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nom</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Aperçu</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actif</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {statuses.map((status) => (
              <tr key={status.id} className="hover:bg-farine-beige transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{status.name}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: status.color + '33', color: status.color }}
                  >
                    {status.name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(status)}
                    className={`p-2 rounded-lg ${
                      status.is_active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {status.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(status)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteStatus(status)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingStatus ? 'Modifier le statut' : 'Nouveau statut'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: En cours de préparation"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#FCD34D"
                    className="flex-1"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Format hexadécimal (ex: #FCD34D)
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Aperçu :</p>
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: formData.color + '33', color: formData.color }}
                >
                  {formData.name || 'Nom du statut'}
                </span>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingStatus ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
