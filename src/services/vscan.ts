import axios from 'axios';
import type { VBRConfig, vscanInfo } from '@/types/vscan';

const API_URL = 'http://localhost:3001/api/vbr';

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
  private readonly apiUrl: string;

  private constructor() {
    this.apiUrl = API_URL;
  }

  public static getInstance(): VScanService {
    if (!VScanService._instance) {
      VScanService._instance = new VScanService();
    }
    return VScanService._instance;
  }

  public async connect(config: VBRConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const { data } = await axios.post(`${this.apiUrl}/connect`, config);
      return data;
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
      await axios.post(`${this.apiUrl}/disconnect`);
    } catch (error) {
      console.error('Error disconnecting from VBR:', error);
      throw error;
    }
  }

  public async getStatus(): Promise<StatusResponse> {
    try {
      const { data } = await axios.get(`${this.apiUrl}/status`);
      return data;
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
      const { data } = await axios.get(`${this.apiUrl}/system-info`);
      return data;
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
      const { data } = await axios.post(`${this.apiUrl}/execute`, { command });
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error executing VBR command:', error);
      throw error;
    }
  }
}

export const vscanService = VScanService.getInstance();