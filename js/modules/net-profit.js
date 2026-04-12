/**
 * Netto-Profit Zielkurs Modul
 * Rueckwaertsberechnung des benoetigten Verkaufskurses
 */

/**
 * Erstellt eine Tabelle mit verschiedenen Wunsch-Nettogewinnen
 * und den jeweiligen benoetigten Verkaufskursen.
 */
export function calculateProfitTargetTable(buyPrice, shares, buyFee, sellFee, freistellungRemaining, kirchensteuerRate, calculateTargetSellPrice) {
  if (shares <= 0 || buyPrice <= 0) return [];

  const invested = shares * buyPrice;
  const targets = [50, 100, 200, 500, 1000, 2000, 5000];

  return targets
    .filter(t => t <= invested * 2) // Nur sinnvolle Ziele
    .map(desiredNet => {
      const result = calculateTargetSellPrice(
        buyPrice, shares, desiredNet,
        buyFee, sellFee,
        freistellungRemaining, kirchensteuerRate
      );
      return {
        desiredNetProfit: desiredNet,
        ...result
      };
    })
    .filter(r => r.valid);
}

/**
 * Berechnet fuer prozentuale Netto-Renditen die benoetigten Verkaufskurse.
 */
export function calculateReturnTargets(buyPrice, shares, buyFee, sellFee, freistellungRemaining, kirchensteuerRate, calculateTargetSellPrice) {
  if (shares <= 0 || buyPrice <= 0) return [];

  const invested = shares * buyPrice;
  const returnPercents = [5, 10, 15, 20, 30, 50];

  return returnPercents.map(pct => {
    const desiredNet = Math.round(invested * pct / 100);
    const result = calculateTargetSellPrice(
      buyPrice, shares, desiredNet,
      buyFee, sellFee,
      freistellungRemaining, kirchensteuerRate
    );
    return {
      returnPercent: pct,
      desiredNetProfit: desiredNet,
      ...result
    };
  }).filter(r => r.valid);
}
