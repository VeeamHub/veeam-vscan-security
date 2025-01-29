import { Client } from 'ssh2';
import type { 
    SSHConnection, 
    SSHConnectionInfo, 
    SSHCommandResult, 
    SSHServerInfo,
    MountResult,
    MountInfo
} from '../types/ssh.js';

export class SSHService {
    private connections: Map<string, SSHConnection> = new Map();
    private static instance: SSHService;
  
    private constructor() {
      setInterval(() => this.cleanupInactiveConnections(), 5 * 60 * 1000);
    }
  
    public static getInstance(): SSHService {
      if (!SSHService.instance) {
        SSHService.instance = new SSHService();
      }
      return SSHService.instance;
    }

    public async getMountedDevices(): Promise<MountResult> {
        try {
            const result = await this.executeCommandInClient(this.getCurrentClient(), "df -hT");
            return {
                success: true,
                output: result
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get mounted devices'
            };
        }
    }
    
    public async checkMountPoint(mountPoint: string): Promise<boolean> {
        try {
            await this.executeCommandInClient(this.getCurrentClient(), `test -d "${mountPoint}"`);
            return true;
        } catch {
            return false;
        }
    }

    public async unmountPath(mountPoint: string, force: boolean = false): Promise<SSHCommandResult> {
        try {
            const command = `sudo umount ${force ? '-f' : ''} "${mountPoint}"`;
            await this.executeCommandInClient(this.getCurrentClient(), command);
            return {
                success: true,
                output: `Successfully unmounted ${mountPoint}`
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to unmount path'
            };
        }
    }

    private getCurrentClient(): Client {
        const activeConnection = Array.from(this.connections.values())[0];
        if (!activeConnection) {
            throw new Error('No active SSH connection available');
        }
        return activeConnection.client;
    }
    
    public async connectToServer(serverName: string, credentials: SSHConnectionInfo): Promise<SSHCommandResult> {
        try {
            await this.disconnectServer(serverName);

            const client = new Client();
            
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    client.end();
                    reject(new Error('Connection timed out'));
                }, 10000);

                client.on('ready', async () => {
                    clearTimeout(timeout);
                    try {
                        
                        const hostname = await this.executeCommandInClient(client, 'hostname');
                        const ipAddr = await this.executeCommandInClient(
                            client,
                            "ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -n1"
                        );

                        const serverInfo: SSHServerInfo = {
                            name: serverName,
                            address: credentials.host,
                            hostname: hostname.trim(),
                            ipAddress: ipAddr.trim()
                        };

                        this.connections.set(serverName, {
                            client,
                            info: serverInfo,
                            lastActivity: new Date()
                        });

                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });

                client.on('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });

                client.connect({
                    host: credentials.host,
                    username: credentials.username,
                    password: credentials.password,
                    readyTimeout: 10000,
                    keepaliveInterval: 60000,
                    keepaliveCountMax: 3
                });
            });

            const connection = this.connections.get(serverName);
            return {
                success: true,
                output: `Successfully connected to ${connection?.info.hostname || serverName}`
            };

        } catch (error) {
            console.error('Connection error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Connection failed'
            };
        }
    }

    public async disconnectServer(serverName: string): Promise<void> {
        const connection = this.connections.get(serverName);
        if (connection) {
            try {
                connection.client.end();
            } catch (error) {
                console.error(`Error disconnecting from ${serverName}:`, error);
            } finally {
                this.connections.delete(serverName);
            }
        }
    }

    public async getServerStatus(serverName: string): Promise<{ connected: boolean; info?: SSHServerInfo }> {
        const connection = this.connections.get(serverName);
        if (!connection) {
            return { connected: false };
        }

        try {
            
            await this.executeCommandInClient(connection.client, 'echo "test connection"');
            connection.lastActivity = new Date();
            return {
                connected: true,
                info: connection.info
            };
        } catch (error) {
            console.error(`Error checking connection to ${serverName}:`, error);
            this.connections.delete(serverName);
            return { connected: false };
        }
    }

    public getActiveConnections(): SSHServerInfo[] {
        return Array.from(this.connections.values())
            .map(conn => conn.info)
            .filter((info): info is SSHServerInfo => info !== undefined);
    }

    public async executeCommand(serverName: string, command: string): Promise<SSHCommandResult> {
        const connection = this.connections.get(serverName);
        if (!connection) {
            return {
                success: false,
                error: 'No active connection found'
            };
        }

        try {
            connection.lastActivity = new Date();
            const output = await this.executeCommandInClient(connection.client, command);
            return {
                success: true,
                output
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Command execution failed'
            };
        }
    }

    private async executeCommandInClient(client: Client, command: string): Promise<string> {
        return new Promise((resolve, reject) => {
          console.log('[SSH] Executing command:', command);
          
          client.exec(command, (err, stream) => {
            if (err) {
              console.error('[SSH] Command execution error:', err);
              return reject(err);
            }
            
            let output = '';
            let errorOutput = '';
    
            stream.on('data', (data: Buffer) => {
              console.log('[SSH] Received data chunk:', data.toString());
              output += data.toString();
            });
    
            stream.stderr.on('data', (data: Buffer) => {
              console.error('[SSH] Received error data:', data.toString());
              errorOutput += data.toString();
            });
    
            stream.on('close', (code: number) => {
              console.log('[SSH] Command completed with code:', code);
              if (code === 0) {
                resolve(output);
              } else {
                reject(new Error(errorOutput || `Command failed with code ${code}`));
              }
            });
          });
        });
      }
    

    private async cleanupInactiveConnections(): Promise<void> {
        const now = new Date();
        const timeoutMs = 30 * 60 * 1000; 

        for (const [serverName, connection] of this.connections.entries()) {
            const inactiveTime = now.getTime() - connection.lastActivity.getTime();
            if (inactiveTime > timeoutMs) {
                console.log(`Cleaning up inactive connection: ${serverName}`);
                await this.disconnectServer(serverName);
            }
        }
    }
}

export const sshService = SSHService.getInstance();