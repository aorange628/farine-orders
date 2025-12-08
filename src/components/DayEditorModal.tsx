'use client';

import { useState, useEffect } from 'react';
import { DaySchedule, CalendarOverride } from '@/types';
import { X } from 'lucide-react';

interface DayEditorModalProps {
  day: DaySchedule;
  onClose: () => void;
  onSave: (override: Partial<CalendarOverride>) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function DayEditorModal({ day, onClose, onSave, onDelete }: DayEditorModalProps) {
  const [isClosed, setIsClosed] = useState(day.isClosed);
  const [openTime, setOpenTime] = useState(day.openTime || '08:00');
  const [closeTime, setCloseTime] = useState(day.closeTime || '19:00');
  const [reason, setReason] = useState(day.reason || '');
  const [saving, setSaving] = useState(false);

  const hasOverride = day.override !== null;
  const isDefaultBehavior = 
  day.isDefaultClosed === isClosed && 
  !hasOverride &&
  (!isClosed && openTime === (day.openTime || '08:00') && closeTime === (day.closeTime || '19:00'));

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        date: day.date,
        is_closed: isClosed,
        open_time: isClosed ? null : openTime,
        close_time: isClosed ? null : closeTime,
        reason: reason.trim() || null,
      });
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm('Réinitialiser ce jour aux valeurs par défaut ?')) {
      return;
    }
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la réinitialisation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900 capitalize">
              {day.dayName} {day.dayNumber}
            </h2>
            <p className="text-sm text-gray-600">{day.date}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Statut ouvert/fermé */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!isClosed}
                onChange={(e) => setIsClosed(!e.target.checked)}
                className="w-5 h-5 text-farine-green rounded focus:ring-farine-green"
              />
              <span className="font-medium text-gray-900">Ouvert ce jour</span>
            </label>
            {day.isDefaultClosed && !isClosed && (
              <p className="text-sm text-orange-600 mt-1 ml-8">
                ⚠️ Ouverture exceptionnelle (ce jour est normalement fermé)
              </p>
            )}
            {!day.isDefaultClosed && isClosed && (
              <p className="text-sm text-red-600 mt-1 ml-8">
                ⚠️ Fermeture exceptionnelle (ce jour est normalement ouvert)
              </p>
            )}
          </div>

          {/* Horaires (seulement si ouvert) */}
          {!isClosed && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ouverture
                </label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fermeture
                </label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Raison */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raison (optionnel)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Fermeture Noël, Ouverture exceptionnelle..."
              className="w-full"
            />
          </div>

          {/* Info comportement par défaut */}
          {isDefaultBehavior && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ℹ️ Ces réglages correspondent aux valeurs par défaut. 
                Aucune exception ne sera enregistrée.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div>
            {hasOverride && (
              <button
                onClick={handleReset}
                disabled={saving}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Réinitialiser au défaut
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || isDefaultBehavior}
              className="btn-primary"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
