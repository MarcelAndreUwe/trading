/**
 * Kurslevel Dashboard Modul
 * Historisches Kurs-Chart mit Annotationslinien
 */

let priceLevelChart = null;

/**
 * Rendert das Kurs-Chart mit historischen Daten und optionalen Annotationslinien.
 * @param {string} containerId
 * @param {Array} historicalData
 * @param {Object} levels - {buyPrice, currentPrice, stopLoss, breakEvenRebuy, targetPrice, showLevels}
 */
export function renderPriceLevelChart(containerId, historicalData, levels) {
  const container = document.getElementById(containerId);
  if (!container || !historicalData || historicalData.length === 0) return;

  const seriesData = historicalData.map(d => ({
    x: new Date(d.date).getTime(),
    y: [d.open, d.high, d.low, d.close]
  }));

  // Annotations nur wenn showLevels aktiv
  const annotations = { yaxis: [] };
  const show = levels.showLevels !== false;

  if (show) {
    const labelStyle = (color) => ({
      style: {
        color: color,
        background: '#0F172A',
        fontSize: '11px',
        fontWeight: 600,
        padding: { left: 6, right: 6, top: 3, bottom: 3 }
      },
      position: 'right',
      offsetX: 0
    });

    if (levels.buyPrice > 0) {
      annotations.yaxis.push({
        y: levels.buyPrice,
        borderColor: '#3B82F6',
        strokeDashArray: 0,
        label: { text: 'Kauf ' + levels.buyPrice.toFixed(0), ...labelStyle('#3B82F6') }
      });
    }
    if (levels.currentPrice > 0 && Math.abs(levels.currentPrice - levels.buyPrice) > 1) {
      annotations.yaxis.push({
        y: levels.currentPrice,
        borderColor: '#F8FAFC',
        strokeDashArray: 3,
        label: { text: 'Aktuell ' + levels.currentPrice.toFixed(0), ...labelStyle('#F8FAFC') }
      });
    }
    if (levels.stopLoss > 0) {
      annotations.yaxis.push({
        y: levels.stopLoss,
        borderColor: '#EF4444',
        strokeDashArray: 5,
        label: { text: 'SL ' + levels.stopLoss.toFixed(0), ...labelStyle('#EF4444') }
      });
    }
    if (levels.breakEvenRebuy > 0) {
      annotations.yaxis.push({
        y: levels.breakEvenRebuy,
        borderColor: '#F59E0B',
        strokeDashArray: 8,
        label: { text: 'BE-Rebuy ' + levels.breakEvenRebuy.toFixed(0), ...labelStyle('#F59E0B') }
      });
    }
    if (levels.targetPrice > 0) {
      annotations.yaxis.push({
        y: levels.targetPrice,
        borderColor: '#22C55E',
        strokeDashArray: 5,
        label: { text: 'Ziel ' + levels.targetPrice.toFixed(0), ...labelStyle('#22C55E') }
      });
    }
  }

  const options = {
    series: [{
      name: 'Kurs',
      type: 'candlestick',
      data: seriesData
    }],
    chart: {
      type: 'candlestick',
      height: 400,
      background: 'transparent',
      foreColor: '#94A3B8',
      toolbar: { show: true, tools: { download: false, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } }
    },
    plotOptions: {
      candlestick: {
        colors: { upward: '#22C55E', downward: '#EF4444' },
        wick: { useFillColor: true }
      }
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { right: show ? 80 : 30 }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: { colors: '#94A3B8', fontSize: '10px' },
        datetimeFormatter: { month: "MMM 'yy", day: 'dd MMM' }
      },
      axisBorder: { color: '#334155' },
      axisTicks: { color: '#334155' }
    },
    yaxis: {
      labels: {
        formatter: (val) => val ? val.toFixed(0) : '0',
        style: { colors: '#94A3B8', fontSize: '10px' }
      },
      tooltip: { enabled: true }
    },
    tooltip: { theme: 'dark' },
    annotations
  };

  if (priceLevelChart) {
    priceLevelChart.updateOptions(options, true, true);
  } else {
    priceLevelChart = new ApexCharts(container, options);
    priceLevelChart.render();
  }
}

export function destroyPriceLevelChart() {
  if (priceLevelChart) {
    priceLevelChart.destroy();
    priceLevelChart = null;
  }
}
