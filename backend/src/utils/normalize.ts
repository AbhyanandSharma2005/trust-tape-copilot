// backend/src/utils/normalize.ts

export const parseNumber = (val: string | undefined): number | null => {
  if (!val || val.trim() === '') return null;
  const parsed = Number(val);
  return isNaN(parsed) ? null : parsed;
};

export const parseDate = (val: string | undefined): Date | null => {
  if (!val || val.trim() === '') return null;
  const parsed = new Date(val);
  // Check if it's a valid date (e.g., catching "13/45/2024")
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const parseString = (val: string | undefined): string | null => {
  if (!val || val.trim() === '') return null;
  return val.trim();
};