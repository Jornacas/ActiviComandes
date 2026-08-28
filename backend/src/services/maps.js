/**
 * Servicio de Google Maps API
 * Calcula distancias desde Eixos Creativa a las escuelas
 * Usa la nueva Routes API (v2) en lugar de la Directions API legacy
 * Implementa caché en Google Sheets para reducir llamadas API
 */

const axios = require('axios');
const catalegs = require('./catalegs');

const ORIGIN = "Carrer Ramon Turró 73, 08005 Barcelona"; // Eixos Creativa
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Calcula distancias desde Eixos Creativa a múltiples escuelas
 * @param {Array<{escola: string, adreça: string}>} schoolAddresses - Array de objetos con escola y adreça
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
async function calculateDistances(schoolAddresses) {
  try {
    console.log('🗺️ calculateDistances - Input schools:', schoolAddresses);
    console.log('🔑 GOOGLE_MAPS_API_KEY configured:', GOOGLE_MAPS_API_KEY ? 'Yes' : 'No');

    if (!schoolAddresses || schoolAddresses.length === 0) {
      console.log('❌ No school addresses provided');
      return {
        success: false,
        error: "No s'han proporcionat adreces"
      };
    }

    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
      console.warn('⚠️ Google Maps API key not configured, returning mock data');
      // Devolver datos simulados si no hay API key
      return {
        success: true,
        data: schoolAddresses.map((item, index) => ({
          address: item.adreça,
          distance: `${(index + 1) * 2} km`,
          duration: `${(index + 1) * 5} min`,
          distanceValue: (index + 1) * 2000, // metros
          durationValue: (index + 1) * 300  // segundos
        }))
      };
    }

    console.log('✅ Using Google Routes API (v2) with Sheets cache');

    // 🆕 PASO 1: Cargar distancias del caché
    const distanciesCache = await catalegs.getDistancies();
    console.log(`📦 Cache loaded: ${distanciesCache.size} distàncies guardades`);

    const results = [];
    let apiCallsCount = 0;
    let cacheHitsCount = 0;

    // Procesar cada escuela
    for (const item of schoolAddresses) {
      const { escola, adreça } = item;
      try {
        console.log(`🗺️ Processing: ${escola} - ${adreça}`);

        // 🆕 PASO 2: Buscar en caché primero
        const cached = distanciesCache.get(adreça);

        if (cached) {
          console.log(`💾 CACHE HIT! Usando distancia guardada para ${escola}`);
          cacheHitsCount++;

          const distanceKm = (cached.distancia_metres / 1000).toFixed(1);
          const durationMin = Math.ceil(cached.duracio_minuts);

          results.push({
            address: adreça,
            distance: `${distanceKm} km`,
            duration: `${durationMin} min`,
            distanceValue: cached.distancia_metres,
            durationValue: cached.duracio_minuts * 60, // convertir minutos a segundos
            fromCache: true
          });
          continue; // ⚡ Saltar llamada a API
        }

        console.log(`🔍 NOT in cache, calling API for ${escola}...`);

        // Si la dirección es "Academia" o coincide con la dirección de Eixos Creativa, distancia 0
        const isEixosCreativa = adreça && (
          adreça.toLowerCase().includes('academia') ||
          adreça.toLowerCase().includes('eixos creativa') ||
          adreça.toLowerCase().includes('ramon turró, 73') ||
          adreça.toLowerCase().includes('carrer ramon turró 73') ||
          adreça.toLowerCase().includes('llacuna, 162') ||
          adreça.toLowerCase().includes('carrer de la llacuna, 162')
        );

        if (isEixosCreativa) {
          console.log(`✅ ${escola} is Academia/Eixos Creativa - returning 0 distance`);
          results.push({
            address: adreça,
            distance: '0 km',
            duration: '0 min',
            distanceValue: 0,
            durationValue: 0
          });
          continue;
        }

        // Llamar a la nueva Routes API (v2)
        // Documentación: https://developers.google.com/maps/documentation/routes
        const response = await axios.post(
          'https://routes.googleapis.com/directions/v2:computeRoutes',
          {
            origin: {
              address: ORIGIN
            },
            destination: {
              address: adreça
            },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            computeAlternativeRoutes: false,
            languageCode: 'ca',
            units: 'METRIC'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
              'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
            }
          }
        );

        console.log(`📍 Routes API response:`, response.data);

        if (response.data.routes && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          apiCallsCount++;

          // Convertir distancia de metros a km
          const distanceKm = (route.distanceMeters / 1000).toFixed(1);

          // Convertir duración de segundos a minutos
          const durationSeconds = parseInt(route.duration.replace('s', ''));
          const durationMin = Math.ceil(durationSeconds / 60);

          const resultData = {
            address: adreça,
            distance: `${distanceKm} km`,
            duration: `${durationMin} min`,
            distanceValue: route.distanceMeters,  // meters
            durationValue: durationSeconds,   // seconds
            fromCache: false
          };

          results.push(resultData);

          console.log(`✅ Distance calculated for "${escola}":`, resultData);

          // 🆕 PASO 3: Guardar en caché para la próxima vez
          console.log(`💾 Saving to cache for ${escola}...`);
          await catalegs.saveDistancia(escola, adreça, route.distanceMeters, durationMin);
          console.log(`✅ Saved to cache!`);
        } else {
          console.log(`❌ No route found for ${escola}`);
          results.push({
            address: adreça,
            distance: "N/A",
            duration: "N/A",
            distanceValue: 99999,
            durationValue: 99999
          });
        }
      } catch (addressError) {
        const errorDetail = addressError.response?.data || addressError.message;
        console.error(`❌ Error for school ${escola}:`, errorDetail);
        results.push({
          address: adreça,
          distance: "Error",
          duration: "Error",
          distanceValue: 99999,
          durationValue: 99999,
          errorDetail: JSON.stringify(errorDetail) // TEMPORAL: Para debug
        });
      }
    }

    console.log(`✅ calculateDistances completed. ${results.length} results.`);
    console.log(`📊 Stats: ${cacheHitsCount} from cache | ${apiCallsCount} API calls`);
    console.log(`💰 API cost saved: ~$${((cacheHitsCount * 5) / 1000).toFixed(4)}`);
    return { success: true, data: results, stats: { cacheHits: cacheHitsCount, apiCalls: apiCallsCount } };

  } catch (error) {
    console.error("❌ Error en calculateDistances:", error);
    return {
      success: false,
      error: "Error calculant distàncies: " + error.message
    };
  }
}

module.exports = {
  calculateDistances
};
