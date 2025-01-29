import { CircleSlash, Clock, Package2, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDistance } from "date-fns";
import type { Vulnerability } from "@/types/vscan";

interface ScanItem {
  vmName: string;
  vulnerabilities?: Vulnerability[];
  scanDate?: string;
  scanDuration?: number;
  selectedDisks?: Array<{
    id: string;
    name: string;
    location: string;
    mountPath?: string;
    capacityGB?: number;
    variableName: string;
  }>;
}

interface ScanSummaryProps {
  scanConfig: {
    items: ScanItem[];
    scannerType?: string;
    scanCompleted?: boolean;
  };
}

export default function ScanSummary({ scanConfig }: ScanSummaryProps) {  
  const vulnerabilities = scanConfig.items.reduce((acc, item) => {
    const vulns = item.vulnerabilities || [];
    vulns.forEach(v => {
      if (v.severity) {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
      }
    });
    return acc;
  }, {} as Record<string, number>);
  
  const packageStats = scanConfig.items.reduce((acc, item) => {
    const vulns = item.vulnerabilities || [];
    vulns.forEach(v => {
      if (!acc[v.packageName]) {
        acc[v.packageName] = {
          name: v.packageName,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };
      }
      acc[v.packageName][v.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low']++;
    });
    return acc;
  }, {} as Record<string, { 
    name: string; 
    critical: number; 
    high: number;
    medium: number;
    low: number;
  }>);
  
  const topAffectedPackages = Object.values(packageStats)
    .sort((a, b) => {      
      if (b.critical !== a.critical) return b.critical - a.critical;      
      if (b.high !== a.high) return b.high - a.high;      
      return b.medium - a.medium;
    })
    .slice(0, 5); 
  
  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return minutes > 0 
      ? `${minutes}m ${seconds}s`
      : `${seconds}s`;
  };

  return (
    <div className="space-y-4">      
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <Server className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Scanned VMs</p>
            <p className="text-2xl font-bold">
              {scanConfig.items.length}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Package2 className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Scanner Used</p>
            <p className="text-2xl font-bold">
              {scanConfig.scannerType || 'N/A'}
            </p>
          </div>
        </Card>
      </div>
      
      {Object.keys(vulnerabilities).length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <CircleSlash className="w-4 h-4" />
            Vulnerabilities Found
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Badge variant="destructive" className="justify-between">
              Critical
              <span className="ml-2 font-mono">
                {vulnerabilities.CRITICAL || 0}
              </span>
            </Badge>
            <Badge variant="default" className="justify-between bg-orange-500">
              High
              <span className="ml-2 font-mono">
                {vulnerabilities.HIGH || 0}
              </span>
            </Badge>
            <Badge variant="default" className="justify-between bg-yellow-500">
              Medium
              <span className="ml-2 font-mono">
                {vulnerabilities.MEDIUM || 0}
              </span>
            </Badge>
            <Badge variant="default" className="justify-between bg-green-500">
              Low
              <span className="ml-2 font-mono">
                {vulnerabilities.LOW || 0}
              </span>
            </Badge>
          </div>
        </Card>
      )}
      
      {topAffectedPackages.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Package2 className="w-4 h-4" />
            Most Affected Packages
          </h3>
          <div className="space-y-2">
            {topAffectedPackages.map(pkg => (
              <div key={pkg.name} className="flex items-center justify-between">
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {pkg.name}
                </span>
                <div className="space-x-2">
                  {pkg.critical > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {pkg.critical} Critical
                    </Badge>
                  )}
                  {pkg.high > 0 && (
                    <Badge variant="default" className="bg-orange-500 text-xs">
                      {pkg.high} High
                    </Badge>
                  )}
                  {pkg.medium > 0 && (
                    <Badge variant="default" className="bg-yellow-500 text-xs">
                      {pkg.medium} Medium
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      <Card className="p-4 flex items-center gap-3">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Scan Duration</p>
          <p className="text-lg">
            {scanConfig.items[0]?.scanDuration 
              ? formatDuration(scanConfig.items[0].scanDuration)
              : 'N/A'
            }
          </p>
          {scanConfig.items[0]?.scanDate && (
            <p className="text-xs text-muted-foreground">
              Completed {formatDistance(new Date(scanConfig.items[0].scanDate), new Date(), { addSuffix: true })}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}