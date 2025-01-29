import { useCallback } from 'react';
import { 
  generateDetailedCSV, 
  generateGroupedCSV, 
  generateDetailedHTML, 
  generateGroupedHTML, 
  downloadFile 
} from '@/utils/export-utils';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { ExternalLink } from 'lucide-react';
import { cn } from "@/lib/utils";
import VulnerabilityDetails from './VulnerabilityDetails';
import type { Vulnerability, VulnerabilitySeverity } from '@/types/vscan';

interface VulnerabilitiesTableProps {
  page: number;
  pageSize?: number;
  filters: {
    search: string;
    severity: VulnerabilitySeverity | 'all';
    vm: string;
    package: string;
    fromDate?: string;
    toDate?: string;
    scanner: string | 'all';
    status: string;
  };
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  selectedVuln: Vulnerability | null;
  onVulnSelect: (vuln: Vulnerability | null) => void;
}

export const severityColors: Record<VulnerabilitySeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200'
} as const;

export const statusLabels = {
  pending: 'Pending',
  in_review: 'In Review',
  confirmed: 'Confirmed',
  false_positive: 'False Positive',
  fixed: 'Fixed',
  wont_fix: "Won't Fix"
} as const;

function VulnerabilitiesTable({
  page,
  pageSize = 25,
  filters,
  sorting,
  onPageChange,
  onPageSizeChange,
  selectedVuln,
  onVulnSelect
}: VulnerabilitiesTableProps) {
  const { toast } = useToast();
  
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['vulnerabilities', page, pageSize, filters, sorting],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.severity !== 'all' && { severity: filters.severity }),
        ...(filters.vm && { vm: filters.vm }),
        ...(filters.package && { package: filters.package }),
        ...(filters.fromDate && { fromDate: filters.fromDate }),
        ...(filters.toDate && { toDate: filters.toDate }),
        ...(filters.scanner !== 'all' && { scanner: filters.scanner }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(sorting && { 
          sortBy: sorting.field,
          sortOrder: sorting.direction 
        })
      });

      const response = await fetch(`http://localhost:3001/api/scanner/vulnerabilities?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vulnerabilities');
      }
      return response.json();
    }
  });

  const updateVulnerabilityStatus = async (vulnId: number, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/scanner/vulnerabilities/${vulnId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update vulnerability status');
      }

      toast({
        title: "Status Updated",
        description: `Status updated to ${statusLabels[newStatus as keyof typeof statusLabels]}`,
      });

      refetch();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: "destructive"
      });
    }
  };

  const formatDate = useCallback((date?: string) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  const getVulnerabilityUrl = useCallback((cve: string): string => {
    return cve.startsWith('GHSA-')
      ? `https://github.com/advisories/${cve}`
      : `https://nvd.nist.gov/vuln/detail/${cve}`;
  }, []);

  const renderVulnerabilityRow = useCallback((vuln: Vulnerability) => {
    return (
      <div
        key={`${vuln.cve}-${vuln.id}`}
        className="p-6 border-b hover:bg-gray-50/50 transition-colors"
      >
        <div className="grid grid-cols-12 gap-8">          
          <div className="col-span-4 space-y-3">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline"
                  className={cn("px-2 py-1", severityColors[vuln.severity as VulnerabilitySeverity])}
                >
                  {vuln.severity} - {vuln.cve}
                </Badge>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  {vuln.scannerType}
                </Badge>                
                {vuln.inCisaKev && (
                  <Badge 
                    variant="destructive" 
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    CISA KEV
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium truncate" title={vuln.packageName}>
                    {vuln.packageName}
                  </h3>
                  <a
                    href={getVulnerabilityUrl(vuln.cve)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVulnSelect(vuln)}
                className="justify-start px-2 text-sm text-muted-foreground hover:text-primary w-fit"
              >
                View details
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">First Discovered</span>
                <span className="font-medium">{formatDate(vuln.discovered)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last Seen</span>
                <span className="font-medium">{formatDate(vuln.lastSeen)}</span>
              </div>
            </div>
          </div>
          
          <div className="col-span-3 space-y-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Current Version</h4>
              <div className="text-sm font-mono bg-gray-50 p-2 rounded border">
                {vuln.installedVersion}
              </div>
            </div>
            {vuln.fixedVersion && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Fixed In</h4>
                <div className="text-sm font-mono bg-gray-50 p-2 rounded border">
                  {vuln.fixedVersion}
                </div>
              </div>
            )}
          </div>
          
          <div className="col-span-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Servers Affected
              </h4>
              <div className="bg-gray-50 rounded-lg p-2 space-y-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {vuln.vmName}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="col-span-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
              <Select
                value={vuln.status || 'pending'}
                onValueChange={(value) => {
                  if (vuln.id) {
                    updateVulnerabilityStatus(vuln.id, value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Set status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formatDate, getVulnerabilityUrl, onVulnSelect, updateVulnerabilityStatus]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 mb-4">Error loading vulnerabilities</p>
        <Button onClick={() => refetch()} variant="outline">
          Retry
        </Button>
      </Card>
    );
  }

  const vulnerabilities = response?.data?.vulnerabilities || [];
  const total = response?.data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner text="Loading vulnerabilities..." />
        </div>
      ) : !vulnerabilities.length ? (
        <Card className="p-8 text-center text-gray-500">
          No vulnerabilities found
          {filters.search && " matching your search criteria"}
        </Card>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              Showing {vulnerabilities.length} of {total} vulnerabilities
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Select
                  defaultValue="csv"
                  onValueChange={async (value) => {
                    try {
                      if (value === 'csv-detailed') {
                        const csv = await generateDetailedCSV(filters);
                        const filename = `vulnerability-report-detailed-${new Date().toISOString().split('T')[0]}.csv`;
                        downloadFile(csv, filename);
                      } else {
                        const csv = await generateGroupedCSV(filters);
                        const filename = `vulnerability-report-grouped-${new Date().toISOString().split('T')[0]}.csv`;
                        downloadFile(csv, filename);
                      }
                    } catch (error) {
                      toast({
                        title: "Export Failed",
                        description: error instanceof Error ? error.message : "Failed to export CSV",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Export CSV..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv-detailed">Export Detailed CSV</SelectItem>
                    <SelectItem value="csv">Export Grouped CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Select
                  defaultValue="html"
                  onValueChange={async (value) => {
                    try {
                      if (value === 'html-detailed') {
                        const html = await generateDetailedHTML(filters);
                        const filename = `vulnerability-report-detailed-${new Date().toISOString().split('T')[0]}.html`;
                        downloadFile(html, filename);
                      } else {
                        const html = await generateGroupedHTML(filters);
                        const filename = `vulnerability-report-grouped-${new Date().toISOString().split('T')[0]}.html`;
                        downloadFile(html, filename);
                      }
                    } catch (error) {
                      toast({
                        title: "Export Failed",
                        description: error instanceof Error ? error.message : "Failed to export HTML",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Export HTML..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html-detailed">Export Detailed HTML</SelectItem>
                    <SelectItem value="html">Export Grouped HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pl-4 border-l">
              <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => onPageSizeChange(parseInt(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Card className="divide-y divide-gray-100">
            {vulnerabilities.map(renderVulnerabilityRow)}
          </Card>
          
          {total > pageSize && (
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          )}
          
          {selectedVuln && (
            <VulnerabilityDetails
              vulnerability={selectedVuln}
              onClose={() => onVulnSelect(null)}
              onStatusChange={updateVulnerabilityStatus}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default VulnerabilitiesTable;