import { Card } from '@/components/ui/card';
import { Server, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { DashboardStats } from '@/types/vscan';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Scanned Servers</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{stats.scannedVMs}</p>
                {Boolean(stats.activeScans) && (
                  <span className="text-xs text-green-600">
                    +{stats.activeScans} scanning
                  </span>
                )}
              </div>
            </div>
            <Server className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{stats.criticalVulns}</p>
                {stats.criticalVulns > 0 && (
                  <span className="text-xs text-red-600">Needs attention</span>
                )}
              </div>
            </div>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Vulnerabilities</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{stats.totalVulnerabilities}</p>
                {stats.lastScanDate && (
                  <span className="text-xs text-gray-600">
                    Last: {new Date(stats.lastScanDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Scanner Status</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">
                  {(((stats.scannerStatus?.trivy ? 1 : 0) + (stats.scannerStatus?.grype ? 1 : 0)) / 2 * 100).toFixed(0)}%
                </p>
                {(stats.scannerStatus?.trivy || stats.scannerStatus?.grype) && (
                  <span className="text-xs text-green-600">Scanners ready</span>
                )}
              </div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </Card>
    </div>
  );
}