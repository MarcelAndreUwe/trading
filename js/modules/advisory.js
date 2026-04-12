/**
 * Advisory Engine - Regelbasierte Empfehlungen
 * Dynamische Beratung für mäßig erfahrene Trader
 */

const rules = [
  // 1. Grundlegende Gewinn/Verlust-Einschätzung (feuert immer)
  {
    id: 'position-status',
    category: 'info',
    priority: 3,
    evaluate: (state) => {
      if (!state.currentPrice || !state.buyPrice || state.buyPrice <= 0) return null;
      const gainPct = ((state.currentPrice - state.buyPrice) / state.buyPrice) * 100;

      if (gainPct > 50) {
        return {
          severity: 'green',
          title: 'Starker Gewinn: ' + gainPct.toFixed(0) + '% im Plus',
          message: 'Deine Position läuft sehr gut. Bei so hohen Gewinnen ist es sinnvoll, einen konkreten Ausstiegsplan zu haben — entweder einen festen Zielkurs oder einen nachgezogenen Stop-Loss (Trailing Stop).',
          action: 'Nutze den Tab "Zielkurs", um deinen gewünschten Netto-Gewinn zu berechnen, und setze einen Stop-Loss um Gewinne abzusichern.'
        };
      }
      if (gainPct > 10) {
        return {
          severity: 'green',
          title: 'Position im Plus: ' + gainPct.toFixed(1) + '% Gewinn',
          message: 'Du bist solide im Gewinn. Überlege, ob dein ursprüngliches Kursziel noch gilt oder ob du deinen Stop-Loss nachziehen möchtest, um den bisherigen Gewinn abzusichern.',
          action: 'Ein Stop-Loss knapp unter dem Kaufkurs sichert mindestens den Einsatz — nutze den Tab "Kurslevel" dafür.'
        };
      }
      if (gainPct < -20) {
        return {
          severity: 'red',
          title: 'Position deutlich im Minus: ' + gainPct.toFixed(0) + '%',
          message: 'Deine Position hat deutlich verloren. Stelle dir die Frage: Würdest du diese Aktie heute zum aktuellen Kurs kaufen? Wenn nein, ist es möglicherweise sinnvoller, den Verlust zu begrenzen statt auf Erholung zu hoffen.',
          action: 'Verluste zu begrenzen ist keine Schwäche — es schützt dein Kapital für bessere Gelegenheiten.'
        };
      }
      if (gainPct < -5) {
        return {
          severity: 'amber',
          title: 'Position leicht im Minus: ' + gainPct.toFixed(1) + '%',
          message: 'Deine Position ist leicht unter Wasser. Kleine Schwankungen sind normal. Prüfe, ob die Gründe für deinen Kauf noch gelten.',
          action: 'Setze einen Stop-Loss, um das maximale Verlustrisiko zu begrenzen.'
        };
      }
      return null;
    }
  },

  // 2. Tax-Drag Warnung (feuert immer bei Gewinn)
  {
    id: 'high-tax-drag',
    category: 'tax',
    priority: 2,
    evaluate: (state) => {
      if (state.taxDragPercent > 40 && state.grossGain > 0 && state.grossGain < 200) {
        return {
          severity: 'red',
          title: 'Extrem hoher Tax Drag bei kleinem Gewinn',
          message: 'Die Steuer verschlingt ' + state.taxDragPercent.toFixed(0) + '% deines Bruttogewinns. Bei kleinen Gewinnen nahe der Gewinnschwelle lohnt sich der Verkauf oft nicht.',
          action: 'Überlege, ob sich der Verkauf bei diesem kleinen Gewinn wirklich lohnt. Eventuell ist Halten die bessere Strategie.'
        };
      }
      if (state.taxDragPercent > 30 && state.grossGain > 0) {
        return {
          severity: 'amber',
          title: 'Steuern fressen ' + state.taxDragPercent.toFixed(0) + '% des Gewinns',
          message: 'Das ist der typische Bereich der Abgeltungssteuer. Prüfe, ob du noch Sparerpauschbetrag übrig hast.',
          action: 'Nutze den Freibetrag strategisch — die ersten 1.000 € Gewinn pro Jahr sind steuerfrei.'
        };
      }
      return null;
    }
  },

  // 3. Freibetrag-Optimierung (feuert immer)
  {
    id: 'freistellung-optimize',
    category: 'tax',
    priority: 3,
    evaluate: (state) => {
      if (state.freistellungRemaining <= 0) return null;
      const month = new Date().getMonth();

      if (month >= 9 && state.freistellungRemaining > 200 && state.grossGain > 0) {
        return {
          severity: 'green',
          title: 'Freibetrag vor Jahresende nutzen!',
          message: 'Du hast noch ' + state.freistellungRemaining.toFixed(0) + ' € Sparerpauschbetrag frei. Das Steuerjahr endet bald — nicht genutzer Freibetrag verfällt!',
          action: 'Erwäge, Gewinne bis ' + state.freistellungRemaining.toFixed(0) + ' € noch dieses Jahr zu realisieren, um den Freibetrag nicht zu verschenken.'
        };
      }
      if (state.freistellungRemaining > 0 && state.grossGain > 0 && state.grossGain <= state.freistellungRemaining) {
        return {
          severity: 'green',
          title: 'Gewinn liegt im Freibetrag — steuerfrei!',
          message: 'Dein aktueller Gewinn von ' + state.grossGain.toFixed(0) + ' € liegt komplett innerhalb deines Freibetrags (' + state.freistellungRemaining.toFixed(0) + ' € übrig). Du zahlst darauf keine Steuer.',
          action: 'Ein guter Zeitpunkt zum Verkaufen, wenn du Gewinne steuerfrei mitnehmen möchtest.'
        };
      }
      if (state.freistellungRemaining > 0 && state.grossGain > 0) {
        return {
          severity: 'blue',
          title: 'Freibetrag: ' + state.freistellungRemaining.toFixed(0) + ' € verfügbar',
          message: 'Die ersten ' + state.freistellungRemaining.toFixed(0) + ' € deines Gewinns sind steuerfrei. Nur der Teil darüber wird mit ' + (state.taxDragPercent > 0 ? state.taxDragPercent.toFixed(0) : '26') + '% besteuert.',
          action: 'Behalte den Freibetrag bei deiner Verkaufsplanung im Blick.'
        };
      }
      return null;
    }
  },

  // 4. Gebühren-Impact (feuert immer bei Gewinn)
  {
    id: 'fee-impact',
    category: 'tax',
    priority: 2,
    evaluate: (state) => {
      if (!state.grossGain || state.grossGain <= 0) return null;
      const totalFees = state.brokerFee * 2;
      const feePct = (totalFees / state.grossGain) * 100;

      if (feePct > 10) {
        return {
          severity: 'red',
          title: 'Gebühren fressen ' + feePct.toFixed(0) + '% des Gewinns',
          message: 'Die Handelsgebühren (' + totalFees.toFixed(2) + ' €) sind im Verhältnis zum Gewinn sehr hoch. Bei kleinen Trades sind die fixen Kosten überproportional.',
          action: 'Größere, seltenere Trades sind kosteneffizienter als viele kleine. Mindestens 200–500 € Gewinn sollte ein Trade bringen.'
        };
      }
      return null;
    }
  },

  // 5. Risk/Reward (feuert wenn SL und Ziel gesetzt)
  {
    id: 'bad-risk-reward',
    category: 'risk',
    priority: 2,
    evaluate: (state) => {
      if (!state.stopLoss || state.stopLoss <= 0 || !state.targetPrice || state.targetPrice <= 0 || !state.buyPrice) return null;
      const risk = state.buyPrice - state.stopLoss;
      const reward = state.targetPrice - state.buyPrice;
      if (risk <= 0) return null;
      const ratio = reward / risk;

      const riskEur = (risk * state.shares).toFixed(0);
      const rewardEur = (reward * state.shares).toFixed(0);

      if (ratio < 1) {
        return {
          severity: 'red',
          title: 'Ungünstiges Verhältnis: Du riskierst mehr als du gewinnen kannst',
          message: 'Dein möglicher Verlust (' + riskEur + ' €) ist GRÖSSER als dein möglicher Gewinn (' + rewardEur + ' €). Konkret: Für jeden Euro, den du gewinnen könntest, riskierst du ' + (1/ratio).toFixed(1) + ' € zu verlieren. Das ist wie eine Wette, bei der die Bank im Vorteil ist.',
          action: 'So machst du es besser: Setze deinen Zielkurs höher ODER deinen Stop-Loss näher an den Kaufkurs. Ziel: Der mögliche Gewinn sollte mindestens doppelt so groß sein wie der mögliche Verlust.'
        };
      }
      if (ratio < 2) {
        return {
          severity: 'amber',
          title: 'Verhältnis Chance/Risiko: Okay, aber nicht optimal',
          message: 'Für jeden Euro Risiko (' + riskEur + ' € maximal Verlust) hast du ' + ratio.toFixed(1) + ' € Gewinnchance (' + rewardEur + ' €). Das ist akzeptabel, aber erfahrene Trader zielen auf ein Verhältnis von 1:2 oder besser — also doppelt so viel Gewinnchance wie Verlustrisiko.',
          action: 'Warum ist das wichtig? Mit einem 1:2-Verhältnis bist du selbst dann profitabel, wenn nur jeder dritte Trade aufgeht. Mit 1:' + ratio.toFixed(1) + ' brauchst du eine höhere Trefferquote.'
        };
      }
      if (ratio >= 3) {
        return {
          severity: 'green',
          title: 'Sehr gutes Verhältnis: ' + ratio.toFixed(1) + '× mehr Chance als Risiko',
          message: 'Für jeden Euro Risiko (' + riskEur + ' € maximal Verlust) stehen ' + ratio.toFixed(1) + ' € Gewinnchance (' + rewardEur + ' €). Das ist ein hervorragendes Setup! Selbst wenn nur jeder 4. Trade klappt, bist du langfristig im Plus.',
          action: 'Halte dich an diesen Plan. Verändere Stop-Loss und Zielkurs nicht aus emotionalen Gründen, sondern nur wenn sich die Faktenlage ändert.'
        };
      }
      return null;
    }
  },

  // 6. Kein Stop-Loss gesetzt (feuert immer)
  {
    id: 'no-stoploss',
    category: 'risk',
    priority: 1,
    evaluate: (state) => {
      if (!state.shares || !state.buyPrice || state.buyPrice <= 0) return null;
      if (state.stopLoss && state.stopLoss > 0) return null;

      const invested = (state.shares * state.buyPrice).toFixed(0);
      return {
        severity: 'amber',
        title: 'Kein Stop-Loss gesetzt — dein gesamter Einsatz ist ungeschützt',
        message: 'Ein Stop-Loss ist wie eine Notbremse: Er verkauft deine Aktie automatisch, wenn der Kurs unter einen bestimmten Wert fällt. Ohne Stop-Loss könntest du im schlimmsten Fall deinen gesamten Einsatz von ' + invested + ' € verlieren.',
        action: 'Empfehlung: Gehe zum Tab "Zielkurs", trage deinen Wunschgewinn ein und nutze die Stop-Loss-Empfehlung dort. Oder setze im Tab "Kurslevel" manuell einen Stop-Loss (typisch: 5–10% unter dem Kaufkurs, also bei ca. ' + (state.buyPrice * 0.93).toFixed(2) + ' – ' + (state.buyPrice * 0.95).toFixed(2) + ' €).'
      };
    }
  },

  // 7. Break-Even Rebuy Einschätzung (feuert bei Gewinn)
  {
    id: 'rebuy-assessment',
    category: 'opportunity',
    priority: 2,
    evaluate: (state) => {
      if (!state.breakEvenRebuy) return null;
      const drop = state.breakEvenRebuy.requiredDropPercent;

      if (drop > 15) {
        return {
          severity: 'red',
          title: 'Wiedereinstieg unrealistisch (−' + drop.toFixed(1) + '% nötig)',
          message: 'Um nach einem Verkauf und Steuern die gleiche Stückzahl zurückzukaufen, müsste der Kurs um ' + drop.toFixed(1) + '% fallen. So starke Rückgänge sind bei den meisten Aktien selten.',
          action: 'Verkaufen und günstiger nachkaufen klingt gut, funktioniert in der Praxis aber selten. Halte die Position oder nutze einen Sparplan.'
        };
      }
      if (drop > 5) {
        return {
          severity: 'amber',
          title: 'Wiedereinstieg ambitioniert (−' + drop.toFixed(1) + '% nötig)',
          message: 'Für einen Break-Even-Rebuy müsste der Kurs um ' + drop.toFixed(1) + '% fallen. Das ist möglich, aber nicht garantiert.',
          action: 'Überlege gut, ob du das Timing-Risiko eingehen willst. Im Tab "Sparplan" siehst du, wie ein regelmäßiger Sparplan im Vergleich abschneidet.'
        };
      }
      return null;
    }
  },

  // 8. Disposition-Effekt (feuert bei Gewinn ohne Ziel)
  {
    id: 'disposition-effect',
    category: 'psychology',
    priority: 3,
    evaluate: (state) => {
      if (!state.currentPrice || !state.buyPrice || state.currentPrice <= state.buyPrice) return null;
      const gainPct = ((state.currentPrice - state.buyPrice) / state.buyPrice) * 100;

      if (gainPct > 20 && (!state.targetPrice || state.targetPrice <= 0)) {
        return {
          severity: 'amber',
          title: 'Gewinnmitnahme-Psychologie beachten',
          message: 'Deine Position ist ' + gainPct.toFixed(0) + '% im Plus, aber du hast keinen Zielkurs gesetzt. Der "Disposition-Effekt" verleitet Trader dazu, Gewinner zu früh zu verkaufen — aus Angst, den Gewinn wieder zu verlieren.',
          action: 'Setze einen Zielkurs basierend auf Analyse, nicht auf Angst. Im Tab "Zielkurs" kannst du deinen Wunsch-Nettoprofit berechnen.'
        };
      }
      return null;
    }
  },

  // 9. Kleine Positionsgröße (feuert immer)
  {
    id: 'position-size',
    category: 'risk',
    priority: 3,
    evaluate: (state) => {
      if (!state.shares || !state.buyPrice) return null;
      const positionValue = state.shares * state.buyPrice;

      if (positionValue < 100) {
        return {
          severity: 'blue',
          title: 'Sehr kleine Position (' + positionValue.toFixed(0) + ' €)',
          message: 'Bei einer so kleinen Positionsgröße wirken sich die fixen Gebühren (' + state.brokerFee.toFixed(2) + ' € pro Trade) überproportional aus.',
          action: 'Bei Neobroker-Gebühren von 1 € pro Trade empfiehlt sich eine Mindestpositionsgröße von ca. 200–500 €.'
        };
      }
      return null;
    }
  },

  // 10. Break-Even vs. Volatilität (nur mit API-Daten)
  {
    id: 'rebuy-vs-volatility',
    category: 'risk',
    priority: 1,
    evaluate: (state) => {
      if (!state.breakEvenRebuy || !state.volatility) return null;
      const requiredDrop = state.breakEvenRebuy.requiredDropPercent;
      const weeklyVol = state.volatility.avgWeeklyMove * 100;
      if (weeklyVol > 0 && requiredDrop > weeklyVol * 4) {
        return {
          severity: 'red',
          title: 'Realitätscheck: Günstiger Rückkauf ist unrealistisch',
          message: 'Um nach dem Verkauf die gleiche Anzahl Aktien zurückzukaufen, müsste der Kurs um ' + requiredDrop.toFixed(1) + '% fallen. Zum Vergleich: In einer normalen Woche schwankt diese Aktie nur um ca. ' + weeklyVol.toFixed(1) + '%. Ein Rückgang von ' + requiredDrop.toFixed(1) + '% wäre also ' + (requiredDrop / weeklyVol).toFixed(0) + '× stärker als üblich — das kommt statistisch fast nie vor.',
          action: 'Der Plan „verkaufen und billiger zurückkaufen" klingt verlockend, funktioniert in der Praxis aber selten. Besser: Position halten oder mit einem Sparplan regelmäßig nachkaufen.'
        };
      }
      return null;
    }
  },

  // 11. DCA-Vergleich (nur mit API-Daten)
  {
    id: 'dca-better',
    category: 'opportunity',
    priority: 3,
    evaluate: (state) => {
      if (!state.dcaResult) return null;
      const diff = state.dcaResult.opportunityCost;
      const pct = state.dcaResult.timing.totalCost > 0 ? (diff / state.dcaResult.timing.totalCost) * 100 : 0;

      if (state.dcaResult.winner === 'sparplan' && pct > 5) {
        return {
          severity: 'amber',
          title: 'Erkenntnis: Ein Sparplan hätte ' + diff.toFixed(0) + ' € mehr gebracht',
          message: 'Hättest du statt eines einmaligen Kaufs jeden Monat den gleichen Betrag investiert (Sparplan), wäre dein Ergebnis um ' + pct.toFixed(1) + '% besser. Ein Sparplan kauft automatisch — mal teuer, mal günstig — und gleicht Schwankungen so über die Zeit aus.',
          action: 'Das bedeutet nicht, dass dein Kauf falsch war. Aber für die Zukunft: Ein monatlicher Sparplan nimmt dir die Entscheidung ab, wann der „richtige" Zeitpunkt ist — und ist statistisch oft die bessere Wahl.'
        };
      }
      if (state.dcaResult.winner === 'timing' && pct > 5) {
        return {
          severity: 'green',
          title: 'Gut gemacht: Dein Kauf-Timing war besser als ein Sparplan!',
          message: 'Dein Einstiegszeitpunkt war gut gewählt — du hast ' + diff.toFixed(0) + ' € (' + pct.toFixed(1) + '%) mehr verdient als ein automatischer monatlicher Sparplan es geschafft hätte.',
          action: 'Bedenke aber: Das klappt nicht jedes Mal. Studien zeigen, dass langfristig ein Sparplan in ca. 70% der Fälle bessere Ergebnisse liefert als einmaliges Market-Timing.'
        };
      }
      return null;
    }
  },

  // 12. Stop-Loss zu eng (nur mit Volatilitätsdaten)
  {
    id: 'stoploss-too-tight',
    category: 'risk',
    priority: 1,
    evaluate: (state) => {
      if (!state.stopLoss || state.stopLoss <= 0 || !state.volatility || !state.currentPrice) return null;
      const distancePct = ((state.currentPrice - state.stopLoss) / state.currentPrice) * 100;
      const atrPct = state.volatility.atrPercent;

      if (atrPct > 0 && distancePct < atrPct * 1.5) {
        return {
          severity: 'red',
          title: 'Stop-Loss zu nah am aktuellen Kurs!',
          message: 'Dein Stop-Loss liegt nur ' + distancePct.toFixed(1) + '% unter dem aktuellen Kurs. Das Problem: Diese Aktie schwankt an einem normalen Tag schon um ca. ' + atrPct.toFixed(1) + '% auf und ab. Dein Stop-Loss könnte also allein durch eine normale Tagesschwankung ausgelöst werden — ohne dass es einen echten Kurseinbruch gibt.',
          action: 'Empfehlung: Setze den Stop-Loss mindestens ' + (atrPct * 2).toFixed(1) + '% unter den aktuellen Kurs (das ist die doppelte durchschnittliche Tagesschwankung). Konkret wäre das bei ca. ' + (state.currentPrice * (1 - atrPct * 2 / 100)).toFixed(2) + ' €.'
        };
      }
      return null;
    }
  }
];

/**
 * Wertet alle Regeln gegen den aktuellen State aus.
 */
export function evaluateAdvisory(state) {
  return rules
    .map(rule => {
      try {
        const result = rule.evaluate(state);
        if (result) {
          return { ...result, ruleId: rule.id, category: rule.category, priority: rule.priority };
        }
        return null;
      } catch (e) {
        console.warn('Advisory rule ' + rule.id + ' failed:', e);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority);
}
