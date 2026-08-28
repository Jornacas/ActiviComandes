/**
 * Client API de l'app del monitor.
 *
 * Parla amb el backend Node (Express) per REST. Fins al 28-08-2026 anava contra
 * un Web App d'Apps Script per JSONP, amb dades mock incrustades i el token a la
 * URL; res d'això queda. Les dades mestres surten ara d'ActiviHub.
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

export interface ApiResponse<T = unknown> {
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
  customMaterial?: string;
  unitats: number;
}

export interface SollicitudMultiple {
  nomCognoms: string;
  dataNecessitat: string;
  items: CartItem[];
  altresMaterials?: string;
  entregaManual?: boolean;
}

class ApiClient {
  private async request<T>(
    path: string,
    { params, body }: { params?: Record<string, string>; body?: unknown } = {}
  ): Promise<ApiResponse<T>> {
    if (!API_BASE_URL) {
      return { success: false, error: 'NEXT_PUBLIC_API_URL no està configurada' };
    }

    const url = new URL(API_BASE_URL + path);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) url.searchParams.set(key, value);
    }

    try {
      const response = await fetch(url.toString(), {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      // El backend respon amb {success:false} dins d'un 4xx/5xx quan pot;
      // si no és JSON, el text del cos és el millor missatge d'error que hi ha.
      const text = await response.text();
      let parsed: ApiResponse<T>;
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          success: false,
          error: response.ok ? 'Resposta no vàlida del servidor' : `Error ${response.status}`,
        };
      }

      return parsed;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de connexió',
      };
    }
  }

  getEscoles() {
    return this.request<string[]>('/api/schools');
  }

  getMonitors() {
    return this.request<string[]>('/api/monitors');
  }

  getActivitats() {
    return this.request<string[]>('/api/activities');
  }

  getMaterials() {
    return this.request<string[]>('/api/materials');
  }

  getActivitiesBySchool(school: string) {
    return this.request<string[]>('/api/activities/by-school', { params: { school } });
  }

  getSchoolsByMonitor(monitor: string) {
    return this.request<string[]>('/api/schools/by-monitor', { params: { monitor } });
  }

  getActivitiesByMonitorAndSchool(monitor: string, school: string) {
    return this.request<string[]>('/api/activities/by-monitor-and-school', {
      params: { monitor, school },
    });
  }

  getMaterialsByActivity(activity: string) {
    return this.request<string[]>('/api/materials/by-activity', { params: { activity } });
  }

  createSollicitud(data: SollicitudMaterial) {
    return this.request('/api/sollicitud', { body: data });
  }

  createMultipleSollicitud(data: SollicitudMultiple) {
    return this.request('/api/sollicitud/multiple', { body: data });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
