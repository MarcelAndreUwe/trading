/**
 * Globales Tooltip-System
 * Ein einzelnes #global-tooltip Element am Body.
 * Funktioniert auch in scrollbaren Containern.
 */
(function() {
  var tip = null;

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

  var hideTimer = null;

  document.addEventListener('mouseover', function(e) {
    var trigger = e.target.closest('.tooltip-trigger');
    if (!trigger) return;

    var contentEl = trigger.querySelector('.tooltip-content');
    var text = contentEl ? contentEl.textContent.trim() : trigger.getAttribute('data-tooltip');
    if (!text) return;

    var t = ensureTip();
    clearTimeout(hideTimer);
    t.textContent = text;
    t.style.display = 'block';

    requestAnimationFrame(function() {
      var rect = trigger.getBoundingClientRect();
      var tipW = t.offsetWidth;
      var tipH = t.offsetHeight;
      var vw = window.innerWidth;

      var left = rect.left + rect.width / 2 - tipW / 2;
      var top = rect.top - tipH - 10;

      if (left + tipW > vw - 16) left = vw - tipW - 16;
      if (left < 16) left = 16;
      if (top < 8) top = rect.bottom + 10;

      t.style.left = left + 'px';
      t.style.top = top + 'px';
    });
  });

  document.addEventListener('mouseout', function(e) {
    var trigger = e.target.closest('.tooltip-trigger');
    if (!trigger) return;
    hideTimer = setTimeout(function() {
      if (tip) tip.style.display = 'none';
    }, 80);
  });
})();
