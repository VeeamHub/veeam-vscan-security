// src/routes/ssh.routes.ts
import { Router } from 'express';
import { Database } from 'sqlite';
import { SSHController } from '../controllers/ssh.controller.js';

export function createSSHRoutes(db: Database) {
  const router = Router();
  const controller = SSHController.getInstance(db);

 
  router.post('/test-connection', (req, res) => controller.testConnection(req, res));
  router.post('/connect/:serverName', (req, res) => controller.connectToServer(req, res));
  router.post('/disconnect/:serverName', (req, res) => controller.disconnectServer(req, res));
  router.get('/status/:serverName', (req, res) => controller.getServerStatus(req, res));
  router.get('/connections', (req, res) => controller.getActiveConnections(req, res));
  router.post('/system-check', (req, res) => controller.checkSystemRequirements(req, res));
  router.post('/notify-connection', (req, res) => controller.updateConnectionStatus(req, res));
  router.post('/keepalive/:serverName', (req, res) => controller.keepAlive(req, res)); 
  router.post('/mount/:serverName', (req, res) => controller.mountDisk(req, res));
  router.post('/unmount/:serverName', (req, res) => controller.unmountDisk(req, res));
  router.get('/mounts/:serverName', (req, res) => controller.getActiveMounts(req, res));
  router.post('/execute', (req, res) => controller.executeCommand(req, res));

  
  router.use((err: Error, req: any, res: any, next: any) => {
    console.error('SSH Route Error:', err);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  return router;
}