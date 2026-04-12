/**
 * Trading Cockpit - Deutsche Steuer-Engine
 * Alle Berechnungen für Abgeltungssteuer, Soli, Kirchensteuer
 * Reine Funktionen ohne Seiteneffekte
 */

// Kirchensteuer-Sätze nach Bundesland
export const KIRCHENSTEUER_RATES = {
  'bayern': 0.08,
  'baden-wuerttemberg': 0.08,
  'default': 0.09
};

export const BUNDESLAENDER = [
  { id: 'keine', label: 'Keine Kirchensteuer', rate: 0 },
  { id: 'bayern', label: 'Bayern (8%)', rate: 0.08 },
  { id: 'baden-wuerttemberg', label: 'Baden-Württemberg (8%)', rate: 0.08 },
  { id: 'berlin', label: 'Berlin (9%)', rate: 0.09 },
  { id: 'brandenburg', label: 'Brandenburg (9%)', rate: 0.09 },
  { id: 'bremen', label: 'Bremen (9%)', rate: 0.09 },
  { id: 'hamburg', label: 'Hamburg (9%)', rate: 0.09 },
  { id: 'hessen', label: 'Hessen (9%)', rate: 0.09 },
  { id: 'mecklenburg-vorpommern', label: 'Mecklenburg-Vorpommern (9%)', rate: 0.09 },
  { id: 'niedersachsen', label: 'Niedersachsen (9%)', rate: 0.09 },
  { id: 'nordrhein-westfalen', label: 'Nordrhein-Westfalen (9%)', rate: 0.09 },
  { id: 'rheinland-pfalz', label: 'Rheinland-Pfalz (9%)', rate: 0.09 },
  { id: 'saarland', label: 'Saarland (9%)', rate: 0.09 },
  { id: 'sachsen', label: 'Sachsen (9%)', rate: 0.09 },
  { id: 'sachsen-anhalt', label: 'Sachsen-Anhalt (9%)', rate: 0.09 },
  { id: 'schleswig-holstein', label: 'Schleswig-Holstein (9%)', rate: 0.09 },
  { id: 'thueringen', label: 'Thüringen (9%)', rate: 0.09 }
];

/**
 * Berechnet den reduzierten Abgeltungssteuersatz bei Kirchensteuer.
 * Formel: 25 / (1 + kistRate * 0.25)
 * Ohne KiSt: 25%
 * Mit 8% KiSt: 24.5098%
 * Mit 9% KiSt: 24.4499%
 */
export function getReducedAbgstRate(kirchensteuerRate = 0) {
  if (kirchensteuerRate <= 0) return 0.25;
  return 0.25 / (1 + kirchensteuerRate * 0.25);
}

/**
 * Berechnet den effektiven Gesamtsteuersatz (AbgSt + Soli + KiSt).
 * Ohne KiSt: 26.375%
 * Mit 8% KiSt (BY/BW): 27.8186%
 * Mit 9% KiSt (andere): 27.9951%
 */
export function getEffectiveTaxRate(kirchensteuerRate = 0) {
  const abgstRate = getReducedAbgstRate(kirchensteuerRate);
  const soliRate = abgstRate * 0.055;
  const kistRate = abgstRate * kirchensteuerRate;
  return abgstRate + soliRate + kistRate;
}

/**
 * Berechnet die Steuer auf einen Kapitalertrag.
 * Berücksichtigt den Sparerpauschbetrag (Freistellungsauftrag).
 *
 * @param {number} grossGain - Bruttogewinn in EUR
 * @param {number} freistellungRemaining - Verbleibender Freibetrag in EUR
 * @param {number} kirchensteuerRate - KiSt-Satz (0, 0.08 oder 0.09)
 * @returns {Object} Steuer-Aufschlüsselung
 */
export function calculateTax(grossGain, freistellungRemaining = 0, kirchensteuerRate = 0) {
  // Kein Gewinn oder Verlust = keine Steuer
  if (grossGain <= 0) {
    return {
      grossGain,
      freistellungUsed: 0,
      taxableGain: 0,
      abgeltungssteuer: 0,
      solidaritaetszuschlag: 0,
      kirchensteuer: 0,
      totalTax: 0,
      netGain: grossGain, // Verlust bleibt Verlust
      effectiveRate: 0
    };
  }

  const freistellungUsed = Math.min(grossGain, Math.max(0, freistellungRemaining));
  const taxableGain = Math.max(0, grossGain - freistellungUsed);

  if (taxableGain <= 0) {
    return {
      grossGain,
      freistellungUsed,
      taxableGain: 0,
      abgeltungssteuer: 0,
      solidaritaetszuschlag: 0,
      kirchensteuer: 0,
      totalTax: 0,
      netGain: grossGain,
      effectiveRate: 0
    };
  }

  const abgstRate = getReducedAbgstRate(kirchensteuerRate);
  const abgeltungssteuer = roundCents(taxableGain * abgstRate);
  const solidaritaetszuschlag = roundCents(abgeltungssteuer * 0.055);
  const kirchensteuer = roundCents(abgeltungssteuer * kirchensteuerRate);
  const totalTax = roundCents(abgeltungssteuer + solidaritaetszuschlag + kirchensteuer);
  const netGain = roundCents(grossGain - totalTax);
  const effectiveRate = grossGain > 0 ? totalTax / grossGain : 0;

  return {
    grossGain,
    freistellungUsed,
    taxableGain,
    abgeltungssteuer,
    solidaritaetszuschlag,
    kirchensteuer,
    totalTax,
    netGain,
    effectiveRate
  };
}

/**
 * Berechnet den vollständigen Verkaufs-P&L inkl. Gebühren.
 *
 * @param {number} buyPrice - Kaufkurs pro Aktie
 * @param {number} sellPrice - Verkaufskurs pro Aktie
 * @param {number} shares - Anzahl Aktien
 * @param {number} buyFee - Kaufgebühr gesamt
 * @param {number} sellFee - Verkaufsgebühr gesamt
 * @param {number} freistellungRemaining - Verbleibender Freibetrag
 * @param {number} kirchensteuerRate - KiSt-Satz
 * @returns {Object} Vollständige P&L Aufschlüsselung
 */
export function calculateNetProfit(buyPrice, sellPrice, shares, buyFee = 1, sellFee = 1, freistellungRemaining = 0, kirchensteuerRate = 0) {
  const grossRevenue = roundCents(shares * sellPrice);
  const totalCost = roundCents(shares * buyPrice + buyFee);
  const grossGain = roundCents(grossRevenue - totalCost - sellFee);

  const tax = calculateTax(grossGain, freistellungRemaining, kirchensteuerRate);
  const netProfit = roundCents(grossGain - tax.totalTax);
  const totalNetRevenue = roundCents(grossRevenue - sellFee - tax.totalTax);

  return {
    grossRevenue,
    totalCost,
    grossGain,
    ...tax,
    netProfit,
    totalNetRevenue,
    profitPerShare: shares > 0 ? roundCents(netProfit / shares) : 0,
    returnPercent: totalCost > 0 ? (netProfit / totalCost) * 100 : 0
  };
}

/**
 * Berechnet den Break-Even Rebuy-Kurs.
 * Der Kurs, auf den die Aktie fallen muss, damit man nach Verkauf + Steuern
 * dieselbe Anzahl Aktien zurückkaufen kann.
 *
 * @param {number} buyPrice - Ursprünglicher Kaufkurs
 * @param {number} sellPrice - Geplanter Verkaufskurs
 * @param {number} shares - Anzahl Aktien
 * @param {number} sellFee - Verkaufsgebühr
 * @param {number} rebuyFee - Rückkaufgebühr
 * @param {number} freistellungRemaining - Verbleibender Freibetrag
 * @param {number} kirchensteuerRate - KiSt-Satz
 * @returns {Object} Break-Even Analyse
 */
export function calculateBreakEvenRebuy(buyPrice, sellPrice, shares, sellFee = 1, rebuyFee = 1, freistellungRemaining = 0, kirchensteuerRate = 0) {
  const pnl = calculateNetProfit(buyPrice, sellPrice, shares, 0, sellFee, freistellungRemaining, kirchensteuerRate);
  const netProceeds = pnl.totalNetRevenue;
  const availableForRebuy = roundCents(netProceeds - rebuyFee);
  const breakEvenRebuyPrice = shares > 0 ? roundCents(availableForRebuy / shares) : 0;
  const requiredDropFromSell = sellPrice > 0 ? ((sellPrice - breakEvenRebuyPrice) / sellPrice) * 100 : 0;
  const requiredDropFromCurrent = sellPrice > 0 ? ((sellPrice - breakEvenRebuyPrice) / sellPrice) * 100 : 0;
  const maxRebuyableShares = breakEvenRebuyPrice > 0 ? Math.floor(availableForRebuy / breakEvenRebuyPrice) : 0;

  return {
    sellPrice,
    netProceeds,
    availableForRebuy,
    breakEvenRebuyPrice,
    requiredDropPercent: requiredDropFromSell,
    requiredDropEur: roundCents(sellPrice - breakEvenRebuyPrice),
    maxRebuyableShares,
    isWorthIt: breakEvenRebuyPrice < sellPrice && breakEvenRebuyPrice > 0,
    pnl
  };
}

/**
 * Berechnet den benötigten Verkaufskurs für einen Wunsch-Nettoprofit.
 *
 * @param {number} buyPrice - Kaufkurs pro Aktie
 * @param {number} shares - Anzahl Aktien
 * @param {number} desiredNetProfit - Gewünschter Nettoprofit in EUR
 * @param {number} buyFee - Kaufgebühr
 * @param {number} sellFee - Verkaufsgebühr
 * @param {number} freistellungRemaining - Verbleibender Freibetrag
 * @param {number} kirchensteuerRate - KiSt-Satz
 * @returns {Object} Zielkurs-Berechnung
 */
export function calculateTargetSellPrice(buyPrice, shares, desiredNetProfit, buyFee = 1, sellFee = 1, freistellungRemaining = 0, kirchensteuerRate = 0) {
  if (shares <= 0 || desiredNetProfit < 0) {
    return { targetSellPrice: 0, requiredGainPercent: 0, valid: false };
  }

  const totalCost = shares * buyPrice + buyFee;
  const effectiveRate = getEffectiveTaxRate(kirchensteuerRate);
  const frei = Math.max(0, freistellungRemaining);

  let requiredGrossGain;

  // Wenn der gewünschte Nettoprofit + Gebühren innerhalb des Freibetrags liegt
  const netProfitPlusFees = desiredNetProfit + sellFee;
  if (netProfitPlusFees <= frei) {
    requiredGrossGain = netProfitPlusFees;
  } else {
    // Anteil der über den Freibetrag hinausgeht, muss versteuert werden
    const taxablePortion = (netProfitPlusFees - frei) / (1 - effectiveRate);
    requiredGrossGain = taxablePortion + frei;
  }

  const targetSellPrice = roundCents((totalCost + requiredGrossGain) / shares);
  const requiredGainPercent = buyPrice > 0 ? ((targetSellPrice - buyPrice) / buyPrice) * 100 : 0;

  // Gegenprobe
  const verification = calculateNetProfit(buyPrice, targetSellPrice, shares, buyFee, sellFee, freistellungRemaining, kirchensteuerRate);

  return {
    targetSellPrice,
    requiredGainPercent,
    requiredGrossGain: roundCents(requiredGrossGain),
    verification,
    valid: true
  };
}

/**
 * Berechnet die Tax-Drag Kurve für ein Chart.
 * Erzeugt Datenpunkte für verschiedene Verkaufskurse.
 *
 * @param {number} buyPrice - Kaufkurs
 * @param {number} shares - Anzahl Aktien
 * @param {number} buyFee - Kaufgebühr
 * @param {number} sellFee - Verkaufsgebühr
 * @param {number} freistellungRemaining - Freibetrag
 * @param {number} kirchensteuerRate - KiSt-Satz
 * @param {number} rangeMin - Untere Grenze (Faktor, z.B. 0.8 = -20%)
 * @param {number} rangeMax - Obere Grenze (Faktor, z.B. 2.0 = +100%)
 * @param {number} steps - Anzahl Datenpunkte
 * @returns {Array} Array von Datenpunkten
 */
export function calculateTaxDragCurve(buyPrice, shares, buyFee = 1, sellFee = 1, freistellungRemaining = 0, kirchensteuerRate = 0, rangeMin = 0.8, rangeMax = 2.0, steps = 100) {
  const points = [];
  const priceStep = (buyPrice * rangeMax - buyPrice * rangeMin) / steps;

  for (let i = 0; i <= steps; i++) {
    const sellPrice = roundCents(buyPrice * rangeMin + priceStep * i);
    const pnl = calculateNetProfit(buyPrice, sellPrice, shares, buyFee, sellFee, freistellungRemaining, kirchensteuerRate);
    const taxDragPercent = pnl.grossGain > 0 ? (pnl.totalTax / pnl.grossGain) * 100 : 0;

    points.push({
      sellPrice,
      grossProfit: pnl.grossGain,
      netProfit: pnl.netProfit,
      totalTax: pnl.totalTax,
      taxDragPercent,
      freistellungUsed: pnl.freistellungUsed,
      isDeadZone: pnl.grossGain > 0 && pnl.netProfit <= 0
    });
  }

  return points;
}

/**
 * Berechnet den Break-Even Verkaufskurs (Gewinnschwelle inkl. Gebühren).
 * Der Kurs, ab dem der Verkauf überhaupt Gewinn bringt.
 */
export function calculateBreakEvenSellPrice(buyPrice, shares, buyFee = 1, sellFee = 1) {
  if (shares <= 0) return 0;
  return roundCents((shares * buyPrice + buyFee + sellFee) / shares);
}

/**
 * FIFO-Berechnung für mehrere Kauf-Lots.
 *
 * @param {Array} lots - Array von {shares, price, date}
 * @param {number} sharesToSell - Anzahl zu verkaufender Aktien
 * @param {number} sellPrice - Verkaufskurs
 * @param {number} sellFee - Verkaufsgebühr
 * @param {number} freistellungRemaining - Freibetrag
 * @param {number} kirchensteuerRate - KiSt-Satz
 * @returns {Object} FIFO-Steuerberechnung
 */
export function calculateFifoSale(lots, sharesToSell, sellPrice, sellFee = 1, freistellungRemaining = 0, kirchensteuerRate = 0) {
  // Lots nach Datum sortieren (älteste zuerst)
  const sortedLots = [...lots].sort((a, b) => new Date(a.date) - new Date(b.date));
  let remaining = sharesToSell;
  let totalGrossGain = 0;
  const lotDetails = [];

  for (const lot of sortedLots) {
    if (remaining <= 0) break;
    const sharesFromLot = Math.min(remaining, lot.shares);
    const gainFromLot = roundCents((sellPrice - lot.price) * sharesFromLot);
    totalGrossGain += gainFromLot;
    remaining -= sharesFromLot;

    lotDetails.push({
      lotPrice: lot.price,
      lotDate: lot.date,
      sharesUsed: sharesFromLot,
      gainFromLot
    });
  }

  totalGrossGain = roundCents(totalGrossGain - sellFee);
  const tax = calculateTax(totalGrossGain, freistellungRemaining, kirchensteuerRate);

  return {
    sharesToSell,
    sellPrice,
    lotDetails,
    totalGrossGain,
    ...tax,
    netProfit: roundCents(totalGrossGain - tax.totalTax)
  };
}

/**
 * Rundet auf 2 Nachkommastellen (Cent-genau).
 */
function roundCents(value) {
  return Math.round(value * 100) / 100;
}
