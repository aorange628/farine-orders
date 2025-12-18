'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Category, Product, CalendarOverride } from '@/types';
import { formatPrice } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ProductListProps {
  onAddToCart: (product: Product, quantity: number) => void;
  cart: Map<number, { product: Product; quantity: number }>;
}

export default function ProductList({ onAddToCart, cart }: ProductListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Map<number, number>>(new Map());
  const [calendarOverrides, setCalendarOverrides] = useState<CalendarOverride[]>([]);
  const [overridesMap, setOverridesMap] = useState<Map<string, CalendarOverride>>(new Map());
  
  // État pour gérer les catégories ouvertes/fermées
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchCategoriesAndProducts();
    fetchCalendarOverrides();
  }, []);

  async function fetchCalendarOverrides() {
    try {
      const { data, error } = await supabase
        .from('calendar_overrides')
        .select('*');

      if (error) throw error;
      
      setCalendarOverrides(data || []);
      
      // Créer une Map pour accès rapide par date
      const map = new Map(
        (data || []).map(o => [o.date, o])
      );
      setOverridesMap(map);
    } catch (error) {
      console.error('Erreur chargement overrides:', error);
    }
  }

  async function fetchCategoriesAndProducts() {
    try {
      // Récupérer les catégories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (categoriesError) throw categoriesError;

      // Récupérer les produits actifs AVEC le champ allow_half_quantity
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
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

  function toggleCategory(categoryId: number) {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
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

  // Fonction pour déterminer le step en fonction du produit
  function getStepForProduct(product: Product): string {
    if (product.unit === 'kg') {
      return '0.1'; // kg : 0.1 kg minimum
    } else if ((product as any).allow_half_quantity) {
      return '0.5'; // unité avec demi autorisé : 0.5 minimum
    } else {
      return '1'; // unité standard : 1 minimum
    }
  }

  // Fonction pour valider et arrondir la quantité selon le step
  function validateQuantity(product: Product, value: number): number {
    if (value <= 0) return 0;
    
    if (product.unit === 'kg') {
      // Pour kg : arrondir à 0.1 près
      return Math.round(value * 10) / 10;
    } else if ((product as any).allow_half_quantity) {
      // Pour unité avec demi : arrondir à 0.5 près
      return Math.round(value * 2) / 2;
    } else {
      // Pour unité standard : arrondir à l'entier
      return Math.round(value);
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
    <div className="space-y-4">
      {categories.map(category => {
        const categoryProducts = products.filter(
          p => p.category_id === category.id
        );

        if (categoryProducts.length === 0) return null;

        const isExpanded = expandedCategories.has(category.id);

        return (
          <div key={category.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* En-tête de catégorie - cliquable */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-5 bg-farine-beige hover:bg-farine-green-light transition-colors group"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-6 h-6 text-farine-green transition-transform" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-farine-green transition-transform" />
                )}
                <h2 className="text-2xl font-bold text-farine-green">
                  {category.name}
                </h2>
                <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
                  {categoryProducts.length} produit{categoryProducts.length > 1 ? 's' : ''}
                </span>
              </div>
            </button>

            {/* Liste des produits - affichée seulement si la catégorie est ouverte */}
            {isExpanded && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryProducts.map(product => {
                    const quantity = quantities.get(product.id) || 0;
                    const inCart = cart.has(product.id);
                    const allowHalf = (product as any).allow_half_quantity;
                    const step = getStepForProduct(product);

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
                          <div className="text-right">
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded block">
                              {product.unit === 'kg' ? 'au kg' : 'l\'unité'}
                            </span>
                            {allowHalf && product.unit === 'unité' && (
                              <span className="text-xs text-green-600 mt-1 block">
                                demi autorisé
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Contrôles quantité */}
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            step={step}
                            value={quantity === 0 ? '' : quantity}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              const validatedValue = validateQuantity(product, value);
                              setQuantities(prev => {
                                const newQuantities = new Map(prev);
                                newQuantities.set(product.id, Math.max(0, validatedValue));
                                return newQuantities;
                              });
                            }}
                            onBlur={(e) => {
                              // Validation finale au blur pour s'assurer que la valeur respecte le step
                              const value = parseFloat(e.target.value) || 0;
                              const validatedValue = validateQuantity(product, value);
                              setQuantities(prev => {
                                const newQuantities = new Map(prev);
                                newQuantities.set(product.id, Math.max(0, validatedValue));
                                return newQuantities;
                              });
                            }}
                            className="w-28 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farine-green"
                          />
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
            )}
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
