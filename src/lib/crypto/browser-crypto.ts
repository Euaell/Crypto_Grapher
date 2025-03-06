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
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(buffer));
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
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
    ? btoa(result) 
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
  let result = '';
  
  try {
    // Handle different algorithms
    switch (algorithm) {
      case EncryptionAlgorithm.AES:
        // Use AES-GCM for AES
        const iv = generateIV();
        const cryptoKey = await importKey(key);
        
        const encryptedData = await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv
          },
          cryptoKey,
          stringToArrayBuffer(text)
        );
        
        // Combine IV and encrypted data, encode as base64
        const combined = new Uint8Array(iv.length + encryptedData.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encryptedData), iv.length);
        
        result = arrayBufferToBase64(combined.buffer);
        break;
        
      case EncryptionAlgorithm.OTP:
        // One-time pad (implemented in JS)
        result = oneTimePad(text, key, true);
        break;
        
      default:
        // For other algorithms, we'll use OTP as fallback
        // In a production app, you'd implement proper algorithm support
        result = oneTimePad(text, key, true);
        
        // Include a notice that we're using a fallback
        console.warn(`Algorithm ${algorithm} not natively supported, using OTP fallback`);
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
    params
  };
}

// Main decryption function
export async function browserDecrypt(
  ciphertext: string,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams = {}
): Promise<EncryptionResult> {
  const startTime = performance.now();
  let result = '';
  
  try {
    // Handle different algorithms
    switch (algorithm) {
      case EncryptionAlgorithm.AES:
        // Decode the base64 ciphertext
        const encrypted = base64ToArrayBuffer(ciphertext);
        
        // Extract IV from the beginning of the data
        const iv = new Uint8Array(encrypted.slice(0, IV_LENGTH));
        const data = new Uint8Array(encrypted.slice(IV_LENGTH));
        
        // Import the key
        const cryptoKey = await importKey(key);
        
        // Decrypt the data
        const decryptedBuffer = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv
          },
          cryptoKey,
          data
        );
        
        result = arrayBufferToString(decryptedBuffer);
        break;
        
      case EncryptionAlgorithm.OTP:
        // One-time pad decryption
        result = oneTimePad(atob(ciphertext), key, false);
        break;
        
      default:
        // For other algorithms, we'll use OTP as fallback
        result = oneTimePad(atob(ciphertext), key, false);
        
        // Include a notice that we're using a fallback
        console.warn(`Algorithm ${algorithm} not natively supported, using OTP fallback`);
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
    params
  };
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