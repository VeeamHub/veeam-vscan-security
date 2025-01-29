import { Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { StatsCards } from './components/StatsCards';
import { VulnerabilityTrendChart } from './components/VulnerabilityTrendChart';
import { SeverityDistribution } from './components/SeverityDistribution';
import { VulnerableServers } from './components/VulnerableServers';

export default function Dashboard() {
  const { toast } = useToast();
  const {
    stats,
    trends,
    vulnerableServers,
    isLoading,
    error,
    refetchAll,
    setDateRange
  } = useDashboardStats();

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 mb-4">Error loading dashboard data</p>
        <Button onClick={() => refetchAll()} variant="outline">
          Retry
        </Button>
      </Card>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading dashboard data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Shield className="h-5 w-5" />
            Security Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor vulnerability trends and security status across your Servers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select 
            defaultValue="month" 
            onValueChange={(value) => {
              const now = new Date();
              let start = new Date();
              
              switch(value) {
                case 'week':
                  start.setDate(now.getDate() - 7);
                  break;
                case 'month':
                  start.setMonth(now.getMonth() - 1);
                  break;
                case 'quarter':
                  start.setMonth(now.getMonth() - 3);
                  break;
                case 'year':
                  start.setFullYear(now.getFullYear() - 1);
                  break;
              }
              
              setDateRange({
                start: start.toISOString(),
                end: now.toISOString()
              });
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Last month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last week</SelectItem>
              <SelectItem value="month">Last month</SelectItem>
              <SelectItem value="quarter">Last quarter</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            className="gap-2"
            onClick={() => {
              refetchAll();
              toast({
                title: "Dashboard Updated",
                description: "The dashboard data has been refreshed."
              });
            }}
          >
            <Shield className="h-4 w-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      <StatsCards stats={stats} />
      
      <div className="grid grid-cols-12 gap-4">        
        {trends && trends.length > 0 && (
          <VulnerabilityTrendChart data={trends} />
        )}
        
        <SeverityDistribution stats={stats} />
      </div>
      
      {vulnerableServers && vulnerableServers.length > 0 && (
        <VulnerableServers servers={vulnerableServers} />
      )}
    </div>
  );
}