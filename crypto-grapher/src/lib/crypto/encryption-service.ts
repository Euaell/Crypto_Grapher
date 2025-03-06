import CryptoJS from 'crypto-js';

// Define the encryption parameters interface
export interface EncryptionParams {
  mode?: string;
  padding?: string;
  iv?: string;
  salt?: string;
  iterations?: number;
  keySize?: number;
}

// Define supported algorithms
export enum EncryptionAlgorithm {
  AES = 'AES',
  DES = 'DES',
  TripleDES = '3DES',
  Rabbit = 'Rabbit',
  RC4 = 'RC4',
  ChaCha20 = 'ChaCha20',
  OTP = 'OTP',
  RSA = 'RSA',
  ECC = 'ECC',
  BLOWFISH = 'Blowfish'
}

// Define modes of operation
export enum EncryptionMode {
  ECB = 'ECB',
  CBC = 'CBC',
  CFB = 'CFB',
  OFB = 'OFB',
  CTR = 'CTR',
  GCM = 'GCM'
}

// Define padding methods
export enum PaddingMethod {
  NoPadding = 'NoPadding',
  PKCS7 = 'PKCS7',
  ISO10126 = 'ISO10126',
  AnsiX923 = 'AnsiX923',
  ZeroPadding = 'ZeroPadding'
}

// Default parameters
const defaultParams: EncryptionParams = {
  mode: EncryptionMode.CBC,
  padding: PaddingMethod.PKCS7,
  iterations: 1000,
  keySize: 256 / 32
};

// Utility function to get CryptoJS mode
function getCryptoJSMode(mode: string) {
  switch (mode) {
    case EncryptionMode.ECB: return CryptoJS.mode.ECB;
    case EncryptionMode.CBC: return CryptoJS.mode.CBC;
    case EncryptionMode.CFB: return CryptoJS.mode.CFB;
    case EncryptionMode.OFB: return CryptoJS.mode.OFB;
    case EncryptionMode.CTR: return CryptoJS.mode.CTR;
    default: return CryptoJS.mode.CBC;
  }
}

// Utility function to get CryptoJS padding
function getCryptoJSPadding(padding: string) {
  switch (padding) {
    case PaddingMethod.NoPadding: return CryptoJS.pad.NoPadding;
    case PaddingMethod.PKCS7: return CryptoJS.pad.Pkcs7;
    case PaddingMethod.ISO10126: return CryptoJS.pad.Iso10126;
    case PaddingMethod.AnsiX923: return CryptoJS.pad.AnsiX923;
    case PaddingMethod.ZeroPadding: return CryptoJS.pad.ZeroPadding;
    default: return CryptoJS.pad.Pkcs7;
  }
}

// Get configuration object for CryptoJS
function getCryptoConfig(params: EncryptionParams) {
  const config: any = {};
  
  if (params.mode) {
    config.mode = getCryptoJSMode(params.mode);
  }
  
  if (params.padding) {
    config.padding = getCryptoJSPadding(params.padding);
  }
  
  if (params.iv) {
    config.iv = CryptoJS.enc.Utf8.parse(params.iv);
  }
  
  if (params.iterations) {
    config.iterations = params.iterations;
  }
  
  if (params.keySize) {
    config.keySize = params.keySize;
  }
  
  return config;
}

// One-time pad implementation
function oneTimePad(text: string, key: string, encrypt: boolean): string {
  // Ensure key is at least as long as the text
  let fullKey = key;
  while (fullKey.length < text.length) {
    fullKey += key;
  }
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const textChar = text.charCodeAt(i);
    const keyChar = fullKey.charCodeAt(i);
    
    // XOR operation
    const resultChar = encrypt 
      ? textChar ^ keyChar 
      : textChar ^ keyChar;
    
    result += String.fromCharCode(resultChar);
  }
  
  return encrypt 
    ? btoa(result) 
    : result;
}

// Interface for encryption result with timing information
export interface EncryptionResult {
  result: string;
  timeTaken: number;
  algorithm: string;
  params?: EncryptionParams;
}

// Main encryption function
export async function encrypt(
  text: string,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams = {}
): Promise<EncryptionResult> {
  const startTime = performance.now();
  const mergedParams = { ...defaultParams, ...params };
  let result = '';
  
  try {
    switch (algorithm) {
      case EncryptionAlgorithm.AES:
        result = CryptoJS.AES.encrypt(text, key, getCryptoConfig(mergedParams)).toString();
        break;
      case EncryptionAlgorithm.DES:
        result = CryptoJS.DES.encrypt(text, key, getCryptoConfig(mergedParams)).toString();
        break;
      case EncryptionAlgorithm.TripleDES:
        result = CryptoJS.TripleDES.encrypt(text, key, getCryptoConfig(mergedParams)).toString();
        break;
      case EncryptionAlgorithm.Rabbit:
        result = CryptoJS.Rabbit.encrypt(text, key, getCryptoConfig(mergedParams)).toString();
        break;
      case EncryptionAlgorithm.RC4:
        result = CryptoJS.RC4.encrypt(text, key, getCryptoConfig(mergedParams)).toString();
        break;
      case EncryptionAlgorithm.OTP:
        result = oneTimePad(text, key, true);
        break;
      // Placeholder for algorithms that would require server-side implementation
      case EncryptionAlgorithm.RSA:
      case EncryptionAlgorithm.ECC:
      case EncryptionAlgorithm.BLOWFISH:
      case EncryptionAlgorithm.ChaCha20:
        throw new Error(`${algorithm} encryption is not yet implemented client-side`);
      default:
        throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
    }
  } catch (error) {
    console.error(`Encryption error: ${error}`);
    throw error;
  }
  
  const endTime = performance.now();
  
  return {
    result,
    timeTaken: endTime - startTime,
    algorithm,
    params: mergedParams
  };
}

// Main decryption function
export async function decrypt(
  ciphertext: string,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams = {}
): Promise<EncryptionResult> {
  const startTime = performance.now();
  const mergedParams = { ...defaultParams, ...params };
  let result = '';
  
  try {
    switch (algorithm) {
      case EncryptionAlgorithm.AES:
        result = CryptoJS.AES.decrypt(ciphertext, key, getCryptoConfig(mergedParams)).toString(CryptoJS.enc.Utf8);
        break;
      case EncryptionAlgorithm.DES:
        result = CryptoJS.DES.decrypt(ciphertext, key, getCryptoConfig(mergedParams)).toString(CryptoJS.enc.Utf8);
        break;
      case EncryptionAlgorithm.TripleDES:
        result = CryptoJS.TripleDES.decrypt(ciphertext, key, getCryptoConfig(mergedParams)).toString(CryptoJS.enc.Utf8);
        break;
      case EncryptionAlgorithm.Rabbit:
        result = CryptoJS.Rabbit.decrypt(ciphertext, key, getCryptoConfig(mergedParams)).toString(CryptoJS.enc.Utf8);
        break;
      case EncryptionAlgorithm.RC4:
        result = CryptoJS.RC4.decrypt(ciphertext, key, getCryptoConfig(mergedParams)).toString(CryptoJS.enc.Utf8);
        break;
      case EncryptionAlgorithm.OTP:
        result = oneTimePad(atob(ciphertext), key, false);
        break;
      // Placeholder for algorithms that would require server-side implementation
      case EncryptionAlgorithm.RSA:
      case EncryptionAlgorithm.ECC:
      case EncryptionAlgorithm.BLOWFISH:
      case EncryptionAlgorithm.ChaCha20:
        throw new Error(`${algorithm} decryption is not yet implemented client-side`);
      default:
        throw new Error(`Unsupported decryption algorithm: ${algorithm}`);
    }
  } catch (error) {
    console.error(`Decryption error: ${error}`);
    throw error;
  }
  
  const endTime = performance.now();
  
  return {
    result,
    timeTaken: endTime - startTime,
    algorithm,
    params: mergedParams
  };
}

// Function to generate a cryptographically secure key
export function generateSecureKey(length: number = 32): string {
  const bytes = CryptoJS.lib.WordArray.random(length);
  return bytes.toString(CryptoJS.enc.Base64);
}

// Function to derive a key from a password
export function deriveKeyFromPassword(
  password: string,
  salt: string = CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex),
  iterations: number = 10000,
  keySize: number = 256 / 32
): { key: string; salt: string } {
  const derivedKey = CryptoJS.PBKDF2(password, salt, {
    keySize,
    iterations
  });
  
  return {
    key: derivedKey.toString(CryptoJS.enc.Base64),
    salt
  };
}

// Function to measure key strength
export function measureKeyStrength(key: string): number {
  // Implement entropy calculation and key strength assessment
  // This is a simple implementation - should be enhanced for production
  const uniqueChars = new Set(key.split('')).size;
  const length = key.length;
  
  // Heuristic: score from 0-100
  const lengthScore = Math.min(length / 16, 1) * 40; // Length contributes 40% of score
  const entropyScore = Math.min(uniqueChars / 64, 1) * 60; // Entropy contributes 60% of score
  
  return Math.round(lengthScore + entropyScore);
}

// Function to recommend key size based on algorithm
export function recommendKeySize(algorithm: EncryptionAlgorithm): number {
  switch (algorithm) {
    case EncryptionAlgorithm.AES:
      return 256 / 8; // 256 bits
    case EncryptionAlgorithm.DES:
      return 64 / 8; // 64 bits (weak by modern standards)
    case EncryptionAlgorithm.TripleDES:
      return 192 / 8; // 192 bits
    case EncryptionAlgorithm.Rabbit:
      return 128 / 8; // 128 bits
    case EncryptionAlgorithm.RC4:
      return 256 / 8; // 256 bits (though RC4 is considered weak)
    case EncryptionAlgorithm.OTP:
      return 512 / 8; // OTP needs a key as long as the message
    case EncryptionAlgorithm.RSA:
      return 2048 / 8; // 2048 bits
    case EncryptionAlgorithm.ECC:
      return 256 / 8; // 256 bits
    case EncryptionAlgorithm.BLOWFISH:
      return 448 / 8; // 448 bits
    case EncryptionAlgorithm.ChaCha20:
      return 256 / 8; // 256 bits
    default:
      return 256 / 8; // Default 256 bits
  }
} 