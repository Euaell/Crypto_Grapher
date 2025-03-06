"use client";

import { 
  EncryptionAlgorithm, 
  EncryptionParams, 
  EncryptionResult 
} from './encryption-service';
import { browserEncrypt, browserDecrypt } from './browser-crypto';

// Constants
const IV_LENGTH = 16; // 128 bits

// Interface for file encryption result
export interface FileBrowserEncryptionResult extends EncryptionResult {
  originalFileName: string;
  originalFileType: string;
  encryptedFileName: string;
  fileSize: number;
}

// Helper to convert file to Base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (reader.result) {
        // Extract the base64 part (remove data URL prefix)
        const base64String = reader.result.toString().split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
}

// Helper to convert Base64 to file
export function base64ToFile(
  base64String: string, 
  fileName: string, 
  mimeType: string
): File {
  const byteCharacters = atob(base64String);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}

// Function to encrypt a file
export async function browserEncryptFile(
  file: File,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams = {},
  onProgress?: (progress: number) => void
): Promise<FileBrowserEncryptionResult> {
  const startTime = performance.now();
  
  try {
    // Convert file to base64
    const fileData = await fileToBase64(file);
    
    // Encrypt the file data using the browser crypto
    const encryptionResult = await browserEncrypt(fileData, key, algorithm, params);
    
    // Create metadata to store with the encrypted file
    const metadata = {
      originalFileName: file.name,
      originalFileType: file.type,
      algorithm,
      params
    };
    
    // Combine metadata and encrypted data
    const encryptedData = JSON.stringify({
      metadata,
      data: encryptionResult.result
    });
    
    const encryptedFileName = `${file.name}.encrypted`;
    
    if (onProgress) onProgress(100);
    
    const endTime = performance.now();
    
    return {
      result: encryptedData,
      timeTaken: endTime - startTime,
      algorithm,
      params,
      originalFileName: file.name,
      originalFileType: file.type,
      encryptedFileName,
      fileSize: file.size
    };
  } catch (error) {
    console.error(`File encryption error: ${error}`);
    throw error;
  }
}

// Function to decrypt a file
export async function browserDecryptFile(
  encryptedData: string,
  key: string,
  onProgress?: (progress: number) => void
): Promise<FileBrowserEncryptionResult> {
  const startTime = performance.now();
  
  try {
    // Parse the encrypted data to get metadata and encrypted content
    const parsedData = JSON.parse(encryptedData);
    const { metadata, data } = parsedData;
    
    const { 
      originalFileName, 
      originalFileType, 
      algorithm, 
      params 
    } = metadata;
    
    // Decrypt the data using the browser crypto
    const decryptionResult = await browserDecrypt(data, key, algorithm as EncryptionAlgorithm, params);
    
    if (onProgress) onProgress(100);
    
    const endTime = performance.now();
    
    return {
      result: decryptionResult.result,
      timeTaken: endTime - startTime,
      algorithm,
      params,
      originalFileName,
      originalFileType,
      encryptedFileName: `${originalFileName}.encrypted`,
      fileSize: decryptionResult.result.length
    };
  } catch (error) {
    console.error(`File decryption error: ${error}`);
    throw error;
  }
}

// Function to download the decrypted file
export function downloadDecryptedFile(
  decryptedResult: FileBrowserEncryptionResult
): void {
  try {
    const { result, originalFileName, originalFileType } = decryptedResult;
    
    // Convert the Base64 data back to a file
    const file = base64ToFile(result, originalFileName, originalFileType);
    
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
    }, 0);
  } catch (error) {
    console.error(`Error downloading file: ${error}`);
    throw error;
  }
}

// Function to download the encrypted file
export function downloadEncryptedFile(
  encryptedResult: FileBrowserEncryptionResult
): void {
  try {
    const { result, encryptedFileName } = encryptedResult;
    
    // Create a Blob from the encrypted data
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
    }, 0);
  } catch (error) {
    console.error(`Error downloading encrypted file: ${error}`);
    throw error;
  }
} 