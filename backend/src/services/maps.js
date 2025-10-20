/**
 * Servicio de Google Maps API
 * Calcula distancias desde Eixos Creativa a las escuelas
 * Usa la nueva Routes API (v2) en lugar de la Directions API legacy
 */

const axios = require('axios');

const ORIGIN = "Carrer Ramon Turró 73, 08005 Barcelona"; // Eixos Creativa
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Calcula distancias desde Eixos Creativa a múltiples direcciones
 * @param {string[]} addresses - Array de direcciones destino
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
async function calculateDistances(addresses) {
  try {
    console.log('🗺️ calculateDistances - Input addresses:', addresses);
    console.log('🔑 GOOGLE_MAPS_API_KEY configured:', GOOGLE_MAPS_API_KEY ? 'Yes' : 'No');

    if (!addresses || addresses.length === 0) {
      console.log('❌ No addresses provided');
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
        data: addresses.map((address, index) => ({
          address: address,
          distance: `${(index + 1) * 2} km`,
          duration: `${(index + 1) * 5} min`,
          distanceValue: (index + 1) * 2000, // metros
          durationValue: (index + 1) * 300  // segundos
        }))
      };
    }

    console.log('✅ Using Google Routes API (v2)');

    const results = [];

    // Procesar cada dirección
    for (const address of addresses) {
      try {
        console.log(`🗺️ Calculating distance to: ${address}`);

        // Si la dirección es "Academia" o coincide con la dirección de Eixos Creativa, distancia 0
        const isEixosCreativa = address && (
          address.toLowerCase().includes('academia') ||
          address.toLowerCase().includes('eixos creativa') ||
          address.toLowerCase().includes('ramon turró, 73') ||
          address.toLowerCase().includes('carrer ramon turró 73') ||
          address.toLowerCase().includes('llacuna, 162') ||
          address.toLowerCase().includes('carrer de la llacuna, 162')
        );

        if (isEixosCreativa) {
          console.log('✅ Address is Academia/Eixos Creativa - returning 0 distance');
          results.push({
            address: address,
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
              address: address
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

          // Convertir distancia de metros a km
          const distanceKm = (route.distanceMeters / 1000).toFixed(1);

          // Convertir duración de segundos a minutos
          const durationSeconds = parseInt(route.duration.replace('s', ''));
          const durationMin = Math.ceil(durationSeconds / 60);

          const resultData = {
            address: address,
            distance: `${distanceKm} km`,
            duration: `${durationMin} min`,
            distanceValue: route.distanceMeters,  // meters
            durationValue: durationSeconds   // seconds
          };

          results.push(resultData);

          console.log(`✅ Distance calculated for "${address}":`, resultData);
        } else {
          console.log(`❌ No route found for ${address}`);
          results.push({
            address: address,
            distance: "N/A",
            duration: "N/A",
            distanceValue: 99999,
            durationValue: 99999
          });
        }
      } catch (addressError) {
        const errorDetail = addressError.response?.data || addressError.message;
        console.error(`❌ Error for address ${address}:`, errorDetail);
        results.push({
          address: address,
          distance: "Error",
          duration: "Error",
          distanceValue: 99999,
          durationValue: 99999,
          errorDetail: JSON.stringify(errorDetail) // TEMPORAL: Para debug
        });
      }
    }

    console.log(`✅ calculateDistances completed. ${results.length} results.`);
    return { success: true, data: results };

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
