/**
 * Sparplan-Vergleich Modul (DCA vs. Timing)
 * Berechnet hypothetisches Sparplan-Ergebnis
 */

/**
 * Simuliert einen monatlichen Sparplan anhand historischer Kurse.
 * Das Startdatum wird automatisch auf den Beginn der verfügbaren Daten geclamped.
 */
export function compareDcaVsTiming(historicalData, monthlyAmount, startDate, currentPrice, shares, buyPrice) {
  if (!historicalData || historicalData.length < 5 || monthlyAmount <= 0 || currentPrice <= 0) {
    return null;
  }

  // Sortiere Daten chronologisch (sicherheitshalber)
  const sorted = [...historicalData].sort((a, b) => new Date(a.date) - new Date(b.date));

  const dataStart = new Date(sorted[0].date);
  const dataEnd = new Date(sorted[sorted.length - 1].date);
  let requestedStart = new Date(startDate);

  // Clamp: Startdatum darf nicht vor den verfügbaren Daten liegen
  const effectiveStart = requestedStart < dataStart ? new Date(dataStart) : requestedStart;
  const wasClamped = requestedStart < dataStart;

  // Index-basierte Suche vorberechnen (schneller als jedes Mal alle Daten durchsuchen)
  // Erstelle eine Map: "YYYY-MM" → Kurs am nächsten zum 15. des Monats
  const monthlyPrices = buildMonthlyPriceMap(sorted);

  const monthsDiff = (dataEnd.getFullYear() - effectiveStart.getFullYear()) * 12
                   + (dataEnd.getMonth() - effectiveStart.getMonth());

  if (monthsDiff < 1) return null;

  // DCA-Simulation
  let dcaTotalShares = 0;
  let dcaTotalCost = 0;
  const dcaHistory = [];
  let skippedMonths = 0;

  for (let m = 0; m <= monthsDiff; m++) {
    const year = effectiveStart.getFullYear() + Math.floor((effectiveStart.getMonth() + m) / 12);
    const month = (effectiveStart.getMonth() + m) % 12;
    const key = year + '-' + String(month + 1).padStart(2, '0');

    const priceAtDate = monthlyPrices.get(key);
    if (priceAtDate && priceAtDate > 0) {
      const sharesBought = monthlyAmount / priceAtDate;
      dcaTotalShares += sharesBought;
      dcaTotalCost += monthlyAmount;

      dcaHistory.push({
        date: key + '-15',
        price: priceAtDate,
        sharesBought,
        totalShares: dcaTotalShares,
        totalCost: dcaTotalCost,
        currentValue: dcaTotalShares * currentPrice
      });
    } else {
      skippedMonths++;
    }
  }

  if (dcaTotalShares === 0) return null;

  const dcaAvgPrice = dcaTotalCost / dcaTotalShares;
  const dcaCurrentValue = dcaTotalShares * currentPrice;
  const dcaProfit = dcaCurrentValue - dcaTotalCost;
  const dcaReturnPct = dcaTotalCost > 0 ? (dcaProfit / dcaTotalCost) * 100 : 0;

  // Timing-Ergebnis des Users
  const timingCost = shares * buyPrice;
  const timingValue = shares * currentPrice;
  const timingProfit = timingValue - timingCost;
  const timingReturnPct = timingCost > 0 ? (timingProfit / timingCost) * 100 : 0;

  const opportunityCost = dcaProfit - timingProfit;
  const winner = opportunityCost > 0 ? 'sparplan' : 'timing';
  const executedMonths = dcaHistory.length;

  return {
    dca: {
      totalShares: dcaTotalShares,
      avgPrice: dcaAvgPrice,
      totalCost: dcaTotalCost,
      currentValue: dcaCurrentValue,
      profit: dcaProfit,
      returnPct: dcaReturnPct,
      monthlyAmount,
      months: executedMonths,
      history: dcaHistory
    },
    timing: {
      totalShares: shares,
      avgPrice: buyPrice,
      totalCost: timingCost,
      currentValue: timingValue,
      profit: timingProfit,
      returnPct: timingReturnPct
    },
    meta: {
      dataStart: sorted[0].date,
      dataEnd: sorted[sorted.length - 1].date,
      requestedStart: startDate,
      effectiveStart: effectiveStart.toISOString().split('T')[0],
      wasClamped,
      skippedMonths,
      executedMonths,
      totalDataPoints: sorted.length
    },
    opportunityCost: Math.abs(opportunityCost),
    winner,
    winnerLabel: winner === 'sparplan' ? 'Sparplan war besser' : 'Dein Timing war besser',
    difference: opportunityCost
  };
}

/**
 * Baut eine Map: "YYYY-MM" → Schlusskurs am nächsten zum 15. des Monats.
 * Deterministisch und konsistent.
 */
function buildMonthlyPriceMap(sortedData) {
  const map = new Map();

  for (const d of sortedData) {
    const date = new Date(d.date);
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = date.getDate();
    const distTo15 = Math.abs(dayOfMonth - 15);

    if (!map.has(key) || distTo15 < map.get(key).dist) {
      map.set(key, { price: d.close, dist: distTo15 });
    }
  }

  // Map bereinigen: nur Preise behalten
  const result = new Map();
  for (const [key, val] of map) {
    if (val.price > 0) {
      result.set(key, val.price);
    }
  }
  return result;
}
