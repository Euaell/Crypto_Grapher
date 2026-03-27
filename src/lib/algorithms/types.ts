// Core types for the cryptographic visualization system

export type AlgorithmCategory =
  | 'block-cipher'
  | 'stream-cipher'
  | 'hash-function'
  | 'asymmetric'
  | 'key-derivation'
  | 'mac'
  | 'key-exchange';

export interface AlgorithmMeta {
  id: string;
  name: string;
  category: AlgorithmCategory;
  description: string;
  keySize: number | string; // bits, or description like "variable"
  blockSize?: number; // bits
  yearIntroduced: number;
  authors: string;
  status: 'standard' | 'recommended' | 'legacy' | 'deprecated' | 'theoretical';
  standardBody?: string;
  color: string; // Theme color for the visualization
  icon: string; // Emoji icon
}

export interface InputConfig {
  type: 'symmetric' | 'asymmetric' | 'hash' | 'kdf' | 'mac';
  fields: InputField[];
}

export interface InputField {
  name: string;
  label: string;
  type: 'text' | 'hex' | 'file' | 'number' | 'select';
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string;
  maxLength?: number;
}

// Visualization step system
export interface VisualizationStep {
  id: string;
  phase: string;
  label: string;
  description: string;
  blocks: DataBlock[];
  connections: Connection[];
  operations: Operation[];
  highlights: string[];
}

export interface DataBlock {
  id: string;
  label: string;
  value: string; // hex or text representation
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  color: string;
  type: 'data' | 'key' | 'intermediate' | 'output' | 'operation' | 'constant';
  group?: string;
  fontSize?: number;
  opacity?: number;
}

export interface Connection {
  from: string;
  to: string;
  color?: string;
  animated?: boolean;
  label?: string;
  dashed?: boolean;
}

export interface Operation {
  id: string;
  type: 'xor' | 'sbox' | 'permutation' | 'shift' | 'mix' | 'add' | 'multiply' | 'modexp' | 'hash' | 'pad' | 'expand' | 'compress' | 'rotate' | 'substitute';
  label: string;
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface AlgorithmEngine {
  meta: AlgorithmMeta;
  inputConfig: InputConfig;
  generateSteps(input: Record<string, string>): VisualizationStep[];
}

export const CATEGORY_LABELS: Record<AlgorithmCategory, string> = {
  'block-cipher': 'Block Ciphers',
  'stream-cipher': 'Stream Ciphers',
  'hash-function': 'Hash Functions',
  'asymmetric': 'Asymmetric / Public Key',
  'key-derivation': 'Key Derivation',
  'mac': 'Message Authentication',
  'key-exchange': 'Key Exchange',
};

export const CATEGORY_COLORS: Record<AlgorithmCategory, string> = {
  'block-cipher': '#3b82f6',
  'stream-cipher': '#8b5cf6',
  'hash-function': '#10b981',
  'asymmetric': '#f59e0b',
  'key-derivation': '#ef4444',
  'mac': '#06b6d4',
  'key-exchange': '#ec4899',
};
