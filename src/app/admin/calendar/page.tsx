'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarOverride, DaySchedule } from '@/types';
import { generateWeekSchedule, getMonday } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import DayEditorModal from '@/components/DayEditorModal';

export default function CalendarPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [overrides, setOverrides] = useState<CalendarOverride[]>([]);
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DaySchedule | null>(null);

  useEffect(() => {
    fetchOverrides();
  }, []);

  useEffect(() => {
    if (overrides) {
      updateWeekSchedule();
    }
  }, [currentWeekStart, overrides]);

  async function fetchOverrides() {
    try {
      const { data, error } = await supabase
        .from('calendar_overrides')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setOverrides(data || []);
    } catch (error) {
      console.error('Erreur chargement overrides:', error);
      alert('Erreur lors du chargement du calendrier');
    } finally {
      setLoading(false);
    }
  }

  function updateWeekSchedule() {
    const schedule = generateWeekSchedule(currentWeekStart, overrides);
    setWeekSchedule(schedule);
  }

  function previousWeek() {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  }

  function nextWeek() {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  }

  function goToCurrentWeek() {
    setCurrentWeekStart(getMonday(new Date()));
  }

  async function handleSaveDay(dayData: Partial<CalendarOverride>) {
    try {
      const existingOverride = overrides.find(o => o.date === dayData.date);

      if (existingOverride) {
        // Update
        const { error } = await supabase
          .from('calendar_overrides')
          .update({
            is_closed: dayData.is_closed,
            open_time: dayData.open_time,
            close_time: dayData.close_time,
            reason: dayData.reason,
          })
          .eq('id', existingOverride.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('calendar_overrides')
          .insert(dayData);

        if (error) throw error;
      }

      await fetchOverrides();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      throw error;
    }
  }

  async function handleDeleteDay() {
    if (!selectedDay?.override) return;

    try {
      const { error } = await supabase
        .from('calendar_overrides')
        .delete()
        .eq('id', selectedDay.override.id);

      if (error) throw error;

      await fetchOverrides();
    } catch (error) {
      console.error('Erreur suppression:', error);
      throw error;
    }
  }

  function getDayStatusColor(day: DaySchedule): string {
    if (day.isClosed) {
      return day.isDefaultClosed ? 'bg-gray-200' : 'bg-red-100 border-red-300';
    } else {
      return day.isDefaultClosed ? 'bg-orange-100 border-orange-300' : 'bg-green-100 border-green-300';
    }
  }

  function getDayStatusIcon(day: DaySchedule): string {
    if (day.isClosed) {
      return day.isDefaultClosed ? '🔴' : '❌';
    } else {
      return day.isDefaultClosed ? '🟠' : '🟢';
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farine-green"></div>
      </div>
    );
  }

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-farine-green" />
          <h1 className="text-3xl font-bold text-gray-900">
            Calendrier des ouvertures
          </h1>
        </div>
        <button
          onClick={goToCurrentWeek}
          className="btn-secondary text-sm"
        >
          Aujourd'hui
        </button>
      </div>

      {/* Navigation semaine */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={previousWeek}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              Du {currentWeekStart.getDate()} {currentWeekStart.toLocaleDateString('fr-FR', { month: 'long' })} 
              {' au '}{weekEnd.getDate()} {weekEnd.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
          </div>

          <button
            onClick={nextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Vue calendrier par semaine */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekSchedule.map((day) => {
          const isToday = day.date === new Date().toISOString().split('T')[0];
          
          return (
            <div
              key={day.date}
              className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${
                isToday ? 'border-farine-green' : 'border-transparent'
              }`}
            >
              {/* En-tête du jour */}
              <div className={`p-3 text-center ${getDayStatusColor(day)} border-b-2`}>
                <div className="text-2xl mb-1">{getDayStatusIcon(day)}</div>
                <div className="font-bold text-gray-900 capitalize text-sm">
                  {day.dayName.substring(0, 3)}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {day.dayNumber}
                </div>
              </div>

              {/* Contenu du jour */}
              <div className="p-3 space-y-2">
                {day.isClosed ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-red-600">Fermé</p>
                    {day.reason && (
                      <p className="text-xs text-gray-600 mt-1">{day.reason}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-gray-600">
                      {day.openTime} - {day.closeTime}
                    </p>
                    {day.reason && (
                      <p className="text-xs text-gray-600 mt-1">{day.reason}</p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setSelectedDay(day)}
                  className="w-full text-sm text-farine-green hover:text-farine-green-dark underline"
                >
                  Modifier
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-bold text-gray-900 mb-3">Légende</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔴</span>
            <span className="text-sm text-gray-700">Fermé par défaut</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🟢</span>
            <span className="text-sm text-gray-700">Ouvert (horaires standards)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">❌</span>
            <span className="text-sm text-gray-700">Fermeture exceptionnelle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🟠</span>
            <span className="text-sm text-gray-700">Ouverture exceptionnelle</span>
          </div>
        </div>
      </div>

      {/* Informations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Comment ça marche ?</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Par défaut : fermé dimanche et lundi, ouvert mardi-samedi 8h-19h</li>
          <li>Cliquez sur "Modifier" pour créer une exception pour un jour précis</li>
          <li>Les exceptions sont automatiquement prises en compte dans le calcul des dates d'enlèvement</li>
          <li>Utilisez "Réinitialiser au défaut" pour supprimer une exception</li>
        </ul>
      </div>

      {/* Modal d'édition */}
      {selectedDay && (
        <DayEditorModal
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          onSave={handleSaveDay}
          onDelete={handleDeleteDay}
        />
      )}
    </div>
  );
}
