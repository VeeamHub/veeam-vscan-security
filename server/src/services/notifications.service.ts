import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Database } from 'sqlite';
import { encryptionService } from './encryption.service.js';
import type { ScanResult, Vulnerability } from '../types/vscan.js';

interface SMTPConfig {
  server: string;
  port: number;
  senderEmail: string;
  senderName: string;
  username: string;
  password: string;
  emailTo: string;
  useSSL: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private db: Database;

  private constructor(db: Database) {
    this.db = db;
    this.initializeDb();
  }

  public static getInstance(db: Database): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(db);
    }
    return NotificationService.instance;
  }

  private async initializeDb(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS smtp_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server TEXT NOT NULL,
        port INTEGER NOT NULL,
        sender_email TEXT NOT NULL,
        sender_name TEXT,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        email_to TEXT NOT NULL,
        use_ssl BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private async createTransporter(config: SMTPConfig): Promise<Transporter> {
    try {
      const isMailjet = config.server.includes('mailjet.com');
      
      console.log('Creating transporter for', isMailjet ? 'Mailjet' : 'Generic SMTP', {
        server: config.server,
        port: config.port,
        username: config.username,
        useSSL: config.useSSL
      });

      const transportOptions: SMTPTransport.Options = {
        host: config.server,
        port: config.port,
        secure: false,
        requireTLS: config.useSSL,
        auth: {
          user: config.username,
          pass: config.password
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        }
      };

      return nodemailer.createTransport(transportOptions);
    } catch (error) {
      console.error('Error creating SMTP transporter:', error);
      throw error;
    }
  }

  private createEmailStyle(): string {
    return `
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: hsl(222.2 47.4% 11.2%);
          background-color: hsl(0 0% 100%);
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          background-color: hsl(0 0% 100%);
        }
        h1 { 
          color: hsl(221.2 83.2% 53.3%);
          font-size: 24px; 
          margin-bottom: 20px;
          font-weight: 600;
        }
        h2 { 
          color: hsl(222.2 47.4% 11.2%);
          font-size: 20px; 
          margin-top: 30px;
          font-weight: 500;
        }
        .details { 
          background: hsl(210 40% 98%);
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
          border: 1px solid hsl(214.3 31.8% 91.4%);
        }
        .details-item { 
          margin: 8px 0;
          color: hsl(215.4 16.3% 46.9%);
        }
        .details-item strong {
          color: hsl(222.2 47.4% 11.2%);
          font-weight: 500;
        }
        .summary { 
          background: hsl(210 40% 98%);
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
          border: 1px solid hsl(214.3 31.8% 91.4%);
        }
        .critical { 
          color: hsl(0 84.2% 60.2%); /* Red */
          font-weight: 500;
        }
        .high { 
          color: hsl(20 84.2% 60.2%); /* Orange */
          font-weight: 500;
        }
        .medium { 
          color: hsl(48 96.5% 53.3%); /* Yellow */
          font-weight: 500;
        }
        .low { 
          color: hsl(142.1 76.2% 36.3%); /* Green */
          font-weight: 500;
        }
        .footer { 
          margin-top: 32px;
          padding-top: 16px;
          font-size: 12px;
          color: hsl(215.4 16.3% 46.9%);
          border-top: 1px solid hsl(214.3 31.8% 91.4%);
        }
      </style>
    `;
  }

  public async getConfig(): Promise<SMTPConfig | null> {
    try {
      console.log('Retrieving SMTP config from database...');
      const config = await this.db.get(`
        SELECT 
          server,
          port,
          sender_email,
          sender_name,
          username,
          password,
          email_to,
          use_ssl
        FROM smtp_config 
        ORDER BY id DESC 
        LIMIT 1
      `);

      if (!config) {
        console.log('No SMTP configuration found in database');
        return null;
      }

      try {
        const decryptedPassword = encryptionService.decrypt(config.password);
        

        return {
          server: config.server,
          port: config.port,
          senderEmail: config.sender_email,
          senderName: config.sender_name,
          username: config.username,
          password: decryptedPassword,
          emailTo: config.email_to,
          useSSL: Boolean(config.use_ssl)
        };

      } catch (decryptError) {
        console.error('Error decrypting password:', decryptError);
        return null;
      }
    } catch (error) {
      console.error('Error getting SMTP config:', error);
      return null;
    }
  }

  public async saveConfig(config: SMTPConfig, isAlreadyEncrypted: boolean = false): Promise<boolean> {
    try {
      let passwordToSave: string;

      if (isAlreadyEncrypted) {
        console.log('Using pre-encrypted password');
        passwordToSave = config.password;
      } else {
        console.log('Encrypting plain password for storage...');
        passwordToSave = encryptionService.encrypt(config.password);
      }

      await this.db.run('DELETE FROM smtp_config');
      
      const result = await this.db.run(`
        INSERT INTO smtp_config (
          server,
          port,
          sender_email,
          sender_name,
          username,
          password,
          email_to,
          use_ssl,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        config.server,
        config.port,
        config.senderEmail,
        config.senderName,
        config.username,
        passwordToSave,
        config.emailTo,
        config.useSSL ? 1 : 0
      ]);

      console.log('Config saved successfully');
      return Boolean(result?.changes);
    } catch (error) {
      console.error('Error saving SMTP config:', error);
      throw error;
    }
  }

  public async testSMTP(config: SMTPConfig): Promise<boolean> {
    try {
      console.log('Testing SMTP connection...');
      const transporter = await this.createTransporter(config);
      
      const currentDate = new Date().toLocaleString();
      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          ${this.createEmailStyle()}
        </head>
        <body>
          <div class="container">
            <h1>vScan Security Scanner - Test Email</h1>
            
            <p>This is a test email from vScan Security Scanner.</p>
            
            <p>If you received this email, your SMTP configuration is working correctly.</p>
            
            <div class="details">
              <h2>Connection details:</h2>
              <div class="details-item">Server: ${config.server}</div>
              <div class="details-item">Port: ${config.port}</div>
              <div class="details-item">Security: ${config.useSSL ? 'TLS/SSL' : 'None'}</div>
            </div>
            
            <div class="footer">
              Sent from vScan Security Scanner at ${currentDate}
            </div>
          </div>
        </body>
        </html>
      `;

      console.log('Sending test email...');
      const info = await transporter.sendMail({
        from: `"${config.senderName}" <${config.senderEmail}>`,
        to: config.emailTo,
        subject: 'vScan Security Scanner - Test Email',
        html: emailContent
      });

      console.log('Test email sent successfully:', {
        messageId: info.messageId,
        response: info.response
      });

      return true;

    } catch (error) {
      console.error('SMTP test failed:', error);
      throw error;
    }
  }

  public async addScanResult(scanResult: ScanResult): Promise<void> {
    try {
      const config = await this.getConfig();
      
      if (!config) {
        console.log('No SMTP configuration available, skipping notification');
        return;
      }

      console.log('Preparing to send scan notification...');

      const criticalCount = scanResult.vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
      const highCount = scanResult.vulnerabilities.filter(v => v.severity === 'HIGH').length;
      const mediumCount = scanResult.vulnerabilities.filter(v => v.severity === 'MEDIUM').length;
      const lowCount = scanResult.vulnerabilities.filter(v => v.severity === 'LOW').length;
      const totalCount = scanResult.vulnerabilities.length;

      const scanDate = new Date(scanResult.scanDate).toLocaleString();
      const duration = scanResult.scanDuration 
  ? (() => {
      const totalSeconds = Math.floor(scanResult.scanDuration / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}m ${seconds}s`;
    })()
  : '0m 0s';

      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          ${this.createEmailStyle()}
        </head>
        <body>
          <div class="container">
            <h1>vScan Security Scanner - Scan Results</h1>
            
            <div class="details">
              <h2>Scan Details</h2>
              <div class="details-item"><strong>Server Name:</strong> ${scanResult.vmName}</div>
              <div class="details-item"><strong>Scan Date:</strong> ${scanDate}</div>
              <div class="details-item"><strong>Scanner:</strong> ${scanResult.scanner}</div>
              <div class="details-item"><strong>Total Duration:</strong> ${duration}</div>
            </div>
            
            <div class="summary">
              <h2>Vulnerabilities Summary</h2>
              <div class="details-item critical">Critical: ${criticalCount}</div>
              <div class="details-item high">High: ${highCount}</div>
              <div class="details-item medium">Medium: ${mediumCount}</div>
              <div class="details-item low">Low: ${lowCount}</div>
              <div class="details-item">Total Vulnerabilities: ${totalCount}</div>
            </div>
            
            <p>Please check the vScan Security Scanner dashboard for detailed information.</p>
            
            <div class="footer">
              Sent from vScan Security Scanner at ${new Date().toLocaleString()}
            </div>
          </div>
        </body>
        </html>
      `;

      const transporter = await this.createTransporter(config);
      await transporter.sendMail({
        from: `"${config.senderName}" <${config.senderEmail}>`,
        to: config.emailTo,
        subject: `vScan Security Scanner - Scan Results for ${scanResult.vmName}`,
        html: emailContent
      });

      console.log(`Scan notification sent for ${scanResult.vmName}`);
    } catch (error) {
      console.error('Error sending scan notification:', error);
      throw error;
    }
  }
}

export const createNotificationService = (db: Database) => NotificationService.getInstance(db);