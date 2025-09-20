// Client API per enviar sol·licituds a Google Sheets
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SollicitudMaterial {
  nomCognoms: string;
  dataNecessitat: string;
  escola: string;
  activitat: string;
  material: string;
  unitats: string;
  altresMaterials?: string;
}

export interface CartItem {
  id: string;
  escola: string;
  activitat: string;
  material: string;
  customMaterial?: string; // Para "Altres materials"
  unitats: number;
}

export interface SollicitudMultiple {
  nomCognoms: string;
  dataNecessitat: string;
  items: CartItem[];
  altresMaterials?: string; // Comentarios adicionales generales
}

class ApiClient {
  private async request<T>(action: string, data?: any, method: 'GET' | 'POST' = 'GET'): Promise<ApiResponse<T>> {
    // DEBUG: Check environment variables
    console.log('🔍 DEBUG API CLIENT:');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('API_TOKEN:', API_TOKEN);
    console.log('Is empty?', !API_BASE_URL);
    console.log('Contains DEMO?', API_BASE_URL?.includes('DEMO'));

    // MODE DEMO: Retornar dades mock si no hi ha API real configurada
    if (!API_BASE_URL || API_BASE_URL.includes('DEMO')) {
      console.log('⚠️ USING MOCK DATA');
      return this.getMockData(action, data);
    }
    console.log('✅ USING REAL API WITH FETCH');

    // Use fetch with GET to handle Google Apps Script redirects
    return this.requestWithFetch<T>(action, data);
  }

  private requestJSONP<T>(action: string, data?: any): Promise<ApiResponse<T>> {
    console.log(`🚀 Making JSONP request for action: ${action}`, data);

    return new Promise((resolve) => {
      const callbackName = `jsonp_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create callback function
      (window as any)[callbackName] = (result: ApiResponse<T>) => {
        console.log(`📥 JSONP Response for ${action}:`, result);
        resolve(result);
        // Cleanup
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
        delete (window as any)[callbackName];
      };

      // Create script element for JSONP
      const script = document.createElement('script');
      const url = new URL(API_BASE_URL);

      // Add basic parameters
      url.searchParams.append('action', action);
      url.searchParams.append('token', API_TOKEN);
      url.searchParams.append('callback', callbackName);

      // For createSollicitud, we need to handle the data differently to avoid URL length issues
      if (action === 'createSollicitud' && data?.sollicitud) {
        // Flatten sollicitud data into URL parameters
        const sollicitud = data.sollicitud;
        Object.keys(sollicitud).forEach(key => {
          const value = sollicitud[key];
          if (value) {
            url.searchParams.append(key, String(value));
          }
        });
      } else if (data) {
        // For other actions, add data as usual
        Object.keys(data).forEach(key => {
          if (data[key]) {
            url.searchParams.append(key, String(data[key]));
          }
        });
      }

      const finalUrl = url.toString();
      console.log(`🌐 JSONP URL for ${action} (${finalUrl.length} chars):`, finalUrl);

      // Check URL length to avoid Google's redirect issues
      if (finalUrl.length > 2000) {
        console.warn(`⚠️ URL too long (${finalUrl.length} chars), may cause issues`);
      }

      script.src = finalUrl;

      script.onerror = () => {
        console.error(`❌ JSONP Error for ${action}`);
        resolve({
          success: false,
          error: 'Error de xarxa o CORS'
        });
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
        delete (window as any)[callbackName];
      };

      script.onload = () => {
        console.log(`✅ JSONP script loaded for ${action}`);
      };

      document.head.appendChild(script);

      // Timeout after 15 seconds (increased for slow connections)
      setTimeout(() => {
        if ((window as any)[callbackName]) {
          console.error(`⏰ JSONP Timeout for ${action} after 15 seconds`);
          resolve({
            success: false,
            error: 'Timeout de la petició'
          });
          if (script && script.parentNode) {
            script.parentNode.removeChild(script);
          }
          delete (window as any)[callbackName];
        }
      }, 15000);
    });
  }

  private async requestWithFetch<T>(action: string, data?: any): Promise<ApiResponse<T>> {
    console.log(`🚀 Making FETCH request for action: ${action}`, data);

    try {
      const url = new URL(API_BASE_URL);
      url.searchParams.append('action', action);
      url.searchParams.append('token', API_TOKEN);

      // For createSollicitud, flatten the data
      if (action === 'createSollicitud' && data?.sollicitud) {
        const sollicitud = data.sollicitud;
        Object.keys(sollicitud).forEach(key => {
          const value = sollicitud[key];
          if (value) {
            url.searchParams.append(key, String(value));
          }
        });
      } else if (data) {
        Object.keys(data).forEach(key => {
          if (data[key]) {
            url.searchParams.append(key, String(data[key]));
          }
        });
      }

      const finalUrl = url.toString();
      console.log(`🌐 FETCH URL for ${action} (${finalUrl.length} chars):`, finalUrl);

      const response = await fetch(finalUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`📥 FETCH Response for ${action}:`, result);
      return result;

    } catch (error) {
      console.error(`❌ FETCH Error for ${action}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconegut'
      };
    }
  }

  private getMockData(action: string, data?: any): Promise<ApiResponse> {
    // Dades mock per a la demo
    const mockData: Record<string, any> = {
      getEscoles: {
        success: true,
        data: [
          'Acadèmia Futurekids',
          'Agustí Bartra',
          'Aiguaviva',
          'Albert Llanas',
          'Alexandre Galí',
          'Antic Convent',
          'Antoni Roig',
          'Arenal',
          'Baixmar',
          'Balsas',
          'Baloo',
          'Baró de Viver',
          'Bogatell',
          'Bressol Municipal El Carrilet',
          'Bressol Municipal Gargantua',
          'Bressol Pika-Pika',
          'Canigó',
          'Carlit',
          'Casas',
          'Centre de Normalització Lingüística',
          'Centre d\'Estudis Prat',
          'Centre d\'Estudis Ramón y Cajal',
          'Centre Educatiu Montseny',
          'Chopin',
          'Ciutat Jardí',
          'Concepció',
          'Cristòfor Mestre',
          'El Carmel',
          'El Clot',
          'Els Encants',
          'Els Llorers',
          'Els Pins',
          'Escola Activa El Puig',
          'Escola Bressol El Tobogan',
          'Escola d\'Art',
          'Escola de la Dona',
          'Escola Pia Balmes',
          'Escola Pia Nostra Senyora',
          'Escola Pia Sant Antoni',
          'Fort Pienc',
          'Francisco Ferrer',
          'Frederich Mistral',
          'Guinardó',
          'Horta',
          'IES Joan Coromines',
          'IES Lluís Domènech i Montaner',
          'IES Poeta Maragall',
          'Institut Escola Trinitat Nova',
          'Institut Goya',
          'Institut La Guineueta',
          'Joan Miró',
          'La Catalana',
          'La Concepció',
          'La Farigola',
          'La Llacuna',
          'La Palmera',
          'La Sagrera',
          'Lestonnac',
          'Lluís Belmes',
          'Mare de Déu del Carme',
          'Mediterrània',
          'Meridiana',
          'Miquel Bleach',
          'Montserrat',
          'Navas',
          'Nova Escola',
          'Pare Llaurador',
          'Park',
          'Pau Claris',
          'Pegaso',
          'Pere Vila',
          'Poblenou',
          'Prosperitat',
          'Provençals',
          'Psi',
          'Ramon y Cajal',
          'Reina Violant',
          'Sagrada Família',
          'Sagrat Cor',
          'Sant Antoni',
          'Sant Martí',
          'Sant Ramon Nonat',
          'Santa Anna',
          'Santíssima Trinitat',
          'Sara Borrell',
          'Tabor',
          'Tàber',
          'Torrent de Can Carabassa',
          'Tres Pins',
          'Trinitat Vella',
          'Vedruna Àngels',
          'Velázquez',
          'Vila Olímpica',
          'Virrei Amat'
        ].sort((a, b) => a.localeCompare(b, 'ca'))
      },
      getMaterials: {
        success: true,
        data: [
          'Calculadores',
          'Microscopis',
          'Pinzells',
          'Pilotes',
          'Paper de colors',
          'Tisores',
          'Pegament',
          'Cartolina',
          'Retoladors',
          'Llapis de colors'
        ]
      },
      getActivitats: {
        success: true,
        data: [
          'Matemàtiques',
          'Llengua catalana',
          'Ciències naturals',
          'Educació física',
          'Educació artística',
          'Música',
          'Anglès',
          'Història',
          'Geografia',
          'Tecnologia'
        ]
      },
      createSollicitud: {
        success: true,
        data: {
          message: 'Sol·licitud enviada correctament!',
          id: 'mock-' + Date.now()
        }
      }
    };

    // Simular petada de temps d'espera per fer-ho més realista
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(mockData[action] || { success: false, error: 'Acció mock no trobada' });
      }, 800);
    });
  }

  async getEscoles(): Promise<ApiResponse<string[]>> {
    return this.request('getEscoles', {}, 'POST');
  }

  async getMaterials(): Promise<ApiResponse<string[]>> {
    return this.request('getMaterials', {}, 'POST');
  }

  async getActivitats(): Promise<ApiResponse<string[]>> {
    return this.request('getActivitats', {}, 'POST');
  }

  async getActivitiesBySchool(school: string): Promise<ApiResponse<string[]>> {
    return this.request('getActivitiesBySchool', { school }, 'GET');
  }

  async getMaterialsByActivity(activity: string): Promise<ApiResponse<string[]>> {
    return this.request('getMaterialsByActivity', { activity }, 'GET');
  }

  async createSollicitud(data: SollicitudMaterial): Promise<ApiResponse<any>> {
    return this.request('createSollicitud', data, 'POST');
  }

  async createMultipleSollicitud(data: SollicitudMultiple): Promise<ApiResponse<any>> {
    return this.request('createMultipleSollicitud', data, 'POST');
  }
}

export const apiClient = new ApiClient();