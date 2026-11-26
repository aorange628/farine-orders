'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ProductList from '@/components/ProductList';
import Cart, { OrderFormData } from '@/components/Cart';
import PickupSlotSelector, { isPickupDateAllowed, isPickupTimeAllowed } from '@/components/PickupSlotSelector';
import { supabase } from '@/lib/supabase';
import { Product, CalendarOverride } from '@/types';
import { CheckCircle, MapPin, Phone } from 'lucide-react';
import { STORES, getStore, isValidPickupLocation, PickupLocation } from '@/lib/stores';
import { formatPrice, formatDate } from '@/lib/utils';

// Récapitulatif affiché après validation de la commande
interface OrderRecap {
  location: PickupLocation;
  pickupDate: string; // YYYY-MM-DD
  pickupTime: string; // HH:MM
  items: { name: string; quantity: number; unit: string; subtotal: number }[];
  total: number;
}

// Ex. : 2 unités, 0,5 miche, 1,2 kg
function formatQuantity(quantity: number, unit: string): string {
  const rounded = Math.round(quantity * 100) / 100;
  const txt = rounded.toString().replace('.', ',');
  switch (unit) {
    case 'kg':
      return `${txt} kg`;
    case 'miche':
      return rounded > 1 ? `${txt} miches` : `${txt} miche`;
    case 'part':
      return rounded > 1 ? `${txt} parts` : `${txt} part`;
    default:
      return rounded > 1 ? `${txt} unités` : `${txt} unité`;
  }
}

// "08:30" ou "08:30:00" → "8h30" ; "09:00" → "9h"
function formatTime(time: string): string {
  const [h, m] = time.split(':');
  return `${parseInt(h, 10)}h${m && m !== '00' ? m : ''}`;
}

export default function HomePage() {
  const [cart, setCart] = useState<Map<number, { product: Product; quantity: number }>>(
    new Map()
  );
  const [orderRecap, setOrderRecap] = useState<OrderRecap | null>(null);
  const [pickupLocation, setPickupLocation] = useState<PickupLocation | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [overrides, setOverrides] = useState<Map<string, CalendarOverride>>(new Map());

  // Calendrier admin (fermetures exceptionnelles, dates limites)
  useEffect(() => {
    async function fetchOverrides() {
      try {
        const { data, error } = await supabase.from('calendar_overrides').select('*');
        if (error) throw error;
        setOverrides(new Map((data || []).map((o: CalendarOverride) => [o.date, o])));
      } catch (error) {
        console.error('Erreur chargement calendrier:', error);
      }
    }
    fetchOverrides();
  }, []);

  const pickupReady = !!pickupDate && !!pickupTime;
  const pickupLabel = pickupReady
    ? `${formatDate(new Date(pickupDate + 'T00:00:00'), 'EEEE d MMMM')} à ${formatTime(pickupTime)}`
    : '';

  const selectedStore = getStore(pickupLocation);

  // Pré-sélection via l'URL : ?boutique=lilas ou ?boutique=pre
  // (pratique pour un QR code dédié à chaque boutique)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('boutique');
    if (isValidPickupLocation(param)) {
      setPickupLocation(param);
    }
  }, []);

  function handleSelectStore(id: PickupLocation) {
    setPickupLocation(id);
  }

  function handleAddToCart(product: Product, quantity: number) {
    setCart((prev) => {
      const newCart = new Map(prev);
      if (quantity === 0) {
        newCart.delete(product.id);
      } else {
        newCart.set(product.id, { product, quantity });
      }
      return newCart;
    });
  }

  function handleRemoveFromCart(productId: number) {
    setCart((prev) => {
      const newCart = new Map(prev);
      newCart.delete(productId);
      return newCart;
    });
  }

  function handleUpdateQuantity(productId: number, quantity: number) {
    setCart((prev) => {
      const newCart = new Map(prev);
      const item = newCart.get(productId);
      if (item) {
        if (quantity === 0) {
          newCart.delete(productId);
        } else {
          newCart.set(productId, { ...item, quantity });
        }
      }
      return newCart;
    });
  }

  async function handleSubmitOrder(orderData: OrderFormData) {
    if (!pickupLocation) {
      throw new Error('Merci de choisir une boutique de retrait');
    }
    // Revérifier le créneau : le délai a pu être dépassé pendant la commande (ex. passage de 11h)
    if (!isPickupDateAllowed(pickupDate, overrides) || !isPickupTimeAllowed(pickupTime)) {
      setPickupDate('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      throw new Error('Le délai de commande pour la date choisie est dépassé. Merci de choisir une nouvelle date de retrait en haut de la page.');
    }

    const items = Array.from(cart.values()).map(({ product, quantity }) => ({
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price_ttc: product.price_ttc,
    }));

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...orderData,
        pickup_location: pickupLocation,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        items,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la commande');
    }

    await response.json();

    // Afficher le récapitulatif (avant de vider le panier)
    const recapItems = Array.from(cart.values()).map(({ product, quantity }) => ({
      name: product.name,
      quantity,
      unit: product.unit_commande,
      subtotal: product.price_ttc * quantity,
    }));
    setOrderRecap({
      location: pickupLocation,
      pickupDate,
      pickupTime,
      items: recapItems,
      total: recapItems.reduce((sum, item) => sum + item.subtotal, 0),
    });
    
    // Vider le panier
    setCart(new Map());
    
    // Faire défiler vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeSuccessModal() {
    setOrderRecap(null);
  }

  const recapStore = getStore(orderRecap?.location);

  return (
    <div className="min-h-screen bg-farine-beige-light">
      <Header>
        {/* Étape 1 : choix de la boutique de retrait */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-6 h-6 text-farine-green" />
            <h2 className="text-2xl font-bold text-farine-green">
              Dans quelle boutique souhaitez-vous retirer votre commande ?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STORES.map((store) => {
              const isSelected = pickupLocation === store.id;
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => handleSelectStore(store.id)}
                  className={`text-left rounded-lg border-2 p-4 transition-colors ${
                    isSelected
                      ? 'border-farine-green bg-farine-beige'
                      : 'border-gray-200 hover:border-farine-green'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-farine-green' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-farine-green" />}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900">{store.name}</p>
                      <p className="text-sm text-gray-600">{store.address}</p>
                      <p className="text-sm text-gray-600">{store.city}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3.5 h-3.5" />
                        {store.phone}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {!selectedStore && (
            <p className="text-sm text-gray-500 mt-4">
              Choisissez votre boutique pour accéder au catalogue.
            </p>
          )}
        </section>

        {/* Étape 2 : date et heure de retrait */}
        {selectedStore && (
          <PickupSlotSelector
            overrides={overrides}
            date={pickupDate}
            time={pickupTime}
            onChange={(date, time) => {
              setPickupDate(date);
              setPickupTime(time);
            }}
          />
        )}
      </Header>


      {/* Modal de succès : récapitulatif de la commande */}
      {orderRecap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-8 text-center">
            <div className="mb-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            </div>
            <h2 className="text-3xl font-bold text-farine-green mb-2">
              Commande validée !
            </h2>
            <p className="text-gray-700 mb-6">
              Votre commande a été enregistrée avec succès.
            </p>

            {/* Retrait : boutique, date, heure */}
            <div className="border-2 border-farine-green rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">Retrait</p>
              {recapStore && (
                <>
                  <p className="font-bold text-farine-green">{recapStore.name}</p>
                  <p className="text-sm text-gray-700">
                    {recapStore.address}, {recapStore.city}
                  </p>
                  <p className="text-sm text-gray-700">
                    <a href={`tel:${recapStore.phone.replace(/\s/g, '')}`} className="hover:underline">
                      {recapStore.phone}
                    </a>
                  </p>
                </>
              )}
              <p className="font-semibold text-gray-900 mt-2 first-letter:uppercase">
                {formatDate(new Date(orderRecap.pickupDate + 'T00:00:00'), 'EEEE d MMMM yyyy')}
                {' à '}
                {formatTime(orderRecap.pickupTime)}
              </p>
            </div>

            {/* Produits */}
            <div className="bg-farine-beige rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-600 mb-2 text-center">Votre commande</p>
              <ul className="divide-y divide-gray-300">
                {orderRecap.items.map((item, index) => (
                  <li key={index} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="text-gray-800">
                      <span className="font-semibold">{formatQuantity(item.quantity, item.unit)}</span>
                      {' · '}
                      {item.name}
                    </span>
                    <span className="font-semibold text-gray-900 whitespace-nowrap">
                      {formatPrice(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t-2 border-farine-green mt-2 pt-2">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-farine-green text-lg">
                  {formatPrice(orderRecap.total)}
                </span>
              </div>
            </div>

            <button
              onClick={closeSuccessModal}
              className="btn-primary w-full"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Étape 3 : catalogue + panier (affichés une fois la boutique, la date et l'heure choisies) */}
        {selectedStore && pickupReady && (
          <div id="catalogue" className="grid grid-cols-1 lg:grid-cols-3 gap-8 scroll-mt-4">
            {/* Colonne principale : Liste des produits */}
            <div className="lg:col-span-2">
              <ProductList onAddToCart={handleAddToCart} cart={cart} />
            </div>

            {/* Colonne latérale : Panier et formulaire */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <Cart
                  cart={cart}
                  storeName={selectedStore.name}
                  pickupLabel={pickupLabel}
                  onRemoveFromCart={handleRemoveFromCart}
                  onUpdateQuantity={handleUpdateQuantity}
                  onSubmitOrder={handleSubmitOrder}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-farine-green text-white mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4">FARINE</h3>
          <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-12">
            {STORES.map((store) => (
              <div key={store.id}>
                <p className="text-farine-beige-light mb-1">{store.address}</p>
                <p className="text-farine-beige-light">{store.city}</p>
                <p className="text-farine-beige-light">{store.phone}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-farine-beige mt-4">
            © {new Date().getFullYear()} FARINE - Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
}
