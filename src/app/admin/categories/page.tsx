'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCategory(null);
    setFormData({ name: '' });
    setShowModal(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setFormData({ name: category.name });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name: formData.name })
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const maxSortOrder = Math.max(...categories.map(c => c.sort_order), 0);
        const { error } = await supabase
          .from('categories')
          .insert({ name: formData.name, sort_order: maxSortOrder + 1 });

        if (error) throw error;
      }

      setShowModal(false);
      fetchCategories();
    } catch (error) {
      console.error('Erreur sauvegarde catégorie:', error);
      alert('Erreur lors de la sauvegarde');
    }
  }

  async function deleteCategory(category: Category) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${category.name}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error('Erreur suppression catégorie:', error);
      alert('Erreur : cette catégorie contient peut-être des produits');
    }
  }

  async function moveCategory(category: Category, direction: 'up' | 'down') {
    const index = categories.findIndex(c => c.id === category.id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === categories.length - 1)) {
      return;
    }

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const swapCategory = categories[swapIndex];

    try {
      await supabase
        .from('categories')
        .update({ sort_order: swapCategory.sort_order })
        .eq('id', category.id);

      await supabase
        .from('categories')
        .update({ sort_order: category.sort_order })
        .eq('id', swapCategory.id);

      fetchCategories();
    } catch (error) {
      console.error('Erreur déplacement catégorie:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Catégories</h1>
          <p className="text-gray-600 mt-2">Gérez les catégories de produits</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouvelle catégorie
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <table className="w-full">
          <thead className="bg-farine-beige">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ordre</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nom</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((category, index) => (
              <tr key={category.id} className="hover:bg-farine-beige transition-colors">
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveCategory(category, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-600 hover:text-farine-green disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveCategory(category, 'down')}
                      disabled={index === categories.length - 1}
                      className="p-1 text-gray-600 hover:text-farine-green disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category)}
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
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="Ex: Pain, Sucré, Salé"
                  required
                />
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
                  {editingCategory ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
