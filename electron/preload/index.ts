import { contextBridge, ipcRenderer } from 'electron';


const API_BASE = 'http://localhost:3001/api';

async function makeRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  try {
    
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${API_BASE}${normalizedPath}`;

    console.log('Making request to:', url);

    const options: RequestInit = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: response.statusText || 'Unknown error' 
      }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API ${method} request failed:`, {
      path,
      error,
      body: body ? JSON.stringify(body) : undefined
    });
    throw error;
  }
}

contextBridge.exposeInMainWorld('electron', {
  api: {
    get: <T>(url: string) => makeRequest<T>('GET', url),
    post: <T>(url: string, data: unknown) => makeRequest<T>('POST', url, data),
    put: <T>(url: string, data: unknown) => makeRequest<T>('PUT', url, data),
    delete: <T>(url: string) => makeRequest<T>('DELETE', url)
  },

  fs: {
    readFile: async (filePath: string, options?: { encoding?: string }) => {
      try {
        return await ipcRenderer.invoke('fs:readFile', filePath, options);
      } catch (error) {
        console.error('File read error:', error);
        throw error;
      }
    }
  },

  
  logger: {
    info: async (message: string) => {
      try {
        await ipcRenderer.invoke('logger:info', message);
      } catch (error) {
        console.error('Logger info error:', error);
      }
    },

    warn: async (message: string) => {
      try {
        await ipcRenderer.invoke('logger:warn', message);
      } catch (error) {
        console.error('Logger warn error:', error);
      }
    },

    error: async (message: string) => {
      try {
        await ipcRenderer.invoke('logger:error', message);
      } catch (error) {
        console.error('Logger error:', error);
      }
    },

    debug: async (message: string) => {
      try {
        await ipcRenderer.invoke('logger:debug', message);
      } catch (error) {
        console.error('Logger debug error:', error);
      }
    }
  },

  
  powershell: {
    execute: async (command: string) => {
      try {
        return await ipcRenderer.invoke('powershell:execute', command);
      } catch (error) {
        console.error('PowerShell execution error:', error);
        throw error;
      }
    }
  },

  
  navigation: {
    onNavigate: (callback: (route: string) => void) => {
      try {
        
        ipcRenderer.removeAllListeners('navigate');
        
        
        ipcRenderer.on('navigate', (_event, route) => callback(route));
        
        
        return () => {
          ipcRenderer.removeAllListeners('navigate');
        };
      } catch (error) {
        console.error('Navigation error:', error);
        throw error;
      }
    }
  }
});


document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());


console.log('Preload script initialized successfully');


ipcRenderer.send('preload-ready');