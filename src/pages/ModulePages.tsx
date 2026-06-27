/**
 * Module pages — Lazy-loaded for code splitting (Sprint 6).
 * Each module is loaded on demand to reduce initial bundle size.
 */
import { lazy } from 'react';

// Sprint 3 — Inventory, Shopping, Incidents
export const InventoryPage = lazy(() => import('@/modules/inventory/InventoryPage'));
export const ShoppingPage = lazy(() => import('@/modules/shopping/ShoppingPage'));
export const IncidentsPage = lazy(() => import('@/modules/incidents/IncidentsPage'));

// Sprint 4 — Finance, Calories
export const FinancePage = lazy(() => import('@/modules/finance/FinancePage'));
export const CaloriesPage = lazy(() => import('@/modules/calories/CaloriesPage'));

// Sprint 5 — Calendar, Body, Smoking, Goals
export const CalendarPage = lazy(() => import('@/modules/calendar/CalendarPage'));
export const BodyPage = lazy(() => import('@/modules/body/BodyPage'));
export const SmokingPage = lazy(() => import('@/modules/smoking/SmokingPage'));
export const GoalsPage = lazy(() => import('@/modules/goals/GoalsPage'));
