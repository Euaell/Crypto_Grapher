"use client";

import { MainLayout } from '@/components/layout/MainLayout';
import { AlgorithmComparison } from '@/components/visualization/AlgorithmComparison';

// This explicitly configures the page for client-side only rendering
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // This ensures we're not trying to use Node.js APIs in this page

export default function ComparePage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Algorithm Comparison
        </h1>
        
        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Encryption Algorithm Performance & Security
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Compare the different encryption algorithms based on their performance, security level, 
            key size requirements, and historical significance. This comparison helps you choose 
            the right algorithm for your specific encryption needs.
          </p>
          
          <AlgorithmComparison />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Symmetric vs Asymmetric
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              <span className="font-medium">Symmetric encryption</span> uses the same key for 
              encryption and decryption. It&apos;s fast and efficient for large data but requires 
              secure key exchange.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Asymmetric encryption</span> uses a pair of keys 
              (public and private). It&apos;s slower but solves the key distribution problem and 
              enables features like digital signatures.
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Block vs Stream Ciphers
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              <span className="font-medium">Block ciphers</span> (AES, DES, 3DES) encrypt fixed-size 
              blocks of data. They&apos;re versatile and can operate in different modes.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Stream ciphers</span> (RC4, ChaCha20) encrypt data 
              one bit or byte at a time. They&apos;re typically faster and have less complexity, 
              but can be vulnerable if misused.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-md mt-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Choosing the Right Algorithm
          </h2>
          <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 space-y-2">
            <li>
              <span className="font-medium">For general use</span>: AES-256 is the industry standard, 
              offering excellent security and performance.
            </li>
            <li>
              <span className="font-medium">For legacy systems</span>: 3DES provides backwards 
              compatibility while maintaining reasonable security.
            </li>
            <li>
              <span className="font-medium">For high-speed applications</span>: ChaCha20 or Rabbit 
              offer excellent performance while maintaining good security.
            </li>
            <li>
              <span className="font-medium">Avoid</span>: DES and RC4 are considered cryptographically 
              broken and should not be used for sensitive information.
            </li>
            <li>
              <span className="font-medium">One-Time Pad</span>: Theoretically unbreakable but 
              impractical for most applications due to key management issues.
            </li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
} 