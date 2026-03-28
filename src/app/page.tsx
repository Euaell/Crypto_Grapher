'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { algorithmCatalog } from '@/lib/algorithms/registry';
import { AlgorithmCategory } from '@/lib/algorithms/types';
import AlgorithmCard from '@/components/catalog/AlgorithmCard';
import CategoryFilter from '@/components/catalog/CategoryFilter';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<AlgorithmCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    algorithmCatalog.forEach((a) => {
      c[a.category] = (c[a.category] || 0) + 1;
    });
    return c;
  }, []);

  const filtered = useMemo(() => {
    return algorithmCatalog.filter((a) => {
      if (selectedCategory && a.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.authors.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Header */}
      <header className="relative border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold shadow-lg shadow-blue-500/20">
                C
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Crypto Grapher
                </h1>
                <p className="text-[10px] text-gray-500 -mt-0.5">Interactive Cryptographic Visualizer</p>
              </div>
            </div>

            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/" className="text-white font-medium">Algorithms</Link>
              <Link href="/compare" className="text-gray-500 hover:text-gray-300 transition-colors">Compare</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Cryptographic Algorithm
            </span>
            <br />
            <span className="text-white">Visualization Lab</span>
          </h2>
          <p className="text-gray-400 text-sm max-w-xl">
            Explore {algorithmCatalog.length} algorithms with interactive 3D visualizations.
            Watch each step execute in real-time, zoom into operations, and understand how cryptography works.
          </p>
        </motion.div>

        {/* Search + Filter */}
        <div className="space-y-4 mb-8">
          <div className="relative max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search algorithms..."
              className="w-full bg-gray-900/80 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 border border-gray-800 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
            />
          </div>

          <CategoryFilter
            selected={selectedCategory}
            onChange={setSelectedCategory}
            counts={counts}
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((algo, idx) => (
            <AlgorithmCard key={algo.id} algorithm={algo} index={idx} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <p className="text-lg">No algorithms found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        )}

        {/* Stats footer */}
        <div className="mt-16 pt-8 border-t border-gray-800/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Algorithms', value: algorithmCatalog.length },
              { label: 'Categories', value: Object.keys(counts).length },
              { label: 'Standards', value: algorithmCatalog.filter(a => a.status === 'standard').length },
              { label: 'Interactive Demos', value: algorithmCatalog.length },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
