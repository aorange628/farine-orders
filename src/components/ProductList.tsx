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

      // Récupérer les produits actifs AVEC quantity_increment
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

  // Fonction pour arrondir et éviter les erreurs de précision JavaScript
  function roundQuantity(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // Fonction pour déterminer le step en fonction du produit
  function getStepForProduct(product: Product): string {
    // Utiliser quantity_increment du produit
    return product.quantity_increment.toString();
  }

  // Fonction pour valider et arrondir la quantité selon le step
  function validateQuantity(product: Product, value: number): number {
    if (value <= 0) return 0;
    
    const increment = product.quantity_increment;
    
    // Arrondir au plus proche multiple de l'incrément
    return Math.round(value / increment) * increment;
  }

  // Fonction pour formater l'affichage de l'unité
  function formatUnitDisplay(unit: string): string {
    switch(unit) {
      case 'kg': return 'au kg';
      case 'miche': return 'la miche';
      case 'part': return 'la part';
      case 'unité': return 'l\'unité';
      default: return unit;
    }
  }

  // Fonction pour formater l'incrément pour l'affichage
  function formatIncrementDisplay(increment: number): string | null {
    if (increment === 1) return null; // Ne pas afficher si l'incrément est 1
    if (increment < 1) {
      // Afficher comme fraction si c'est 0.5, 0.25, 0.33, etc.
      if (increment === 0.5) return 'Demi autorisé';
      if (increment === 0.25) return 'Quart autorisé';
      if (increment === 0.33 || increment === 0.333) return 'Tiers autorisé';
      return `Commande par ${increment}`;
    }
    return `Commande par ${increment}`;
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
                    const step = getStepForProduct(product);
                    const incrementDisplay = formatIncrementDisplay(product.quantity_increment);

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
                              {formatUnitDisplay(product.unit_commande)}
                            </span>
                            {incrementDisplay && (
                              <span className="text-xs text-green-600 mt-1 block">
                                {incrementDisplay}
                              </span>
                            )}
                          </div>
                        </div>

              {/* Contrôles quantité */}
<div className="flex items-center gap-2">
  {/* Bouton moins */}
  <button
    type="button"
    onClick={() => {
      const newValue = Math.max(0, quantity - product.quantity_increment);
      const roundedValue = roundQuantity(newValue);
      setQuantities(prev => {
        const newQuantities = new Map(prev);
        newQuantities.set(product.id, roundedValue);
        return newQuantities;
      });
    }}
    disabled={quantity === 0}
    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
  >
    −
  </button>

  {/* Input quantité */}
  <input
    type="number"
    min="0"
    step={step}
    value={quantity === 0 ? '' : roundQuantity(quantity)}
    onChange={(e) => {
      const value = parseFloat(e.target.value) || 0;
      const validatedValue = validateQuantity(product, value);
      const roundedValue = roundQuantity(validatedValue);
      setQuantities(prev => {
        const newQuantities = new Map(prev);
        newQuantities.set(product.id, Math.max(0, roundedValue));
        return newQuantities;
      });
    }}
    onBlur={(e) => {
      const value = parseFloat(e.target.value) || 0;
      const validatedValue = validateQuantity(product, value);
      const roundedValue = roundQuantity(validatedValue);
      setQuantities(prev => {
        const newQuantities = new Map(prev);
        newQuantities.set(product.id, Math.max(0, roundedValue));
        return newQuantities;
      });
    }}
    className="w-20 px-2 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farine-green"
  />

  {/* Bouton plus */}
  <button
    type="button"
    onClick={() => {
      const newValue = quantity + product.quantity_increment;
      const roundedValue = roundQuantity(newValue);
      setQuantities(prev => {
        const newQuantities = new Map(prev);
        newQuantities.set(product.id, roundedValue);
        return newQuantities;
      });
    }}
    className="w-10 h-10 flex items-center justify-center bg-farine-green hover:bg-farine-green-dark text-white font-bold rounded-lg transition-colors"
  >
    +
  </button>

  {/* Bouton Ajouter */}
  <button
    onClick={() => handleAddToCart(product)}
    disabled={quantity === 0}
    className="flex-1 btn-primary text-sm py-2"
  >
    {inCart ? 'Modifier' : 'Ajouter'}
  </button>
</div>
```

---

## 🎨 Résultat visuel :
```
[  −  ]  [ 2,5 ]  [  +  ]  [ Ajouter au panier ]
                        
                        {inCart && (
                          <div className="mt-2 text-sm text-farine-green font-medium text-center">
                            ✓ Dans le panier: {roundQuantity(cart.get(product.id)?.quantity || 0)} {formatUnitDisplay(product.unit_commande)}
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
