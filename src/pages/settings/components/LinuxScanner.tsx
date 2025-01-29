import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import ScannerStatus from '@/components/ui/ScannerStatus';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { useVScan } from '@/store/vscan-context';
import { useSSH } from '@/store/SSHContext';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useLinuxServers } from '@/hooks/useLinuxServers';
import { scannerService } from '@/services/scanner.service';
import { 
  AlertCircle, 
  Server, 
  User, 
  Key, 
  CheckCircle2,
  Settings,
  Terminal,
  RefreshCw
} from 'lucide-react';
import type { 
  VBRLinuxServer, 
  LinuxServerConfig, 
  ManualLinuxServer,
  LinuxCredentials 
} from '@/types/vscan';
import type { 
  SSHResponse, 
  SystemCheckResult, 
  SSHConnectionDetails 
} from '@/types/ssh';


const DEFAULT_CREDENTIALS: LinuxCredentials = {
  username: '',
  password: ''
};

const DEFAULT_MANUAL_SERVER: Omit<ManualLinuxServer, 'isManaged'> = {
  address: '',
  description: ''
};

const DEFAULT_SSH_DETAILS: SSHConnectionDetails = {
  hostname: '',
  osInfo: '',
  ipAddress: '',
  version: ''
};

const DEFAULT_RESPONSE: SSHResponse = {
  success: false,
  details: DEFAULT_SSH_DETAILS
};

interface LinuxScannerState {
  testResult: SSHResponse | null;
  systemCheck: SystemCheckResult;
  configType: 'vbr' | 'manual';
  vbrServer: VBRLinuxServer | null;
  manualServer: Omit<ManualLinuxServer, 'isManaged'>;
  credentials: LinuxCredentials;
  isTesting: boolean;
  isSaving: boolean;
  error: string | null;
}

export default function LinuxScanner() {
  const { toast } = useToast();
  const { connected: vbrConnected } = useVScan();
  const { isConnected: sshConnected, connectedServer, establishConnection, disconnect } = useSSH();
  const { getLinuxServers } = useLinuxServers();  
  
  const { data: vbrServers = [], isLoading: isLoadingServers } = useQuery({
    queryKey: ['linux-servers', vbrConnected], 
    queryFn: getLinuxServers,
    enabled: vbrConnected && !sshConnected, 
    staleTime: 0, 
    gcTime: 0  
  });

  const [state, setState] = useState<LinuxScannerState>({
    testResult: null,
    systemCheck: {
      success: false,
      systemInfo: {
        distro: '',
        version: '',
        family: 'unknown'
      },
      scanners: {
        trivy: { installed: false, version: '' },
        grype: { installed: false, version: '' }
      }
    },
    configType: 'vbr',
    vbrServer: null,
    manualServer: DEFAULT_MANUAL_SERVER,
    credentials: DEFAULT_CREDENTIALS,
    isTesting: false,
    isSaving: false,
    error: null
  });
  
  const generateServerId = (server: VBRLinuxServer): string => {
    return server.id || `vbr-${server.name}`;
  };
  
  useEffect(() => {
    const loadSavedConfig = () => {
      try {
        const stored = localStorage.getItem('linux-server-config');
        if (stored) {
          const config = JSON.parse(stored) as LinuxServerConfig;
          setState(prev => ({
            ...prev,
            configType: config.serverType,
            vbrServer: config.vbrServer ? {
              name: config.vbrServer.name,
              address: config.vbrServer.address,
              description: config.vbrServer.description,
              isManaged: true,
              id: `vbr-${config.vbrServer.name}`
            } : null,
            manualServer: config.manualServer ? {
              address: config.manualServer.address,
              description: config.manualServer.description
            } : DEFAULT_MANUAL_SERVER,
            credentials: config.credentials
          }));
        }
      } catch (error) {
        console.error('Error loading saved configuration:', error);
      }
    };

    loadSavedConfig();
  }, []);
  
  const testConnection = async () => {
    setState(prev => ({ ...prev, isTesting: true, error: null }));

    try {
      const config = {
        host: state.configType === 'vbr' 
          ? state.vbrServer?.name || ''
          : state.manualServer.address,
        username: state.credentials.username,
        password: state.credentials.password
      };

      const response = await scannerService.testConnection(config);
      const completedResponse: SSHResponse = {
        ...DEFAULT_RESPONSE,
        ...response
      };

      if (completedResponse.success) {
        const systemCheckResponse = await scannerService.checkSystemRequirements(config);
        console.log('System check result:', systemCheckResponse);

        setState(prev => ({
          ...prev,
          testResult: completedResponse,
          systemCheck: systemCheckResponse,
          error: null
        }));

        toast({
          variant: "success",
          title: "Connection Successful",
          description: `Connected to ${completedResponse.details.hostname || config.host}`
        });
      } else {
        setState(prev => ({ 
          ...prev, 
          error: completedResponse.error || 'Connection failed' 
        }));

        toast({
          title: "Connection Failed",
          description: completedResponse.error || 'Failed to connect to server',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));

      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isTesting: false }));
    }
  };
  
  const save = async () => {
    setState(prev => ({ ...prev, isSaving: true }));

    try {
      const config: LinuxServerConfig = {
        serverType: state.configType,
        vbrServer: state.configType === 'vbr' && state.vbrServer ? {
          name: state.vbrServer.name,
          address: state.vbrServer.address,
          description: state.vbrServer.description,
          isManaged: true
        } : undefined,
        manualServer: state.configType === 'manual' ? {
          address: state.manualServer.address,
          description: state.manualServer.description,
          isManaged: false
        } : undefined,
        credentials: state.credentials,
        tested: state.testResult?.success || false,
        lastTestDate: new Date().toISOString(),
        scannerVersions: {
          trivy: state.systemCheck.scanners.trivy,
          grype: state.systemCheck.scanners.grype
        }
      };

      const response = await scannerService.saveConfig(config);
      if (response.success) {
        const serverAddress = state.configType === 'vbr' 
          ? state.vbrServer?.name 
          : state.manualServer.address;

        if (serverAddress) {
          const connected = await establishConnection(
            serverAddress, 
            state.credentials
          );
          
          if (!connected) {
            throw new Error('Failed to establish SSH connection');
          }
        }

        toast({
          variant: "success",
          title: "Success",
          description: "Scanner configuration saved and connected successfully"
        });
      }

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Linux Scanner Configuration
        </h2>
        {sshConnected && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Connected to {connectedServer?.hostname}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={disconnect}
              className="text-gray-500 hover:text-red-600"
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">        
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration Type
          </Label>
          <Select
            value={state.configType}
            onValueChange={(value: 'vbr' | 'manual') => 
              setState(prev => ({ ...prev, configType: value }))
            }
            disabled={sshConnected}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select configuration type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vbr">VBR Linux Server</SelectItem>
              <SelectItem value="manual">Manual Configuration</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {state.configType === 'vbr' && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            VBR Linux Server
          </Label>
          
          {!vbrConnected ? (
             <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No VBR Connection</AlertTitle>
              <AlertDescription>
                Please connect to a VBR server first to list available Linux servers.
              </AlertDescription>
            </Alert>
          ) : (
            <Select
              value={state.vbrServer ? generateServerId(state.vbrServer) : ''}
              onValueChange={(value) => {
                const server = vbrServers.find(s => generateServerId(s) === value);
                setState(prev => ({ ...prev, vbrServer: server || null }));
              }}
              disabled={isLoadingServers || sshConnected}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoadingServers 
                    ? "Loading servers..." 
                    : "Select a Linux server"
                } />
              </SelectTrigger>
              <SelectContent>
                {vbrServers.map((server: VBRLinuxServer) => (
                  <SelectItem 
                    key={generateServerId(server)} 
                    value={generateServerId(server)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{server.name}</span>
                      {server.description && (
                        <span className="text-xs text-gray-500">
                          {server.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
        
        {state.configType === 'manual' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                Server Address
              </Label>
              <Input
                value={state.manualServer.address}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  manualServer: {
                    ...prev.manualServer,
                    address: e.target.value
                  }
                }))}
                placeholder="Enter IP address or hostname"
                disabled={sshConnected}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={state.manualServer.description || ''}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  manualServer: {
                    ...prev.manualServer,
                    description: e.target.value
                  }
                }))}
                placeholder="Enter server description"
                disabled={sshConnected}
              />
            </div>
          </div>
        )}
        
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Key className="w-4 h-4" />
            SSH Credentials
          </Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </Label>
              <Input
                value={state.credentials.username}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  credentials: {
                    ...prev.credentials,
                    username: e.target.value
                  }
                }))}
                placeholder="Enter username"
                disabled={sshConnected}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Password
              </Label>
              <Input
                type="password"
                value={state.credentials.password}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  credentials: {
                    ...prev.credentials,
                    password: e.target.value
                  }
                }))}
                placeholder="Enter password"
                disabled={sshConnected}
              />
            </div>
          </div>
        </div>
        
        {state.systemCheck && (
          <div className="space-y-6">
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">System Requirements</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={testConnection}
                  disabled={state.isTesting}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${state.isTesting ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              <ScannerStatus 
                systemCheck={state.systemCheck} 
                isTesting={state.isTesting} 
              />
              
              {state.systemCheck.systemInfo && (
                <Card className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-gray-500" />
                      <h3 className="font-medium">Operating System Information</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Distribution:</span>
                        <span className="ml-2 font-medium">{state.systemCheck.systemInfo.distro}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Version:</span>
                        <span className="ml-2 font-medium">{state.systemCheck.systemInfo.version}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Family:</span>
                        <span className="ml-2 font-medium">{state.systemCheck.systemInfo.family}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {(!state.systemCheck.scanners.trivy.installed || 
                !state.systemCheck.scanners.grype.installed) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Missing Requirements</AlertTitle>
                  <AlertDescription>
                    Required scanners are not installed. They will be installed automatically when you test the connection:
                    <ul className="mt-2 list-disc list-inside">
                      {!state.systemCheck.scanners.trivy.installed && (
                        <li>Trivy Scanner</li>
                      )}
                      {!state.systemCheck.scanners.grype.installed && (
                        <li>Grype Scanner</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {state.systemCheck.scanners.trivy.installed && 
               state.systemCheck.scanners.grype.installed && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>All Requirements Met</AlertTitle>
                  <AlertDescription>
                    All required scanners are installed and configured correctly.
                    The vulnerability databases are stored in separate locations from the mount points.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={testConnection}
                disabled={state.isTesting || !(
                  state.configType === 'vbr' ? state.vbrServer : state.manualServer.address
                ) || !state.credentials.username || !state.credentials.password}
              >
                {state.isTesting ? (
                  <LoadingSpinner text="Testing connection..." />
                ) : (
                  <>
                    <Terminal className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              <Button
                onClick={save}
                disabled={!state.testResult?.success || state.isSaving}
              >
                {state.isSaving ? (
                  <LoadingSpinner text="Saving configuration..." />
                ) : (
                  "Save Configuration"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}