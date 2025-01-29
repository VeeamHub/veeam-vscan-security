import { apiService, APIResponse } from './api';
import type { VBRConfig, vscanInfo } from '@/types/vscan';

interface StatusResponse {
  connected: boolean;
  session: {
    server: string;
    lastConnection: string;
  } | null;
  vscanInfo: vscanInfo | null;
}

interface SystemInfoResponse {
  success: boolean;
  vscanInfo?: vscanInfo;
  error?: string;
}

class VScanService {
  private static _instance: VScanService | null = null;

  private constructor() {}

  public static getInstance(): VScanService {
    if (!VScanService._instance) {
      VScanService._instance = new VScanService();
    }
    return VScanService._instance;
  }

  public async connect(config: VBRConfig): Promise<APIResponse<{ success: boolean }>> {
    try {
      const response = await apiService.post<APIResponse<{ success: boolean }>>('/vbr/connect', config);
      return response;
    } catch (error) {
      console.error('Failed to connect to VBR:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await apiService.post('/vbr/disconnect', {});
    } catch (error) {
      console.error('Error disconnecting from VBR:', error);
      throw error;
    }
  }

  public async getStatus(): Promise<StatusResponse> {
    try {
      const response = await apiService.get<StatusResponse>('/vbr/status');
      return response;
    } catch (error) {
      console.error('Error getting VBR status:', error);
      return { 
        connected: false, 
        session: null, 
        vscanInfo: null 
      };
    }
  }

  public async getSystemInfo(): Promise<SystemInfoResponse> {
    try {
      const response = await apiService.get<SystemInfoResponse>('/vbr/system-info');
      return response;
    } catch (error) {
      console.error('Error getting system info:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  public async executeCommand(command: string): Promise<any> {
    try {
      const response = await apiService.post<APIResponse<any>>('/vbr/execute', { command });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error executing VBR command:', error);
      throw error;
    }
  }
}

export const vscanService = VScanService.getInstance();