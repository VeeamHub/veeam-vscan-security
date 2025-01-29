import { Router } from 'express';
import { Database } from 'sqlite';
import { NotificationsController } from '../controllers/notifications.controller.js';

export function createNotificationsRoutes(db: Database) {
  const router = Router();
  const controller = new NotificationsController(db);


  router.get('/config', (req, res) => controller.getConfig(req, res));

  router.post('/config', (req, res) => controller.saveConfig(req, res));

  router.post('/test', (req, res) => controller.testConfig(req, res));

  return router;
}