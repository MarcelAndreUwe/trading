/**
 * Tax-Drag Modul
 * Erweiterte Visualisierung und Analyse der Steuerbelastung
 */
import { calculateTaxDragCurve, calculateBreakEvenSellPrice } from '../tax-engine.js';

/**
 * Findet die "Tote Zone" - den Bereich wo Bruttogewinn positiv
 * aber Nettogewinn negativ ist (durch Gebuehren).
 */
export function findDeadZone(curve) {
  const deadZone = curve.filter(p => p.isDeadZone);
  if (deadZone.length === 0) return null;

  return {
    from: deadZone[0].sellPrice,
    to: deadZone[deadZone.length - 1].sellPrice,
    maxTaxDragPercent: Math.max(...deadZone.map(p => p.taxDragPercent))
  };
}

/**
 * Findet den Punkt, an dem der Freibetrag aufgebraucht ist.
 */
export function findFreistellungThreshold(curve) {
  for (let i = 0; i < curve.length; i++) {
    if (curve[i].freistellungUsed > 0 && i > 0 && curve[i - 1].freistellungUsed === 0) {
      return curve[i].sellPrice;
    }
  }
  return null;
}

/**
 * Berechnet den Tax-Drag bei verschiedenen Gewinnszenarien.
 */
export function getTaxDragSummary(curve, currentPrice) {
  const atCurrent = curve.find(p => Math.abs(p.sellPrice - currentPrice) < 0.02);
  const scenarios = [
    { label: '+5%', point: curve.find(p => p.grossProfit > 0 && Math.abs(p.sellPrice / curve[0]?.sellPrice - 1.05) < 0.02) },
    { label: '+10%', point: curve.find(p => p.grossProfit > 0 && Math.abs(p.sellPrice / curve[0]?.sellPrice - 1.1) < 0.02) },
    { label: '+20%', point: curve.find(p => p.grossProfit > 0 && Math.abs(p.sellPrice / curve[0]?.sellPrice - 1.2) < 0.02) },
    { label: '+50%', point: curve.find(p => p.grossProfit > 0 && Math.abs(p.sellPrice / curve[0]?.sellPrice - 1.5) < 0.02) },
  ].filter(s => s.point);

  return {
    atCurrent: atCurrent ? {
      taxDragPercent: atCurrent.taxDragPercent,
      totalTax: atCurrent.totalTax,
      netProfit: atCurrent.netProfit
    } : null,
    scenarios
  };
}
