"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  LuLock, 
  LuFileSymlink, 
  LuChevronRight,
  LuGithub,
  LuDownload
} from 'react-icons/lu';
import { BiBarChart } from 'react-icons/bi';

// Type definition for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function Landing() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  // Handle PWA install prompts
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the saved prompt
    setDeferredPrompt(null);
  };

  return (
    <div className="w-full">
      {/* Hero section */}
      <div className="py-12 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Crypto<span className="text-blue-600">Grapher</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          A modern encryption tool with advanced visualization, multiple algorithms, and file encryption capabilities.
        </p>
        
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg inline-flex items-center"
          >
            <LuDownload className="mr-2" />
            Install as App
          </button>
        )}
      </div>
      
      {/* Feature blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 py-8">
        <Link href="/" className="block group">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
              <LuLock className="h-7 w-7 text-blue-600 dark:text-blue-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Text Encryption
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 flex-grow">
              Encrypt and decrypt text with multiple algorithms. Visualize the encryption process in real-time.
            </p>
            <div className="flex items-center text-blue-600 dark:text-blue-400">
              <span className="font-medium">Try it now</span>
              <LuChevronRight className="ml-1 group-hover:ml-2 transition-all duration-300" />
            </div>
          </div>
        </Link>
        
        <Link href="/file" className="block group">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
              <LuFileSymlink className="h-7 w-7 text-green-600 dark:text-green-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
              File Encryption
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 flex-grow">
              Secure your files with strong encryption. Upload, encrypt, and download with intuitive controls.
            </p>
            <div className="flex items-center text-green-600 dark:text-green-400">
              <span className="font-medium">Encrypt files</span>
              <LuChevronRight className="ml-1 group-hover:ml-2 transition-all duration-300" />
            </div>
          </div>
        </Link>
        
        <Link href="/compare" className="block group">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
              <BiBarChart className="h-7 w-7 text-purple-600 dark:text-purple-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Algorithm Comparison
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 flex-grow">
              Compare different encryption algorithms by security, speed, and key size. Make informed choices.
            </p>
            <div className="flex items-center text-purple-600 dark:text-purple-400">
              <span className="font-medium">Compare now</span>
              <LuChevronRight className="ml-1 group-hover:ml-2 transition-all duration-300" />
            </div>
          </div>
        </Link>
      </div>
      
      {/* Key features highlight */}
      <div className="bg-gray-50 dark:bg-gray-900 py-12 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
            Key Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Advanced Visualization
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Watch encryption happen in real-time with algorithm-specific visualizations that show how your data is transformed.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Multiple Algorithms
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Choose from AES, DES, Triple DES, RC4, Rabbit, One-Time Pad, and more encryption methods.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Customizable Parameters
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Fine-tune your encryption with customizable parameters like mode of operation, padding method, and key size.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                PWA Support
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Install as a standalone application and use even when offline. Perfect for secure encryption on the go.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* GitHub link */}
      <div className="text-center py-12">
        <a 
          href="https://github.com/Euaell/Crypto_Grapher" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <LuGithub className="mr-2 h-5 w-5" />
          View on GitHub
        </a>
        
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          For educational purposes only. Not recommended for sensitive information.
        </p>
      </div>
    </div>
  );
} 