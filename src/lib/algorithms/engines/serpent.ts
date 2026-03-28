import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function textToBytes(text: string, len: number): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xff);
  while (bytes.length < len) bytes.push(0);
  return bytes.slice(0, len);
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function toU32(n: number): number { return n >>> 0; }

function rotl(x: number, n: number): number {
  return toU32((x << n) | (x >>> (32 - n)));
}

// Serpent S-boxes (8 different 4-bit S-boxes, here simplified to operate on 32-bit words)
function sBox(index: number, x: number): number {
  // Simplified S-box: mix bits based on index
  const tables = [
    [3, 8, 15, 1, 10, 6, 5, 11, 14, 13, 4, 2, 7, 0, 9, 12],
    [15, 12, 2, 7, 9, 0, 5, 10, 1, 11, 14, 8, 6, 13, 3, 4],
    [8, 6, 7, 9, 3, 12, 10, 15, 13, 1, 14, 4, 0, 11, 5, 2],
    [0, 15, 11, 8, 12, 9, 6, 3, 13, 1, 2, 4, 10, 7, 5, 14],
    [1, 15, 8, 3, 12, 0, 11, 6, 2, 5, 4, 10, 9, 14, 7, 13],
    [15, 5, 2, 11, 4, 10, 9, 12, 0, 3, 14, 8, 13, 6, 7, 1],
    [7, 2, 12, 5, 8, 4, 6, 11, 14, 9, 1, 15, 13, 3, 10, 0],
    [1, 13, 15, 0, 14, 8, 2, 11, 7, 4, 12, 10, 9, 3, 5, 6],
  ];
  const table = tables[index % 8];
  let result = 0;
  for (let i = 0; i < 8; i++) {
    const nibble = (x >>> (i * 4)) & 0xf;
    result |= table[nibble] << (i * 4);
  }
  return toU32(result);
}

// Linear transformation
function linearTransform(x0: number, x1: number, x2: number, x3: number): [number, number, number, number] {
  x0 = rotl(x0, 13);
  x2 = rotl(x2, 3);
  x1 = toU32(x1 ^ x0 ^ x2);
  x3 = toU32(x3 ^ x2 ^ (x0 << 3));
  x1 = rotl(x1, 1);
  x3 = rotl(x3, 7);
  x0 = toU32(x0 ^ x1 ^ x3);
  x2 = toU32(x2 ^ x3 ^ (x1 << 7));
  x0 = rotl(x0, 5);
  x2 = rotl(x2, 22);
  return [x0, x1, x2, x3];
}

const serpentEngine: AlgorithmEngine = {
  meta: {
    id: 'serpent',
    name: 'Serpent',
    category: 'block-cipher',
    description: 'Serpent is a symmetric key block cipher that was an AES finalist. It uses 32 rounds of substitution-permutation operations on a 128-bit block. Designed for maximum security with a conservative approach.',
    keySize: '128-256',
    blockSize: 128,
    yearIntroduced: 1998,
    authors: 'Anderson, Biham, Knudsen',
    status: 'recommended',
    color: '#15803d',
    icon: '🐍',
  },
  inputConfig: {
    type: 'symmetric',
    fields: [
      { name: 'plaintext', label: 'Plaintext', type: 'text', placeholder: 'Enter text...', required: true, defaultValue: 'SerpentTx' },
      { name: 'key', label: 'Key', type: 'text', placeholder: 'Encryption key', required: true, defaultValue: 'key-for-serpent!!' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const plaintext = input.plaintext || 'SerpentTx';
    const key = input.key || 'key-for-serpent!!';
    const steps: VisualizationStep[] = [];

    const ptBytes = textToBytes(plaintext, 16);
    const keyBytes = textToBytes(key, 32); // Pad to 256 bits

    // Append padding bit for keys shorter than 256 bits
    if (key.length < 32) {
      keyBytes[key.length] = 0x01;
    }

    // Generate 132 32-bit subkeys via linear recurrence
    const w: number[] = [];
    for (let i = 0; i < 8; i++) {
      w.push(toU32((keyBytes[i * 4] | (keyBytes[i * 4 + 1] << 8) | (keyBytes[i * 4 + 2] << 16) | (keyBytes[i * 4 + 3] << 24))));
    }
    for (let i = 8; i < 140; i++) {
      w.push(rotl(toU32(w[i - 8] ^ w[i - 5] ^ w[i - 3] ^ w[i - 1] ^ 0x9e3779b9 ^ (i - 8)), 11));
    }
    // Apply S-boxes to prekeys to get round keys
    const subkeys: number[] = [];
    for (let i = 0; i < 132; i++) {
      subkeys.push(sBox((35 - Math.floor(i / 4)) % 8, w[i + 8]));
    }

    steps.push({
      id: 'serp-ip', phase: 'Initial Permutation', label: 'Initial Permutation (IP)',
      description: 'The 128-bit plaintext block undergoes an initial permutation (IP) and is arranged as four 32-bit words. Serpent operates on these in bitslice mode, applying S-boxes to all 32 bits in parallel.',
      blocks: [
        blk('pt', 'Plaintext (128 bits)', bytesToHex(ptBytes), 3.5, 0, '#38bdf8', 'data'),
        blk('key-in', 'Key (256 bits)', bytesToHex(keyBytes.slice(0, 16)) + '...', 3.5, 1, '#fbbf24', 'key'),
        blk('x0', 'X0', '0x' + toU32(ptBytes[0] | (ptBytes[1] << 8) | (ptBytes[2] << 16) | (ptBytes[3] << 24)).toString(16).padStart(8, '0'), 0.5, 2.5, '#15803d', 'intermediate'),
        blk('x1', 'X1', '0x' + toU32(ptBytes[4] | (ptBytes[5] << 8) | (ptBytes[6] << 16) | (ptBytes[7] << 24)).toString(16).padStart(8, '0'), 3, 2.5, '#15803d', 'intermediate'),
        blk('x2', 'X2', '0x' + toU32(ptBytes[8] | (ptBytes[9] << 8) | (ptBytes[10] << 16) | (ptBytes[11] << 24)).toString(16).padStart(8, '0'), 5.5, 2.5, '#15803d', 'intermediate'),
        blk('x3', 'X3', '0x' + toU32(ptBytes[12] | (ptBytes[13] << 8) | (ptBytes[14] << 16) | (ptBytes[15] << 24)).toString(16).padStart(8, '0'), 8, 2.5, '#15803d', 'intermediate'),
      ],
      connections: [
        { from: 'pt', to: 'x0', animated: true, color: '#38bdf8' },
        { from: 'pt', to: 'x1', animated: true, color: '#38bdf8' },
        { from: 'pt', to: 'x2', animated: true, color: '#38bdf8' },
        { from: 'pt', to: 'x3', animated: true, color: '#38bdf8' },
      ],
      operations: [],
      highlights: ['x0', 'x1', 'x2', 'x3'],
    });

    steps.push({
      id: 'serp-keysched', phase: 'Key Schedule', label: 'Key Expansion (132 Subkeys)',
      description: 'The 256-bit key is expanded to 132 32-bit subkeys using a linear recurrence relation: w[i] = (w[i-8] XOR w[i-5] XOR w[i-3] XOR w[i-1] XOR phi XOR i) <<< 11, then S-boxes are applied to groups of 4.',
      blocks: [
        blk('ks-key', 'Key (256 bits)', bytesToHex(keyBytes.slice(0, 12)) + '...', 3, 0, '#fbbf24', 'key'),
        blk('ks-phi', 'Golden Ratio (phi)', '0x9E3779B9', 7, 0, '#818cf8', 'constant'),
        blk('ks-recur', 'Linear Recurrence', 'w[i] = ROL11(w[i-8]^w[i-5]^w[i-3]^w[i-1]^phi^i)', 3.5, 1.3, '#a78bfa', 'operation'),
        blk('ks-sbox', 'S-box Application', 'Apply S-boxes to prekeys', 3.5, 2.5, '#f472b6', 'operation'),
        blk('ks-k0', 'K[0..3]', `0x${subkeys[0].toString(16).padStart(8, '0')}...`, 1, 3.7, '#15803d', 'key'),
        blk('ks-k128', 'K[128..131]', `0x${subkeys[128].toString(16).padStart(8, '0')}...`, 5, 3.7, '#15803d', 'key'),
      ],
      connections: [
        { from: 'ks-key', to: 'ks-recur', animated: true, color: '#fbbf24' },
        { from: 'ks-phi', to: 'ks-recur', animated: true, color: '#818cf8' },
        { from: 'ks-recur', to: 'ks-sbox', animated: true, color: '#a78bfa' },
        { from: 'ks-sbox', to: 'ks-k0', animated: true, color: '#15803d' },
        { from: 'ks-sbox', to: 'ks-k128', animated: true, color: '#15803d' },
      ],
      operations: [
        { id: 'op-recur', type: 'expand', label: 'Key Expansion', x: 3.5, y: 1.3, z: 0, color: '#a78bfa' },
        { id: 'op-ks-sbox', type: 'sbox', label: 'S-box', x: 3.5, y: 2.5, z: 0, color: '#f472b6' },
      ],
      highlights: ['ks-k0', 'ks-k128'],
    });

    // Run 32 rounds
    let x0 = toU32(ptBytes[0] | (ptBytes[1] << 8) | (ptBytes[2] << 16) | (ptBytes[3] << 24));
    let x1 = toU32(ptBytes[4] | (ptBytes[5] << 8) | (ptBytes[6] << 16) | (ptBytes[7] << 24));
    let x2 = toU32(ptBytes[8] | (ptBytes[9] << 8) | (ptBytes[10] << 16) | (ptBytes[11] << 24));
    let x3 = toU32(ptBytes[12] | (ptBytes[13] << 8) | (ptBytes[14] << 16) | (ptBytes[15] << 24));

    const showRounds = [0, 1, 15, 16, 30, 31];
    for (let round = 0; round < 32; round++) {
      // Key mixing
      x0 = toU32(x0 ^ subkeys[round * 4]);
      x1 = toU32(x1 ^ subkeys[round * 4 + 1]);
      x2 = toU32(x2 ^ subkeys[round * 4 + 2]);
      x3 = toU32(x3 ^ subkeys[round * 4 + 3]);

      // S-box substitution
      x0 = sBox(round % 8, x0);
      x1 = sBox(round % 8, x1);
      x2 = sBox(round % 8, x2);
      x3 = sBox(round % 8, x3);

      if (round < 31) {
        // Linear transformation
        [x0, x1, x2, x3] = linearTransform(x0, x1, x2, x3);
      } else {
        // Last round: extra key mixing instead of linear transform
        x0 = toU32(x0 ^ subkeys[128]);
        x1 = toU32(x1 ^ subkeys[129]);
        x2 = toU32(x2 ^ subkeys[130]);
        x3 = toU32(x3 ^ subkeys[131]);
      }

      if (showRounds.includes(round)) {
        steps.push({
          id: `serp-round-${round}`, phase: `Round ${round + 1}`, label: `Round ${round + 1} of 32`,
          description: `Round ${round + 1}: XOR with subkeys K[${round * 4}..${round * 4 + 3}], apply S-box S${round % 8} (bitslice), ${round < 31 ? 'then linear transformation (rotations, XORs, shifts)' : 'then final key mixing with K[128..131]'}.`,
          blocks: [
            blk(`r${round}-mix`, 'Key Mixing', `⊕ K[${round * 4}..${round * 4 + 3}]`, 1, 0, '#fbbf24', 'operation'),
            blk(`r${round}-sbox`, `S-box S${round % 8}`, 'Bitslice substitution', 4, 0, '#f472b6', 'operation'),
            blk(`r${round}-lt`, round < 31 ? 'Linear Transform' : 'Final Key Mix', round < 31 ? 'ROL, XOR, Shift' : '⊕ K[128..131]', 7, 0, '#a78bfa', 'operation'),
            blk(`r${round}-x0`, 'X0', '0x' + x0.toString(16).padStart(8, '0'), 0.5, 1.8, '#15803d', 'intermediate'),
            blk(`r${round}-x1`, 'X1', '0x' + x1.toString(16).padStart(8, '0'), 3, 1.8, '#15803d', 'intermediate'),
            blk(`r${round}-x2`, 'X2', '0x' + x2.toString(16).padStart(8, '0'), 5.5, 1.8, '#15803d', 'intermediate'),
            blk(`r${round}-x3`, 'X3', '0x' + x3.toString(16).padStart(8, '0'), 8, 1.8, '#15803d', 'intermediate'),
          ],
          connections: [
            { from: `r${round}-mix`, to: `r${round}-sbox`, animated: true, color: '#fbbf24' },
            { from: `r${round}-sbox`, to: `r${round}-lt`, animated: true, color: '#f472b6' },
            { from: `r${round}-lt`, to: `r${round}-x0`, animated: true, color: '#a78bfa' },
            { from: `r${round}-lt`, to: `r${round}-x1`, animated: true, color: '#a78bfa' },
            { from: `r${round}-lt`, to: `r${round}-x2`, animated: true, color: '#a78bfa' },
            { from: `r${round}-lt`, to: `r${round}-x3`, animated: true, color: '#a78bfa' },
          ],
          operations: [
            { id: `op-mix-${round}`, type: 'xor', label: 'Key XOR', x: 1, y: 0, z: 0, color: '#fbbf24' },
            { id: `op-sbox-${round}`, type: 'sbox', label: `S${round % 8}`, x: 4, y: 0, z: 0, color: '#f472b6' },
            { id: `op-lt-${round}`, type: round < 31 ? 'permutation' : 'xor', label: round < 31 ? 'Linear Transform' : 'Key Mix', x: 7, y: 0, z: 0, color: '#a78bfa' },
          ],
          highlights: [`r${round}-x0`, `r${round}-x1`, `r${round}-x2`, `r${round}-x3`],
        });
      }
    }

    // Final permutation and output
    const cipherBytes = [
      x0 & 0xff, (x0 >>> 8) & 0xff, (x0 >>> 16) & 0xff, (x0 >>> 24) & 0xff,
      x1 & 0xff, (x1 >>> 8) & 0xff, (x1 >>> 16) & 0xff, (x1 >>> 24) & 0xff,
      x2 & 0xff, (x2 >>> 8) & 0xff, (x2 >>> 16) & 0xff, (x2 >>> 24) & 0xff,
      x3 & 0xff, (x3 >>> 8) & 0xff, (x3 >>> 16) & 0xff, (x3 >>> 24) & 0xff,
    ];

    steps.push({
      id: 'serp-output', phase: 'Output', label: 'Final Permutation & Ciphertext',
      description: 'After 32 rounds of substitution and linear/key transformations, the final state is written out as the 128-bit ciphertext. Serpent\'s high round count (32 vs AES\'s 10-14) provides a large security margin.',
      blocks: [
        blk('out-x0', 'X0', '0x' + x0.toString(16).padStart(8, '0'), 0.5, 0, '#15803d', 'intermediate'),
        blk('out-x1', 'X1', '0x' + x1.toString(16).padStart(8, '0'), 3, 0, '#15803d', 'intermediate'),
        blk('out-x2', 'X2', '0x' + x2.toString(16).padStart(8, '0'), 5.5, 0, '#15803d', 'intermediate'),
        blk('out-x3', 'X3', '0x' + x3.toString(16).padStart(8, '0'), 8, 0, '#15803d', 'intermediate'),
        blk('fp', 'Final Permutation', 'IP^{-1}', 4, 1.5, '#a78bfa', 'operation'),
        blk('cipher', 'Ciphertext (128 bits)', bytesToHex(cipherBytes), 4, 3, '#15803d', 'output'),
      ],
      connections: [
        { from: 'out-x0', to: 'fp', animated: true, color: '#15803d' },
        { from: 'out-x1', to: 'fp', animated: true, color: '#15803d' },
        { from: 'out-x2', to: 'fp', animated: true, color: '#15803d' },
        { from: 'out-x3', to: 'fp', animated: true, color: '#15803d' },
        { from: 'fp', to: 'cipher', animated: true, color: '#34d399' },
      ],
      operations: [
        { id: 'op-fp', type: 'permutation', label: 'Final Permutation', x: 4, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['cipher'],
    });

    return steps;
  },
};

export default serpentEngine;
