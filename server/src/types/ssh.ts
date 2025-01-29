import type { Client } from 'ssh2';

export interface SSHConnection {
  client: Client;
  info: SSHServerInfo;
  lastActivity: Date;
}

export interface SSHConnectionInfo {
  host: string;
  username: string;
  password: string;
}

export interface SSHServerInfo {
  name: string;
  address: string;
  hostname?: string;
  ipAddress?: string;
}

export interface SSHCommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface SystemInfo {
  distro: string;
  version: string;
  family: 'rhel' | 'debian' | 'unknown';
}
  
  export interface GithubRelease {
    tag_name: string;
    name: string;
    published_at: string;
  }
  
  export interface MountInfo {
    device: string;
    mountPoint: string;
    fsType: string;
    options: string[];
  }
  
  export interface MountResult extends SSHCommandResult {
    mountInfo?: MountInfo;
  }
  
  export interface SSHConnectionResult {
    success: boolean;
    info?: SSHServerInfo;
    error?: string;
  }
  
  export interface SystemCheckResult {
    success: boolean;
    systemInfo?: SystemInfo;
    scanners: {
      trivy: {
        installed: boolean;
        version: string;
      };
      grype: {
        installed: boolean;
        version: string;
      };
    };
  }
  
  export interface SSHSession {
    id: string;
    serverInfo: SSHServerInfo;
    lastActivity: Date;
    isActive: boolean;
  }
  
  export interface SSHClientConfig {
    host: string;
    username: string;
    password: string;
    readyTimeout?: number;
    keepaliveInterval?: number;
    port?: number;
  }
  
  export interface SSHServiceConfig {
    timeoutMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    cleanupIntervalMs?: number;
    sessionTimeoutMs?: number;
  }
  
  export interface SSHMetrics {
    totalConnections: number;
    activeConnections: number;
    failedConnections: number;
    totalCommands: number;
    failedCommands: number;
    avgResponseTime: number;
  }
  
  export interface SSHError extends Error {
    code?: string;
    level?: string;
    syscall?: string;
  }
  
  export interface CommandExecutionContext {
    serverId: string;
    command: string;
    timeout?: number;
    retries?: number;
    silent?: boolean;
  }
  
  export interface ExecutionResult {
    exitCode: number;
    stdout: string;
    stderr: string;
    duration: number;
  }
  
  export interface SSHHealthCheck {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    issues: Array<{
      severity: 'low' | 'medium' | 'high';
      message: string;
      code: string;
    }>;
  }

  export interface MountPoint {
    device: string;
    mountPath: string;
    fsType: string;
    options: string[];
  }
  
  export interface MountInfo extends MountPoint {
    mounted: boolean;
    error?: string;
  }
  
  export interface MountResult extends SSHCommandResult {
    mountInfo?: MountInfo;
  }

  export interface DiskInfo {
    device: string;
    mountPath: string;
    fsType: string;
    options: string[];
    mounted: boolean;
    error?: string;
  }
  
  export interface MountResponse {
    success: boolean;
    error?: string;
    mountInfo?: DiskInfo;
  }
  
  export interface SSHError extends Error {
    code?: string;
    level?: string;
    syscall?: string;
  }