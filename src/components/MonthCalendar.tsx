'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarOverride } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DayInfo {
  date: Date;
  isCurrentMonth: boolean;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  reason: string | null;
  isException: boolean; // true si override existe
  isDefaultClosed: boolean; // true si fermé par défaut (dim/lun)
}

interface Settings {
  [key: string]: string;
}

export default function MonthCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [overrides, setOverrides] = useState<CalendarOverride[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Récupérer les overrides
      const { data: overridesData, error: overridesError } = await supabase
        .from('calendar_overrides')
        .select('*');

      if (overridesError) throw overridesError;
      setOverrides(overridesData || []);

      // Récupérer les settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*');

      if (settingsError) throw settingsError;

      const settingsMap: Settings = {};
      settingsData?.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Erreur chargement calendrier:', error);
    } finally {
      setLoading(false);
    }
  }

  function getDayInfo(date: Date): DayInfo {
    const dateString = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const isDefaultClosed = dayOfWeek === 0 || dayOfWeek === 1;

    // Chercher un override pour cette date
    const override = overrides.find(o => o.date === dateString);

    if (override) {
      // Override existe
      return {
        date,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isClosed: override.is_closed,
        openTime: override.open_time,
        closeTime: override.close_time,
        reason: override.reason,
        isException: true,
        isDefaultClosed,
      };
    } else {
      // Pas d'override, utiliser les settings par défaut
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      const closedKey = `${dayName}_closed`;
      const openKey = `${dayName}_open`;
      const closeKey = `${dayName}_close`;

      const isClosed = settings[closedKey] === 'true';
      const openTime = isClosed ? null : (settings[openKey] || '08:00');
      const closeTime = isClosed ? null : (settings[closeKey] || '19:00');

      return {
        date,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isClosed,
        openTime,
        closeTime,
        reason: null,
        isException: false,
        isDefaultClosed,
      };
    }
  }

  function getDayColor(dayInfo: DayInfo): string {
    if (!dayInfo.isCurrentMonth) {
      return 'bg-gray-100 text-gray-400';
    }

    if (dayInfo.isClosed) {
      if (dayInfo.isException && !dayInfo.isDefaultClosed) {
        // Fermé exceptionnellement (normalement ouvert)
        return 'bg-red-500 text-white font-bold';
      } else {
        // Fermé par défaut
        return 'bg-gray-300 text-gray-600';
      }
    } else {
      if (dayInfo.isException && dayInfo.isDefaultClosed) {
        // Ouvert exceptionnellement (normalement fermé)
        return 'bg-orange-400 text-white font-bold';
      } else {
        // Ouvert normalement
        return 'bg-green-100 text-green-800 border border-green-300';
      }
    }
  }

  function previousMonth() {
    setCurrentMonth(subMonths(currentMonth, 1));
  }

  function nextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1));
  }

  function goToToday() {
    setCurrentMonth(new Date());
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farine-green"></div>
        </div>
      </div>
    );
  }

  // Calculer les jours à afficher (incluant les jours du mois précédent/suivant pour remplir la grille)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Commence le lundi
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
          <button
            onClick={goToToday}
            className="text-sm text-farine-green hover:underline mt-1"
          >
            Aujourd'hui
          </button>
        </div>

        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Mois suivant"
        >
          <ChevronRight className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayInfo = getDayInfo(day);
          const isToday = day.getTime() === today.getTime();
          const isHovered = hoveredDay?.getTime() === day.getTime();

          return (
            <div
              key={day.toISOString()}
              className="relative"
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-lg
                  transition-all cursor-default
                  ${getDayColor(dayInfo)}
                  ${isToday ? 'ring-2 ring-farine-green ring-offset-2' : ''}
                  ${isHovered ? 'transform scale-110 shadow-lg z-10' : ''}
                `}
              >
                <span className="text-lg font-semibold">
                  {format(day, 'd')}
                </span>
                {dayInfo.reason && (
                  <span className="text-xs mt-1 text-center px-1 line-clamp-1">
                    {dayInfo.reason}
                  </span>
                )}
              </div>

              {/* Tooltip au survol */}
              {isHovered && dayInfo.isCurrentMonth && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                  <div className="font-semibold mb-1 capitalize">
                    {format(day, 'EEEE d MMMM', { locale: fr })}
                  </div>
                  {dayInfo.isClosed ? (
                    <div className="text-red-300">Fermé</div>
                  ) : (
                    <div>
                      {dayInfo.openTime} - {dayInfo.closeTime}
                    </div>
                  )}
                  {dayInfo.reason && (
                    <div className="text-gray-300 mt-1 italic">
                      {dayInfo.reason}
                    </div>
                  )}
                  {/* Flèche du tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Légende :</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-gray-700">Ouvert</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-300 rounded"></div>
            <span className="text-gray-700">Fermé (défaut)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded"></div>
            <span className="text-gray-700">Fermé (exception)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-400 rounded"></div>
            <span className="text-gray-700">Ouvert (exception)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          💡 Survolez un jour pour voir les horaires détaillés
        </p>
      </div>
    </div>
  );
}
