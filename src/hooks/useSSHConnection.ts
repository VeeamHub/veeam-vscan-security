import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { LinuxServerConfig } from '@/types/vscan';

interface UseSSHConnectionResult {
  ensureSSHConnection: (serverName: string, retryCount?: number) => Promise<boolean>;
}

export function useSSHConnection(getStoredConfig: () => LinuxServerConfig | null): UseSSHConnectionResult {
  const { toast } = useToast();

  const ensureSSHConnection = useCallback(async (serverName: string, retryCount = 0): Promise<boolean> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    try {
      
      const statusResponse = await fetch(`http://localhost:3001/api/ssh/status/${serverName}`);
      const statusData = await statusResponse.json();

      if (statusData.status?.connected) {
        return true;
      }

      
      const config = getStoredConfig();
      if (!config || !config.credentials) {
        throw new Error('No stored SSH credentials found');
      }

      const reconnectResponse = await fetch(`http://localhost:3001/api/ssh/connect/${serverName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: serverName,
          username: config.credentials.username,
          password: config.credentials.password
        })
      });

      if (!reconnectResponse.ok) {
        throw new Error('Failed to reconnect to SSH server');
      }

      const reconnectData = await reconnectResponse.json();
      
      if (reconnectData.success) {
        toast({
          title: "SSH Reconnected",
          description: `Successfully reconnected to ${serverName}`,
        });
      }

      return reconnectData.success;

    } catch (error) {
      console.error('[DEBUG] SSH connection error:', error);
      
      if (retryCount < MAX_RETRIES) {
        console.log(`[DEBUG] Retrying SSH connection (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return ensureSSHConnection(serverName, retryCount + 1);
      }

      toast({
        title: "SSH Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to connect to SSH server',
        variant: "destructive"
      });

      throw error;
    }
  }, [getStoredConfig, toast]);

  return { ensureSSHConnection };
}