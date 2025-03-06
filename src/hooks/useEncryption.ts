"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  EncryptionAlgorithm, 
  EncryptionParams, 
  EncryptionResult,
  measureKeyStrength
} from '@/lib/crypto/encryption-service';

// Import browser-native crypto implementation instead of CryptoJS
import {
  browserEncrypt,
  browserDecrypt,
  browserMeasureKeyStrength
} from '@/lib/crypto/browser-crypto';

interface UseEncryptionOptions {
  liveTyping?: boolean;
  typingSpeed?: number;
  onComplete?: (result: EncryptionResult) => void;
}

export function useEncryption(options: UseEncryptionOptions = {}) {
  const { 
    liveTyping = false,
    typingSpeed = 50, 
    onComplete 
  } = options;

  const [input, setInput] = useState<string>('');
  const [key, setKey] = useState<string>('');
  const [algorithm, setAlgorithm] = useState<EncryptionAlgorithm>(EncryptionAlgorithm.AES);
  const [params, setParams] = useState<EncryptionParams>({});
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [decryptionResult, setDecryptionResult] = useState<EncryptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [displayedOutput, setDisplayedOutput] = useState<string>('');
  const [keyStrength, setKeyStrength] = useState<number>(0);

  // Update key strength when key changes
  useEffect(() => {
    if (key) {
      // Use the browser implementation instead of CryptoJS
      setKeyStrength(browserMeasureKeyStrength(key));
    } else {
      setKeyStrength(0);
    }
  }, [key]);

  // Handle live typing animation for encryption
  useEffect(() => {
    if (encryptionResult && liveTyping) {
      let currentIndex = 0;
      const result = encryptionResult.result;
      const interval = setInterval(() => {
        if (currentIndex <= result.length) {
          setDisplayedOutput(result.substring(0, currentIndex));
          currentIndex += 1;
          // Update progress based on how much we've displayed
          setProgress(Math.min(100, Math.floor((currentIndex / result.length) * 100)));
        } else {
          clearInterval(interval);
          setProgress(100);
        }
      }, typingSpeed);
      
      return () => clearInterval(interval);
    } else if (encryptionResult) {
      setDisplayedOutput(encryptionResult.result);
      setProgress(100);
    }
  }, [encryptionResult, liveTyping, typingSpeed]);

  // Handle live typing animation for decryption
  useEffect(() => {
    if (decryptionResult && liveTyping) {
      let currentIndex = 0;
      const result = decryptionResult.result;
      const interval = setInterval(() => {
        if (currentIndex <= result.length) {
          setDisplayedOutput(result.substring(0, currentIndex));
          currentIndex += 1;
          // Update progress based on how much we've displayed
          setProgress(Math.min(100, Math.floor((currentIndex / result.length) * 100)));
        } else {
          clearInterval(interval);
          setProgress(100);
        }
      }, typingSpeed);
      
      return () => clearInterval(interval);
    } else if (decryptionResult) {
      setDisplayedOutput(decryptionResult.result);
      setProgress(100);
    }
  }, [decryptionResult, liveTyping, typingSpeed]);

  // Function to handle encryption
  const handleEncrypt = useCallback(async () => {
    if (!input || !key) {
      setError('Input and key are required');
      return;
    }

    setError(null);
    setIsEncrypting(true);
    setProgress(0);
    setDisplayedOutput('');
    
    try {
      // If not using live typing animation, show a progress indicator
      if (!liveTyping) {
        // Simulate progress for UX
        const progressInterval = setInterval(() => {
          setProgress(prevProgress => {
            if (prevProgress >= 90) {
              clearInterval(progressInterval);
              return prevProgress;
            }
            return prevProgress + 10;
          });
        }, 200);
      }
      
      // Use browser crypto implementation instead of CryptoJS
      const result = await browserEncrypt(input, key, algorithm, params);
      
      setEncryptionResult(result);
      setDecryptionResult(null);
      
      if (onComplete) {
        onComplete(result);
      }
      
      if (!liveTyping) {
        setDisplayedOutput(result.result);
        setProgress(100);
      }
    } catch (err) {
      setError(`Encryption failed: ${err instanceof Error ? err.message : String(err)}`);
      setProgress(0);
    } finally {
      setIsEncrypting(false);
    }
  }, [input, key, algorithm, params, liveTyping, onComplete]);

  // Function to handle decryption
  const handleDecrypt = useCallback(async () => {
    if (!input || !key) {
      setError('Input and key are required');
      return;
    }

    setError(null);
    setIsDecrypting(true);
    setProgress(0);
    setDisplayedOutput('');
    
    try {
      // If not using live typing animation, show a progress indicator
      if (!liveTyping) {
        // Simulate progress for UX
        const progressInterval = setInterval(() => {
          setProgress(prevProgress => {
            if (prevProgress >= 90) {
              clearInterval(progressInterval);
              return prevProgress;
            }
            return prevProgress + 10;
          });
        }, 200);
      }
      
      // Use browser crypto implementation instead of CryptoJS
      const result = await browserDecrypt(input, key, algorithm, params);
      
      setDecryptionResult(result);
      setEncryptionResult(null);
      
      if (onComplete) {
        onComplete(result);
      }
      
      if (!liveTyping) {
        setDisplayedOutput(result.result);
        setProgress(100);
      }
    } catch (err) {
      setError(`Decryption failed: ${err instanceof Error ? err.message : String(err)}`);
      setProgress(0);
    } finally {
      setIsDecrypting(false);
    }
  }, [input, key, algorithm, params, liveTyping, onComplete]);

  // Reset all states
  const reset = useCallback(() => {
    setInput('');
    setDisplayedOutput('');
    setEncryptionResult(null);
    setDecryptionResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    input,
    setInput,
    key,
    setKey,
    keyStrength,
    algorithm,
    setAlgorithm,
    params,
    setParams,
    isEncrypting,
    isDecrypting,
    encryptionResult,
    decryptionResult,
    displayedOutput,
    error,
    progress,
    handleEncrypt,
    handleDecrypt,
    reset
  };
} 