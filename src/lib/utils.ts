import { format, addDays, isAfter, setHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarOverride, DaySchedule } from '@/types';

/**
 * Vérifie si une date est fermée (dimanche, lundi OU override)
 * @param date - Date à vérifier
 * @param overrides - Map des overrides indexés par date YYYY-MM-DD
 * @param defaultOpenTime - Horaire d'ouverture par défaut (ex: "08:00")
 * @param defaultCloseTime - Horaire de fermeture par défaut (ex: "19:00")
 * @returns true si fermé
 */
export function isClosedDate(
  date: Date,
  overrides: Map<string, CalendarOverride>,
  defaultOpenTime: string = '08:00',
  defaultCloseTime: string = '19:00'
): boolean {
  const dateString = format(date, 'yyyy-MM-dd');
  const override = overrides.get(dateString);
  
  // Si override existe, utiliser sa valeur
  if (override) {
    return override.is_closed;
  }
  
  // Sinon, utiliser la règle par défaut (dimanche=0, lundi=1)
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 1;
}

/**
 * Vérifie si une date peut être sélectionnée comme date d'enlèvement
 * en tenant compte des extensions de délai (cutoff_date)
 * @param date - Date candidate
 * @param overrides - Map des overrides
 * @param baseMinDate - Date minimum calculée selon les règles normales
 * @returns true si la date est sélectionnable
 */
export function isDateSelectableForPickup(
  date: Date,
  overrides: Map<string, CalendarOverride>,
  baseMinDate: Date
): boolean {
  // Si le jour est fermé, jamais sélectionnable
  if (isClosedDate(date, overrides)) {
    return false;
  }
  
  const dateString = format(date, 'yyyy-MM-dd');
  const override = overrides.get(dateString);
  
  // Si la date a un cutoff_date, c'est une extension de délai
  if (override && override.cutoff_date) {
    const cutoffDate = new Date(override.cutoff_date + 'T23:59:59');
    const now = new Date();
    
    // On peut commander pour ce jour SI on est encore avant le cutoff
    if (now <= cutoffDate) {
      return true; // Extension autorisée
    } else {
      return false; // Cutoff dépassé
    }
  }
  
  // Pas de cutoff, utiliser les règles normales
  return date >= baseMinDate;
}

/**
 * Calcule la date d'enlèvement la plus proche selon les règles métier
 * VERSION AVEC EXTENSIONS DE DÉLAI (cutoff_date)
 * @param categoryName - Nom de la catégorie du produit
 * @param overrides - Map des overrides indexés par date YYYY-MM-DD
 * @returns Date minimum d'enlèvement
 */
export function calculateEarliestPickupDate(
  categoryName: string,
  overrides: Map<string, CalendarOverride> = new Map()
): Date {
  const now = new Date();
  let startDate = new Date(now);
  const currentDay = now.getDay();
  
  let isBeforeNoon = false;
  
  // Vérifier si aujourd'hui est fermé (dim/lun OU override)
  const todayIsClosed = isClosedDate(now, overrides);
  
  if (todayIsClosed) {
    // Trouver le prochain jour ouvert
    let nextOpenDate = new Date(now);
    nextOpenDate.setDate(nextOpenDate.getDate() + 1);
    
    while (isClosedDate(nextOpenDate, overrides)) {
      nextOpenDate.setDate(nextOpenDate.getDate() + 1);
    }
    
    startDate = nextOpenDate;
    isBeforeNoon = true;
  } else {
    const noon = setHours(new Date(), 12);
    isBeforeNoon = !isAfter(now, noon);
  }
  
  let daysToAdd: number;
  
  if (categoryName === 'Pain') {
    daysToAdd = isBeforeNoon ? 3 : 4;
  } else {
    daysToAdd = isBeforeNoon ? 1 : 2;
  }
  
  // Calculer la date minimum selon les règles NORMALES
  let baseMinDate = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < daysToAdd) {
    baseMinDate.setDate(baseMinDate.getDate() + 1);
    
    if (!isClosedDate(baseMinDate, overrides)) {
      addedDays++;
    }
  }
  
  // MAINTENANT chercher la date la plus proche disponible
  // Cela peut être AVANT baseMinDate si un jour a un cutoff_date qui l'autorise
  
  let candidateDate = new Date(now);
  candidateDate.setDate(candidateDate.getDate() + 1); // Commencer à demain
  
  // Chercher jusqu'à 60 jours dans le futur max
  for (let i = 0; i < 60; i++) {
    if (isDateSelectableForPickup(candidateDate, overrides, baseMinDate)) {
      return candidateDate;
    }
    candidateDate.setDate(candidateDate.getDate() + 1);
  }
  
  // Si rien trouvé (cas improbable), retourner baseMinDate
  return baseMinDate;
}

/**
 * Génère un planning de semaine avec les overrides
 * @param startDate - Date de début de semaine (lundi)
 * @param overrides - Liste des overrides
 * @param settings - Paramètres généraux (horaires par défaut)
 * @returns Tableau de 7 jours avec leur planning
 */
export function generateWeekSchedule(
  startDate: Date,
  overrides: CalendarOverride[],
  defaultOpenTime: string = '08:00',
  defaultCloseTime: string = '19:00'
): DaySchedule[] {
  const overridesMap = new Map(
    overrides.map(o => [o.date, o])
  );
  
  const schedule: DaySchedule[] = [];
  
  // Générer 7 jours à partir de startDate
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const dateString = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const isDefaultClosed = dayOfWeek === 0 || dayOfWeek === 1;
    const override = overridesMap.get(dateString) || null;
    
    // Calculer les valeurs finales
    let isClosed: boolean;
    let openTime: string | null;
    let closeTime: string | null;
    let reason: string | null = null;
    
    if (override) {
      isClosed = override.is_closed;
      openTime = override.open_time || (isClosed ? null : defaultOpenTime);
      closeTime = override.close_time || (isClosed ? null : defaultCloseTime);
      reason = override.reason;
    } else {
      isClosed = isDefaultClosed;
      openTime = isClosed ? null : defaultOpenTime;
      closeTime = isClosed ? null : defaultCloseTime;
    }
    
    schedule.push({
      date: dateString,
      dayName: format(date, 'EEEE', { locale: fr }),
      dayNumber: date.getDate(),
      isDefaultClosed,
      override,
      isClosed,
      openTime,
      closeTime,
      reason,
    });
  }
  
  return schedule;
}

/**
 * Obtient le lundi de la semaine d'une date donnée
 * @param date - Date de référence
 * @returns Date du lundi de cette semaine
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Si dimanche, reculer de 6 jours
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Génère un numéro de commande unique
 * Format: YYYYMMDDLXXX
 * - YYYY: année
 * - MM: mois
 * - DD: jour
 * - L: première lettre du nom du client
 * - XXX: incrément sur 3 chiffres (001, 002, etc.)
 * 
 * @param customerName - Nom du client
 * @param dailyIncrement - Numéro d'ordre du jour
 * @returns Numéro de commande formaté
 */
export function generateOrderNumber(
  customerName: string,
  dailyIncrement: number
): string {
  const now = new Date();
  const year = format(now, 'yyyy');
  const month = format(now, 'MM');
  const day = format(now, 'dd');
  const firstLetter = customerName.charAt(0).toUpperCase();
  const increment = dailyIncrement.toString().padStart(3, '0');
  
  return `${year}${month}${day}${firstLetter}${increment}`;
}

/**
 * Obtient l'incrément quotidien pour une nouvelle commande
 * @param createdDate - Date de création de la commande
 * @param supabase - Client Supabase
 * @returns Prochain numéro d'incrément
 */
export async function getDailyIncrement(createdDate: string): Promise<number> {
  // Cette fonction sera implémentée côté serveur
  // pour interroger la BDD et obtenir le prochain incrément
  return 1;
}

/**
 * Formate un prix en euros
 * @param price - Prix à formater
 * @returns Prix formaté (ex: "12,50 €")
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

/**
 * Formate une date en français
 * @param date - Date à formater
 * @param formatStr - Format souhaité
 * @returns Date formatée
 */
export function formatDate(date: Date | string, formatStr: string = 'PPP'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: fr });
}

/**
 * Vérifie si une date est un jour de fermeture
 * @param date - Date à vérifier
 * @returns true si la boutique est fermée ce jour
 */
export function isClosedDay(date: Date): boolean {
  const day = date.getDay();
  // 0 = Dimanche, 1 = Lundi
  return day === 0 || day === 1;
}

/**
 * Obtient le nom du jour en français
 * @param date - Date
 * @returns Nom du jour (ex: "lundi")
 */
export function getDayName(date: Date): string {
  return format(date, 'EEEE', { locale: fr });
}

/**
 * Obtient la clé de paramètre pour un jour spécifique
 * @param dayIndex - Index du jour (0 = dimanche, 1 = lundi, etc.)
 * @param suffix - Suffixe ("closed", "open", "close")
 * @returns Clé du paramètre (ex: "monday_closed")
 */
export function getDaySettingKey(dayIndex: number, suffix: 'closed' | 'open' | 'close'): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return `${days[dayIndex]}_${suffix}`;
}

/**
 * Valide un numéro de téléphone français
 * @param phone - Numéro de téléphone
 * @returns true si valide
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Format français: 06 12 34 56 78 ou 0612345678
  const cleanPhone = phone.replace(/\s/g, '');
  return /^0[1-9]\d{8}$/.test(cleanPhone);
}

/**
 * Calcule le total TTC d'une commande
 * @param items - Lignes de commande
 * @returns Total TTC
 */
export function calculateOrderTotal(items: Array<{ quantity: number; unit_price_ttc: number }>): number {
  return items.reduce((total, item) => total + (item.quantity * item.unit_price_ttc), 0);
}

/**
 * Groupe les lignes de commande par produit pour le rapport de production
 * @param items - Lignes de commande
 * @returns Produits agrégés
 */
export function aggregateProductionItems(
  items: Array<{ product_name: string; quantity: number; unit: string }>
): Array<{ product_name: string; total_quantity: number; unit: string }> {
  const aggregated = new Map<string, { total_quantity: number; unit: string }>();
  
  items.forEach(item => {
    const existing = aggregated.get(item.product_name);
    if (existing) {
      existing.total_quantity += item.quantity;
    } else {
      aggregated.set(item.product_name, {
        total_quantity: item.quantity,
        unit: item.unit,
      });
    }
  });
  
  return Array.from(aggregated.entries()).map(([product_name, data]) => ({
    product_name,
    ...data,
  }));
}
