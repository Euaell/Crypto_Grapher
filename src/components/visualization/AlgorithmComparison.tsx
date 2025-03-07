"use client";

import React, { useState, useEffect } from 'react';
import { EncryptionAlgorithm } from '@/lib/crypto/encryption-service';
import { AlgorithmStat, baseStats } from '@/lib/base-data';

interface ComparisonProps {
  results?: {
    algorithm: string;
    timeTaken: number;
  }[];
}

export function AlgorithmComparison({ results = [] }: ComparisonProps) {
  const [sortBy, setSortBy] = useState<keyof AlgorithmStat>('algorithm');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Merge real results with base stats
  const [stats, setStats] = useState<AlgorithmStat[]>(baseStats);
  
  useEffect(() => {
    if (results.length > 0) {
      const newStats = [...baseStats];
      
      // Update stats with real timing results
      for (const result of results) {
        const statIndex = newStats.findIndex(s => 
          s.algorithm === result.algorithm as EncryptionAlgorithm
        );
        
        if (statIndex !== -1) {
          // Normalize the timing result
          const normalizedSpeed = Math.max(1, Math.min(20, result.timeTaken / 10));
          newStats[statIndex] = {
            ...newStats[statIndex],
            speed: normalizedSpeed
          };
        }
      }
      
      setStats(newStats);
    }
  }, [results]);
  
  // Handle sorting
  const handleSort = (column: keyof AlgorithmStat) => {
    if (sortBy === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortBy(column);
      setSortDirection('asc');
    }
  };
  
  // Sort the stats
  const sortedStats = [...stats].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    }
    
    return 0;
  });
  
  // Get color for security rating
  const getSecurityColor = (rating: number): string => {
    if (rating >= 90) return 'bg-green-500';
    if (rating >= 70) return 'bg-green-400';
    if (rating >= 50) return 'bg-yellow-400';
    return 'bg-red-500';
  };
  
  // Get text for key size
  const getKeySizeText = (size: number): string => {
    if (size === Infinity) return 'Variable (1:1)';
    return `${size} bits`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="text-xs uppercase bg-gray-700 text-gray-400">
          <tr>
            <th 
              className="px-6 py-3 cursor-pointer" 
              onClick={() => handleSort('algorithm')}
            >
              Algorithm {sortBy === 'algorithm' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-6 py-3 cursor-pointer" 
              onClick={() => handleSort('speed')}
            >
              Speed {sortBy === 'speed' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-6 py-3 cursor-pointer" 
              onClick={() => handleSort('security')}
            >
              Security {sortBy === 'security' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-6 py-3 cursor-pointer" 
              onClick={() => handleSort('keySize')}
            >
              Key Size {sortBy === 'keySize' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-6 py-3 cursor-pointer" 
              onClick={() => handleSort('yearIntroduced')}
            >
              Year {sortBy === 'yearIntroduced' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-6 py-3 cursor-pointer" 
              onClick={() => handleSort('standardStatus')}
            >
              Status {sortBy === 'standardStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedStats.map((stat) => (
            <tr 
              key={stat.algorithm} 
              className="bg-gray-800 border-b border-gray-700 hover:bg-gray-600"
            >
              <td className="px-6 py-4 font-medium text-white">
                {stat.algorithm}
              </td>
              <td className="px-6 py-4">
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${100 - (stat.speed * 5)}%` }}
                  ></div>
                </div>
                <span className="text-xs mt-1 block">
                  {stat.speed <= 3 ? 'Fast' : stat.speed <= 10 ? 'Medium' : 'Slow'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className={`${getSecurityColor(stat.security)} h-2.5 rounded-full`} 
                    style={{ width: `${stat.security}%` }}
                  ></div>
                </div>
                <span className="text-xs mt-1 block">{stat.security}/100</span>
              </td>
              <td className="px-6 py-4">
                {getKeySizeText(stat.keySize)}
              </td>
              <td className="px-6 py-4">
                {stat.yearIntroduced}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  stat.standardStatus === 'Deprecated' ? 'bg-red-900 text-red-300' :
                  stat.standardStatus === 'Legacy' ? 'bg-yellow-900 text-yellow-300' :
                  stat.standardStatus === 'NIST Standard' ? 'bg-green-900 text-green-300' :
                  'bg-blue-900 text-blue-300'
                }`}>
                  {stat.standardStatus}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 