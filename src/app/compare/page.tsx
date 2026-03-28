'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { algorithmCatalog } from '@/lib/algorithms/registry';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/algorithms/types';

export const dynamic = 'force-dynamic';

type SortKey = 'name' | 'year' | 'keySize' | 'status' | 'category';

const statusOrder: Record<string, number> = {
  standard: 0, recommended: 1, legacy: 2, deprecated: 3, theoretical: 4,
};

const statusColors: Record<string, string> = {
  standard: 'text-green-400',
  recommended: 'text-blue-400',
  legacy: 'text-yellow-400',
  deprecated: 'text-red-400',
  theoretical: 'text-purple-400',
};

export default function ComparePage() {
  const [sortBy, setSortBy] = useState<SortKey>('category');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    return [...algorithmCatalog].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'year': cmp = a.yearIntroduced - b.yearIntroduced; break;
        case 'keySize': {
          const ka = typeof a.keySize === 'number' ? a.keySize : 0;
          const kb = typeof b.keySize === 'number' ? b.keySize : 0;
          cmp = ka - kb; break;
        }
        case 'status': cmp = statusOrder[a.status] - statusOrder[b.status]; break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [sortBy, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors select-none"
      onClick={() => toggleSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortBy === sortKey && (
          <span className="text-blue-400">{sortAsc ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-500 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold">Algorithm Comparison</h1>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors">Algorithms</Link>
              <Link href="/compare" className="text-white font-medium">Compare</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-gray-400 text-sm mb-6">
            Compare all {algorithmCatalog.length} algorithms side by side. Click any row to explore its visualization.
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full">
              <thead className="bg-gray-900/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 w-8"></th>
                  <SortHeader label="Algorithm" sortKey="name" />
                  <SortHeader label="Category" sortKey="category" />
                  <SortHeader label="Year" sortKey="year" />
                  <SortHeader label="Key Size" sortKey="keySize" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Block Size</th>
                  <SortHeader label="Status" sortKey="status" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Authors</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((algo, i) => (
                  <tr
                    key={algo.id}
                    className="border-t border-gray-800/50 hover:bg-gray-900/50 transition-colors group"
                  >
                    <td className="px-4 py-3 text-lg">{algo.icon}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-white">{algo.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[algo.category]}20`,
                          color: CATEGORY_COLORS[algo.category],
                        }}
                      >
                        {CATEGORY_LABELS[algo.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{algo.yearIntroduced}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {typeof algo.keySize === 'number' ? `${algo.keySize}-bit` : algo.keySize}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {algo.blockSize ? `${algo.blockSize}-bit` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs capitalize ${statusColors[algo.status]}`}>
                        {algo.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{algo.authors}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/visualize/${algo.id}`}
                        className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white"
                      >
                        Visualize →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
