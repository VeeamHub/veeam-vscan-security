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

export interface SSHCommandResponse {
  success: boolean;
  data?: string;
  error?: string;
}

export interface SSHCommandResult {
  success: boolean;
  output?: string;
  error?: string;
}
  
  export interface SSHConnectionResult {
    success: boolean;
    info?: SSHServerInfo;
    error?: string;
  }
  
  export interface SSHCredentialsResult {
    success: boolean;
    credentials?: Omit<SSHConnectionInfo, 'password'>;
    error?: string;
  }

  export interface SSHConnectionDetails {
    hostname?: string;
    osInfo?: string;
    ipAddress?: string;
    version?: string;
  }
  
  export interface SSHDisconnectionResult {
    success: boolean;
    message?: string;
    error?: string;
  }

  export interface SSHResponse {
    success: boolean;
    error?: string;
    details: SSHConnectionDetails; 
    serverInfo?: SSHServerInfo;
    systemCheck?: SystemCheckResult;
  }
  
  export interface SystemCheckResult {
    success: boolean;
    systemInfo?: {
      distro: string;
      version: string;
      family: string;
    };
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
      mountPoints: VBRPublishMountPoint[];
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
  
  export interface VBRPublishMountPoint {
    diskName: string;
    mountPath: string;
    status: string;
    sessionId: string;
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

