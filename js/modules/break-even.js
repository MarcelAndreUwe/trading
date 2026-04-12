/**
 * Break-Even Rebuy Modul
 * Berechnet den Kurs fuer gewinnbringenden Wiedereinstieg
 */

/**
 * Erstellt eine Tabelle mit verschiedenen Verkaufskursen und
 * den jeweiligen Break-Even-Rebuy-Kursen.
 */
export function calculateRebuyTable(buyPrice, shares, sellFee, rebuyFee, freistellungRemaining, kirchensteuerRate, calculateBreakEvenRebuy) {
  if (shares <= 0 || buyPrice <= 0) return [];

  const scenarios = [];
  const percentages = [2, 5, 8, 10, 15, 20, 30, 50];

  for (const pct of percentages) {
    const sellPrice = Math.round((buyPrice * (1 + pct / 100)) * 100) / 100;
    const result = calculateBreakEvenRebuy(
      buyPrice, sellPrice, shares,
      sellFee, rebuyFee,
      freistellungRemaining, kirchensteuerRate
    );

    scenarios.push({
      gainPercent: pct,
      sellPrice,
      ...result
    });
  }

  return scenarios;
}

/**
 * Prueft ob ein Rebuy realistisch ist basierend auf dem benoetigten Kursrueckgang.
 * @returns 'realistic' | 'ambitious' | 'unrealistic'
 */
export function assessRebuyFeasibility(requiredDropPercent) {
  if (requiredDropPercent <= 3) return { level: 'realistic', label: 'Realistisch', color: 'green' };
  if (requiredDropPercent <= 8) return { level: 'ambitious', label: 'Ambitioniert', color: 'amber' };
  return { level: 'unrealistic', label: 'Unrealistisch', color: 'red' };
}
