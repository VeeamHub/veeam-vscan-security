import { useState, useCallback } from 'react';
import { useVScan } from '@/store/vscan-context';
import { useToast } from '@/components/ui/use-toast';
import type { VBRLinuxServer, VBRCredentials } from '@/types/vscan';

export function useLinuxServers() {
  const { executeCommand, connected } = useVScan();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const getLinuxServers = useCallback(async () => {
    if (!connected) {
      console.warn('Cannot get Linux servers: VBR not connected');
      return [];
    }

    setIsLoading(true);
    try {
      const script = `
        try {
          Write-Host "Getting Linux servers..."
          $servers = Get-VBRServer -Type Linux
          $result = @()
          
          foreach ($server in $servers) {
            Write-Host "Processing server: $($server.Name)"
            
            $credentials = Get-VBRCredentials -Entity $server
            $result += @{
              id = $server.Id.ToString()
              name = $server.Name
              address = $server.Name
              description = $server.Description
              isManaged = $true
              credentials = if ($credentials) {
                @{
                  id = $credentials.Id
                  name = $credentials.Name
                  username = $credentials.UserName
                  description = $credentials.Description
                }
              } else {
                $null
              }
            }
            
            Write-Host "Server details:"
            Write-Host "- ID: $($server.Id)"
            Write-Host "- Name/Address: $($server.Name)"
            Write-Host "- Has credentials: $($null -ne $credentials)"
          }
          
          Write-Output "STARTJSON"
          @{
            success = $true
            data = $result
            
          } | ConvertTo-Json -Depth 10 -Compress
          Write-Output "ENDJSON"
        } catch {
          Write-Host "Error getting Linux servers: $_"
          Write-Output "STARTJSON"
          @{
            success = $false
            error = $_.Exception.Message
            details = @{
              errorType = $_.Exception.GetType().Name
              errorMessage = $_.Exception.Message
              errorStack = $_.ScriptStackTrace
            }
          } | ConvertTo-Json -Compress
          Write-Output "ENDJSON"
        }
      `;

      console.log('Executing Linux servers script...');
      const result = await executeCommand(script);
      const match = result.match(/STARTJSON\r?\n([\s\S]*?)\r?\nENDJSON/);
      
      if (!match) {
        throw new Error('Invalid response format from VBR');
      }

      const response = JSON.parse(match[1].trim());
      if (!response.success) {
        throw new Error(response.error || 'Failed to get Linux servers');
      }

      const servers = response.data as VBRLinuxServer[];
      const validServers = servers.filter(server => {
        if (!server.address) {
          console.warn(`Server ${server.id} has no address`);
          return false;
        }
        return true;
      });

      console.log('Linux servers found:', validServers);
      return validServers;
    } catch (error) {
      console.error('Error getting Linux servers:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get Linux servers',
        variant: 'destructive'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [connected, executeCommand, toast]);

  const getServerCredentials = useCallback(async (server: VBRLinuxServer) => {
    if (!connected) {
      console.warn('Cannot get server credentials: VBR not connected');
      return null;
    }
    try {
      const script = `
        try {
          $vbrServer = Get-VBRServer -Name "${server.name}"
          if ($vbrServer) {
            $credentials = Get-VBRCredentials -Entity $vbrServer
            Write-Output "STARTJSON"
            @{
              success = $true
              data = if ($credentials) {
                @{
                  id = $credentials.Id
                  name = $credentials.Name
                  username = $credentials.UserName
                  description = $credentials.Description
                }
              } else {
                $null
              }
            } | ConvertTo-Json -Compress
            Write-Output "ENDJSON"
          } else {
            throw "Server not found"
          }
        } catch {
          Write-Output "STARTJSON"
          @{
            success = $false
            error = $_.Exception.Message
          } | ConvertTo-Json -Compress
          Write-Output "ENDJSON"
        }
      `;

      const result = await executeCommand(script);
      const match = result.match(/STARTJSON\r?\n([\s\S]*?)\r?\nENDJSON/);
      
      if (!match) {
        throw new Error('Invalid response format from VBR');
      }

      const response = JSON.parse(match[1].trim());
      if (!response.success) {
        throw new Error(response.error || 'Failed to get server credentials');
      }

      return response.data as VBRCredentials;
    } catch (error) {
      console.error('Error getting server credentials:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get server credentials',
        variant: 'destructive'
      });
      return null;
    }
  }, [connected, executeCommand, toast]);

  return {
    getLinuxServers,
    getServerCredentials,
    isLoading
  };
}