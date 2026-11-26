'use client';

import { useState } from 'react';
import { Product } from '@/types';
import { formatPrice, isValidPhoneNumber } from '@/lib/utils';
import { ShoppingCart, Trash2, User, Phone, MessageSquare, MapPin } from 'lucide-react';

interface CartProps {
  cart: Map<number, { product: Product; quantity: number }>;
  storeName?: string;
  pickupLabel?: string; // ex. "mercredi 2 décembre à 9h30" (choisi en haut de page)
  onRemoveFromCart: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onSubmitOrder: (orderData: OrderFormData) => Promise<void>;
}

export interface OrderFormData {
  customer_firstname: string; 
  customer_name: string;
  customer_phone: string;
  customer_comment: string;
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

export default function Cart({ cart, storeName, pickupLabel, onRemoveFromCart, onUpdateQuantity, onSubmitOrder }: CartProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    customer_firstname: '',
    customer_name: '',
    customer_phone: '',
    customer_comment: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OrderFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const cartItems = Array.from(cart.values());
  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price_ttc * item.quantity,
    0
  );

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
      const message = error instanceof Error && error.message ? error.message : '';
      alert(message || 'Erreur lors de la validation de votre commande. Veuillez réessayer.');
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
              {pickupLabel && (
                <>
                  <br />
                  <span className="first-letter:uppercase inline-block">{pickupLabel}</span>
                </>
              )}
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
