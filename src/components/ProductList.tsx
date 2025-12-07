'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Category, Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { Plus, Minus } from 'lucide-react';

interface ProductListProps {
  onAddToCart: (product: Product, quantity: number) => void;
  cart: Map<number, { product: Product; quantity: number }>;
}

export default function ProductList({ onAddToCart, cart }: ProductListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    fetchCategoriesAndProducts();
  }, []);

  async function fetchCategoriesAndProducts() {
    try {
      // Récupérer les catégories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (categoriesError) throw categoriesError;

      // Récupérer les produits actifs
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;

      setCategories(categoriesData || []);
      setProducts(productsData || []);

      // Initialiser les quantités à 0
      const initialQuantities = new Map();
      productsData?.forEach(product => {
        initialQuantities.set(product.id, 0);
      });
      setQuantities(initialQuantities);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleQuantityChange(productId: number, delta: number) {
    setQuantities(prev => {
      const newQuantities = new Map(prev);
      const currentQty = newQuantities.get(productId) || 0;
      const newQty = currentQty + delta;
      
      // Arrondir à 1 décimale pour éviter les erreurs de précision
      const roundedQty = Math.round(Math.max(0, newQty) * 10) / 10;
      
      newQuantities.set(productId, roundedQty);
      return newQuantities;
    });
  }

  function handleAddToCart(product: Product) {
    const quantity = quantities.get(product.id) || 0;
    if (quantity > 0) {
      onAddToCart(product, quantity);
      // Réinitialiser la quantité après ajout
      setQuantities(prev => {
        const newQuantities = new Map(prev);
        newQuantities.set(product.id, 0);
        return newQuantities;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farine-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {categories.map(category => {
        const categoryProducts = products.filter(
          p => p.category_id === category.id
        );

        if (categoryProducts.length === 0) return null;

        return (
          <div key={category.id} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-farine-green mb-6 border-b-2 border-farine-green pb-2">
              {category.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryProducts.map(product => {
                const quantity = quantities.get(product.id) || 0;
                const inCart = cart.has(product.id);

                return (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-4 transition-all ${
                      inCart
                        ? 'border-farine-green bg-farine-beige'
                        : 'border-gray-200 hover:border-farine-green hover:shadow-md'
                    }`}
                  >
                    {/* Nom du produit */}
                    <h3 className="font-bold text-lg text-gray-800 mb-2">
                      {product.name}
                    </h3>

                    {/* Description si présente */}
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {/* Prix et unité */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-farine-green">
                        {formatPrice(product.price_ttc)}
                      </span>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {product.unit === 'kg' ? 'au kg' : 'l\'unité'}
                      </span>
                    </div>

                    {/* Contrôles quantité */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => handleQuantityChange(product.id, product.unit === 'kg' ? -0.1 : -1)}
                          disabled={quantity === 0}
                          className="p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-l-lg"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          step={product.unit === 'kg' ? '0.1' : '1'}
                          value={quantity === 0 ? '' : quantity}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setQuantities(prev => {
                              const newQuantities = new Map(prev);
                              newQuantities.set(product.id, Math.max(0, value));
                              return newQuantities;
                            });
                          }}
                          className="min-w-[100px] text-center border-0 focus:outline-none focus:ring-0"
                        />
                        <button
                          onClick={() => handleQuantityChange(product.id, product.unit === 'kg' ? 0.1 : 1)}
                          className="p-2 hover:bg-gray-100 rounded-r-lg"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={quantity === 0}
                        className="flex-1 btn-primary text-sm py-2"
                      >
                        {inCart ? 'Modifier' : 'Ajouter'}
                      </button>
                    </div>
                    
                    {inCart && (
                      <div className="mt-2 text-sm text-farine-green font-medium text-center">
                        ✓ Dans le panier: {cart.get(product.id)?.quantity} {product.unit === 'kg' ? 'kg' : 'unité(s)'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucun produit disponible pour le moment.
        </div>
      )}
    </div>
  );
}
