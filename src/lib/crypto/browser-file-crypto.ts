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
    
    // Make sure we're working with raw base64 data
    let rawBase64 = base64String;
    if (base64String.includes('base64,')) {
      rawBase64 = base64String.split('base64,')[1];
    }
    
    // Convert base64 to binary
    const byteString = atob(rawBase64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }
    
    // Create Blob and then File from the binary data
    const blob = new Blob([arrayBuffer], { type: mimeType });
    
    // Create a File object
    const file = new File([blob], fileName, { type: mimeType });
    console.log(`File created: ${file.name} (${file.size} bytes)`);
    return file;
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
 * Reads an encrypted file and returns its contents as a string
 */
export function readEncryptedFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Reading encrypted file: ${file.name} (${file.size} bytes)`);
      
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          if (typeof reader.result === 'string') {
            console.log(`Successfully read encrypted file (${reader.result.length} chars)`);
            resolve(reader.result);
          } else if (reader.result instanceof ArrayBuffer) {
            // Handle ArrayBuffer result
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(new Uint8Array(reader.result));
            console.log(`Successfully read encrypted file as ArrayBuffer (${text.length} chars)`);
            resolve(text);
          } else {
            reject(new Error('FileReader result is not a string or ArrayBuffer'));
          }
        } catch (error) {
          console.error('Error in FileReader onload handler:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Error reading encrypted file'));
      };
      
      // Read as text rather than data URL
      reader.readAsText(file);
    } catch (error) {
      console.error('Error in readEncryptedFile:', error);
      reject(error);
    }
  });
}

/**
 * Decrypts an encrypted file
 */
export async function browserDecryptFile(
  encryptedData: string,
  key: string,
  onProgress?: (progress: number) => void
): Promise<FileBrowserEncryptionResult> {
  console.log('Starting file decryption process');
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
    console.log('First 100 chars of encrypted data:', encryptedData.substring(0, 100) + '...');
    
    let parsedData;
    try {
      parsedData = JSON.parse(encryptedData);
      console.log('Successfully parsed JSON data');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      
      // Try to clean the data (sometimes extra characters can get into the file)
      try {
        const cleanedData = encryptedData.trim().replace(/^\uFEFF/, ''); // Remove BOM if present
        console.log('Trying to parse cleaned data...');
        parsedData = JSON.parse(cleanedData);
        console.log('Successfully parsed cleaned JSON data');
      } catch (secondError) {
        console.error('Failed to parse even after cleaning:', secondError);
        throw new Error('Invalid encrypted file format: not valid JSON');
      }
    }
    
    // Check the parsed data structure
    console.log('Parsed data structure:', Object.keys(parsedData).join(', '));
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
    
    console.log('Metadata:', {
      originalFileName,
      originalFileType,
      algorithm,
      params: JSON.stringify(params)
    });
    
    if (!originalFileName || !algorithm) {
      throw new Error('Missing required metadata in encrypted file');
    }
    
    if (onProgress) onProgress(30);
    
    // Decrypt the file data
    console.log(`Decrypting file with algorithm: ${algorithm}`);
    console.log(`Encrypted data length: ${data.length} chars`);
    
    try {
      const decryptResult = await browserDecrypt(data, key, algorithm, params);
      console.log('File decryption completed successfully');
      
      if (onProgress) onProgress(70);
      
      // Verify the decryption result
      if (!decryptResult.result) {
        throw new Error('Decryption returned empty result');
      }
      
      console.log(`Decrypted data length: ${decryptResult.result.length} chars`);
      
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
    } catch (decryptError) {
      console.error('Error during file decryption:', decryptError);
      throw new Error(`Failed to decrypt file: ${decryptError instanceof Error ? decryptError.message : String(decryptError)}`);
    }
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
    console.log(`Decrypted result length: ${result.length}, file type: ${originalFileType}`);
    
    // For certain file types, we need to add the data URL prefix
    let base64Data = result;
    if (!result.includes('base64,')) {
      base64Data = `data:${originalFileType || 'application/octet-stream'};base64,${result}`;
    }
    
    // Option 1: Convert the result back to a file
    try {
      const file = base64ToFile(
        base64Data,
        originalFileName,
        originalFileType || 'application/octet-stream'
      );
      
      // Create a download link
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalFileName;
      document.body.appendChild(a);
      console.log('Triggering download...');
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Download complete, cleaned up resources');
      }, 100);
    } catch (fileError) {
      console.error('Error creating file from base64:', fileError);
      
      // Option 2: Direct data URL download as fallback
      console.log('Falling back to direct data URL download');
      const a = document.createElement('a');
      a.href = base64Data;
      a.download = originalFileName;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        console.log('Fallback download complete');
      }, 100);
    }
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