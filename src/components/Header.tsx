'use client';

import Image from 'next/image';
import { useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import MonthCalendar from '@/components/MonthCalendar';

// children : contenu affiché entre le message d'accueil et le calendrier
// (utilisé pour le choix de la boutique de retrait)
export default function Header({ children }: { children?: ReactNode }) {
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('*');

      if (error) throw error;

      if (settings) {
        // Extraire le message d'accueil
        const welcomeSetting = settings.find(s => s.key === 'welcome_message');
        if (welcomeSetting) {
          setWelcomeMessage(welcomeSetting.value);
        }
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="bg-farine-beige border-b-4 border-farine-green">
      <div className="container mx-auto px-4 py-6">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-full max-w-md">
            <Image
              src="/logo.png"
              alt="FARINE - Le Pré Saint-Gervais"
              width={500}
              height={200}
              priority
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Message d'accueil */}
        {welcomeMessage && (
          <div className="text-center mb-6">
            <p className="text-lg text-gray-700 max-w-2xl mx-auto whitespace-pre-line">
              {welcomeMessage}
            </p>
          </div>
        )}

        {/* Choix de la boutique (au-dessus du calendrier) */}
        {children}

        {/* Calendrier mensuel */}
        {!loading && <MonthCalendar />}
      </div>
    </header>
  );
}
