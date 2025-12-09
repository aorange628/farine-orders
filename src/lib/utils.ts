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
```

## Explication de la nouvelle logique

**Exemple concret :**

**20 décembre, 14h (après-midi) :**
```
Pain après-midi = J+4
Calcul normal : 
- Point départ = 20 déc
- +4 jours ouvrables = 26 décembre

24 décembre a cutoff_date = 21 décembre
On est le 20 déc < 21 déc → Le 24 est DISPONIBLE !

Résultat : Date minimum = 24 décembre (grâce à l'extension)
```

**22 décembre, 10h :**
```
24 décembre a cutoff_date = 21 décembre
On est le 22 déc > 21 déc → Le 24 n'est PLUS disponible

Résultat : Date minimum = 27 décembre (calcul normal)
