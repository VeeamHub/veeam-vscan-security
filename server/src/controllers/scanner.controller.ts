import { Request, Response } from 'express';
import { Database } from 'sqlite';
import { encryptionService } from '../services/encryption.service.js';
import { createNotificationService } from '../services/notifications.service.js';
import type { 
  LinuxServerConfig, 
  ScanResult, 
  VulnerabilityTrendData,
  DashboardStats,
  SystemCheckResult,
  Vulnerability,
  VulnerabilitySeverity,
  ScannerType
} from '../types/vscan.js';

const BATCH_SIZE = 100;

export class ScannerController {
  constructor(private db: Database) {}

  async getConfig(req: Request, res: Response) {
    try {
      const result = await this.db.get(`
        SELECT 
          server_type,
          server_address,
          server_name,
          server_description,
          vbr_server_name,
          vbr_server_description,
          manual_server_address,
          manual_server_description,
          username,
          is_connected,
          last_connected,
          trivy_version,
          grype_version,
          test_status,
          last_test_date
        FROM scanner_config 
        ORDER BY id DESC 
        LIMIT 1
      `);

      if (!result) {
        return res.json({
          success: true,
          config: null
        });
      }

      let decryptedPassword = null;
      if (result.password) {
        try {
          decryptedPassword = encryptionService.decrypt(result.password);
        } catch (error) {
          console.warn('Failed to decrypt password:', error);
        }
      }

      const config: LinuxServerConfig = {
        serverType: result.server_type,
        vbrServer: result.server_type === 'vbr' ? {
          name: result.vbr_server_name,
          description: result.vbr_server_description,
          isManaged: true
        } : undefined,
        manualServer: result.server_type === 'manual' ? {
          address: result.manual_server_address,
          description: result.manual_server_description,
          isManaged: false
        } : undefined,
        credentials: {
          username: result.username,
          password: decryptedPassword || ''
        },
        tested: Boolean(result.test_status),
        lastTestDate: result.last_test_date,
        scannerVersions: {
          trivy: {
            installed: Boolean(result.trivy_version),
            version: result.trivy_version
          },
          grype: {
            installed: Boolean(result.grype_version), 
            version: result.grype_version
          }
        }
      };

      res.json({
        success: true,
        config
      });

    } catch (error) {
      console.error('Error getting scanner config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  

  async saveConfig(req: Request, res: Response) {
    try {
      const config: LinuxServerConfig = req.body;
  
      if (!config.credentials?.username || !config.credentials?.password) {
        throw new Error('Username and password are required');
      }
  
      if (config.serverType === 'vbr' && !config.vbrServer?.name) {
        throw new Error('VBR server name is required');
      }
  
      if (config.serverType === 'manual' && !config.manualServer?.address) {
        throw new Error('Server address is required');
      }
  
      let encryptedPassword = null;
      if (config.credentials.password) {
        encryptedPassword = encryptionService.encrypt(config.credentials.password);
      }
  
      const serverAddress = config.serverType === 'vbr' 
        ? config.vbrServer?.name 
        : config.manualServer?.address;
      
      const serverName = config.serverType === 'vbr'
        ? config.vbrServer?.name
        : null;
  
      const serverDescription = config.serverType === 'vbr'
        ? config.vbrServer?.description
        : config.manualServer?.description;
  
      let result = await this.db.run(`
        UPDATE scanner_config 
        SET 
          server_type = ?,
          server_address = ?,
          server_name = ?,
          server_description = ?,
          vbr_server_name = ?,
          vbr_server_description = ?,
          manual_server_address = ?, 
          manual_server_description = ?,
          username = ?,
          password = ?,
          is_connected = ?,
          last_connected = ?,
          trivy_version = ?,
          grype_version = ?,
          test_status = ?,
          last_test_date = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE username = ? AND server_address = ?
      `, [
        config.serverType,
        serverAddress,
        serverName,
        serverDescription,
        config.vbrServer?.name,
        config.vbrServer?.description,
        config.manualServer?.address,
        config.manualServer?.description,
        config.credentials.username,
        encryptedPassword,
        config.tested ? 1 : 0,
        config.tested ? new Date().toISOString() : null,
        config.scannerVersions?.trivy?.version,
        config.scannerVersions?.grype?.version,
        config.tested ? 1 : 0,
        config.lastTestDate,
        config.credentials.username,
        serverAddress
      ]);
  
      if (result.changes === 0) {
        result = await this.db.run(`
          INSERT INTO scanner_config (
            server_type,
            server_address,
            server_name,
            server_description,
            vbr_server_name,
            vbr_server_description,
            manual_server_address, 
            manual_server_description,
            username,
            password,
            is_connected,
            last_connected,
            trivy_version,
            grype_version,
            test_status,
            last_test_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          config.serverType,
          serverAddress,
          serverName,
          serverDescription,
          config.vbrServer?.name,
          config.vbrServer?.description,
          config.manualServer?.address,
          config.manualServer?.description,
          config.credentials.username,
          encryptedPassword,
          config.tested ? 1 : 0,
          config.tested ? new Date().toISOString() : null,
          config.scannerVersions?.trivy?.version,
          config.scannerVersions?.grype?.version,
          config.tested ? 1 : 0,
          config.lastTestDate
        ]);
      }
  
      if (config.tested && serverAddress) {
        try {
          const existingConnection = await this.db.get(`
            SELECT id FROM ssh_connections 
            WHERE server_address = ? AND username = ?
          `, [serverAddress, config.credentials.username]);
  
          if (existingConnection) {
            await this.db.run(`
              UPDATE ssh_connections 
              SET 
                password = ?,
                is_active = 1,
                connection_status = 'connected',
                last_connected = CURRENT_TIMESTAMP,
                trivy_installed = ?,
                grype_installed = ?
              WHERE server_address = ? AND username = ?
            `, [
              encryptedPassword,
              config.scannerVersions?.trivy?.installed ? 1 : 0,
              config.scannerVersions?.grype?.installed ? 1 : 0,
              serverAddress,
              config.credentials.username
            ]);
          } else {
            await this.db.run(`
              INSERT INTO ssh_connections (
                server_address,
                username,
                password,
                connection_status,
                last_connected,
                is_active,
                trivy_installed,
                grype_installed
              ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1, ?, ?)
            `, [
              serverAddress,
              config.credentials.username,
              encryptedPassword,
              'connected',
              config.scannerVersions?.trivy?.installed ? 1 : 0,
              config.scannerVersions?.grype?.installed ? 1 : 0
            ]);
          }
        } catch (sshError) {
          console.warn('Error updating SSH connections:', sshError);
        }
      }
  
      res.json({
        success: true,
        message: 'Configuration saved successfully',
        id: result.lastID,
        sshStatus: {
          connected: true,
          server: serverAddress,
          username: config.credentials.username
        }
      });
  
    } catch (error) {
      console.error('Error saving scanner config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getVulnerabilities(req: Request, res: Response) {
    try {
      const { 
        search, 
        severity, 
        vm, 
        package: packageName,
        fromDate, 
        toDate, 
        page = 1,
        limit = 25,
        sortBy = 'discovered',
        sortOrder = 'desc',
        scanner = 'all',
        status = 'all'
      } = req.query;
  
      console.log('Query parameters:', {
        search, severity, vm, packageName, fromDate, toDate, 
        page, limit, sortBy, sortOrder, scanner, status
      });
  
      let query = `
        SELECT 
        v.*,
    sr.vm_name,
    sr.scanner_type,
    v.first_discovered as discovered,  
    CASE
      WHEN v.status IS NULL OR v.status = '' THEN 'pending'
      ELSE v.status
    END as current_status,
    v.last_seen as last_seen  
  FROM vulnerabilities v
  INNER JOIN scan_results sr ON v.scan_id = sr.id
  WHERE 1=1
      `;
      
      const params: any[] = [];
  
      
      if (search) {
        query += `
          AND (
            v.cve_id LIKE ? OR 
            v.package_name LIKE ? OR 
            sr.vm_name LIKE ? OR
            v.description LIKE ?
          )
        `;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
  
      if (severity && severity !== 'all') {
        query += ` AND v.severity = ?`;
        params.push(severity);
      }
  
      if (vm) {
        query += ` AND sr.vm_name LIKE ?`;
        params.push(`%${vm}%`);
      }
  
      if (packageName) {
        query += ` AND v.package_name LIKE ?`;
        params.push(`%${packageName}%`);
      }
  
      if (fromDate) {
        query += ` AND sr.scan_date >= ?`;
        params.push(fromDate);
      }
  
      if (toDate) {
        query += ` AND sr.scan_date <= ?`;
        params.push(toDate);
      }
  
      
      if (scanner && scanner !== 'all') {
        query += ` AND UPPER(sr.scanner_type) = UPPER(?)`;
        params.push(scanner);
      }

      
      if (status && status !== 'all') {
        if (status === 'pending') {
          query += ` AND (v.status IS NULL OR v.status = '' OR v.status = 'pending')`;
        } else {
          query += ` AND v.status = ?`;
          params.push(status);
        }
        console.log('Applying status filter:', status);
      }
          
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
      const totalCount = await this.db.get(countQuery, params);
      console.log('Total count:', totalCount.total);
  
      
      query += ` 
        ORDER BY 
          CASE 
            WHEN ? = 'severity' THEN
              CASE v.severity
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MEDIUM' THEN 3
                WHEN 'LOW' THEN 4
                ELSE 5
              END
            WHEN ? = 'discovered' THEN sr.scan_date
            WHEN ? = 'lastSeen' THEN last_seen
            WHEN ? = 'packageName' THEN v.package_name
            WHEN ? = 'status' THEN current_status
            ELSE sr.scan_date
          END ${sortOrder}
      `;
      params.push(sortBy, sortBy, sortBy, sortBy, sortBy);
  
      
      const offset = (Number(page) - 1) * Number(limit);
      query += ` LIMIT ? OFFSET ?`;
      params.push(Number(limit), offset);
  
        
      const vulnerabilities = await this.db.all(query, params);
      console.log(`Found ${vulnerabilities.length} vulnerabilities`);
  
      
      const scannerDistribution = vulnerabilities.reduce((acc, curr) => {
        const scanner = curr.scanner_type || 'unknown';
        acc[scanner] = (acc[scanner] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      
      const statusDistribution = vulnerabilities.reduce((acc, curr) => {
        const status = curr.current_status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  
      
      const formattedVulnerabilities = vulnerabilities.map(row => ({
        id: row.id,
        scanId: row.scan_id,
        vmName: row.vm_name,
        cve: row.cve_id,
        severity: row.severity,
        packageName: row.package_name,
        installedVersion: row.installed_version,
        fixedVersion: row.fixed_version,
        description: row.description,
        referenceUrls: row.reference_urls,
        publishedDate: row.published_date,
        discovered: row.discovered,         
        lastSeen: row.last_seen,         
        status: row.status,
        scannerType: row.scanner_type
      }));
  
      return res.json({
        success: true,
        data: {
          vulnerabilities: formattedVulnerabilities,
          total: totalCount.total,
          page: Number(page),
          pageSize: Number(limit),
          scannerDistribution,
          statusDistribution
        }
      });
  
    } catch (error) {
      console.error('Error getting vulnerabilities:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async checkDatabase() {
    try {
      const tables = await this.db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('vulnerabilities', 'scan_results')
      `);
      
  
      const vulnsCount = await this.db.get('SELECT COUNT(*) as count FROM vulnerabilities');
      console.log('Total vulnerabilities in DB:', vulnsCount.count);
  
      const scanResultsCount = await this.db.get('SELECT COUNT(*) as count FROM scan_results');
      console.log('Total scan results in DB:', scanResultsCount.count);
  
      return { tables, vulnsCount: vulnsCount.count, scanResultsCount: scanResultsCount.count };
    } catch (error) {
      console.error('Error checking database:', error);
      throw error;
    }
  }
  
  async getVulnerabilityById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vulnerability = await this.db.get(`
        SELECT 
          v.*,
          sr.vm_name,
          sr.scan_date as discovered,
          (
            SELECT MAX(sr2.scan_date)
            FROM scan_results sr2
            INNER JOIN vulnerabilities v2 
            ON v2.scan_id = sr2.id
            WHERE v2.cve_id = v.cve_id 
            AND v2.package_name = v.package_name
          ) as last_seen
        FROM vulnerabilities v
        INNER JOIN scan_results sr ON v.scan_id = sr.id
        WHERE v.id = ?
      `, [id]);

      if (!vulnerability) {
        return res.status(404).json({
          success: false,
          error: 'Vulnerability not found'
        });
      }

      const formattedVulnerability: Vulnerability = {
        id: vulnerability.id,
        scanId: vulnerability.scan_id,
        vmName: vulnerability.vm_name,
        cve: vulnerability.cve_id,
        severity: vulnerability.severity,
        packageName: vulnerability.package_name,
        installedVersion: vulnerability.installed_version,
        fixedVersion: vulnerability.fixed_version,
        description: vulnerability.description,
        referenceUrls: vulnerability.reference_urls,
        publishedDate: vulnerability.published_date,
        discovered: vulnerability.discovered,
        lastSeen: vulnerability.last_seen,
        status: vulnerability.status
      };

      res.json(formattedVulnerability);

    } catch (error) {
      console.error('Error getting vulnerability by ID:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async exportVulnerabilities(req: Request, res: Response) {
    try {
      const { search, severity, vm, scanner } = req.query;
   
      
      let query = `
        SELECT 
          v.*,
          sr.vm_name,
          sr.scanner_type,
          datetime(v.first_discovered) as first_discovered,
          datetime(v.last_seen) as last_seen,
          CASE 
            WHEN v.status IS NULL OR v.status = '' THEN 'pending'
            ELSE v.status 
          END as current_status
        FROM vulnerabilities v
        INNER JOIN scan_results sr ON v.scan_id = sr.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
   
      if (search && search !== 'undefined') {
        query += `
          AND (
            v.cve_id LIKE ? OR 
            v.package_name LIKE ? OR 
            sr.vm_name LIKE ? OR
            v.description LIKE ?
          )
        `;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
   
      if (severity && severity !== 'all' && severity !== 'undefined') {
        query += ` AND v.severity = ?`;
        params.push(severity);
      }
   
      if (vm && vm !== 'undefined') {
        query += ` AND sr.vm_name LIKE ?`;
        params.push(`%${vm}%`);
      }
   
      if (scanner && scanner !== 'all' && scanner !== 'undefined') {
        query += ` AND sr.scanner_type = ?`;
        params.push(scanner);
      }
   
      query += `
        ORDER BY 
          CASE v.severity
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
            ELSE 5
          END,
          v.first_discovered ASC
      `;
   
      
   
      const vulnerabilities = await this.db.all(query, params);
      
   
      const formattedVulnerabilities = vulnerabilities.map(row => {
        const formatDateTime = (dateStr: string | null) => {
          if (!dateStr) return 'N/A';
          try {
            
            const date = new Date(dateStr + 'Z');  
            
            if (isNaN(date.getTime())) {
              console.warn('Invalid date string:', dateStr);
              return 'N/A';
            }
            
            
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: 'America/New_York',
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
        
            return formatter.format(date);
        
          } catch (error) {
            console.error('Error formatting date:', error);
            return 'N/A';
          }
        };
   
          
        return {
          id: row.id,
          scanId: row.scan_id,
          vmName: row.vm_name,
          cve: row.cve_id,
          severity: row.severity,
          packageName: row.package_name,
          installedVersion: row.installed_version,
          fixedVersion: row.fixed_version,
          description: row.description,
          referenceUrls: row.reference_urls,
          publishedDate: row.published_date,
          discovered: formatDateTime(row.first_discovered),
          lastSeen: formatDateTime(row.last_seen),
          status: row.current_status,
          scannerType: row.scanner_type
        };
      });
   
        
      return res.json({
        success: true,
        vulnerabilities: formattedVulnerabilities
      });
   
    } catch (error) {
      console.error('Error exporting vulnerabilities:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
   }
  
  async updateVulnerabilityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      const result = await this.db.run(`
        UPDATE vulnerabilities
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, id]);

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Vulnerability not found'
        });
      }

      res.json({
        success: true,
        message: 'Vulnerability status updated successfully'
      });

    } catch (error) {
      console.error('Error updating vulnerability status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  
  async updateSystemInfo(req: Request, res: Response) {
    try {
      const info: SystemCheckResult = req.body;
      
      await this.db.run(`
        UPDATE scanner_config 
        SET 
          trivy_version = ?,
          grype_version = ?
        WHERE id = (SELECT id FROM scanner_config ORDER BY id DESC LIMIT 1)
      `, [
        info.trivyVersion,
        info.grypeVersion
      ]);

      res.json({
        success: true,
        message: 'System info updated successfully'
      });

    } catch (error) {
      console.error('Error updating system info:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async saveScanResult(req: Request, res: Response) {
    let transaction: any = null;
    
    try {
      const scanResult: ScanResult = req.body;
      const notificationService = createNotificationService(this.db);
  
      if (!scanResult.vmName || !scanResult.scanner || !scanResult.status) {
        throw new Error('Missing required fields');
      }
      
      
      let cisaVulns = new Set<string>();
      try {
        const response = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
        const data = await response.json();
        cisaVulns = new Set(data.vulnerabilities.map((v: any) => v.cveID));
      } catch (error) {
        console.warn('Failed to fetch CISA KEV data:', error);
      }
  
      
      transaction = await this.db.exec('BEGIN TRANSACTION');
  
      
      const result = await this.db.run(`
        INSERT INTO scan_results (
          vm_name,
          scan_date,
          scanner_type,
          vulnerability_count,
          critical_count,
          high_count,
          medium_count,
          low_count,
          status,
          scan_duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        scanResult.vmName,
        scanResult.scanDate,
        scanResult.scanner,
        scanResult.vulnerabilities.length,
        scanResult.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        scanResult.vulnerabilities.filter(v => v.severity === 'HIGH').length,
        scanResult.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        scanResult.vulnerabilities.filter(v => v.severity === 'LOW').length,
        scanResult.status,
        scanResult.scanDuration
      ]);
  
      const scanId = result.lastID;
  
      
      const batchSize = 100;
      for (let i = 0; i < scanResult.vulnerabilities.length; i += batchSize) {
        const batch = scanResult.vulnerabilities.slice(i, i + batchSize);
        
        for (const vuln of batch) {
          
          await this.db.run(`
            INSERT OR REPLACE INTO vulnerabilities (
              scan_id,
              cve_id,
              severity,
              package_name,
              installed_version,
              fixed_version,
              description,
              reference_urls,
              published_date,
              vm_name,
              first_discovered,
              last_seen,
              in_cisa_kev
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
              COALESCE((SELECT first_discovered FROM vulnerabilities 
                WHERE cve_id = ? AND package_name = ? AND installed_version = ? AND vm_name = ?), ?),
              ?,
              ?
            )
          `, [
            scanId,
            vuln.cve,
            vuln.severity,
            vuln.packageName,
            vuln.installedVersion,
            vuln.fixedVersion,
            vuln.description,
            vuln.referenceUrls,
            vuln.publishedDate,
            vuln.vmName,
            
            vuln.cve,
            vuln.packageName,
            vuln.installedVersion,
            vuln.vmName,
            scanResult.scanDate,
            
            scanResult.scanDate,
            
            cisaVulns.has(vuln.cve) ? 1 : 0
          ]);
  
          
          const vulnRecord = await this.db.get(
            `SELECT id FROM vulnerabilities 
             WHERE cve_id = ? AND package_name = ? AND installed_version = ? AND vm_name = ?`,
            [vuln.cve, vuln.packageName, vuln.installedVersion, vuln.vmName]
          );
  
          if (vulnRecord) {
            
            await this.db.run(`
              INSERT INTO vulnerability_history (
                vulnerability_id,
                scan_id,
                scan_date,
                severity,
                fixed_version
              ) VALUES (?, ?, ?, ?, ?)
            `, [
              vulnRecord.id,
              scanId,
              scanResult.scanDate,
              vuln.severity,
              vuln.fixedVersion
            ]);
          }
        }
      }
  
      
      await this.db.exec('COMMIT');
  
      
      if (scanResult.status === 'COMPLETED') {
        try {
          await notificationService.addScanResult({
            ...scanResult,
            scanId
          });
        } catch (notificationError) {
          console.error('Failed to queue scan notification:', notificationError);
        }
      }
  
      res.json({
        success: true,
        scanId,
        message: 'Scan result saved successfully'
      });
  
    } catch (error) {
      
      if (transaction) {
        await this.db.exec('ROLLBACK');
      }
      
      console.error('Error saving scan result:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save scan result'
      });
    }
}

  async getDashboardStats(req: Request, res: Response) {
    try {
      
      const stats = await this.db.get(`
        SELECT 
          COUNT(DISTINCT s.vm_name) as scannedVMs,
          COUNT(v.id) as totalVulnerabilities,
          SUM(CASE WHEN v.severity = 'CRITICAL' THEN 1 ELSE 0 END) as criticalVulns,
          SUM(CASE WHEN v.severity = 'HIGH' THEN 1 ELSE 0 END) as highVulns,
          SUM(CASE WHEN v.severity = 'MEDIUM' THEN 1 ELSE 0 END) as mediumVulns,
          SUM(CASE WHEN v.severity = 'LOW' THEN 1 ELSE 0 END) as lowVulns,
          MAX(s.scan_date) as lastScanDate
        FROM scan_results s
        LEFT JOIN vulnerabilities v ON s.id = v.scan_id
        WHERE s.status = 'COMPLETED'
      `);

      
      const activeScans = await this.db.get(`
        SELECT COUNT(*) as count
        FROM scan_results
        WHERE status = 'IN_PROGRESS'
      `);

      
      const scannerConfig = await this.db.get(`
        SELECT 
          trivy_installed,
          grype_installed
        FROM system_requirements
        ORDER BY last_check_date DESC
        LIMIT 1
      `);

      res.json({
        success: true,
        stats: {
          ...stats,
          scannedVMs: stats?.scannedVMs || 0,
          totalVulnerabilities: stats?.totalVulnerabilities || 0,
          criticalVulns: stats?.criticalVulns || 0,
          highVulns: stats?.highVulns || 0,
          mediumVulns: stats?.mediumVulns || 0,
          lowVulns: stats?.lowVulns || 0,
          activeScans: activeScans?.count || 0,
          scannerStatus: {
            trivy: scannerConfig?.trivy_installed || false,
            grype: scannerConfig?.grype_installed || false
          }
        }
      });

    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getMostVulnerableServers(req: Request, res: Response) {
    try {
      const servers = await this.db.all(`
        WITH VulnCounts AS (
          SELECT 
            s.vm_name,
            v.severity,
            COUNT(*) as count
          FROM scan_results s
          JOIN vulnerabilities v ON s.id = v.scan_id
          WHERE s.status = 'COMPLETED'
          GROUP BY s.vm_name, v.severity
        )
        SELECT 
          vm_name as name,
          SUM(count) as total,
          MAX(CASE WHEN severity = 'CRITICAL' THEN count ELSE 0 END) as critical,
          MAX(CASE WHEN severity = 'HIGH' THEN count ELSE 0 END) as high,
          MAX(CASE WHEN severity = 'MEDIUM' THEN count ELSE 0 END) as medium,
          MAX(CASE WHEN severity = 'LOW' THEN count ELSE 0 END) as low
        FROM VulnCounts
        GROUP BY vm_name
        ORDER BY total DESC
        LIMIT 5
      `);

      const formattedServers = servers.map(server => ({
        name: server.name,
        total: server.total,
        vulnerabilities: {
          critical: server.critical,
          high: server.high,
          medium: server.medium,
          low: server.low
        }
      }));

      res.json({
        success: true,
        servers: formattedServers
      });

    } catch (error) {
      console.error('Error getting most vulnerable servers:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getVulnerabilityTrends(req: Request, res: Response) {
    try {
      const { start, end } = req.query;
      let dateFilter = '';
      const params: any[] = [];

      if (start && end) {
        dateFilter = 'WHERE date(s.scan_date) BETWEEN date(?) AND date(?)';
        params.push(start, end);
      }

      const trends = await this.db.all(`
        WITH RECURSIVE dates(date) AS (
          SELECT date(COALESCE(?, (SELECT MIN(date(scan_date)) FROM scan_results)))
          UNION ALL
          SELECT date(date, '+1 day')
          FROM dates
          WHERE date < date(COALESCE(?, date('now')))
        ),
        daily_counts AS (
          SELECT 
            date(s.scan_date) as date,
            v.severity,
            COUNT(*) as count
          FROM scan_results s
          JOIN vulnerabilities v ON s.id = v.scan_id
          ${dateFilter}
          GROUP BY date(s.scan_date), v.severity
        )
        SELECT 
          dates.date,
          COALESCE(SUM(daily_counts.count), 0) as vulnerabilities,
          json_object(
            'critical', COALESCE(SUM(CASE WHEN severity = 'CRITICAL' THEN count ELSE 0 END), 0),
            'high', COALESCE(SUM(CASE WHEN severity = 'HIGH' THEN count ELSE 0 END), 0),
            'medium', COALESCE(SUM(CASE WHEN severity = 'MEDIUM' THEN count ELSE 0 END), 0),
            'low', COALESCE(SUM(CASE WHEN severity = 'LOW' THEN count ELSE 0 END), 0)
          ) as bySeverity
        FROM dates
        LEFT JOIN daily_counts ON dates.date = daily_counts.date
        GROUP BY dates.date
        ORDER BY dates.date
      `, params);

      const formattedTrends = trends.map(trend => ({
        ...trend,
        bySeverity: JSON.parse(trend.bySeverity)
      }));

      res.json({
        success: true,
        trends: formattedTrends
      });

    } catch (error) {
      console.error('Error getting vulnerability trends:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }


  
  async getScanDetails(req: Request, res: Response) {
    try {
      const { scanId } = req.params;

      
      const scanInfo = await this.db.get(`
        SELECT 
          sr.*,
          COUNT(v.id) as total_vulnerabilities,
          SUM(CASE WHEN v.severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
          SUM(CASE WHEN v.severity = 'HIGH' THEN 1 ELSE 0 END) as high_count,
          SUM(CASE WHEN v.severity = 'MEDIUM' THEN 1 ELSE 0 END) as medium_count,
          SUM(CASE WHEN v.severity = 'LOW' THEN 1 ELSE 0 END) as low_count,
          COUNT(DISTINCT v.package_name) as affected_packages
        FROM scan_results sr
        LEFT JOIN vulnerabilities v ON v.scan_id = sr.id
        WHERE sr.id = ?
        GROUP BY sr.id
      `, [scanId]);

      if (!scanInfo) {
        return res.status(404).json({
          success: false,
          error: 'Scan not found'
        });
      }

      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const vulnerabilities = await this.db.all(`
        SELECT 
          v.*,
          COUNT(*) OVER() as total_count
        FROM vulnerabilities v
        WHERE v.scan_id = ?
        ORDER BY 
          CASE v.severity 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            WHEN 'LOW' THEN 4 
            ELSE 5 
          END,
          v.cve_id
        LIMIT ? OFFSET ?
      `, [scanId, limit, offset]);

      const totalCount = vulnerabilities[0]?.total_count || 0;

      res.json({
        success: true,
        data: {
          scanInfo,
          vulnerabilities,
          pagination: {
            page,
            pageSize: limit,
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error getting scan details:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  
  async getScanHistory(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const { vmName, scannerType, status, fromDate, toDate } = req.query;

      
      const conditions = ['1=1'];
      const params: any[] = [];

      if (vmName) {
        conditions.push('vm_name LIKE ?');
        params.push(`%${vmName}%`);
      }

      if (scannerType) {
        conditions.push('scanner_type = ?');
        params.push(scannerType);
      }

      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }

      if (fromDate) {
        conditions.push('scan_date >= ?');
        params.push(fromDate);
      }

      if (toDate) {
        conditions.push('scan_date <= ?');
        params.push(toDate);
      }

      const whereClause = conditions.join(' AND ');

      
      const scans = await this.db.all(`
        SELECT 
          sr.*,
          COUNT(*) OVER() as total_count,
          COUNT(v.id) as vulnerability_count,
          SUM(CASE WHEN v.severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
          SUM(CASE WHEN v.severity = 'HIGH' THEN 1 ELSE 0 END) as high_count,
          SUM(CASE WHEN v.severity = 'MEDIUM' THEN 1 ELSE 0 END) as medium_count,
          SUM(CASE WHEN v.severity = 'LOW' THEN 1 ELSE 0 END) as low_count
        FROM scan_results sr
        LEFT JOIN vulnerabilities v ON v.scan_id = sr.id
        WHERE ${whereClause}
        GROUP BY sr.id
        ORDER BY sr.scan_date DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      const totalCount = scans[0]?.total_count || 0;

      res.json({
        success: true,
        data: {
          scans,
          pagination: {
            page,
            pageSize: limit,
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error getting scan history:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}