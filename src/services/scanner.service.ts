import type { 
  ScanResult, 
  ScannerType,
  LinuxServerConfig
} from '../types/vscan';

import type {
  SSHConnectionInfo,
  SSHResponse,
  SystemCheckResult
} from '../types/ssh';

import { queryClient } from '@/lib/query-client';

interface ConfigResponse {
  success: boolean;
  data?: LinuxServerConfig;
  error?: string;
}

export class ScannerService {
  private static instance: ScannerService;
  private API_URL = 'http://localhost:3001/api';
  private SCANNER_ENDPOINT = '/scanner';
  private SSH_ENDPOINT = '/ssh';
  private lastConfigCheck: number | null = null;
  private isInitialCheck = true;
  private configUpdateInProgress = false;

  private constructor() {}

  public static getInstance(): ScannerService {
    if (!ScannerService.instance) {
      ScannerService.instance = new ScannerService();
    }
    return ScannerService.instance;
  }

  public async testConnection(params: SSHConnectionInfo): Promise<SSHResponse> {
    try {
      const response = await fetch(`${this.API_URL}${this.SSH_ENDPOINT}/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error('Connection test failed');
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          hostname: '',
          osInfo: '',
          ipAddress: params.host
        }
      };
    }
  }

  public async getConfig(): Promise<ConfigResponse> {
    if (this.configUpdateInProgress) {
      return { success: false, error: 'Configuration update in progress' };
    }

    try {
      this.configUpdateInProgress = true;
      
      const now = Date.now();
      if (!this.isInitialCheck && this.lastConfigCheck && (now - this.lastConfigCheck) < 5000) {
        return { success: false, error: 'Rate limit exceeded' };
      }

      this.lastConfigCheck = now;

      const response = await fetch(`${this.API_URL}${this.SCANNER_ENDPOINT}/config`);
      
      if (!response.ok) {
        throw new Error('Failed to get configuration');
      }

      const config = await response.json();
      this.isInitialCheck = false;

      return config;
    } catch (error) {
      console.error('Error getting configuration:', error);
      throw error;
    } finally {
      this.configUpdateInProgress = false;
    }
  }

  public async saveConfig(config: LinuxServerConfig) {
    try {
      if (!config.serverType || 
          (config.serverType === 'vbr' && !config.vbrServer?.name) ||
          (config.serverType === 'manual' && !config.manualServer?.address)) {
        throw new Error('Invalid server configuration');
      }

      const serverAddress = config.serverType === 'vbr' 
        ? config.vbrServer?.name 
        : config.manualServer?.address;

      if (!serverAddress) {
        throw new Error('No server address provided');
      }

      const response = await fetch(`${this.API_URL}${this.SCANNER_ENDPOINT}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      const result = await response.json();

      if (result.success) {
        await fetch(`${this.API_URL}${this.SSH_ENDPOINT}/notify-connection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serverName: serverAddress,
            serverAddress: serverAddress,
            username: config.credentials.username,
            connectionType: config.serverType
          })
        });
      }

      return result;
    } catch (error) {
      console.error('Error saving scanner config:', error);
      throw error;
    }
  }

  public async scanMountPoint(mountPath: string, scannerType: ScannerType, vmName: string): Promise<ScanResult> {
    try {
      const response = await fetch(`${this.API_URL}${this.SSH_ENDPOINT}/execute-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mountPath,
          scanner: scannerType,
          vmName
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Scan failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error during scan:', error);
      return {
        vmName,
        scanDate: new Date().toISOString(),
        scanner: scannerType,
        vulnerabilities: [],
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async saveScanResult(scanResult: ScanResult): Promise<number> {
    try {
      if (!scanResult.vmName || !scanResult.scanner || !scanResult.status) {
        throw new Error('Missing required fields');
      }

      const response = await fetch(`${this.API_URL}${this.SCANNER_ENDPOINT}/scan-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scanResult)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save scan result');
      }

      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      return result.scanId;
    } catch (error) {
      console.error('Error saving scan result:', error);
      throw error;
    }
  }

  public async checkSystemRequirements(params: SSHConnectionInfo): Promise<SystemCheckResult> {
    try {
      const response = await fetch(`${this.API_URL}${this.SSH_ENDPOINT}/system-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'System requirements check failed');
      }

      return data;
    } catch (error) {
      console.error('System check error:', error);
      throw error;
    }
  }
}

export const scannerService = ScannerService.getInstance();