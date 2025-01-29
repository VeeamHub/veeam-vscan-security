import { Router } from 'express';
import { Database } from 'sqlite';
import { VBRController } from '../controllers/vbr.controller.js';

export function createVBRRoutes(db: Database) {
  const router = Router();
  const controller = new VBRController(db);

  
  router.get('/status', (req, res) => controller.getStatus(req, res));
  router.get('/last-config', (req, res) => controller.getLastConfig(req, res));
  router.get('/system-info', (req, res) => controller.getvscanInstallation(req, res));
  router.get('/diagnose', (req, res) => controller.diagnosevscanInstallation(req, res));
  router.get('/default-port', (req, res) => controller.getDefaultPort(req, res));  
  router.post('/connect', (req, res) => controller.connect(req, res));
  router.post('/disconnect', (req, res) => controller.disconnect(req, res));
  router.post('/execute', (req, res) => controller.executeCommand(req, res));  
  router.get('/debug-installation', (req, res) => controller.quickCheck(req, res));
  router.get('/refresh-system-info', (req, res) => controller.refreshSystemInfo(req, res));

  return router;
}