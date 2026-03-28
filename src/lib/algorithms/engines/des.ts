import type {
  AlgorithmEngine,
  VisualizationStep,
  DataBlock,
  Connection,
  Operation,
  AlgorithmMeta,
  InputConfig,
} from '@/lib/algorithms/types';

// ── DES Constants ──────────────────────────────────────────────────────────────

const IP: number[] = [
  58, 50, 42, 34, 26, 18, 10, 2,
  60, 52, 44, 36, 28, 20, 12, 4,
  62, 54, 46, 38, 30, 22, 14, 6,
  64, 56, 48, 40, 32, 24, 16, 8,
  57, 49, 41, 33, 25, 17,  9, 1,
  59, 51, 43, 35, 27, 19, 11, 3,
  61, 53, 45, 37, 29, 21, 13, 5,
  63, 55, 47, 39, 31, 23, 15, 7,
];

const FP: number[] = [
  40, 8, 48, 16, 56, 24, 64, 32,
  39, 7, 47, 15, 55, 23, 63, 31,
  38, 6, 46, 14, 54, 22, 62, 30,
  37, 5, 45, 13, 53, 21, 61, 29,
  36, 4, 44, 12, 52, 20, 60, 28,
  35, 3, 43, 11, 51, 19, 59, 27,
  34, 2, 42, 10, 50, 18, 58, 26,
  33, 1, 41,  9, 49, 17, 57, 25,
];

const E: number[] = [
  32,  1,  2,  3,  4,  5,
   4,  5,  6,  7,  8,  9,
   8,  9, 10, 11, 12, 13,
  12, 13, 14, 15, 16, 17,
  16, 17, 18, 19, 20, 21,
  20, 21, 22, 23, 24, 25,
  24, 25, 26, 27, 28, 29,
  28, 29, 30, 31, 32,  1,
];

const SBOXES: number[][][] = [
  // S1
  [
    [14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7],
    [0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8],
    [4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0],
    [15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
  ],
  // S2
  [
    [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10],
    [3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5],
    [0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15],
    [13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
  ],
  // S3
  [
    [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8],
    [13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1],
    [13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7],
    [1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
  ],
  // S4
  [
    [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15],
    [13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9],
    [10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4],
    [3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
  ],
  // S5
  [
    [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9],
    [14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6],
    [4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14],
    [11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
  ],
  // S6
  [
    [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11],
    [10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8],
    [9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6],
    [4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
  ],
  // S7
  [
    [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1],
    [13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6],
    [1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2],
    [6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
  ],
  // S8
  [
    [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7],
    [1,15,13,8,10,3,7,4,12,5,6,2,0,14,9,11],
    [7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8],
    [2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11],
  ],
];

const P: number[] = [
  16, 7, 20, 21, 29, 12, 28, 17,
   1, 15, 23, 26,  5, 18, 31, 10,
   2, 8, 24, 14, 32, 27,  3,  9,
  19, 13, 30,  6, 22, 11,  4, 25,
];

const PC1: number[] = [
  57, 49, 41, 33, 25, 17,  9,
   1, 58, 50, 42, 34, 26, 18,
  10,  2, 59, 51, 43, 35, 27,
  19, 11,  3, 60, 52, 44, 36,
  63, 55, 47, 39, 31, 23, 15,
   7, 62, 54, 46, 38, 30, 22,
  14,  6, 61, 53, 45, 37, 29,
  21, 13,  5, 28, 20, 12,  4,
];

const PC2: number[] = [
  14, 17, 11, 24,  1,  5,
   3, 28, 15,  6, 21, 10,
  23, 19, 12,  4, 26,  8,
  16,  7, 27, 20, 13,  2,
  41, 52, 31, 37, 47, 55,
  30, 40, 51, 45, 33, 48,
  44, 49, 39, 56, 34, 53,
  46, 42, 50, 36, 29, 32,
];

const ROTATION_SCHEDULE: number[] = [
  1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1,
];

// ── Helper functions ───────────────────────────────────────────────────────────

function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) & 0xff);
  }
  return bytes;
}

function bytesToBits(bytes: number[]): number[] {
  const bits: number[] = [];
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }
  return bits;
}

function bitsToBytes(bits: number[]): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | (bits[i + j] || 0);
    }
    bytes.push(byte);
  }
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function bitsToHex(bits: number[]): string {
  return bytesToHex(bitsToBytes(bits));
}

function padTo64Bits(bytes: number[]): number[] {
  const padded = bytes.slice(0, 8);
  while (padded.length < 8) padded.push(0);
  return padded;
}

function applyPermutation(bits: number[], table: number[]): number[] {
  return table.map(pos => bits[pos - 1] || 0);
}

function xorBits(a: number[], b: number[]): number[] {
  return a.map((bit, i) => bit ^ (b[i] || 0));
}

function leftRotate(bits: number[], count: number): number[] {
  const n = bits.length;
  const c = count % n;
  return [...bits.slice(c), ...bits.slice(0, c)];
}

function applySBoxes(input48: number[]): number[] {
  const output: number[] = [];
  for (let i = 0; i < 8; i++) {
    const chunk = input48.slice(i * 6, i * 6 + 6);
    const row = (chunk[0] << 1) | chunk[5];
    const col = (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4];
    const val = SBOXES[i][row][col];
    for (let b = 3; b >= 0; b--) {
      output.push((val >> b) & 1);
    }
  }
  return output;
}

function generateSubkeys(keyBits: number[]): number[][] {
  const pc1bits = applyPermutation(keyBits, PC1);
  let c = pc1bits.slice(0, 28);
  let d = pc1bits.slice(28, 56);
  const subkeys: number[][] = [];
  for (let i = 0; i < 16; i++) {
    c = leftRotate(c, ROTATION_SCHEDULE[i]);
    d = leftRotate(d, ROTATION_SCHEDULE[i]);
    const cd = [...c, ...d];
    subkeys.push(applyPermutation(cd, PC2));
  }
  return subkeys;
}

// ── Engine ─────────────────────────────────────────────────────────────────────

const meta: AlgorithmMeta = {
  id: 'des',
  name: 'DES',
  category: 'block-cipher',
  description:
    'Data Encryption Standard -- a symmetric 64-bit block cipher with a 56-bit key, standardized by NIST in 1977. Now considered insecure due to short key length.',
  keySize: 56,
  blockSize: 64,
  yearIntroduced: 1975,
  authors: 'IBM / NSA',
  status: 'deprecated',
  color: '#ef4444',
  icon: '🏛️',
};

const inputConfig: InputConfig = {
  type: 'symmetric',
  fields: [
    {
      name: 'plaintext',
      label: 'Plaintext',
      type: 'text',
      placeholder: 'Enter 8-character plaintext',
      required: true,
      defaultValue: 'ABCDEFGH',
      maxLength: 8,
    },
    {
      name: 'key',
      label: 'Key',
      type: 'text',
      placeholder: 'Enter 8-character key',
      required: true,
      defaultValue: '12345678',
      maxLength: 8,
    },
  ],
};

function generateSteps(input: Record<string, string>): VisualizationStep[] {
  const plaintext = input.plaintext || 'ABCDEFGH';
  const key = input.key || '12345678';

  const ptBytes = padTo64Bits(textToBytes(plaintext));
  const keyBytes = padTo64Bits(textToBytes(key));
  const ptBits = bytesToBits(ptBytes);
  const keyBits = bytesToBits(keyBytes);

  const steps: VisualizationStep[] = [];
  let stepIdx = 0;

  // Step 0 - Input
  steps.push({
    id: `des-step-${stepIdx++}`,
    phase: 'input',
    label: 'Input',
    description: `Plaintext: "${plaintext}" and Key: "${key}" are converted to 64-bit binary blocks.`,
    blocks: [
      { id: 'pt', label: 'Plaintext', value: bytesToHex(ptBytes), x: 2, y: 0, z: 0, width: 3, height: 1, color: '#3b82f6', type: 'data' },
      { id: 'key', label: 'Key', value: bytesToHex(keyBytes), x: 7, y: 0, z: 0, width: 3, height: 1, color: '#f59e0b', type: 'key' },
    ],
    connections: [],
    operations: [],
    highlights: ['pt', 'key'],
  });

  // Step 1 - Initial Permutation
  const afterIP = applyPermutation(ptBits, IP);
  steps.push({
    id: `des-step-${stepIdx++}`,
    phase: 'initial-permutation',
    label: 'Initial Permutation (IP)',
    description: `The 64-bit plaintext block is rearranged according to the DES initial permutation table.`,
    blocks: [
      { id: 'pt-in', label: 'Plaintext', value: bytesToHex(ptBytes), x: 2, y: 0, z: 0, width: 3, height: 1, color: '#3b82f6', type: 'data' },
      { id: 'ip-out', label: 'After IP', value: bitsToHex(afterIP), x: 2, y: 2, z: 0, width: 3, height: 1, color: '#6366f1', type: 'intermediate' },
    ],
    connections: [{ from: 'pt-in', to: 'ip-out', animated: true, label: 'IP table' }],
    operations: [{ id: 'op-ip', type: 'permutation', label: 'Initial Permutation', x: 2, y: 1, z: 0, color: '#6366f1' }],
    highlights: ['ip-out'],
  });

  // Key schedule
  const subkeys = generateSubkeys(keyBits);

  // Step 2 - Key Schedule overview
  steps.push({
    id: `des-step-${stepIdx++}`,
    phase: 'key-schedule',
    label: 'Key Schedule (PC-1)',
    description: `The 64-bit key is reduced to 56 bits via PC-1 permutation (parity bits dropped), then split into C₀ and D₀ halves of 28 bits each.`,
    blocks: [
      { id: 'key-in', label: 'Key (64-bit)', value: bytesToHex(keyBytes), x: 5, y: 0, z: 0, width: 3, height: 1, color: '#f59e0b', type: 'key' },
      { id: 'pc1-out', label: 'After PC-1 (56-bit)', value: bitsToHex(applyPermutation(keyBits, PC1)), x: 5, y: 2, z: 0, width: 3, height: 1, color: '#f97316', type: 'intermediate' },
    ],
    connections: [{ from: 'key-in', to: 'pc1-out', animated: true, label: 'PC-1' }],
    operations: [{ id: 'op-pc1', type: 'permutation', label: 'PC-1 Permutation', x: 5, y: 1, z: 0, color: '#f97316' }],
    highlights: ['pc1-out'],
  });

  // Feistel rounds
  let left = afterIP.slice(0, 32);
  let right = afterIP.slice(32, 64);

  for (let round = 0; round < 16; round++) {
    const expanded = applyPermutation(right, E);
    const xored = xorBits(expanded, subkeys[round]);
    const sboxOut = applySBoxes(xored);
    const pboxOut = applyPermutation(sboxOut, P);
    const newRight = xorBits(left, pboxOut);

    const y = round * 0.5;

    const roundBlocks: DataBlock[] = [
      { id: `r${round}-l`, label: `L${round}`, value: bitsToHex(left), x: 1, y, z: 0, width: 2, height: 0.8, color: '#3b82f6', type: 'intermediate' },
      { id: `r${round}-r`, label: `R${round}`, value: bitsToHex(right), x: 4, y, z: 0, width: 2, height: 0.8, color: '#10b981', type: 'intermediate' },
      { id: `r${round}-exp`, label: 'E(R)', value: bitsToHex(expanded).slice(0, 12), x: 7, y: y + 0.3, z: 0, width: 2, height: 0.6, color: '#8b5cf6', type: 'intermediate' },
      { id: `r${round}-sk`, label: `K${round + 1}`, value: bitsToHex(subkeys[round]).slice(0, 12), x: 7, y: y + 1, z: 0, width: 2, height: 0.6, color: '#f59e0b', type: 'key' },
      { id: `r${round}-sbox`, label: 'S-Box Out', value: bitsToHex(sboxOut), x: 7, y: y + 1.7, z: 0, width: 2, height: 0.6, color: '#ef4444', type: 'intermediate' },
      { id: `r${round}-pbox`, label: 'P(S)', value: bitsToHex(pboxOut), x: 4, y: y + 2.2, z: 0, width: 2, height: 0.6, color: '#ec4899', type: 'intermediate' },
      { id: `r${round}-nl`, label: `L${round + 1}`, value: bitsToHex(right), x: 1, y: y + 2.8, z: 0, width: 2, height: 0.8, color: '#3b82f6', type: 'intermediate' },
      { id: `r${round}-nr`, label: `R${round + 1}`, value: bitsToHex(newRight), x: 4, y: y + 2.8, z: 0, width: 2, height: 0.8, color: '#10b981', type: 'intermediate' },
    ];

    const roundConnections: Connection[] = [
      { from: `r${round}-r`, to: `r${round}-exp`, animated: true, label: 'Expand' },
      { from: `r${round}-exp`, to: `r${round}-sbox`, label: 'XOR + S-Box' },
      { from: `r${round}-sk`, to: `r${round}-sbox`, dashed: true, label: 'Subkey' },
      { from: `r${round}-sbox`, to: `r${round}-pbox`, label: 'P-Box' },
      { from: `r${round}-l`, to: `r${round}-nr`, label: 'XOR', dashed: true },
      { from: `r${round}-pbox`, to: `r${round}-nr`, animated: true },
      { from: `r${round}-r`, to: `r${round}-nl`, label: 'Swap' },
    ];

    const roundOps: Operation[] = [
      { id: `r${round}-op-exp`, type: 'expand', label: 'E Expansion', x: 6, y: y + 0.3, z: 0, color: '#8b5cf6' },
      { id: `r${round}-op-xor`, type: 'xor', label: 'XOR', x: 7, y: y + 0.65, z: 0, color: '#f59e0b' },
      { id: `r${round}-op-sbox`, type: 'sbox', label: 'S-Boxes', x: 7, y: y + 1.35, z: 0, color: '#ef4444' },
      { id: `r${round}-op-pbox`, type: 'permutation', label: 'P-Box', x: 5.5, y: y + 1.9, z: 0, color: '#ec4899' },
      { id: `r${round}-op-xor2`, type: 'xor', label: 'XOR', x: 3, y: y + 2.5, z: 0, color: '#3b82f6' },
    ];

    steps.push({
      id: `des-step-${stepIdx++}`,
      phase: `round-${round + 1}`,
      label: `Round ${round + 1}`,
      description: `Feistel round ${round + 1}: Expand R${round} from 32 to 48 bits, XOR with subkey K${round + 1} (${bitsToHex(subkeys[round]).slice(0, 12)}), apply 8 S-boxes (6-bit to 4-bit), P-box permutation, then XOR with L${round}.`,
      blocks: roundBlocks,
      connections: roundConnections,
      operations: roundOps,
      highlights: [`r${round}-nr`, `r${round}-sk`],
    });

    left = right;
    right = newRight;
  }

  // Final swap (R16 || L16) then Final Permutation
  const preOutput = [...right, ...left]; // note: right then left after 16 rounds
  const cipherBits = applyPermutation(preOutput, FP);
  const cipherHex = bitsToHex(cipherBits);

  steps.push({
    id: `des-step-${stepIdx++}`,
    phase: 'final-permutation',
    label: 'Final Permutation (FP)',
    description: `After 16 rounds the halves are combined as R16||L16 (32-bit swap) and the final permutation is applied to produce the ciphertext.`,
    blocks: [
      { id: 'pre-fp', label: 'R16 || L16', value: bitsToHex(preOutput), x: 2, y: 0, z: 0, width: 3, height: 1, color: '#6366f1', type: 'intermediate' },
      { id: 'ciphertext', label: 'Ciphertext', value: cipherHex, x: 2, y: 2, z: 0, width: 3, height: 1, color: '#ef4444', type: 'output' },
    ],
    connections: [{ from: 'pre-fp', to: 'ciphertext', animated: true, label: 'FP table' }],
    operations: [{ id: 'op-fp', type: 'permutation', label: 'Final Permutation', x: 2, y: 1, z: 0, color: '#ef4444' }],
    highlights: ['ciphertext'],
  });

  return steps;
}

const desEngine: AlgorithmEngine = {
  meta,
  inputConfig,
  generateSteps,
};

export default desEngine;
