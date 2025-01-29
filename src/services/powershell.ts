import { PowerShell } from 'node-powershell';
import { Database } from 'sqlite3';
import { VBRConfig } from '@/types/vscan';
import { PS_OPTIONS } from '@/config/powershell.config';

interface PowerShellSession {
  id: string;
  server: string;
  connected: boolean;
  lastConnection: Date;
}

class vscanPowerShellService {
  private static instance: vscanPowerShellService;
  private ps: PowerShell | null = null;
  private currentSession: PowerShellSession | null = null;
  private config: VBRConfig | null = null;
  private db: Database;

  private constructor() {
    this.db = new Database('vscan-scanner.db');
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS vbr_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server TEXT NOT NULL,
        port INTEGER NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        last_connected DATETIME
      )
    `);

    this.loadConfig();
  }

  public static getInstance(): vscanPowerShellService {
    if (!vscanPowerShellService.instance) {
      vscanPowerShellService.instance = new vscanPowerShellService();
    }
    return vscanPowerShellService.instance;
  }

  private async loadConfig(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM vbr_config ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) reject(err);
        if (row) {
          this.config = {
            server: row.server,
            port: row.port,
            username: row.username,
            password: row.password
          };
        }
        resolve();
      });
    });
  }

  public async saveConfig(config: VBRConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO vbr_config (server, port, username, password, last_connected) VALUES (?, ?, ?, ?, ?)',
        [config.server, config.port, config.username, config.password, new Date().toISOString()],
        (err) => {
          if (err) reject(err);
          this.config = config;
          resolve();
        }
      );
    });
  }

  public async connect(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('No VBR configuration found');
      }

      this.ps = new PowerShell(PS_OPTIONS);

      const connectCommand = `
        $SecurePassword = ConvertTo-SecureString '${this.config.password}' -AsPlainText -Force
        $Credential = New-Object System.Management.Automation.PSCredential ('${this.config.username}', $SecurePassword)
        Connect-VBRServer -Server '${this.config.server}' -Port ${this.config.port} -Credential $Credential
      `;

      await this.ps.invoke(connectCommand);
      
      const sessionCheck = await this.checkSession();
      
      if (sessionCheck) {
        this.currentSession = {
          id: Date.now().toString(),
          server: this.config.server,
          connected: true,
          lastConnection: new Date()
        };
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to connect to VBR:', error);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.ps && this.currentSession?.connected) {
        await this.ps.invoke('Disconnect-VBRServer');
        this.currentSession.connected = false;
      }
    } catch (error) {
      console.error('Error disconnecting from VBR:', error);
    } finally {
      if (this.ps) {
        await this.ps.dispose();
        this.ps = null;
      }
    }
  }

  public async checkSession(): Promise<boolean> {
    try {
      if (!this.ps) return false;

      const result = await this.ps.invoke('Get-VBRServerSession');
      return Boolean(result);
    } catch {
      return false;
    }
  }

  public isConnected(): boolean {
    return this.currentSession?.connected ?? false;
  }

  public getCurrentSession(): PowerShellSession | null {
    return this.currentSession;
  }

  public async executeCommand(command: string): Promise<any> {
    if (!this.ps || !this.currentSession?.connected) {
      throw new Error('No active VBR session');
    }

    try {
      const result = await this.ps.invoke(command);
      return this.parseCommandResult(result);
    } catch (error) {
      console.error('Error executing VBR command:', error);
      throw error;
    }
  }

  private parseCommandResult(result: any): any {
    if (!result) return null;    
    
    if (typeof result === 'string' && (result.startsWith('{') || result.startsWith('['))) {
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    }
    
    return result;
  }

  public async mountBackupContent(
    restorePointId: string, 
    targetServer: string,
    reason: string = 'Security scanning'
  ): Promise<string> {
    try {
      if (!this.ps || !this.currentSession?.connected) {
        throw new Error('No active VBR session');
      }

      const mountCommand = `
        $restorePoint = Get-VBRRestorePoint -Id '${restorePointId}'
        if (-not $restorePoint) { throw 'Restore point not found' }

        $mountSession = Publish-VBRBackupContent -RestorePoint $restorePoint -TargetServerName '${targetServer}' -Reason '${reason}'
        if ($mountSession) { $mountSession.Id.ToString() } else { throw 'Failed to create mount session' }
      `;

      const sessionId = await this.ps.invoke(mountCommand);
      return sessionId?.toString() || '';
    } catch (error) {
      console.error('Error mounting backup content:', error);
      throw error;
    }
  }

  public async unmountBackupContent(sessionId: string): Promise<void> {
    try {
      if (!this.ps || !this.currentSession?.connected) {
        throw new Error('No active VBR session');
      }

      const unmountCommand = `
        $session = Get-VBRPublishedBackupContentSession -Id '${sessionId}'
        if ($session) {
          Unpublish-VBRBackupContent -Session $session -ErrorAction Stop
          Write-Output "true"
        } else {
          throw "Session not found"
        }
      `;

      await this.ps.invoke(unmountCommand);
    } catch (error) {
      console.error('Error unmounting backup content:', error);
      throw error;
    }
  }

  public async getMountSessions(): Promise<any[]> {
    try {
      if (!this.ps || !this.currentSession?.connected) {
        throw new Error('No active VBR session');
      }

      const sessionsCommand = `
        $sessions = Get-VBRPublishedBackupContentSession | Select-Object Id, VMName, TargetServerName, CreationTime, State
        ConvertTo-Json -InputObject $sessions -Compress
      `;

      const result = await this.ps.invoke(sessionsCommand);
      const sessionsStr = result?.toString() || '[]';
      return JSON.parse(sessionsStr);
    } catch (error) {
      console.error('Error getting mount sessions:', error);
      throw error;
    }
  }

  public async getvscanInfo(): Promise<any> {
    try {
      if (!this.ps || !this.currentSession?.connected) {
        throw new Error('No active VBR session');
      }

      const infoCommand = `
        @{
          ServerInfo = Get-VBRServerInfo | Select-Object Name, Version;
          InstalledSoftware = Get-VBRInstalledSoftware | Select-Object DisplayName, DisplayVersion;
          Version = Get-VBRVersion | Select-Object Version
        } | ConvertTo-Json -Depth 10 -Compress
      `;

      const result = await this.ps.invoke(infoCommand);
      return JSON.parse(result?.toString() || '{}');
    } catch (error) {
      console.error('Error getting vscan info:', error);
      throw error;
    }
  }
}

export const vscanPS = vscanPowerShellService.getInstance();