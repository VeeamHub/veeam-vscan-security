import crypto from 'crypto';
import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';

export class EncryptionService {
  private static instance: EncryptionService;
  private readonly algorithm = 'aes-256-cbc';
  private key: Buffer;
  private readonly ivLength = 16;
  private readonly keyPath: string;
  private readonly backupKeyPath: string;
  private readonly dataPath: string;

  private constructor() {
    
    this.dataPath = process.env.DATA_PATH || path.join(process.cwd(), 'data');
    this.keyPath = path.join(this.dataPath, '.env.key');
    this.backupKeyPath = path.join(this.dataPath, '.env.key.backup');
    this.key = this.initializeEncryptionKey();
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  private initializeEncryptionKey(): Buffer {
    try {
      
      fs.mkdirSync(this.dataPath, { recursive: true });

      
      if (fs.existsSync(this.keyPath)) {
        try {
          const savedKey = fs.readFileSync(this.keyPath, 'utf8');
          const key = Buffer.from(savedKey, 'hex');
          if (key.length === 32) { 
            return key;
          }
        } catch (error) {
          console.error('Error reading primary key:', error);
        }
      }

      
      if (fs.existsSync(this.backupKeyPath)) {
        try {
          const backupKey = fs.readFileSync(this.backupKeyPath, 'utf8');
          const key = Buffer.from(backupKey, 'hex');
          if (key.length === 32) {
            
            fs.writeFileSync(this.keyPath, backupKey, { mode: 0o600 });
            return key;
          }
        } catch (error) {
          console.error('Error reading backup key:', error);
        }
      }

      
      console.log('Generating new encryption key');
      const newKey = crypto.randomBytes(32);
      
      
      fs.writeFileSync(this.keyPath, newKey.toString('hex'), { mode: 0o600 });
      fs.writeFileSync(this.backupKeyPath, newKey.toString('hex'), { mode: 0o600 });
      
      return newKey;
    } catch (error) {
      console.error('Fatal error handling encryption key:', error);
      throw new Error('Failed to initialize encryption service');
    }
  }

  public encrypt(text: string): string {
    try {
      
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  public decrypt(text: string): string {
    try {
      
      const [ivHex, encryptedHex] = text.split(':');
      
      if (!ivHex || !encryptedHex) {
        throw new Error('Invalid encrypted format');
      }

      
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      
      
      if (iv.length !== this.ivLength) {
        throw new Error('Invalid IV length');
      }
      
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      
      
      if (fs.existsSync(this.backupKeyPath)) {
        try {
          const backupKey = Buffer.from(fs.readFileSync(this.backupKeyPath, 'utf8'), 'hex');
          const [ivHex, encryptedHex] = text.split(':');
          const iv = Buffer.from(ivHex, 'hex');
          const encrypted = Buffer.from(encryptedHex, 'hex');
          
          const decipher = crypto.createDecipheriv(this.algorithm, backupKey, iv);
          let decrypted = decipher.update(encrypted);
          decrypted = Buffer.concat([decrypted, decipher.final()]);
          
          
          this.key = backupKey;
          fs.writeFileSync(this.keyPath, backupKey.toString('hex'), { mode: 0o600 });
          
          return decrypted.toString('utf8');
        } catch (backupError) {
          console.error('Backup key decryption failed:', backupError);
        }
      }
      
      throw new Error('Failed to decrypt data');
    }
  }

  public validateEncryptedFormat(encryptedText: string): boolean {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) return false;

      const [ivHex, encryptedHex] = parts;
      
      const validHex = /^[0-9a-fA-F]+$/.test(ivHex) && /^[0-9a-fA-F]+$/.test(encryptedHex);
      const validIvLength = ivHex.length === this.ivLength * 2;

      return validHex && validIvLength;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  public rotateKey(): void {
    try {
      
      const newKey = crypto.randomBytes(32);
      
      
      fs.writeFileSync(this.backupKeyPath, this.key.toString('hex'), { mode: 0o600 });
      
      
      this.key = newKey;
      fs.writeFileSync(this.keyPath, newKey.toString('hex'), { mode: 0o600 });
      
      console.log('Encryption key rotated successfully');
    } catch (error) {
      console.error('Key rotation failed:', error);
      throw new Error('Failed to rotate encryption key');
    }
  }
}

export const encryptionService = EncryptionService.getInstance();