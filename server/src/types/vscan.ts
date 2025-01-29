
export interface VBRConfig {
  server: string;
  port?: number;
  username: string;
  password: string;
}

export interface VBRSession {
  server: string;
  port: number;
  username: string;
  password: string;
  connected: boolean;
  lastConnection: Date;
  remoteVersion?: string;
}

export interface vscanInfo {
  localConsoleInstalled: boolean;
  localConsoleVersion?: string;
  powerShellModuleInstalled: boolean;
  powerShellModuleVersion?: string;
  remoteServerVersion?: string;
}

export interface LinuxServerConfig {
  serverType: 'vbr' | 'manual';
  vbrServer?: {
    name: string;
    description?: string;
    isManaged: true;
  };
  manualServer?: {
    address: string;
    description?: string;
    isManaged: false;
  };
  credentials: {
    username: string;
    password: string;
  };
  tested: boolean;
  lastTestDate?: string;
  scannerVersions?: {
    trivy?: ScannerVersionInfo;
    grype?: ScannerVersionInfo;
  };
}

export interface ScannerVersionInfo {
  installed: boolean;
  version: string;
}


export interface SystemCheckResult {
  trivyInstalled: boolean;
  trivyVersion?: string;
  grypeInstalled: boolean;
  grypeVersion?: string;
  systemInfo?: SystemInfo;
  updateStatus?: UpdateStatus;
  error?: string;
}

export interface SystemInfo {
  distro: string;
  version: string;
  family: 'rhel' | 'debian' | 'unknown';
}

export interface UpdateStatus {
  trivyUpdated: boolean;
  grypeUpdated: boolean;
}


export interface ScanResult {
  id?: number;
  scanId?: number;
  vmName: string;
  scanDate: string;
  scanner: ScannerType;
  vulnerabilities: Vulnerability[];
  scanDuration?: number;
  status: ScanStatus;
  errorMessage?: string;
}

export type ScannerType = 'TRIVY' | 'GRYPE';

export type ScanStatus = 
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

  export interface Vulnerability {
    id?: number;
    scanId?: number;
    vmName: string;   
    cve: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    packageName: string;
    installedVersion: string;
    fixedVersion?: string;
    description?: string;
    referenceUrls?: string;
    publishedDate?: string;
    discovered?: string;      
    lastSeen?: string;  
    status?: 'NEW' | 'FIXED' | 'IN_PROGRESS';
  }
  
export type VulnerabilitySeverity = 
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';

export interface VulnerabilityStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface VulnerabilityTrendData {
  date: string;
  vulnerabilities: number;
  bySeverity?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}


export interface MountInfo {
  id?: number;
  vmName: string;
  restorePointId: string;
  mountPoint: string;
  mountDate: string;
  unmountDate?: string;
  status: MountStatus;
  errorMessage?: string;
}

export interface MountPoint {
  device: string;
  mountPath: string;
  fsType: string;
  options: string[];
}

export type MountStatus = 
  | 'MOUNTED'
  | 'UNMOUNTED'
  | 'FAILED'
  | 'IN_PROGRESS';


export interface DashboardStats {
  scannedVMs: number;
  totalVulnerabilities: number;
  criticalVulns: number;
  highVulns: number;
  mediumVulns: number;
  lowVulns: number;
  lastScanDate?: string;
  trends?: VulnerabilityTrendData[];
  mountedDisks?: number;
  activeScans?: number;
}


export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}


export interface ScanFilters {
  vmName?: string;
  fromDate?: string;
  toDate?: string;
  scanner?: ScannerType;
  status?: ScanStatus;
  severity?: VulnerabilitySeverity;
}

export interface DateRange {
  fromDate: string;
  toDate: string;
}


export interface ScanTask {
  taskId: string;
  vmName: string;
  status: ScanStatus;
  progress?: number;
  startTime: string;
  endTime?: string;
  error?: string;
}

export interface BackupInfo {
  id: string;
  name: string;
  date: string;
  type: string;
  size: number;
}

export interface VBRServerResult {
  Name: string;
  Build: {
    Major: number;
    Minor: number;
    Build: number;
    Revision: number;
  };
  PatchLevel?: string;
  error?: string;
  details?: {
    type: string;
    message: string;
    stack: string;
  };
}

export interface SystemDiagnostics {
  system: {
    OS: {
      Name: string;
      Architecture: string;
      PowerShell: string;
    };
    Paths: {
      vscanInstallPath?: string;
      PowerShellModulePath: string;
    };
    CurrentUser: {
      Name: string;
      Domain: string;
      IsAdmin: boolean;
    };
  };
  registry: Record<string, {
    Exists: boolean;
    Version?: string;
    InstallPath?: string;
    Error?: string;
    Properties?: Record<string, any>;
  }>;
  vscanInfo: vscanInfo | null;
  currentSession: VBRSession | null;
  timestamp: string;
}

export interface VBRServerResult {
  success: boolean;
  error?: string;
  details?: {
    type: string;
    message: string;
    stack: string;
  };
  serverInfo?: {
    name: string;
    build: {
      major: number;
      minor: number;
      build: number;
      revision: number;
    };
    patchLevel?: string;
  };
}



export interface VBRPublishOptions {
  restorePointId: string;
  targetServer: string;
  reason?: string;
}

export interface VBRPublishSession {
  sessionId: string;
  vmName: string;
  targetServer: string;
  mountPath: string;
  timestamp: string;
  status: 'publishing' | 'published' | 'unpublishing' | 'unpublished' | 'failed';
  error?: string;
}

export interface VBRPublishResponse {
  success: boolean;
  error?: string;
  data?: {
    sessionId: string;
    vmName: string;
    targetServer: string;
    timestamp: string;
  };
}

export interface VBRUnpublishResponse {
  success: boolean;
  error?: string;
  data?: {
    sessionId: string;
    unmounted: boolean;
  };
}

export interface MountVerificationResult {
  success: boolean;
  mountPath?: string;
  error?: string;
  details?: {
    accessible: boolean;
    contents?: string;
  };
}

export interface DashboardStats {
  scannedVMs: number;
  totalVulnerabilities: number;
  criticalVulns: number;
  highVulns: number;
  mediumVulns: number;
  lowVulns: number;
  lastScanDate?: string;
  trends?: VulnerabilityTrendData[];
  mountedDisks?: number;        
  activeScans?: number;         
  scannerStatus?: {             
    trivy: boolean;
    grype: boolean;
  };
  packagesScanned?: number;     
  packagesWithVulns?: number;   
  scansByServerType?: {         
    vbr: number;
    manual: number;
  };
  averageScanTime?: number;     
}
