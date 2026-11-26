import { format } from 'date-fns';
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

/** Heure limite de commande : avant, retrait possible dès le prochain jour ouvré ; après, à partir du 2e */
export const ORDER_CUTOFF_HOUR = 11;

/**
 * Vérifie si une date peut être sélectionnée comme date d'enlèvement.
 * Règle : identique pour tous les produits.
 * - le jour doit être ouvert
 * - le jour doit être >= baseMinDate (J+1 ou J+2 ouvré selon l'heure de commande)
 * - si une date limite de commande (cutoff_date) est définie pour ce jour
 *   dans le calendrier admin, on ne peut plus commander après cette date (23h59)
 * @param date - Date candidate
 * @param overrides - Map des overrides
 * @param baseMinDate - Premier jour de retrait possible
 * @returns true si la date est sélectionnable
 */
export function isDateSelectableForPickup(
  date: Date,
  overrides: Map<string, CalendarOverride>,
  baseMinDate: Date
): boolean {
  if (isClosedDate(date, overrides)) {
    return false;
  }

  if (date < baseMinDate) {
    return false;
  }

  const override = overrides.get(format(date, 'yyyy-MM-dd'));
  if (override && override.cutoff_date) {
    const cutoff = new Date(override.cutoff_date + 'T23:59:59');
    if (new Date() > cutoff) {
      return false; // Date limite de commande dépassée
    }
  }

  return true;
}

/**
 * Calcule la date d'enlèvement la plus proche.
 * Règle unique pour tous les produits, en jours ouvrés (jours d'ouverture) :
 * - commande avant 11h : retrait possible dès le prochain jour ouvré (J+1)
 * - commande à partir de 11h : retrait possible à partir du 2e jour ouvré (J+2)
 * - commande passée un jour de fermeture (dimanche, lundi, fermeture du
 *   calendrier), quelle que soit l'heure : comme après 11h (J+2 ouvré)
 *   → du samedi 11h au mardi 11h, retrait possible à partir du mercredi
 * Les jours fermés ne comptent pas dans les jours ouvrés.
 * @param overrides - Map des overrides indexés par date YYYY-MM-DD
 * @returns Date minimum d'enlèvement (à minuit)
 */
export function calculateEarliestPickupDate(
  overrides: Map<string, CalendarOverride> = new Map()
): Date {
  const now = new Date();
  const todayIsClosed = isClosedDate(now, overrides);
  const openDaysToAdd = !todayIsClosed && now.getHours() < ORDER_CUTOFF_HOUR ? 1 : 2;

  // Avancer de N jours ouvrés à partir d'aujourd'hui
  const baseMinDate = new Date(now);
  baseMinDate.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < openDaysToAdd) {
    baseMinDate.setDate(baseMinDate.getDate() + 1);
    if (!isClosedDate(baseMinDate, overrides)) {
      added++;
    }
  }

  // Premier jour sélectionnable (ouvert, date limite non dépassée), 60 jours max
  const candidateDate = new Date(baseMinDate);
  for (let i = 0; i < 60; i++) {
    if (isDateSelectableForPickup(candidateDate, overrides, baseMinDate)) {
      return candidateDate;
    }
    candidateDate.setDate(candidateDate.getDate() + 1);
  }

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
 * Convertit un nombre en base 36 (0-9, A-Z)
 * @param num - Nombre à convertir (1-1295)
 * @returns Chaîne en base 36 sur 2 caractères
 * 
 * Exemples:
 * - 1 → "01"
 * - 10 → "0A"
 * - 35 → "0Z"
 * - 36 → "10"
 * - 1295 → "ZZ"
 */
function toBase36(num: number): string {
  return num.toString(36).toUpperCase().padStart(2, '0');
}

/**
 * Génère un numéro de commande unique
 * Format: JJMMAALXX
 * - JJ: jour (2 chiffres)
 * - MM: mois (2 chiffres)
 * - AA: année (2 derniers chiffres)
 * - L: première lettre du nom du client
 * - XX: incrément en base 36 (00-ZZ = 1296 possibilités)
 * 
 * Exemples:
 * - 101225R01 : 1ère commande du 10/12/2025 pour un nom en R
 * - 101225R0A : 10ème commande du 10/12/2025 pour un nom en R
 * - 101225RZZ : 1295ème commande du 10/12/2025 pour un nom en R
 * 
 * @param customerName - Nom du client
 * @param dailyIncrement - Numéro d'ordre du jour (1-1295)
 * @returns Numéro de commande formaté
 */
export function generateOrderNumber(
  customerName: string,
  dailyIncrement: number
): string {
  const now = new Date();
  const day = format(now, 'dd');
  const month = format(now, 'MM');
  const year = format(now, 'yy'); // 2 chiffres seulement
  const firstLetter = customerName.charAt(0).toUpperCase();
  const increment = toBase36(dailyIncrement);
  
  // Vérification sécurité : max 1295 (ZZ en base 36)
  if (dailyIncrement > 1295) {
    throw new Error(`Limite de commandes atteinte pour aujourd'hui (max: 1295)`);
  }
  
  return `${day}${month}${year}${firstLetter}${increment}`;
}

/**
 * Extrait l'incrément d'un numéro de commande en base 36
 * @param orderNumber - Numéro de commande (ex: "101225R0A")
 * @returns Incrément décimal (ex: 10)
 * 
 * Exemples:
 * - "101225R01" → 1
 * - "101225R0A" → 10
 * - "101225RZZ" → 1295
 */
export function parseOrderIncrement(orderNumber: string): number {
  // Les 2 derniers caractères sont l'incrément en base 36
  const incrementStr = orderNumber.slice(-2);
  return parseInt(incrementStr, 36);
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
