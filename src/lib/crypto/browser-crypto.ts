"use client";

import { EncryptionAlgorithm, EncryptionParams, EncryptionResult } from './encryption-service';

// Constants for Web Crypto API
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16; // 128 bits
const KEY_LENGTH = 256; // 256 bits

// Helper function to convert string to ArrayBuffer
function stringToArrayBuffer(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Helper function to convert ArrayBuffer to string
function arrayBufferToString(buffer: ArrayBuffer | Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike | Uint8Array): string {
  let binary = '';
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Safe Base64 encoding that works with Unicode
function safeBase64Encode(str: string): string {
  // Convert string to UTF-8 encoding before Base64 encoding
  return btoa(unescape(encodeURIComponent(str)));
}

// Safe Base64 decoding that works with Unicode
function safeBase64Decode(base64: string): string {
  // Convert Base64 back to UTF-8 string
  return decodeURIComponent(escape(atob(base64)));
}

// Function to generate a random initialization vector
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// Function to generate a random salt
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// Function to derive a key from a password using PBKDF2
async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = 100000
): Promise<CryptoKey> {
  // Convert password to key material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive an AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// Function to import a raw key for AES encryption
async function importKey(key: string): Promise<CryptoKey> {
  // For simplicity, we'll use a key derivation to convert string key to a proper key
  const salt = generateSalt();
  return deriveKey(key, salt);
}

// One-time pad implementation (for when we need OTP)
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
    ? safeBase64Encode(result) 
    : result;
}

// Main encryption function
export async function browserEncrypt(
  text: string,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams = {}
): Promise<EncryptionResult> {
  const startTime = performance.now();
  
  try {
    // Handle OTP separately as it doesn't use Web Crypto API
    if (algorithm === EncryptionAlgorithm.OTP) {
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
      // Generate a random IV
      const iv = generateIV();
      
      // Import the key
      const cryptoKey = await importKey(key);
      
      // Convert the text to ArrayBuffer
      const textEncoder = new TextEncoder();
      const textBuffer = textEncoder.encode(text);
      
      // Encrypt the data
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        cryptoKey,
        textBuffer
      );
      
      // Combine IV and encrypted data
      const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combinedBuffer.set(iv, 0);
      combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Convert to Base64 for storage/transmission - use arrayBufferToBase64 directly
      const result = arrayBufferToBase64(combinedBuffer);
      
      const endTime = performance.now();
      return {
        result,
        timeTaken: endTime - startTime,
        algorithm: EncryptionAlgorithm.AES,
        params: { ...params, iv: arrayBufferToBase64(iv.buffer) }
      };
    }
    
    // Fallback for other algorithms (not recommended for production)
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

// Main decryption function
export async function browserDecrypt(
  ciphertext: string,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams = {}
): Promise<EncryptionResult> {
  const startTime = performance.now();
  
  try {
    // Handle OTP separately
    if (algorithm === EncryptionAlgorithm.OTP) {
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
      // Import the key
      const cryptoKey = await importKey(key);
      
      // Decode the Base64 ciphertext to an array buffer directly
      const binaryString = atob(ciphertext);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Extract IV (first 12 bytes) and ciphertext
      const iv = bytes.slice(0, 12);
      const encryptedBuffer = bytes.slice(12).buffer;
      
      // Decrypt the data
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        cryptoKey,
        encryptedBuffer
      );
      
      // Convert the decrypted ArrayBuffer back to a string
      const textDecoder = new TextDecoder();
      const result = textDecoder.decode(decryptedBuffer);
      
      const endTime = performance.now();
      return {
        result,
        timeTaken: endTime - startTime,
        algorithm: EncryptionAlgorithm.AES,
        params: { ...params, iv: arrayBufferToBase64(iv.buffer) }
      };
    }
    
    // Fallback for other algorithms (not recommended for production)
    const decodedText = safeBase64Decode(ciphertext);
    const result = decodedText.substring(0, decodedText.length - key.length);
    const endTime = performance.now();
    return {
      result,
      timeTaken: endTime - startTime,
      algorithm,
      params
    };
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