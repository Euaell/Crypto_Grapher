"use client";

import React, { useState } from 'react';
import { useFileEncryption } from '@/hooks/useFileEncryption';
import { EncryptionAlgorithm } from '@/lib/crypto/encryption-service';
import { useDropzone } from 'react-dropzone';
import { EncryptionParameters } from '@/components/encryption/EncryptionParameters';
import { LuFileSymlink, LuFile, LuFileInput, LuDownload, LuLock, LuKey } from 'react-icons/lu';

export function FileEncryptionForm() {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  
  const {
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
    error,
    progress,
    handleEncryptFile,
    handleDecryptFile,
    handleFileChange,
    handleEncryptedDataChange,
    handleDownloadDecrypted,
    handleDownloadEncrypted,
    reset
  } = useFileEncryption();

  // Dropzone setup for file uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileChange(acceptedFiles[0]);
      }
    },
    multiple: false
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">File Encryption</h2>
        
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
          {/* Input area - changes based on mode */}
          {mode === 'encrypt' ? (
            <div className="space-y-4">
              {/* File upload dropzone for encryption */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition
                  ${isDragActive 
                    ? 'border-blue-500 bg-blue-900 bg-opacity-20' 
                    : 'border-gray-600 hover:border-gray-500'}
                  ${file ? 'bg-green-900 bg-opacity-10 border-green-700' : ''}
                `}
              >
                <input {...getInputProps()} />
                
                {file ? (
                  <div className="space-y-2">
                    <LuFile className="mx-auto h-12 w-12 text-green-500" />
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-gray-400 text-sm">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileChange(null);
                      }}
                      className="text-red-400 text-sm hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <LuFileInput className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-gray-300">
                      {isDragActive
                        ? "Drop the file here"
                        : "Drag and drop a file, or click to select"}
                    </p>
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
                </select>
              </div>
              
              {/* Encryption key */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Encryption Key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <LuKey className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="Enter a strong encryption key"
                    className="w-full rounded-md bg-gray-800 border-gray-700 text-white focus:border-blue-500 focus:ring-blue-500 pl-10"
                  />
                </div>
              </div>
              
              {/* Show advanced parameters */}
              <div className="pt-2">
                <EncryptionParameters
                  algorithm={algorithm}
                  params={params}
                  onChange={setParams}
                />
              </div>
              
              {/* Encrypt button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleEncryptFile}
                  disabled={!file || !key || isEncrypting}
                  className={`
                    w-full flex items-center justify-center px-4 py-3 rounded-md font-medium 
                    ${!file || !key || isEncrypting
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  <LuLock className="mr-2 h-5 w-5" />
                  {isEncrypting ? 'Encrypting...' : 'Encrypt File'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Encrypted data input for decryption */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Encrypted Data
                </label>
                <textarea
                  value={encryptedData || ''}
                  onChange={(e) => handleEncryptedDataChange(e.target.value)}
                  placeholder="Paste encrypted data here..."
                  rows={10}
                  className="w-full rounded-md bg-gray-800 border-gray-700 text-white focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-400">
                  Or
                </p>
                <div
                  {...getRootProps()}
                  className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-gray-500"
                >
                  <input {...getInputProps()} />
                  <p className="text-gray-300 text-sm">
                    Drop encrypted file or click to select
                  </p>
                </div>
              </div>
              
              {/* Decryption key */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Decryption Key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <LuKey className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="Enter the decryption key"
                    className="w-full rounded-md bg-gray-800 border-gray-700 text-white focus:border-blue-500 focus:ring-blue-500 pl-10"
                  />
                </div>
              </div>
              
              {/* Decrypt button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleDecryptFile}
                  disabled={!encryptedData || !key || isDecrypting}
                  className={`
                    w-full flex items-center justify-center px-4 py-3 rounded-md font-medium 
                    ${!encryptedData || !key || isDecrypting
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  <LuFileSymlink className="mr-2 h-5 w-5" />
                  {isDecrypting ? 'Decrypting...' : 'Decrypt File'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div>
          {/* Results area */}
          <div className="bg-gray-800 rounded-lg p-4 h-full">
            <h3 className="text-lg font-medium text-white mb-4">
              {mode === 'encrypt' ? 'Encryption' : 'Decryption'} Results
            </h3>
            
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
            
            {/* Result details */}
            {mode === 'encrypt' && (
              <>
                {file && (
                  <div className="mb-4 p-3 bg-gray-700 rounded-md">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">File:</span> {file.name}
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">Size:</span> {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">Type:</span> {file.type || 'Unknown'}
                    </p>
                  </div>
                )}
                
                {progress === 100 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-900 bg-opacity-20 border border-green-800 rounded-md">
                      <p className="text-green-400 font-medium">
                        Encryption completed successfully!
                      </p>
                      {file && (
                        <p className="text-sm text-gray-300 mt-1">
                          <span className="font-medium">Original:</span> {file.name}
                        </p>
                      )}
                      <p className="text-sm text-gray-300">
                        <span className="font-medium">Algorithm:</span> {algorithm}
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleDownloadEncrypted}
                      className="w-full flex items-center justify-center px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800"
                    >
                      <LuDownload className="mr-2 h-5 w-5" />
                      Download Encrypted File
                    </button>
                  </div>
                )}
              </>
            )}
            
            {mode === 'decrypt' && (
              <>
                {progress === 100 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-900 bg-opacity-20 border border-green-800 rounded-md">
                      <p className="text-green-400 font-medium">
                        Decryption completed successfully!
                      </p>
                      {file && (
                        <p className="text-sm text-gray-300 mt-1">
                          <span className="font-medium">File:</span> {file.name.replace('.encrypted', '')}
                        </p>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleDownloadDecrypted}
                      className="w-full flex items-center justify-center px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800"
                    >
                      <LuDownload className="mr-2 h-5 w-5" />
                      Download Decrypted File
                    </button>
                  </div>
                )}
              </>
            )}
            
            {/* Empty state */}
            {progress === 0 && !isEncrypting && !isDecrypting && (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">
                  {mode === 'encrypt' 
                    ? 'Select a file and provide a key to encrypt'
                    : 'Paste encrypted data and provide the key to decrypt'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 