// API Client para Google Apps Script
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Order {
  uuid?: string;
  id: string;
  timestamp?: string;
  idPedido?: string;
  idItem?: string;
  nomCognoms?: string;
  dataNecessitat?: string;
  escola?: string;
  activitat?: string;
  material?: string;
  esMaterialPersonalitzat?: string;
  unitats?: number;
  comentarisGenerals?: string;
  estat?: string;
  dataEstat?: string;
  responsablePreparacio?: string;
  notesInternes?: string;
  // Delivery assignment fields
  modalitatEntrega?: string;
  monitorIntermediari?: string;
  escolaDestinoIntermediari?: string;
  dataEntregaPrevista?: string;
  distanciaAcademia?: string;
  notesEntrega?: string;
  // Legacy fields for backward compatibility
  nombre?: string;
  fecha?: string;
  escuela?: string;
  actividad?: string;
  unidades?: string;
  otrosMateriales?: string;
  centroEntrega?: string;
  diaEntrega?: string;
  estado?: string;
}

export interface Stats {
  total: number;
  // Catalan names (new)
  pendents?: number;
  enProces?: number;
  preparats?: number;
  entregats?: number;
  // Spanish names (legacy)
  pendientes?: number;
  enProceso?: number;
  preparados?: number;
  entregados?: number;
}

class ApiClient {
  private async request<T>(action: string, data?: any, method: 'GET' | 'POST' = 'GET'): Promise<ApiResponse<T>> {
    // DEMO MODE: Return mock data if no real API configured
    if (!API_BASE_URL || API_BASE_URL.includes('DEMO')) {
      return this.getMockData(action);
    }

    const url = new URL(API_BASE_URL);

    if (method === 'GET') {
      url.searchParams.append('action', action);
      url.searchParams.append('token', API_TOKEN);

      if (data) {
        Object.keys(data).forEach(key => {
          const value = data[key];
          // Serializar objetos complejos como JSON para evitar [object Object]
          const serializedValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
          url.searchParams.append(key, serializedValue);
        });
      }
    }

    const config: RequestInit = {
      method,
    };

    // Only add Content-Type header for POST requests with body
    if (method === 'POST') {
      config.headers = {
        'Content-Type': 'application/json',
      };
      config.body = JSON.stringify({
        action,
        token: API_TOKEN,
        ...data
      });
    }

    try {
      const response = await fetch(url.toString(), config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private getMockData(action: string): Promise<ApiResponse> {
    // Mock data for demo
    const mockData = {
      loadData: {
        success: true,
        data: {
          headers: ['UUID', 'Nombre y Apellido', 'Fecha Necesidad', 'Escuela', 'Actividad', 'Material', 'Unidades', 'Otros Materiales', 'Centro Entrega', 'Día Entrega', 'Estado'],
          rows: [
            ['uuid-1', 'María García', '25/01/2024', 'CEIP El Pinar', 'Matemáticas', 'Calculadoras', '30', '', 'Centro Norte', 'Lunes', 'Pendiente'],
            ['uuid-2', 'José Martínez', '28/01/2024', 'IES La Salle', 'Ciencias', 'Microscopios', '5', 'Portaobjetos', 'Centro Sur', 'Martes', 'En proceso'],
            ['uuid-3', 'Ana López', '30/01/2024', 'CEIP San Juan', 'Arte', 'Pinceles', '50', 'Acuarelas', 'Centro Este', 'Miércoles', 'Preparado'],
            ['uuid-4', 'Carlos Ruiz', '02/02/2024', 'IES Cervantes', 'Educación Física', 'Balones', '10', '', 'Centro Oeste', 'Jueves', 'Entregado'],
          ],
          estadisticas: {
            total: 4,
            pendientes: 1,
            enProceso: 1,
            preparados: 1,
            entregados: 1
          }
        }
      },
      processFormResponses: {
        success: true,
        data: { nuevosRegistros: 0 }
      },
      updateOrderStatus: {
        success: true,
        data: { changesMade: 1 }
      },
      updateDeliveryInfo: {
        success: true,
        data: { cambiosAplicados: 2 }
      }
    };

    return Promise.resolve(mockData[action as keyof typeof mockData] || { success: false, error: 'Mock action not found' });
  }

  async loadData(): Promise<ApiResponse<{ headers: string[], rows: any[][], estadisticas: Stats }>> {
    return this.request('loadData');
  }

  async loadDataFast(): Promise<ApiResponse<{ headers: string[], rows: any[][], estadisticas: Stats }>> {
    return this.request('loadDataFast');
  }

  async processFormResponses(): Promise<ApiResponse<{ 
    nuevosRegistros: number;
    message?: string;
    estadisticas?: Stats;
  }>> {
    return this.request('processFormResponses', {}, 'GET');
  }

  async updateOrderStatus(uuids: string[], newStatus: string): Promise<ApiResponse<{ changesMade: number }>> {
    return this.request('updateOrderStatus', { uuids: uuids.join(','), newStatus }, 'GET');
  }

  async deleteOrders(uuids: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    return this.request('deleteOrders', { uuids: uuids.join(',') }, 'GET');
  }

  async updateDeliveryInfo(): Promise<ApiResponse<{ cambiosAplicados: number }>> {
    return this.request('updateDeliveryInfo', {}, 'GET');
  }

  async getSchools(): Promise<ApiResponse<string[]>> {
    return this.request('getSchools');
  }

  async getMonitors(): Promise<ApiResponse<string[]>> {
    return this.request('getMonitors');
  }

  async getMaterials(): Promise<ApiResponse<string[]>> {
    return this.request('getMaterials');
  }

  async createOrder(orderData: any): Promise<ApiResponse<{ uuid: string }>> {
    return this.request('createOrder', { orderData: JSON.stringify(orderData) }, 'GET');
  }

  async getStats(filters?: any): Promise<ApiResponse<any>> {
    return this.request('getStats', { filters });
  }

  // New delivery management methods
  async getPreparatedOrders(): Promise<ApiResponse<any[]>> {
    return this.request('getPreparatedOrders');
  }

  async getDeliveryOptions(orders: any[]): Promise<ApiResponse<any[]>> {
    return this.request('getDeliveryOptions', { orders }, 'POST');
  }

  async createDelivery(deliveryData: any): Promise<ApiResponse<{ updatedRows: number; message: string }>> {
    return this.request('createDelivery', { deliveryData }, 'POST');
  }

  async calculateDistances(addresses: string[]): Promise<ApiResponse<any[]>> {
    return this.request('calculateDistances', { addresses }, 'POST');
  }

  async removeIntermediaryAssignment(orderIds: string[]): Promise<ApiResponse<{ updatedRows: number; message: string }>> {
    return this.request('removeIntermediaryAssignment', { orderIds: JSON.stringify(orderIds) }, 'GET');
  }
}

export const apiClient = new ApiClient();