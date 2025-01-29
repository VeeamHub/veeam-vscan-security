import type { SelectedVM } from './vscan';

export type ScanPhase = 
  | 'mounting' 
  | 'scanning' 
  | 'analyzing' 
  | 'completed' 
  | 'failed';

  export interface ScanConfig {
    items: SelectedVM[];
    scannerType?: 'TRIVY' | 'GRYPE';
    status: string;
    logs: string[];
    mountCompleted: boolean;
    scanStarted: boolean;
    scanInProgress: boolean;
    currentPhase?: ScanPhase;
    scanCompleted?: boolean;
  }

 export interface ScanResult {
  vmName: string;
  disks: string[];
  vulnerabilities: Vulnerability[];
  scanDate: string;
  scanner: 'TRIVY' | 'GRYPE';
}

export interface Vulnerability {
  cve: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  packageName: string;
  installedVersion: string;
  fixedVersion?: string;
  description?: string;
}