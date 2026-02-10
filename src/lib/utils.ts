import { type ClassValue, clsx } from 'clsx';

// Simple cn utility (without tailwind-merge for portability)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format CHF currency
export function formatCHF(amount: number): string {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(amount);
}

// Format date in Swiss French
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

// Format relative date
export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff === -1) return 'Demain';
  if (diff < 0) return `Dans ${Math.abs(diff)} jours`;
  if (diff < 7) return `Il y a ${diff} jours`;
  return formatDate(date);
}

// Night count
export function getNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// Status labels in French
export const bookingStatusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  checked_in: 'En cours',
  checked_out: 'Terminée',
  cancelled: 'Annulée',
};

export const cleaningStatusLabels: Record<string, string> = {
  pending: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
  validated: 'Validé',
  issue: 'Problème',
};

export const invoiceStatusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  paid: 'Payée',
};

export const platformLabels: Record<string, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  direct: 'Direct',
  other: 'Autre',
};

export const propertyTypeLabels: Record<string, string> = {
  apartment: 'Appartement',
  house: 'Maison',
  studio: 'Studio',
  chalet: 'Chalet',
  villa: 'Villa',
};

export const accessTypeLabels: Record<string, string> = {
  code: 'Code',
  key: 'Clé',
  lockbox: 'Boîte à clés',
  smartlock: 'Serrure connectée',
};

export const cantonsList = [
  'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR',
  'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG',
  'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH',
];

// Default cleaning checklist
export const defaultChecklist = [
  { id: '1', label: 'Aspirateur / balai', checked: false },
  { id: '2', label: 'Nettoyage sols', checked: false },
  { id: '3', label: 'Salle de bain', checked: false },
  { id: '4', label: 'Cuisine', checked: false },
  { id: '5', label: 'Changement draps', checked: false },
  { id: '6', label: 'Serviettes propres', checked: false },
  { id: '7', label: 'Poubelles vidées', checked: false },
  { id: '8', label: 'Produits accueil', checked: false },
  { id: '9', label: 'Vérification équipements', checked: false },
  { id: '10', label: 'Photos prises', checked: false },
];
