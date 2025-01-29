import type { DashboardStats, VulnerabilityTrendData } from '@/types/vscan';

class DashboardService {
  private static instance: DashboardService;
  private readonly API_URL = '/api/scanner';

  private constructor() {}

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  public async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await fetch(`${this.API_URL}/dashboard-stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  public async getVulnerabilityTrends(dateRange?: { start: string; end: string }): Promise<VulnerabilityTrendData[]> {
    try {
      const queryParams = new URLSearchParams();
      if (dateRange) {
        queryParams.append('start', dateRange.start);
        queryParams.append('end', dateRange.end);
      }

      const response = await fetch(`${this.API_URL}/vulnerability-trends?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vulnerability trends');
      }
      const data = await response.json();
      return data.trends;
    } catch (error) {
      console.error('Error fetching vulnerability trends:', error);
      throw error;
    }
  }

  public async getMostVulnerableServers(): Promise<{
    name: string;
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    total: number;
  }[]> {
    try {
      const response = await fetch(`${this.API_URL}/most-vulnerable-servers`);
      if (!response.ok) {
        throw new Error('Failed to fetch most vulnerable servers');
      }
      const data = await response.json();
      return data.servers;
    } catch (error) {
      console.error('Error fetching most vulnerable servers:', error);
      throw error;
    }
  }
}

export const dashboardService = DashboardService.getInstance();