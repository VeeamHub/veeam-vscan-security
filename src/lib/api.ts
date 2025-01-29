export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

class APIService {
  private static instance: APIService;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = 'http://localhost:3001/api';
  }

  public static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  private createUrl(path: string): string {
    
    const cleanPath = path.replace(/^[A-Za-z]:\/?/i, '');
    
    const normalizedPath = cleanPath.replace(/^\/?(api\/)?/, '');
    
    const fullUrl = `${this.baseUrl}/${normalizedPath}`;
    console.log('API URL created:', fullUrl);
    return fullUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    try {
      const url = this.createUrl(path);
      const options: RequestInit = {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: response.statusText || 'Unknown error'
        }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API ${method} request failed:`, {
        path,
        error,
        body: body ? JSON.stringify(body) : undefined
      });
      throw error;
    }
  }

  public async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  public async post<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>('POST', path, data);
  }

  public async put<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>('PUT', path, data);
  }

  public async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export const apiService = APIService.getInstance();