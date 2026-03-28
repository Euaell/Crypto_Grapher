'use client';

import { AlgorithmCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/algorithms/types';

interface CategoryFilterProps {
  selected: AlgorithmCategory | null;
  onChange: (category: AlgorithmCategory | null) => void;
  counts: Record<string, number>;
}

const categories: (AlgorithmCategory | null)[] = [
  null,
  'block-cipher',
  'stream-cipher',
  'hash-function',
  'asymmetric',
  'key-exchange',
  'mac',
  'key-derivation',
];

export default function CategoryFilter({ selected, onChange, counts }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isActive = selected === cat;
        const label = cat ? CATEGORY_LABELS[cat] : 'All';
        const count = cat ? (counts[cat] || 0) : Object.values(counts).reduce((a, b) => a + b, 0);
        const color = cat ? CATEGORY_COLORS[cat] : '#6b7280';

        return (
          <button
            key={cat ?? 'all'}
            onClick={() => onChange(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
              isActive
                ? 'text-white border-transparent shadow-lg'
                : 'bg-gray-900/50 text-gray-400 border-gray-800 hover:border-gray-600 hover:text-gray-300'
            }`}
            style={isActive ? {
              backgroundColor: `${color}30`,
              borderColor: `${color}60`,
              color: color,
              boxShadow: `0 2px 10px ${color}20`,
            } : undefined}
          >
            {label}
            <span className="ml-1.5 opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
