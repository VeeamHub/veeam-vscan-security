import { BrowserWindow, screen } from 'electron';
import path from 'path';
import fs from 'fs';


export class WindowManager {
  private static instance: WindowManager;
  private mainWindow: BrowserWindow | null = null;
  private splashWindow: BrowserWindow | null = null;
  private isDevMode: boolean;

  private constructor() {
    this.isDevMode = process.env.NODE_ENV !== 'production';
  }

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  private getIconPath(): string | undefined {
    try {
      const rootPath = process.cwd();
      const iconPath = path.join(rootPath, 'resources', 'icons', 'icon.ico');
      
      if (fs.existsSync(iconPath)) {
        console.log('Icon found at:', iconPath);
        return iconPath;
      }
      console.warn(`Icon not found at ${iconPath}`);
      return undefined;
    } catch (error) {
      console.error('Error getting icon path:', error);
      return undefined;
    }
  }

  public async createMainWindow(): Promise<BrowserWindow> {
    try {
      console.log('Creating main window');
      console.log('Creating main window in', this.isDevMode ? 'development' : 'production', 'mode');
      
      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      const windowWidth = Math.min(1280, width * 0.8);
      const windowHeight = Math.min(800, height * 0.8);

      const windowConfig: Electron.BrowserWindowConstructorOptions = {
        width: windowWidth,
        height: windowHeight,
        show: false,
        backgroundColor: '#ffffff',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, '../preload/index.ts')
        }
      };

      
      const iconPath = this.getIconPath();
      if (iconPath) {
        windowConfig.icon = iconPath;
        console.log('Using icon from:', iconPath);
      }

      this.mainWindow = new BrowserWindow(windowConfig);
      this.mainWindow.center();

      if (this.isDevMode) {
        console.log('Loading development URL: http://localhost:5173');
        try {
          await this.mainWindow.loadURL('http://localhost:5173');
          this.mainWindow.webContents.openDevTools();
          console.log('Development URL loaded successfully');
        } catch (error) {
          console.error('Error loading development URL:', error);
          throw error;
        }
      } else {
        const prodPath = path.join(__dirname, '../../dist/index.html');
        console.log('Loading production file:', prodPath);
        await this.mainWindow.loadFile(prodPath);
      }

      return this.mainWindow;
    } catch (error) {
      console.log(`Error creating main window: ${error}`);
      throw error;
    }
  }

  public async createSplashWindow(): Promise<BrowserWindow> {
    try {
      console.log('Creating splash window');
      
      const splashConfig: Electron.BrowserWindowConstructorOptions = {
        width: 440,
        height: 320,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        resizable: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      };

      this.splashWindow = new BrowserWindow(splashConfig);

      const rootPath = process.cwd();
      const splashPath = path.join(rootPath, 'resources', 'splash', 'splash.html');
      console.log('Loading splash screen from:', splashPath);
      
      await this.splashWindow.loadFile(splashPath);
      this.splashWindow.center();

      return this.splashWindow;
    } catch (error) {
      console.log(`Error creating splash window: ${error}`);
      throw error;
    }
  }

  public async showMainWindow(): Promise<void> {
    if (!this.mainWindow) {
      await this.createMainWindow();
    }

    this.mainWindow?.show();
    this.mainWindow?.focus();
    
    if (this.splashWindow) {
      this.splashWindow.close();
      this.splashWindow = null;
    }
  }

  public destroyWindows(): void {
    if (this.splashWindow) {
      this.splashWindow.close();
      this.splashWindow = null;
    }

    if (this.mainWindow) {
      this.mainWindow.close();
      this.mainWindow = null;
    }
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public focusMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
    }
  }
}