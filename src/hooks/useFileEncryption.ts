"use client";

import { useState, useCallback } from 'react';
import { 
  EncryptionAlgorithm, 
  EncryptionParams 
} from '@/lib/crypto/encryption-service';

// Import browser-based implementations
import {
  browserEncryptFile,
  browserDecryptFile,
  downloadDecryptedFile,
  downloadEncryptedFile,
  FileBrowserEncryptionResult,
  readEncryptedFile
} from '@/lib/crypto/browser-file-crypto';

interface UseFileEncryptionOptions {
  onComplete?: (result: FileBrowserEncryptionResult) => void;
  defaultAlgorithm?: EncryptionAlgorithm;
}

export function useFileEncryption(options: UseFileEncryptionOptions = {}) {
  const { 
    onComplete,
    defaultAlgorithm = EncryptionAlgorithm.AES
  } = options;

  const [file, setFile] = useState<File | null>(null);
  const [encryptedData, setEncryptedData] = useState<string | null>(null);
  const [key, setKey] = useState<string>('');
  const [algorithm, setAlgorithm] = useState<EncryptionAlgorithm>(defaultAlgorithm);
  const [params, setParams] = useState<EncryptionParams>({});
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [encryptionResult, setEncryptionResult] = useState<FileBrowserEncryptionResult | null>(null);
  const [decryptionResult, setDecryptionResult] = useState<FileBrowserEncryptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Function to handle file encryption
  const handleEncryptFile = useCallback(async () => {
    if (!file || !key) {
      setError('File and key are required');
      return;
    }

    setError(null);
    setIsEncrypting(true);
    setProgress(0);
    
    try {
      // Use browser-based implementation
      const result = await browserEncryptFile(file, key, algorithm, params, (p) => {
        setProgress(p);
      });
      
      setEncryptionResult(result);
      setEncryptedData(result.result);
      setDecryptionResult(null);
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (err) {
      setError(`File encryption failed: ${err instanceof Error ? err.message : String(err)}`);
      setProgress(0);
    } finally {
      setIsEncrypting(false);
    }
  }, [file, key, algorithm, params, onComplete]);

  // Function to handle file decryption
  const handleDecryptFile = useCallback(async () => {
    if (!encryptedData || !key) {
      setError('Encrypted data and key are required');
      return;
    }

    setError(null);
    setIsDecrypting(true);
    setProgress(0);
    
    try {
      console.log('Starting file decryption with key:', key.substring(0, 3) + '...');
      
      // Use browser-based implementation
      const result = await browserDecryptFile(encryptedData, key, (p) => {
        setProgress(p);
      });
      
      setDecryptionResult(result);
      setEncryptionResult(null);
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (err) {
      console.error('Decryption error:', err);
      setError(`File decryption failed: ${err instanceof Error ? err.message : String(err)}`);
      setProgress(0);
    } finally {
      setIsDecrypting(false);
    }
  }, [encryptedData, key, onComplete]);

  // Function to handle file drop or selection
  const handleFileChange = useCallback((newFile: File | null) => {
    setFile(newFile);
    setEncryptedData(null);
    setEncryptionResult(null);
    setDecryptionResult(null);
    setError(null);
    setProgress(0);
    
    // If this is an encrypted file (based on name or type), try to read it
    if (newFile && (newFile.name.endsWith('.encrypted') || newFile.type === 'application/json')) {
      setIsDecrypting(true);
      setProgress(10);
      
      // Read the encrypted file
      readEncryptedFile(newFile)
        .then(data => {
          console.log('Successfully read encrypted file data');
          setEncryptedData(data);
          setProgress(20);
        })
        .catch(err => {
          console.error('Error reading encrypted file:', err);
          setError(`Failed to read encrypted file: ${err instanceof Error ? err.message : String(err)}`);
        })
        .finally(() => {
          setIsDecrypting(false);
        });
    }
  }, []);

  // Function to handle encrypted data input (for decryption)
  const handleEncryptedDataChange = useCallback((data: string) => {
    setEncryptedData(data);
    setFile(null);
    setEncryptionResult(null);
    setDecryptionResult(null);
    setError(null);
    setProgress(0);
  }, []);

  // Function to download the decrypted file
  const handleDownloadDecrypted = useCallback(() => {
    if (!decryptionResult) {
      setError('No decrypted file to download');
      return;
    }

    try {
      downloadDecryptedFile(decryptionResult);
    } catch (err) {
      setError(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [decryptionResult]);

  // Function to download the encrypted file
  const handleDownloadEncrypted = useCallback(() => {
    if (!encryptionResult) {
      setError('No encrypted file to download');
      return;
    }

    try {
      downloadEncryptedFile(encryptionResult);
    } catch (err) {
      setError(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [encryptionResult]);

  // Reset all states
  const reset = useCallback(() => {
    setFile(null);
    setEncryptedData(null);
    setEncryptionResult(null);
    setDecryptionResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    file,
    encryptedData,
    key,
    setKey,
    algorithm,
    setAlgorithm,
    params,
    setParams,
    isEncrypting,
    isDecrypting,
    encryptionResult,
    decryptionResult,
    error,
    progress,
    handleEncryptFile,
    handleDecryptFile,
    handleFileChange,
    handleEncryptedDataChange,
    handleDownloadDecrypted,
    handleDownloadEncrypted,
    reset
  };
} 