declare global {
    namespace NodeJS {
      interface ProcessEnv {
        NODE_ENV: 'development' | 'production' | 'test';
        PORT?: string;
        ENCRYPTION_KEY?: string;
      }
    }
  }
  
  export {}