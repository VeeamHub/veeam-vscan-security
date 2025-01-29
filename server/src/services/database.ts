import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function initializeDB() {
  const db = await open({
    filename: './data/vscan-scanner.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS linux_scanner_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_type TEXT NOT NULL,
      server_name TEXT NOT NULL,
      server_address TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      description TEXT,
      is_connected BOOLEAN DEFAULT 0,
      last_connected DATETIME,
      trivy_version TEXT,
      grype_version TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}