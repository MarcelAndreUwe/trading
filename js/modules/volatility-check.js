/**
 * Volatilitaets-Check Modul
 * Berechnet Volatilitaet und vergleicht mit Erwartungen
 */

/**
 * Berechnet Volatilitaets-Metriken aus historischen Kursdaten.
 * @param {Array} historicalData - Array von {date, open, high, low, close}
 * @returns {Object} Volatilitaets-Metriken
 */
export function calculateVolatility(historicalData) {
  if (!historicalData || historicalData.length < 10) {
    return null;
  }

  const closes = historicalData.map(d => d.close).filter(c => c != null);
  if (closes.length < 10) return null;

  // Taegliche Renditen
  const dailyReturns = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }

  // Standardabweichung der taeglichen Renditen
  const mean = dailyReturns.reduce((s, v) => s + v, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (dailyReturns.length - 1);
  const dailyVol = Math.sqrt(variance);

  // Woechentliche und annualisierte Volatilitaet
  const weeklyVol = dailyVol * Math.sqrt(5);
  const annualVol = dailyVol * Math.sqrt(252);

  // Average True Range (ATR 14)
  const atr = calculateATR(historicalData, 14);

  // Max Daily Move (groesste Tagesbewegung)
  const maxDailyMove = Math.max(...dailyReturns.map(r => Math.abs(r)));

  // Woechentliche Bewegungen (fuer Kontext)
  const weeklyMoves = [];
  for (let i = 5; i < closes.length; i += 5) {
    const weekReturn = (closes[i] - closes[i - 5]) / closes[i - 5];
    weeklyMoves.push(Math.abs(weekReturn));
  }
  const avgWeeklyMove = weeklyMoves.length > 0 ? weeklyMoves.reduce((s, v) => s + v, 0) / weeklyMoves.length : 0;

  // Anzahl Wochen mit bestimmter Schwankung
  const weeksAbove5pct = weeklyMoves.filter(m => m > 0.05).length;
  const weeksAbove8pct = weeklyMoves.filter(m => m > 0.08).length;

  return {
    dailyVol,
    weeklyVol,
    annualVol,
    atr,
    atrPercent: closes[closes.length - 1] > 0 ? (atr / closes[closes.length - 1]) * 100 : 0,
    maxDailyMove,
    avgWeeklyMove,
    weeksAbove5pct,
    weeksAbove8pct,
    totalWeeks: weeklyMoves.length,
    dataPoints: closes.length
  };
}

/**
 * Average True Range (ATR) Berechnung
 */
function calculateATR(data, period = 14) {
  if (data.length < period + 1) return 0;

  const trueRanges = [];
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // Einfacher gleitender Durchschnitt der letzten 'period' TRs
  const recent = trueRanges.slice(-period);
  return recent.reduce((s, v) => s + v, 0) / recent.length;
}

/**
 * Bewertet ob eine erwartete Kursbewegung realistisch ist.
 * @param {number} expectedMovePct - Erwartete Bewegung in % (absolut)
 * @param {Object} volatility - Volatilitaets-Metriken
 * @param {number} timeHorizonDays - Zeithorizont in Handelstagen (default 20 ~ 1 Monat)
 * @returns {Object} Bewertung
 */
export function assessExpectation(expectedMovePct, volatility, timeHorizonDays = 20) {
  if (!volatility) {
    return { level: 'unknown', label: 'Keine Daten', color: 'slate', description: 'Keine historischen Daten vorhanden.' };
  }

  const expectedVol = volatility.dailyVol * Math.sqrt(timeHorizonDays);
  const ratio = (expectedMovePct / 100) / expectedVol;

  if (ratio <= 1.0) {
    return {
      level: 'realistic',
      label: 'Realistisch',
      color: 'green',
      ratio,
      description: 'Diese Kursbewegung liegt innerhalb einer Standardabweichung und tritt haeufig auf (~68% Wahrscheinlichkeit).',
      probability: '> 68%'
    };
  } else if (ratio <= 2.0) {
    return {
      level: 'ambitious',
      label: 'Ambitioniert',
      color: 'amber',
      ratio,
      description: 'Diese Kursbewegung erfordert eine ueberdurchschnittliche Bewegung (1-2 Standardabweichungen). Moeglich, aber nicht haeufig.',
      probability: '~5-32%'
    };
  } else {
    return {
      level: 'unrealistic',
      label: 'Unrealistisch',
      color: 'red',
      ratio,
      description: 'Diese Kursbewegung liegt bei mehr als 2 Standardabweichungen. Statistisch sehr unwahrscheinlich im gewaehlten Zeitraum.',
      probability: '< 5%'
    };
  }
}
