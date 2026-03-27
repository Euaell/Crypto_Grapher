import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function toU32(n: number): number { return n >>> 0; }
function rotr32(x: number, n: number): number { return toU32((x >>> n) | (x << (32 - n))); }

function textToBytes(text: string): number[] {
  return Array.from(text).map(c => c.charCodeAt(0) & 0xff);
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// BLAKE2s IV (first 32 bits of fractional parts of square roots of first 8 primes)
const IV = [
  0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
  0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19,
];

// BLAKE2s sigma (message permutation schedule)
const SIGMA = [
  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
  [14,10,4,8,9,15,13,6,1,12,0,2,11,7,5,3],
  [11,8,12,0,5,2,15,13,10,14,3,6,7,1,9,4],
  [7,9,3,1,13,12,11,14,2,6,5,10,4,0,15,8],
  [9,0,5,7,2,4,10,15,14,1,11,12,6,8,3,13],
  [2,12,6,10,0,11,8,3,4,13,7,5,15,14,1,9],
  [12,5,1,15,14,13,4,10,0,7,6,3,9,2,8,11],
  [13,11,7,14,12,1,3,9,5,0,15,4,8,6,2,10],
  [6,15,14,9,11,3,0,8,12,2,13,7,1,4,10,5],
  [10,2,8,4,7,6,1,5,15,11,9,14,3,12,13,0],
];

const blake2Engine: AlgorithmEngine = {
  meta: {
    id: 'blake2',
    name: 'BLAKE2',
    category: 'hash-function',
    description: 'A cryptographic hash function faster than MD5 yet secure as SHA-3. Based on ChaCha stream cipher core. BLAKE2s (256-bit) for 32-bit platforms, BLAKE2b (512-bit) for 64-bit.',
    keySize: 'N/A (0-32 bytes optional key)',
    blockSize: 512,
    yearIntroduced: 2012,
    authors: 'Aumasson, Neves, Wilcox-O\'Hearn, Winnerlein',
    status: 'recommended',
    standardBody: 'RFC 7693',
    color: '#6366f1',
    icon: '⚡',
  },
  inputConfig: {
    type: 'hash',
    fields: [
      { name: 'message', label: 'Message', type: 'text', placeholder: 'Enter message...', required: true, defaultValue: 'BLAKE2' },
      { name: 'key', label: 'Key (optional)', type: 'text', placeholder: 'Optional keyed hashing', required: false, defaultValue: '' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const message = input.message || 'BLAKE2';
    const key = input.key || '';
    const msgBytes = textToBytes(message);
    const keyBytes = textToBytes(key);
    const hashLen = 32; // BLAKE2s-256

    const steps: VisualizationStep[] = [];

    steps.push({
      id: 'blake2-intro', phase: 'Overview', label: 'BLAKE2s Overview',
      description: `BLAKE2s-256: Optimized for 32-bit platforms\n- State: 8 × 32-bit chaining values\n- Block: 64 bytes (512 bits)\n- Rounds: 10\n- Based on ChaCha quarter-round (ARX: Add, Rotate, XOR)`,
      blocks: [
        blk('msg', 'Message', `"${message}"`, 2, 0, '#818cf8', 'data'),
        ...(key ? [blk('key', 'Key', `"${key}"`, 7, 0, '#fbbf24', 'key')] : []),
      ],
      connections: [], operations: [], highlights: ['msg'],
    });

    // Initialize state
    const h = [...IV];
    h[0] ^= 0x01010000 ^ (keyBytes.length << 8) ^ hashLen;

    steps.push({
      id: 'blake2-init', phase: 'Initialize', label: 'Initialize Chaining Values',
      description: `h[0..7] = IV[0..7]\nh[0] ^= 0x01010000 | (keyLen << 8) | hashLen\nParameterized initialization encodes output length and key length.`,
      blocks: h.map((v, i) =>
        blk(`h${i}`, `h[${i}]`, '0x' + v.toString(16).padStart(8, '0'), (i % 4) * 2.5, Math.floor(i / 4) * 1.2, '#6366f1', i === 0 ? 'intermediate' : 'constant')
      ),
      connections: [], operations: [], highlights: ['h0'],
    });

    // Setup message block
    const block = new Array(64).fill(0);
    for (let i = 0; i < Math.min(msgBytes.length, 64); i++) block[i] = msgBytes[i];
    const m: number[] = [];
    for (let i = 0; i < 16; i++) {
      m.push(toU32(block[4*i] | (block[4*i+1] << 8) | (block[4*i+2] << 16) | (block[4*i+3] << 24)));
    }

    steps.push({
      id: 'blake2-block', phase: 'Message Block', label: 'Parse Message into Words',
      description: 'Parse 64-byte block into 16 little-endian 32-bit words m[0]..m[15].',
      blocks: m.slice(0, 4).map((v, i) =>
        blk(`m${i}`, `m[${i}]`, '0x' + v.toString(16).padStart(8, '0'), i * 2.5, 0, '#818cf8', 'data')
      ),
      connections: [], operations: [], highlights: m.slice(0, 4).map((_, i) => `m${i}`),
    });

    // Initialize working vector
    const v = [...h, ...IV];
    v[12] ^= msgBytes.length; // counter low
    v[14] ^= 0xFFFFFFFF; // last block flag

    steps.push({
      id: 'blake2-working', phase: 'Working Vector', label: 'Initialize 16-word Working Vector',
      description: 'v[0..7] = h[0..7] (chaining values)\nv[8..15] = IV[0..7]\nv[12] ^= counter (bytes compressed)\nv[14] ^= 0xFFFFFFFF if last block',
      blocks: v.slice(0, 8).map((val, i) =>
        blk(`v${i}`, `v[${i}]`, '0x' + val.toString(16).padStart(8, '0'), (i % 4) * 2.5, Math.floor(i / 4) * 1.2, '#6366f1', 'intermediate')
      ),
      connections: [], operations: [], highlights: ['v0', 'v12'],
    });

    // G function demo
    function G(v: number[], a: number, b: number, c: number, d: number, x: number, y: number) {
      v[a] = toU32(v[a] + v[b] + x);
      v[d] = rotr32(toU32(v[d] ^ v[a]), 16);
      v[c] = toU32(v[c] + v[d]);
      v[b] = rotr32(toU32(v[b] ^ v[c]), 12);
      v[a] = toU32(v[a] + v[b] + y);
      v[d] = rotr32(toU32(v[d] ^ v[a]), 8);
      v[c] = toU32(v[c] + v[d]);
      v[b] = rotr32(toU32(v[b] ^ v[c]), 7);
    }

    const vBefore = [v[0], v[4], v[8], v[12]];
    G(v, 0, 4, 8, 12, m[SIGMA[0][0]], m[SIGMA[0][1]]);
    steps.push({
      id: 'blake2-g', phase: 'G Function', label: 'BLAKE2 Mixing Function G',
      description: 'ARX-based mixing (from ChaCha):\n1. a += b + m[σ[2i]]   d ^= a   d >>>= 16\n2. c += d               b ^= c   b >>>= 12\n3. a += b + m[σ[2i+1]]  d ^= a   d >>>= 8\n4. c += d               b ^= c   b >>>= 7',
      blocks: [
        blk('g-a0', 'v[0] before', '0x' + vBefore[0].toString(16).padStart(8, '0'), 0, 0, '#818cf8', 'data'),
        blk('g-b0', 'v[4] before', '0x' + vBefore[1].toString(16).padStart(8, '0'), 2.5, 0, '#a78bfa', 'data'),
        blk('g-c0', 'v[8] before', '0x' + vBefore[2].toString(16).padStart(8, '0'), 5, 0, '#c4b5fd', 'data'),
        blk('g-d0', 'v[12] before', '0x' + vBefore[3].toString(16).padStart(8, '0'), 7.5, 0, '#ddd6fe', 'data'),
        blk('g-a1', 'v[0] after', '0x' + v[0].toString(16).padStart(8, '0'), 0, 2.5, '#4f46e5', 'output'),
        blk('g-b1', 'v[4] after', '0x' + v[4].toString(16).padStart(8, '0'), 2.5, 2.5, '#6366f1', 'output'),
        blk('g-c1', 'v[8] after', '0x' + v[8].toString(16).padStart(8, '0'), 5, 2.5, '#818cf8', 'output'),
        blk('g-d1', 'v[12] after', '0x' + v[12].toString(16).padStart(8, '0'), 7.5, 2.5, '#a78bfa', 'output'),
      ],
      connections: [
        { from: 'g-a0', to: 'g-a1', animated: true, color: '#6366f1' },
        { from: 'g-b0', to: 'g-b1', animated: true, color: '#6366f1' },
        { from: 'g-c0', to: 'g-c1', animated: true, color: '#6366f1' },
        { from: 'g-d0', to: 'g-d1', animated: true, color: '#6366f1' },
      ],
      operations: [
        { id: 'op-arx', type: 'rotate', label: 'Add-Rotate-XOR', x: 4, y: 1.2, z: 0, color: '#6366f1' },
      ],
      highlights: ['g-a1', 'g-b1', 'g-c1', 'g-d1'],
    });

    // Complete remaining rounds
    for (let round = 0; round < 10; round++) {
      const s = SIGMA[round % 10];
      G(v, 0, 4, 8, 12, m[s[0]], m[s[1]]);
      G(v, 1, 5, 9, 13, m[s[2]], m[s[3]]);
      G(v, 2, 6, 10, 14, m[s[4]], m[s[5]]);
      G(v, 3, 7, 11, 15, m[s[6]], m[s[7]]);
      G(v, 0, 5, 10, 15, m[s[8]], m[s[9]]);
      G(v, 1, 6, 11, 12, m[s[10]], m[s[11]]);
      G(v, 2, 7, 8, 13, m[s[12]], m[s[13]]);
      G(v, 3, 4, 9, 14, m[s[14]], m[s[15]]);
    }

    steps.push({
      id: 'blake2-rounds', phase: '10 Rounds', label: 'Complete 10 Rounds of Mixing',
      description: 'Each round applies G to 8 groups of 4 words:\n- 4 column mixings: G(v[0,4,8,12]), G(v[1,5,9,13]), G(v[2,6,10,14]), G(v[3,7,11,15])\n- 4 diagonal mixings: G(v[0,5,10,15]), G(v[1,6,11,12]), G(v[2,7,8,13]), G(v[3,4,9,14])\nMessage words are selected via SIGMA permutation schedule.',
      blocks: v.slice(0, 8).map((val, i) =>
        blk(`vr${i}`, `v[${i}]`, '0x' + val.toString(16).padStart(8, '0'), (i % 4) * 2.5, Math.floor(i / 4) * 1.2, '#4f46e5', 'intermediate')
      ),
      connections: [], operations: [], highlights: v.slice(0, 8).map((_, i) => `vr${i}`),
    });

    // Finalize
    for (let i = 0; i < 8; i++) h[i] = toU32(h[i] ^ v[i] ^ v[i + 8]);
    const hash = h.map(w => {
      const b = [(w & 0xff), ((w >> 8) & 0xff), ((w >> 16) & 0xff), ((w >> 24) & 0xff)];
      return b.map(x => x.toString(16).padStart(2, '0')).join('');
    }).join('');

    steps.push({
      id: 'blake2-final', phase: 'Finalize', label: 'BLAKE2s-256 Hash',
      description: `Finalize: h[i] = h[i] ⊕ v[i] ⊕ v[i+8]\nHash: ${hash}`,
      blocks: [
        ...h.slice(0, 4).map((val, i) =>
          blk(`fh${i}`, `h[${i}]`, '0x' + val.toString(16).padStart(8, '0'), i * 2.5, 0, '#4f46e5', 'output')
        ),
        blk('hash', 'BLAKE2s-256', hash.slice(0, 32) + '...', 3.5, 2, '#6366f1', 'output'),
      ],
      connections: h.slice(0, 4).map((_, i) => ({ from: `fh${i}`, to: 'hash', animated: true, color: '#6366f1' })),
      operations: [], highlights: ['hash'],
    });

    return steps;
  },
};

export default blake2Engine;
