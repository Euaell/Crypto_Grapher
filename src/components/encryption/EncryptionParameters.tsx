"use client";

import React from 'react';
import { 
  EncryptionAlgorithm, 
  EncryptionMode, 
  PaddingMethod, 
  EncryptionParams,
  recommendKeySize
} from '@/lib/crypto/encryption-service';

interface EncryptionParametersProps {
  algorithm: EncryptionAlgorithm;
  params: EncryptionParams;
  onChange: (params: EncryptionParams) => void;
}

export function EncryptionParameters({
  algorithm,
  params,
  onChange
}: EncryptionParametersProps) {
  // Get supported modes for the current algorithm
  const getSupportedModes = (): EncryptionMode[] => {
    // Some algorithms don't support all modes
    switch (algorithm) {
      case EncryptionAlgorithm.AES:
        return Object.values(EncryptionMode);
      case EncryptionAlgorithm.DES:
      case EncryptionAlgorithm.TripleDES:
        return [
          EncryptionMode.ECB,
          EncryptionMode.CBC,
          EncryptionMode.CFB,
          EncryptionMode.OFB
        ];
      case EncryptionAlgorithm.Rabbit:
      case EncryptionAlgorithm.RC4:
        return [EncryptionMode.ECB]; // Stream ciphers typically use ECB-like mode
      case EncryptionAlgorithm.OTP:
        return []; // OTP doesn't use block cipher modes
      default:
        return Object.values(EncryptionMode);
    }
  };

  // Get supported padding methods for the current algorithm
  const getSupportedPadding = (): PaddingMethod[] => {
    switch (algorithm) {
      case EncryptionAlgorithm.AES:
      case EncryptionAlgorithm.DES:
      case EncryptionAlgorithm.TripleDES:
        return Object.values(PaddingMethod);
      case EncryptionAlgorithm.Rabbit:
      case EncryptionAlgorithm.RC4:
      case EncryptionAlgorithm.OTP:
        return []; // Stream ciphers and OTP don't use padding
      default:
        return Object.values(PaddingMethod);
    }
  };

  // Check if an algorithm supports IV
  const supportsIV = (): boolean => {
    return [
      EncryptionAlgorithm.AES,
      EncryptionAlgorithm.DES,
      EncryptionAlgorithm.TripleDES
    ].includes(algorithm) && 
    [
      EncryptionMode.CBC,
      EncryptionMode.CFB,
      EncryptionMode.OFB,
      EncryptionMode.CTR
    ].includes(params.mode as EncryptionMode);
  };

  // Check if an algorithm supports key derivation
  const supportsKeyDerivation = (): boolean => {
    return [
      EncryptionAlgorithm.AES,
      EncryptionAlgorithm.DES,
      EncryptionAlgorithm.TripleDES
    ].includes(algorithm);
  };

  // Handle change of a parameter
  const handleParamChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const newParams = { ...params, [name]: value };
    
    // Handle numeric values
    if (name === 'iterations' || name === 'keySize') {
      newParams[name] = parseInt(value, 10);
    }
    
    onChange(newParams);
  };

  // Get recommended key size
  const recommendedKeySize = recommendKeySize(algorithm);

  // Check if this algorithm has any parameters to customize
  const hasParameters = (): boolean => {
    return (
      getSupportedModes().length > 0 ||
      getSupportedPadding().length > 0 ||
      supportsIV() ||
      supportsKeyDerivation()
    );
  };

  if (!hasParameters()) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg text-gray-300">
        <p>This algorithm does not have customizable parameters.</p>
        {algorithm === EncryptionAlgorithm.OTP && (
          <p className="mt-2 text-yellow-400">
            Note: One-Time Pad requires a key at least as long as the message for
            perfect secrecy.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg space-y-4">
      <h3 className="text-lg font-medium text-white">Customize Parameters</h3>
      
      {/* Mode of Operation */}
      {getSupportedModes().length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Mode of Operation
          </label>
          <select
            name="mode"
            value={params.mode || EncryptionMode.CBC}
            onChange={handleParamChange}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
          >
            {getSupportedModes().map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          {params.mode === EncryptionMode.ECB && (
            <p className="mt-1 text-sm text-red-400">
              Warning: ECB mode is not recommended for secure applications.
            </p>
          )}
        </div>
      )}
      
      {/* Padding Method */}
      {getSupportedPadding().length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Padding Method
          </label>
          <select
            name="padding"
            value={params.padding || PaddingMethod.PKCS7}
            onChange={handleParamChange}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
          >
            {getSupportedPadding().map((padding) => (
              <option key={padding} value={padding}>
                {padding}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Initialization Vector */}
      {supportsIV() && (
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Initialization Vector (IV)
          </label>
          <input
            type="text"
            name="iv"
            value={params.iv || ''}
            onChange={handleParamChange}
            placeholder="Leave empty for random IV"
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-400">
            Optional: IV should be unique but doesn't need to be secret.
          </p>
        </div>
      )}
      
      {/* Key Derivation Parameters */}
      {supportsKeyDerivation() && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Iterations (PBKDF2)
            </label>
            <input
              type="number"
              name="iterations"
              value={params.iterations || 1000}
              onChange={handleParamChange}
              min={1}
              max={100000}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-400">
              Higher values increase security but take longer to process.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Key Size (bits ÷ 32)
            </label>
            <input
              type="number"
              name="keySize"
              value={params.keySize || recommendedKeySize / 32}
              onChange={handleParamChange}
              min={4}
              max={16}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-400">
              Recommended: {recommendedKeySize} bits ({recommendedKeySize / 32})
            </p>
          </div>
        </>
      )}
      
      {/* Security Recommendations */}
      <div className="mt-4 p-3 bg-blue-900 bg-opacity-50 rounded-md">
        <h4 className="text-sm font-bold text-blue-300">Security Recommendations</h4>
        <ul className="mt-1 text-xs text-blue-200 list-disc list-inside">
          {algorithm === EncryptionAlgorithm.AES && (
            <>
              <li>AES-256 in GCM mode provides authenticated encryption.</li>
              <li>Use a random IV for each encryption operation.</li>
            </>
          )}
          {algorithm === EncryptionAlgorithm.DES && (
            <li className="text-yellow-300">
              DES is considered insecure. Consider using AES instead.
            </li>
          )}
          {algorithm === EncryptionAlgorithm.TripleDES && (
            <li>
              TripleDES is slower than AES but still considered secure for legacy applications.
            </li>
          )}
          {algorithm === EncryptionAlgorithm.RC4 && (
            <li className="text-red-300">
              RC4 is cryptographically broken. Use for educational purposes only.
            </li>
          )}
          <li>Never reuse keys for multiple messages.</li>
          <li>Store keys securely and never in plain text.</li>
        </ul>
      </div>
    </div>
  );
} 