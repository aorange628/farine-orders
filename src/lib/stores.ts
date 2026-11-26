// Boutiques de retrait FARINE
// Pour ajouter une boutique : ajouter une entrée ici ET mettre à jour
// la contrainte CHECK de la colonne orders.pickup_location dans Supabase.

export type PickupLocation = 'pre' | 'lilas';

export interface Store {
  id: PickupLocation;
  name: string;        // Nom affiché au client
  shortName: string;   // Nom court (back office, badges)
  address: string;
  city: string;
  phone: string;       // Téléphone affiché au client
  badgeClass: string;  // Couleur du badge dans le back office
}

export const STORES: Store[] = [
  {
    id: 'pre',
    name: 'FARINE – Le Pré Saint-Gervais',
    shortName: 'Pré',
    address: '37 rue de Stalingrad',
    city: '93310 Le Pré Saint-Gervais',
    phone: '09 73 88 95 53',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300',
  },
  {
    id: 'lilas',
    name: 'FARINE – Les Lilas',
    shortName: 'Lilas',
    address: '7 boulevard de la Liberté',
    city: '93260 Les Lilas',
    phone: '01 86 04 38 17',
    badgeClass: 'bg-violet-100 text-violet-800 border border-violet-300',
  },
];

export function getStore(id: string | null | undefined): Store | undefined {
  return STORES.find((s) => s.id === id);
}

export function isValidPickupLocation(id: unknown): id is PickupLocation {
  return typeof id === 'string' && STORES.some((s) => s.id === id);
}
