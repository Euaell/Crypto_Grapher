import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function toU32(n: number): number { return n >>> 0; }
function rotl(x: number, n: number): number { return toU32((x << n) | (x >>> (32 - n))); }

function sha1Pad(msg: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < msg.length; i++) bytes.push(msg.charCodeAt(i) & 0xff);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push((bitLen >>> (i * 8)) & 0xff);
  return bytes;
}

const sha1Engine: AlgorithmEngine = {
  meta: {
    id: 'sha-1',
    name: 'SHA-1',
    category: 'hash-function',
    description: 'Secure Hash Algorithm 1 produces a 160-bit hash. Designed by the NSA. Deprecated due to practical collision attacks demonstrated in 2017 (SHAttered).',
    keySize: 'N/A',
    blockSize: 512,
    yearIntroduced: 1995,
    authors: 'NSA',
    status: 'deprecated',
    standardBody: 'NIST FIPS 180-1',
    color: '#f59e0b',
    icon: '⚠️',
  },
  inputConfig: {
    type: 'hash',
    fields: [
      { name: 'message', label: 'Message', type: 'text', placeholder: 'Enter message to hash...', required: true, defaultValue: 'Hello' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const message = input.message || 'Hello';
    const padded = sha1Pad(message);
    const steps: VisualizationStep[] = [];

    steps.push({
      id: 'sha1-input', phase: 'Input', label: 'Message Input',
      description: `Input: "${message}" (${message.length * 8} bits). SHA-1 processes 512-bit blocks to produce a 160-bit digest.`,
      blocks: [blk('msg', 'Message', `"${message}"`, 3.5, 0, '#fbbf24', 'data')],
      connections: [], operations: [], highlights: ['msg'],
    });

    steps.push({
      id: 'sha1-pad', phase: 'Padding', label: 'Message Padding',
      description: 'Append 1-bit, zeros until 448 mod 512, then 64-bit big-endian message length.',
      blocks: [
        blk('padded', 'Padded', `${padded.length} bytes`, 3.5, 0, '#f59e0b', 'intermediate'),
      ],
      connections: [], operations: [{ id: 'op-pad', type: 'pad', label: 'SHA-1 Padding', x: 3.5, y: 0, z: 0, color: '#f59e0b' }],
      highlights: ['padded'],
    });

    let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;

    steps.push({
      id: 'sha1-init', phase: 'Initialize', label: 'Initial Hash Values',
      description: 'Five 32-bit registers initialized to fixed constants.',
      blocks: [
        blk('h0', 'h0', '0x' + h0.toString(16), 0, 0, '#fb923c', 'constant'),
        blk('h1', 'h1', '0x' + h1.toString(16), 2.2, 0, '#facc15', 'constant'),
        blk('h2', 'h2', '0x' + h2.toString(16), 4.4, 0, '#a3e635', 'constant'),
        blk('h3', 'h3', '0x' + h3.toString(16), 6.6, 0, '#34d399', 'constant'),
        blk('h4', 'h4', '0x' + h4.toString(16), 8.8, 0, '#38bdf8', 'constant'),
      ],
      connections: [], operations: [], highlights: ['h0', 'h1', 'h2', 'h3', 'h4'],
    });

    for (let bi = 0; bi < padded.length / 64; bi++) {
      const block = padded.slice(bi * 64, (bi + 1) * 64);
      const W: number[] = [];
      for (let i = 0; i < 16; i++) {
        W.push(toU32((block[i*4] << 24) | (block[i*4+1] << 16) | (block[i*4+2] << 8) | block[i*4+3]));
      }
      for (let i = 16; i < 80; i++) {
        W.push(rotl(toU32(W[i-3] ^ W[i-8] ^ W[i-14] ^ W[i-16]), 1));
      }

      steps.push({
        id: `sha1-schedule-${bi}`, phase: 'Message Schedule', label: `Block ${bi}: Expand to 80 Words`,
        description: 'Expand 16 message words to 80 using: W[i] = ROTL(W[i-3] ⊕ W[i-8] ⊕ W[i-14] ⊕ W[i-16], 1)',
        blocks: [
          ...W.slice(0, 4).map((w, i) => blk(`w${bi}-${i}`, `W[${i}]`, '0x' + w.toString(16).padStart(8, '0'), i * 2.5, 0, '#fbbf24', 'constant')),
          blk(`w${bi}-dots`, '...', `W[4]..W[79]`, 4, 1.5, '#fbbf24', 'constant'),
        ],
        connections: [], operations: [], highlights: W.slice(0, 4).map((_, i) => `w${bi}-${i}`),
      });

      let a = h0, b = h1, c = h2, d = h3, e = h4;
      const K = [0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6];
      const fnames = ['Ch(B,C,D)', 'Parity(B,C,D)', 'Maj(B,C,D)', 'Parity(B,C,D)'];

      const showRounds = [0, 1, 19, 20, 39, 40, 59, 60, 79];
      for (let i = 0; i < 80; i++) {
        let f: number, k: number;
        const quarter = Math.floor(i / 20);
        if (quarter === 0) { f = toU32((b & c) | ((~b) & d)); k = K[0]; }
        else if (quarter === 1) { f = toU32(b ^ c ^ d); k = K[1]; }
        else if (quarter === 2) { f = toU32((b & c) | (b & d) | (c & d)); k = K[2]; }
        else { f = toU32(b ^ c ^ d); k = K[3]; }

        const temp = toU32(rotl(a, 5) + f + e + k + W[i]);
        e = d; d = c; c = rotl(b, 30); b = a; a = temp;

        if (showRounds.includes(i)) {
          steps.push({
            id: `sha1-round-${bi}-${i}`, phase: `Round ${i}`, label: `Round ${i}: ${fnames[quarter]}`,
            description: `Quarter ${quarter + 1} (rounds ${quarter * 20}-${quarter * 20 + 19}): f=${fnames[quarter]}, K=0x${k.toString(16)}\ntemp = ROTL(a,5) + f + e + K + W[${i}]`,
            blocks: [
              blk(`sr${i}-a`, 'a', '0x' + a.toString(16).padStart(8, '0'), 0, 0, '#fb923c', 'intermediate'),
              blk(`sr${i}-b`, 'b', '0x' + b.toString(16).padStart(8, '0'), 2.2, 0, '#facc15', 'intermediate'),
              blk(`sr${i}-c`, 'c', '0x' + c.toString(16).padStart(8, '0'), 4.4, 0, '#a3e635', 'intermediate'),
              blk(`sr${i}-d`, 'd', '0x' + d.toString(16).padStart(8, '0'), 6.6, 0, '#34d399', 'intermediate'),
              blk(`sr${i}-e`, 'e', '0x' + e.toString(16).padStart(8, '0'), 8.8, 0, '#38bdf8', 'intermediate'),
            ],
            connections: [],
            operations: [{ id: `op-${i}`, type: 'rotate', label: `ROTL(a,5) + f`, x: 4, y: 1.5, z: 0, color: '#f59e0b' }],
            highlights: [`sr${i}-a`],
          });
        }
      }

      h0 = toU32(h0 + a); h1 = toU32(h1 + b); h2 = toU32(h2 + c); h3 = toU32(h3 + d); h4 = toU32(h4 + e);
    }

    const hash = [h0, h1, h2, h3, h4].map(h => h.toString(16).padStart(8, '0')).join('');

    steps.push({
      id: 'sha1-output', phase: 'Output', label: 'SHA-1 Hash',
      description: `Final 160-bit digest: ${hash}`,
      blocks: [
        blk('fh0', 'h0', '0x' + h0.toString(16).padStart(8, '0'), 0, 0, '#fb923c', 'output'),
        blk('fh1', 'h1', '0x' + h1.toString(16).padStart(8, '0'), 2.2, 0, '#facc15', 'output'),
        blk('fh2', 'h2', '0x' + h2.toString(16).padStart(8, '0'), 4.4, 0, '#a3e635', 'output'),
        blk('fh3', 'h3', '0x' + h3.toString(16).padStart(8, '0'), 6.6, 0, '#34d399', 'output'),
        blk('fh4', 'h4', '0x' + h4.toString(16).padStart(8, '0'), 8.8, 0, '#38bdf8', 'output'),
        blk('hash', 'SHA-1 Hash', hash, 3.5, 2, '#f59e0b', 'output'),
      ],
      connections: [
        { from: 'fh0', to: 'hash', animated: true, color: '#fb923c' },
        { from: 'fh1', to: 'hash', animated: true, color: '#facc15' },
        { from: 'fh2', to: 'hash', animated: true, color: '#a3e635' },
        { from: 'fh3', to: 'hash', animated: true, color: '#34d399' },
        { from: 'fh4', to: 'hash', animated: true, color: '#38bdf8' },
      ],
      operations: [], highlights: ['hash'],
    });

    return steps;
  },
};

export default sha1Engine;
