'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import ProductList from '@/components/ProductList';
import Cart, { OrderFormData } from '@/components/Cart';
import { Product } from '@/types';
import { CheckCircle } from 'lucide-react';

export default function HomePage() {
  const [cart, setCart] = useState<Map<number, { product: Product; quantity: number }>>(
    new Map()
  );
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      <Header />

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale : Liste des produits */}
          <div className="lg:col-span-2">
            <ProductList onAddToCart={handleAddToCart} cart={cart} />
          </div>

          {/* Colonne latérale : Panier et formulaire */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Cart
                cart={cart}
                onRemoveFromCart={handleRemoveFromCart}
                onUpdateQuantity={handleUpdateQuantity}
                onSubmitOrder={handleSubmitOrder}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-farine-green text-white mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-2">FARINE</h3>
          <p className="text-farine-beige-light mb-1">37 rue de Stalingrad</p>
          <p className="text-farine-beige-light">Le Pré Saint-Gervais</p>
          <p className="text-sm text-farine-beige mt-4">
            © {new Date().getFullYear()} FARINE - Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
}
