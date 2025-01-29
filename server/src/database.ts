import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import { mkdir, access, constants } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function dropTables(db: Database): Promise<void> {
  const tables = [
    'vbr_config',
    'ssh_connections',
    'system_requirements',
    'scan_results',
    'vulnerabilities',
    'schema_migrations',
    'scanner_config',
    'mount_points',
    'server_mount_history'
  ];
  
  for (const table of tables) {
    await db.exec(`DROP TABLE IF EXISTS ${table}`);
  }
}

async function createTables(db: Database): Promise<void> {
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vbr_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT,
      password TEXT,
      last_connected DATETIME,
      remote_version TEXT,
      connection_status TEXT DEFAULT 'disconnected',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ssh_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_address TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT,
      hostname TEXT,
      os_info TEXT,
      connection_status TEXT DEFAULT 'disconnected',
      connection_type TEXT CHECK(connection_type IN ('vbr', 'manual')),
      last_connected DATETIME,
      is_active BOOLEAN DEFAULT 0,
      trivy_installed BOOLEAN DEFAULT 0,
      trivy_version TEXT,
      grype_installed BOOLEAN DEFAULT 0,
      grype_version TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(server_address, username)
    );
  `);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scanner_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_type TEXT NOT NULL,
      server_address TEXT,
      server_name TEXT,
      server_description TEXT,
      vbr_server_name TEXT,
      vbr_server_description TEXT,
      manual_server_address TEXT, 
      manual_server_description TEXT,
      username TEXT NOT NULL,
      password TEXT,
      is_connected BOOLEAN DEFAULT 0,
      last_connected DATETIME,
      trivy_version TEXT,
      grype_version TEXT,
      test_status BOOLEAN DEFAULT 0,
      last_test_date DATETIME,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS system_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER,
      trivy_installed BOOLEAN DEFAULT 0,
      trivy_version TEXT,
      grype_installed BOOLEAN DEFAULT 0,
      grype_version TEXT,
      os_type TEXT,
      os_version TEXT,
      os_family TEXT,
      last_check_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      check_status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES ssh_connections(id)
    );
  `);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vm_name TEXT NOT NULL,
      scan_date DATETIME NOT NULL,
      scanner_type TEXT NOT NULL,
      vulnerability_count INTEGER DEFAULT 0,
      critical_count INTEGER DEFAULT 0,
      high_count INTEGER DEFAULT 0,
      medium_count INTEGER DEFAULT 0,
      low_count INTEGER DEFAULT 0,
      scan_duration INTEGER,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vulnerabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    in_cisa_kev BOOLEAN DEFAULT 0,
    scan_id INTEGER NOT NULL,
    cve_id TEXT NOT NULL,
    severity TEXT NOT NULL,
    package_name TEXT NOT NULL,
    installed_version TEXT NOT NULL,
    fixed_version TEXT,
    description TEXT,
    reference_urls TEXT,
    published_date DATETIME,
    vm_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'confirmed', 'false_positive', 'fixed', 'wont_fix')),
    first_discovered DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scan_results(id) ON DELETE CASCADE,
    UNIQUE (cve_id, package_name, installed_version, vm_name) ON CONFLICT REPLACE
  );

`);

await db.exec(`
 CREATE TABLE IF NOT EXISTS vulnerability_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vulnerability_id INTEGER NOT NULL,
    scan_id INTEGER NOT NULL,
    scan_date DATETIME NOT NULL,
    severity TEXT NOT NULL,
    fixed_version TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vulnerability_id) REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    FOREIGN KEY (scan_id) REFERENCES scan_results(id) ON DELETE CASCADE
  );
`);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS mount_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER,
      device TEXT NOT NULL,
      mount_path TEXT NOT NULL,
      fs_type TEXT,
      mount_options TEXT,
      mounted_at DATETIME,
      unmounted_at DATETIME,
      status TEXT CHECK(status IN ('mounted', 'unmounted', 'failed')),
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES scanner_config(id)
    );
  `);

  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS server_mount_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER,
      mount_path TEXT NOT NULL,
      mount_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      unmount_date DATETIME,
      status TEXT CHECK(status IN ('mounted', 'unmounting', 'unmounted', 'failed')),
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES scanner_config(id)
    );
  `);

  
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vbr_config_server ON vbr_config(server);
    CREATE INDEX IF NOT EXISTS idx_vbr_config_status ON vbr_config(connection_status);
    
    CREATE INDEX IF NOT EXISTS idx_ssh_connections_server ON ssh_connections(server_address, username);
    CREATE INDEX IF NOT EXISTS idx_ssh_connections_status ON ssh_connections(connection_status);
    
    CREATE INDEX IF NOT EXISTS idx_scanner_config_server ON scanner_config(server_address);
    CREATE INDEX IF NOT EXISTS idx_scanner_config_type ON scanner_config(server_type);
    
    CREATE INDEX IF NOT EXISTS idx_scan_results_vm ON scan_results(vm_name);
    CREATE INDEX IF NOT EXISTS idx_scan_results_date ON scan_results(scan_date);
    CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status);
    
    CREATE INDEX IF NOT EXISTS idx_vuln_composite ON vulnerabilities(cve_id, package_name, installed_version, vm_name);
    CREATE INDEX IF NOT EXISTS idx_vuln_scan ON vulnerabilities(scan_id);
    CREATE INDEX IF NOT EXISTS idx_vuln_vm ON vulnerabilities(vm_name);
    CREATE INDEX IF NOT EXISTS idx_vuln_severity ON vulnerabilities(severity);
    CREATE INDEX IF NOT EXISTS idx_vuln_status ON vulnerabilities(status);
    CREATE INDEX IF NOT EXISTS idx_vuln_dates ON vulnerabilities(first_discovered, last_seen);
    CREATE INDEX IF NOT EXISTS idx_history_vuln ON vulnerability_history(vulnerability_id);
    CREATE INDEX IF NOT EXISTS idx_history_scan ON vulnerability_history(scan_id);
    CREATE INDEX IF NOT EXISTS idx_history_date ON vulnerability_history(scan_date);
    
    CREATE INDEX IF NOT EXISTS idx_mount_points_server ON mount_points(server_id);
    CREATE INDEX IF NOT EXISTS idx_mount_points_status ON mount_points(status);
    
    CREATE INDEX IF NOT EXISTS idx_mount_history_server ON server_mount_history(server_id);
    CREATE INDEX IF NOT EXISTS idx_mount_history_status ON server_mount_history(status);
  `);
}

async function migrateDatabase(db: Database) {
  try {
    
    const vulnInfo = await db.all("PRAGMA table_info(vulnerabilities)");
    
    if (!vulnInfo.some(col => col.name === 'vm_name')) {
      console.log('Adding vm_name column to vulnerabilities table');
      await db.exec(`
        ALTER TABLE vulnerabilities 
        ADD COLUMN vm_name TEXT NOT NULL DEFAULT '';
      `);
      
      
      await db.exec(`
        UPDATE vulnerabilities 
        SET vm_name = (
          SELECT vm_name 
          FROM scan_results 
          WHERE scan_results.id = vulnerabilities.scan_id
        )
        WHERE vm_name = '';
      `);
    }

    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON vulnerabilities(status);
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
    `);

    
    if (!vulnInfo.some(col => col.name === 'status')) {
      await db.exec(`
        ALTER TABLE vulnerabilities
        ADD COLUMN status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_review', 'confirmed', 'false_positive', 'fixed', 'wont_fix'));
      `);
    }

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

export async function initializeDB(): Promise<Database> {
  try {
    
    const isDev = process.env.NODE_ENV === 'development';
    let dbPath: string;

    if (isDev) {
      
      dbPath = path.resolve(process.cwd(), 'data', 'vscan-scanner.db');
      console.log('Development mode: Using local database at:', dbPath);
    } else {
      
      const appPath = process.env.DATA_PATH || path.resolve(process.cwd(), 'data');
      dbPath = path.join(appPath, 'vscan-scanner.db');
      console.log('Production mode: Using database at:', dbPath);
    }

    
    const dataDir = path.dirname(dbPath);
    await mkdir(dataDir, { recursive: true });

    
    try {
      await access(dataDir, constants.W_OK);
    } catch (error) {
      console.error('Error: No write permission to database directory:', dataDir);
      throw new Error('No write permission to database directory');
    }

    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    
    await db.exec('PRAGMA foreign_keys = ON');
    await db.exec('PRAGMA journal_mode = WAL');

    
    await createTables(db);

    
    await migrateDatabase(db);

    
    const needsOptimization = await db.get('PRAGMA integrity_check');
    if (needsOptimization.integrity_check !== 'ok') {
      console.log('Running database optimization...');
      await optimizeDB(db);
    }

    console.log('Database initialized successfully at:', dbPath);
    return db;

  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export async function closeDB(db: Database): Promise<void> {
  try {
    
    await db.exec('PRAGMA wal_checkpoint(FULL)');
    await db.close();
    console.log('Database connection closed successfully');
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
}

export async function resetDB(db: Database): Promise<void> {
  try {
    console.log('Starting database reset...');
    await dropTables(db);
    await createTables(db);
    console.log('Database reset completed successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

export async function checkDBIntegrity(db: Database): Promise<boolean> {
  try {
    const result = await db.get('PRAGMA integrity_check');
    return result.integrity_check === 'ok';
  } catch (error) {
    console.error('Database integrity check failed:', error);
    return false;
  }
}

export async function optimizeDB(db: Database): Promise<void> {
  try {
    await db.exec('PRAGMA optimize');
    await db.exec('VACUUM');
    console.log('Database optimization completed');
  } catch (error) {
    console.error('Error optimizing database:', error);
    throw error;
  }
}