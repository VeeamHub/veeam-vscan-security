import { apiService } from '../api';
import type { 
  Vulnerability, 
  VulnerabilitySeverity, 
  ScannerType 
} from '@/types/vscan';

export interface VulnerabilitiesParams {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  vmNames?: string[];
  vmSearch?: string;
  cve?: string;
  severities?: VulnerabilitySeverity[];
  scanners?: ScannerType[];
}

export interface VulnerabilitiesResponse {
  success: boolean;
  data: {
    vulnerabilities: Vulnerability[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

class VulnerabilitiesService {
  private static instance: VulnerabilitiesService;
  private readonly basePath = 'scanner/vulnerabilities';
  private readonly defaultLimit = 20;

  private constructor() {}

  public static getInstance(): VulnerabilitiesService {
    if (!VulnerabilitiesService.instance) {
      VulnerabilitiesService.instance = new VulnerabilitiesService();
    }
    return VulnerabilitiesService.instance;
  }

  private buildQueryString(params: VulnerabilitiesParams = {}): string {
    const searchParams = new URLSearchParams();
    
    searchParams.append('page', (params.page || 1).toString());
    searchParams.append('limit', (params.limit || this.defaultLimit).toString());

    if (params.fromDate) searchParams.append('fromDate', params.fromDate);
    if (params.toDate) searchParams.append('toDate', params.toDate);
    if (params.vmSearch) searchParams.append('vmSearch', params.vmSearch);
    if (params.cve) searchParams.append('cve', params.cve);

    if (params.vmNames?.length) {
      params.vmNames.forEach(vm => searchParams.append('vmNames[]', vm));
    }

    if (params.severities?.length) {
      params.severities.forEach(severity => searchParams.append('severities[]', severity));
    }

    if (params.scanners?.length) {
      params.scanners.forEach(scanner => searchParams.append('scanners[]', scanner));
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }


  public async getVulnerabilities(params: VulnerabilitiesParams = {}): Promise<VulnerabilitiesResponse> {
    try {
      const queryString = this.buildQueryString(params);
      const url = `${this.basePath}${queryString}`;

      console.log('Requesting vulnerabilities with URL:', url);
      const response = await apiService.get<VulnerabilitiesResponse>(url);
      
      if (!params.vmSearch && !params.cve && !params.severities?.length && 
          response.data.vulnerabilities.length === 0) {
        return this.getVulnerabilities({ page: 1, limit: this.defaultLimit });
      }

      return response;
    } catch (error) {
      console.error('Failed to fetch vulnerabilities:', error);
      throw new Error('Failed to fetch vulnerabilities');
    }
  }

  public async getVulnerabilityDetails(id: number): Promise<Vulnerability> {
    try {
      return await apiService.get<Vulnerability>(`${this.basePath}/${id}`);
    } catch (error) {
      console.error('Failed to fetch vulnerability details:', error);
      throw new Error('Failed to fetch vulnerability details');
    }
  }

  public async updateVulnerabilityStatus(id: number, status: string): Promise<void> {
    try {
      await apiService.put(`${this.basePath}/${id}/status`, { status });
    } catch (error) {
      console.error('Failed to update vulnerability status:', error);
      throw new Error('Failed to update vulnerability status');
    }
  }
}

export const vulnerabilitiesService = VulnerabilitiesService.getInstance();