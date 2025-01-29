import { useState, useCallback } from 'react';
import type { MountPhase } from '@/types/mount';
import { useVScan } from '@/store/vscan-context';
import { useSSH } from '@/store/SSHContext';
import { useToast } from '@/components/ui/use-toast';
import type { 
  SelectedVM,
  VBRPublishResponse,
  VBRPublishVerifyResponse,
  VBRPublishSession,
  VBRPublishMountPoint
} from '@/types/vscan';
import { MountInfo } from '@/types/mount';

interface MountState {
  isProcessing: boolean;
  sessions: Record<string, VBRPublishSession>;
  error: string | null;
  logs: string[];
  canStartScan: boolean;
  currentPhase?: MountPhase;
  reconnectionAttempts: number;
  lastReconnectionTime?: number;
}

const INITIAL_STATE: MountState = {
  isProcessing: false,
  sessions: {},
  error: null,
  logs: [],
  canStartScan: false,
  currentPhase: undefined,
  reconnectionAttempts: 0
};

const CONSTANTS = {
  INITIAL_WAIT_TIME: 10,
  VERIFY_WAIT_TIME: 15,
  MAX_VERIFY_ATTEMPTS: 5,
  MAX_MOUNT_RETRIES: 3,
  RETRY_DELAY: 5000,
  SESSION_CHECK_INTERVAL: 5000,
  RECONNECT_DELAY: 10000,
  MAX_RECONNECT_ATTEMPTS: 3
} as const;

export function useVScanMount() {
  const { toast } = useToast();
  const { executeCommand } = useVScan();
  const { 
    connectedServer,
    isConnected: sshConnected
  } = useSSH();
  
  const [mountState, setMountState] = useState<MountState>(INITIAL_STATE);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Mount log:`, message);
    setMountState(prev => ({
      ...prev,
      logs: [...prev.logs, `[${timestamp}] ${message}`]
    }));
  }, []);

  const createPublishScript = useCallback((
    vm: SelectedVM, 
    configuredServer: string,
    normalizedDiskNames: string[]
  ) => {
    const script = `
      try {
        $ErrorActionPreference = "Stop"
        
        
        Write-Output "Getting restore point: ${vm.restorePointId}"
        $restorePoint = Get-VBRRestorePoint -Id '${vm.restorePointId}'
        if (-not $restorePoint) { 
          throw "Restore point not found: ${vm.restorePointId}"
        }
        
        Write-Output "Getting target server: ${configuredServer}"
        $server = Get-VBRServer -Name '${configuredServer}'
        if (-not $server) {
          throw "Target server not found: ${configuredServer}"
        }
        
        Write-Output "Getting server credentials"
        $credentials = Get-VBRCredentials -Entity $server 
        if (-not $credentials) {
          throw "No credentials found for server ${configuredServer}"
        }

        $publishOptions = @{
          RestorePoint = $restorePoint
          TargetServerName = '${configuredServer}'
          EnableFUSEProtocol = $true
          Reason = "Security scanning"
          TargetServerCredentials = $credentials
          DiskNames = @(${normalizedDiskNames.map(name => `'${name}'`).join(',')})
        }

        Write-Output "Publishing backup content..."
        $session = Publish-VBRBackupContent @publishOptions
        if (-not $session) {
          throw "Failed to create FUSE session"
        }
        Write-Output "Session created: $($session.Id)"

        Write-Output "STARTJSON"
        @{
          success = $true
          data = @{
            sessionId = $session.Id.ToString()
            vmName = $restorePoint.Name
            targetServer = '${configuredServer}'
            timestamp = (Get-Date).ToString('o')
            selectedDisks = $publishOptions.DiskNames
          }
        } | ConvertTo-Json -Depth 10 -Compress
        Write-Output "ENDJSON"

      } catch {
        Write-Error "FUSE publication error: $_"
        Write-Output "STARTJSON"
        @{
          success = $false
          error = $_.Exception.Message
          details = @{
            errorType = $_.Exception.GetType().Name
            message = $_.Exception.Message
            stack = $_.ScriptStackTrace
          }
        } | ConvertTo-Json -Compress
        Write-Output "ENDJSON"
      }
    `;
    return script;
  }, []);

  const createVerifyScript = useCallback((
    sessionId: string, 
    selectedDiskNames: string[],
    attempt: number,
    maxAttempts: number
  ) => {
    const script = `
      try {
        $ErrorActionPreference = "Stop"
        
        
        Write-Output "Verification attempt ${attempt + 1}/${maxAttempts} for session: ${sessionId}"
        
        $session = Get-VBRPublishedBackupContentSession -Id "${sessionId}"
        if (-not $session) {
          throw "Session not found: ${sessionId}"
        }
        Write-Output "Found session"

        $contentInfo = Get-VBRPublishedBackupContentInfo -Session $session
        if (-not $contentInfo) {
          throw "No content info available"
        }
        Write-Output "Retrieved content info"

        $mountPoints = @()
        $disksFound = @()
        $selectedDiskNames = @(${selectedDiskNames.map(name => `'${name}'`).join(',')})
        
        Write-Output "Looking for disks: $($selectedDiskNames -join ', ')"
        
        foreach ($disk in $contentInfo.Disks) {
          $diskName = $disk.DiskName
          Write-Output "Processing disk: $diskName"
          
          $disksFound += $diskName
          
          if ($disk.MountPoints.Count -gt 0) {
            foreach ($point in $disk.MountPoints) {
              Write-Output "Found mount point: $point"
              if ($point -like "/tmp/Veeam.Mount.FS*") {
                Write-Output "Valid mount point: $point"
                $mountPoints += @{
                  diskName = $diskName
                  mountPath = $point 
                  status = "Ready"
                }
              } else {
                Write-Output "Invalid mount point: $point"
              }
            }
          } else {
            Write-Output "No mount points for disk: $diskName"
          }
        }

        if ($mountPoints.Count -eq 0) {
          throw "No valid mount points found for disks: $($disksFound -join ', ')"
        }

        Write-Output "Found $($mountPoints.Count) mount points"
        
        Write-Output "STARTJSON"
        @{
          success = $true
          data = @{
            sessionId = $session.Id.ToString()
            mode = "FUSE"
            mountPoints = $mountPoints
            
          }
        } | ConvertTo-Json -Depth 10 -Compress
        Write-Output "ENDJSON"
        
      } catch {
        Write-Error "Verify error: $_"
        Write-Output "STARTJSON"
        @{
          success = $false
          error = $_.Exception.Message
          details = @{
            errorType = $_.Exception.GetType().Name
            message = $_.Exception.Message
            stack = $_.ScriptStackTrace
            attempt = $attempt
          }
        } | ConvertTo-Json -Compress
        Write-Output "ENDJSON"
      }
    `;
    return script;
  }, []);

  const processVM = useCallback(async (vm: SelectedVM, retryCount: number = 0): Promise<VBRPublishSession> => {
    try {
      addLog(`=== Starting mount process for VM: ${vm.vmName} (Attempt ${retryCount + 1}/${CONSTANTS.MAX_MOUNT_RETRIES}) ===`);
      
      const normalizedDiskNames = vm.selectedDisks.map(disk => disk.name);
      addLog(`Selected disks: ${normalizedDiskNames.join(', ')}`);
      
      if (!connectedServer?.address) {
        throw new Error('No target server configuration found');
      }
      
      const configuredServer = connectedServer.address;
      
      addLog(`Publishing backup content to server: ${configuredServer}`);
      const publishScript = createPublishScript(vm, configuredServer, normalizedDiskNames);
      const publishResult = await executeCommand(publishScript);
      const publishMatch = publishResult.match(/STARTJSON\s*([\s\S]*?)\s*ENDJSON/);
      
      if (!publishMatch) {
        throw new Error('Invalid response format from VBR');
      }

      const publishData = JSON.parse(publishMatch[1].trim()) as VBRPublishResponse;
      if (!publishData.success || !publishData.data?.sessionId) {
        throw new Error(publishData.error || 'Failed to publish backup content');
      }

      addLog(`Created publish session: ${publishData.data.sessionId}`);

      
      addLog(`Waiting ${CONSTANTS.INITIAL_WAIT_TIME} seconds for initial FUSE mount...`);
      await new Promise(resolve => setTimeout(resolve, CONSTANTS.INITIAL_WAIT_TIME * 1000));

      
      addLog('Verifying mount points...');
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < CONSTANTS.MAX_VERIFY_ATTEMPTS; attempt++) {
        try {
          addLog(`Verification attempt ${attempt + 1}/${CONSTANTS.MAX_VERIFY_ATTEMPTS}`);
          
          const verifyScript = createVerifyScript(
            publishData.data.sessionId,
            normalizedDiskNames,
            attempt,
            CONSTANTS.MAX_VERIFY_ATTEMPTS
          );
          
          const verifyResult = await executeCommand(verifyScript);
          const verifyMatch = verifyResult.match(/STARTJSON\s*([\s\S]*?)\s*ENDJSON/);
            
          if (!verifyMatch) {
            throw new Error('Invalid verification response format');
          }

          const verifyData = JSON.parse(verifyMatch[1].trim()) as VBRPublishVerifyResponse;
            
          if (verifyData.success && 
            verifyData.data && 
            verifyData.data.mountPoints && 
            verifyData.data.mountPoints.length > 0) {
          
            addLog('Verification successful');

            const mountPoints = verifyData.data.mountPoints.map(point => ({
              ...point,
              mountPath: point.mountPath.match(/\/tmp\/Veeam\.Mount\.FS\.[^/]+/)?.[0] || point.mountPath,
              originalPath: point.mountPath
            }));

            mountPoints.forEach(point => {
              addLog(`Mount point mapped: ${point.originalPath} → ${point.mountPath}`);
              addLog(`Using base mount point for scanning: ${point.mountPath}`);
            });

            const newSession: VBRPublishSession = {
              sessionId: publishData.data.sessionId,
              vmName: publishData.data.vmName,
              targetServer: publishData.data.targetServer,
              timestamp: verifyData.data?.timestamp || new Date().toISOString(),
              mountPoints: mountPoints
            };

            setMountState(prev => ({
              ...prev,
              sessions: {
                ...prev.sessions,
                [vm.vmName]: newSession
              }
            }));

            addLog(`Successfully mounted disks for VM: ${vm.vmName}`);
            return newSession;
          }

          addLog(`No valid mount points yet, retrying in ${CONSTANTS.VERIFY_WAIT_TIME} seconds...`);
          await new Promise(resolve => setTimeout(resolve, CONSTANTS.VERIFY_WAIT_TIME * 1000));
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          addLog(`Verification error: ${lastError.message}`);
          
          if (attempt < CONSTANTS.MAX_VERIFY_ATTEMPTS - 1) {
            await new Promise(resolve => setTimeout(resolve, CONSTANTS.VERIFY_WAIT_TIME * 1000));
          }
        }
      }

      throw lastError || new Error('Verification failed after all attempts');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Error processing VM ${vm.vmName}: ${errorMessage}`);
      
      if (retryCount < CONSTANTS.MAX_MOUNT_RETRIES - 1) {
        addLog(`Retrying full process in ${CONSTANTS.RETRY_DELAY/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, CONSTANTS.RETRY_DELAY));
        return processVM(vm, retryCount + 1);
      }
      
      throw error;
    }
  }, [
    executeCommand,
    addLog,
    createPublishScript,
    createVerifyScript,
    connectedServer
  ]);

  const mountDisks = useCallback(async (selectedVMs: SelectedVM[], onMountComplete?: (success: boolean, mountInfo?: MountInfo) => void): Promise<boolean> => {
    if (!sshConnected || !connectedServer) {
      addLog('No target server configuration found');
      throw new Error('No target server configured');
    }
  
    try {
      setMountState(prev => ({
        ...prev,
        isProcessing: true,
        error: null,
        currentPhase: 'mounting',
        logs: []
      }));
  
      for (const vm of selectedVMs) {
        const session = await processVM(vm);
        
        const mountInfo: MountInfo = {
          vmName: vm.vmName,
          selectedDisks: session.mountPoints.map(point => ({
            mountPath: point.mountPath
          }))
        };
  
        vm.selectedDisks = vm.selectedDisks.map((disk, index) => ({
          ...disk,
          mountPath: session.mountPoints[index]?.mountPath
        }));
        
        if (onMountComplete) {
          onMountComplete(true, mountInfo);
        }
      }
  
      setMountState(prev => ({
        ...prev,
        isProcessing: false,
        canStartScan: true,
        currentPhase: 'completed'
      }));
  
      toast({
        variant: "success",
        title: "Mount Success",
        description: `Successfully mounted disks for ${selectedVMs.length} VM(s)`
      });
  
      return true;
  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Error mounting disks: ${errorMessage}`);
      
      setMountState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        canStartScan: false,
        currentPhase: 'failed'
      }));
      
      if (onMountComplete) {
        onMountComplete(false);
      }
      
      toast({
        title: "Mount Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    }
  }, [sshConnected, connectedServer, processVM, addLog, toast]);
  
  const unmountDisks = useCallback(async (vmName: string): Promise<boolean> => {
    const session = mountState.sessions[vmName];
    if (!session?.sessionId) {
      console.error('No valid session found for VM:', vmName);
      addLog(`No valid session found for VM: ${vmName}`);
      return false;
    }
  
    try {
      addLog(`Starting unmount process for VM: ${vmName}`);
  
      const script = `
        try {
          $ErrorActionPreference = "Stop"
          
          
          Write-Output "Looking for publish session: ${session.sessionId}"
          $session = Get-VBRPublishedBackupContentSession -Id "${session.sessionId}"
          
          if (-not $session) {
            throw "Session not found: ${session.sessionId}"
          }
          
          Write-Output "Found session, attempting to unpublish..."
          Unpublish-VBRBackupContent -Session $session -RunAsync
          
          Write-Output "STARTJSON"
          @{
            success = $true
            message = "Successfully unpublished session"
          } | ConvertTo-Json
          Write-Output "ENDJSON"
          
        } catch {
          Write-Error "Unpublish error: $_"
          Write-Output "STARTJSON"
          @{
            success = $false
            error = $_.Exception.Message
          } | ConvertTo-Json
          Write-Output "ENDJSON"
        }
      `;
  
      addLog('Executing unpublish command...');
      const result = await executeCommand(script);
      const match = result.match(/STARTJSON\s*([\s\S]*?)\s*ENDJSON/);
      
      if (!match) {
        throw new Error('Invalid response format from VBR command');
      }
  
      const unpublishData = JSON.parse(match[1].trim());
      if (!unpublishData.success) {
        throw new Error(unpublishData.error || 'Failed to unpublish disks');
      }
  
      setMountState(prev => {
        const { [vmName]: removed, ...remainingSessions } = prev.sessions;
        return {
          ...prev,
          sessions: remainingSessions,
          canStartScan: Object.keys(remainingSessions).length > 0
        };
      });
  
      addLog(`Successfully unpublished disks for ${vmName}`);
      toast({
        variant: "success",
        title: "Unmount Success",
        description: `Successfully unpublished disks for ${vmName}`
      });
  
      return true;
  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Unmount error:', error);
      addLog(`Error unmounting disks: ${errorMessage}`);
      
      setMountState(prev => ({
        ...prev,
        error: errorMessage,
        currentPhase: 'failed'
      }));
      
      toast({
        title: "Unmount Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    }
  }, [mountState.sessions, executeCommand, addLog, toast]);
  
  const clearLogs = useCallback(() => {
    setMountState(prev => ({
      ...prev,
      logs: []
    }));
  }, []);
  
  const getMountState = useCallback((vmName: string) => {
    return mountState.sessions[vmName] || null;
  }, [mountState.sessions]);
  
  const isVMMounted = useCallback((vmName: string) => {
    return Boolean(mountState.sessions[vmName]);
  }, [mountState.sessions]);
  
  const getAllMountPoints = useCallback((): VBRPublishMountPoint[] => {
    return Object.values(mountState.sessions).flatMap(session => session.mountPoints || []);
  }, [mountState.sessions]);
  
  const resetState = useCallback(() => {
    setMountState(INITIAL_STATE);
  }, []);
  
  return {
    mountDisks,
    unmountDisks,
    mountState,
    clearLogs,
    getMountState,
    isVMMounted,
    getAllMountPoints,
    resetState
  };
}