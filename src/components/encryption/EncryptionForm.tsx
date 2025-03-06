"use client";

import React, { useState } from 'react';
import { useEncryption } from '@/hooks/useEncryption';
import { EncryptionAlgorithm } from '@/lib/crypto/encryption-service';
import { EncryptionParameters } from './EncryptionParameters';
import { EncryptionVisualizer } from '../visualization/EncryptionVisualizer';
import { AlgorithmComparison } from '../visualization/AlgorithmComparison';
import { LuCopy, LuLock, LuLockOpen, LuKey, LuInfo } from 'react-icons/lu';

export function EncryptionForm() {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showComparison, setShowComparison] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const {
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
  } = useEncryption({
    liveTyping: true,
    typingSpeed: 50
  });

  // Function to handle copy to clipboard
  const handleCopy = async () => {
    if (displayedOutput) {
      await navigator.clipboard.writeText(displayedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get key strength color
  const getKeyStrengthColor = () => {
    if (keyStrength >= 80) return 'bg-green-500';
    if (keyStrength >= 60) return 'bg-yellow-500';
    if (keyStrength >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Get key strength text
  const getKeyStrengthText = () => {
    if (keyStrength >= 80) return 'Strong';
    if (keyStrength >= 60) return 'Good';
    if (keyStrength >= 40) return 'Fair';
    return 'Weak';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Text Encryption</h2>
        
        <div className="flex bg-gray-800 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode('encrypt'); reset(); }}
            className={`px-4 py-2 text-sm font-medium ${
              mode === 'encrypt' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Encrypt
          </button>
          <button
            type="button"
            onClick={() => { setMode('decrypt'); reset(); }}
            className={`px-4 py-2 text-sm font-medium ${
              mode === 'decrypt' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Decrypt
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 bg-opacity-40 text-red-200 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {/* Input area */}
          <div className="space-y-4">
            {/* Text input/output */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {mode === 'encrypt' ? 'Text to Encrypt' : 'Text to Decrypt'}
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'encrypt' 
                  ? 'Enter text to encrypt...' 
                  : 'Enter encrypted text to decrypt...'
                }
                rows={6}
                className="w-full rounded-md bg-gray-800 border-gray-700 text-white focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            {/* Key input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {mode === 'encrypt' ? 'Encryption Key' : 'Decryption Key'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <LuKey className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={mode === 'encrypt' 
                    ? 'Enter a strong encryption key' 
                    : 'Enter the decryption key'
                  }
                  className="w-full rounded-md bg-gray-800 border-gray-700 text-white focus:border-blue-500 focus:ring-blue-500 pl-10"
                />
              </div>
              
              {/* Key strength indicator (only in encrypt mode) */}
              {mode === 'encrypt' && key && (
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                    <div 
                      className={`${getKeyStrengthColor()} h-1.5 rounded-full`} 
                      style={{ width: `${keyStrength}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">
                      Key Strength: {getKeyStrengthText()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {keyStrength}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Algorithm selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Encryption Algorithm
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as EncryptionAlgorithm)}
                className="w-full rounded-md bg-gray-800 border-gray-700 text-white focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={EncryptionAlgorithm.AES}>AES (Recommended)</option>
                <option value={EncryptionAlgorithm.TripleDES}>Triple DES</option>
                <option value={EncryptionAlgorithm.DES}>DES (Not Secure)</option>
                <option value={EncryptionAlgorithm.Rabbit}>Rabbit</option>
                <option value={EncryptionAlgorithm.RC4}>RC4 (Not Secure)</option>
                <option value={EncryptionAlgorithm.OTP}>One-Time Pad</option>
              </select>
            </div>
            
            {/* Action button */}
            <div>
              <button
                type="button"
                onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
                disabled={!input || !key || isEncrypting || isDecrypting}
                className={`
                  w-full flex items-center justify-center px-4 py-3 rounded-md font-medium 
                  ${!input || !key || isEncrypting || isDecrypting
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {mode === 'encrypt' ? (
                  <>
                    <LuLock className="mr-2 h-5 w-5" />
                    {isEncrypting ? 'Encrypting...' : 'Encrypt'}
                  </>
                ) : (
                  <>
                    <LuLockOpen className="mr-2 h-5 w-5" />
                    {isDecrypting ? 'Decrypting...' : 'Decrypt'}
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Encryption Parameters */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-white">Advanced Settings</h3>
              <button
                type="button"
                onClick={() => setShowComparison(!showComparison)}
                className="flex items-center text-blue-400 hover:text-blue-300 text-sm"
              >
                <LuInfo className="mr-1 h-4 w-4" />
                {showComparison ? 'Hide' : 'Show'} Algorithm Comparison
              </button>
            </div>
            
            <EncryptionParameters
              algorithm={algorithm}
              params={params}
              onChange={setParams}
            />
          </div>
        </div>
        
        <div>
          {/* Output area */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">
                {mode === 'encrypt' ? 'Encrypted Output' : 'Decrypted Result'}
              </h3>
              
              {displayedOutput && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center text-gray-300 hover:text-white text-sm"
                >
                  <LuCopy className="mr-1 h-4 w-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            
            {/* Progress bar */}
            {(isEncrypting || isDecrypting || progress > 0) && (
              <div className="mb-4">
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-right text-xs text-gray-400 mt-1">
                  {progress}%
                </p>
              </div>
            )}
            
            {/* Output display */}
            <div 
              className={`
                min-h-[150px] p-3 rounded-md font-mono text-sm whitespace-pre-wrap break-all
                ${displayedOutput ? 'bg-gray-700' : 'bg-gray-700 bg-opacity-50'}
              `}
            >
              {displayedOutput || (
                <span className="text-gray-500">
                  {mode === 'encrypt'
                    ? 'Encrypted text will appear here'
                    : 'Decrypted text will appear here'
                  }
                </span>
              )}
            </div>
            
            {/* Algorithm performance info */}
            {(encryptionResult || decryptionResult) && (
              <div className="mt-4 text-sm text-gray-400">
                <p>
                  <span className="font-medium">Algorithm:</span> {algorithm}
                </p>
                <p>
                  <span className="font-medium">Time taken:</span>{' '}
                  {((encryptionResult?.timeTaken || decryptionResult?.timeTaken || 0) / 1000).toFixed(3)}s
                </p>
              </div>
            )}
          </div>
          
          {/* Visualization */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-white mb-4">Visualization</h3>
            
            <EncryptionVisualizer
              algorithm={algorithm}
              input={input}
              output={displayedOutput}
              isEncrypting={mode === 'encrypt'}
              isAnimating={isEncrypting || isDecrypting}
              progress={progress}
            />
          </div>
          
          {/* Algorithm Comparison */}
          {showComparison && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-4">Algorithm Comparison</h3>
              
              <AlgorithmComparison
                results={[
                  ...(encryptionResult ? [{ 
                    algorithm: encryptionResult.algorithm, 
                    timeTaken: encryptionResult.timeTaken 
                  }] : []),
                  ...(decryptionResult ? [{ 
                    algorithm: decryptionResult.algorithm, 
                    timeTaken: decryptionResult.timeTaken 
                  }] : [])
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 