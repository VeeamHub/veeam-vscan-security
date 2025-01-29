import { useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, FilterX } from 'lucide-react';
import VulnerabilitiesTable from './components/VulnerabilitiesTable';
import type { Vulnerability, VulnerabilitySeverity, ScannerType } from '@/types/vscan';

const ALL_SEVERITIES = 'all';
const ALL_SCANNERS = 'all';
const DEFAULT_PAGE_SIZE = 25;

export interface Filters {
  search: string;
  severity: VulnerabilitySeverity | typeof ALL_SEVERITIES;
  vm: string;
  package: string;
  fromDate: string | undefined;
  toDate: string | undefined;
  scanner: ScannerType | typeof ALL_SCANNERS;
  status: string;
}

interface Sorting {
  field: string;
  direction: 'asc' | 'desc';
}

const defaultFilters: Filters = {
  search: '',
  severity: ALL_SEVERITIES,
  vm: '',
  package: '',
  fromDate: undefined,
  toDate: undefined,
  scanner: ALL_SCANNERS,
  status: 'all'
};

export default function VulnerabilitiesPage() {
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sorting] = useState<Sorting>({
    field: 'discovered',
    direction: 'desc'
  });

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    console.log('Filter changed:', key, value); 
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); 
}, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); 
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPage(1);
  }, []);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'severity') return value !== ALL_SEVERITIES;
    if (key === 'scanner') return value !== ALL_SCANNERS;
    if (key === 'status') return value !== 'all';
    if (key === 'fromDate' || key === 'toDate') return value !== undefined;
    return value !== '';
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Shield className="h-5 w-5" />
            Vulnerabilities
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage discovered vulnerabilities across all scanned Servers
          </p>
        </div>
        <div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="gap-2"
            >
              <FilterX className="h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search vulnerabilities..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select
                value={filters.severity}
                onValueChange={(value) => handleFilterChange('severity', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Server Name</label>
              <Input
                placeholder="Filter by Server..."
                value={filters.vm}
                onChange={(e) => handleFilterChange('vm', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Package Name</label>
              <Input
                placeholder="Filter by package..."
                value={filters.package}
                onChange={(e) => handleFilterChange('package', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Scanner</label>
              <Select
                value={filters.scanner}
                onValueChange={(value) => handleFilterChange('scanner', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Scanners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scanners</SelectItem>
                  <SelectItem value="TRIVY">Trivy</SelectItem>
                  <SelectItem value="GRYPE">Grype</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
    value={filters.status}
    onValueChange={(value) => handleFilterChange('status', value)}
>
    <SelectTrigger>
        <SelectValue placeholder="All Status" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="in_review">In Review</SelectItem>
        <SelectItem value="confirmed">Confirmed</SelectItem>
        <SelectItem value="false_positive">False Positive</SelectItem>
        <SelectItem value="fixed">Fixed</SelectItem>
        <SelectItem value="wont_fix">Won't Fix</SelectItem>
    </SelectContent>
              </Select>
            </div>
          </div>
          
          <VulnerabilitiesTable
            page={page}
            pageSize={pageSize}
            filters={filters}
            sorting={sorting}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            selectedVuln={selectedVuln}
            onVulnSelect={setSelectedVuln}
          />
        </CardContent>
      </Card>
    </div>
  );
}