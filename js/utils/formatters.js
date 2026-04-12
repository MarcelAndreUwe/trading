/**
 * Formatierungsfunktionen fürdeutsche Währungs- und Zahlenformate
 */

const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const eurCompactFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/** Formatiert als EUR Waehrung: "1.234,56 EUR" */
export function formatEur(value) {
  if (value == null || isNaN(value)) return '-- EUR';
  return eurFormatter.format(value);
}

/** Formatiert als EUR ohne Nachkommastellen: "1.235 EUR" */
export function formatEurCompact(value) {
  if (value == null || isNaN(value)) return '-- EUR';
  return eurCompactFormatter.format(value);
}

/** Formatiert als Prozentzahl: "26,38 %" */
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '-- %';
  return percentFormatter.format(value / 100);
}

/** Formatiert als Dezimalzahl: "1.234,56" */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return '--';
  return numberFormatter.format(value);
}

/** Formatiert als Ganzzahl: "1.234" */
export function formatInt(value) {
  if (value == null || isNaN(value)) return '--';
  return Math.round(value).toLocaleString('de-DE');
}

/** Gibt +/- Vorzeichen zurück */
export function formatSign(value) {
  if (value == null || isNaN(value)) return '';
  return value >= 0 ? '+' : '';
}

/** Formatiert EUR mit Vorzeichen: "+1.234,56 EUR" oder "-1.234,56 EUR" */
export function formatEurSigned(value) {
  if (value == null || isNaN(value)) return '-- EUR';
  return formatSign(value) + eurFormatter.format(value);
}

/** Formatiert Prozent mit Vorzeichen: "+26,38 %" */
export function formatPercentSigned(value) {
  if (value == null || isNaN(value)) return '-- %';
  return formatSign(value) + percentFormatter.format(value / 100);
}

/** Gibt die CSS-Klasse fürpositiv/negativ/neutral zurück */
export function profitColorClass(value) {
  if (value == null || isNaN(value) || value === 0) return 'text-slate-400';
  return value > 0 ? 'text-green-500' : 'text-red-500';
}

/** Gibt die CSS-Klasse fürden Hintergrund zurück */
export function profitBgClass(value) {
  if (value == null || isNaN(value) || value === 0) return 'bg-slate-700';
  return value > 0 ? 'bg-green-500/10' : 'bg-red-500/10';
}
