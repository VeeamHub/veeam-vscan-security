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
}

export interface TrivyVulnerability {
  VulnerabilityID: string;
  Severity: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion?: string;
  Description?: string;
  References?: string[];
  PublishedDate?: string;
}

export interface TrivyResult {
  Results: Array<{
    Vulnerabilities?: TrivyVulnerability[];
    Target?: string;
    Class?: string;
    Type?: string;
  }>;
  SchemaVersion?: number;
}

export interface GrypeVulnerability {
  id: string;
  severity: string;
  description?: string;
  fix?: {
    versions?: string[];
    state?: string;
  };
  advisories?: string[];
  published?: string;
  references?: string[];
}

export interface GrypeArtifact {
  name: string;
  version: string;
  type: string;
  locations?: Array<{
    path: string;
  }>;
}

export interface GrypeMatch {
  vulnerability: GrypeVulnerability;
  artifact: GrypeArtifact;
  matchDetails?: Array<{
    type: string;
    matcher: string;
    searchedBy: object;
    found: object;
  }>;
}

export interface GrypeResult {
  matches: GrypeMatch[];
  source: {
    type: string;
    target?: string;
  };
  distro?: {
    name: string;
    version: string;
  };
  descriptor?: {
    name: string;
    version: string;
  };
}

export interface vscanInfo {
  localConsoleInstalled: boolean;
  localConsoleVersion?: string;
  powerShellModuleInstalled: boolean;
  powerShellModuleVersion?: string;
  remoteServerVersion?: string;
}

export interface VBRLinuxServer {
  id?: string;
  name: string;
  address: string;
  description?: string;
  isManaged: boolean;
  credentials?: VBRCredentials;
}

export interface VBRCredentials {
  id?: string;
  name?: string;
  username: string;
  description?: string;
}

export interface VBRServerResult {
  success: boolean;
  error?: string;
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

export interface VBRServerConfig {
  name: string;
  address: string;
  description?: string;
  isManaged: true;
}

export interface ManualLinuxServer {
  address: string;
  description?: string;
  isManaged: false;
}

export interface LinuxServerConfig {
  serverType: 'vbr' | 'manual';
  vbrServer?: VBRServerConfig;
  manualServer?: ManualLinuxServer;
  credentials: LinuxCredentials;
  tested: boolean;
  lastTestDate?: string;
  scannerVersions?: {
    trivy?: ScannerVersionInfo;
    grype?: ScannerVersionInfo;
  };
}

export interface LinuxCredentials {
  username: string;
  password: string;
}

export interface ScannerVersionInfo {
  installed: boolean;
  version: string;
}

export interface VBRDisk {
  Id: string;
  Name: string;
  Label: string;
  DiskType: string;
  CapacityGB?: number;
  UsedSpaceGB?: number;
  ExistsInBackup: boolean;
  Location: string;
  IsSystem: boolean;
  VariableName: string;
  Path: string;
  Controller: {
    Type: string;
    Bus: number;
    Unit: number;
  };
}

export interface SelectedDisk {
  id: string;
  name: string;
  location: string;
  capacityGB?: number;
  mountPath?: string;
  variableName: string;
}

export interface SelectedVM {
  vmName: string;
  restorePointId: string;
  selectedDisks: SelectedDisk[];
  mountPath?: string;
}

export interface VirtualMachine {
  Id: string;
  Name: string;
  Type: string;
  Platform: string;
  JobName: string;
  JobId: string;
  LastBackupDate?: string;
}

export interface RestorePoint {
  Id: string;
  CreationTime: string;
  Type: 'Full' | 'Incremental';
  JobName: string;
  Status: string;
  ProcessedSize: number;
  TotalDisks?: number;
}

export interface PublishDetails {
  diskName: string;
  mountPoints: string[];
  accessLink: string;
  mode?: string;
  serverIps?: string[];
  serverPort?: number;
  linuxFileSystem?: boolean;
}

export interface VBRPublishDisk {
  diskName: string;
  mountPoints: string[];
  accessLink?: string;
}

export interface VBRMountPoint {
  path: string;
  type: string;
  status: string;
}

export interface VBRPublishSession {
  sessionId: string;
  vmName: string;
  targetServer: string;
  timestamp: string;
  mountPoints: VBRPublishMountPoint[];
}

export interface VBRPublishMountPoint {
  diskName: string;
  mountPath: string;
  status: string;
  originalPath?: string;
  fsType?: string;
  isSystemDisk?: boolean;
  isSubMount?: boolean;
  parentMount?: string;
}

export interface VBRPublishVerifyData {
  sessionId: string;
  serverIps: string[];
  serverPort: number | null;
  mode: string;
  mountPoints: VBRPublishMountPoint[];
  timestamp: string;
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
  details?: {
    errorType: string;
    message: string;
    stack: string;
  };
}

export interface VBRPublishVerifyResponse {
  success: boolean;
  error?: string;
  data?: VBRPublishVerifyData;
}

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
  scanId?: number;
  vmName: string;
  scanDate: string;
  scanner: ScannerType;
  vulnerabilities: Vulnerability[];
  scanDuration?: number;
  status: ScanStatus;
  errorMessage?: string;
}

export interface Vulnerability {
  id?: number;
  cve: string;
  severity: VulnerabilitySeverity;
  packageName: string;
  installedVersion: string;
  fixedVersion?: string;
  vmName: string;
  status?: string;
  discovered?: string;
  lastSeen?: string;
  scannerType?: string;
  path?: string;  
  description?: string;
  referenceUrls?: string;
  publishedDate?: string;
  inCisaKev?: boolean;
}

export type VulnerabilitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ScannerType = 'TRIVY' | 'GRYPE';
export type ScanStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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

export interface PowerShellResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: {
    type?: string;
    message?: string;
    stack?: string;
    timestamp?: string;
  };
}

export interface VBRCommandResult {
  output: string;
  exitCode: number;
  hadErrors: boolean;
  errors: string[];
  warnings: string[];
  information: string[];
}

export interface VBRPSSession {
  id: string;
  server: string;
  connected: boolean;
  lastCommand: Date;
  version?: string;
}

export interface VBRSessionError {
  message: string;
  type: string;
  stack?: string;
  timestamp: string;
}

