'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlgorithmCatalogEntry } from '@/lib/algorithms/registry';

const statusColors: Record<string, string> = {
  standard: 'bg-green-500/20 text-green-400 border-green-500/30',
  recommended: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  legacy: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  deprecated: 'bg-red-500/20 text-red-400 border-red-500/30',
  theoretical: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

interface AlgorithmCardProps {
  algorithm: AlgorithmCatalogEntry;
  index: number;
}

export default function AlgorithmCard({ algorithm, index }: AlgorithmCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link href={`/visualize/${algorithm.id}`}>
        <div
          className="group relative bg-gray-900/80 backdrop-blur border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-all duration-300 cursor-pointer overflow-hidden h-full"
          style={{
            ['--algo-color' as string]: algorithm.color,
          }}
        >
          {/* Glow effect */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${algorithm.color}15, transparent 70%)`,
            }}
          />

          {/* Top bar accent */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ background: `linear-gradient(90deg, transparent, ${algorithm.color}, transparent)` }}
          />

          <div className="relative">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{algorithm.icon}</span>
                <div>
                  <h3 className="text-white font-bold text-base group-hover:text-white/90 transition-colors">
                    {algorithm.name}
                  </h3>
                  <span className="text-xs text-gray-500">{algorithm.yearIntroduced}</span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[algorithm.status]}`}>
                {algorithm.status}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">
              {algorithm.description}
            </p>

            {/* Metadata */}
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                Key: {typeof algorithm.keySize === 'number' ? `${algorithm.keySize}-bit` : algorithm.keySize}
              </span>
              {algorithm.blockSize && (
                <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                  Block: {algorithm.blockSize}-bit
                </span>
              )}
              {algorithm.standardBody && (
                <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                  {algorithm.standardBody}
                </span>
              )}
            </div>

            {/* Authors */}
            <div className="mt-2 text-[10px] text-gray-600">
              by {algorithm.authors}
            </div>

            {/* Arrow */}
            <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
