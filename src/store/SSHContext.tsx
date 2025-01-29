import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useVScan } from '@/store/vscan-context';
import { scannerService } from '@/services/scanner.service';
import type { LinuxCredentials } from '@/types/vscan';

export interface ServerInfo {
  name: string;
  address: string;
  hostname?: string;
  ipAddress?: string;
  osInfo?: string;
  credentials?: LinuxCredentials;
  lastConnected?: string;
}

interface SSHState {
  connectedServer: ServerInfo | null;
  isConnected: boolean;
}

interface SSHContextType extends SSHState {
  setConnectedServer: (server: ServerInfo) => void;
  setIsConnected: (connected: boolean) => void;
  disconnect: () => Promise<void>;
  checkConnection: (serverName: string) => Promise<boolean>;
  checkSavedConnection: () => Promise<void>;
  establishConnection: (serverName: string, credentials: LinuxCredentials) => Promise<boolean>;
}

interface SSHConnection {
  server_address: string;
  hostname?: string;
  ip_address?: string;
  os_info?: string;
  is_active: boolean;
}

const SSHContext = createContext<SSHContextType | undefined>(undefined);
const RECONNECT_INTERVAL = 5000; 
const MAX_RETRIES = 5;
const CONNECTION_CHECK_INTERVAL = 60000; 

export function SSHProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { connected: vbrConnected } = useVScan();
  const [state, setState] = useState<SSHState>({ 
    connectedServer: null, 
    isConnected: false 
  });

  const keepAliveRef = useRef<number>();
  const lastKeepAliveCheck = useRef<number>(0);
  const reconnectAttempts = useRef<number>(0);

  // Función de cleanup
  const cleanup = useCallback(() => {
    if (keepAliveRef.current) {
      window.clearInterval(keepAliveRef.current);
      keepAliveRef.current = undefined;
    }
    reconnectAttempts.current = 0;
    lastKeepAliveCheck.current = 0;
  }, []);
  
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startKeepAlive = useCallback((serverName: string) => {
    if (keepAliveRef.current) {
      window.clearInterval(keepAliveRef.current);
    }

    const checkKeepAlive = async () => {
      try {
        const now = Date.now();
        if (now - lastKeepAliveCheck.current < RECONNECT_INTERVAL) {
          return;
        }

        lastKeepAliveCheck.current = now;
        const response = await fetch(`http://localhost:3001/api/ssh/keepalive/${serverName}`, {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error('Keep-alive check failed');
        }
        
        reconnectAttempts.current = 0;

      } catch (error) {
        console.error('Keep-alive failed:', error);
        
        if (reconnectAttempts.current < MAX_RETRIES) {
          reconnectAttempts.current++;          
          
          const config = await scannerService.getConfig();
          if (config.success && config.data?.credentials) {
            try {
              await establishConnection(serverName, config.data.credentials);
            } catch (reconnectError) {
              console.error('Reconnection failed:', reconnectError);
            }
          }
        } else {          
          cleanup();
          setState(prev => ({
            ...prev,
            isConnected: false,
            connectedServer: null
          }));
        }
      }
    };

    keepAliveRef.current = window.setInterval(checkKeepAlive, CONNECTION_CHECK_INTERVAL);
  }, [cleanup]);

  const disconnect = useCallback(async () => {
    try {
      if (state.connectedServer?.name) {
        const response = await fetch(`http://localhost:3001/api/ssh/disconnect/${state.connectedServer.name}`, {
          method: 'POST'
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to disconnect from SSH server');
        }

        cleanup();
        setState({
          connectedServer: null,
          isConnected: false
        });

        toast({
          title: "SSH Disconnected",
          description: "Successfully disconnected from SSH server"
        });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : 'Failed to disconnect from server',
        variant: "destructive"
      });
    }
  }, [state.connectedServer, toast, cleanup]);

  const setConnectedServer = useCallback((server: ServerInfo) => {
    setState(prev => ({
      ...prev,
      connectedServer: server
    }));
  }, []);

  const setIsConnected = useCallback((connected: boolean) => {
    setState(prev => ({
      ...prev,
      isConnected: connected
    }));
  }, []);

  const checkConnection = useCallback(async (serverName: string): Promise<boolean> => {
    try {
      const now = Date.now();
      if (now - lastKeepAliveCheck.current < RECONNECT_INTERVAL) {
        return state.isConnected;
      }

      lastKeepAliveCheck.current = now;
      const response = await fetch(`http://localhost:3001/api/ssh/status/${serverName}`);
      
      if (!response.ok) {
        throw new Error('Failed to check connection status');
      }

      const data = await response.json();
      const isConnected = data.status?.connected || false;
      
      if (isConnected && data.status?.info) {
        setState(prev => ({
          ...prev,
          connectedServer: {
            name: serverName,
            address: serverName,
            hostname: data.status.info.hostname,
            ipAddress: data.status.info.ipAddress,
            osInfo: data.status.info.osInfo
          },
          isConnected: true
        }));
      }
      
      return isConnected;
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    }
  }, [state.isConnected]);

  const establishConnection = useCallback(async (serverName: string, credentials: LinuxCredentials): Promise<boolean> => {
    try {
      if (!vbrConnected) {
        toast({
          title: "Connection Error",
          description: "VBR must be connected before establishing SSH connection",
          variant: "destructive"
        });
        return false;
      }

      console.log('Attempting SSH connection to:', serverName);
      
      const response = await fetch(`http://localhost:3001/api/ssh/connect/${serverName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: serverName,
          username: credentials.username,
          password: credentials.password
        })
      });

      if (!response.ok) {
        throw new Error('Failed to establish SSH connection');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to connect to server');
      }

      const newState = {
        connectedServer: {
          name: serverName,
          address: serverName,
          hostname: result.info?.hostname || serverName,
          ipAddress: result.info?.ipAddress,
          osInfo: result.info?.osInfo,
          credentials,
          lastConnected: new Date().toISOString()
        },
        isConnected: true
      };

      setState(newState);      
      
      startKeepAlive(serverName);
      
      reconnectAttempts.current = 0;
      lastKeepAliveCheck.current = Date.now();

      toast({
        title: "SSH Connected",
        description: `Successfully connected to ${result.info?.hostname || serverName}`
      });

      return true;
    } catch (error) {
      console.error('SSH connection error:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectedServer: null
      }));

      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to connect to server',
        variant: "destructive"
      });
      return false;
    }
  }, [vbrConnected, toast, startKeepAlive]);

  const checkSavedConnection = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ssh/connections');
      const data = await response.json();
      
      if (data.success && data.connections?.length > 0) {
        const activeConnection = data.connections.find(
          (conn: SSHConnection) => conn.is_active
        );
        
        if (activeConnection) {
          const isConnected = await checkConnection(activeConnection.server_address);
          
          if (!isConnected) {
            const configResponse = await scannerService.getConfig();
            if (configResponse.success && configResponse.data?.credentials) {
              await establishConnection(
                activeConnection.server_address,
                configResponse.data.credentials
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking saved connection:', error);
    }
  }, [checkConnection, establishConnection]);

  const contextValue = useMemo(() => ({
    ...state,
    setConnectedServer,
    setIsConnected,
    disconnect,
    checkConnection,
    checkSavedConnection,
    establishConnection
  }), [
    state,
    setConnectedServer,
    setIsConnected,
    disconnect,
    checkConnection,
    checkSavedConnection,
    establishConnection
  ]);

  return (
    <SSHContext.Provider value={contextValue}>
      {children}
    </SSHContext.Provider>
  );
}

export function useSSH() {
  const context = useContext(SSHContext);
  if (context === undefined) {
    throw new Error('useSSH must be used within a SSHProvider');
  }
  return context;
}