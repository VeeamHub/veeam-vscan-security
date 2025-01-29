import { Request, Response } from 'express';
import { Database } from 'sqlite';
import { PowerShell } from 'node-powershell';
import { powerShellService } from '../services/powershell.service.js';
import { PS_OPTIONS } from '../config/powershell.config.js';
import type { VBRServerResult, VBRConfig } from '@/types/vscan.js';
import { encryptionService } from '../services/encryption.service.js';

export class VBRController {

  constructor(private db: Database) {}
 
  async getStatus(req: Request, res: Response) {
    try {
      const session = powerShellService.getCurrentSession();
      const vscanInfo = powerShellService.getvscanInfo();
  
      if (session?.connected) {
        const serverScript = `
          try {
            $serverInfo = Get-VBRBackupServerInfo
            $result = @{
              Name = $serverInfo.Name
              Build = @{
                Major = $serverInfo.Build.Major
                Minor = $serverInfo.Build.Minor
                Build = $serverInfo.Build.Build
                Revision = $serverInfo.Build.Revision
              }
              PatchLevel = $serverInfo.PatchLevel
            }
            
            Write-Output "STARTJSON"
            $result | ConvertTo-Json -Depth 10 -Compress
            Write-Output "ENDJSON"
          } catch {
            Write-Output "STARTJSON"
            @{
              error = $_.Exception.Message
              details = @{
                type = $_.Exception.GetType().Name
                message = $_.Exception.Message
                stack = $_.ScriptStackTrace
              }
            } | ConvertTo-Json -Compress
            Write-Output "ENDJSON"
          }
        `;
  
        const result = await powerShellService.executeCommand(serverScript);
        const jsonMatch = result.match(/STARTJSON\s*([\s\S]*?)\s*ENDJSON/);
        
        if (!jsonMatch) {
          throw new Error('Invalid response format from PowerShell');
        }
  
        const serverInfo = JSON.parse(jsonMatch[1].trim());
        
        let serverVersion = null;
        if (!serverInfo.error) {
          const build = serverInfo.Build;
          serverVersion = `${build.Major}.${build.Minor}.${build.Build}.${build.Revision}${
            serverInfo.PatchLevel ? ` - ${serverInfo.PatchLevel}` : ''
          }`;
  
          if (!vscanInfo) {
            powerShellService.setvscanInfo({
              localConsoleInstalled: true,
              powerShellModuleInstalled: true,
              remoteServerVersion: serverVersion
            });
          } else {
            vscanInfo.remoteServerVersion = serverVersion;
          }
        }
      }
      
      res.json({
        success: true,
        connected: !!session?.connected,
        session: session ? {
          server: session.server,
          port: session.port,
          lastConnection: session.lastConnection,
          remoteVersion: vscanInfo?.remoteServerVersion
        } : null,
        vscanInfo
      });
  
    } catch (error) {
      console.error('Error in getStatus:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }


  connect = async (req: Request, res: Response) => {
    try {
        const { server, username, password, port = powerShellService.getDefaultPort() } = req.body;
        
        console.log('Processing VBR connection request:', {
            server,
            port,
            username
        });

        if (!server || !username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Server, username and password are required',
                vscanInfo: powerShellService.getvscanInfo()
            });
        }

        try {
            
            await this.db.run('DELETE FROM vbr_config WHERE server = ?', [server]);

            console.log('Attempting VBR connection...');
            const connected = await powerShellService.connect(server, username, password, port);
            
            if (connected) {
                const session = powerShellService.getCurrentSession();
                
                
                const encryptedPassword = encryptionService.encrypt(password);
                const vscanInfo = powerShellService.getvscanInfo();
                
                
                await this.db.run(`
                  INSERT INTO vbr_config (
                      server, 
                      port, 
                      username, 
                      password, 
                      remote_version,
                      connection_status,
                      last_connected
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [
                      server,
                      port,
                      username,
                      encryptedPassword,
                      vscanInfo?.remoteServerVersion || null,
                      'connected',
                      new Date().toISOString()
                  ]
              );

                console.log('Connection successful, session:', {
                    server: session?.server,
                    port: session?.port,
                    username: session?.username,
                    connected: session?.connected,
                    lastConnection: session?.lastConnection
                });
                
                res.json({
                    success: true,
                    session,
                    vscanInfo: powerShellService.getvscanInfo()
                });
            } else {
                console.error('Connection failed without error');
                res.status(400).json({
                    success: false,
                    error: 'Connection failed - unknown reason',
                    vscanInfo: powerShellService.getvscanInfo()
                });
            }
        } catch (connectError) {
            console.error('Connection error:', connectError);
            let errorMessage = connectError instanceof Error ? connectError.message : 'Unknown error';
            res.status(500).json({
                success: false,
                error: errorMessage,
                vscanInfo: powerShellService.getvscanInfo()
            });
        }
    } catch (error) {
        console.error('Unexpected error in connect controller:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            vscanInfo: powerShellService.getvscanInfo()
        });
    }
}


async getDecryptedCredentials(serverId: number): Promise<VBRConfig | null> {
  try {
      const config = await this.db.get(
          'SELECT server, port, username, password FROM vbr_config WHERE id = ?',
          [serverId]
      );

      if (!config) return null;

      return {
          ...config,
          password: encryptionService.decrypt(config.password)
      };
  } catch (error) {
      console.error('Error getting VBR credentials:', error);
      return null;
  }
}

  
  async disconnect(req: Request, res: Response) {
    try {
      const ps = powerShellService.getCurrentSession();
      
      
      if (ps?.connected) {
        await powerShellService.disconnect();
        res.json({
          success: true,
          message: 'Disconnected successfully'
        });
      } else {
        
        res.json({
          success: true,
          message: 'No active session to disconnect'
        });
      }
    } catch (error) {
      console.error('Error in disconnect:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      });
    }
  }

  async restoreConnection(req: Request, res: Response) {
    try {
      const lastConfig = await powerShellService.getLastConfig();
      if (lastConfig) {
        const connected = await powerShellService.connect(
          lastConfig.server,
          lastConfig.username,
          lastConfig.password,
          lastConfig.port
        );
        
        res.json({
          success: connected,
          session: powerShellService.getCurrentSession()
        });
      } else {
        res.json({
          success: false,
          error: 'No previous connection configuration found'
        });
      }
    } catch (error) {
      console.error('Error restoring connection:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }


  async executeCommand(req: Request, res: Response) {
    try {
      const { command } = req.body;
  
      if (!command) {
        return res.status(400).json({
          success: false,
          error: 'Command is required'
        });
      }
  
      const session = powerShellService.getCurrentSession();
      if (!session?.connected) {
        return res.status(400).json({
          success: false,
          error: 'No active VBR session'
        });
      }
  
      try {
        const result = await powerShellService.executeCommand(command);
        
        if (!result.includes('STARTJSON')) {
          console.log('PowerShell execution result:', result);
        }
        
        res.json({
          success: true,
          data: result
        });
      } catch (psError) {
        console.error('PowerShell execution error:', psError);
        res.status(500).json({
          success: false,
          error: psError instanceof Error ? psError.message : 'PowerShell execution failed',
          details: psError instanceof Error ? psError.stack : undefined
        });
      }
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  }

 
  async getLastConfig(req: Request, res: Response) {
    try {
      const config = await powerShellService.getLastConfig();
      res.json({
        success: true,
        config
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  
  async getvscanInstallation(req: Request, res: Response) {
    try {
      await powerShellService.refreshvscanInfo();
      const vscanInfo = powerShellService.getvscanInfo();
      res.json({
        success: true,
        vscanInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  
  async quickCheck(req: Request, res: Response) {
    let ps: PowerShell | null = null;
    try {
      ps = new PowerShell(PS_OPTIONS);
      console.log('Iniciando verificación rápida de vscan...');
  
      
      const consoleScript = `
        try {
          $consolePath = "C:\\Program Files\\Veeam\\Backup and Replication\\Console\\Veeam.Backup.Core.dll"
          $consoleExists = Test-Path $consolePath
          $version = if ($consoleExists) {
            (Get-Item $consolePath).VersionInfo.FileVersion
          } else {
            $null
          }
          Write-Output (@{
            Installed = $consoleExists
            Version = $version
            Error = $null
          } | ConvertTo-Json)
        } catch {
          Write-Output (@{
            Installed = $false
            Version = $null
            Error = $_.Exception.Message
          } | ConvertTo-Json)
        }
      `;
  
      
      const moduleScript = `
        try {
          $module = Get-Module -Name "Veeam.Backup.PowerShell" -ListAvailable | Select-Object -First 1
          Write-Output (@{
            Installed = $null -ne $module
            Version = if ($module) { $module.Version.ToString() } else { $null }
            Error = $null
          } | ConvertTo-Json)
        } catch {
          Write-Output (@{
            Installed = $false
            Version = $null
            Error = $_.Exception.Message
          } | ConvertTo-Json)
        }
      `;
  
      const consoleCheck = await ps.invoke(consoleScript);
      console.log('Console check output:', consoleCheck.raw);
  
      const moduleCheck = await ps.invoke(moduleScript);
      console.log('Module check output:', moduleCheck.raw);
  
      
      let consoleResult: any;
      let moduleResult: any;

      try {
        consoleResult = JSON.parse(consoleCheck.raw || consoleCheck.toString());
      } catch (e) {
        console.error('Error parsing console check:', e);
        consoleResult = { Installed: false, Error: 'Parse error' };
      }

      try {
        moduleResult = JSON.parse(moduleCheck.raw || moduleCheck.toString());
      } catch (e) {
        console.error('Error parsing module check:', e);
        moduleResult = { Installed: false, Error: 'Parse error' };
      }
  
      const vscanStatus = {
        console: {
          installed: consoleResult.Installed,
          version: consoleResult.Version,
          path: "C:\\Program Files\\Veeam\\Backup and Replication\\Console",
          error: consoleResult.Error
        },
        module: {
          installed: moduleResult.Installed,
          version: moduleResult.Version,
          error: moduleResult.Error
        },
        timestamp: new Date().toISOString()
      };
  
      console.log('Final vscan status:', JSON.stringify(vscanStatus, null, 2));
  
      res.json({
        success: true,
        vscanStatus
      });
  
    } catch (error) {
      console.error('Error en verificación rápida:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        details: error
      });
    } finally {
      if (ps) {
        try {
          await ps.dispose();
        } catch (error) {
          console.error('Error disposing PowerShell instance:', error);
        }
      }
    }
  }


  async diagnosevscanInstallation(req: Request, res: Response) {
    try {
      await powerShellService.refreshvscanInfo();
      const diagnosis = await powerShellService.diagnosevscanInstallation();
      
      res.json({
        success: true,
        diagnosis
      });
    } catch (error) {
      console.error('Diagnostic error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  async debugInstallation(req: Request, res: Response) {
    try {
      const systemDiagnosis = await powerShellService.getSystemDiagnostics();
      res.json({
        success: true,
        diagnosis: systemDiagnosis
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  
  getDefaultPort(req: Request, res: Response) {
    try {
      res.json({
        success: true,
        defaultPort: powerShellService.getDefaultPort()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  
  async refreshSystemInfo(req: Request, res: Response) {
    try {
      await powerShellService.refreshvscanInfo();
      const vscanInfo = powerShellService.getvscanInfo();
      const systemDiagnosis = await powerShellService.getSystemDiagnostics();
      
      res.json({
        success: true,
        vscanInfo,
        systemDiagnosis
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

