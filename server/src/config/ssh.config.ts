export const SSH_OPTIONS = {
  debug: false,
  readyTimeout: 3000000,        
  keepaliveInterval: 30000,    
  keepaliveCountMax: 10,       
  tryKeyboard: false,
  algorithms: {
    kex: [
      'ecdh-sha2-nistp256',
      'ecdh-sha2-nistp384',
      'ecdh-sha2-nistp521',
      'diffie-hellman-group-exchange-sha256'
      
    ],
    cipher: [
      'aes128-gcm',
      'aes256-gcm',
      'aes128-ctr',
      'aes256-ctr'
      
    ],
    serverHostKey: [
      'ssh-rsa',
      'ecdsa-sha2-nistp256',
      'ecdsa-sha2-nistp384',
      'ecdsa-sha2-nistp521'
    ],
    hmac: [
      'hmac-sha2-256',
      'hmac-sha2-512'
      
    ]
  },
  compress: true,           
  retryDelay: 2000,        
  maxRetries: 3            
};