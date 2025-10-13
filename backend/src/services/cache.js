/**
 * Sistema de caché en memoria
 * Equivalente a CacheService.getScriptCache() de Apps Script
 */

const NodeCache = require('node-cache');

// TTL por defecto: 1 hora (3600 segundos)
const cache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 120 // Check cada 2 minutos para limpiar caché expirado
});

/**
 * Obtiene datos del caché
 * @param {string} key - Clave del caché
 * @returns {any|null} - Datos en caché o null si no existe
 */
function get(key) {
  const cached = cache.get(key);
  if (cached) {
    console.log(`[CACHE HIT] ${key}`);
    return cached;
  }
  console.log(`[CACHE MISS] ${key}`);
  return null;
}

/**
 * Guarda datos en caché
 * @param {string} key - Clave del caché
 * @param {any} data - Datos a guardar
 * @param {number} ttl - Tiempo de vida en segundos (opcional)
 */
function set(key, data, ttl = undefined) {
  if (ttl) {
    cache.set(key, data, ttl);
  } else {
    cache.set(key, data);
  }
  console.log(`[CACHE SET] ${key} (TTL: ${ttl || 'default'}s)`);
}

/**
 * Elimina una clave del caché
 * @param {string} key - Clave a eliminar
 */
function del(key) {
  cache.del(key);
  console.log(`[CACHE DEL] ${key}`);
}

/**
 * Limpia todo el caché
 */
function flush() {
  cache.flushAll();
  console.log('[CACHE FLUSH] Todo el caché limpiado');
}

/**
 * Obtiene estadísticas del caché
 */
function stats() {
  return cache.getStats();
}

module.exports = {
  get,
  set,
  del,
  flush,
  stats
};
