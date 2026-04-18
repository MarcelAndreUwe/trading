/**
 * Altersvorsorge-Vergleichsrechner — Berechnungsengine
 *
 * BERECHNUNGSGRUNDLAGEN (alle Formeln dokumentiert):
 *
 * === ETF-SPARPLAN ===
 * Rendite:     portfolio wächst mit (returnRate - TER) p.a.
 * Vorabpauschale (VP): Fondswert_Jahresanfang × Basiszins × 0,7
 *   - gedeckelt auf den tatsächlichen Wertzuwachs des Jahres
 *   - Teilfreistellung 30%: nur 70% der VP ist steuerpflichtig
 *   - Sparerpauschbetrag (1.000€) wird vorher abgezogen
 *   - Steuer: steuerpflichtiger_VP × Abgeltungssteuersatz (26,375%)
 *   - VP-Steuer wird EXTERN gezahlt (mindert Portfolio nicht)
 *   - aber: VP wird beim Verkauf als Anrechnungstopf gutgeschrieben
 * Verkaufssteuer: (Gesamtgewinn × 0,7) − (Summe_VP × 0,7) = steuerbare Basis
 *   → × Abgeltungssteuersatz
 *
 * === ETF-RENTENVERSICHERUNG (Schicht 3) ===
 * Rendite:     portfolio wächst mit (returnRate - Gesamtkosten) p.a.
 * Ansparphase: KEINE Vorabpauschale, KEINE Steuer, steuerfreies Umschichten
 * Auszahlung (12/62-Regel erfüllt):
 *   Gewinn × 0,85 (Teilfreistellung 15%) × 0,5 (Halbeinkünfte) = steuerpflichtiger Teil
 *   → × (persönl. Steuersatz_Rente × 1,055) inkl. Soli
 * Auszahlung (12/62 NICHT erfüllt):
 *   Gewinn × Abgeltungssteuersatz (26,375%)
 *
 * === ALTERSVORSORGEDEPOT (ab 2027) ===
 * Zulagen: 50% auf erste 360€ + 25% auf nächste 1.440€ = max. 540€/Jahr
 *   + 300€/Kind/Jahr + 200€ Berufseinsteigerbonus (einmalig, <25)
 * Beiträge als Sonderausgaben absetzbar → Steuerersparnis = Beitrag × pers. Steuersatz
 * Ansparphase: KEINE Steuer (weder Abgeltungssteuer noch Vorabpauschale)
 * Auszahlung: GESAMTES Kapital × persönl. Steuersatz_Rente × 1,055
 *   (nachgelagerte Besteuerung, da Beiträge absetzbar waren)
 *   KEINE Teilfreistellung!
 */

import { getEffectiveTaxRate } from './tax-engine.js';
import * as K from './tax-constants.js';

function round2(v) { return Math.round(v * 100) / 100; }

/**
 * Berechnet den effektiven Steuersatz im Rentenalter inkl. Soli + KiSt.
 * Soli-Freigrenze: §3 SolZG — fällt weg wenn EkSt unter Freigrenze liegt.
 *
 * @param {number} baseRate - persönlicher EkSt-Satz (z.B. 0.25)
 * @param {number} kirchensteuerRate - 0, 0.08 oder 0.09
 * @param {number} estimatedTaxableIncome - geschätzte steuerpflichtige Einkünfte p.a.
 * @returns {number} effektiver Gesamtsatz
 */
function getRetirementTaxRate(baseRate, kirchensteuerRate = 0, estimatedTaxableIncome = Infinity) {
  // Soli nur wenn EkSt über Freigrenze
  const estimatedEkSt = estimatedTaxableIncome * baseRate;
  const soliApplies = estimatedEkSt > K.SOLI_FREIGRENZE_SINGLE_2025;
  const soliFactor = soliApplies ? (1 + K.SOLI_RATE_ON_ABGST) : 1.0;
  // KiSt = Prozent der EkSt
  const kistFactor = 1 + kirchensteuerRate;
  return baseRate * soliFactor * kistFactor;
}

/**
 * Berechnet realen Wert nach Abzug der Inflation.
 * @param {number} nominalValue - nomineller Betrag
 * @param {number} years - Anzahl Jahre
 * @param {number} inflationRate - z.B. 0.02 für 2%
 * @returns {number} realer Wert in heutiger Kaufkraft
 */
export function realValue(nominalValue, years, inflationRate = K.INFLATION_DEFAULT) {
  return nominalValue / Math.pow(1 + inflationRate, years);
}

// ===== ETF-SPARPLAN =====

export function calculateETFSparplan({
  monthlyAmount, returnRate, ter, basiszins,
  kirchensteuerRate = 0, sparerpauschbetragUsed = 0,
  initialBalance = 0,
  currentAge, retirementAge
}) {
  const years = retirementAge - currentAge;
  if (years <= 0) return null;

  const yearlyContribution = monthlyAmount * 12;
  const abgeltungssteuerRate = getEffectiveTaxRate(kirchensteuerRate);
  const teilfreistellung = 0.30;
  const sparerpauschbetrag = 1000;

  let portfolio = initialBalance;
  let totalContributed = initialBalance;
  let cumulativeVP = 0;          // Summe aller Vorabpauschalen (brutto)
  let cumulativeVPTax = 0;       // Summe aller VP-Steuern
  let cumulativeCosts = 0;
  const snapshots = [];

  for (let y = 0; y < years; y++) {
    const portfolioStartOfYear = portfolio;

    // Beiträge: gleichmäßig über das Jahr (Vereinfachung: halbe Jahresrate wächst mit)
    totalContributed += yearlyContribution;
    portfolio += yearlyContribution;

    // Bruttorendite auf Bestand + halbe Jahresbeiträge
    const growthBase = portfolioStartOfYear + yearlyContribution / 2;
    const grossReturn = round2(growthBase * returnRate);
    const terCost = round2(growthBase * ter);
    const netReturn = round2(grossReturn - terCost);
    portfolio += netReturn;
    cumulativeCosts += terCost;

    // Vorabpauschale-Berechnung
    // Basis: Fondswert am JAHRESANFANG × Basiszins × 0,7
    const basisertrag = round2(Math.max(0, portfolioStartOfYear) * basiszins * 0.7);
    // Gedeckelt auf tatsächlichen Wertzuwachs des Jahres
    const actualYearGain = Math.max(0, portfolio - portfolioStartOfYear - yearlyContribution);
    const vorabpauschaleGross = round2(Math.min(basisertrag, actualYearGain));

    // Teilfreistellung: nur 70% der VP ist steuerpflichtig
    const vpTaxable = round2(vorabpauschaleGross * (1 - teilfreistellung));

    // Sparerpauschbetrag abziehen (reset jedes Jahr)
    const spbAvailable = Math.max(0, sparerpauschbetrag - sparerpauschbetragUsed);
    const vpAfterSPB = round2(Math.max(0, vpTaxable - spbAvailable));

    // Steuer auf Vorabpauschale
    const vpTax = round2(vpAfterSPB * abgeltungssteuerRate);

    cumulativeVP += vorabpauschaleGross;
    cumulativeVPTax += vpTax;

    snapshots.push({
      year: y + 1,
      age: currentAge + y + 1,
      contribution: yearlyContribution,
      stateSubsidy: 0,
      grossReturn,
      costs: terCost,
      cumulativeCosts: round2(cumulativeCosts),
      // Vorabpauschale Details
      vorabpauschaleGross: round2(vorabpauschaleGross),
      vorabpauschaleTaxable: round2(vpTaxable),
      vorabpauschaleSPB: round2(Math.min(vpTaxable, spbAvailable)),
      vorabpauschaleTax: vpTax,
      cumulativeVPTax: round2(cumulativeVPTax),
      taxDuringAccumulation: vpTax,
      portfolioValue: round2(portfolio),
      totalContributed,
      // Für Charts
      netGrowth: netReturn,
      cumulativeTax: round2(cumulativeVPTax)
    });
  }

  // === AUSZAHLUNG ===
  // Gesamtgewinn
  const totalGain = Math.max(0, portfolio - totalContributed);
  // Teilfreistellung 30%: nur 70% sind steuerpflichtig
  const taxableGainAfterTF = round2(totalGain * (1 - teilfreistellung));
  // Anrechnungstopf: bereits versteuerte VP (nach Teilfreistellung) mindern Steuerlast
  const vpCredit = round2(cumulativeVP * (1 - teilfreistellung));
  const taxableAfterCredit = round2(Math.max(0, taxableGainAfterTF - vpCredit));
  // Sparerpauschbetrag im letzten Jahr (Vereinfachung)
  const spbFinal = Math.max(0, sparerpauschbetrag - sparerpauschbetragUsed);
  const taxableAfterSPB = round2(Math.max(0, taxableAfterCredit - spbFinal));
  const payoutTax = round2(taxableAfterSPB * abgeltungssteuerRate);
  const netPayout = round2(portfolio - payoutTax);

  const totalTax = round2(cumulativeVPTax + payoutTax);

  return {
    product: 'ETF-Sparplan',
    productShort: 'ETF',
    color: '#22C55E',
    snapshots,
    totalContributed: round2(totalContributed),
    totalSubsidies: 0,
    totalCosts: round2(cumulativeCosts),
    totalVorabpauschaleTax: round2(cumulativeVPTax),
    cumulativeVP: round2(cumulativeVP),
    portfolioAtRetirement: round2(portfolio),
    totalGain: round2(totalGain),
    payoutTax,
    totalTax,
    netPayout,
    effectiveReturnRate: totalContributed > 0 ? round2(((netPayout / totalContributed) ** (1 / years) - 1) * 100) : 0
  };
}

// ===== ETF-RENTENVERSICHERUNG =====

export function calculateRentenversicherung({
  monthlyAmount, returnRate, wrapperCostRate, etfTerIncluded,
  etfTer = 0.002, kirchensteuerRate = 0,
  personalTaxRateRetirement = 0.25,
  initialBalance = 0,
  currentAge, retirementAge
}) {
  const years = retirementAge - currentAge;
  if (years <= 0) return null;

  const yearlyContribution = monthlyAmount * 12;
  const totalCostRate = etfTerIncluded ? wrapperCostRate : wrapperCostRate + etfTer;

  let portfolio = initialBalance;
  let totalContributed = initialBalance;
  let cumulativeCosts = 0;
  const snapshots = [];

  for (let y = 0; y < years; y++) {
    const portfolioStartOfYear = portfolio;
    totalContributed += yearlyContribution;
    portfolio += yearlyContribution;

    const growthBase = portfolioStartOfYear + yearlyContribution / 2;
    const grossReturn = round2(growthBase * returnRate);
    const costs = round2(growthBase * totalCostRate);
    const netReturn = round2(grossReturn - costs);
    portfolio += netReturn;
    cumulativeCosts += costs;

    snapshots.push({
      year: y + 1,
      age: currentAge + y + 1,
      contribution: yearlyContribution,
      stateSubsidy: 0,
      grossReturn,
      costs,
      cumulativeCosts: round2(cumulativeCosts),
      vorabpauschaleGross: 0,
      vorabpauschaleTax: 0,
      cumulativeVPTax: 0,
      taxDuringAccumulation: 0,
      portfolioValue: round2(portfolio),
      totalContributed,
      netGrowth: netReturn,
      cumulativeTax: 0
    });
  }

  // === AUSZAHLUNG (Halbeinkünfteverfahren) ===
  const totalGain = Math.max(0, portfolio - totalContributed);
  const meetsRule = years >= 12 && retirementAge >= 62;

  let payoutTax;
  if (meetsRule) {
    // §20 Abs. 1 Nr. 6 EStG — Halbeinkünfteverfahren bei 12/62-Regel:
    //   Erträge × (1 − 0,15 Teilfreistellung) × 0,5 Halbeinkünfte = 42,5%
    //   × (EkSt-Satz × (1 + Soli falls über Freigrenze) × (1 + KiSt))
    const taxableAmount = round2(totalGain * (1 - K.RV_TEILFREISTELLUNG) * K.HALBEINKUENFTE_FAKTOR);
    const effectiveRate = getRetirementTaxRate(personalTaxRateRetirement, kirchensteuerRate, taxableAmount);
    payoutTax = round2(Math.max(0, taxableAmount) * effectiveRate);
  } else {
    // 12/62 nicht erfüllt → volle Abgeltungssteuer
    const abgeltungssteuerRate = getEffectiveTaxRate(kirchensteuerRate);
    payoutTax = round2(Math.max(0, totalGain) * abgeltungssteuerRate);
  }

  const netPayout = round2(portfolio - payoutTax);

  return {
    product: 'ETF-Rentenversicherung',
    productShort: 'RV',
    color: '#A855F7',
    snapshots,
    totalContributed: round2(totalContributed),
    totalSubsidies: 0,
    totalCosts: round2(cumulativeCosts),
    totalVorabpauschaleTax: 0,
    cumulativeVP: 0,
    portfolioAtRetirement: round2(portfolio),
    totalGain: round2(totalGain),
    payoutTax,
    totalTax: payoutTax,
    netPayout,
    meetsHalbeinkuenfte: meetsRule,
    effectiveReturnRate: totalContributed > 0 ? round2(((netPayout / totalContributed) ** (1 / years) - 1) * 100) : 0
  };
}

// ===== ALTERSVORSORGEDEPOT =====

export function calculateSubsidies(yearlyContribution, numberOfChildren, age, isCareerStarter, isFirstYear) {
  const ownContrib = Math.min(yearlyContribution, 1800);
  let grundzulage = 0;
  if (ownContrib <= 360) {
    grundzulage = ownContrib * 0.50;
  } else {
    grundzulage = 360 * 0.50 + Math.min(ownContrib - 360, 1440) * 0.25;
  }
  const kinderzulage = numberOfChildren * 300;
  const bonus = (isCareerStarter && isFirstYear && age < 25) ? 200 : 0;

  return {
    grundzulage: round2(grundzulage),
    kinderzulage: round2(kinderzulage),
    bonus,
    total: round2(grundzulage + kinderzulage + bonus),
    ownContribution: round2(ownContrib)
  };
}

export function calculateAltersvorsorgedepot({
  monthlyAmount, returnRate, costRate,
  kirchensteuerRate = 0,
  personalTaxRateCurrent = 0.35,
  personalTaxRateRetirement = 0.25,
  initialBalance = 0,
  currentAge, retirementAge,
  numberOfChildren = 0, isCareerStarter = false
}) {
  const years = retirementAge - currentAge;
  if (years <= 0) return null;

  const cappedMonthly = Math.min(monthlyAmount, 150);
  const yearlyContribution = cappedMonthly * 12;

  let portfolio = initialBalance;
  let totalContributed = initialBalance;
  let totalSubsidies = 0;
  let totalTaxDeduction = 0;
  let cumulativeCosts = 0;
  const snapshots = [];

  for (let y = 0; y < years; y++) {
    const age = currentAge + y;
    const subs = calculateSubsidies(yearlyContribution, numberOfChildren, age, isCareerStarter, y === 0);

    totalContributed += yearlyContribution;
    totalSubsidies += subs.total;

    const yearlyInflow = yearlyContribution + subs.total;
    const portfolioStartOfYear = portfolio;
    portfolio += yearlyInflow;

    const growthBase = portfolioStartOfYear + yearlyInflow / 2;
    const grossReturn = round2(growthBase * returnRate);
    const costs = round2(growthBase * costRate);
    const netReturn = round2(grossReturn - costs);
    portfolio += netReturn;
    cumulativeCosts += costs;

    const taxDeduction = round2(yearlyContribution * personalTaxRateCurrent);
    totalTaxDeduction += taxDeduction;

    snapshots.push({
      year: y + 1,
      age: age + 1,
      contribution: yearlyContribution,
      stateSubsidy: subs.total,
      subsidyDetail: subs,
      taxDeduction,
      grossReturn,
      costs,
      cumulativeCosts: round2(cumulativeCosts),
      vorabpauschaleGross: 0,
      vorabpauschaleTax: 0,
      cumulativeVPTax: 0,
      taxDuringAccumulation: 0,
      portfolioValue: round2(portfolio),
      totalContributed,
      totalSubsidies: round2(totalSubsidies),
      netGrowth: netReturn,
      cumulativeTax: 0
    });
  }

  // === AUSZAHLUNG (nachgelagerte Besteuerung, Altersvorsorgereformgesetz) ===
  // GESAMTES Kapital wird mit persönl. Einkommensteuersatz besteuert
  // (Grund: Einzahlungen waren voll steuerlich gefördert via Zulagen + Sonderausgaben)
  // Soli-Freigrenze + KiSt werden berücksichtigt.
  const effectiveRate = getRetirementTaxRate(personalTaxRateRetirement, kirchensteuerRate, portfolio);
  const payoutTax = round2(portfolio * effectiveRate);
  const netPayout = round2(portfolio - payoutTax);
  const netPayoutInclDeductions = round2(netPayout + totalTaxDeduction);

  const totalGain = Math.max(0, portfolio - totalContributed - totalSubsidies);

  return {
    product: 'Altersvorsorgedepot',
    productShort: 'AVD',
    color: '#06B6D4',
    snapshots,
    totalContributed: round2(totalContributed),
    totalSubsidies: round2(totalSubsidies),
    totalTaxDeduction: round2(totalTaxDeduction),
    totalCosts: round2(cumulativeCosts),
    totalVorabpauschaleTax: 0,
    cumulativeVP: 0,
    portfolioAtRetirement: round2(portfolio),
    totalGain: round2(totalGain),
    payoutTax,
    totalTax: payoutTax,
    netPayout,
    netPayoutInclDeductions,
    cappedMonthly,
    effectiveReturnRate: totalContributed > 0 ? round2(((netPayoutInclDeductions / totalContributed) ** (1 / years) - 1) * 100) : 0
  };
}

// ===== RÜRUP-RENTE (Schicht 1, Basisrente) =====

/**
 * Besteuerungsanteil für Rentenbeginn (nachgelagerte Besteuerung).
 * §22 Nr. 1 Satz 3 EStG — Änderung durch Wachstumschancengesetz (März 2024):
 * Rückwirkend ab 2023: +0,5 Pp pro Jahr (vorher +1 Pp).
 * Werte: 2023: 82,5% | 2024: 83,0% | 2025: 83,5% | ... | 2058: 100%
 * Offiziell bestätigt (Haufe, Steuer-Berater.de, LV1871, 2025).
 */
function ruerupBesteuerungsanteil(rentenbeginnJahr) {
  if (rentenbeginnJahr >= K.RUERUP_BESTEUERUNGSANTEIL_END_JAHR) return 1.0;
  if (rentenbeginnJahr <= K.RUERUP_BESTEUERUNGSANTEIL_START_JAHR) {
    return K.RUERUP_BESTEUERUNGSANTEIL_START_WERT;  // 2023: 82,5%
  }
  return Math.min(
    1.0,
    K.RUERUP_BESTEUERUNGSANTEIL_START_WERT +
    (rentenbeginnJahr - K.RUERUP_BESTEUERUNGSANTEIL_START_JAHR) * K.RUERUP_BESTEUERUNGSANTEIL_STEIGERUNG
  );
}

/**
 * Maximaler Sonderausgabenabzug für Altersvorsorgeaufwendungen (§10 Abs. 3 EStG).
 * Basis: Beitragsbemessungsgrenze knappschaftliche RV × Beitragssatz der GRV.
 * 2025: BBG 118.800 € × 24,7% ≈ 29.344 € (Single) bzw. 58.688 € (verheiratet).
 * 2026: ca. 30.826 € prognostiziert.
 *
 * ACHTUNG: Die hier verwendete 2%-Fortschreibung ist eine VEREINFACHUNG.
 * Tatsächlich hängt der Höchstbetrag von BBG-Anpassungen und
 * Beitragssatzänderungen der GRV ab.
 */
function ruerupHoechstbetrag(year, verheiratet) {
  const base2025 = verheiratet ? K.RUERUP_HOECHSTBETRAG_MARRIED_2025 : K.RUERUP_HOECHSTBETRAG_SINGLE_2025;
  const growthYears = Math.max(0, year - 2025);
  return Math.round(base2025 * Math.pow(K.RUERUP_HOECHSTBETRAG_WACHSTUM, growthYears));
}

/**
 * Projiziert eine Rürup-Rente Jahr für Jahr.
 *
 * @param {number} monthlyAmount - Monatsbeitrag EUR
 * @param {number} returnRate - erwartete Rendite p.a.
 * @param {number} costRate - Effektivkosten p.a.
 * @param {number} guaranteedPensionFactor - € Monatsrente pro 10.000 € Kapital
 * @param {number} grossIncome - Brutto-Jahreseinkommen (für Höchstbetrag-Cap + Angestellten-Abzug)
 * @param {string} employmentType - 'selbststaendig' | 'angestellt' | 'beamte'
 * @param {boolean} isMarried
 * @param {number} personalTaxRateCurrent
 * @param {number} personalTaxRateRetirement
 * @param {number} kirchensteuerRate
 * @param {number} currentAge
 * @param {number} retirementAge
 * @param {number} initialBalance
 */
export function calculateRuerup({
  monthlyAmount, returnRate, costRate, guaranteedPensionFactor,
  grossIncome = 0, employmentType = 'selbststaendig', isMarried = false,
  personalTaxRateCurrent = 0.35, personalTaxRateRetirement = 0.25,
  kirchensteuerRate = 0,
  currentAge, retirementAge, initialBalance = 0
}) {
  const years = retirementAge - currentAge;
  if (years <= 0) return null;

  const currentYear = new Date().getFullYear();
  const rentenbeginnJahr = currentYear + years;
  const besteuerungsanteil = ruerupBesteuerungsanteil(rentenbeginnJahr);

  // Arbeitnehmeranteil GRV (bei Angestellten) reduziert den absetzbaren Rürup-Höchstbetrag
  // Typische Regel: 9,3% AN-Anteil an GRV zählt schon auf Höchstbetrag. Der Rürup-Anteil
  // darf die Differenz zum Höchstbetrag ausfüllen.
  const anRvBeitrag = employmentType === 'angestellt' ? grossIncome * 0.093 * 2 : 0; // Gesamtbeitrag (AN+AG) 18,6%

  let portfolio = initialBalance;
  let totalContributed = initialBalance;
  let totalTaxDeduction = 0;
  let cumulativeCosts = 0;
  const snapshots = [];
  const yearlyWant = monthlyAmount * 12;

  for (let y = 0; y < years; y++) {
    const year = currentYear + y;
    const hoechstbetrag = ruerupHoechstbetrag(year, isMarried);
    const absetzbarAvailable = Math.max(0, hoechstbetrag - anRvBeitrag);
    const absetzbar = Math.min(yearlyWant, absetzbarAvailable);

    // Steuerersparnis (100% abzugsfähig seit 2023)
    const taxDeduction = round2(absetzbar * personalTaxRateCurrent);
    totalTaxDeduction += taxDeduction;

    totalContributed += yearlyWant;
    const portfolioStart = portfolio;
    portfolio += yearlyWant;

    const growthBase = portfolioStart + yearlyWant / 2;
    const grossReturn = round2(growthBase * returnRate);
    const costs = round2(growthBase * costRate);
    const netReturn = round2(grossReturn - costs);
    portfolio += netReturn;
    cumulativeCosts += costs;

    snapshots.push({
      year: y + 1,
      age: currentAge + y + 1,
      contribution: yearlyWant,
      absetzbar,
      taxDeduction,
      grossReturn,
      costs,
      cumulativeCosts: round2(cumulativeCosts),
      portfolioValue: round2(portfolio),
      totalContributed
    });
  }

  // Monatliche Bruttorente (garantierter Rentenfaktor)
  const monthlyPensionGross = round2((portfolio / 10000) * guaranteedPensionFactor);
  const yearlyPensionGross = monthlyPensionGross * 12;

  // Nachgelagerte Besteuerung (§22 Nr. 1 Satz 3 EStG):
  // Nur der Besteuerungsanteil ist steuerpflichtig.
  // Auf den steuerpflichtigen Teil: persönl. EkSt × (Soli falls über Freigrenze) × (1 + KiSt)
  const taxableYearlyPension = yearlyPensionGross * besteuerungsanteil;
  const effectivePensionRate = getRetirementTaxRate(personalTaxRateRetirement, kirchensteuerRate, taxableYearlyPension);
  const yearlyPensionTax = round2(taxableYearlyPension * effectivePensionRate);
  const yearlyPensionNet = round2(yearlyPensionGross - yearlyPensionTax);

  // Aggregiertes Netto: Annahme Rentenbezugsdauer (typische Lebenserwartung)
  const pensionYears = K.LEBENSERWARTUNG_RENTE_JAHRE;
  const totalNetPension = yearlyPensionNet * pensionYears;

  return {
    product: 'Rürup-Rente',
    productShort: 'Rürup',
    color: '#EC4899',
    snapshots,
    totalContributed: round2(totalContributed),
    totalTaxDeduction: round2(totalTaxDeduction),
    totalCosts: round2(cumulativeCosts),
    portfolioAtRetirement: round2(portfolio),
    monthlyPensionGross,
    yearlyPensionGross: round2(yearlyPensionGross),
    yearlyPensionTax,
    yearlyPensionNet,
    besteuerungsanteil,
    rentenbeginnJahr,
    totalNetPension: round2(totalNetPension),
    // Für den Vergleich: Kapitaläquivalent-Netto = gesamte Rente über 20 Jahre + Steuerersparnis
    netPayout: round2(totalNetPension + totalTaxDeduction),
    netPayoutInclDeductions: round2(totalNetPension + totalTaxDeduction),
    totalTax: round2(yearlyPensionTax * pensionYears),
    payoutTax: round2(yearlyPensionTax * pensionYears),
    effectiveReturnRate: totalContributed > 0 ? round2(((totalNetPension + totalTaxDeduction) / totalContributed) ** (1 / years) * 100 - 100) : 0
  };
}

// ===== RIESTER-RENTE (Schicht 2) =====

/**
 * Berechnet die Riester-Zulagen + Mindesteigenbeitrag (§§79 ff. EStG).
 * - Grundzulage: 175 €/Jahr (seit 2018)
 * - Kinderzulage: 300 €/Jahr für Kinder ab 2008, 185 €/Jahr für Kinder vor 2008
 * - Berufseinsteigerbonus: 200 € einmalig bei Vertragsabschluss unter 25
 * - Mindesteigenbeitrag: 4% des Vorjahreseinkommens − Zulagen, mind. 60 €
 * - Maximale Gesamtförderung: 2.100 €/Jahr
 *
 * @param {number} grossIncome - Vorjahreseinkommen (brutto)
 * @param {number} childrenPost2008 - Kinder Geburtsjahr ≥ 2008
 * @param {number} childrenPre2008 - Kinder Geburtsjahr < 2008
 * @param {number} age
 * @param {boolean} isCareerStarter
 * @param {boolean} isFirstYear
 */
export function riesterZulagenMindestbeitrag(grossIncome, childrenPost2008, childrenPre2008, age, isCareerStarter, isFirstYear) {
  const grundzulage = K.RIESTER_GRUNDZULAGE;
  const kinderzulage = (childrenPost2008 || 0) * K.RIESTER_KINDERZULAGE_AB_2008
                    + (childrenPre2008 || 0) * K.RIESTER_KINDERZULAGE_VOR_2008;
  const bonus = (isCareerStarter && isFirstYear && age < 25) ? K.RIESTER_BERUFSEINSTEIGERBONUS : 0;
  const zulagen = grundzulage + kinderzulage + bonus;

  const vierProzent = grossIncome * K.RIESTER_MINDESTQUOTE;
  const mindestEigenbeitrag = Math.max(
    K.RIESTER_MINDESTEIGENBEITRAG,
    Math.min(K.RIESTER_MAX_BEITRAG - zulagen, vierProzent - zulagen)
  );

  return {
    grundzulage, kinderzulage, bonus, zulagen: round2(zulagen),
    mindestEigenbeitrag: round2(Math.max(K.RIESTER_MINDESTEIGENBEITRAG, mindestEigenbeitrag)),
    maxGesamt: K.RIESTER_MAX_BEITRAG
  };
}

/**
 * Projiziert eine Riester-Rente Jahr für Jahr.
 * Beachtet: Günstigerprüfung (besserer Wert aus Zulagen vs. Sonderausgabenabzug),
 * Beitragsgarantie (implizit in Kostenquote), 100% nachgelagerte Besteuerung.
 *
 * @param {number} monthlyAmount - Geplanter Eigenbeitrag (EUR/Monat). Wird auf max. 2.100/Jahr gedeckelt.
 * @param {number} returnRate
 * @param {number} costRate - Effektivkosten p.a.
 * @param {number} grossIncome
 * @param {number} numberOfChildren - Annahme: alle ab 2008 geboren (= 300 €/Kind)
 * @param {boolean} isCareerStarter
 * @param {number} personalTaxRateCurrent
 * @param {number} personalTaxRateRetirement
 * @param {number} currentAge, retirementAge
 */
export function calculateRiester({
  monthlyAmount, returnRate, costRate,
  grossIncome = 0,
  numberOfChildren = 0,              // legacy: alle ab 2008
  childrenPost2008 = null,           // Kinder ab 2008 (neu, optional)
  childrenPre2008 = 0,               // Kinder vor 2008 (neu, optional)
  isCareerStarter = false,
  personalTaxRateCurrent = 0.35, personalTaxRateRetirement = 0.25,
  kirchensteuerRate = 0,
  currentAge, retirementAge, initialBalance = 0
}) {
  const years = retirementAge - currentAge;
  if (years <= 0) return null;

  // Rückwärtskompatibilität: wenn childrenPost2008 nicht gesetzt, verwende numberOfChildren
  const post2008 = childrenPost2008 !== null ? childrenPost2008 : numberOfChildren;

  const yearlyWant = monthlyAmount * 12;

  let portfolio = initialBalance;
  let totalContributed = initialBalance;
  let totalZulagen = 0;
  let totalTaxDeduction = 0;
  let cumulativeCosts = 0;
  const snapshots = [];

  for (let y = 0; y < years; y++) {
    const age = currentAge + y;
    const z = riesterZulagenMindestbeitrag(grossIncome, post2008, childrenPre2008, age, isCareerStarter, y === 0);

    const maxEigenForFullFoerderung = Math.max(K.RIESTER_MINDESTEIGENBEITRAG, K.RIESTER_MAX_BEITRAG - z.zulagen);
    const eigenbeitrag = Math.min(yearlyWant, maxEigenForFullFoerderung);

    // Zulagen nur anteilig wenn Mindesteigenbeitrag nicht erreicht wird
    const zulagenQuote = z.mindestEigenbeitrag > 0
      ? Math.min(1, eigenbeitrag / z.mindestEigenbeitrag)
      : 1;
    const effZulagen = round2(z.zulagen * zulagenQuote);

    totalContributed += eigenbeitrag;
    totalZulagen += effZulagen;

    // Günstigerprüfung: vergleiche Steuervorteil durch Sonderausgabenabzug
    // Finanzamt gewährt den höheren von: Zulagen ODER Steuervorteil
    // Sonderausgabenabzug bis 2.100 € absetzbar
    const absetzbar = Math.min(eigenbeitrag + effZulagen, 2100);
    const steuervorteil = absetzbar * personalTaxRateCurrent;
    // Wenn Steuervorteil > Zulagen: Differenz als zusätzlicher Vorteil
    const extraTaxBenefit = Math.max(0, steuervorteil - effZulagen);
    totalTaxDeduction += extraTaxBenefit;

    // Beiträge + Zulagen fließen ins Depot
    const inflow = eigenbeitrag + effZulagen;
    const portfolioStart = portfolio;
    portfolio += inflow;

    const growthBase = portfolioStart + inflow / 2;
    const grossReturn = round2(growthBase * returnRate);
    const costs = round2(growthBase * costRate);
    const netReturn = round2(grossReturn - costs);
    portfolio += netReturn;
    cumulativeCosts += costs;

    snapshots.push({
      year: y + 1, age: age + 1,
      contribution: eigenbeitrag,
      stateSubsidy: effZulagen,
      zulagenDetail: z,
      extraTaxBenefit: round2(extraTaxBenefit),
      grossReturn, costs,
      cumulativeCosts: round2(cumulativeCosts),
      portfolioValue: round2(portfolio),
      totalContributed, totalSubsidies: round2(totalZulagen)
    });
  }

  // Auszahlung (§22 Nr. 5 EStG): 100% nachgelagerte Besteuerung
  // Geförderter Teil (Eigenbeiträge + Zulagen + Erträge) wird voll besteuert.
  // Optional: 30% Einmalauszahlung möglich, restl. 70% als lebenslange Rente.
  // Soli-Freigrenze + KiSt werden berücksichtigt.
  const effectiveRate = getRetirementTaxRate(personalTaxRateRetirement, kirchensteuerRate, portfolio);
  const payoutTax = round2(portfolio * effectiveRate);
  const netPayout = round2(portfolio - payoutTax);
  const netPayoutInclDeductions = round2(netPayout + totalTaxDeduction);

  return {
    product: 'Riester-Rente',
    productShort: 'Riester',
    color: '#64748B',
    snapshots,
    totalContributed: round2(totalContributed),
    totalSubsidies: round2(totalZulagen),
    totalTaxDeduction: round2(totalTaxDeduction),
    totalCosts: round2(cumulativeCosts),
    portfolioAtRetirement: round2(portfolio),
    payoutTax,
    totalTax: payoutTax,
    netPayout,
    netPayoutInclDeductions,
    effectiveReturnRate: totalContributed > 0 ? round2(((netPayoutInclDeductions / totalContributed) ** (1 / years) - 1) * 100) : 0
  };
}

// ===== VERGLEICH & KOMBI =====

export function compareProducts(params) {
  const etf = calculateETFSparplan({
    monthlyAmount: params.monthlyAmount,
    returnRate: params.returnRate,
    ter: params.etfTer,
    basiszins: params.basiszins,
    kirchensteuerRate: params.kirchensteuerRate,
    sparerpauschbetragUsed: params.sparerpauschbetragUsed,
    initialBalance: params.initialBalance || 0,
    currentAge: params.currentAge,
    retirementAge: params.retirementAge
  });

  const rv = calculateRentenversicherung({
    monthlyAmount: params.monthlyAmount,
    returnRate: params.returnRate,
    wrapperCostRate: params.wrapperCostRate,
    etfTerIncluded: params.etfTerIncluded !== false,
    etfTer: params.etfTer,
    kirchensteuerRate: params.kirchensteuerRate,
    personalTaxRateRetirement: params.personalTaxRateRetirement,
    initialBalance: params.initialBalance || 0,
    currentAge: params.currentAge,
    retirementAge: params.retirementAge
  });

  const avd = calculateAltersvorsorgedepot({
    monthlyAmount: params.monthlyAmount,
    returnRate: params.returnRate,
    costRate: params.avdCostRate,
    kirchensteuerRate: params.kirchensteuerRate,
    personalTaxRateCurrent: params.personalTaxRateCurrent,
    personalTaxRateRetirement: params.personalTaxRateRetirement,
    currentAge: params.currentAge,
    retirementAge: params.retirementAge,
    numberOfChildren: params.numberOfChildren,
    isCareerStarter: params.isCareerStarter
  });

  // Rürup-Rente (nur wenn Einkommen + Rürup-Daten vorhanden)
  let ruerup = null;
  if (params.enableRuerup && params.grossIncome > 0) {
    ruerup = calculateRuerup({
      monthlyAmount: params.monthlyAmount,
      returnRate: params.returnRate,
      costRate: params.ruerupCostRate || 0.008,
      guaranteedPensionFactor: params.ruerupPensionFactor || 30,
      grossIncome: params.grossIncome,
      employmentType: params.employmentType || 'selbststaendig',
      isMarried: params.isMarried || false,
      personalTaxRateCurrent: params.personalTaxRateCurrent,
      personalTaxRateRetirement: params.personalTaxRateRetirement,
      kirchensteuerRate: params.kirchensteuerRate,
      currentAge: params.currentAge,
      retirementAge: params.retirementAge
    });
  }

  // Riester-Rente (nur wenn enable + Einkommen)
  let riester = null;
  if (params.enableRiester && params.grossIncome > 0) {
    riester = calculateRiester({
      monthlyAmount: params.monthlyAmount,
      returnRate: params.returnRate,
      costRate: params.riesterCostRate || 0.009,
      grossIncome: params.grossIncome,
      numberOfChildren: params.numberOfChildren || 0,
      isCareerStarter: params.isCareerStarter || false,
      personalTaxRateCurrent: params.personalTaxRateCurrent,
      personalTaxRateRetirement: params.personalTaxRateRetirement,
      kirchensteuerRate: params.kirchensteuerRate,
      currentAge: params.currentAge,
      retirementAge: params.retirementAge
    });
  }

  let kombi = null;
  if (params.monthlyAmount > 150) {
    const excess = params.monthlyAmount - 150;
    const kombiAVD = calculateAltersvorsorgedepot({ ...params, monthlyAmount: 150, costRate: params.avdCostRate });
    const kombiETF = calculateETFSparplan({ monthlyAmount: excess, returnRate: params.returnRate, ter: params.etfTer, basiszins: params.basiszins, kirchensteuerRate: params.kirchensteuerRate, sparerpauschbetragUsed: params.sparerpauschbetragUsed, currentAge: params.currentAge, retirementAge: params.retirementAge });
    const kombiRV = calculateRentenversicherung({ monthlyAmount: excess, returnRate: params.returnRate, wrapperCostRate: params.wrapperCostRate, etfTerIncluded: params.etfTerIncluded !== false, etfTer: params.etfTer, kirchensteuerRate: params.kirchensteuerRate, personalTaxRateRetirement: params.personalTaxRateRetirement, currentAge: params.currentAge, retirementAge: params.retirementAge });
    const bestExcess = kombiETF.netPayout >= kombiRV.netPayout ? kombiETF : kombiRV;
    const totalNet = kombiAVD.netPayoutInclDeductions + bestExcess.netPayout;
    kombi = {
      product: 'Kombi-Strategie', productShort: 'Kombi', color: '#F59E0B',
      avdPart: kombiAVD, excessPart: bestExcess,
      excessType: kombiETF.netPayout >= kombiRV.netPayout ? 'ETF-Sparplan' : 'Rentenversicherung',
      netPayout: round2(totalNet),
      totalContributed: round2(kombiAVD.totalContributed + bestExcess.totalContributed),
      totalSubsidies: kombiAVD.totalSubsidies,
      portfolioAtRetirement: round2(kombiAVD.portfolioAtRetirement + bestExcess.portfolioAtRetirement),
      totalCosts: round2(kombiAVD.totalCosts + bestExcess.totalCosts),
      totalTax: round2(kombiAVD.totalTax + bestExcess.totalTax),
      splitInfo: '150 €/Monat → AVD + ' + (params.monthlyAmount - 150) + ' €/Monat → ' + (kombiETF.netPayout >= kombiRV.netPayout ? 'ETF' : 'RV')
    };
  }

  const products = [etf, rv, avd, kombi, ruerup, riester].filter(Boolean);
  const best = products.reduce((a, b) => (a.netPayout > b.netPayout ? a : b));
  return { etf, rv, avd, kombi, ruerup, riester, best, products };
}
