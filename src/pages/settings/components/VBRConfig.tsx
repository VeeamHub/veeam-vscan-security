import { useState, useEffect } from 'react';
import { Card, Input, Button, useToast, Label } from "@/components/ui";
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useVScan } from '@/store/vscan-context';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { VBRConfig as VBRConfigType } from '@/types/vscan';

export default function VBRConfig() {
  const { toast } = useToast();
  const { 
    connected, 
    connecting, 
    serverInfo, 
    connect, 
    disconnect,
    vscanInfo,
    initializeVScan,
    refreshStatus
  } = useVScan();

  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<VBRConfigType>({
    server: '',                   
    port: 9392,                  
    username: '',                
    password: '',                
  });
  
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        setIsLoading(true);
        await initializeVScan();
        
        const response = await fetch('http://localhost:3001/api/vbr/last-config');
        const data = await response.json();
        
        if (data.success && data.config) {
          setConfig(prev => ({
            ...prev,
            server: data.config.server || '',
            port: data.config.port || 9392,
            username: data.config.username || '',
          }));
        }
      } catch (error) {
        console.error('Error initializing settings:', error);
        toast({
          title: "Initialization Error",
          description: "Could not initialize settings",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
  
    initializeSettings();
  }, [initializeVScan, toast]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await connect(config);
      
      if (success) {
        await refreshStatus();
        
        toast({
          variant: "success",
          title: "Connection successful",
          description: "Successfully connected to VBR server"
        });
      } else {
        toast({
          title: "Connection failed",
          description: "Failed to connect to VBR server",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await disconnect();
      await refreshStatus();
      toast({
        variant: "success",
        title: "Disconnected",
        description: "Successfully disconnected from VBR server"
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Disconnect error",
        description: "Failed to disconnect from VBR server",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner text="Loading VBR settings..." />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">      
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">System Requirements</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            {vscanInfo?.localConsoleInstalled ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span>Veeam Backup & Replication Console</span>
            {vscanInfo?.localConsoleVersion && (
              <span className="text-sm text-gray-500">
                (v{vscanInfo.localConsoleVersion})
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {vscanInfo?.powerShellModuleInstalled  ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span>Veeam PowerShell Module</span>
            {vscanInfo?.powerShellModuleVersion && (
              <span className="text-sm text-gray-500">
                (v{vscanInfo.powerShellModuleVersion})
              </span>
            )}
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Connection Status</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          {serverInfo && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Server: {serverInfo.server}</p>
              <p className="text-sm text-gray-600">
                Last connected: {serverInfo.lastConnection?.toLocaleString()}
              </p>
              {vscanInfo?.remoteServerVersion && (
                <p className="text-sm text-gray-600">
                  Server Version: {vscanInfo.remoteServerVersion}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
      
      <Card className="p-6 relative">
        {connecting && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
            <LoadingSpinner text="Connecting to VBR server..." />
          </div>
        )}

        <form onSubmit={handleConnect} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="server">VBR Server</Label>
              <Input
                id="server"
                value={config.server}
                onChange={(e) => setConfig(prev => ({ ...prev, server: e.target.value }))}
                placeholder="Enter VBR server address"
                disabled={connected}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={config.port}
                onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                placeholder="Enter port number"
                disabled={connected}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={config.username}
                onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                disabled={connected}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={config.password}
                onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
                disabled={connected}
              />
            </div>
          </div>

          {!vscanInfo?.powerShellModuleInstalled && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <p className="text-sm text-yellow-700">
                  Veeam PowerShell Module is required for connection
                </p>
              </div>
            </div>
          )}

          {connected ? (
            <Button 
              type="button" 
              className="w-full"
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              Disconnect
            </Button>
          ) : (
            <Button 
              type="submit" 
              className="w-full"
              disabled={
                isLoading || 
                !config.server || 
                !config.username || 
                !config.password ||
                !vscanInfo?.powerShellModuleInstalled
              }
            >
              {isLoading ? "Connecting..." : "Connect"}
            </Button>
          )}
        </form>

        {!connected && config.server && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-500">
              Last connection: {config.server}:{config.port}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}