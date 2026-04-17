/**
 * ETF-Rentenversicherung Anbieter mit realen Kostendaten (Stand 2025/2026)
 * Quellen: Stiftung Warentest 05/2025, Anbieter-Websites, Finanztip
 */
export const PROVIDERS = [
// (Rürup-Anbieter am Ende der Datei exportiert, Riester am Ende)
  {
    id: 'alte-leipziger',
    name: 'Alte Leipziger HFR10 (Nettotarif)',
    totalCostRate: 0.0064,
    etfTerIncluded: true,
    type: 'netto',
    rating: 'Testsieger Stiftung Warentest 2025',
    notes: 'Günstigster Nettotarif am Markt. Abschluss über Honorarberater. 50+ ETFs verfügbar.',
    fixedCostYear: 36,
    variableCostRate: 0.003
  },
  {
    id: 'lv1871',
    name: 'LV1871 MeinPlan',
    totalCostRate: 0.012,
    etfTerIncluded: false,
    type: 'netto',
    rating: 'Gut (Stiftung Warentest 2025)',
    notes: 'Solider Mittelfeldtarif. 160+ Fonds (46 ETFs). Ab 25 €/Monat. Flexible Entnahmen.',
    fixedCostYear: 0,
    variableCostRate: 0.012
  },
  {
    id: 'growlife',
    name: 'growLife (growney)',
    totalCostRate: 0.0088,
    etfTerIncluded: true,
    type: 'digital',
    rating: 'Digitaler Robo-Advisor',
    notes: 'Automatisches Rebalancing. 1,5% Einstiegsgebühr auf Beiträge. Günstige ETFs (0,06–0,22%).',
    fixedCostYear: 0,
    variableCostRate: 0.0057
  }
];

/**
 * Rürup-Rente (Basisrente, Schicht 1) Anbieter
 * Quellen: FragFina ETF-Rürup-Test 2025, Finanztip, Stiftung Warentest
 * totalCostRate: Effektivkosten p.a. (Verwaltung + Fondskosten)
 * guaranteedPensionFactor: garantierter Rentenfaktor € pro 10.000 € Kapital/Monat
 */
export const RUERUP_PROVIDERS = [
  {
    id: 'alte-leipziger-ruerup',
    name: 'Alte Leipziger BasisRente (Netto)',
    totalCostRate: 0.0075,
    etfTerIncluded: true,
    type: 'netto',
    guaranteedPensionFactor: 30.5,
    rating: 'Testsieger FragFina 2025 (Note 1,35)',
    notes: 'Guter Rentenfaktor, flexible Fondsauswahl, Nettopolice über Honorarberater.'
  },
  {
    id: 'mypension-ruerup',
    name: 'myPension ETF-Rürup',
    totalCostRate: 0.009,
    etfTerIncluded: true,
    type: 'digital',
    guaranteedPensionFactor: 28.5,
    rating: 'Digitaler Anbieter',
    notes: 'Online-Abschluss, schlanke Kostenstruktur, automatisches Rebalancing.'
  },
  {
    id: 'klassisch-ruerup',
    name: 'Klassische Rürup-Versicherung (Durchschnitt)',
    totalCostRate: 0.019,
    etfTerIncluded: true,
    type: 'klassisch',
    guaranteedPensionFactor: 27.0,
    rating: 'Stiftung Warentest: meist unterdurchschnittlich',
    notes: '1% Garantiezins seit 2025. Verbraucherzentrale rät vom Neuabschluss klassischer Verträge ab.'
  }
];

/**
 * Riester-Rente Anbieter (Stand 2025/2026)
 * WICHTIG: Verbraucherzentrale/Finanztip raten seit 2024 vom Neuabschluss ab.
 * Bestandsverträge: Beitragsfrei stellen empfohlen bis Reform (2027) klar ist.
 * Ab 01.01.2027 wird Riester durch Altersvorsorgedepot ersetzt.
 */
export const RIESTER_PROVIDERS = [
  {
    id: 'uniprofirente',
    name: 'Uniprofirente Select (Union Investment)',
    totalCostRate: 0.009,
    productType: 'fondssparplan',
    rating: 'Finanztip-Empfehlung (2025) — bei Neuabschluss',
    notes: 'Riester-Fondssparplan mit Uniglobal II. Keine Abschlusskosten. Laut Finanztip einzige noch empfohlene Neuabschluss-Option.'
  },
  {
    id: 'klassisch-riester',
    name: 'Klassische Riester-Rentenversicherung',
    totalCostRate: 0.018,
    productType: 'klassisch',
    rating: 'Nicht mehr empfohlen',
    notes: '1% Garantiezins seit 2025. Kosten fressen Rendite auf. Finanztip: "Neuabschluss nicht empfohlen".'
  },
  {
    id: 'banksparplan-riester',
    name: 'Riester-Banksparplan',
    totalCostRate: 0.003,
    productType: 'banksparplan',
    rating: 'Günstige Kosten, aber schwache Rendite',
    notes: 'Nur 2-3% Zinsen in Ansparphase. Hohe Kosten bei Verrentung (neue Versicherung nötig).'
  }
];

