import type { Category } from '../types/transaction';

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: 'income_su_grant', name: 'Claimed SU grant', type: 'INCOME', color: '#38A169' },
  { id: 'income_membership', name: 'Membership fees', type: 'INCOME', color: '#2F855A' },
  { id: 'income_transport', name: 'Transport charges', type: 'INCOME', color: '#276749' },
  { id: 'income_events', name: 'Event charges', type: 'INCOME', color: '#22543D' },
  { id: 'income_fundraising', name: 'Fundraising', type: 'INCOME', color: '#1C4532' },
  { id: 'income_sponsorship', name: 'Sponsorship', type: 'INCOME', color: '#2C7A7B' },
  { id: 'income_donations', name: 'Donations', type: 'INCOME', color: '#285E61' },
  { id: 'income_kickback', name: 'Kickback', type: 'INCOME', color: '#234E52' },
  { id: 'income_social', name: 'Social events', type: 'INCOME', color: '#1D4044' },
  { id: 'income_awards', name: 'Awards', type: 'INCOME', color: '#154C4C' },
  { id: 'income_misc', name: 'Miscellaneous', type: 'INCOME', color: '#0F3C3C' },
  { id: 'income_tests', name: 'Tests', type: 'INCOME', color: '#0B3030' },
];

export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: 'expense_affiliation', name: 'Affiliation fees', type: 'EXPENSE', color: '#E53E3E' },
  { id: 'expense_tests', name: 'Tests', type: 'EXPENSE', color: '#C53030' },
  { id: 'expense_coaching', name: 'Coaching', type: 'EXPENSE', color: '#9B2C2C' },
  { id: 'expense_match', name: 'Match Costs', type: 'EXPENSE', color: '#822727' },
  { id: 'expense_facilities', name: 'Facilities', type: 'EXPENSE', color: '#63171B' },
  { id: 'expense_safety', name: 'Safety fees', type: 'EXPENSE', color: '#E53E3E' },
  { id: 'expense_training_equipment', name: 'Training Equipment', type: 'EXPENSE', color: '#C53030' },
  { id: 'expense_playing_equipment', name: 'Playing Equipment', type: 'EXPENSE', color: '#9B2C2C' },
  { id: 'expense_kit', name: 'Kit', type: 'EXPENSE', color: '#822727' },
  { id: 'expense_transport_hire', name: 'Transport hire', type: 'EXPENSE', color: '#63171B' },
  { id: 'expense_transport_fuel', name: 'Transport fuel', type: 'EXPENSE', color: '#E53E3E' },
  { id: 'expense_accommodation', name: 'Accommodation', type: 'EXPENSE', color: '#C53030' },
  { id: 'expense_events', name: 'Events', type: 'EXPENSE', color: '#9B2C2C' },
  { id: 'expense_social', name: 'Social events', type: 'EXPENSE', color: '#822727' },
  { id: 'expense_loans', name: 'Loans and outstanding debt', type: 'EXPENSE', color: '#63171B' },
  { id: 'expense_ers', name: 'ERS', type: 'EXPENSE', color: '#E53E3E' },
  { id: 'expense_advertising', name: 'Advertising and promotion', type: 'EXPENSE', color: '#C53030' },
  { id: 'expense_misc', name: 'Miscellaneous', type: 'EXPENSE', color: '#9B2C2C' },
];

export const getAllDefaultCategories = (): Category[] => [
  ...DEFAULT_INCOME_CATEGORIES,
  ...DEFAULT_EXPENSE_CATEGORIES,
];

export const ensureDefaultCategories = (existingCategories: Category[]): Category[] => {
  const defaultCategories = getAllDefaultCategories();
  const existingIds = new Set(existingCategories.map(c => c.id));
  
  // Add any missing default categories
  const missingDefaults = defaultCategories.filter(c => !existingIds.has(c.id));
  
  return [...existingCategories, ...missingDefaults];
}; 