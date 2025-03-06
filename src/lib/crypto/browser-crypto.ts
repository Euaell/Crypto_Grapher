"use client";

import { EncryptionAlgorithm, EncryptionParams, EncryptionResult } from './encryption-service';

// Constants for Web Crypto API
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16; // 128 bits
const KEY_LENGTH = 256; // 256 bits

// Helper functions for working with Base64 and binary data
function stringToArrayBuffer(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function arrayBufferToString(buffer: ArrayBuffer | Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
}

// Pure utility to convert between ArrayBuffer and Base64
function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike | Uint8Array): string {
  const byteArray = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < byteArray.byteLength; i++) {
    binary += String.fromCharCode(byteArray[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error('Error in base64ToArrayBuffer:', error);
    throw new Error('Failed to decode Base64 string: ' + 
      (error instanceof Error ? error.message : String(error)));
  }
}

// Safe Base64 functions for text data (handles Unicode)
function safeBase64Encode(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (error) {
    console.error('Error in safeBase64Encode:', error);
    throw new Error('Failed to encode string to Base64: ' + 
      (error instanceof Error ? error.message : String(error)));
  }
}

function safeBase64Decode(base64: string): string {
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch (error) {
    console.error('Error in safeBase64Decode:', error);
    throw new Error('Failed to decode Base64 string: ' + 
      (error instanceof Error ? error.message : String(error)));
  }
}

// Generate random IV (12 bytes for AES-GCM)
function generateIV(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(12));
}

// Generate random salt for key derivation
function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

// Key derivation function
async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = 100000
): Promise<CryptoKey> {
  try {
    // Convert password to key material
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Import the password as a key
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive the actual key using PBKDF2
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    return key;
  } catch (error) {
    console.error('Key derivation error:', error);
    throw new Error('Failed to derive key: ' + 
      (error instanceof Error ? error.message : String(error)));
  }
}

// Import a string key for AES
async function importKey(key: string): Promise<CryptoKey> {
  try {
    const keyData = stringToArrayBuffer(key);
    // Use SHA-256 to create a consistent key length
    const hash = await window.crypto.subtle.digest('SHA-256', keyData);
    
    // Import the key
    return window.crypto.subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Key import error:', error);
    throw new Error('Failed to import key: ' + 
      (error instanceof Error ? error.message : String(error)));
  }
}

// One-time pad implementation
function oneTimePad(text: string, key: string, encrypt: boolean): string {
  try {
    // Ensure key is at least as long as the text
    let fullKey = key;
    while (fullKey.length < text.length) {
      fullKey += key;
    }
    
    // Input validation
    if (!text || text.length === 0) {
      throw new Error('Text cannot be empty');
    }
    
    if (!key || key.length === 0) {
      throw new Error('Key cannot be empty');
    }
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const textChar = text.charCodeAt(i);
      const keyChar = fullKey.charCodeAt(i);
      
      // XOR operation
      const resultChar = textChar ^ keyChar;
      result += String.fromCharCode(resultChar);
    }
    
    return encrypt ? safeBase64Encode(result) : result;
  } catch (error) {
    console.error('One-time pad error:', error);
    throw new Error('One-time pad operation failed: ' + 
      (error instanceof Error ? error.message : String(error)));
  }
}

// AES encryption with detailed debugging
export async function browserEncrypt(
  text: string,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams = {}
): Promise<EncryptionResult> {
  console.log(`Starting encryption with algorithm: ${algorithm}`);
  const startTime = performance.now();
  
  try {
    // Validate inputs
    if (!text) {
      throw new Error('Text to encrypt cannot be empty');
    }
    
    if (!key) {
      throw new Error('Encryption key cannot be empty');
    }
    
    // Handle OTP separately
    if (algorithm === EncryptionAlgorithm.OTP) {
      console.log('Using OTP algorithm');
      const result = oneTimePad(text, key, true);
      const endTime = performance.now();
      return {
        result,
        timeTaken: endTime - startTime,
        algorithm: EncryptionAlgorithm.OTP
      };
    }
    
    // For AES, use the Web Crypto API
    if (algorithm === EncryptionAlgorithm.AES) {
      console.log('Using AES algorithm with Web Crypto API');
      
      // Generate a random IV
      const iv = generateIV();
      console.log('Generated IV:', Array.from(iv));
      
      // Import the key
      console.log('Importing key...');
      const cryptoKey = await importKey(key);
      
      // Convert the text to ArrayBuffer
      console.log('Converting text to ArrayBuffer...');
      const textEncoder = new TextEncoder();
      const textBuffer = textEncoder.encode(text);
      
      // Encrypt the data
      console.log('Encrypting data...');
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        cryptoKey,
        textBuffer
      );
      
      // Combine IV and encrypted data
      console.log('Combining IV and encrypted data...');
      const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combinedBuffer.set(iv, 0);
      combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Convert to Base64 for storage/transmission
      console.log('Converting to Base64...');
      const base64Result = arrayBufferToBase64(combinedBuffer);
      
      const endTime = performance.now();
      console.log('Encryption completed successfully');
      
      return {
        result: base64Result,
        timeTaken: endTime - startTime,
        algorithm: EncryptionAlgorithm.AES,
        params: { 
          ...params, 
          iv: arrayBufferToBase64(iv) 
        }
      };
    }
    
    // Fallback for other algorithms (not recommended for production)
    console.log(`Using fallback for algorithm ${algorithm}`);
    const result = safeBase64Encode(text + key);
    const endTime = performance.now();
    return {
      result,
      timeTaken: endTime - startTime,
      algorithm,
      params
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// AES decryption with detailed debugging
export async function browserDecrypt(
  ciphertext: string,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams = {}
): Promise<EncryptionResult> {
  console.log(`Starting decryption with algorithm: ${algorithm}`);
  const startTime = performance.now();
  
  try {
    // Validate inputs
    if (!ciphertext) {
      throw new Error('Ciphertext to decrypt cannot be empty');
    }
    
    if (!key) {
      throw new Error('Decryption key cannot be empty');
    }
    
    // Handle OTP separately
    if (algorithm === EncryptionAlgorithm.OTP) {
      console.log('Using OTP algorithm');
      const decodedText = safeBase64Decode(ciphertext);
      const result = oneTimePad(decodedText, key, false);
      const endTime = performance.now();
      return {
        result,
        timeTaken: endTime - startTime,
        algorithm: EncryptionAlgorithm.OTP
      };
    }
    
    // For AES, use the Web Crypto API
    if (algorithm === EncryptionAlgorithm.AES) {
      console.log('Using AES algorithm with Web Crypto API');
      
      // Import the key
      console.log('Importing key...');
      const cryptoKey = await importKey(key);
      
      // Decode the Base64 ciphertext to an array buffer
      console.log('Decoding Base64 ciphertext...');
      let combinedArray: Uint8Array;
      
      try {
        const buffer = base64ToArrayBuffer(ciphertext);
        combinedArray = new Uint8Array(buffer);
        console.log('Decoded ciphertext length:', combinedArray.length);
      } catch (decodeError) {
        console.error('Error decoding Base64:', decodeError);
        throw new Error(`Failed to decode Base64 ciphertext: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`);
      }
      
      // Ensure we have enough data for IV and ciphertext
      if (combinedArray.length <= 12) {
        throw new Error(`Invalid ciphertext length: ${combinedArray.length} bytes (must be > 12 bytes)`);
      }
      
      // Extract IV (first 12 bytes) and ciphertext
      console.log('Extracting IV and ciphertext...');
      const iv = combinedArray.slice(0, 12);
      const encryptedBuffer = combinedArray.slice(12).buffer;
      
      console.log('IV:', Array.from(iv));
      console.log('Encrypted data length:', encryptedBuffer.byteLength);
      
      // Decrypt the data
      console.log('Decrypting data...');
      try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv
          },
          cryptoKey,
          encryptedBuffer
        );
        
        // Convert the decrypted ArrayBuffer back to a string
        console.log('Converting decrypted data to string...');
        const textDecoder = new TextDecoder();
        const result = textDecoder.decode(decryptedBuffer);
        
        const endTime = performance.now();
        console.log('Decryption completed successfully');
        
        return {
          result,
          timeTaken: endTime - startTime,
          algorithm: EncryptionAlgorithm.AES,
          params: { ...params, iv: arrayBufferToBase64(iv) }
        };
      } catch (decryptError) {
        console.error('Web Crypto decrypt error:', decryptError);
        throw new Error(`AES decryption failed: ${decryptError instanceof Error ? decryptError.message : String(decryptError)}`);
      }
    }
    
    // Fallback for other algorithms (not recommended for production)
    console.log(`Using fallback for algorithm ${algorithm}`);
    try {
      const decodedText = safeBase64Decode(ciphertext);
      const result = decodedText.substring(0, decodedText.length - key.length);
      const endTime = performance.now();
      return {
        result,
        timeTaken: endTime - startTime,
        algorithm,
        params
      };
    } catch (fallbackError) {
      console.error('Fallback decryption error:', fallbackError);
      throw new Error(`Fallback decryption failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to generate a secure key
export function browserGenerateSecureKey(length: number = 32): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return arrayBufferToBase64(randomValues.buffer);
}

// Function to measure key strength
export function browserMeasureKeyStrength(key: string): number {
  // Simple key strength measurement based on length and character diversity
  const uniqueChars = new Set(key.split('')).size;
  const length = key.length;
  
  // Heuristic: score from 0-100
  const lengthScore = Math.min(length / 16, 1) * 40; // Length contributes 40% of score
  const entropyScore = Math.min(uniqueChars / 64, 1) * 60; // Entropy contributes 60% of score
  
  return Math.round(lengthScore + entropyScore);
} 