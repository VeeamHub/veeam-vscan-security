import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { AlertCircle, Scan } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useVScan } from '@/store/vscan-context';
import { useSSH } from '@/store/SSHContext';
import { ResultsDialog } from './components/ResultsDialog';

// Componentes
import VBRSelector from './components/VBRSelector';
import VMSelector from './components/VMSelector';
import ScannerSelector from './components/ScannerSelector';
import { ScanStatus } from '@/components/ui/scan-status';

// Servicios y tipos
import { scannerService } from '@/services/scanner.service';
import type { 
  SelectedVM, 
  Vulnerability, 
  ScannerType, 
  ScanPhase,
  ScanResult,
  TrivyResult, 
  GrypeResult,
  TrivyVulnerability,
  GrypeMatch 
} from '@/types/vscan';

interface ExtendedSelectedVM extends SelectedVM {
  vulnerabilities?: Vulnerability[];
  scanDate?: string;
  scanDuration?: number;
}

interface ScanConfig {
  items: ExtendedSelectedVM[];
  scannerType?: ScannerType;
  status: string;
  logs: string[];
  mountCompleted: boolean;
  scanStarted: boolean;
  scanInProgress: boolean;
  currentPhase?: ScanPhase;
  scanCompleted?: boolean;
  resultsViewed?: boolean;
}

const INITIAL_SCAN_CONFIG: ScanConfig = {
  items: [],
  status: '',
  logs: [],
  mountCompleted: false,
  scanStarted: false,
  scanInProgress: false,
  scanCompleted: false,
  resultsViewed: false
};

export default function ScansPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connected: vbrConnected, serverInfo, executeCommand } = useVScan();
  const { isConnected: sshConnected, connectedServer } = useSSH();
  
  const [selectedVBR, setSelectedVBR] = useState<string>(serverInfo?.server || '');
  const [scanConfig, setScanConfig] = useState<ScanConfig>(INITIAL_SCAN_CONFIG);
  const [isUnmounting, setIsUnmounting] = useState(false);
  const [forceResultsDialog, setForceResultsDialog] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCheckedConfig, setHasCheckedConfig] = useState(false);

  useEffect(() => {
    const initializePage = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const stored = localStorage.getItem('linux-server-config');
        if (stored) {
          const config = JSON.parse(stored);
          if (config) {
            setHasCheckedConfig(true);
          }
        }
      } catch (error) {
        console.error('Error initializing page:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializePage();
  }, []);

  useEffect(() => {
    if (scanConfig.scanCompleted && !scanConfig.resultsViewed) {
      localStorage.setItem('pendingScanResults', JSON.stringify({
        items: scanConfig.items,
        scannerType: scanConfig.scannerType,
        timestamp: new Date().toISOString(),
        resultsViewed: false
      }));
      setForceResultsDialog(true);
    }
  }, [scanConfig.scanCompleted, scanConfig.resultsViewed]);

  useEffect(() => {
    const pendingScan = localStorage.getItem('pendingScanResults');
    if (pendingScan) {
      try {
        const scanData = JSON.parse(pendingScan);
        if (!scanData.resultsViewed) {
          setScanConfig(prev => ({
            ...prev,
            items: scanData.items,
            scannerType: scanData.scannerType,
            scanCompleted: true,
            resultsViewed: false
          }));
          setForceResultsDialog(true);
        }
      } catch (error) {
        console.error('Error loading pending scan:', error);
      }
    }
  }, []);

  const handleSaveSelection = useCallback((selection: SelectedVM) => {
    setScanConfig(prev => ({
      ...prev,
      items: [...prev.items, selection]
    }));

    toast({
      title: 'Server Added',
      description: `Added ${selection.vmName} to queue with ${selection.selectedDisks.length} disk(s)`,
    });
  }, [toast]);

  const handleRemoveItem = useCallback((index: number) => {
    setScanConfig(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return {
        ...prev,
        items: newItems
      };
    });

    toast({
      title: 'Server Removed',
      description: 'Server removed from queue',
    });
  }, [toast]);

  const handleMountComplete = useCallback((success: boolean, mountInfo?: SelectedVM) => {
    if (success && mountInfo) {
      setScanConfig(prev => ({
        ...prev,
        mountCompleted: true,
        currentPhase: 'completed',
        logs: [
          ...prev.logs,
          `✅ Mount operation completed successfully for ${mountInfo.vmName}`,
          `📁 Mount path: ${mountInfo.mountPath || 'Not available'}`
        ]
      }));
    } else {
      setScanConfig(prev => ({
        ...prev,
        mountCompleted: false,
        currentPhase: 'failed',
        logs: [
          ...prev.logs,
          '❌ Mount operation failed'
        ]
      }));
    }
  }, []);

  const handleScannerSelect = useCallback((scanner: ScannerType) => {
    setScanConfig(prev => ({
      ...prev,
      scannerType: scanner,
      logs: [
        ...prev.logs,
        `Selected scanner: ${scanner}`
      ]
    }));
  }, []);

  const parseScanResults = useCallback((data: string, vmName: string): Vulnerability[] => {
    try {
      const results = JSON.parse(data) as TrivyResult | GrypeResult;
      
      if ('Results' in results) { 
        return results.Results.flatMap(result => 
          result.Vulnerabilities?.map((vuln: TrivyVulnerability) => ({
            cve: vuln.VulnerabilityID,
            severity: vuln.Severity.toUpperCase() as Vulnerability['severity'],
            packageName: vuln.PkgName,
            installedVersion: vuln.InstalledVersion,
            fixedVersion: vuln.FixedVersion,
            description: vuln.Description,
            referenceUrls: Array.isArray(vuln.References) ? vuln.References.join(', ') : undefined,
            publishedDate: vuln.PublishedDate,
            vmName
          })) || []
        );
      } else if ('matches' in results) { 
        return results.matches.map((match: GrypeMatch) => ({
          cve: match.vulnerability.id,
          severity: match.vulnerability.severity.toUpperCase() as Vulnerability['severity'],
          packageName: match.artifact.name,
          installedVersion: match.artifact.version,
          fixedVersion: match.vulnerability.fix?.versions?.[0],
          description: match.vulnerability.description,
          referenceUrls: Array.isArray(match.vulnerability.references) 
            ? match.vulnerability.references.join(', ') 
            : undefined,
          publishedDate: match.vulnerability.published,
          vmName,
          path: match.artifact.locations?.[0]?.path
        }));
      }
      return [];
    } catch (error) {
      console.error('Error parsing scan results:', error);
      return [];
    }
  }, []);

  const handleStartScan = useCallback(async () => {
    if (!scanConfig.mountCompleted || !scanConfig.scannerType || scanConfig.items.length === 0) {
      toast({
        title: 'Invalid Configuration',
        description: 'Please ensure disks are mounted and scanner type is selected',
        variant: 'destructive',
      });
      return;
    }
  
    if (!connectedServer?.name) {
      toast({
        title: 'Connection Error',
        description: 'No server configuration found',
        variant: 'destructive',
      });
      return;
    }
  
    let totalDuration = 0;
  
    try {
      setScanConfig(prev => ({
        ...prev,
        scanStarted: true,
        scanInProgress: true,
        currentPhase: 'scanning',
        status: 'Starting vulnerability scan...',
        logs: [...prev.logs, `Starting vulnerability scan with ${scanConfig.scannerType}...`]
      }));
  
      for (const vm of scanConfig.items) {
        const startTime = Date.now();
  
        try {
          setScanConfig(prev => ({
            ...prev,
            logs: [...prev.logs, `Starting scan for Server: ${vm.vmName}`]
          }));
  
          const mountPoint = vm.selectedDisks[0]?.mountPath?.match(/\/tmp\/Veeam\.Mount\.FS\.[^/]+/)?.[0];
  
          if (!mountPoint) {
            throw new Error(`No valid mount point found for Server ${vm.vmName}`);
          }
  
          const scanId = Date.now();
          const outputFile = `/tmp/scan-${vm.vmName}-${scanId}.json`;
  
          setScanConfig(prev => ({
            ...prev,
            logs: [...prev.logs, `Scanning mounted disks at: ${mountPoint}`]
          }));
  
          const scanCommand = scanConfig.scannerType === 'TRIVY' 
            ? `trivy fs --scanners vuln "${mountPoint}" -q -f json -o "${outputFile}"`
            : `grype dir:"${mountPoint}" -q -o json --file "${outputFile}"`;
  
          const scanResponse = await fetch(`http://localhost:3001/api/ssh/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: scanCommand,
              server: connectedServer.name,
              hostname: connectedServer.hostname,
              timeout: 300000
            })
          });
  
          if (!scanResponse.ok) {
            throw new Error(`Failed to execute scan: ${await scanResponse.text()}`);
          }  
          
          const readCommand = `cat "${outputFile}"`;
          const readResponse = await fetch(`http://localhost:3001/api/ssh/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: readCommand,
              server: connectedServer.name,
              hostname: connectedServer.hostname
            })
          });
  
          if (!readResponse.ok) {
            throw new Error(`Failed to read scan results: ${await readResponse.text()}`);
          }
  
          const readData = await readResponse.json();
          if (!readData.success || !readData.data) {
            throw new Error('Failed to read scan results');
          }
  
          const vulnerabilities = parseScanResults(readData.data, vm.vmName);
          const scanDuration = Date.now() - startTime;
          totalDuration += scanDuration;  
          
          const scanResult: ScanResult = {
            vmName: vm.vmName,
            scanDate: new Date().toISOString(),
            scanner: scanConfig.scannerType,
            vulnerabilities,
            scanDuration,
            status: 'COMPLETED'
          };
  
          await scannerService.saveScanResult(scanResult);  
          
          setScanConfig(prev => ({
            ...prev,
            items: prev.items.map(item => 
              item.vmName === vm.vmName 
                ? {
                    ...item,
                    vulnerabilities,
                    scanDate: scanResult.scanDate,
                    scanDuration: totalDuration
                  }
                : item
            ),
            logs: [
              ...prev.logs,
              `✅ Completed vulnerability scan for ${vm.vmName} in ${Math.round(scanDuration / 1000)}s`,
              `Found ${vulnerabilities.length} vulnerabilities`
            ]
          }));  
          
          const cleanupCommand = `rm "${outputFile}"`;
          await fetch(`http://localhost:3001/api/ssh/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: cleanupCommand,
              server: connectedServer.name,
              hostname: connectedServer.hostname
            })
          });
  
        } catch (vmError) {
          setScanConfig(prev => ({
            ...prev,
            logs: [...prev.logs, `❌ Error scanning Server ${vm.vmName}: ${vmError instanceof Error ? vmError.message : 'Unknown error'}`]
          }));
          throw vmError;
        }
      }
  
      setScanConfig(prev => ({
        ...prev,
        scanInProgress: false,
        currentPhase: 'completed',
        scanCompleted: true,
        status: 'Scan completed successfully',
        logs: [
          ...prev.logs, 
          `✅ Vulnerability scan completed successfully in ${Math.round(totalDuration / 1000)}s`
        ]
      }));
  
      toast({
        title: "Scan Complete",
        description: `Scanned ${scanConfig.items.length} Server(s) with ${scanConfig.scannerType}`,
      });
  
    } catch (error) {
      setScanConfig(prev => ({
        ...prev,
        scanInProgress: false,
        currentPhase: 'failed',
        status: 'Scan failed',
        logs: [
          ...prev.logs,
          `❌ Error during scan: ${error instanceof Error ? error.message : 'Unknown error'}`
        ]
      }));
  
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : 'Failed to complete scan',
        variant: "destructive"
      });
    }
  }, [scanConfig.mountCompleted, scanConfig.scannerType, scanConfig.items, connectedServer, toast, parseScanResults]);

  const handleClearLogs = useCallback(() => {
    setScanConfig(prev => ({
      ...prev,
      logs: []
    }));
  }, []);

  const handleContinueScanning = useCallback(() => {
    setForceResultsDialog(false);
    setScanConfig(prev => ({
      ...prev,
      scanCompleted: false,
      scanStarted: false,
      scanInProgress: false,
      currentPhase: undefined,
      status: '',
      logs: [],
      resultsViewed: false
    }));
    localStorage.removeItem('pendingScanResults');
    
    toast({
      title: "Continuing Scan Session",
      description: "You can now perform additional scans with the mounted servers.",
    });
  }, [toast]);

  const handleViewResults = useCallback(async (keepMounted = false) => {
    if (!scanConfig.items?.length) return;
    
    try {
      if (!keepMounted) {
        setIsUnmounting(true);
        setScanConfig(prev => ({
          ...prev,
          status: 'Unmounting disks...',
          logs: [...prev.logs, 'Starting disk unmount process...']
        }));

        for (const vm of scanConfig.items) {
          try {
            setScanConfig(prev => ({
              ...prev,
              logs: [...prev.logs, `Unmounting ${vm.vmName}...`]
            }));

            const script = `
              try {
                $ErrorActionPreference = "Stop"
                $session = Get-VBRPublishedBackupContentSession | Where-Object { $_.VMName -eq '${vm.vmName}' }
                if ($session) {
                  Write-Output "Unpublishing session for ${vm.vmName}..."
                  Unpublish-VBRBackupContent -Session $session
                  Write-Output "Successfully unpublished ${vm.vmName}"
                } else {
                  Write-Output "No published session found for ${vm.vmName}"
                }
              } catch {
                Write-Error "Failed to unpublish ${vm.vmName}: $_"
                throw
              }
            `;

            await executeCommand(script);
            
            setScanConfig(prev => ({
              ...prev,
              logs: [...prev.logs, `✅ Successfully unmounted ${vm.vmName}`]
            }));
          } catch (error) {
            setScanConfig(prev => ({
              ...prev,
              logs: [...prev.logs, `❌ Error unmounting ${vm.vmName}: ${error instanceof Error ? error.message : 'Unknown error'}`]
            }));
            throw error;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        setScanConfig(prev => ({
          ...prev,
          mountCompleted: false,
          items: []
        }));
      }

      localStorage.removeItem('pendingScanResults');
      setScanConfig(prev => ({
        ...prev,
        resultsViewed: true
      }));

      setIsUnmounting(false);
      setForceResultsDialog(false);
      navigate('/vulnerabilities');
    } catch (error) {
      setIsUnmounting(false);
      console.error('Error handling view results:', error);
      toast({
        title: "Error",
        description: "Failed to process results view. Please try again.",
        variant: "destructive"
      });
    }
  }, [navigate, scanConfig.items, toast, executeCommand]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Scan className="h-5 w-5" />
          Vulnerability Scans
        </h1>
        <p className="text-sm text-muted-foreground">
          Mount backup disks and scan them for security vulnerabilities
        </p>
      </div>
      
      {!isInitializing && !vbrConnected && (
        <Card className="p-4 mb-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <p>Please connect to a VBR server first</p>
          </div>
        </Card>
      )}
      
      {!isInitializing && hasCheckedConfig && !sshConnected && vbrConnected && (
        <Card className="p-4 mb-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <p>Please configure a Linux server in Settings first</p>
          </div>
        </Card>
      )}

      <div className="space-y-6">        
        {vbrConnected && (
          <VBRSelector 
            selectedVBR={selectedVBR}
            onSelectVBR={setSelectedVBR}
            disabled={scanConfig.scanInProgress}
          />
        )}
        
        {vbrConnected && selectedVBR && (
          <VMSelector
            vbrServer={selectedVBR}
            selectedItems={scanConfig.items}
            onSaveSelection={handleSaveSelection}
            onRemoveItem={handleRemoveItem}
            onMountComplete={handleMountComplete}
            disabled={scanConfig.scanInProgress || !sshConnected}
          />
        )}
        
        {scanConfig.mountCompleted && (
          <ScannerSelector
            selectedScanner={scanConfig.scannerType}
            onSelectScanner={handleScannerSelect}
            onStartScan={handleStartScan}
            disabled={!scanConfig.mountCompleted || scanConfig.scanInProgress || !sshConnected}
            canStartScan={scanConfig.mountCompleted && !scanConfig.scanInProgress && sshConnected}
          />
        )}
        
        {(scanConfig.logs.length > 0 || scanConfig.status) && (
          <ScanStatus
            logs={scanConfig.logs}
            onClearLogs={handleClearLogs}
            status={scanConfig.status}
            phase={scanConfig.currentPhase}
          />
        )}
        
        <ResultsDialog
          open={forceResultsDialog}
          onOpenChange={setForceResultsDialog}
          scanConfig={scanConfig}
          isUnmounting={isUnmounting}
          onContinueScanning={handleContinueScanning}
          onViewResults={handleViewResults}
        />
      </div>
    </div>
  );
}