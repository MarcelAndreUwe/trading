/**
 * Globales Tooltip-System
 *
 * Zwei Typen von Tooltips, beide an Body verankert:
 *
 * 1) .tooltip-trigger — Begriffserklärungen
 *    - Inhalt aus verschachteltem .tooltip-content oder data-tooltip Attribut
 *    - Hover-Verhalten (Maus) + Tap-Verhalten (Touch)
 *
 * 2) .calc-trigger — Rechenweg-Erklärungen
 *    - Inhalt aus data-calc-formula, data-calc-filled, data-calc-explanation
 *    - Strukturierter 3-Sektions-Tooltip (Formel, Werte, Erklärung)
 *    - Hover-Verhalten auf Desktop + Tap-to-open/Tap-outside auf Touch
 *
 * Der globale Tooltip wird dynamisch positioniert (über/unter dem Element,
 * an Viewport-Rand geclamped, max. 480px breit, scroll bei Überlauf).
 */
(function() {
  var tip = null;
  var currentTrigger = null;
  var hideTimer = null;
  var touchActive = false;

  // Heuristik: Touch-Gerät erkennen
  function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  function ensureTip() {
    if (tip) return tip;
    tip = document.getElementById('global-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'global-tooltip';
      document.body.appendChild(tip);
    }
    return tip;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Bestimmt Tooltip-Inhalt aus dem Trigger.
   * Gibt entweder ein HTML-Snippet (für calc-trigger) oder einen einfachen Text zurück.
   */
  function getTooltipContent(trigger) {
    if (trigger.classList.contains('calc-trigger')) {
      var name = trigger.getAttribute('data-calc-name') || '';
      var formula = trigger.getAttribute('data-calc-formula') || '';
      var filled = trigger.getAttribute('data-calc-filled') || '';
      var result = trigger.getAttribute('data-calc-result') || '';
      var explanation = trigger.getAttribute('data-calc-explanation') || '';
      var html = '';
      if (name) html += '<div class="calc-tip-name">' + escapeHtml(name) + '</div>';
      if (formula) html += '<div class="calc-tip-section"><div class="calc-tip-label">Formel</div><div class="calc-tip-formula">' + escapeHtml(formula) + '</div></div>';
      if (filled) html += '<div class="calc-tip-section"><div class="calc-tip-label">Mit deinen Werten</div><div class="calc-tip-filled">' + escapeHtml(filled) + '</div></div>';
      if (result) html += '<div class="calc-tip-section"><div class="calc-tip-label">Ergebnis</div><div class="calc-tip-result">' + escapeHtml(result) + '</div></div>';
      if (explanation) html += '<div class="calc-tip-section"><div class="calc-tip-label">Erklärung</div><div class="calc-tip-explanation">' + escapeHtml(explanation) + '</div></div>';
      return { html: html, isCalc: true };
    }

    // Begriffstooltip
    var contentEl = trigger.querySelector('.tooltip-content');
    var text = contentEl ? contentEl.textContent.trim() : trigger.getAttribute('data-tooltip');
    return { html: escapeHtml(text || ''), isCalc: false };
  }

  function positionTip(trigger) {
    var t = ensureTip();
    var rect = trigger.getBoundingClientRect();
    var tipW = t.offsetWidth;
    var tipH = t.offsetHeight;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var left = rect.left + rect.width / 2 - tipW / 2;
    var top = rect.top - tipH - 10;

    if (left + tipW > vw - 12) left = vw - tipW - 12;
    if (left < 12) left = 12;
    if (top < 8) {
      // Unterhalb anzeigen
      top = rect.bottom + 10;
      // Falls auch unten kein Platz: maximal sichtbar halten
      if (top + tipH > vh - 8) top = Math.max(8, vh - tipH - 8);
    }

    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }

  function showTooltip(trigger) {
    var content = getTooltipContent(trigger);
    if (!content.html) return;

    var t = ensureTip();
    clearTimeout(hideTimer);
    t.innerHTML = content.html;
    t.className = content.isCalc ? 'is-calc' : '';
    t.style.display = 'block';
    currentTrigger = trigger;

    requestAnimationFrame(function() { positionTip(trigger); });
  }

  function hideTooltip(immediate) {
    var delay = immediate ? 0 : 80;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function() {
      if (tip) tip.style.display = 'none';
      currentTrigger = null;
    }, delay);
  }

  // ===== Hover-Verhalten (Desktop) =====
  document.addEventListener('mouseover', function(e) {
    if (touchActive) return; // Touch hat Vorrang
    var trigger = e.target.closest('.tooltip-trigger, .calc-trigger');
    if (!trigger) return;
    showTooltip(trigger);
  });

  document.addEventListener('mouseout', function(e) {
    if (touchActive) return;
    var trigger = e.target.closest('.tooltip-trigger, .calc-trigger');
    if (!trigger) return;
    hideTooltip(false);
  });

  // ===== Tap-Verhalten (Touch) =====
  document.addEventListener('touchstart', function() {
    touchActive = true;
  }, { passive: true });

  document.addEventListener('click', function(e) {
    // Nicht aktiv, wenn nicht touch oder wenn Text selektiert etc.
    var trigger = e.target.closest('.tooltip-trigger, .calc-trigger');

    if (trigger) {
      // Trigger angeklickt
      if (currentTrigger === trigger && tip && tip.style.display === 'block') {
        // Erneuter Klick auf gleichen Trigger → schließen
        hideTooltip(true);
      } else {
        // Anderen Trigger angeklickt → zeigen
        showTooltip(trigger);
      }
      if (touchActive) e.preventDefault();
    } else {
      // Click außerhalb → schließen (nur auf Touch)
      if (touchActive && tip && tip.style.display === 'block') {
        // Aber nicht, wenn auf Tooltip selbst geklickt
        if (!e.target.closest('#global-tooltip')) {
          hideTooltip(true);
        }
      }
    }
  });

  // Schließen bei Scroll (sonst fliegt der Tooltip wohin)
  window.addEventListener('scroll', function() {
    if (tip && tip.style.display === 'block') hideTooltip(true);
  }, { passive: true, capture: true });

  // Beim Resize neu positionieren
  window.addEventListener('resize', function() {
    if (currentTrigger && tip && tip.style.display === 'block') {
      positionTip(currentTrigger);
    }
  });
})();
