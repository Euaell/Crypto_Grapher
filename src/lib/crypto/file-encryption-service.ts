"use client";

import CryptoJS from 'crypto-js';
import { 
  EncryptionAlgorithm, 
  EncryptionParams, 
  EncryptionResult 
} from './encryption-service';

// Interface for file encryption result
export interface FileEncryptionResult extends EncryptionResult {
  originalFileName: string;
  originalFileType: string;
  encryptedFileName: string;
  fileSize: number;
}

// Constants for chunking
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

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
export async function encryptFile(
  file: File,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams = {},
  onProgress?: (progress: number) => void
): Promise<FileEncryptionResult> {
  const startTime = performance.now();
  
  try {
    // For smaller files, we can encrypt directly
    if (file.size <= CHUNK_SIZE) {
      const fileData = await fileToBase64(file);
      const encrypted = encryptFileData(fileData, key, algorithm, params);
      
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
        data: encrypted
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
    } else {
      // For larger files, implement chunked encryption
      // This would be a more complex implementation involving chunks
      // and would be better handled server-side
      // This is a placeholder for a chunked encryption implementation
      throw new Error('Large file encryption is not yet implemented in this browser version');
    }
  } catch (error) {
    console.error(`File encryption error: ${error}`);
    throw error;
  }
}

// Helper function to encrypt file data
function encryptFileData(
  fileData: string,
  key: string,
  algorithm: EncryptionAlgorithm,
  params: EncryptionParams
): string {
  switch (algorithm) {
    case EncryptionAlgorithm.AES:
      return CryptoJS.AES.encrypt(fileData, key).toString();
    case EncryptionAlgorithm.TripleDES:
      return CryptoJS.TripleDES.encrypt(fileData, key).toString();
    case EncryptionAlgorithm.DES:
      return CryptoJS.DES.encrypt(fileData, key).toString();
    case EncryptionAlgorithm.Rabbit:
      return CryptoJS.Rabbit.encrypt(fileData, key).toString();
    case EncryptionAlgorithm.RC4:
      return CryptoJS.RC4.encrypt(fileData, key).toString();
    default:
      throw new Error(`File encryption not supported for algorithm: ${algorithm}`);
  }
}

// Function to decrypt a file
export async function decryptFile(
  encryptedData: string,
  key: string,
  onProgress?: (progress: number) => void
): Promise<FileEncryptionResult> {
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
    
    // Decrypt the file data
    let decryptedData = '';
    
    switch (algorithm) {
      case EncryptionAlgorithm.AES:
        decryptedData = CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8);
        break;
      case EncryptionAlgorithm.TripleDES:
        decryptedData = CryptoJS.TripleDES.decrypt(data, key).toString(CryptoJS.enc.Utf8);
        break;
      case EncryptionAlgorithm.DES:
        decryptedData = CryptoJS.DES.decrypt(data, key).toString(CryptoJS.enc.Utf8);
        break;
      case EncryptionAlgorithm.Rabbit:
        decryptedData = CryptoJS.Rabbit.decrypt(data, key).toString(CryptoJS.enc.Utf8);
        break;
      case EncryptionAlgorithm.RC4:
        decryptedData = CryptoJS.RC4.decrypt(data, key).toString(CryptoJS.enc.Utf8);
        break;
      default:
        throw new Error(`File decryption not supported for algorithm: ${algorithm}`);
    }
    
    if (onProgress) onProgress(100);
    
    const endTime = performance.now();
    
    return {
      result: decryptedData,
      timeTaken: endTime - startTime,
      algorithm,
      params,
      originalFileName,
      originalFileType,
      encryptedFileName: `${originalFileName}.encrypted`,
      fileSize: decryptedData.length
    };
  } catch (error) {
    console.error(`File decryption error: ${error}`);
    throw error;
  }
}

// Function to download the decrypted file
export function downloadDecryptedFile(
  decryptedResult: FileEncryptionResult
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
  encryptedResult: FileEncryptionResult
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