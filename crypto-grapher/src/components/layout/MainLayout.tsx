"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '../ui/theme-toggle';
import { 
  LuLock, 
  LuFileSymlink, 
  LuGithub, 
  LuMenu, 
  LuX 
} from 'react-icons/lu';
import { BiBarChart } from 'react-icons/bi';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { name: 'Text Encryption', href: '/', icon: LuLock },
    { name: 'File Encryption', href: '/file', icon: LuFileSymlink },
    { name: 'Algorithm Comparison', href: '/compare', icon: BiBarChart },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center">
                  <LuLock className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                  <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                    Crypto Grapher
                  </span>
                </Link>
              </div>

              {/* Desktop navigation */}
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-4">
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`
                        flex items-center px-3 py-2 rounded-md text-sm font-medium
                        ${isActive 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center">
              {/* Theme toggle */}
              <ThemeToggle />

              {/* GitHub link */}
              <a
                href="https://github.com/yourusername/crypto-grapher"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <LuGithub className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </a>

              {/* Mobile menu button */}
              <div className="flex sm:hidden ml-4">
                <button
                  onClick={toggleMobileMenu}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  {isMobileMenuOpen ? (
                    <LuX className="h-6 w-6" />
                  ) : (
                    <LuMenu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`sm:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm font-medium
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            <p>
              &copy; {new Date().getFullYear()} Crypto Grapher.
              All rights reserved.
            </p>
            <p className="mt-2">
              Designed for secure encryption and decryption of data.
              Not for production use in critical security applications.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 