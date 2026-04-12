/**
 * Glossar deutscher Finanz-Fachbegriffe für Tooltips
 */

export const GLOSSARY = {
  'abgeltungssteuer': {
    term: 'Abgeltungssteuer',
    short: 'Pauschale Steuer auf Kapitalerträge',
    long: 'Die Abgeltungssteuer ist eine pauschale Steuer von 25% auf alle Kapitalerträge in Deutschland (Zinsen, Dividenden, Kursgewinne). Sie wird direkt von der Bank/dem Broker einbehalten.'
  },
  'solidaritaetszuschlag': {
    term: 'Solidaritätszuschlag',
    short: '5,5% Zuschlag auf die Abgeltungssteuer',
    long: 'Der Solidaritätszuschlag (kurz: Soli) beträgt 5,5% der Abgeltungssteuer. Auf den Gewinn bezogen sind das zusätzliche 1,375%. Er wird automatisch zusammen mit der Abgeltungssteuer erhoben.'
  },
  'kirchensteuer': {
    term: 'Kirchensteuer',
    short: '8-9% Zuschlag für Kirchenmitglieder',
    long: 'Kirchenmitglieder zahlen zusätzlich 8% (Bayern, Baden-Württemberg) oder 9% (alle anderen Bundesländer) der Abgeltungssteuer als Kirchensteuer. Im Gegenzug wird die Abgeltungssteuer-Basis leicht reduziert.'
  },
  'sparerpauschbetrag': {
    term: 'Sparerpauschbetrag',
    short: '1.000 EUR steuerfreie Kapitalerträge pro Jahr',
    long: 'Jeder Person steht ein Sparerpauschbetrag von 1.000 EUR pro Jahr zu (2.000 EUR für Ehepaare). Kapitalerträge bis zu diesem Betrag sind steuerfrei. Der Betrag wird über einen Freistellungsauftrag bei der Bank aktiviert.'
  },
  'freistellungsauftrag': {
    term: 'Freistellungsauftrag',
    short: 'Antrag an die Bank für steuerfreie Erträge',
    long: 'Mit einem Freistellungsauftrag weisen Sie Ihre Bank an, Kapitalerträge bis zum Sparerpauschbetrag (1.000 EUR) nicht zu besteuern. Sie können den Betrag auf mehrere Banken aufteilen.'
  },
  'fremdkostenpauschale': {
    term: 'Fremdkostenpauschale',
    short: 'Handelsplatzgebühr pro Trade',
    long: 'Die Fremdkostenpauschale ist eine Gebühr, die Neobroker wie Trade Republic für jeden Kauf oder Verkauf erheben (z.B. 1,00 EUR). Sie deckt die Kosten des Handelsplatzes ab.'
  },
  'taxdrag': {
    term: 'Tax Drag',
    short: 'Bremseffekt der Steuer auf die Rendite',
    long: 'Tax Drag beschreibt, wie stark die Steuerbelastung Ihre effektive Rendite reduziert. Je höher der Tax Drag, desto mehr Ihres Bruttogewinns geht an den Staat. Bei kleinen Gewinnen kann der Tax Drag überproportional hoch sein.'
  },
  'breakeven': {
    term: 'Break-Even',
    short: 'Gewinnschwelle - ab hier wird es profitabel',
    long: 'Der Break-Even-Kurs ist der Preis, ab dem ein Verkauf nach Abzug aller Kosten und Steuern Gewinn bringt. Beim Rebuy-Break-Even ist es der Kurs, zu dem Sie nach einem Verkauf dieselbe Anzahl Aktien zurückkaufen können.'
  },
  'fifo': {
    term: 'FIFO-Prinzip',
    short: 'First In, First Out - Älteste Aktien zuerst',
    long: 'In Deutschland gilt das FIFO-Prinzip: Beim Verkauf werden steuerlich die zuerst gekauften Aktien zuerst verkauft. Das ist relevant, wenn Sie eine Aktie zu verschiedenen Zeitpunkten und Kursen gekauft haben.'
  },
  'volatilitaet': {
    term: 'Volatilität',
    short: 'Maß für Kursschwankungen',
    long: 'Die Volatilität misst, wie stark ein Aktienkurs schwankt. Eine hohe Volatilität bedeutet große Kursausschläge nach oben und unten. Sie wird als Standardabweichung der täglichen Kursänderungen berechnet.'
  },
  'atr': {
    term: 'ATR (Average True Range)',
    short: 'Durchschnittliche tägliche Schwankungsbreite',
    long: 'Die Average True Range (ATR) misst die durchschnittliche tägliche Schwankungsbreite einer Aktie über die letzten 14 Tage. Sie hilft einzuschätzen, welche Kursbewegungen "normal" sind.'
  },
  'sparplan': {
    term: 'Sparplan (DCA)',
    short: 'Regelmäßig gleiche Beträge investieren',
    long: 'Ein Sparplan (Dollar Cost Averaging) bedeutet, regelmäßig einen festen Betrag in eine Aktie zu investieren - unabhängig vom Kurs. Man kauft automatisch mehr Aktien wenn der Kurs niedrig ist und weniger wenn er hoch ist.'
  },
  'riskreward': {
    term: 'Risk/Reward-Ratio',
    short: 'Verhältnis von Risiko zu Chance',
    long: 'Das Risk/Reward-Ratio zeigt das Verhältnis zwischen dem potenziellen Verlust (bis zum Stop-Loss) und dem potenziellen Gewinn (bis zum Zielkurs). Ein Ratio von 1:3 bedeutet: Für jeden Euro Risiko gibt es 3 Euro Gewinnchance.'
  },
  'stoploss': {
    term: 'Stop-Loss',
    short: 'Automatischer Verkauf bei Kursverlust',
    long: 'Ein Stop-Loss ist eine Verkaufsorder, die automatisch ausgelöst wird, wenn der Kurs unter einen bestimmten Wert fällt. Er begrenzt den maximalen Verlust einer Position.'
  }
};

/** Gibt die Kurz-Erklärung für einen Begriff zurück */
export function getTooltip(termId) {
  return GLOSSARY[termId]?.long || '';
}

/** Gibt alle Glossar-Einträge als Array zurück */
export function getAllTerms() {
  return Object.values(GLOSSARY);
}
