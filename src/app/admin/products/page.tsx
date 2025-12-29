'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Category, ProductWithCategory } from '@/types';
import { formatPrice } from '@/lib/utils';
import { Plus, Edit2, Trash2, X, Check, ArrowUp, ArrowDown } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    unit_commande: 'unité' as 'unité' | 'kg' | 'miche' | 'part',
    unit_production: 'unité' as 'unité' | 'kg' | 'miche' | 'part',
    quantity_increment: '1',
    price_ttc: '',
    description: '',
    libelle_drive: '',
    libelle_caisse: '',
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
        .order('category_id')
        .order('sort_order')
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
      unit_commande: 'unité',
      unit_production: 'unité',
      quantity_increment: '1',
      price_ttc: '',
      description: '',
      libelle_drive: '',
      libelle_caisse: '',
      weight_per_unit: '',
    });
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setFormData({
      category_id: product.category_id.toString(),
      name: product.name,
      unit_commande: product.unit_commande,
      unit_production: product.unit_production,
      quantity_increment: product.quantity_increment.toString(),
      price_ttc: product.price_ttc.toString(),
      description: product.description || '',
      libelle_drive: product.libelle_drive || '',
      libelle_caisse: product.libelle_caisse || '',
      weight_per_unit: product.weight_per_unit?.toString() || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const productData = {
      category_id: parseInt(formData.category_id),
      name: formData.name,
      unit_commande: formData.unit_commande,
      unit_production: formData.unit_production,
      quantity_increment: parseFloat(formData.quantity_increment),
      price_ttc: parseFloat(formData.price_ttc),
      description: formData.description || null,
      libelle_drive: formData.libelle_drive || null,
      libelle_caisse: formData.libelle_caisse || null,
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

  async function moveProductUp(product: Product) {
    const categoryProducts = products.filter(p => p.category_id === product.category_id);
    const currentIndex = categoryProducts.findIndex(p => p.id === product.id);
    
    if (currentIndex <= 0) return; // Déjà en première position
    
    const previousProduct = categoryProducts[currentIndex - 1];
    
    try {
      // Échanger les sort_order
      await supabase
        .from('products')
        .update({ sort_order: previousProduct.sort_order })
        .eq('id', product.id);
      
      await supabase
        .from('products')
        .update({ sort_order: product.sort_order })
        .eq('id', previousProduct.id);
      
      fetchData();
    } catch (error) {
      console.error('Erreur déplacement produit:', error);
    }
  }

  async function moveProductDown(product: Product) {
    const categoryProducts = products.filter(p => p.category_id === product.category_id);
    const currentIndex = categoryProducts.findIndex(p => p.id === product.id);
    
    if (currentIndex >= categoryProducts.length - 1) return; // Déjà en dernière position
    
    const nextProduct = categoryProducts[currentIndex + 1];
    
    try {
      // Échanger les sort_order
      await supabase
        .from('products')
        .update({ sort_order: nextProduct.sort_order })
        .eq('id', product.id);
      
      await supabase
        .from('products')
        .update({ sort_order: product.sort_order })
        .eq('id', nextProduct.id);
      
      fetchData();
    } catch (error) {
      console.error('Erreur déplacement produit:', error);
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unité commande</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unité production</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Poids (kg)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Libellé Drive</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Libellé Caisse</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Incrément</th>
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
                      <td className="px-4 py-3 text-sm">{product.unit_commande}</td>
                      <td className="px-4 py-3 text-sm">{product.unit_production}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.weight_per_unit ? `${product.weight_per_unit} kg` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.libelle_drive || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.libelle_caisse || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          par {product.quantity_increment}
                        </span>
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
                            onClick={() => moveProductUp(product)}
                            disabled={categoryProducts.findIndex(p => p.id === product.id) === 0}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Monter"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveProductDown(product)}
                            disabled={categoryProducts.findIndex(p => p.id === product.id) === categoryProducts.length - 1}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Descendre"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
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

              {/* Prix et Incrément de quantité */}
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
                    Incrément de quantité <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.quantity_increment}
                    onChange={(e) => setFormData({ ...formData, quantity_increment: e.target.value })}
                    placeholder="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ex: 0,1 / 0,25 / 0,5 / 1
                  </p>
                </div>
              </div>

              {/* Unités */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unité de commande <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.unit_commande}
                    onChange={(e) => setFormData({ ...formData, unit_commande: e.target.value as any })}
                    required
                  >
                    <option value="unité">unité</option>
                    <option value="kg">kg</option>
                    <option value="miche">miche</option>
                    <option value="part">part</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Ce que voit le client
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unité de production <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.unit_production}
                    onChange={(e) => setFormData({ ...formData, unit_production: e.target.value as any })}
                    required
                  >
                    <option value="unité">unité</option>
                    <option value="kg">kg</option>
                    <option value="miche">miche</option>
                    <option value="part">part</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Pour la fabrication
                  </p>
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
