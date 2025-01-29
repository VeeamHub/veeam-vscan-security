import express from 'express';
import cors from 'cors';
import { PowerShell } from 'node-powershell';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());


const dbPromise = open({
  filename: path.join(__dirname, 'vscan-scanner.db'),
  driver: sqlite3.Database
});


let psInstance: PowerShell | null = null;
let currentSession: {
  server: string;
  connected: boolean;
  lastConnection: Date;
} | null = null;


async function initializeDB() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vbr_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      last_connected DATETIME
    )
  `);
}

initializeDB();


app.post('/api/vbr/connect', async (req, res) => {
  const { server, port, username, password } = req.body;

  try {
    if (psInstance) {
      await psInstance.dispose();
    }

    psInstance = new PowerShell({
      debug: false,
      executableOptions: {
        '-NoProfile': true,
        '-NonInteractive': true,
        '-ExecutionPolicy': 'Bypass'
      }
    });

    const command = `
      $SecurePassword = ConvertTo-SecureString '${password}' -AsPlainText -Force
      $Credential = New-Object System.Management.Automation.PSCredential ('${username}', $SecurePassword)
      Connect-VBRServer -Server '${server}' -Port ${port} -Credential $Credential
    `;

    await psInstance.invoke(command);

    
    const sessionCheck = await psInstance.invoke('Get-VBRServerSession');
    if (sessionCheck) {
      currentSession = {
        server,
        connected: true,
        lastConnection: new Date()
      };

      
      const db = await dbPromise;
      await db.run(
        'INSERT INTO vbr_config (server, port, username, password, last_connected) VALUES (?, ?, ?, ?, ?)',
        [server, port, username, password, new Date().toISOString()]
      );

      res.json({ success: true, session: currentSession });
    } else {
      throw new Error('Failed to establish VBR session');
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.post('/api/vbr/disconnect', async (req, res) => {
  try {
    if (psInstance && currentSession?.connected) {
      await psInstance.invoke('Disconnect-VBRServer');
      await psInstance.dispose();
      psInstance = null;
      currentSession = null;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.get('/api/vbr/status', (req, res) => {
  res.json({ 
    connected: !!currentSession?.connected,
    session: currentSession 
  });
});

app.post('/api/vbr/execute', async (req, res) => {
  const { command } = req.body;
  
  if (!psInstance || !currentSession?.connected) {
    return res.status(400).json({ 
      success: false, 
      error: 'No active VBR session' 
    });
  }

  try {
    const result = await psInstance.invoke(command);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});