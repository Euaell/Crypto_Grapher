"use client";

import { 
  browserEncrypt, 
  browserDecrypt 
} from './browser-crypto';

import {
  EncryptionAlgorithm,
  EncryptionParams,
  EncryptionResult
} from './encryption-service';

// Constants
const IV_LENGTH = 12; // 12 bytes for AES-GCM
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunk size

// Interface for file encryption result
export interface FileBrowserEncryptionResult extends EncryptionResult {
  originalFileName: string;
  originalFileType: string;
  encryptedFileName: string;
  fileSize: number;
  result: string; // Add the result property explicitly
}

/**
 * Converts a file to a Base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Reading file: ${file.name} (${file.size} bytes)`);
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          if (typeof reader.result === 'string') {
            // Remove the data URL prefix (e.g., "data:image/png;base64,")
            const base64 = reader.result.split(',')[1];
            console.log(`File converted to Base64 (${base64.length} chars)`);
            resolve(base64);
          } else {
            reject(new Error('FileReader result is not a string'));
          }
        } catch (error) {
          console.error('Error in FileReader onload handler:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('FileReader error: ' + error));
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error in fileToBase64:', error);
      reject(error);
    }
  });
}

/**
 * Converts a Base64 string back to a File object
 */
export function base64ToFile(
  base64String: string, 
  fileName: string, 
  mimeType: string
): File {
  try {
    console.log(`Converting Base64 to File: ${fileName} (${mimeType})`);
    
    // Add the data URL prefix if it's not already there
    const dataUrl = base64String.includes('base64,') 
      ? base64String 
      : `data:${mimeType};base64,${base64String}`;
    
    // Convert base64 to binary
    const byteString = atob(dataUrl.split(',')[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }
    
    // Create Blob and then File from the binary data
    const blob = new Blob([arrayBuffer], { type: mimeType });
    
    // Check if File constructor is supported with the options parameter
    try {
      return new File([blob], fileName, { type: mimeType });
    } catch (error) {
      // Fallback for older browsers
      const file = blob as any;
      file.name = fileName;
      file.lastModified = new Date();
      return file as File;
    }
  } catch (error) {
    console.error('Error in base64ToFile:', error);
    throw new Error(`Failed to convert Base64 to file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Encrypts a file using the specified algorithm and key
 */
export async function browserEncryptFile(
  file: File,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams = {},
  onProgress?: (progress: number) => void
): Promise<FileBrowserEncryptionResult> {
  console.log(`Starting file encryption for ${file.name} (${file.size} bytes) with algorithm: ${algorithm}`);
  const startTime = performance.now();
  
  try {
    // Input validation
    if (!file) {
      throw new Error('File to encrypt cannot be empty');
    }
    
    if (!key) {
      throw new Error('Encryption key cannot be empty');
    }
    
    // For smaller files (under CHUNK_SIZE), we can encrypt directly
    if (file.size <= CHUNK_SIZE) {
      console.log('Small file, encrypting in one pass');
      
      if (onProgress) onProgress(10);
      
      // Convert file to Base64
      const fileData = await fileToBase64(file);
      
      if (onProgress) onProgress(40);
      
      // Use the browser encryption function
      console.log('Encrypting file data...');
      const encryptResult = await browserEncrypt(fileData, key, algorithm, params);
      
      if (onProgress) onProgress(70);
      
      // Create metadata to store with the encrypted file
      const metadata = {
        originalFileName: file.name,
        originalFileType: file.type || 'application/octet-stream',
        algorithm,
        params: encryptResult.params || params
      };
      
      // Combine metadata and encrypted data
      console.log('Creating file package with metadata...');
      const encryptedData = JSON.stringify({
        metadata,
        data: encryptResult.result
      });
      
      const encryptedFileName = `${file.name}.encrypted`;
      
      if (onProgress) onProgress(100);
      
      const endTime = performance.now();
      console.log(`File encryption completed in ${endTime - startTime}ms`);
      
      return {
        result: encryptedData,
        timeTaken: endTime - startTime,
        algorithm,
        params: encryptResult.params || params,
        originalFileName: file.name,
        originalFileType: file.type || 'application/octet-stream',
        encryptedFileName,
        fileSize: file.size
      };
    }
    
    // For larger files, we would implement chunking here
    // This is a simplified version without chunking for now
    console.log('File too large for one-pass encryption');
    if (onProgress) onProgress(100);
    
    throw new Error(`File too large (${file.size} bytes). The maximum supported file size is ${CHUNK_SIZE} bytes.`);
  } catch (error) {
    console.error('File encryption error:', error);
    throw new Error(`File encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decrypts an encrypted file
 */
export async function browserDecryptFile(
  encryptedData: string,
  key: string,
  onProgress?: (progress: number) => void
): Promise<FileBrowserEncryptionResult> {
  console.log('Starting file decryption');
  const startTime = performance.now();
  
  try {
    // Input validation
    if (!encryptedData) {
      throw new Error('Encrypted data cannot be empty');
    }
    
    if (!key) {
      throw new Error('Decryption key cannot be empty');
    }
    
    if (onProgress) onProgress(10);
    
    // Parse the encrypted data
    console.log('Parsing encrypted file data...');
    let parsedData;
    
    try {
      parsedData = JSON.parse(encryptedData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid encrypted file format: not valid JSON');
    }
    
    const { metadata, data } = parsedData;
    
    if (!metadata || !data) {
      throw new Error('Invalid encrypted file format: missing metadata or data');
    }
    
    const { 
      originalFileName, 
      originalFileType, 
      algorithm, 
      params 
    } = metadata;
    
    if (!originalFileName || !algorithm) {
      throw new Error('Missing required metadata in encrypted file');
    }
    
    if (onProgress) onProgress(30);
    
    // Decrypt the file data
    console.log(`Decrypting file with algorithm: ${algorithm}`);
    const decryptResult = await browserDecrypt(data, key, algorithm, params);
    
    if (onProgress) onProgress(70);
    
    // Verify the decryption result
    if (!decryptResult.result) {
      throw new Error('Decryption returned empty result');
    }
    
    if (onProgress) onProgress(100);
    
    const endTime = performance.now();
    console.log(`File decryption completed in ${endTime - startTime}ms`);
    
    return {
      result: decryptResult.result,
      timeTaken: endTime - startTime,
      algorithm,
      params,
      originalFileName,
      originalFileType: originalFileType || 'application/octet-stream',
      encryptedFileName: `${originalFileName}.encrypted`,
      fileSize: decryptResult.result.length // Approximate size in bytes
    };
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error(`File decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Downloads a decrypted file to the user's device
 */
export function downloadDecryptedFile(
  decryptedResult: FileBrowserEncryptionResult
): void {
  try {
    console.log(`Preparing file for download: ${decryptedResult.originalFileName}`);
    
    const { result, originalFileName, originalFileType } = decryptedResult;
    
    // Convert the base64 result back to a file
    const file = base64ToFile(
      result,
      originalFileName,
      originalFileType || 'application/octet-stream'
    );
    
    // Create a download link
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFileName;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log('File download initiated');
  } catch (error) {
    console.error('Error downloading decrypted file:', error);
    throw new Error(`Failed to download decrypted file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Downloads an encrypted file to the user's device
 */
export function downloadEncryptedFile(
  encryptedResult: FileBrowserEncryptionResult
): void {
  try {
    console.log(`Preparing encrypted file for download: ${encryptedResult.encryptedFileName}`);
    
    const { result, encryptedFileName } = encryptedResult;
    
    // Create a blob from the JSON string
    const blob = new Blob([result], { type: 'application/json' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = encryptedFileName;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log('Encrypted file download initiated');
  } catch (error) {
    console.error('Error downloading encrypted file:', error);
    throw new Error(`Failed to download encrypted file: ${error instanceof Error ? error.message : String(error)}`);
  }
} 