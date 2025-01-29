import { PowerShell } from 'node-powershell';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { PS_OPTIONS } from '../config/powershell.config.js';
import type { 
  VBRSession, 
  VBRConfig,
  vscanInfo, 
  SystemDiagnostics,
  VBRServerResult
} from '@/types/vscan.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VBR_DEFAULT_PORT = 9392;
const SESSION_TIMEOUT = 300000; // 5 minutes

export class PowerShellService {
  private static instance: PowerShellService | null = null;
  private ps: PowerShell | null = null;
  private currentSession: VBRSession | null = null;
  private db: Database | null = null;
  private vscanInfo: vscanInfo | null = null;
  private isInitializing: boolean = false;
  private isInitialized: boolean = false;
  private initializePromise: Promise<void> | null = null;
  private lastCommandTime: number = 0;

  private constructor() {}

  public static getInstance(): PowerShellService {
    if (!PowerShellService.instance) {
      PowerShellService.instance = new PowerShellService();
    }
    return PowerShellService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initializePromise) {
      return this.initializePromise;
    }

    if (this.isInitialized) {
      return;
    }

    try {
      this.initializePromise = (async () => {
        console.log('Starting PowerShell Service initialization...');
        await this.initializeDB();
        console.log('Database initialized successfully');
        await this.performvscanCheck();
        console.log('vscan installation check completed');
        this.isInitialized = true;
      })();

      await this.initializePromise;
    } catch (error) {
      console.error('Initialization failed:', error);
      this.isInitialized = false;
      throw error;
    } finally {
      this.initializePromise = null;
    }
  }

  private async initializeDB(): Promise<void> {
    try {
      
      const dbPath = path.resolve(__dirname, '../../../data/vscan-scanner.db');
      const dataDir = path.dirname(dbPath);
      
      
      const { mkdir } = await import('fs/promises');
      await mkdir(dataDir, { recursive: true }).catch(() => {});

      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS vbr_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server TEXT NOT NULL,
          port INTEGER NOT NULL,
          username TEXT,
          password TEXT,
          last_connected DATETIME,
          remote_version TEXT,
          is_status_update BOOLEAN DEFAULT 0
        );
      `);

    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async performvscanCheck(): Promise<void> {
    let ps: PowerShell | null = null;
    try {
      ps = new PowerShell(PS_OPTIONS);

      const consoleScript = `
        $ErrorActionPreference = "Stop"
        try {
          $possiblePaths = @(
            "C:\\Program Files\\Veeam\\Backup and Replication\\Console\\Veeam.Backup.Core.dll",
            "C:\\Program Files (x86)\\Veeam\\Backup and Replication\\Console\\Veeam.Backup.Core.dll"
          )
          
          $consoleResult = @{
            Installed = $false
            Version = $null
            Error = $null
            Path = $null
          }

          foreach ($path in $possiblePaths) {
            if (Test-Path $path) {
              $fileInfo = Get-Item $path
              $consoleResult.Installed = $true
              $consoleResult.Version = $fileInfo.VersionInfo.ProductVersion
              $consoleResult.Path = $path
              break
            }
          }

          Write-Output ($consoleResult | ConvertTo-Json)
        } catch {
          Write-Output (@{
            Installed = $false
            Version = $null
            Error = $_.Exception.Message
            Path = $null
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
            Path = if ($module) { $module.ModuleBase } else { $null }
          } | ConvertTo-Json)
        } catch {
          Write-Output (@{
            Installed = $false
            Version = $null
            Error = $_.Exception.Message
            Path = $null
          } | ConvertTo-Json)
        }
      `;

      const [consoleCheck, moduleCheck] = await Promise.all([
        ps.invoke(consoleScript),
        ps.invoke(moduleScript)
      ]);

      let consoleResult: any;
      let moduleResult: any;

      try {
        consoleResult = JSON.parse(consoleCheck.raw || consoleCheck.toString());
      } catch (e) {
        console.error('Failed to parse console check result:', e);
        consoleResult = { Installed: false, Error: 'Failed to parse result' };
      }

      try {
        moduleResult = JSON.parse(moduleCheck.raw || moduleCheck.toString());
      } catch (e) {
        console.error('Failed to parse module check result:', e);
        moduleResult = { Installed: false, Error: 'Failed to parse result' };
      }

      this.vscanInfo = {
        localConsoleInstalled: consoleResult.Installed,
        localConsoleVersion: consoleResult.Version,
        powerShellModuleInstalled: moduleResult.Installed,
        powerShellModuleVersion: moduleResult.Version
      };

    } catch (error) {
      console.error('Critical error in vscan installation check:', error);
      this.vscanInfo = {
        localConsoleInstalled: false,
        powerShellModuleInstalled: false
      };
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

  private async ensureValidSession(): Promise<boolean> {
    if (!this.ps || !this.currentSession?.connected) {
      if (this.currentSession?.username && this.currentSession?.password) {
        try {
          await this.connect(
            this.currentSession.server,
            this.currentSession.username,
            this.currentSession.password,
            this.currentSession.port
          );
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }

    if (Date.now() - this.lastCommandTime > SESSION_TIMEOUT) {
      try {
        await this.ps.invoke('Get-VBRServerSession');
        this.lastCommandTime = Date.now();
        return true;
      } catch {
        if (this.currentSession?.username && this.currentSession?.password) {
          try {
            await this.connect(
              this.currentSession.server,
              this.currentSession.username,
              this.currentSession.password,
              this.currentSession.port
            );
            return true;
          } catch {
            return false;
          }
        }
        return false;
      }
    }

    return true;
  }
  public async executeCommand(command: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 3;

    
    const allowedCommands = [
      'Connect-VBRServer',
      'Disconnect-VBRServer',
      'Get-VBRServerSession',
      'Get-VBRBackupServerInfo',
      'Get-VBRServerInfo',
      'Get-VBRInstalledSoftware',
      'Get-VBRVersion',
      'Get-VBRServer',
      'Get-VBRBackup',
      'Get-VBRRestorePoint',
      'Get-VBRCredentials',
      'Publish-VBRBackupContent',
      'Unpublish-VBRBackupContent',
      'Get-VBRPublishedBackupContentSession',
      'Get-VBRPublishedBackupContentInfo',
      'Get-Module',
      'Import-Module',
      'Write-Output',
      'ConvertTo-Json'
    ];
    
    while (attempts < maxAttempts) {
      try {
        if (!await this.ensureValidSession()) {
          throw new Error('No valid session available');
        }

        if (!this.ps) {
          throw new Error('PowerShell instance not available');
        }

        
        const cmdletPattern = /(?:^|\s)(Get-VBR\w+|Connect-VBR\w+|Disconnect-VBR\w+|Publish-VBR\w+|Unpublish-VBR\w+|Import-Module|Get-Module|Write-Output|ConvertTo-Json)(?:\s|$)/g;
        const foundCommands = command.match(cmdletPattern) || [];
        
        const hasUnauthorizedCommands = foundCommands.some(cmd => {
          const cmdTrimmed = cmd.trim();
          return !allowedCommands.includes(cmdTrimmed);
        });

        if (hasUnauthorizedCommands) {
          console.error('Unauthorized VBR commands detected in script');
          throw new Error('Unauthorized command. Only Veeam cmdlets are allowed.');
        }

        const wrappedCommand = `
          $ErrorActionPreference = "Stop"
          $DebugPreference = "SilentlyContinue"
          $VerbosePreference = "SilentlyContinue"
          $InformationPreference = "SilentlyContinue"
          
          try {
            ${command}
          } catch {
            Write-Output "STARTJSON"
            @{
              success = $false
              error = $_.Exception.Message
              details = @{
                type = $_.Exception.GetType().Name
                stack = $_.ScriptStackTrace
              }
            } | ConvertTo-Json -Compress
            Write-Output "ENDJSON"
            throw
          }
        `;

        const result = await this.ps.invoke(wrappedCommand);
        this.lastCommandTime = Date.now();
        return result.raw || result.toString();

      } catch (error) {
        attempts++;
        
        if (error instanceof Error && 
           (error.message.includes('process exited') || 
            error.message.includes('after process exited'))) {
          
          if (this.ps) {
            await this.ps.dispose().catch(() => {});
            this.ps = null;
          }

          if (attempts === maxAttempts) {
            throw error;
          }

          if (this.currentSession?.username && this.currentSession?.password) {
            try {
              await this.connect(
                this.currentSession.server,
                this.currentSession.username,
                this.currentSession.password,
                this.currentSession.port
              );
              continue;
            } catch (reconnectError) {
              console.error('Reconnection failed:', reconnectError);
            }
          }
        }

        if (attempts === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error('Command execution failed after all attempts');
  }


  public async connect(server: string, username: string, password: string, port: number = VBR_DEFAULT_PORT): Promise<boolean> {
    try {
      if (!this.vscanInfo?.powerShellModuleInstalled) {
        throw new Error('vscan PowerShell Module is not installed');
      }

      if (this.ps && this.currentSession?.connected && 
          this.currentSession.server === server && 
          this.currentSession.username === username) {
        return true;
      }

      if (this.ps) {
        try {
          await this.disconnect();
        } catch (error) {
          console.warn('Warning: Error during disconnect:', error);
        }
      }

      this.ps = new PowerShell(PS_OPTIONS);

      const command = `
        try {
          
          $ErrorActionPreference = 'Stop'
          
          # Create PSCredential object
          $SecurePassword = ConvertTo-SecureString '${password}' -AsPlainText -Force
          $Credential = New-Object System.Management.Automation.PSCredential ('${username}', $SecurePassword)
          
          # Import Veeam Module if not already loaded
          if (-not (Get-Module -Name Veeam.Backup.PowerShell)) {
            Import-Module Veeam.Backup.PowerShell
          }
          
          # Attempt connection
          Write-Host "Attempting to connect to VBR server: ${server}:${port}"
          Connect-VBRServer -Server '${server}' -Port ${port} -Credential $Credential
          
          # Verify connection
          $session = Get-VBRServerSession
          if (-not $session) { 
            throw "Failed to establish VBR session" 
          }
          Write-Host "Found server session"
          
          Write-Host "Getting server info..."
          $serverInfo = Get-VBRBackupServerInfo
          $result = @{
            success = $true
            serverInfo = @{
              name = $serverInfo.Name
              build = if ($serverInfo.Build) {
                @{
                  major = $serverInfo.Build.Major
                  minor = $serverInfo.Build.Minor
                  build = $serverInfo.Build.Build
                  revision = $serverInfo.Build.Revision
                }
              } else { $null }
              patchLevel = $serverInfo.PatchLevel
            }
          }
          
          Write-Output "STARTJSON"
          $result | ConvertTo-Json -Depth 10 -Compress
          Write-Output "ENDJSON"
          
        } catch {
          Write-Host "Connection failed: $_"
          Write-Output "STARTJSON"
          @{
            success = $false
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

      console.log('Executing connect command...');
      const result = await this.ps.invoke(command);
      const responseText = result.raw || result.toString();

      
      const jsonMatch = responseText.match(/STARTJSON\s*([\s\S]*?)\s*ENDJSON/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from PowerShell');
      }

      const response = JSON.parse(jsonMatch[1].trim()) as VBRServerResult;
if (!response.success || !response.serverInfo) {
  throw new Error(response.error || 'Failed to connect to VBR server');
}

      this.currentSession = {
        server,
        port,
        username,
        password,
        connected: true,
        lastConnection: new Date()
      };

      this.lastCommandTime = Date.now();

     
      const serverBuild = response.serverInfo.build;
if (serverBuild) {
  const versionStr = `${serverBuild.major}.${serverBuild.minor}.${serverBuild.build}.${serverBuild.revision}${
    response.serverInfo.patchLevel ? ` - ${response.serverInfo.patchLevel}` : ''
  }`;
  await this.updateRemoteVersion(versionStr);
}

      return true;
    } catch (error) {
      console.error('Failed to connect to VBR:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      
      this.currentSession = null;
      if (this.ps) {
        try {
          await this.ps.dispose();
        } catch (disposeError) {
          console.warn('Warning: Error disposing PowerShell instance:', disposeError);
        }
        this.ps = null;
      }
      
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      
      if (this.ps && this.currentSession?.connected) {
        try {
          await this.ps.invoke('Disconnect-VBRServer');
        } catch (error) {
          console.warn('Warning: Error during VBR disconnect:', error);
          
        }
      }
  
      
      if (this.ps) {
        try {
          await this.ps.dispose();
        } catch (error) {
          console.warn('Warning: Error disposing PowerShell instance:', error);
          
        }
      }
    } catch (error) {
      console.error('Error in disconnect:', error);      
      throw error;
    } finally {
      
      this.ps = null;
      this.currentSession = null;
      if (this.vscanInfo) {
        this.vscanInfo.remoteServerVersion = undefined;
      }
    }
  }

  public async getLastConfig(): Promise<VBRConfig | null> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const config = await this.db?.get(`
        SELECT 
          server, 
          port, 
          username, 
          password,
          last_connected as lastConnected,
          remote_version as remoteVersion
        FROM vbr_config 
        ORDER BY id DESC 
        LIMIT 1
      `);

      return config || null;
    } catch (error) {
      console.error('Error getting last config:', error);
      return null;
    }
  }

  public async diagnosevscanInstallation(): Promise<any> {
    let ps: PowerShell | null = null;
    try {
      ps = new PowerShell(PS_OPTIONS);
      
      const consoleScript = `
        try {
          $path = "C:\\Program Files\\Veeam\\Backup and Replication\\Console"
          $dllPath = Join-Path $path "Veeam.Backup.Core.dll"
          
          $result = @{
            Installed = (Test-Path $path)
            DllExists = (Test-Path $dllPath)
            Version = if (Test-Path $dllPath) {
              (Get-Item $dllPath).VersionInfo.ProductVersion
            } else { "Not Found" }
          }
          
          Write-Output ($result | ConvertTo-Json)
        } catch {
          Write-Output (@{ Error = $_.Exception.Message } | ConvertTo-Json)
        }
      `;

      const servicesScript = `
        try {
          $services = Get-Service | Where-Object { $_.Name -like "*Veeam*" } |
            Select-Object Name, DisplayName, Status
          Write-Output ($services | ConvertTo-Json)
        } catch {
          Write-Output "[]"
        }
      `;

      const moduleScript = `
        try {
          $module = Get-Module -Name "Veeam.Backup.PowerShell" -ListAvailable |
            Select-Object Name, Version, ModuleBase
          Write-Output ($module | ConvertTo-Json)
        } catch {
          Write-Output "null"
        }
      `;

      const [consoleInfo, serviceInfo, moduleInfo] = await Promise.all([
        ps.invoke(consoleScript),
        ps.invoke(servicesScript),
        ps.invoke(moduleScript)
      ]);

      return {
        consoleInfo: JSON.parse(consoleInfo.toString()),
        serviceInfo: serviceInfo.toString(),
        moduleInfo: moduleInfo.toString()
      };

    } catch (error) {
      console.error('Error in diagnosevscanInstallation:', error);
      throw error;
    } finally {
      if (ps) {
        await ps.dispose();
      }
    }
  }

  public async getSystemDiagnostics(): Promise<SystemDiagnostics> {
    let ps: PowerShell | null = null;
    try {
      ps = new PowerShell(PS_OPTIONS);

      const systemScript = `
        $info = @{
          OS = @{
            Name = [System.Environment]::OSVersion.VersionString
            Architecture = $env:PROCESSOR_ARCHITECTURE
            PowerShell = $PSVersionTable.PSVersion.ToString()
          }
          Paths = @{
            vscanInstallPath = $env:vscan_INSTALLATION_PATH
            PowerShellModulePath = $env:PSModulePath
          }
          CurrentUser = @{
            Name = $env:USERNAME
            Domain = $env:USERDOMAIN
            IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
          }
        }
        Write-Output ($info | ConvertTo-Json -Depth 4)
      `;

      const registryScript = `
        $paths = @(
          "HKLM:\\SOFTWARE\\Veeam\\Veeam Backup and Replication",
          "HKLM:\\SOFTWARE\\Wow6432Node\\Veeam\\Veeam Backup and Replication"
        )
        $results = @{}
        foreach ($path in $paths) {
          try {
            if (Test-Path $path) {
              $key = Get-ItemProperty -Path $path
              $results[$path] = @{
                Exists = $true
                Version = $key.Version
                InstallPath = $key.CorePath
                Properties = $key.PSObject.Properties |
                  Where-Object { $_.Name -notlike "PS*" } |
                  ForEach-Object { @{ $_.Name = $_.Value } }
              }
            } else {
              $results[$path] = @{
                Exists = $false
                Error = "Path does not exist"
              }
            }
          } catch {
            $results[$path] = @{
              Exists = $false
              Error = $_.Exception.Message
            }
          }
        }
        Write-Output ($results | ConvertTo-Json -Depth 4)
      `;

      const [systemInfo, registryInfo] = await Promise.all([
        ps.invoke(systemScript).then(result => JSON.parse(result.toString())),
        ps.invoke(registryScript).then(result => JSON.parse(result.toString()))
      ]);

      return {
        system: systemInfo,
        registry: registryInfo,
        vscanInfo: this.vscanInfo,
        currentSession: this.currentSession,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting system diagnostics:', error);
      throw error;
    } finally {
      if (ps) {
        await ps.dispose();
      }
    }
  }

  public async refreshvscanInfo(): Promise<void> {
    await this.performvscanCheck();
  }

  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  public getvscanInfo(): vscanInfo {
    return this.vscanInfo || {
      localConsoleInstalled: false,
      powerShellModuleInstalled: false,
      remoteServerVersion: undefined
    };
  }

  public getCurrentSession(): VBRSession | null {
    return this.currentSession || null;
  }

  public getDefaultPort(): number {
    return VBR_DEFAULT_PORT;
  }

  public async getDatabase(): Promise<Database | null> {
    if (!this.db) {
      await this.initializeDB();
    }
    return this.db;
  }

  public setvscanInfo(info: vscanInfo): void {
    this.vscanInfo = info;
  }

  public async updateRemoteVersion(version: string): Promise<void> {
    if (this.vscanInfo) {
      this.vscanInfo.remoteServerVersion = version;
    } else {
      this.vscanInfo = {
        localConsoleInstalled: true,
        powerShellModuleInstalled: true,
        remoteServerVersion: version
      };
    }

    }
}

export const powerShellService = PowerShellService.getInstance();