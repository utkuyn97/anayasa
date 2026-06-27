/**
 * body.types.ts — TypeScript types for the Body (weight/measurement) module.
 * Matches schema.sql §5.2.
 */

/** Body measurement record. */
export interface BodyMeasurement {
  id: string;
  owner_id: string;
  measured_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  hip_cm: number | null;
  note: string | null;
  created_at: string;
}

/** Form data for creating a measurement. */
export interface BodyMeasurementFormData {
  measured_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  hip_cm: number | null;
  note: string;
}
