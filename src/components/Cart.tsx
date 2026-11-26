'use client';

import { useState, useEffect } from 'react';
import { Product, CalendarOverride } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatPrice, calculateEarliestPickupDate, formatDate, isValidPhoneNumber, isDateSelectableForPickup } from '@/lib/utils';
import { ShoppingCart, Trash2, Calendar, Clock, User, Phone, MessageSquare, MapPin } from 'lucide-react';

interface CartProps {
  cart: Map<number, { product: Product; quantity: number }>;
  storeName?: string;
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onSubmitOrder: (orderData: OrderFormData) => Promise<void>;
}

export interface OrderFormData {
  customer_firstname: string; 
  customer_name: string;
  customer_phone: string;
  pickup_date: string;
  pickup_time: string;
  customer_comment: string;
}

// Date locale au format YYYY-MM-DD (évite le décalage UTC de toISOString)
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Fonction helper pour arrondir proprement et éviter les erreurs de précision JavaScript
function roundQuantity(value: number): number {
  // Arrondir à 2 décimales pour éviter les erreurs type 2.300000000000003
  return Math.round(value * 100) / 100;
}

// Fonction pour formater l'affichage de la quantité
function formatQuantityDisplay(quantity: number, unit: string): string {
  const rounded = roundQuantity(quantity);
  const formatted = rounded.toString().replace('.', ',');
  
  switch(unit) {
    case 'kg':
      return `${formatted} kg`;
    case 'miche':
      return rounded === 1 ? '1 miche' : `${formatted} miches`;
    case 'part':
      return rounded === 1 ? '1 part' : `${formatted} parts`;
    case 'unité':
    default:
      return rounded === 1 ? '1 unité' : `${formatted} unités`;
  }
}

export default function Cart({ cart, storeName, onRemoveFromCart, onUpdateQuantity, onSubmitOrder }: CartProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    customer_firstname: '',
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
    // Date minimum : même règle pour tous les produits
    // (avant 11h : prochain jour ouvré ; après 11h : 2e jour ouvré)
    if (cart.size > 0) {
      const earliestDate = toDateString(calculateEarliestPickupDate(overridesMap));
      setMinPickupDate(earliestDate);

      // Initialiser la date du formulaire si vide
      if (!formData.pickup_date) {
        setFormData(prev => ({
          ...prev,
          pickup_date: earliestDate,
        }));
      }
    }
  }, [cart, overridesMap]);

  const cartItems = Array.from(cart.values());
  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price_ttc * item.quantity,
    0
  );

  // Vérifie qu'une date est possible : jour ouvert, pas avant la date minimum,
  // date limite de commande du calendrier admin non dépassée
  function isPickupDateAllowed(date: string): boolean {
    if (!date || (minPickupDate && date < minPickupDate)) return false;
    const minDate = new Date((minPickupDate || date) + 'T00:00:00');
    return isDateSelectableForPickup(new Date(date + 'T00:00:00'), overridesMap, minDate);
  }

  // Gère la sélection de la date d'enlèvement en bloquant les jours fermés
  // (dimanche/lundi par défaut, ou toute fermeture exceptionnelle définie
  // dans le calendrier admin via calendar_overrides)
  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedDate = e.target.value;

    if (!selectedDate) {
      setFormData(prev => ({ ...prev, pickup_date: '' }));
      return;
    }

    if (!isPickupDateAllowed(selectedDate)) {
      setErrors(prev => ({
        ...prev,
        pickup_date: 'Ce jour n\'est pas disponible (boutique fermée ou délai dépassé). Merci de choisir un autre jour.',
      }));
      setFormData(prev => ({ ...prev, pickup_date: '' }));
      return;
    }

    setErrors(prev => ({ ...prev, pickup_date: undefined }));
    setFormData(prev => ({ ...prev, pickup_date: selectedDate }));
  }

  // Gère la sélection de l'heure d'enlèvement en bloquant tout créneau
  // en dehors de la plage 8h-18h
  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedTime = e.target.value;

    if (!selectedTime) {
      setFormData(prev => ({ ...prev, pickup_time: '' }));
      return;
    }

    if (selectedTime < '08:00' || selectedTime > '18:00') {
      setErrors(prev => ({
        ...prev,
        pickup_time: 'Les commandes peuvent être retirées entre 8h et 18h',
      }));
      setFormData(prev => ({ ...prev, pickup_time: '' }));
      return;
    }

    setErrors(prev => ({ ...prev, pickup_time: undefined }));
    setFormData(prev => ({ ...prev, pickup_time: selectedTime }));
  }

  function validateForm(): boolean {
    const newErrors: Partial<Record<keyof OrderFormData, string>> = {};
     if (!formData.customer_firstname.trim()) {
      newErrors.customer_firstname = 'Le prénom est obligatoire';
    }

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
    } else if (!isPickupDateAllowed(formData.pickup_date)) {
      newErrors.pickup_date = 'Ce jour n\'est pas disponible (boutique fermée ou délai dépassé). Merci de choisir un autre jour.';
    }

    if (!formData.pickup_time) {
      newErrors.pickup_time = 'L\'heure d\'enlèvement est obligatoire';
    } else if (formData.pickup_time < '08:00' || formData.pickup_time > '18:00') {
      newErrors.pickup_time = 'Les commandes peuvent être retirées entre 8h et 18h';
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
                  {formatPrice(product.price_ttc)} × {formatQuantityDisplay(quantity, product.unit_commande)}
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

        {storeName && (
          <div className="mt-4 p-3 bg-farine-beige border border-farine-green rounded-lg flex items-start gap-2">
            <MapPin className="w-4 h-4 text-farine-green mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-800">
              <strong>Retrait :</strong> {storeName}
            </p>
          </div>
        )}

        {minPickupDate && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>📅 Date d'enlèvement au plus tôt :</strong>{' '}
              {formatDate(new Date(minPickupDate + 'T00:00:00'), 'PPP')}
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
           {/* Prénom - NOUVEAU CHAMP */}
  <div>
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
      <User className="w-4 h-4" />
      Prénom <span className="text-red-500">*</span>
    </label>
    <input
      type="text"
      value={formData.customer_firstname}
      onChange={(e) =>
        setFormData({ ...formData, customer_firstname: e.target.value })
      }
      className={errors.customer_firstname ? 'border-red-500' : ''}
      placeholder="Votre prénom"
    />
    {errors.customer_firstname && (
      <p className="text-red-500 text-sm mt-1">{errors.customer_firstname}</p>
    )}
  </div>


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
              onChange={handleDateChange}
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
              onChange={handleTimeChange}
              min="08:00"
              max="18:00"
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
