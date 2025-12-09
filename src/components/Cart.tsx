'use client';

import { useState, useEffect } from 'react';
import { Product, CalendarOverride } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatPrice, calculateEarliestPickupDate, formatDate, isValidPhoneNumber } from '@/lib/utils';
import { ShoppingCart, Trash2, Calendar, Clock, User, Phone, MessageSquare } from 'lucide-react';

interface CartProps {
  cart: Map<number, { product: Product; quantity: number }>;
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onSubmitOrder: (orderData: OrderFormData) => Promise<void>;
}

export interface OrderFormData {
  customer_name: string;
  customer_phone: string;
  pickup_date: string;
  pickup_time: string;
  customer_comment: string;
}

export default function Cart({ cart, onRemoveFromCart, onUpdateQuantity, onSubmitOrder }: CartProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    customer_name: '',
    customer_phone: '',
    pickup_date: '',
    pickup_time: '',
    customer_comment: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OrderFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [minPickupDate, setMinPickupDate] = useState<string>('');
  const [overridesMap, setOverridesMap] = useState<Map<string, CalendarOverride>>(new Map());

  async function fetchCalendarOverrides() {
    try {
      const { data, error } = await supabase
        .from('calendar_overrides')
        .select('*');

      if (error) throw error;
      
      const map = new Map(
        (data || []).map(o => [o.date, o])
      );
      setOverridesMap(map);
    } catch (error) {
      console.error('Erreur chargement overrides:', error);
    }
  }

  useEffect(() => {
    fetchCalendarOverrides();
  }, []);

  useEffect(() => {
    // Calculer la date minimum selon la catégorie dominante dans le panier
    if (cart.size > 0) {
      let hasBreads = false;
      cart.forEach(({ product }) => {
        if (product.category_id === 1) {
          hasBreads = true;
        }
      });
      
      console.log('🛒 Cart: overridesMap size:', overridesMap.size);
      console.log('🛒 Cart: overridesMap content:', Array.from(overridesMap.entries()));
      
      const earliestDate = calculateEarliestPickupDate(hasBreads ? 'Pain' : 'Autre', overridesMap);
      setMinPickupDate(earliestDate.toISOString().split('T')[0]);
      
      // Initialiser la date du formulaire si vide
      if (!formData.pickup_date) {
        setFormData(prev => ({
          ...prev,
          pickup_date: earliestDate.toISOString().split('T')[0],
        }));
      }
    }
  }, [cart, overridesMap]);

  const cartItems = Array.from(cart.values());
  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price_ttc * item.quantity,
    0
  );

  function validateForm(): boolean {
    const newErrors: Partial<Record<keyof OrderFormData, string>> = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Le nom est obligatoire';
    }

    if (!formData.customer_phone.trim()) {
      newErrors.customer_phone = 'Le téléphone est obligatoire';
    } else if (!isValidPhoneNumber(formData.customer_phone)) {
      newErrors.customer_phone = 'Format invalide (ex: 06 12 34 56 78)';
    }

    if (!formData.pickup_date) {
      newErrors.pickup_date = 'La date d\'enlèvement est obligatoire';
    }

    if (!formData.pickup_time) {
      newErrors.pickup_time = 'L\'heure d\'enlèvement est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (cart.size === 0) {
      alert('Votre panier est vide');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitOrder(formData);
    } catch (error) {
      console.error('Erreur soumission commande:', error);
      alert('Erreur lors de la validation de votre commande. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.size === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">Votre panier est vide</p>
        <p className="text-gray-400 text-sm mt-2">
          Ajoutez des produits pour commencer
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Récapitulatif du panier */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-6 h-6 text-farine-green" />
          <h2 className="text-2xl font-bold text-farine-green">
            Votre commande
          </h2>
        </div>

        <div className="space-y-3">
          {cartItems.map(({ product, quantity }) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 bg-farine-beige rounded-lg"
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">{product.name}</h3>
                <p className="text-sm text-gray-600">
                  {formatPrice(product.price_ttc)} × {quantity} {product.unit === 'kg' ? 'kg' : 'unité(s)'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-farine-green text-lg">
                  {formatPrice(product.price_ttc * quantity)}
                </span>
                <button
                  onClick={() => onRemoveFromCart(product.id)}
                  className="text-red-600 hover:text-red-700 p-2"
                  title="Retirer du panier"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-farine-green mt-4 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-gray-800">Total</span>
            <span className="text-3xl font-bold text-farine-green">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {minPickupDate && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>📅 Date d'enlèvement au plus tôt :</strong>{' '}
              {formatDate(new Date(minPickupDate), 'PPP')}
            </p>
          </div>
        )}
      </div>

      {/* Formulaire de commande */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-farine-green mb-6">
          Vos coordonnées
        </h2>

        <div className="space-y-4">
          {/* Nom */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) =>
                setFormData({ ...formData, customer_name: e.target.value })
              }
              className={errors.customer_name ? 'border-red-500' : ''}
              placeholder="Votre nom"
            />
            {errors.customer_name && (
              <p className="text-red-500 text-sm mt-1">{errors.customer_name}</p>
            )}
          </div>

          {/* Téléphone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4" />
              Téléphone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) =>
                setFormData({ ...formData, customer_phone: e.target.value })
              }
              className={errors.customer_phone ? 'border-red-500' : ''}
              placeholder="06 12 34 56 78"
            />
            {errors.customer_phone && (
              <p className="text-red-500 text-sm mt-1">{errors.customer_phone}</p>
            )}
          </div>

          {/* Date d'enlèvement */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              Date d'enlèvement <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.pickup_date}
              onChange={(e) =>
                setFormData({ ...formData, pickup_date: e.target.value })
              }
              min={minPickupDate}
              className={errors.pickup_date ? 'border-red-500' : ''}
            />
            {errors.pickup_date && (
              <p className="text-red-500 text-sm mt-1">{errors.pickup_date}</p>
            )}
          </div>

          {/* Heure d'enlèvement */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4" />
              Heure d'enlèvement <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.pickup_time}
              onChange={(e) =>
                setFormData({ ...formData, pickup_time: e.target.value })
              }
              className={errors.pickup_time ? 'border-red-500' : ''}
            />
            {errors.pickup_time && (
              <p className="text-red-500 text-sm mt-1">{errors.pickup_time}</p>
            )}
          </div>

          {/* Commentaire */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4" />
              Commentaire (optionnel)
            </label>
            <textarea
              value={formData.customer_comment}
              onChange={(e) =>
                setFormData({ ...formData, customer_comment: e.target.value })
              }
              rows={3}
              className="resize-none"
              placeholder="Précisions sur votre commande..."
            />
          </div>
        </div>

        {/* Bouton de validation */}
        <button
          type="submit"
          disabled={submitting || cart.size === 0}
          className="w-full btn-primary mt-6 text-lg py-4"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Validation en cours...
            </span>
          ) : (
            `Valider ma commande (${formatPrice(total)})`
          )}
        </button>

        <p className="text-sm text-gray-500 text-center mt-4">
          * Champs obligatoires
        </p>
      </form>
    </div>
  );
}
