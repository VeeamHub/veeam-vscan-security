export type APIResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  };
  
  export type FSReadOptions = {
    encoding?: BufferEncoding;
    flag?: string;
  };
  
  export type PowerShellResponse = {
    success: boolean;
    data?: any;
    error?: string;
    details?: {
      type?: string;
      message?: string;
      stack?: string;
    };
  };
  
  export type NavigationCallback = (route: string) => void;  
  
  export type ElectronAPI = {
    api: {
      get: <T = any>(url: string) => Promise<T>;
      post: <T = any>(url: string, data?: any) => Promise<T>;
      put: <T = any>(url: string, data?: any) => Promise<T>;
      delete: <T = any>(url: string) => Promise<T>;
    };
    fs: {
      readFile: (path: string, options?: FSReadOptions) => Promise<string | Buffer>;
    };
    logger: {
      info: (message: string) => Promise<void>;
      warn: (message: string) => Promise<void>;
      error: (message: string) => Promise<void>;
      debug: (message: string) => Promise<void>;
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
  
  declare global {
    interface Window {
      electron: ElectronAPI;
      __ELECTRON_ONLY__?: boolean;
    }
  }