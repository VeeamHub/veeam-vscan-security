import { Router } from 'express';
import { Database } from 'sqlite';
import { createVBRRoutes } from './vbr.routes.js';
import { createSSHRoutes } from './ssh.routes.js';
import { createScannerRoutes } from './scanner.routes.js';
import { createNotificationsRoutes } from './notifications.routes.js';

export function createMainRouter(db: Database) {
  const router = Router();
  
  router.use('/vbr', createVBRRoutes(db));
  router.use('/ssh', createSSHRoutes(db));
  router.use('/scanner', createScannerRoutes(db));
  router.use('/notifications', createNotificationsRoutes(db));

  return router;
}