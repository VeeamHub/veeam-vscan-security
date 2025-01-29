import * as electron from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import log from 'electron-log';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { MenuManager } from './menu-manager.js';

const { app, BrowserWindow, protocol, net, session, shell } = electron;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


log.transports.file.level = 'info';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.info('Application starting...');
log.info('Log location:', log.transports.file.getFile().path);


let mainWindow: electron.BrowserWindow | null = null;
let splashScreen: electron.BrowserWindow | null = null;
let backendProcess: any = null;
let menuManager: MenuManager;

const isDev = process.env.NODE_ENV === 'development';
log.info('Running in', isDev ? 'development' : 'production', 'mode');


protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      allowServiceWorkers: true,
      bypassCSP: false
    }
  }
]);

function setupRequestHandling() {

  session.defaultSession.webRequest.onBeforeRequest({
    urls: ['http://*/*', 'https://*/*', 'file://*/*']
  }, (details, callback) => {
    try {
      const url = new URL(details.url);
      
      
      if (url.hostname === 'localhost' && url.port === '3001') {
        callback({});
        return;
      }
      
      
      if (url.pathname.includes('/api/')) {
        const apiPath = url.pathname.substring(url.pathname.indexOf('/api/'));
        const newUrl = `http://localhost:3001${apiPath}${url.search}`;
        
        callback({ redirectURL: newUrl });
        return;
      }

      callback({});
    } catch (error) {
      log.error('Error handling request:', error);
      callback({});
    }
  });
}

async function createSplashScreen() {
  try {
    let splashPath;
    if (isDev) {
      splashPath = path.join(process.cwd(), 'resources', 'splash', 'splash.html');
    } else {
      splashPath = path.join(process.resourcesPath, 'splash', 'splash.html');
    }

    log.info('Loading splash screen from:', splashPath);
    log.info('Splash exists:', fs.existsSync(splashPath));

    if (!fs.existsSync(splashPath)) {
      throw new Error(`Splash screen not found at ${splashPath}`);
    }

    splashScreen = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      transparent: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await splashScreen.loadFile(splashPath);
    log.info('Splash screen loaded successfully');
    splashScreen.show();

    
    await initializeApplication();
  } catch (error) {
    log.error('Error creating splash screen:', error);
    await initializeApplication();
  }
}

async function startBackend(): Promise<boolean> {
  try {
    if (isDev) {
      return true;
    }

    const serverPath = path.join(process.resourcesPath, 'server', 'dist', 'index.js');
    const nodePath = path.join(process.resourcesPath, 'node', 'node.exe');

    if (!fs.existsSync(serverPath)) {
      throw new Error(`Backend not found at ${serverPath}`);
    }

    if (!fs.existsSync(nodePath)) {
      throw new Error(`Node.js not found at ${nodePath}`);
    }

    backendProcess = spawn(nodePath, [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3001',
        ELECTRON_RUN_AS_NODE: '1',
        DATA_PATH: app.getPath('userData'),
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'vscan-security-scanner-default-key-2024'
      },
      windowsHide: true
    });

    backendProcess.stdout.on('data', (data: Buffer) => {
      log.info('Backend:', data.toString().trim());
    });

    backendProcess.stderr.on('data', (data: Buffer) => {
      log.error('Backend Error:', data.toString().trim());
    });

    backendProcess.on('error', (err: Error) => {
      log.error('Backend process error:', err);
    });

    backendProcess.on('exit', (code: number, signal: string) => {
      log.info(`Backend process exited with code ${code} and signal ${signal}`);
      if (code !== 0 && !signal) {
        log.error('Backend process crashed, attempting to restart...');
        startBackend().catch(error => {
          log.error('Failed to restart backend:', error);
        });
      }
    });

    backendProcess.on('close', (code: number, signal: string) => {
      log.info(`Backend process closed with code ${code} and signal ${signal}`);
    });

    return await new Promise((resolve, reject) => {
      let started = false;
      const timeout = setTimeout(() => {
        if (!started) {
          reject(new Error('Backend startup timeout'));
        }
      }, 30000);

      backendProcess.stdout.on('data', (data: Buffer) => {
        if (data.toString().includes('Server running on port 3001')) {
          started = true;
          clearTimeout(timeout);
          resolve(true);
        }
      });
    });

  } catch (error) {
    log.error('Failed to start backend:', error);
    throw error;
  }
}

async function waitForBackend(maxAttempts = 10): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkServer = () => {
      attempts++;
      log.info(`Checking backend health (attempt ${attempts}/${maxAttempts})`);

      const request = net.request({
        method: 'GET',
        protocol: 'http:',
        hostname: 'localhost',
        port: 3001,
        path: '/api/health'
      });

      const timeoutId = setTimeout(() => {
        request.abort();
        retry();
      }, 2000);

      request.on('response', (response) => {
        clearTimeout(timeoutId);
        
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode === 200) {
            try {
              const healthCheck = JSON.parse(data);
              if (healthCheck.status === 'ok') {
                log.info('Backend health check passed');
                resolve();
                return;
              }
            } catch (e) {
              log.error('Error parsing health check response:', e);
            }
          }
          retry();
        });
      });

      request.on('error', () => {
        clearTimeout(timeoutId);
        retry();
      });

      request.end();
    };

    const retry = () => {
      if (attempts >= maxAttempts) {
        reject(new Error('Backend health check failed'));
      } else {
        setTimeout(checkServer, 1000);
      }
    };

    checkServer();
  });
}

async function createMainWindow() {
  if (mainWindow) return;

  try {
    const preloadPath = isDev
      ? path.join(__dirname, '..', 'preload', 'index.js')
      : path.join(app.getAppPath(), 'dist-electron', 'preload', 'index.js');

    log.info('Preload path:', preloadPath);

    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        webSecurity: true
      }
    });

    
    setupRequestHandling();

    if (isDev) {
      await mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
      await mainWindow.loadFile(indexPath);
    }

    
    mainWindow.webContents.on('did-fail-load', () => {
      log.warn('Page failed to load, attempting reload...');
      if (mainWindow) {
        const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
        mainWindow.loadFile(indexPath).catch(error => {
          log.error('Error reloading page:', error);
        });
      }
    });

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show();
      if (splashScreen && !splashScreen.isDestroyed()) {
        splashScreen.close();
        splashScreen = null;
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
      if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
      }
    });

  } catch (error) {
    log.error('Error creating main window:', error);
    throw error;
  }
}

async function initializeApplication() {
  try {
    if (!isDev) {
      log.info('Starting backend service...');
      const backendStarted = await startBackend();
      if (!backendStarted) {
        throw new Error('Failed to start backend');
      }
      await waitForBackend();
    }

    log.info('Creating main window...');
    await createMainWindow();
  } catch (error) {
    log.error('Failed to initialize application:', error);
    if (splashScreen && !splashScreen.isDestroyed()) {
      splashScreen.close();
    }
    showErrorWindow('Application Error', 
      'Failed to start the application. Please try again or contact support.');
  }
}

function showErrorWindow(title: string, message: string) {
  const errorWindow = new BrowserWindow({
    width: 400,
    height: 200,
    frame: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          margin: 0;
          text-align: center;
        }
        .error-message {
          margin-top: 20px;
          color: #666;
        }
        .button {
          margin-top: 20px;
          padding: 8px 16px;
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .button:hover {
          background-color: #bb2d3b;
        }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <p class="error-message">${message}</p>
      <button class="button" onclick="window.close()">Close</button>
    </body>
    </html>
  `;

  errorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
}

app.whenReady().then(async () => {
  try {
    log.info('App ready event received');
       
    menuManager = MenuManager.getInstance();
    menuManager.createMenu();
     
    await createSplashScreen();
  } catch (error) {
    log.error('Failed to initialize app:', error);
    showErrorWindow('Startup Error', 
      'Failed to start the application. Please try again or contact support.');
  }
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) {
      backendProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createSplashScreen();
  }
});


app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});


process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  log.error('Unhandled rejection:', error);
});

process.on('exit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});