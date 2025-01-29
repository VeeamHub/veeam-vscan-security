type APIResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

type FSReadOptions = {
  encoding?: BufferEncoding;
  flag?: string;
};

type PowerShellResponse = {
  success: boolean;
  data?: any;
  error?: string;
  details?: {
    type?: string;
    message?: string;
    stack?: string;
  };
};

type NavigationCallback = (route: string) => void;

type ElectronAPI = {
  api: {
    get: <T = any>(url: string) => Promise<T>;
    post: <T = any>(url: string, data?: any) => Promise<T>;
    put: <T = any>(url: string, data?: any) => Promise<T>;
    delete: <T = any>(url: string) => Promise<T>;
  };
  fs: {
    readFile: (path: string, options?: FSReadOptions) => Promise<string | Buffer>;
  };
  powershell: {
    execute: (command: string) => Promise<PowerShellResponse>;
  };
  vbr: {
    connect: (config: any) => Promise<APIResponse>;
    disconnect: () => Promise<APIResponse>;
    getStatus: () => Promise<APIResponse>;
    executeCommand: (command: string) => Promise<PowerShellResponse>;
  };
  ssh: {
    connect: (config: any) => Promise<APIResponse>;
    disconnect: () => Promise<APIResponse>;
    execute: (command: string) => Promise<APIResponse>;
    testConnection: (config: any) => Promise<APIResponse>;
  };
  navigation: {
    onNavigate: (callback: NavigationCallback) => () => void;
  };
};

interface ElectronEvent {
  preventDefault: () => void;
  stopPropagation: () => void;
  sender: any;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    __ELECTRON_ONLY__?: boolean;
  }
}

export type {
  APIResponse,
  ElectronAPI,
  ElectronEvent,
  FSReadOptions,
  PowerShellResponse,
  NavigationCallback
};