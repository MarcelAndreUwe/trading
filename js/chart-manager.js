/**
 * Trading Cockpit - Chart Manager
 * Verwaltet ApexCharts-Instanzen und Annotationen
 */

let taxDragChart = null;

/**
 * Erstellt oder aktualisiert das Tax-Drag Chart
 */
export function renderTaxDragChart(curve, buyPrice, currentPrice, breakEvenSell, freistellungThreshold) {
  const container = document.getElementById('taxDragChart');
  if (!container || !curve || curve.length === 0) return;

  const sellPrices = curve.map(p => p.sellPrice);
  const grossProfits = curve.map(p => p.grossProfit);
  const netProfits = curve.map(p => p.netProfit);
  const taxes = curve.map(p => p.totalTax);

  // Annotations
  const annotations = {
    xaxis: [],
    yaxis: [{
      y: 0,
      borderColor: '#475569',
      strokeDashArray: 4,
      label: {
        text: 'Null-Linie',
        style: { color: '#94A3B8', background: '#1E293B', fontSize: '10px', padding: { left: 4, right: 4, top: 2, bottom: 2 } }
      }
    }]
  };

  // Kaufkurs Markierung
  if (buyPrice > 0) {
    annotations.xaxis.push({
      x: buyPrice,
      borderColor: '#3B82F6',
      strokeDashArray: 0,
      label: {
        text: 'Kaufkurs',
        orientation: 'vertical',
        style: { color: '#3B82F6', background: '#1E293B', fontSize: '10px', padding: { left: 4, right: 4, top: 2, bottom: 2 } }
      }
    });
  }

  // Aktueller Kurs
  if (currentPrice > 0 && currentPrice !== buyPrice) {
    annotations.xaxis.push({
      x: currentPrice,
      borderColor: '#F8FAFC',
      strokeDashArray: 3,
      label: {
        text: 'Aktuell',
        orientation: 'vertical',
        style: { color: '#F8FAFC', background: '#1E293B', fontSize: '10px', padding: { left: 4, right: 4, top: 2, bottom: 2 } }
      }
    });
  }

  // Break-Even Linie
  if (breakEvenSell > 0) {
    annotations.xaxis.push({
      x: breakEvenSell,
      borderColor: '#94A3B8',
      strokeDashArray: 6,
      label: {
        text: 'Break-Even',
        orientation: 'vertical',
        style: { color: '#94A3B8', background: '#1E293B', fontSize: '10px', padding: { left: 4, right: 4, top: 2, bottom: 2 } }
      }
    });
  }

  const options = {
    series: [
      {
        name: 'Brutto-Gewinn',
        type: 'line',
        data: sellPrices.map((x, i) => ({ x, y: grossProfits[i] }))
      },
      {
        name: 'Netto-Gewinn',
        type: 'area',
        data: sellPrices.map((x, i) => ({ x, y: netProfits[i] }))
      },
      {
        name: 'Steuerlast',
        type: 'area',
        data: sellPrices.map((x, i) => ({ x, y: taxes[i] }))
      }
    ],
    chart: {
      type: 'line',
      height: 350,
      background: 'transparent',
      foreColor: '#94A3B8',
      toolbar: { show: true, tools: { download: false, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
      animations: { enabled: true, easing: 'easeinout', speed: 300 }
    },
    colors: ['#86EFAC', '#22C55E', '#A855F7'],
    stroke: {
      width: [2, 0, 0],
      curve: 'smooth'
    },
    fill: {
      type: ['solid', 'gradient', 'gradient'],
      gradient: {
        shadeIntensity: 0.3,
        opacityFrom: 0.6,
        opacityTo: 0.1,
        stops: [0, 95, 100]
      }
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    xaxis: {
      type: 'numeric',
      labels: {
        formatter: (val) => val ? val.toFixed(2) + ' EUR' : '',
        style: { colors: '#94A3B8', fontSize: '10px' }
      },
      title: {
        text: 'Verkaufskurs (EUR)',
        style: { color: '#64748B', fontSize: '11px' }
      },
      axisBorder: { color: '#334155' },
      axisTicks: { color: '#334155' }
    },
    yaxis: {
      labels: {
        formatter: (val) => val ? val.toFixed(0) + ' EUR' : '0',
        style: { colors: '#94A3B8', fontSize: '10px' }
      },
      title: {
        text: 'Gewinn / Steuer (EUR)',
        style: { color: '#64748B', fontSize: '11px' }
      }
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      x: { formatter: (val) => 'Verkauf bei ' + val.toFixed(2) + ' EUR' },
      y: { formatter: (val) => val ? val.toFixed(2) + ' EUR' : '0 EUR' }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: '#94A3B8' },
      markers: { radius: 2 }
    },
    annotations
  };

  if (taxDragChart) {
    taxDragChart.updateOptions(options, true, true);
  } else {
    taxDragChart = new ApexCharts(container, options);
    taxDragChart.render();
  }
}

/**
 * Zerstoert alle Chart-Instanzen (Cleanup)
 */
export function destroyCharts() {
  if (taxDragChart) {
    taxDragChart.destroy();
    taxDragChart = null;
  }
}
