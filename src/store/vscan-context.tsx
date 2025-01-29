import React, { createContext, useContext, useState, useCallback } from 'react';
import { vscanService } from '@/services/vscan';
import type { VBRConfig, vscanInfo } from '@/types/vscan';
import { queryClient } from '@/lib/query-client'; 

interface ServerInfo {
  server: string;
  lastConnection: Date | null;
}

interface VScanContextType {
  connected: boolean;
  connecting: boolean;
  serverInfo: ServerInfo | null;
  vscanInfo: vscanInfo | null;
  connect: (config: VBRConfig) => Promise<boolean>;
  disconnect: () => Promise<void>;
  executeCommand: (command: string) => Promise<any>;
  initializeVScan: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const VScanContext = createContext<VScanContextType | undefined>(undefined);

export function VScanProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [vscanInfo, setvscanInfo] = useState<vscanInfo | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      console.log('Refreshing VScan status...');
      const status = await vscanService.getStatus();
      console.log('Received status:', status);
      
      if (status.connected && status.session) {
        setConnected(true);
        setServerInfo({
          server: status.session.server,
          lastConnection: new Date(status.session.lastConnection)
        });
        if (status.vscanInfo) {
          setvscanInfo(status.vscanInfo);
        }
      } else {
        setConnected(false);
        setServerInfo(null);
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
      setConnected(false);
      setServerInfo(null);
    }
  }, []);

  const initializeVScan = useCallback(async () => {
    try {
      console.log('Initializing VScan...');
      const status = await vscanService.getStatus();
      
      if (status.connected && status.session) {
        setConnected(true);
        setServerInfo({
          server: status.session.server,
          lastConnection: new Date(status.session.lastConnection)
        });
      }
      
      if (!vscanInfo) {
        const systemInfo = await vscanService.getSystemInfo();
        if (systemInfo.success && systemInfo.vscanInfo) {
          console.log('Setting initial VScan info:', systemInfo.vscanInfo);
          setvscanInfo(systemInfo.vscanInfo);
        }
      }
    } catch (error) {
      console.error('Error initializing VScan:', error);
      setConnected(false);
      setServerInfo(null);
    }
  }, [vscanInfo]);

  const connect = async (config: VBRConfig): Promise<boolean> => {
    try {
      console.log('Attempting to connect to Veeam server...');
      setConnecting(true);
      const result = await vscanService.connect(config);
      
      if (result.success) {
        console.log('Connection successful, refreshing status...');
        await refreshStatus();
        return true;
      } else {
        console.log('Connection failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      console.log('Disconnecting from VScan server...');
      await vscanService.disconnect();
      
      setConnected(false);
      setServerInfo(null);      
      
      queryClient.invalidateQueries({ 
        queryKey: ['linux-servers']
      });
      
      if (vscanInfo) {
        setvscanInfo(prev => ({
          ...prev!,
          remoteServerVersion: undefined
        }));
      }
      
      await refreshStatus();
    } catch (error) {
      console.error('Disconnect error:', error);
      throw error;
    }
  };

  const executeCommand = async (command: string) => {
    if (!connected) {
      throw new Error('Not connected to VScan server');
    }
    return vscanService.executeCommand(command);
  };

  return (
    <VScanContext.Provider 
      value={{ 
        connected, 
        connecting,
        serverInfo, 
        vscanInfo,
        connect, 
        disconnect,
        executeCommand,
        initializeVScan,
        refreshStatus 
      }}
    >
      {children}
    </VScanContext.Provider>
  );
}

export function useVScan() {
  const context = useContext(VScanContext);
  if (context === undefined) {
    throw new Error('useVScan must be used within a VScanProvider');
  }
  return context;
}