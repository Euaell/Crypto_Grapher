import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function toU32(n: number): number { return n >>> 0; }

function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xff);
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
}

const rabbitEngine: AlgorithmEngine = {
  meta: {
    id: 'rabbit',
    name: 'Rabbit',
    category: 'stream-cipher',
    description: 'A high-speed stream cipher designed for software. Uses 128-bit key and optional 64-bit IV. Selected for the eSTREAM portfolio of stream ciphers. Generates keystream using 8 coupled oscillators.',
    keySize: 128,
    yearIntroduced: 2003,
    authors: 'Boesgaard, Vesterager, Pedersen, Christensen, Zenner',
    status: 'recommended',
    standardBody: 'eSTREAM / RFC 4503',
    color: '#14b8a6',
    icon: '🐇',
  },
  inputConfig: {
    type: 'symmetric',
    fields: [
      { name: 'plaintext', label: 'Plaintext', type: 'text', placeholder: 'Enter text...', required: true, defaultValue: 'Rabbit!' },
      { name: 'key', label: 'Key (128-bit)', type: 'text', placeholder: '16-char key', required: true, defaultValue: 'secretkey1234567' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const plaintext = input.plaintext || 'Rabbit!';
    const key = input.key || 'secretkey1234567';
    const ptBytes = textToBytes(plaintext);
    const keyBytes = textToBytes(key);
    while (keyBytes.length < 16) keyBytes.push(0);

    const steps: VisualizationStep[] = [];

    // Parse key into subkeys
    const K: number[] = [];
    for (let i = 0; i < 8; i++) {
      K.push(toU32((keyBytes[2*i+1] << 8) | keyBytes[2*i]));
    }

    steps.push({
      id: 'rabbit-input', phase: 'Input', label: 'Input Data',
      description: `Plaintext: "${plaintext}" (${ptBytes.length} bytes)\nKey: 128-bit key parsed into 8 subkeys K[0]..K[7]`,
      blocks: [
        blk('pt', 'Plaintext', bytesToHex(ptBytes), 2, 0, '#2dd4bf', 'data'),
        blk('key', 'Key (128-bit)', bytesToHex(keyBytes.slice(0, 16)), 7, 0, '#fbbf24', 'key'),
      ],
      connections: [], operations: [], highlights: ['pt', 'key'],
    });

    // Initialize state variables X[0..7]
    const X: number[] = [];
    for (let j = 0; j < 8; j++) {
      X.push(toU32(K[j] ^ K[(j + 1) % 8]));
    }

    // Initialize counters C[0..7]
    const C: number[] = [];
    for (let j = 0; j < 8; j++) {
      C.push(toU32(K[(j + 4) % 8] * 0x4d34d34d + j));
    }

    steps.push({
      id: 'rabbit-state-init', phase: 'State Init', label: 'Initialize State Variables',
      description: 'Eight 32-bit state variables X[0]..X[7] are initialized from key subkeys.\nEight counters C[0]..C[7] are initialized from rotated key subkeys.',
      blocks: [
        ...X.slice(0, 4).map((x, i) => blk(`x${i}`, `X[${i}]`, '0x' + x.toString(16).padStart(8, '0'), i * 2.5, 0, '#14b8a6', 'intermediate')),
        ...C.slice(0, 4).map((c, i) => blk(`c${i}`, `C[${i}]`, '0x' + c.toString(16).padStart(8, '0'), i * 2.5, 1.5, '#06b6d4', 'constant')),
      ],
      connections: [], operations: [], highlights: X.slice(0, 4).map((_, i) => `x${i}`),
    });

    // g function (simplified for visualization)
    function gFunc(u: number): number {
      const uSq = toU32(u * u);
      return toU32((uSq >>> 16) ^ (uSq & 0xFFFF0000));
    }

    // Next state (simplified Rabbit iteration)
    const G: number[] = [];
    for (let j = 0; j < 8; j++) {
      G.push(gFunc(toU32(X[j] + C[j])));
    }

    steps.push({
      id: 'rabbit-g-func', phase: 'G Function', label: 'Apply G Function to Each State',
      description: 'The core non-linear function: g(x) = (x² mod 2³²) with upper/lower halves XORed.\nG[j] = g(X[j] + C[j]) for each j ∈ {0..7}',
      blocks: [
        ...G.slice(0, 4).map((g, i) => blk(`g${i}`, `G[${i}] = g(X[${i}]+C[${i}])`, '0x' + g.toString(16).padStart(8, '0'), i * 2.5, 0, '#5eead4', 'operation')),
      ],
      connections: [],
      operations: G.slice(0, 4).map((_, i) => ({ id: `op-g${i}`, type: 'multiply' as const, label: `g(X[${i}]+C[${i}])`, x: i * 2.5, y: 0, z: 0, color: '#14b8a6' })),
      highlights: G.slice(0, 4).map((_, i) => `g${i}`),
    });

    // Update state with rotations and additions
    const newX: number[] = [];
    for (let j = 0; j < 8; j++) {
      if (j % 2 === 0) {
        newX.push(toU32(G[j] + ((G[(j + 7) % 8] << 16) | (G[(j + 7) % 8] >>> 16)) + G[(j + 6) % 8]));
      } else {
        newX.push(toU32(G[j] + ((G[(j + 7) % 8] << 8) | (G[(j + 7) % 8] >>> 24)) + G[(j + 6) % 8]));
      }
    }

    steps.push({
      id: 'rabbit-update', phase: 'State Update', label: 'Update State with Cross-Coupling',
      description: 'New state combines G values with rotations of neighboring G values.\nEven indices: X[j] = G[j] + ROTL16(G[j-1]) + G[j-2]\nOdd indices: X[j] = G[j] + ROTL8(G[j-1]) + G[j-2]',
      blocks: [
        ...newX.slice(0, 4).map((x, i) => blk(`nx${i}`, `New X[${i}]`, '0x' + x.toString(16).padStart(8, '0'), i * 2.5, 0, '#0d9488', 'intermediate')),
      ],
      connections: newX.slice(0, 3).map((_, i) => ({ from: `nx${i}`, to: `nx${i+1}`, color: '#14b8a6', dashed: true, label: 'coupled' })),
      operations: [{ id: 'op-couple', type: 'rotate', label: 'Cross-coupling', x: 4, y: 1, z: 0, color: '#14b8a6' }],
      highlights: newX.slice(0, 4).map((_, i) => `nx${i}`),
    });

    // Extract keystream
    const keystream: number[] = [];
    for (let j = 0; j < 4; j++) {
      const s = toU32(newX[2*j] ^ (newX[2*j+1] >>> 16));
      keystream.push(s & 0xff, (s >> 8) & 0xff);
    }

    steps.push({
      id: 'rabbit-keystream', phase: 'Keystream', label: 'Extract Keystream Bytes',
      description: 'Keystream is extracted by XORing pairs of state variables and taking bytes.\nS[i] = X[2i] ⊕ (X[2i+1] >>> 16)',
      blocks: [
        blk('ks', 'Keystream', bytesToHex(keystream.slice(0, ptBytes.length)), 3, 0, '#14b8a6', 'intermediate'),
      ],
      connections: [], operations: [{ id: 'op-extract', type: 'xor', label: 'Extract from state', x: 3, y: 0, z: 0, color: '#14b8a6' }],
      highlights: ['ks'],
    });

    // XOR with plaintext
    const cipherBytes = ptBytes.map((b, i) => b ^ (keystream[i] || 0));

    steps.push({
      id: 'rabbit-xor', phase: 'Encryption', label: 'XOR Plaintext with Keystream',
      description: 'Each plaintext byte is XORed with the corresponding keystream byte to produce ciphertext.',
      blocks: [
        blk('xor-pt', 'Plaintext', bytesToHex(ptBytes), 1, 0, '#2dd4bf', 'data'),
        blk('xor-ks', 'Keystream', bytesToHex(keystream.slice(0, ptBytes.length)), 6, 0, '#14b8a6', 'key'),
        blk('xor-op', '⊕', 'XOR', 3.5, 1.5, '#fbbf24', 'operation'),
        blk('cipher', 'Ciphertext', bytesToHex(cipherBytes), 3.5, 3, '#0d9488', 'output'),
      ],
      connections: [
        { from: 'xor-pt', to: 'xor-op', animated: true, color: '#2dd4bf' },
        { from: 'xor-ks', to: 'xor-op', animated: true, color: '#14b8a6' },
        { from: 'xor-op', to: 'cipher', animated: true, color: '#0d9488' },
      ],
      operations: [{ id: 'op-xor', type: 'xor', label: 'Plaintext ⊕ Keystream', x: 3.5, y: 1.5, z: 0, color: '#fbbf24' }],
      highlights: ['cipher'],
    });

    return steps;
  },
};

export default rabbitEngine;
