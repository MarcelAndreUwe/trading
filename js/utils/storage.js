/**
 * LocalStorage Abstraktion mit JSON-Serialisierung und Fallback
 */

const STORAGE_PREFIX = 'tc_';

export function save(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

export function load(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('LocalStorage load failed:', e);
    return defaultValue;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (e) {
    console.warn('LocalStorage remove failed:', e);
  }
}

export function clear() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(STORAGE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('LocalStorage clear failed:', e);
  }
}

/** Speichert eine benannte Position */
export function savePosition(name, positionData) {
  const positions = load('saved_positions', {});
  positions[name] = { ...positionData, savedAt: new Date().toISOString() };
  save('saved_positions', positions);
}

/** Laedt alle gespeicherten Positionen */
export function loadPositions() {
  return load('saved_positions', {});
}

/** Loescht eine gespeicherte Position */
export function deletePosition(name) {
  const positions = load('saved_positions', {});
  delete positions[name];
  save('saved_positions', positions);
}
