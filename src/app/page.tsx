'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ProductList from '@/components/ProductList';
import Cart, { OrderFormData } from '@/components/Cart';
import { Product } from '@/types';
import { CheckCircle, MapPin } from 'lucide-react';
import { STORES, getStore, isValidPickupLocation, PickupLocation } from '@/lib/stores';

export default function HomePage() {
  const [cart, setCart] = useState<Map<number, { product: Product; quantity: number }>>(
    new Map()
  );
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<PickupLocation | null>(null);
  const [successLocation, setSuccessLocation] = useState<PickupLocation | null>(null);

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
        items,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la commande');
    }

    const result = await response.json();
    
    // Afficher le succès
    setOrderSuccess(result.order_number);
    setSuccessLocation(pickupLocation);
    setShowSuccessModal(true);
    
    // Vider le panier
    setCart(new Map());
    
    // Faire défiler vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeSuccessModal() {
    setShowSuccessModal(false);
    setOrderSuccess(null);
  }

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
      </Header>


      {/* Modal de succès */}
      {showSuccessModal && orderSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="w-20 h-20 text-green-600 mx-auto" />
            </div>
            <h2 className="text-3xl font-bold text-farine-green mb-4">
              Commande validée !
            </h2>
            <p className="text-gray-700 mb-2">
              Votre commande a été enregistrée avec succès.
            </p>
            <div className="bg-farine-beige p-4 rounded-lg my-6">
              <p className="text-sm text-gray-600 mb-1">Numéro de commande</p>
              <p className="text-2xl font-bold text-farine-green font-mono">
                {orderSuccess}
              </p>
            </div>
            {getStore(successLocation) && (
              <div className="border-2 border-farine-green rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">Retrait à la boutique</p>
                <p className="font-bold text-farine-green">{getStore(successLocation)!.name}</p>
                <p className="text-sm text-gray-700">
                  {getStore(successLocation)!.address}, {getStore(successLocation)!.city}
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600 mb-6">
              Vous pouvez récupérer votre commande à la date et l'heure que vous avez indiquées.
              Pensez à noter votre numéro de commande.
            </p>
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
        {/* Étape 2 : catalogue + panier (affichés une fois la boutique choisie) */}
        {selectedStore && (
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
