import { Menu, MenuItemConstructorOptions, app, shell, dialog } from 'electron';
import { WindowManager } from './window-manager.js';
import path from 'path';

export class MenuManager {
  private static instance: MenuManager;
  private windowManager: WindowManager;


  private constructor() {
    this.windowManager = WindowManager.getInstance();
    
  }

  public static getInstance(): MenuManager {
    if (!MenuManager.instance) {
      MenuManager.instance = new MenuManager();
    }
    return MenuManager.instance;
  }

  public createMenu(): void {
    try {
      console.log('Creating application menu');

      const template: MenuItemConstructorOptions[] = [
        {
          label: '&File',
          submenu: [
            {
              label: 'E&xit',
              click: () => {
                console.log('Application exit requested from menu');
                app.quit();
              }
            }
          ]
        },
        {
          label: '&View',
          submenu: [
            {
              label: 'Zoom In',
              role: 'zoomIn',
              accelerator: 'CommandOrControl+Plus'
            },
            {
              label: 'Zoom Out',
              role: 'zoomOut',
              accelerator: 'CommandOrControl+-'
            },
            {
              label: 'Reset Zoom',
              role: 'resetZoom',
              accelerator: 'CommandOrControl+0'
            }
          ]
        },
        {
          label: '&Help',
          submenu: [
            {
              label: 'Documentation',
              submenu: [
                {
                  label: 'vScan Documentation',
                  click: async () => {
                    await shell.openExternal('https://github.com/VeeamHub/veeam-vscan-security');
                  }
                },
                {
                  label: 'Trivy Documentation',
                  click: async () => {
                    await shell.openExternal('https://github.com/aquasecurity/trivy');
                  }
                },
                {
                  label: 'Grype Documentation',
                  click: async () => {
                    await shell.openExternal('https://github.com/anchore/grype');
                  }
                }
              ]
            },
            { type: 'separator' },
            {
              label: 'View Logs',
              click: async () => {
                const logsPath = path.join(app.getPath('userData'), 'logs');
                await shell.openPath(logsPath);
              }
            },
            { type: 'separator' },
            {
              label: 'About',
              click: () => {
                this.showAboutDialog();
              }
            }
          ]
        }
      ];

      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
      console.log('Application menu created successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Error creating menu: ${errorMessage}`);
    }
  }

  private showAboutDialog(): void {
    const mainWindow = this.windowManager.getMainWindow();
    
    dialog.showMessageBox({
      type: 'info',
      title: 'About vScan Security Scanner',
      message: 'vScan Security Scanner',
      detail: `Version: ${app.getVersion()}\n` +
              'A Open Source Security Vulnerability Scanner for Veeam Backups\n\n' +
              'Created by Marco Escobar\n\n' +
              '24xsiempre.com | 2025\n\n',
      buttons: ['OK'],
      noLink: true,
      ...(mainWindow ? { parent: mainWindow } : {})
    });
  }
}