'use client';

import { useEffect, useState } from 'react';
import { CalendarOverride } from '@/types';
import { calculateEarliestPickupDate, isDateSelectableForPickup, formatDate, ORDER_CUTOFF_HOUR } from '@/lib/utils';
import { Calendar, Clock } from 'lucide-react';
import MonthCalendar from '@/components/MonthCalendar';

// Plage horaire de retrait
export const PICKUP_MIN_TIME = '08:00';
export const PICKUP_MAX_TIME = '18:00';

// Date locale au format YYYY-MM-DD (évite le décalage UTC de toISOString)
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Vérifie qu'une date de retrait est possible MAINTENANT :
 * jour ouvert, délai respecté (11h / J+1 / J+2), date limite du calendrier admin.
 */
export function isPickupDateAllowed(date: string, overrides: Map<string, CalendarOverride>): boolean {
  if (!date) return false;
  const minDate = calculateEarliestPickupDate(overrides);
  if (date < toDateString(minDate)) return false;
  return isDateSelectableForPickup(new Date(date + 'T00:00:00'), overrides, minDate);
}

export function isPickupTimeAllowed(time: string): boolean {
  return !!time && time >= PICKUP_MIN_TIME && time <= PICKUP_MAX_TIME;
}

interface PickupSlotSelectorProps {
  overrides: Map<string, CalendarOverride>;
  date: string;
  time: string;
  onChange: (date: string, time: string) => void;
}

export default function PickupSlotSelector({ overrides, date, time, onChange }: PickupSlotSelectorProps) {
  const [minDate, setMinDate] = useState('');
  const [timeError, setTimeError] = useState('');

  // Date minimum selon les règles de délai (recalculée quand le calendrier est chargé)
  useEffect(() => {
    const earliest = toDateString(calculateEarliestPickupDate(overrides));
    setMinDate(earliest);

    // Pré-remplir avec la date au plus tôt, ou corriger une date devenue impossible
    if (!date || !isPickupDateAllowed(date, overrides)) {
      onChange(earliest, time);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides]);

  // Clic sur un jour du calendrier (seuls les jours réservables sont cliquables)
  function handleSelectDate(selected: string) {
    if (isPickupDateAllowed(selected, overrides)) {
      onChange(selected, time);
    }
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.value;
    if (!selected) {
      onChange(date, '');
      return;
    }
    if (!isPickupTimeAllowed(selected)) {
      setTimeError('Les commandes peuvent être retirées entre 8h et 18h');
      onChange(date, '');
      return;
    }
    setTimeError('');
    onChange(date, selected);
  }

  return (
    <section className="bg-white rounded-lg shadow-md p-6 mb-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-6 h-6 text-farine-green" />
        <h2 className="text-2xl font-bold text-farine-green">
          Quand souhaitez-vous retirer votre commande ?
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Calendrier : choix du jour */}
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            Jour de retrait <span className="text-red-500">*</span>
          </p>
          <MonthCalendar
            key={minDate}
            selectedDate={date}
            isSelectable={(day) => isPickupDateAllowed(toDateString(day), overrides)}
            onSelectDate={handleSelectDate}
          />
        </div>

        {/* Jour choisi + heure */}
        <div className="space-y-4">
          <div className="p-3 bg-farine-beige rounded-lg">
            <p className="text-sm text-gray-600">Jour choisi</p>
            <p className="font-bold text-farine-green first-letter:uppercase">
              {date
                ? formatDate(new Date(date + 'T00:00:00'), 'EEEE d MMMM yyyy')
                : 'Cliquez sur un jour disponible dans le calendrier'}
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4" />
              Heure de retrait <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={time}
              min={PICKUP_MIN_TIME}
              max={PICKUP_MAX_TIME}
              onChange={handleTimeChange}
              className={timeError ? 'border-red-500' : ''}
            />
            {timeError && <p className="text-red-500 text-sm mt-1">{timeError}</p>}
          </div>

          {minDate && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <p>
                <strong>📅 Retrait possible au plus tôt :</strong>{' '}
                {formatDate(new Date(minDate + 'T00:00:00'), 'EEEE d MMMM yyyy')}
              </p>
              <p className="mt-1 text-blue-700">
                Commande avant {ORDER_CUTOFF_HOUR}h : retrait dès le jour d'ouverture suivant.
                Après {ORDER_CUTOFF_HOUR}h, ou le dimanche et le lundi : un jour d'ouverture de plus.
              </p>
            </div>
          )}
        </div>
      </div>

      {(!date || !time) && (
        <p className="text-sm text-gray-500 mt-4">
          Choisissez un jour et une heure pour accéder au catalogue.
        </p>
      )}
    </section>
  );
}
