import { Request, Response } from 'express';
import { Database } from 'sqlite';
import { createNotificationService } from '../services/notifications.service.js';
import { encryptionService } from '../services/encryption.service.js';

export class NotificationsController {
  private notificationService;

  constructor(private db: Database) {
    this.notificationService = createNotificationService(db);
  }

  async getConfig(req: Request, res: Response) {
    try {
      const config = await this.notificationService.getConfig();
      
      if (!config) {
        return res.json({
          success: true,
          config: null
        });
      }

      
      const { password, ...safeConfig } = config;
      
      res.json({
        success: true,
        config: safeConfig
      });

    } catch (error) {
      console.error('Error getting SMTP config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async saveConfig(req: Request, res: Response) {
    try {
      const config = req.body;

      if (!config.server || !config.senderEmail || !config.emailTo) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      
      const success = await this.notificationService.saveConfig(config, false);

      if (!success) {
        throw new Error('Failed to save SMTP configuration');
      }

      res.json({
        success: true,
        message: 'SMTP configuration saved successfully'
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testConfig(req: Request, res: Response) {
    try {
      const config = req.body;
      
      if (!config.server || !config.senderEmail || !config.emailTo || 
          !config.username || !config.password) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      
      const success = await this.notificationService.testSMTP(config);

      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to send test email'
        });
      }

      res.json({
        success: true,
        message: 'Test email sent successfully'
      });

    } catch (error) {
      console.error('Error testing SMTP:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test email'
      });
    }
  }
}