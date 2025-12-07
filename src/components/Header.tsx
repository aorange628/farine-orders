'use client';

import Image from 'next/image';
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getDaySettingKey } from '@/lib/utils';

interface ShopHoursDisplay {
  day: string;
  closed: boolean;
  open: string;
  close: string;
}

export default function Header() {
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [shopHours, setShopHours] = useState<ShopHoursDisplay[]>([]);
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

        // Construire les horaires par jour
        const days = [
          { name: 'Lundi', index: 1 },
          { name: 'Mardi', index: 2 },
          { name: 'Mercredi', index: 3 },
          { name: 'Jeudi', index: 4 },
          { name: 'Vendredi', index: 5 },
          { name: 'Samedi', index: 6 },
          { name: 'Dimanche', index: 0 },
        ];

        const hours = days.map(day => {
          const closedKey = getDaySettingKey(day.index, 'closed');
          const openKey = getDaySettingKey(day.index, 'open');
          const closeKey = getDaySettingKey(day.index, 'close');

          const closedSetting = settings.find(s => s.key === closedKey);
          const openSetting = settings.find(s => s.key === openKey);
          const closeSetting = settings.find(s => s.key === closeKey);

          return {
            day: day.name,
            closed: closedSetting?.value === 'true',
            open: openSetting?.value || '08:00',
            close: closeSetting?.value || '19:00',
          };
        });

        setShopHours(hours);
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

        {/* Horaires */}
        {!loading && shopHours.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-farine-green" />
              <h2 className="text-xl font-bold text-farine-green">
                Horaires d'ouverture
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shopHours.map((day) => (
                <div
                  key={day.day}
                  className="flex justify-between items-center py-2 px-4 rounded hover:bg-farine-beige transition-colors"
                >
                  <span className="font-medium text-gray-700">{day.day}</span>
                  {day.closed ? (
                    <span className="text-red-600 font-medium">Fermé</span>
                  ) : (
                    <span className="text-farine-green font-medium">
                      {day.open} - {day.close}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
