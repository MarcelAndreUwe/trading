/**
 * Rechenweg-Bibliothek
 *
 * Für jede berechnete Zahl in der App liefert eine Funktion hier ein Objekt:
 *   { name, formula, filled, result, explanation }
 *
 * - name: kurze Bezeichnung (z.B. "Brutto-Rendite 2038")
 * - formula: symbolische Formel mit Variablennamen (z.B. "Bestand × Rendite + Beitrag × Rendite / 2")
 * - filled: Formel mit eingesetzten Zahlen
 * - result: das finale Ergebnis
 * - explanation: fachliche/mathematische Herleitung (für Laien verständlich)
 *
 * Wird über das Alpine-Window global verfügbar gemacht (window.calc).
 */

function eur(v) {
  if (v == null || isNaN(v)) return '0,00 €';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);
}
function pct(v, digits) {
  if (v == null || isNaN(v)) return '0 %';
  return v.toFixed(digits == null ? 2 : digits).replace('.', ',') + ' %';
}
function num(v, digits) {
  if (v == null || isNaN(v)) return '0';
  return v.toFixed(digits == null ? 2 : digits).replace('.', ',');
}

// ========================================================================
// ALTERSVORSORGE — Jahresübersicht ETF-Sparplan
// ========================================================================
export const av = {

  /** ETF: Brutto-Rendite eines Jahres */
  etfGrossReturn(s, inp) {
    const startBal = s.portfolioValue - s.contribution - s.grossReturn + s.costs;
    const base = startBal + s.contribution / 2;
    return {
      name: 'Brutto-Rendite (Jahr ' + s.year + ')',
      formula: '(Vorjahresbestand + Jahresbeitrag / 2) × erwartete Rendite',
      filled: '(' + eur(startBal) + ' + ' + eur(s.contribution) + ' / 2) × ' + pct(inp.expectedReturn) + ' = ' + eur(s.grossReturn),
      result: eur(s.grossReturn),
      explanation: 'Die Rendite wird auf den Vorjahresbestand plus die Hälfte der Jahreseinzahlung berechnet. Das unterstellt vereinfacht, dass die Beiträge gleichmäßig über das Jahr einfließen — das ist eine übliche Näherung für jährliche Sparpläne.'
    };
  },

  /** ETF: TER-Kosten */
  etfTerCosts(s, inp) {
    const startBal = s.portfolioValue - s.contribution - s.grossReturn + s.costs;
    const base = startBal + s.contribution / 2;
    return {
      name: 'ETF-Kosten (TER) Jahr ' + s.year,
      formula: '(Vorjahresbestand + Jahresbeitrag / 2) × TER',
      filled: '(' + eur(startBal) + ' + ' + eur(s.contribution) + ' / 2) × ' + pct(inp.etfTer) + ' = ' + eur(s.costs),
      result: eur(s.costs),
      explanation: 'Die Total Expense Ratio (TER) ist die jährliche Verwaltungsgebühr eines ETFs. Sie wird direkt vom Fondsvermögen abgezogen — der Effekt auf deine Rendite ist konstant. Auch hier rechnen wir auf Bestand + halbe Jahresrate, weil die Beiträge über das Jahr verteilt sind.'
    };
  },

  /** ETF: Vorabpauschale brutto */
  etfVorabpauschale(s, inp) {
    const startBal = s.portfolioValue - s.contribution - s.grossReturn + s.costs;
    return {
      name: 'Vorabpauschale (Jahr ' + s.year + ')',
      formula: 'Fondswert am Jahresanfang × Basiszins × 0,7 (max. tatsächlicher Jahresgewinn)',
      filled: eur(startBal) + ' × ' + pct(inp.basiszins) + ' × 0,7 = ' + eur(s.vorabpauschaleGross),
      result: eur(s.vorabpauschaleGross),
      explanation: 'Die Vorabpauschale ist eine jährliche Steuervorauszahlung auf unrealisierte ETF-Gewinne (§ 18 InvStG). Der Basiszins (2025: 2,53 %) wird von der Bundesbank festgelegt. Der Faktor 0,7 ist gesetzlich verankert. Die Pauschale ist gedeckelt auf den tatsächlichen Jahresgewinn des Fonds.'
    };
  },

  /** ETF: VP-Steuer */
  etfVorabpauschaleTax(s) {
    const spb = s.vorabpauschaleSPB || 0;
    const afterSPB = Math.max(0, (s.vorabpauschaleTaxable || 0) - spb);
    return {
      name: 'Vorabpauschale-Steuer Jahr ' + s.year,
      formula: '(VP × (1 − Teilfreistellung 30 %) − genutzter Sparerpauschbetrag) × Abgeltungssteuer 26,375 %',
      filled: '(' + eur(s.vorabpauschaleGross) + ' × 0,7 − ' + eur(spb) + ') × 26,375 % = ' + eur(s.vorabpauschaleTax) + (s.vorabpauschaleTax === 0 ? '   (VP unter Sparerpauschbetrag)' : ''),
      result: s.vorabpauschaleTax === 0
        ? '0,00 € — VP liegt unter dem Sparerpauschbetrag von 1.000 € pro Jahr'
        : eur(s.vorabpauschaleTax),
      explanation: 'Bei Aktien-ETFs sind 30 % der Erträge von der Steuer freigestellt (Teilfreistellung), versteuert werden also nur 70 %. Davon wird zuerst der Sparerpauschbetrag (1.000 €/Jahr) abgezogen, der Rest mit der Abgeltungssteuer (25 %) plus Solidaritätszuschlag (5,5 %) belastet — insgesamt 26,375 %. Bei kleinen Portfolios bleibt die VP regelmäßig unter dem Freibetrag → keine Steuer.'
    };
  },

  /** ETF: Portfolio-Stand am Jahresende (läuft) */
  etfPortfolioValue(s, inp) {
    const startBal = s.portfolioValue - s.contribution - s.grossReturn + s.costs;
    return {
      name: 'Portfolio Ende Jahr ' + s.year,
      formula: 'Vorjahresbestand + Jahresbeitrag + (Brutto-Rendite − TER-Kosten)',
      filled: eur(startBal) + ' + ' + eur(s.contribution) + ' + (' + eur(s.grossReturn) + ' − ' + eur(s.costs) + ') = ' + eur(s.portfolioValue),
      result: eur(s.portfolioValue),
      explanation: 'Der neue Depotwert setzt sich zusammen aus dem Vorjahresbestand, den neuen Einzahlungen und der Netto-Rendite (Brutto-Rendite abzüglich der laufenden Fondskosten). Die Vorabpauschale-Steuer wird nicht vom Depot abgezogen — sie wird extern aus dem Girokonto entrichtet und beim späteren Verkauf als Anrechnungstopf gutgeschrieben.'
    };
  },

  // ========================================================================
  // ALTERSVORSORGE — Jahresübersicht Rentenversicherung
  // ========================================================================
  rvGrossReturn(s, inp) {
    const startBal = s.portfolioValue - s.contribution - (s.grossReturn - s.costs);
    return {
      name: 'Brutto-Rendite RV (Jahr ' + s.year + ')',
      formula: '(Vorjahresbestand + Jahresbeitrag / 2) × erwartete Rendite',
      filled: '(' + eur(startBal) + ' + ' + eur(s.contribution) + ' / 2) × ' + pct(inp.expectedReturn) + ' = ' + eur(s.grossReturn),
      result: eur(s.grossReturn),
      explanation: 'Im Versicherungsmantel werden die Beiträge im ETF angelegt. Die Rendite-Berechnung ist identisch zum klassischen ETF-Sparplan. Der entscheidende Vorteil der Rentenversicherung ist, dass in der Ansparphase KEINE Vorabpauschale anfällt — die Rendite arbeitet also 30-40 Jahre lang steuerfrei weiter (sogenannte Steuerstundung).'
    };
  },

  rvCosts(s, inp, providerName, providerRate) {
    const startBal = s.portfolioValue - s.contribution - (s.grossReturn - s.costs);
    return {
      name: 'Versicherungskosten Jahr ' + s.year,
      formula: '(Vorjahresbestand + Jahresbeitrag / 2) × Anbieterkosten',
      filled: '(' + eur(startBal) + ' + ' + eur(s.contribution) + ' / 2) × ' + pct(providerRate * 100) + ' = ' + eur(s.costs),
      result: eur(s.costs),
      explanation: 'Die Kosten der Rentenversicherung (' + (providerName || 'Anbieter') + ') werden jährlich vom Vertragsguthaben abgezogen. Bei Nettotarifen (keine Abschlussprovision) liegen die Gesamtkosten bei 0,6–1,0 % p.a. — deutlich höher als bei einem reinen ETF-Sparplan (0,1–0,2 %). Ob der Steuervorteil beim Auszahlen (Halbeinkünfteverfahren) die Mehrkosten aufwiegt, hängt von Laufzeit und persönlichem Steuersatz im Alter ab.'
    };
  },

  rvCumCosts(s) {
    return {
      name: 'Kumulierte RV-Kosten bis Jahr ' + s.year,
      formula: 'Σ Versicherungskosten aller bisherigen Jahre',
      filled: 'Kosten aktuelles Jahr ' + eur(s.costs) + ' + Kumul. Vorjahr ' + eur(Math.max(0, s.cumulativeCosts - s.costs)) + ' = ' + eur(s.cumulativeCosts),
      result: eur(s.cumulativeCosts),
      explanation: 'Fortlaufende Summe aller Versicherungskosten seit Vertragsbeginn. Dieser Wert macht den langfristigen Kostenhebel sichtbar: auch "günstig" wirkende 0,7 % pro Jahr summieren sich über 35 Jahre auf einen fünfstelligen Betrag.'
    };
  },

  rvPortfolioValue(s, inp) {
    const startBal = s.portfolioValue - s.contribution - (s.grossReturn - s.costs);
    return {
      name: 'RV-Portfolio Ende Jahr ' + s.year,
      formula: 'Vorjahresbestand + Jahresbeitrag + (Brutto-Rendite − Kosten)',
      filled: eur(startBal) + ' + ' + eur(s.contribution) + ' + (' + eur(s.grossReturn) + ' − ' + eur(s.costs) + ') = ' + eur(s.portfolioValue),
      result: eur(s.portfolioValue),
      explanation: 'Der Depotwert innerhalb der Versicherung wächst ohne Steuerabzug — in der Ansparphase fällt weder Vorabpauschale noch Abgeltungssteuer an. Das ist der sogenannte "Steuerstundungseffekt": der volle Zinseszins wirkt.'
    };
  },

  // ========================================================================
  // ALTERSVORSORGE — Jahresübersicht Altersvorsorgedepot
  // ========================================================================
  avdSubsidy(s, inp) {
    const d = s.subsidyDetail || {};
    const parts = [];
    if (d.grundzulage) parts.push('Grundzulage ' + eur(d.grundzulage));
    if (d.kinderzulage) parts.push('Kinderzulage ' + eur(d.kinderzulage));
    if (d.bonus) parts.push('Berufseinsteigerbonus ' + eur(d.bonus));
    const sumExpr = parts.length ? parts.join(' + ') + ' = ' + eur(s.stateSubsidy) : 'Beitrag 0 € → keine Zulage';
    return {
      name: 'Staatliche Zulagen Jahr ' + s.year,
      formula: 'Grundzulage (50 % auf erste 360 € + 25 % auf nächste 1.440 €) + 300 €/Kind + ggf. Berufseinsteigerbonus 200 €',
      filled: sumExpr,
      result: eur(s.stateSubsidy),
      explanation: 'Das ab 01.01.2027 geplante Altersvorsorgedepot fördert nicht mit Fixzulagen wie Riester, sondern gestaffelt: Auf die ersten 360 € Eigenbeitrag gibt es 50 % dazu, auf die nächsten 1.440 € noch 25 % — macht max. 540 € Grundzulage pro Jahr. Zusätzlich 300 € pro Kind (ab 2008 geboren) und einmalig 200 € Berufseinsteigerbonus unter 25 Jahren. Die Zulagen fließen direkt ins Depot und erhöhen die Rendite.'
    };
  },

  avdTaxDeduction(s, inp) {
    return {
      name: 'Steuerersparnis durch Sonderausgabenabzug',
      formula: 'Jahresbeitrag × persönlicher Steuersatz heute',
      filled: eur(s.contribution) + ' × ' + pct(inp.personalTaxRateCurrent) + ' = ' + eur(s.taxDeduction),
      result: eur(s.taxDeduction),
      explanation: 'Beiträge zum Altersvorsorgedepot sind als Sonderausgaben steuerlich absetzbar. Bei einem Grenzsteuersatz von ' + pct(inp.personalTaxRateCurrent) + ' bekommst du diesen Anteil deines Beitrags über die Steuererklärung zurück. Achtung: Im Alter wird das gesamte Guthaben nachgelagert besteuert — der Steuervorteil heute ist nur dann echte Ersparnis, wenn dein Steuersatz im Alter niedriger ist.'
    };
  },

  avdGrossReturn(s, inp) {
    const inflow = s.contribution + s.stateSubsidy;
    const startBal = s.portfolioValue - inflow - (s.grossReturn - s.costs);
    return {
      name: 'Brutto-Rendite AVD Jahr ' + s.year,
      formula: '(Vorjahresbestand + (Beitrag + Zulagen) / 2) × erwartete Rendite',
      filled: '(' + eur(startBal) + ' + ' + eur(inflow) + ' / 2) × ' + pct(inp.expectedReturn) + ' = ' + eur(s.grossReturn),
      result: eur(s.grossReturn),
      explanation: 'Die Rendite wirkt auf Beiträge UND Zulagen — das ist der zentrale Hebel des AVD: staatliches Geld arbeitet für dich mit. Innerhalb des geförderten Depots fällt während der Ansparphase keine Kapitalertragsteuer an.'
    };
  },

  avdCosts(s, inp) {
    const inflow = s.contribution + s.stateSubsidy;
    const startBal = s.portfolioValue - inflow - (s.grossReturn - s.costs);
    return {
      name: 'Depotkosten AVD Jahr ' + s.year,
      formula: '(Vorjahresbestand + (Beitrag + Zulagen) / 2) × Kostenquote',
      filled: '(' + eur(startBal) + ' + ' + eur(inflow) + ' / 2) × ' + pct(inp.avdCostRate) + ' = ' + eur(s.costs),
      result: eur(s.costs),
      explanation: 'Die Kostenquote des Altersvorsorgedepots ist per Gesetz gedeckelt (geplant 1,0 % bei privaten und 1,5 % bei Standardprodukten). Finanztip empfiehlt max. 0,5 %. Die Kosten werden laufend vom Depotvermögen abgezogen.'
    };
  },

  avdPortfolioValue(s, inp) {
    const inflow = s.contribution + s.stateSubsidy;
    const startBal = s.portfolioValue - inflow - (s.grossReturn - s.costs);
    return {
      name: 'AVD-Portfolio Ende Jahr ' + s.year,
      formula: 'Vorjahresbestand + Beitrag + Zulagen + (Brutto-Rendite − Depotkosten)',
      filled: eur(startBal) + ' + ' + eur(s.contribution) + ' + ' + eur(s.stateSubsidy) + ' + (' + eur(s.grossReturn) + ' − ' + eur(s.costs) + ') = ' + eur(s.portfolioValue),
      result: eur(s.portfolioValue),
      explanation: 'Beiträge plus Zulagen fließen in voller Höhe ins Depot. Die Netto-Rendite (abzüglich Depotkosten) wird gutgeschrieben. Steuer fällt erst beim Auszahlen an (nachgelagerte Besteuerung mit dem persönlichen Einkommensteuersatz im Alter).'
    };
  },

  // ========================================================================
  // ALTERSVORSORGE — Kostenvergleich-Tabelle (Aggregatwerte)
  // ========================================================================
  totalContributed(product, years) {
    if (!product) return null;
    const monthly = years > 0 ? product.totalContributed / years / 12 : 0;
    return {
      name: 'Gesamte Einzahlungen — ' + product.product,
      formula: 'Monatliche Sparrate × 12 × Anspardauer',
      filled: eur(monthly) + ' × 12 × ' + years + ' Jahre = ' + eur(product.totalContributed),
      result: eur(product.totalContributed),
      explanation: 'Summe aller eigenen Beiträge über die gesamte Laufzeit. Beim Altersvorsorgedepot auf den max. geförderten Betrag von 1.800 €/Jahr gedeckelt.'
    };
  },

  totalSubsidies(product) {
    if (!product) return null;
    const snaps = product.snapshots || [];
    const firstWithSubsidy = snaps.find(s => (s.stateSubsidy || 0) > 0);
    const lastWithSubsidy = [...snaps].reverse().find(s => (s.stateSubsidy || 0) > 0);
    const years = snaps.length;
    let filled;
    if (firstWithSubsidy && lastWithSubsidy && years > 0) {
      const d = firstWithSubsidy.subsidyDetail || {};
      const parts = [];
      if (d.grundzulage) parts.push('Grundzulage ' + eur(d.grundzulage));
      if (d.kinderzulage) parts.push('Kinderzulage ' + eur(d.kinderzulage));
      if (d.bonus) parts.push('Bonus ' + eur(d.bonus));
      const firstYear = parts.length ? parts.join(' + ') + ' = ' + eur(firstWithSubsidy.stateSubsidy) : eur(firstWithSubsidy.stateSubsidy);
      filled = 'Jahr 1: ' + firstYear + '   +  …  +   Jahr ' + years + ': ' + eur(lastWithSubsidy.stateSubsidy) + '   =   ' + eur(product.totalSubsidies);
    } else {
      filled = '0 € (keine Zulagen bei diesem Produkt)';
    }
    return {
      name: 'Staatliche Zulagen gesamt',
      formula: 'Σ (Grundzulage + Kinderzulage + ggf. Berufseinsteigerbonus) über alle Jahre',
      filled,
      result: eur(product.totalSubsidies),
      explanation: 'Gilt nur für das Altersvorsorgedepot (und historisch für Riester). Nur Vollverträge mit Mindesteigenbeitrag erhalten die vollen Zulagen. Die Zulagen werden direkt ins Depot eingezahlt und erwirtschaften selbst Rendite.'
    };
  },

  totalTaxDeduction(product) {
    if (!product) return null;
    const snaps = product.snapshots || [];
    const first = snaps.find(s => (s.taxDeduction || 0) > 0);
    const last = [...snaps].reverse().find(s => (s.taxDeduction || 0) > 0);
    const years = snaps.length;
    let filled;
    if (first && last) {
      filled = 'Jahr 1: ' + eur(first.taxDeduction) + '   +  …  +   Jahr ' + years + ': ' + eur(last.taxDeduction) + '   =   ' + eur(product.totalTaxDeduction || 0);
    } else {
      filled = '0 € (keine steuerliche Absetzbarkeit bei diesem Produkt)';
    }
    return {
      name: 'Steuerersparnis Ansparphase gesamt',
      formula: 'Σ (Jahresbeitrag × persönlicher Steuersatz) über alle Jahre',
      filled,
      result: eur(product.totalTaxDeduction || 0),
      explanation: 'Gilt für absetzbare Produkte: AVD (Sonderausgaben), Rürup (zu 100 %), Riester (Günstigerprüfung). Bei Rentenversicherung und ETF-Sparplan fällt KEINE Steuerersparnis an — die Beiträge sind aus bereits versteuertem Einkommen. Im Alter wird allerdings nachgelagert besteuert.'
    };
  },

  totalCosts(product, years) {
    if (!product) return null;
    const snaps = product.snapshots || [];
    const first = snaps[0];
    const last = snaps[snaps.length - 1];
    let filled;
    if (first && last && snaps.length >= 2) {
      filled = 'Jahr 1: ' + eur(first.costs) + '   +  …  +   Jahr ' + snaps.length + ': ' + eur(last.costs) + '   =   ' + eur(product.totalCosts);
    } else if (first) {
      filled = eur(first.costs) + ' × ' + years + ' Jahre ≈ ' + eur(product.totalCosts);
    } else {
      filled = eur(product.totalCosts);
    }
    return {
      name: 'Gesamtkosten ' + product.product,
      formula: 'Σ jährliche Verwaltungs- und Fondskosten',
      filled,
      result: eur(product.totalCosts),
      explanation: 'Verbraucherzentrale-Hinweis: Kosten sind der wichtigste Faktor bei der Altersvorsorge-Entscheidung. Schon 0,5 % p.a. mehr Kosten bedeuten über 35 Jahre oft fünfstellige Einbußen. Vergleiche immer auch mit dem günstigen ETF-Sparplan (ca. 0,2 %).'
    };
  },

  totalTax(product) {
    if (!product) return null;
    const vp = product.totalVorabpauschaleTax || 0;
    const payout = product.payoutTax || 0;
    const short = product.productShort;
    let filled;
    if (short === 'ETF') {
      filled = 'Vorabpauschale ' + eur(vp) + ' (Ansparphase) + Abgeltungssteuer ' + eur(payout) + ' (Verkauf) = ' + eur(product.totalTax);
    } else if (short === 'RV') {
      filled = '0 € (keine Vorabpauschale) + ' + eur(payout) + ' (Halbeinkünfte bei Auszahlung) = ' + eur(product.totalTax);
    } else if (short === 'AVD' || short === 'Riester') {
      filled = '0 € (steuerfreie Ansparphase) + ' + eur(payout) + ' (gesamtes Kapital × pers. Steuersatz im Alter) = ' + eur(product.totalTax);
    } else if (short === 'Rürup') {
      filled = '0 € (steuerfreie Ansparphase) + ' + eur(payout) + ' (20 Jahre Rentenbezug × Besteuerungsanteil × pers. Steuersatz) = ' + eur(product.totalTax);
    } else {
      filled = eur(vp) + ' + ' + eur(payout) + ' = ' + eur(product.totalTax);
    }
    return {
      name: 'Gesamtsteuern ' + product.product,
      formula: 'Steuern Ansparphase + Steuern bei Auszahlung',
      filled,
      result: eur(product.totalTax),
      explanation: 'Jedes Produkt hat eine eigene Steuerlogik: ETF-Sparplan zahlt laufend Vorabpauschale + einmalige Abgeltungssteuer beim Verkauf. Rentenversicherung nutzt das Halbeinkünfteverfahren (nur 42,5 % der Erträge steuerpflichtig). AVD, Rürup und Riester sind nachgelagert, d.h. das gesamte Kapital wird mit deinem persönlichen Einkommensteuersatz im Rentenalter versteuert.'
    };
  },

  netPayout(product) {
    if (!product) return null;
    const portfolio = product.portfolioAtRetirement || 0;
    const payoutTax = product.payoutTax || 0;
    const deduction = product.totalTaxDeduction || 0;
    let filled;
    if (deduction > 0) {
      filled = eur(portfolio) + ' (Kapital bei Rente) − ' + eur(payoutTax) + ' (Steuer) + ' + eur(deduction) + ' (Steuerersparnis bereits erhalten) = ' + eur(product.netPayout);
    } else {
      filled = eur(portfolio) + ' (Kapital bei Rente) − ' + eur(payoutTax) + ' (Steuer) = ' + eur(product.netPayout);
    }
    return {
      name: 'Netto-Auszahlung ' + product.product,
      formula: 'Portfolio bei Rente − Auszahlungssteuer (+ ggf. bereits erhaltene Steuerersparnis)',
      filled,
      result: eur(product.netPayout),
      explanation: 'Das ist der entscheidende Vergleichswert: was nach allen Kosten und Steuern tatsächlich bei dir ankommt. Beim AVD und Riester wird die Steuerersparnis der Ansparphase (aus den Sonderausgaben) rechnerisch hinzugezählt, weil sie im Laufe der Jahre schon real zurückgeflossen ist.'
    };
  },

  /** Monatliche Bruttorente Rürup (lebenslang) */
  monthlyPensionGross(product) {
    if (!product || !product.monthlyPensionGross) return null;
    const portfolio = product.portfolioAtRetirement || 0;
    const factor = product.guaranteedPensionFactor || (portfolio > 0 ? (product.monthlyPensionGross * 10000) / portfolio : 0);
    return {
      name: 'Monatliche Bruttorente Rürup',
      formula: 'Kapital bei Rentenbeginn × Rentenfaktor / 10.000',
      filled: eur(portfolio) + ' × ' + num(factor, 2) + ' € / 10.000 € = ' + eur(product.monthlyPensionGross),
      result: eur(product.monthlyPensionGross),
      explanation: 'Rürup ist eine lebenslange Leibrente — das angesparte Kapital wird verrentet. Der Rentenfaktor (Euro Rente pro 10.000 € Kapital) ist im Vertrag garantiert und variiert stark zwischen den Anbietern (20–32 €). Die tatsächliche Netto-Auszahlung hängt von der Lebenserwartung und dem Besteuerungsanteil im Rentenbeginnjahr ab.'
    };
  },

  /** Beste Option — höchste Netto-Auszahlung aller Produkte */
  bestOption(results) {
    if (!results || !results.best) return null;
    const all = ['etf', 'rv', 'avd', 'ruerup', 'riester']
      .filter(k => results[k])
      .map(k => ({ name: results[k].productShort, v: results[k].netPayout }));
    const ranking = all.sort((a, b) => b.v - a.v).map(x => x.name + ' ' + eur(x.v)).join('   >   ');
    return {
      name: 'Beste Option',
      formula: 'max(Netto-Auszahlung aller aktivierten Produkte)',
      filled: 'max(' + ranking + ') = ' + results.best.productShort + ' mit ' + eur(results.best.netPayout),
      result: results.best.product + ' mit ' + eur(results.best.netPayout),
      explanation: 'Vergleicht alle aktivierten Produkte rein nach der Netto-Auszahlung am Ende. Die Differenz zur zweitbesten Option zeigt, wie entscheidend die Wahl ist. Beachte: Netto-Auszahlung allein ist nicht alles — Flexibilität (ETF), Insolvenzschutz (RV, Rürup), Hinterbliebenenschutz und Vererbbarkeit unterscheiden sich ebenfalls stark.'
    };
  },

  /** Kombi-Strategie Netto-Auszahlung */
  kombiNetPayout(kombi, inp) {
    if (!kombi) return null;
    const avdNet = kombi.avdNet != null ? kombi.avdNet : (kombi.netPayoutAvd || 0);
    const zweitNet = kombi.secondNet != null ? kombi.secondNet : (kombi.netPayoutSecondary || (kombi.netPayout - avdNet));
    const filled = avdNet > 0 || zweitNet > 0
      ? eur(avdNet) + ' (AVD, 150 €/Monat) + ' + eur(zweitNet) + ' (Zweitprodukt, Rest) = ' + eur(kombi.netPayout)
      : kombi.splitInfo + ' → ' + eur(kombi.netPayout);
    return {
      name: 'Kombi-Strategie Netto-Auszahlung',
      formula: 'Netto AVD (bei 150 €/Monat mit vollen Zulagen) + Netto Zweitprodukt (bei Restrate)',
      filled,
      result: eur(kombi.netPayout),
      explanation: 'Bei einer Sparrate über 150 €/Monat lässt sich die geförderte AVD-Quote (max. 1.800 €/Jahr Eigenbeitrag) nicht voll ausnutzen. Die Kombi-Strategie lenkt genau 150 €/Monat ins AVD (volle Zulagen + Sonderausgabenabzug) und den Überschuss ins jeweils rechnerisch beste Zweitprodukt. So werden Zulagen UND höhere Renditen ohne Beitragsdeckel kombiniert.'
    };
  },

  // ========================================================================
  // ALTERSVORSORGE — Steuervergleich-Tab
  // ========================================================================
  accumulationTax(product) {
    if (!product) return null;
    const snaps = product.snapshots || [];
    const first = snaps.find(s => (s.vorabpauschaleTax || 0) > 0);
    const last = [...snaps].reverse().find(s => (s.vorabpauschaleTax || 0) > 0);
    let filled;
    if (first && last && product.productShort === 'ETF') {
      filled = 'Jahr ' + first.year + ': ' + eur(first.vorabpauschaleTax) + '   +  …  +   Jahr ' + last.year + ': ' + eur(last.vorabpauschaleTax) + '   =   ' + eur(product.totalVorabpauschaleTax || 0);
    } else {
      filled = '0 € — keine Steuer in der Ansparphase (Steuerstundung bei ' + (product.productShort || 'diesem Produkt') + ')';
    }
    return {
      name: 'Steuern während Ansparphase — ' + product.product,
      formula: 'Σ Vorabpauschale-Steuern über alle Jahre',
      filled,
      result: eur(product.totalVorabpauschaleTax || 0),
      explanation: 'Nur der ETF-Sparplan zahlt in der Ansparphase Steuern (Vorabpauschale auf unrealisierte Gewinne). Rentenversicherung, AVD, Rürup und Riester arbeiten steuerfrei — das ist der "Steuerstundungseffekt", der langfristig ca. 5–15 % mehr Endkapital ermöglicht.'
    };
  },

  payoutTax(product) {
    if (!product) return null;
    const s = product.productShort;
    const portfolio = product.portfolioAtRetirement || 0;
    const gain = product.totalGain || 0;
    const payout = product.payoutTax || 0;
    let filled;
    if (s === 'ETF') {
      const cumVP = product.cumulativeVP || 0;
      filled = '(Gewinn ' + eur(gain) + ' × 0,70 (Teilfreistellung) − Anrechnungstopf ' + eur(cumVP * 0.7) + ' − Freibetrag) × 26,375 % = ' + eur(payout);
    } else if (s === 'RV') {
      filled = 'Gewinn ' + eur(gain) + ' × 0,85 × 0,50 × pers. Steuersatz im Alter = ' + eur(payout) + '   (≙ 42,5 % steuerpflichtig)';
    } else if (s === 'AVD' || s === 'Riester') {
      const effRate = portfolio > 0 ? (payout / portfolio) * 100 : 0;
      filled = 'Kapital ' + eur(portfolio) + ' × ' + pct(effRate) + ' (pers. Steuersatz im Alter) = ' + eur(payout);
    } else if (s === 'Rürup') {
      const besteuerung = product.besteuerungsanteil || 0;
      const yearlyPension = product.yearlyPensionGross || 0;
      filled = 'Jahresrente ' + eur(yearlyPension) + ' × ' + pct(besteuerung * 100, 1) + ' (Besteuerungsanteil) × pers. Steuersatz × 20 Jahre = ' + eur(payout);
    } else {
      filled = eur(payout);
    }
    return {
      name: 'Steuer bei Auszahlung — ' + product.product,
      formula: s === 'ETF'
        ? '(Gewinn × 70 % (Teilfreistellung) − Anrechnungstopf − Freibetrag) × 26,375 %'
        : s === 'RV'
        ? 'Gewinn × 85 % (Teilfreistellung) × 50 % (Halbeinkünfte) × persönl. Steuersatz im Alter'
        : s === 'AVD' || s === 'Riester'
        ? 'Gesamtes Kapital × persönl. Steuersatz im Alter (nachgelagerte Besteuerung)'
        : s === 'Rürup'
        ? 'Jahresrente × gesetzlicher Besteuerungsanteil × persönl. Steuersatz × Jahre'
        : 'Siehe Produkt',
      filled,
      result: eur(payout),
      explanation: product.productShort === 'ETF'
        ? 'Beim Verkauf wird der realisierte Gewinn mit 26,375 % Abgeltungssteuer versteuert. Vorher werden 30 % der Gewinne teilfreigestellt, die in der Ansparphase bereits gezahlte Vorabpauschale-Steuer angerechnet und der Sparerpauschbetrag (1.000 €) abgezogen.'
        : product.productShort === 'RV'
        ? 'Wenn der Vertrag mindestens 12 Jahre läuft und die Auszahlung ab 62 erfolgt, gilt das Halbeinkünfteverfahren: Nur 50 % der Gewinne sind steuerpflichtig — und davon nochmal nur 85 % (Teilfreistellung für Fondspolicen). Effektiv werden also nur 42,5 % der Erträge mit dem persönlichen Einkommensteuersatz versteuert.'
        : product.productShort === 'AVD' || product.productShort === 'Riester'
        ? 'Bei absetzbaren Produkten mit staatlicher Förderung erfolgt die Besteuerung nachgelagert: Das gesamte Kapital (nicht nur die Gewinne!) wird mit deinem persönlichen Einkommensteuersatz im Rentenalter versteuert. Der Vorteil lohnt sich nur, wenn dein Steuersatz im Alter deutlich niedriger ist als heute.'
        : product.productShort === 'Rürup'
        ? 'Die Rürup-Rente wird nachgelagert besteuert. Der Besteuerungsanteil hängt vom Rentenbeginnjahr ab: 2025: 83,5 %, +0,5 pp pro Jahr, bis 100 % in 2058. Dieser Anteil der Rente wird mit deinem persönlichen Steuersatz im Alter belastet.'
        : ''
    };
  }
};

// ========================================================================
// TRADING COCKPIT
// ========================================================================
export const tc = {

  // ===== KPI-Karten =====
  grossGain(pos, pnl) {
    return {
      name: 'Brutto-Gewinn',
      formula: 'Anzahl × (Verkaufskurs − Kaufkurs) − Kaufgebühr − Verkaufsgebühr',
      filled: num(pos.shares) + ' × (' + eur(pos.currentPrice) + ' − ' + eur(pos.buyPrice) + ') − ' + eur(pos.brokerFee) + ' − ' + eur(pos.brokerFee) + ' = ' + eur(pnl.grossGain),
      result: eur(pnl.grossGain),
      explanation: 'Der Brutto-Gewinn ist der Gewinn vor Steuern, aber bereits nach Abzug der Kauf- und Verkaufsgebühr. Bei einem Verlust ist dieser Wert negativ — dann fällt keine Steuer an, und die Abgeltungssteuer-Berechnung entfällt.'
    };
  },

  totalTax(pnl) {
    return {
      name: 'Gesamtsteuerbelastung',
      formula: 'Abgeltungssteuer (25 %) + Solidaritätszuschlag (5,5 % davon) + ggf. Kirchensteuer',
      filled: eur(pnl.abgeltungssteuer) + ' (AbgSt) + ' + eur(pnl.solidaritaetszuschlag) + ' (Soli) + ' + eur(pnl.kirchensteuer) + ' (KiSt) = ' + eur(pnl.totalTax),
      result: eur(pnl.totalTax),
      explanation: 'Auf Kapitalerträge in Deutschland greift die Abgeltungssteuer (pauschal 25 %). Dazu kommen 5,5 % Solidaritätszuschlag auf die Abgeltungssteuer (ergibt 1,375 % auf den Gewinn) und ggf. 8–9 % Kirchensteuer. Ohne Kirchensteuer ergibt das einen effektiven Steuersatz von 26,375 %. Vorher wird der Sparerpauschbetrag (1.000 €/Jahr) abgezogen.'
    };
  },

  netGain(pnl) {
    return {
      name: 'Netto-Gewinn',
      formula: 'Brutto-Gewinn − Gesamtsteuer',
      filled: eur(pnl.grossGain) + ' − ' + eur(pnl.totalTax) + ' = ' + eur(pnl.netGain),
      result: eur(pnl.netGain),
      explanation: 'Das ist, was nach allen Gebühren und Steuern tatsächlich auf deinem Konto landet. Der wichtigste Wert für die Beurteilung einer Position.'
    };
  },

  taxDrag(pnl, taxDragPercent) {
    if (pnl.grossGain <= 0) return {
      name: 'Tax Drag',
      formula: 'Steuer / Brutto-Gewinn × 100',
      filled: 'Bei Verlust oder Gewinn = 0 € ist der Tax Drag nicht definiert (keine Steuer auf Verluste) → 0 %',
      result: '0 %',
      explanation: 'Der Tax Drag zeigt, wie viel Prozent deines Gewinns an den Staat gehen. Bei Verlusten gibt es keinen Tax Drag (keine Steuer auf Verluste).'
    };
    return {
      name: 'Tax Drag',
      formula: 'Gesamtsteuer / Brutto-Gewinn × 100',
      filled: eur(pnl.totalTax) + ' / ' + eur(pnl.grossGain) + ' × 100 = ' + pct(taxDragPercent),
      result: pct(taxDragPercent),
      explanation: 'Der Tax Drag beschreibt, welcher Anteil deines Brutto-Gewinns durch Steuern verloren geht. Je kleiner der Gewinn im Verhältnis zu den fixen Gebühren, desto höher kann der effektive Tax Drag sein. Ein Drag von über 30 % ist ein Warnsignal, dass sich der Verkauf steuerlich nicht optimal lohnt.'
    };
  },

  // ===== Break-Even Rebuy =====
  breakEvenRebuy(pos, breakEvenRebuy) {
    return {
      name: 'Break-Even-Rebuy-Kurs',
      formula: '(Netto-Erlös − Rückkaufgebühr) / Anzahl Aktien',
      filled: '(' + eur(breakEvenRebuy.netProceeds) + ' − ' + eur(pos.brokerFee) + ') / ' + num(pos.shares) + ' = ' + eur(breakEvenRebuy.breakEvenRebuyPrice),
      result: eur(breakEvenRebuy.breakEvenRebuyPrice),
      explanation: 'Der Rebuy-Kurs ist der Preis, auf den die Aktie fallen muss, damit du nach Verkauf (inkl. Steuern und Gebühren) genau die gleiche Stückzahl wieder kaufen kannst. Liegt er weit unter dem aktuellen Kurs, ist ein Verkauf mit späterem Rückkauf unwirtschaftlich. Die Berechnung berücksichtigt Abgeltungssteuer, Sparerpauschbetrag und zwei Gebühren (Verkauf + Rückkauf).'
    };
  },

  requiredDrop(breakEvenRebuy, currentPrice) {
    return {
      name: 'Benötigter Kursrückgang für Rebuy',
      formula: '(aktueller Kurs − Rebuy-Kurs) / aktueller Kurs × 100',
      filled: '(' + eur(currentPrice) + ' − ' + eur(breakEvenRebuy.breakEvenRebuyPrice) + ') / ' + eur(currentPrice) + ' × 100 = ' + pct(breakEvenRebuy.requiredDropPercent),
      result: pct(breakEvenRebuy.requiredDropPercent),
      explanation: 'Um wie viel Prozent der Kurs fallen muss, damit der Rebuy gewinnbringend ist. Vergleiche diesen Wert mit der durchschnittlichen Wochen-Volatilität der Aktie: liegt der benötigte Rückgang deutlich über der typischen Schwankung, ist die Rebuy-Strategie unrealistisch.'
    };
  },

  // ===== Zielkurs =====
  targetSellPrice(pos, targetCalc) {
    if (!targetCalc || !targetCalc.valid) return null;
    const totalCost = pos.shares * pos.buyPrice + pos.brokerFee;
    const reqGross = targetCalc.requiredGrossGain || 0;
    return {
      name: 'Benötigter Verkaufskurs',
      formula: '(Kaufkosten + benötigter Bruttogewinn) / Anzahl Aktien',
      filled: '(' + eur(totalCost) + ' + ' + eur(reqGross) + ') / ' + num(pos.shares) + ' = ' + eur(targetCalc.targetSellPrice),
      result: eur(targetCalc.targetSellPrice),
      explanation: 'Rückwärtsrechnung vom gewünschten Netto-Gewinn zum nötigen Verkaufspreis: Der Wunschgewinn plus Verkaufsgebühr wird durch (1 − effektiver Steuersatz) geteilt, soweit er den Sparerpauschbetrag überschreitet. Ergebnis + Kaufkosten, dividiert durch die Stückzahl, ergibt den Kurs, bei dem nach Abzug aller Steuern und Gebühren genau dein Wunschgewinn übrig bleibt.'
    };
  },

  requiredGainFromCurrent(pos, targetCalc) {
    if (!pos.currentPrice || pos.currentPrice <= 0) return null;
    const fromCurrent = ((targetCalc.targetSellPrice - pos.currentPrice) / pos.currentPrice) * 100;
    return {
      name: 'Kursanstieg vom aktuellen Kurs',
      formula: '(Zielkurs − aktueller Kurs) / aktueller Kurs × 100',
      filled: '(' + eur(targetCalc.targetSellPrice) + ' − ' + eur(pos.currentPrice) + ') / ' + eur(pos.currentPrice) + ' × 100 = ' + pct(fromCurrent),
      result: pct(fromCurrent),
      explanation: 'Um wieviel Prozent die Aktie vom aktuellen Kurs steigen muss, damit dein Wunschgewinn erreicht wird. Je höher der Wert, desto länger oder volatiler muss der Markt dafür steigen — bewerte ihn immer im Kontext der historischen Volatilität.'
    };
  },

  // ===== Risk/Reward =====
  rrRatio(pos) {
    const current = pos.currentPrice || pos.buyPrice;
    const risk = current - pos.stopLoss;
    const reward = pos.targetPrice - current;
    const ratio = risk > 0 ? reward / risk : 0;
    return {
      name: 'Chancen-Risiko-Verhältnis (R:R)',
      formula: '(Zielkurs − aktueller Kurs) / (aktueller Kurs − Stop-Loss)',
      filled: '(' + eur(pos.targetPrice) + ' − ' + eur(current) + ') / (' + eur(current) + ' − ' + eur(pos.stopLoss) + ') = ' + eur(reward) + ' / ' + eur(risk) + ' = 1 : ' + num(ratio, 2),
      result: '1 : ' + num(ratio, 2),
      explanation: 'Das R:R vergleicht den möglichen Gewinn mit dem möglichen Verlust. Ab 1 : 2 gilt es als akzeptabel, 1 : 3 als sehr gut. Unter 1 : 1 ist der mögliche Verlust größer als der mögliche Gewinn — langfristig verlierst du so, selbst wenn mehr als die Hälfte deiner Trades aufgeht.'
    };
  },

  // ===== Volatilität =====
  dailyVol(vola) {
    const n = vola.dataPoints || '?';
    return {
      name: 'Tägliche Volatilität',
      formula: 'σ = √( Σ (r − r̄)² / (n−1) )',
      filled: 'Standardabweichung über ' + n + ' Tagesrenditen = ' + pct(vola.dailyVol * 100),
      result: pct(vola.dailyVol * 100),
      explanation: 'Die tägliche Volatilität ist die Standardabweichung der Tagesrenditen über den Datenzeitraum. Sie sagt aus: innerhalb eines Tages schwankt die Aktie im Schnitt um diesen Prozentsatz um ihren Mittelwert. Eine Vola von 2 % bedeutet: in ca. 68 % der Tage liegt der Kurs innerhalb von ±2 % der Vorhersage.'
    };
  },

  weeklyVol(vola) {
    return {
      name: 'Wöchentliche Volatilität',
      formula: 'tägliche Vola × √5',
      result: pct(vola.weeklyVol * 100),
      filled: pct(vola.dailyVol * 100) + ' × √5 = ' + pct(vola.dailyVol * 100) + ' × ' + num(Math.sqrt(5), 3) + ' = ' + pct(vola.weeklyVol * 100),
      explanation: 'Volatilität skaliert mit der Wurzel der Zeit (Square-Root-of-Time-Rule). Bei 5 Börsentagen pro Woche ergibt sich die Wochen-Vola aus der Tages-Vola mal √5. Das ist eine Standard-Konvention der Finanzmathematik und gilt für stationäre Renditen.'
    };
  },

  annualVol(vola) {
    return {
      name: 'Annualisierte Volatilität',
      formula: 'tägliche Vola × √252',
      filled: pct(vola.dailyVol * 100) + ' × √252 = ' + pct(vola.dailyVol * 100) + ' × ' + num(Math.sqrt(252), 2) + ' = ' + pct(vola.annualVol * 100),
      result: pct(vola.annualVol * 100),
      explanation: 'Die annualisierte Volatilität ist der Branchen-Standard für den Vergleich von Aktien. Sie nutzt die Quadratwurzel-Regel mit 252 Handelstagen pro Jahr. Eine ann. Vola von 20 % ist typisch für Blue-Chips (DAX ca. 18–22 %, S&P 500 ca. 15–20 %).'
    };
  },

  atr(vola) {
    return {
      name: 'ATR (Average True Range, 14 Tage)',
      formula: 'Mittelwert der True Range (14 Tage): TR = max(H−L, |H−C_prev|, |L−C_prev|)',
      filled: 'ATR(14) = ' + eur(vola.atr) + '   ≙   ' + pct(vola.atrPercent) + ' vom Kurs',
      result: pct(vola.atrPercent),
      explanation: 'Die ATR misst die durchschnittliche absolute Kursbewegung pro Tag und berücksichtigt auch Gaps (Kurssprünge zwischen Schlusskurs und nächstem Eröffnungskurs). Sie wird für Stop-Loss-Größen verwendet: Ein SL von 2× ATR unter dem Einstiegskurs liegt in der Regel außerhalb des normalen Marktrauschens.'
    };
  },

  // ===== Sparplan-Vergleich =====
  dcaShares(dca, monthlyAmount) {
    if (!dca || !dca.dca) return null;
    const months = dca.dca.months || 0;
    const avg = dca.dca.avgPrice || 0;
    const totalCost = dca.dca.totalCost || (monthlyAmount * months);
    return {
      name: 'Gesamt-Stückzahl Sparplan',
      formula: 'Σ (Monatsrate / Monatskurs)',
      filled: eur(totalCost) + ' (' + eur(monthlyAmount) + ' × ' + months + ' Monate) / Ø-Kurs ' + eur(avg) + ' = ' + num(dca.dca.totalShares, 2) + ' Anteile',
      result: num(dca.dca.totalShares, 2) + ' Anteile',
      explanation: 'Beim Cost-Average-Effekt kauft der Sparplan jeden Monat unabhängig vom Kurs. Bei niedrigen Kursen werden mehr Anteile erworben, bei hohen weniger. Über lange Zeiträume glättet das die Einstiegskosten.'
    };
  },

  dcaOpportunity(dca) {
    if (!dca) return null;
    const winner = dca.winner === 'sparplan' ? 'Sparplan' : 'Timing';
    const dcaProfit = dca.dca ? dca.dca.profit : 0;
    const timingProfit = dca.timing ? dca.timing.profit : 0;
    return {
      name: 'Opportunitätskosten',
      formula: '|Netto-Gewinn Sparplan − Netto-Gewinn Einmalkauf|',
      filled: '|' + eur(dcaProfit) + ' (Sparplan) − ' + eur(timingProfit) + ' (Einmalkauf)| = ' + eur(dca.opportunityCost) + ' zugunsten ' + winner,
      result: eur(dca.opportunityCost),
      explanation: 'Die Opportunitätskosten zeigen, was die jeweils schlechtere Strategie „verschenkt" hätte. Ein positiver Wert zugunsten des Sparplans bedeutet: Das aktive Timing war in diesem konkreten Zeitraum die schlechtere Wahl. Aber: das ist nur ein Rückblick. Statistisch schlagen ETF-Sparpläne aktive Einstiege in ca. 70 % aller Fälle.'
    };
  }
};

// Global verfügbar machen (für Alpine-Templates)
if (typeof window !== 'undefined') {
  window.calc = { av, tc };
}
