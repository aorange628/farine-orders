'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Category, ProductWithCategory } from '@/types';
import { formatPrice } from '@/lib/utils';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    unit: 'unité' as 'unité' | 'kg',
    price_ttc: '',
    description: '',
    libelle_drive: '',
    libelle_caisse: '',
    allow_half_quantity: false,
    weight_per_unit: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Récupérer les catégories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Récupérer les produits avec catégories
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*)
        `)
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData as any || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingProduct(null);
    setFormData({
      category_id: categories[0]?.id.toString() || '',
      name: '',
      unit: 'unité',
      price_ttc: '',
      description: '',
      libelle_drive: '',
      libelle_caisse: '',
      allow_half_quantity: false,
      weight_per_unit: '',
    });
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setFormData({
      category_id: product.category_id.toString(),
      name: product.name,
      unit: product.unit,
      price_ttc: product.price_ttc.toString(),
      description: product.description || '',
      libelle_drive: (product as any).libelle_drive || '',
      libelle_caisse: (product as any).libelle_caisse || '',
      allow_half_quantity: (product as any).allow_half_quantity || false,
      weight_per_unit: (product as any).weight_per_unit?.toString() || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const productData = {
      category_id: parseInt(formData.category_id),
      name: formData.name,
      unit: formData.unit,
      price_ttc: parseFloat(formData.price_ttc),
      description: formData.description || null,
      libelle_drive: formData.libelle_drive || null,
      libelle_caisse: formData.libelle_caisse || null,
      allow_half_quantity: formData.allow_half_quantity,
      weight_per_unit: formData.weight_per_unit ? parseFloat(formData.weight_per_unit) : null,
    };

    try {
      if (editingProduct) {
        // Mise à jour
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        // Création
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Erreur sauvegarde produit:', error);
      alert('Erreur lors de la sauvegarde');
    }
  }

  async function toggleActive(product: Product) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erreur changement statut:', error);
    }
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${product.name}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erreur suppression produit:', error);
      alert('Erreur lors de la suppression');
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produits</h1>
          <p className="text-gray-600 mt-2">Gérez votre catalogue de produits</p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouveau produit
        </button>
      </div>

      {/* Liste des produits par catégorie */}
      {categories.map(category => {
        const categoryProducts = products.filter(p => p.category_id === category.id);
        
        if (categoryProducts.length === 0) return null;

        return (
          <div key={category.id} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-farine-green mb-4 border-b-2 border-farine-green pb-2">
              {category.name} ({categoryProducts.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-farine-beige">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Prix TTC</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unité</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Poids (kg)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Libellé Drive</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Libellé Caisse</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">0,5 autorisé</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categoryProducts.map(product => (
                    <tr key={product.id} className="hover:bg-farine-beige transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-600 truncate max-w-md">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatPrice(product.price_ttc)}</td>
                      <td className="px-4 py-3 text-sm">{product.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(product as any).weight_per_unit ? `${(product as any).weight_per_unit} kg` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(product as any).libelle_drive || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(product as any).libelle_caisse || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(product as any).allow_half_quantity ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            ✓ Oui
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(product)}
                          className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${
                            product.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {product.is_active ? (
                            <>
                              <Check className="w-3 h-3" />
                              Actif
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3" />
                              Inactif
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Supprimer"
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
          </div>
        );
      })}

      {products.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">Aucun produit dans le catalogue</p>
          <button
            onClick={openCreateModal}
            className="btn-primary mt-4"
          >
            Créer votre premier produit
          </button>
        </div>
      )}

      {/* Modal de création/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du produit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Baguette tradition"
                  required
                />
              </div>

              {/* Prix et Unité */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix TTC (€) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_ttc}
                    onChange={(e) => setFormData({ ...formData, price_ttc: e.target.value })}
                    placeholder="1.20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unité <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as 'unité' | 'kg' })}
                    required
                  >
                    <option value="unité">unité</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              {/* Poids par unité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poids par unité (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.weight_per_unit}
                  onChange={(e) => setFormData({ ...formData, weight_per_unit: e.target.value })}
                  placeholder="Ex: 1.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Poids moyen en kg (ex: 1,1 pour une miche de 1,1kg)
                </p>
              </div>

              {/* Libellé Drive et Libellé Caisse */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Libellé Drive
                  </label>
                  <input
                    type="text"
                    value={formData.libelle_drive}
                    onChange={(e) => setFormData({ ...formData, libelle_drive: e.target.value })}
                    placeholder="Ex: Campagne nature - Miches"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nom affiché dans le système Drive
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Libellé Caisse
                  </label>
                  <input
                    type="text"
                    value={formData.libelle_caisse}
                    onChange={(e) => setFormData({ ...formData, libelle_caisse: e.target.value })}
                    placeholder="Ex: Campagne"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nom affiché sur la caisse
                  </p>
                </div>
              </div>

              {/* Autoriser demi-quantités */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="allow_half_quantity"
                    checked={formData.allow_half_quantity}
                    onChange={(e) => setFormData({ ...formData, allow_half_quantity: e.target.checked })}
                    className="w-4 h-4 text-farine-green focus:ring-farine-green mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="allow_half_quantity" className="text-sm font-medium text-gray-900 cursor-pointer block">
                      Autoriser les demi-quantités (0,5 unité)
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Si coché, les clients pourront commander 0,5 / 1 / 1,5 / 2 unités, etc.
                      <br />
                      <span className="font-medium">Exemple :</span> Pain vendu à l'unité mais en demi aussi (1/2 miche)
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optionnelle)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  maxLength={500}
                  placeholder="Description du produit..."
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/500 caractères
                </p>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingProduct ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
