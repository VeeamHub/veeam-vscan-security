import { Router } from 'express';
import { ScannerController } from '../controllers/scanner.controller.js';
import { Database } from 'sqlite';

export function createScannerRoutes(db: Database) {
  const router = Router();
  const controller = new ScannerController(db);

  
  router.get('/dashboard-stats', (req, res) => controller.getDashboardStats(req, res));
  router.get('/vulnerability-trends', (req, res) => controller.getVulnerabilityTrends(req, res));
  router.get('/most-vulnerable-servers', (req, res) => controller.getMostVulnerableServers(req, res));
  router.get('/config', (req, res) => controller.getConfig(req, res));
  router.post('/config', (req, res) => controller.saveConfig(req, res));
  router.put('/system-info', (req, res) => controller.updateSystemInfo(req, res));
  router.post('/scan-result', (req, res) => controller.saveScanResult(req, res));  
  router.get('/vulnerabilities', (req, res) => controller.getVulnerabilities(req, res));
  router.get('/vulnerabilities/export', (req, res) => controller.exportVulnerabilities(req, res));
  router.get('/vulnerabilities/:id', (req, res) => controller.getVulnerabilityById(req, res));
  router.put('/vulnerabilities/:id/status', (req, res) => controller.updateVulnerabilityStatus(req, res));

  return router;
}