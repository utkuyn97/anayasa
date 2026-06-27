/**
 * incidents.types.ts — TypeScript types for incidents module.
 * Matches schema.sql → incidents table.
 */

export type IncidentCategory = 'mutfak' | 'banyo' | 'salon' | 'yatak' | 'genel' | 'diger';
export type IncidentSeverity = 'info' | 'warn' | 'crit';

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  category: IncidentCategory;
  severity: IncidentSeverity;
  photo_path: string | null;
  reported_by: string;
  reported_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface IncidentFormData {
  title: string;
  description: string | null;
  category: IncidentCategory;
  severity: IncidentSeverity;
  photo?: File | null;
}
