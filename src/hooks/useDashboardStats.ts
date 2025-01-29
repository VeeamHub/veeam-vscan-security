import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';


export function useDashboardStats() {
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | undefined>();


  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getDashboardStats(),
    refetchInterval: 30000, 
  });

  
  const trendsQuery = useQuery({
    queryKey: ['vulnerability-trends', dateRange],
    queryFn: () => dashboardService.getVulnerabilityTrends(dateRange),
    refetchInterval: 60000, 
  });

  
  const serversQuery = useQuery({
    queryKey: ['vulnerable-servers'],
    queryFn: () => dashboardService.getMostVulnerableServers(),
    refetchInterval: 60000,  
  });
 
  const isLoading = statsQuery.isLoading || trendsQuery.isLoading || serversQuery.isLoading;
  
  const error = statsQuery.error || trendsQuery.error || serversQuery.error;

  
  const refetchAll = async () => {
    await Promise.all([
      statsQuery.refetch(),
      trendsQuery.refetch(),
      serversQuery.refetch()
    ]);
  };

  return {
    stats: statsQuery.data,
    trends: trendsQuery.data,
    vulnerableServers: serversQuery.data,
    isLoading,
    error,
    refetchAll,
    setDateRange
  };
}