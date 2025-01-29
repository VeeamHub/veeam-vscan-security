import { Request, Response } from 'express';
import { Client } from 'ssh2';
import { Database } from 'sqlite';
import { encryptionService } from '../services/encryption.service.js';
import type { 
  SSHConnectionInfo,
  SSHServerInfo,
  SSHCommandResult,
  SystemInfo,
  SystemCheckResult,
  DiskInfo,
  MountResponse,
  SSHError
} from '../types/ssh.js';

const SSH_TIMEOUT = 10000;
const COMMAND_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

interface SSHExecuteOptions {
  command: string;
  server: string;
  hostname?: string;
  timeout?: number;
  silent?: boolean;
}


export class SSHController {
  private static instance: SSHController;
  private activeConnections: Map<string, Client> = new Map();
  private currentPassword: string | null = null;
  private db: Database;
  private logs: Array<{
    timestamp: Date;
    level: 'info' | 'warning' | 'error';
    message: string;
  }> = [];

  private constructor(db: Database) {
    this.db = db;
    this.initializeCleanupInterval();
  }

  public static getInstance(db: Database): SSHController {
    if (!SSHController.instance) {
      SSHController.instance = new SSHController(db);
    }
    return SSHController.instance;
  }
  
  private setCurrentPassword(password: string) {
    this.currentPassword = password;
  }

  private clearCurrentPassword() {
    this.currentPassword = null;
  }

  private addLog(level: 'info' | 'warning' | 'error', message: string) {
    const log = {
      timestamp: new Date(),
      level,
      message
    };
    this.logs.push(log);
    console.log(`[SSH][${level.toUpperCase()}] ${message}`);
  }

  private initializeCleanupInterval() {
    
    setInterval(() => this.cleanupInactiveConnections(), 5 * 60 * 1000);
  }

  private async setupScanner(client: Client, scanner: 'trivy' | 'grype'): Promise<{installed: boolean; version: string}> {
    try {
      const logDivider = '='.repeat(60);
      const scannerName = scanner.toUpperCase();
  
      
      const osInfo = await this.executeCommandInClient(client, 'cat /etc/os-release');
      const osDetails = this.parseOSRelease(osInfo);
      const osFamily = this.getOSFamily(osDetails.id);
  
      if (osFamily === 'unknown') {
        throw new Error(`Unsupported Linux distribution: ${osDetails.id}`);
      }
  
      
      const executeQuietly = async (command: string) => {
        return this.executeCommandInClient(client, command + ' 2>/dev/null', { 
          silent: true,
          isScanning: false 
        });
      };
  
      
      console.log(`\n${logDivider}`);
      console.log(`🔍 ${scannerName} Version Check (${osDetails.prettyName})`);
  
      const currentVersion = await executeQuietly(
        scanner === 'trivy' 
          ? 'trivy version | head -n 1 | cut -d" " -f2'
          : 'grype version | grep "^Version:" | sed "s/Version:[[:space:]]*v*//"'
      );
  
     
      const getLatestVersion = await executeQuietly(`
        curl -sL https://api.github.com/repos/${scanner === 'trivy' ? 'aquasecurity/trivy' : 'anchore/grype'}/releases/latest | grep -Po '"tag_name": "v\\K[^"]*'
      `);
      const latestVersion = getLatestVersion.trim();
  
      console.log(`  ∟ Current Version: ${currentVersion.trim() || 'not installed'}`);
      console.log(`  ∟ Latest Version:  ${latestVersion}`);
  
      
      const needsUpdate = currentVersion.trim() === 'none' || 
                         this.compareVersions(latestVersion, currentVersion.trim()) > 0;
  
      if (needsUpdate) {
        console.log('  ∟ Status: Update required');
  
        if (scanner === 'trivy') {
          if (osFamily === 'rhel') {
            
            await executeQuietly(`
              echo "${this.currentPassword}" | sudo -S bash -c '
              dnf remove -y trivy;
              rm -f /etc/yum.repos.d/trivy*;
              dnf clean all;
              wget -q -O /tmp/trivy.rpm "https://github.com/aquasecurity/trivy/releases/download/v${latestVersion}/trivy_${latestVersion}_Linux-64bit.rpm";
              rpm -ivh --force /tmp/trivy.rpm;
              rm -f /tmp/trivy.rpm'
            `);
          } else if (osFamily === 'debian') {
            
            await executeQuietly(`
              echo "${this.currentPassword}" | sudo -S bash -c '
              apt-get remove -y trivy;
              wget -q -O /tmp/trivy.deb "https://github.com/aquasecurity/trivy/releases/download/v${latestVersion}/trivy_${latestVersion}_Linux-64bit.deb";
              apt-get install -y /tmp/trivy.deb;
              rm -f /tmp/trivy.deb'
            `);
          }
        } else {
          
          await executeQuietly(`
            echo "${this.currentPassword}" | sudo -S bash -c '
            rm -f /usr/local/bin/grype;
            curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin v${latestVersion}'
          `);
        }
        console.log('  ∟ Update: Completed ✅');
      } else {
        console.log('  ∟ Status: Up to date ✅');
      }
  
      
      console.log('\n📀 Database Status');
      if (scanner === 'trivy') {
        const trivyDbStatus = await executeQuietly('trivy version | grep -A 4 "Vulnerability DB:"');
        const dbInfo = this.parseTrivyDbStatus(trivyDbStatus);
        
        if (dbInfo.needsUpdate) {
          console.log('  ∟ Status: Update required');
          await executeQuietly(`
            mkdir -p /tmp/vscan/trivy-db;
            echo "${this.currentPassword}" | sudo -S trivy --cache-dir /tmp/vscan/trivy-db image --download-db-only --quiet
          `);
          console.log('  ∟ Update: Completed ✅');
        } else {
          console.log('  ∟ Status: Up to date');
          console.log(`  ∟ Last Update: ${dbInfo.lastUpdate}`);
          console.log(`  ∟ Next Update: ${dbInfo.nextUpdate}`);
        }
      } else {
        try {
          const grypeDbStatus = await executeQuietly('GRYPE_DB_PATH=/tmp/vscan/grype-db grype db status -o json');
          const dbStatus = JSON.parse(grypeDbStatus);
          const lastUpdate = new Date(dbStatus.built).toISOString();
          const dbAge = Date.now() - new Date(dbStatus.built).getTime();
          
          if (dbAge > 24 * 60 * 60 * 1000) {
            console.log('  ∟ Status: Update required');
            await executeQuietly(`
              mkdir -p /tmp/vscan/grype-db;
              GRYPE_DB_PATH=/tmp/vscan/grype-db grype db update --quiet
            `);
            console.log('  ∟ Update: Completed ✅');
          } else {
            console.log('  ∟ Status: Up to date');
            console.log(`  ∟ Last Update: ${lastUpdate}`);
          }
        } catch (error) {
          console.log('  ∟ Status: Initializing database');
          await executeQuietly(`
            mkdir -p /tmp/vscan/grype-db;
            GRYPE_DB_PATH=/tmp/vscan/grype-db grype db update --quiet
          `);
          console.log('  ∟ Status: Database initialized ✅');
        }
      }
  
      
      const finalVersion = await executeQuietly(
        scanner === 'trivy'
          ? 'trivy version | head -n 1 | cut -d" " -f2'
          : 'grype version | grep "^Version:" | sed "s/Version:[[:space:]]*v*//"'
      );
  
      console.log(`\n✨ Setup completed successfully`);
      console.log(`  ∟ ${scannerName} Version: ${finalVersion.trim()}`);
      console.log(logDivider + '\n');
  
      return {
        installed: true,
        version: finalVersion.trim()
      };
  
    } catch (error) {
      console.error(`\n❌ Error in ${scanner.toUpperCase()} setup:`, error);
      console.log('='.repeat(60) + '\n');
      throw error;
    }
  }
  
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.replace(/^v/, '').split('.').map(Number);
    const v2Parts = version2.replace(/^v/, '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const part1 = v1Parts[i] || 0;
      const part2 = v2Parts[i] || 0;
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    return 0;
  }

  private parseTrivyDbStatus(status: string): { 
    version: string; 
    lastUpdate: string; 
    nextUpdate: string;
    needsUpdate: boolean;
  } {
    const version = status.match(/Version:\s+(\d+)/)?.[1] || 'unknown';
    const lastUpdate = status.match(/UpdatedAt:\s+(.+?)(?=\n|$)/)?.[1] || 'unknown';
    const nextUpdate = status.match(/NextUpdate:\s+(.+?)(?=\n|$)/)?.[1] || 'unknown';
  
    let needsUpdate = false;
    if (nextUpdate !== 'unknown') {
      const nextUpdateDate = new Date(nextUpdate);
      needsUpdate = nextUpdateDate.getTime() < Date.now();
    }
  
    return {
      version,
      lastUpdate,
      nextUpdate,
      needsUpdate
    };
  }
  
 
  public async keepAlive(req: Request, res: Response): Promise<void> {
    try {
      const { serverName } = req.params;
      
      if (!serverName) {
        res.status(400).json({
          success: false,
          error: 'Server name is required'
        });
        return;
      }

      const connection = this.activeConnections.get(serverName);
      
      if (!connection) {
        res.status(404).json({
          success: false,
          error: 'No active connection found'
        });
        return;
      }

      try {
        
        await this.executeCommandInClient(connection, 'echo "keepalive"');
        
        
        await this.db.run(`
          UPDATE ssh_connections 
          SET connection_status = 'connected',
              last_connected = datetime('now'),
              is_active = 1,
              updated_at = datetime('now')
          WHERE server_address = ?
        `, [serverName]);

        
        this.activeConnections.set(serverName, connection);

        res.json({
          success: true,
          message: 'Connection is alive'
        });

      } catch (error) {
        
        this.activeConnections.delete(serverName);
        
        
        await this.db.run(`
          UPDATE ssh_connections 
          SET connection_status = 'disconnected',
              is_active = 0,
              error_message = ?,
              updated_at = datetime('now')
          WHERE server_address = ?
        `, [
          error instanceof Error ? error.message : 'Connection lost',
          serverName
        ]);

        throw error;
      }

    } catch (error) {
      console.error('Keep-alive check failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check connection'
      });
    }
  }

  async testConnection(req: Request, res: Response) {
    try {
      const { host, username, password }: SSHConnectionInfo = req.body;
  
      if (!host || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Host, username and password are required'
        });
      }

      this.addLog('info', `Testing connection to ${host}`);
  
      const client = new Client();
      
      const connectionResult = await this.withTimeout(
        new Promise<{hostname: string, osInfo: string}>(async (resolve, reject) => {
          try {
            client.on('ready', async () => {
              try {
                const hostname = await this.executeCommandInClient(client, 'hostname');
                const osInfo = await this.executeCommandInClient(
                  client, 
                  'cat /etc/os-release | grep PRETTY_NAME'
                );
                resolve({
                  hostname: hostname.trim(),
                  osInfo: osInfo.trim()
                });
              } catch (error) {
                reject(error);
              }
            });
    
            client.on('error', (error) => {
              reject(error);
            });
    
            client.connect({
              host,
              username,
              password,
              readyTimeout: SSH_TIMEOUT,
              keepaliveInterval: 10000
            });
          } catch (error) {
            reject(error);
          }
        }),
        SSH_TIMEOUT,
        'Connection test'
      );

      
      const existingConnection = await this.db.get(
        'SELECT id FROM ssh_connections WHERE server_address = ? AND username = ?',
        [host, username]
      );

      const encryptedPassword = encryptionService.encrypt(password);
  
      if (existingConnection) {
        await this.db.run(`
          UPDATE ssh_connections 
          SET 
            password = ?,
            hostname = ?,
            os_info = ?,
            last_connected = CURRENT_TIMESTAMP,
            is_active = 1,
            connection_status = 'connected',
            error_message = NULL
          WHERE id = ?
        `, [
          encryptedPassword,
          connectionResult.hostname,
          connectionResult.osInfo,
          existingConnection.id
        ]);
      } else {
        await this.db.run(`
          INSERT INTO ssh_connections (
            server_address,
            username,
            password,
            hostname,
            os_info,
            last_connected,
            is_active,
            connection_status
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, 'connected')
        `, [
          host,
          username,
          encryptedPassword,
          connectionResult.hostname,
          connectionResult.osInfo
        ]);
      }

      
      const trivyInstalled = await this.executeCommandInClient(
        client, 
        'command -v trivy >/dev/null 2>&1 && echo "true" || echo "false"'
      );
  
      const grypeInstalled = await this.executeCommandInClient(
        client, 
        'command -v grype >/dev/null 2>&1 && echo "true" || echo "false"'
      );
  
      client.end();
      
      res.json({
        success: true,
        details: {
          hostname: connectionResult.hostname,
          osInfo: connectionResult.osInfo,
          requirements: {
            trivy: trivyInstalled.trim() === 'true',
            grype: grypeInstalled.trim() === 'true'
          }
        }
      });
  
    } catch (error) {
      this.addLog('error', `Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
  ): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  private async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = MAX_RETRIES,
    delay: number = RETRY_DELAY
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.addLog('warning', `Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`);
        
        if (attempt === maxAttempts) break;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  public async connectToServer(req: Request, res: Response): Promise<void> {
    let systemCheckCompleted = false;
    
    try {
      const { serverName } = req.params;
      const credentials: SSHConnectionInfo = req.body;
  
      if (!serverName || !credentials.username || !credentials.password) {
        res.status(400).json({
          success: false,
          error: 'Server name and credentials are required'
        });
        return;
      }
  
      this.setCurrentPassword(credentials.password);
  
      this.addLog('info', `Connecting to server ${serverName}`);
  
      const client = new Client();
      await this.establishConnection(client, credentials);
      this.activeConnections.set(serverName, client);
  
      
      try {
        const systemCheckResult = await this.performSystemCheck(
          serverName, 
          credentials.username, 
          credentials.password
        );
  
        systemCheckCompleted = systemCheckResult.success;
      } catch (checkError) {
        console.error('System check error:', checkError);
        
      }
  
      await this.db.run(`
        UPDATE ssh_connections 
        SET 
          connection_status = 'connected',
          last_connected = datetime('now'),
          is_active = 1,
          error_message = NULL
        WHERE server_address = ? AND username = ?
      `, [serverName, credentials.username]);
  
      res.json({
        success: true,
        message: `Connected to ${serverName}`
      });
  
    } catch (error) {
      this.addLog('error', `Connection error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    } finally {
      
      if (systemCheckCompleted) {
        this.clearCurrentPassword();
      }
    }
  }

  private async establishConnection(
    client: Client, 
    credentials: SSHConnectionInfo
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end();
        reject(new Error('Connection timed out'));
      }, SSH_TIMEOUT);

      client.on('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      client.connect({
        host: credentials.host,
        username: credentials.username,
        password: credentials.password,
        readyTimeout: SSH_TIMEOUT,
        keepaliveInterval: 10000
      });
    });
  }

  public async executeCommand(req: Request, res: Response): Promise<void> {
    try {
      const options: SSHExecuteOptions = req.body;
      
      if (!options.command || !options.server) {
        res.status(400).json({
          success: false,
          error: 'Command and server are required'
        });
        return;
      }
  
      const client = this.activeConnections.get(options.server);
      if (!client) {
        res.status(400).json({
          success: false,
          error: 'No active SSH connection'
        });
        return;
      }
  
      const result = await this.executeCommandInClient(client, options.command, { silent: options.silent });
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Command execution error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed'
      });
    }
  }
  

  private async validateConnection(serverName: string): Promise<Client> {
    const client = this.activeConnections.get(serverName);
    if (!client) {
      throw new Error('No active SSH connection');
    }
  
    try {
      const testResult = await this.executeCommandInClient(client, 'echo "test_connection"');
      if (testResult.includes('test_connection')) {
        return client;
      }
      throw new Error('Invalid connection response');
    } catch (error) {
      console.log('Connection validation failed:', error);
      
      try {
        const connectionInfo = await this.db.get(`
          SELECT server_address, username, password
          FROM ssh_connections 
          WHERE server_address = ? AND is_active = 1
          ORDER BY last_connected DESC LIMIT 1
        `, [serverName]);
  
        if (!connectionInfo) {
          throw new Error('No connection information found');
        }
  
        const decryptedPassword = encryptionService.decrypt(connectionInfo.password);
        const newClient = new Client();
  
        await this.establishConnection(newClient, {
          host: connectionInfo.server_address,
          username: connectionInfo.username,
          password: decryptedPassword
        });
  
        
        this.activeConnections.set(serverName, newClient);
        return newClient;
  
      } catch (reconnectError) {
        console.error('Reconnection failed:', reconnectError);
        throw new Error('Failed to re-establish SSH connection');
      }
    }
  }

  private async performSystemCheck(host: string, username: string, password: string): Promise<SystemCheckResult> {
    const client = new Client();
  
    try {
      this.setCurrentPassword(password);
      await this.establishConnection(client, { host, username, password });
  
      
      const osRelease = await this.executeCommandInClient(client, 'cat /etc/os-release');
      const osInfo = this.parseOSRelease(osRelease);
  
      
      const [trivyStatus, grypeStatus] = await Promise.all([
        this.setupScanner(client, 'trivy'),
        this.setupScanner(client, 'grype')
      ]);
  
      const result: SystemCheckResult = {
        success: true,
        systemInfo: {
          distro: osInfo.id,
          version: osInfo.version,
          family: this.getOSFamily(osInfo.id)
        },
        scanners: {
          trivy: trivyStatus,
          grype: grypeStatus
        }
      };
  
      
      await this.updateSystemRequirements(host, result);
      
      this.addLog('info', `System check completed successfully for ${host}`);
      this.addLog('info', `OS: ${result.systemInfo?.distro || 'unknown'} ${result.systemInfo?.version || 'unknown'}`);
      this.addLog('info', `Trivy: ${result.scanners.trivy.installed ? 'installed' : 'not installed'} (${result.scanners.trivy.version || 'n/a'})`);
      this.addLog('info', `Grype: ${result.scanners.grype.installed ? 'installed' : 'not installed'} (${result.scanners.grype.version || 'n/a'})`);
  
      return result;
  
    } catch (error) {
      throw error;
    } finally {
      client.end();
    }
  }

  private async executeCommandInClient(
    client: Client, 
    command: string, 
    options: {
      silent?: boolean;
      isScanning?: boolean;
    } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const output: string[] = [];
      const errorOutput: string[] = [];
      let passwordAttempts = 0;
      const MAX_PASSWORD_ATTEMPTS = 3;
      const scanStartTime = new Date();
  
      
      const shouldBeSilent = options.silent || 
                            command.toLowerCase().startsWith('cat') || 
                            (command.includes('-f json') || command.includes('-o json'));
  
      
      const isRealScan = options.isScanning && 
                        (command.includes('filesystem') || command.includes('fs') || command.includes('dir'));
  
      const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      };
  
      
      if (isRealScan) {
        const scannerType = command.includes('trivy') ? 'Trivy' : 'Grype';
        console.log(`[${formatTime(scanStartTime)}] Starting ${scannerType} vulnerability scan...`);
      }
      
      client.exec(command, { pty: true }, (err, stream) => {
        if (err) {
          console.error('SSH exec error:', err.message);
          return reject(err);
        }
  
        const handlePasswordPrompt = (data: string) => {
          if (passwordAttempts >= MAX_PASSWORD_ATTEMPTS) {
            stream.end();
            return reject(new Error('Max password attempts exceeded'));
          }
  
          if (this.currentPassword) {
            passwordAttempts++;
            stream.write(`${this.currentPassword}\n`);
          } else {
            stream.end();
            reject(new Error('No password available'));
          }
        };
  
        stream.on('data', (data: Buffer) => {
          const text = data.toString('utf8');
          output.push(text);
  
          if (text.includes('[sudo] password for') || 
              text.includes('Password:') ||
              text.toLowerCase().includes('password for')) {            
            return;
          }
  
          
          if (isRealScan && !shouldBeSilent) {
            if (text.includes('Analyzing')) {
              console.log(`[${formatTime(new Date())}] Analyzing filesystem...`);
            } else if (text.includes('Scanning')) {
              console.log(`[${formatTime(new Date())}] Scanning for vulnerabilities...`);
            }
          }
        });
  
        stream.stderr.on('data', (data: Buffer) => {
          const text = data.toString('utf8');
          errorOutput.push(text);
  
          if (text.includes('[sudo] password for') || 
              text.includes('Password:') ||
              text.toLowerCase().includes('password for')) {
            handlePasswordPrompt(text);
            return;
          }
  
          
          if (!shouldBeSilent && !text.includes('[sudo]') && 
              !text.toLowerCase().includes('password') && 
              !text.includes('WARN')) {
            console.error(`[${formatTime(new Date())}] Error:`, text.trim());
          }
        });
  
        stream.on('close', (code: number) => {
          const endTime = new Date();
  
          
          if (isRealScan && !shouldBeSilent) {
            const duration = (endTime.getTime() - scanStartTime.getTime()) / 1000;
            const scannerType = command.includes('trivy') ? 'Trivy' : 'Grype';
            console.log(`[${formatTime(endTime)}] ${scannerType} scan completed ${code === 0 ? 'successfully' : 'with errors'}. Duration: ${duration.toFixed(2)} seconds`);
          }
          
          if (code === 0 || output.length > 0) {
            resolve(output.join('').trim());
          } else {
            reject(new Error(errorOutput.join('').trim() || `Command failed with code ${code}`));
          }
        });
  
        stream.on('error', (error: Error) => {
          if (!shouldBeSilent) {
            console.error(`[${formatTime(new Date())}] SSH stream error:`, error.message);
          }
          reject(error);
        });
      });
    });
  }


  public async disconnectServer(req: Request, res: Response): Promise<void> {
    try {
      const { serverName } = req.params;
      
      if (!serverName) {
        res.status(400).json({
          success: false,
          error: 'Server name is required'
        });
        return;
      }

      this.addLog('info', `Disconnecting from server ${serverName}`);

      const client = this.activeConnections.get(serverName);
      if (client) {
        client.end();
        this.activeConnections.delete(serverName);
        
        await this.db.run(`
          UPDATE ssh_connections 
          SET 
            connection_status = 'disconnected',
            is_active = 0,
            updated_at = datetime('now')
          WHERE server_address = ?
        `, [serverName]);
      }

      res.json({
        success: true,
        message: `Disconnected from ${serverName}`
      });
    } catch (error) {
      this.addLog('error', `Disconnect error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect'
      });
    }
  }
  
  private async cleanupInactiveConnections(): Promise<void> {
    try {
      const now = new Date();
      const inactivityThreshold = 30 * 60 * 1000; 
      
      const connections = Array.from(this.activeConnections.entries());
      
      for (const [serverName, client] of connections) {
        try {
          await this.withTimeout(
            this.executeCommandInClient(client, 'echo "ping"'),
            5000,
            'Connection check'
          );
        } catch (error) {
          this.addLog('warning', `Cleaning up inactive connection: ${serverName}`);
          
          client.end();
          this.activeConnections.delete(serverName);
          
          await this.db.run(`
            UPDATE ssh_connections 
            SET 
              connection_status = 'disconnected',
              is_active = 0,
              updated_at = datetime('now')
            WHERE server_address = ?
          `, [serverName]);
        }
      }
    } catch (error) {
      this.addLog('error', `Cleanup error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async mountDisk(req: Request, res: Response): Promise<void> {
    try {
      const { path, mountPoint, options = 'ro' } = req.body;
      const { serverName } = req.params;

      if (!path || !mountPoint) {
        res.status(400).json({
          success: false,
          error: 'Path and mount point are required'
        });
        return;
      }

      const client = await this.validateConnection(serverName);

      this.addLog('info', `Creating mount point ${mountPoint} on ${serverName}`);

      
      await this.executeCommandInClient(
        client,
        `sudo mkdir -p "${mountPoint}"`
      );

      
      await this.executeCommandInClient(
        client,
        `test -d "${mountPoint}" || (echo "Failed to create mount point" && exit 1)`
      );

      this.addLog('info', `Mounting ${path} to ${mountPoint}`);

      
      await this.executeCommandInClient(
        client,
        `sudo mount -o ${options} "${path}" "${mountPoint}" 2>&1`
      );

      
      const verifyMount = await this.executeCommandInClient(
        client,
        `df -hT "${mountPoint}"`
      );

      
      const fsType = await this.executeCommandInClient(
        client,
        `df -T "${mountPoint}" | tail -n 1 | awk '{print $2}'`
      );

      const mountInfo: DiskInfo = {
        device: path,
        mountPath: mountPoint,
        fsType: fsType.trim() || 'auto',
        options: options.split(','),
        mounted: verifyMount.includes(mountPoint)
      };

      
      await this.db.run(`
        INSERT INTO mount_points (
          server_id,
          device,
          mount_path,
          fs_type,
          mount_options,
          mounted_at,
          status
        ) VALUES (
          (SELECT id FROM ssh_connections WHERE server_address = ? LIMIT 1),
          ?, ?, ?, ?, datetime('now'), ?
        )
      `, [
        serverName,
        mountInfo.device,
        mountInfo.mountPath,
        mountInfo.fsType,
        mountInfo.options.join(','),
        mountInfo.mounted ? 'mounted' : 'failed'
      ]);

      res.json({
        success: true,
        mountInfo
      } as MountResponse);

    } catch (error) {
      this.addLog('error', `Mount error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Mount operation failed'
      });
    }
  }

  public async unmountDisk(req: Request, res: Response): Promise<void> {
    try {
      const { mountPoint, force = false } = req.body;
      const { serverName } = req.params;

      if (!mountPoint) {
        res.status(400).json({
          success: false,
          error: 'Mount point is required'
        });
        return;
      }

      const client = await this.validateConnection(serverName);
      this.addLog('info', `Unmounting ${mountPoint} on ${serverName}`);

      
      const mountExists = await this.executeCommandInClient(
        client,
        `mountpoint -q "${mountPoint}" || echo "not_mounted"`
      );

      if (mountExists === 'not_mounted') {
        await this.db.run(`
          UPDATE mount_points 
          SET 
            status = 'unmounted',
            unmounted_at = datetime('now')
          WHERE mount_path = ? AND server_id = (
            SELECT id FROM ssh_connections WHERE server_address = ? LIMIT 1
          )
        `, [mountPoint, serverName]);

        res.json({
          success: true,
          message: `${mountPoint} is not mounted`
        });
        return;
      }

      
      try {
        await this.executeCommandInClient(
          client,
          `sudo fuser -km "${mountPoint}" 2>/dev/null || true`
        );
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        this.addLog('warning', `Failed to kill processes: ${error instanceof Error ? error.message : String(error)}`);
      }

      
      const unmountCmd = force 
        ? `sudo umount -f "${mountPoint}" 2>&1`
        : `sudo umount "${mountPoint}" 2>&1`;

      await this.executeCommandInClient(client, unmountCmd);

      
      const verifyUnmount = await this.executeCommandInClient(
        client,
        `mountpoint -q "${mountPoint}" || echo "unmounted"`
      );

      if (verifyUnmount !== 'unmounted') {
        throw new Error('Failed to unmount directory');
      }

      
      try {
        await this.executeCommandInClient(
          client,
          `sudo rm -rf "${mountPoint}"`
        );
      } catch (error) {
        this.addLog('warning', `Failed to remove mount point directory: ${error instanceof Error ? error.message : String(error)}`);
      }

      
      await this.db.run(`
        UPDATE mount_points 
        SET 
          unmounted_at = datetime('now'),
          status = 'unmounted'
        WHERE mount_path = ? AND server_id = (
          SELECT id FROM ssh_connections WHERE server_address = ? LIMIT 1
        )
      `, [mountPoint, serverName]);

      res.json({
        success: true,
        message: `Successfully unmounted ${mountPoint}`
      });

    } catch (error) {
      this.addLog('error', `Unmount error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unmount operation failed'
      });
    }
  }

  public async getActiveMounts(req: Request, res: Response): Promise<void> {
    try {
      const { serverName } = req.params;
      
      const client = await this.validateConnection(serverName);

      const dfOutput = await this.executeCommandInClient(client, 'df -hT');
      const mounts: DiskInfo[] = dfOutput
        .split('\n')
        .slice(1)
        .filter(line => line.trim())
        .map(line => {
          const [device, fsType, size, used, avail, usePercent, mountPath] = line.split(/\s+/);
          return {
            device,
            mountPath,
            fsType,
            options: ['auto'],
            mounted: true
          };
        });

      res.json({
        success: true,
        mounts
      });
    } catch (error) {
      this.addLog('error', `Get mounts error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active mounts'
      });
    }
  }

  public async checkSystemRequirements(req: Request, res: Response) {
    try {
      const { host, username, password } = req.body;
  
      if (!host || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Host, username and password are required'
        });
      }
  
      this.addLog('info', `Checking system requirements for ${host}`);
  
      const result = await this.performSystemCheck(host, username, password);
  
      res.json(result);
  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('error', `System check error: ${errorMessage}`);
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    } finally {
      this.clearCurrentPassword();
    }
  }
  
  public async getServerStatus(req: Request, res: Response): Promise<void> {
    try {
      const { serverName } = req.params;
      
      if (!serverName) {
        res.status(400).json({
          success: false,
          error: 'Server name is required'
        });
        return;
      }
  
      const connectionInfo = await this.db.get(`
        SELECT 
          server_address,
          hostname,
          os_info,
          connection_status,
          last_connected
        FROM ssh_connections
        WHERE server_address = ?
      `, [serverName]);
  
      const isConnected = this.activeConnections.has(serverName);
  
      res.json({
        success: true,
        status: {
          connected: isConnected,
          info: connectionInfo || undefined
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('error', `Error getting server status: ${errorMessage}`);
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }
  
  public async getActiveConnections(req: Request, res: Response): Promise<void> {
    try {
      const connections = await this.db.all(`
        SELECT 
          sc.*,
          sr.trivy_installed,
          sr.trivy_version,
          sr.grype_installed,
          sr.grype_version
        FROM ssh_connections sc
        LEFT JOIN system_requirements sr ON sc.id = sr.server_id
        WHERE sc.is_active = 1 AND sc.connection_status = 'connected'
        ORDER BY sc.last_connected DESC
      `);
  
      
      for (const conn of connections) {
        const activeConnection = this.activeConnections.get(conn.server_address);
        if (activeConnection) {
          const isAlive = await this.executeCommandInClient(
            activeConnection,
            'echo "check"'
          ).catch(() => false);
  
          if (!isAlive) {
            await this.db.run(`
              UPDATE ssh_connections
              SET is_active = 0,
                  connection_status = 'disconnected',
                  updated_at = datetime('now')
              WHERE server_address = ?
            `, [conn.server_address]);
          }
        }
      }
  
      res.json({
        success: true,
        connections: connections.filter(conn => this.activeConnections.has(conn.server_address))
      });
  
    } catch (error) {
      console.error('Error getting active connections:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active connections'
      });
    }
  }


  public async updateConnectionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { serverName, serverAddress, username, connectionType } = req.body;
  
      if (!serverName || !serverAddress || !username || !connectionType) {
        res.status(400).json({
          success: false,
          error: 'Missing required connection information'
        });
        return;
      }
  
      this.addLog('info', `Updating connection status for ${serverName}`);
  
      await this.db.run(`
        UPDATE ssh_connections 
        SET 
          connection_status = 'connected',
          last_connected = datetime('now'),
          is_active = 1,
          updated_at = datetime('now')
        WHERE server_address = ? AND username = ?
      `, [serverAddress, username]);
  
      const { changes } = await this.db.get('SELECT changes() as changes');
      
      if (changes === 0) {
        await this.db.run(`
          INSERT INTO ssh_connections (
            server_address,
            username,
            connection_status,
            last_connected,
            is_active,
            updated_at
          ) VALUES (?, ?, 'connected', datetime('now'), 1, datetime('now'))
        `, [serverAddress, username]);
      }
  
      res.json({
        success: true,
        message: 'Connection status updated successfully'
      });
    } catch (error) {
      this.addLog('error', `Error updating connection status: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update connection status'
      });
    }
  }

  private async getScannerVersions(client: Client) {
    const scanners = {
      trivy: { installed: false, version: '' },
      grype: { installed: false, version: '' }
    };

    try {
      const trivyVersion = await this.executeCommandInClient(client, 'trivy --version');
      const trivyMatch = trivyVersion.match(/Version:\s+([0-9.]+)/);
      if (trivyMatch) {
        scanners.trivy = { installed: true, version: trivyMatch[1] };
      }
    } catch (error) {
      this.addLog('warning', `Trivy not installed or error getting version`);
    }

    try {
      const grypeVersion = await this.executeCommandInClient(client, 'grype version');
      const grypeMatch = grypeVersion.match(/Version:\s+([0-9.]+)/);
      if (grypeMatch) {
        scanners.grype = { installed: true, version: grypeMatch[1] };
      }
    } catch (error) {
      this.addLog('warning', `Grype not installed or error getting version`);
    }

    return scanners;
  }

  private parseOSRelease(data: string): { id: string; version: string; prettyName: string } {
    const lines = data.split('\n');
    let id = '';
    let version = '';
    let prettyName = '';
  
    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/"/g, '').trim();
  
      switch (key.trim()) {
        case 'ID':
          id = value;
          break;
        case 'VERSION_ID':
          version = value;
          break;
        case 'PRETTY_NAME':
          prettyName = value;
          break;
      }
    }
  
    return { id, version, prettyName };
  }

  private getOSFamily(id: string): 'rhel' | 'debian' | 'unknown' {
    
    const osId = id.toLowerCase();
    
    
    if (['rhel', 'centos', 'rocky', 'almalinux', 'fedora'].includes(osId)) {
      return 'rhel';
    }
    
    
    if (['ubuntu', 'debian', 'linuxmint', 'pop'].includes(osId)) {
      return 'debian';
    }
    
    return 'unknown';
  }

  private async updateSystemRequirements(host: string, checkResult: SystemCheckResult): Promise<void> {
    try {
      const serverId = await this.db.get(
        'SELECT id FROM ssh_connections WHERE server_address = ?',
        [host]
      );
  
      if (serverId) {
        await this.db.run(`
          INSERT INTO system_requirements (
            server_id,
            trivy_installed,
            trivy_version,
            grype_installed,
            grype_version,
            os_type,
            os_version,
            os_family,
            last_check_date,
            check_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'completed')
        `, [
          serverId.id,
          checkResult.scanners.trivy.installed ? 1 : 0,
          checkResult.scanners.trivy.version,
          checkResult.scanners.grype.installed ? 1 : 0,
          checkResult.scanners.grype.version,
          checkResult.systemInfo?.distro,
          checkResult.systemInfo?.version,
          checkResult.systemInfo?.family
        ]);
  
        
        await this.db.run(`
          UPDATE ssh_connections 
          SET 
            trivy_installed = ?,
            trivy_version = ?,
            grype_installed = ?,
            grype_version = ?,
            os_info = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `, [
          checkResult.scanners.trivy.installed ? 1 : 0,
          checkResult.scanners.trivy.version,
          checkResult.scanners.grype.installed ? 1 : 0,
          checkResult.scanners.grype.version,
          JSON.stringify(checkResult.systemInfo),
          serverId.id
        ]);
      }
    } catch (error) {
      this.addLog('error', `Error updating system requirements: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to update system requirements');
    }
  }
}