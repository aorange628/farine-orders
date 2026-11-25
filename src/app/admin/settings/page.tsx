'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Setting } from '@/types';
import { getDaySettingKey } from '@/lib/utils';
import { Save, MessageSquare, Clock } from 'lucide-react';

interface DaySchedule {
  day: string;
  index: number;
  closed: boolean;
  open: string;
  close: string;
}

export default function SettingsPage() {
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: 'Lundi', index: 1, closed: true, open: '08:00', close: '19:00' },
    { day: 'Mardi', index: 2, closed: false, open: '08:00', close: '19:30' },
    { day: 'Mercredi', index: 3, closed: false, open: '08:00', close: '19:30' },
    { day: 'Jeudi', index: 4, closed: false, open: '08:00', close: '19:30' },
    { day: 'Vendredi', index: 5, closed: false, open: '08:00', close: '19:30' },
    { day: 'Samedi', index: 6, closed: false, open: '08:00', close: '19:00' },
    { day: 'Dimanche', index: 0, closed: true, open: '08:00', close: '19:00' },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase.from('settings').select('*');

      if (error) throw error;

      if (data) {
        // Message d'accueil
        const welcomeSetting = data.find(s => s.key === 'welcome_message');
        if (welcomeSetting) {
          setWelcomeMessage(welcomeSetting.value);
        }

        // Horaires
        const newSchedule = schedule.map(day => {
          const closedKey = getDaySettingKey(day.index, 'closed');
          const openKey = getDaySettingKey(day.index, 'open');
          const closeKey = getDaySettingKey(day.index, 'close');

          const closedSetting = data.find(s => s.key === closedKey);
          const openSetting = data.find(s => s.key === openKey);
          const closeSetting = data.find(s => s.key === closeKey);

          return {
            ...day,
            closed: closedSetting?.value === 'true',
            open: openSetting?.value || day.open,
            close: closeSetting?.value || day.close,
          };
        });

        setSchedule(newSchedule);
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);

    try {
      // Sauvegarder le message d'accueil
      await supabase
        .from('settings')
        .update({ value: welcomeMessage })
        .eq('key', 'welcome_message');

      // Sauvegarder les horaires
      for (const day of schedule) {
        const closedKey = getDaySettingKey(day.index, 'closed');
        const openKey = getDaySettingKey(day.index, 'open');
        const closeKey = getDaySettingKey(day.index, 'close');

        await supabase
          .from('settings')
          .update({ value: day.closed.toString() })
          .eq('key', closedKey);

        await supabase
          .from('settings')
          .update({ value: day.open })
          .eq('key', openKey);

        await supabase
          .from('settings')
          .update({ value: day.close })
          .eq('key', closeKey);
      }

      alert('Paramètres enregistrés avec succès !');
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function updateDaySchedule(index: number, field: keyof DaySchedule, value: any) {
    setSchedule(prev =>
      prev.map((day, i) =>
        i === index ? { ...day, [field]: value } : day
      )
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farine-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600 mt-2">
          Configurez le message d'accueil et les horaires de la boutique
        </p>
      </div>

      {/* Message d'accueil */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-6 h-6 text-farine-green" />
          <h2 className="text-xl font-bold text-gray-900">Message d'accueil</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Ce message s'affiche sur la page publique de commande
        </p>
        <textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          rows={10}
          maxLength={1000}
          className="w-full resize-y"
          placeholder="Bienvenue sur notre système de commande en ligne..."
        />
        <p className="text-xs text-gray-500 mt-2">
          {welcomeMessage.length}/1000 caractères
        </p>
      </div>

      {/* Horaires */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-6 h-6 text-farine-green" />
          <h2 className="text-xl font-bold text-gray-900">Horaires d'ouverture</h2>
        </div>

        <div className="space-y-4">
          {schedule.map((day, index) => (
            <div
              key={day.day}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                day.closed
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-farine-green bg-farine-beige'
              }`}
            >
              {/* Jour */}
              <div className="w-32">
                <span className="font-medium text-gray-900">{day.day}</span>
              </div>

              {/* Checkbox Fermé */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`closed-${day.day}`}
                  checked={day.closed}
                  onChange={(e) =>
                    updateDaySchedule(index, 'closed', e.target.checked)
                  }
                  className="w-4 h-4 text-farine-green rounded focus:ring-farine-green"
                />
                <label
                  htmlFor={`closed-${day.day}`}
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  Fermé
                </label>
              </div>

              {/* Horaires */}
              {!day.closed && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Ouverture :</label>
                    <input
                      type="time"
                      value={day.open}
                      onChange={(e) =>
                        updateDaySchedule(index, 'open', e.target.value)
                      }
                      className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-farine-green"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Fermeture :</label>
                    <input
                      type="time"
                      value={day.close}
                      onChange={(e) =>
                        updateDaySchedule(index, 'close', e.target.value)
                      }
                      className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-farine-green"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bouton Enregistrer */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-8"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Enregistrer les paramètres
            </>
          )}
        </button>
      </div>
    </div>
  );
}
