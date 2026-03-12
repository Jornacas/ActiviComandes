import {
  CheckCircle,
  HourglassEmpty,
  LocalShipping,
  Pending,
  Person,
} from '@mui/icons-material';
import React from 'react';

// --- Text formatting ---

export const formatSentenceCase = (text: string | null | undefined): string => {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (trimmed.length === 0) return '';
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

// --- Date formatting ---

// Función para formatear fecha a DD/MM/YYYY
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Si no es una fecha válida, devolver original

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString; // Si hay error, devolver original
  }
};

// Función para formatear fecha en formato catalán "dijous 23 octubre"
export const formatDateCatalan = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';

  try {
    let date: Date;

    // Si es una fecha ISO con Z (UTC), extraer solo la parte de fecha
    if (dateString.includes('T') && dateString.includes('Z')) {
      const dateOnly = dateString.split('T')[0]; // "2025-10-01"
      const [year, month, day] = dateOnly.split('-');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Si es formato DD/MM/YYYY (formato europeo del Google Sheet)
    else if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Meses en JS son 0-indexed
        const year = parseInt(parts[2]);
        date = new Date(year, month, day);
      } else {
        date = new Date(dateString);
      }
    }
    // Para fechas normales (ISO 8601 sin Z)
    else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) return dateString; // Si no es válida, devolver original

    const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
    const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

    return `${days[date.getDay()]} ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]}`;
  } catch (error) {
    return dateString; // Si hay error, devolver original
  }
};

// --- Date calculation ---

// Helper: Calculate next occurrence of a weekday from a base date
export const getNextDateForWeekday = (baseDate: string, weekdayName: string): string => {
  if (!baseDate || !weekdayName) return baseDate;

  const weekdayMap: { [key: string]: number } = {
    'dilluns': 1, 'dimarts': 2, 'dimecres': 3, 'dijous': 4,
    'divendres': 5, 'dissabte': 6, 'diumenge': 0
  };

  const targetDay = weekdayMap[weekdayName.toLowerCase()];
  if (targetDay === undefined) return baseDate;

  const base = new Date(baseDate);
  const currentDay = base.getDay();

  // Calculate days to add (0 if same day, positive otherwise)
  let daysToAdd = targetDay - currentDay;
  if (daysToAdd < 0) daysToAdd += 7; // Next week if target day already passed
  if (daysToAdd === 0) daysToAdd = 0; // Same day

  const resultDate = new Date(base);
  resultDate.setDate(base.getDate() + daysToAdd);

  return resultDate.toISOString().split('T')[0];
};

// --- Status display ---

export const statusColors: Record<string, string> = {
  'Pendent': 'default',
  'En proces': 'warning',
  'Preparat': 'info',
  'Lliurat': 'success',
  // Legacy estados (por compatibilidad)
  'Entregat': 'success',
  'Assignat': 'secondary',
  'Pendiente': 'default',
  'En proceso': 'warning',
  'Preparado': 'info',
  'Asignado': 'secondary',
  'Entregado': 'success',
  '': 'default',
};

export const statusIcons: Record<string, React.ReactElement> = {
  'Pendent': React.createElement(Pending),
  'En proces': React.createElement(HourglassEmpty),
  'Preparat': React.createElement(CheckCircle),
  'Lliurat': React.createElement(LocalShipping),
  // Legacy estados (por compatibilidad)
  'Entregat': React.createElement(LocalShipping),
  'Assignat': React.createElement(Person),
  'Pendiente': React.createElement(Pending),
  'En proceso': React.createElement(HourglassEmpty),
  'Preparado': React.createElement(CheckCircle),
  'Entregado': React.createElement(LocalShipping),
  '': React.createElement(Pending),
};
