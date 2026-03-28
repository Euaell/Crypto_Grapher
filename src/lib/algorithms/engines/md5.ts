import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function toU32(n: number): number { return n >>> 0; }
function rotl(x: number, n: number): number { return toU32((x << n) | (x >>> (32 - n))); }

// MD5 per-round shift amounts
const S = [
  7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
  5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
  4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
  6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21
];

// MD5 T constants (precomputed from sin)
const T: number[] = [];
for (let i = 0; i < 64; i++) {
  T.push(toU32(Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000)));
}

function md5Pad(msg: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < msg.length; i++) bytes.push(msg.charCodeAt(i) & 0xff);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // Append length as 64-bit little-endian
  for (let i = 0; i < 8; i++) bytes.push((bitLen >>> (i * 8)) & 0xff);
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function u32ToHexLE(v: number): string {
  const bytes = [(v & 0xff), ((v >> 8) & 0xff), ((v >> 16) & 0xff), ((v >> 24) & 0xff)];
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

const md5Engine: AlgorithmEngine = {
  meta: {
    id: 'md5',
    name: 'MD5',
    category: 'hash-function',
    description: 'Message Digest Algorithm 5. Produces a 128-bit hash. Designed by Ronald Rivest in 1991. Now considered cryptographically broken due to collision attacks, but still used for checksums.',
    keySize: 'N/A',
    blockSize: 512,
    yearIntroduced: 1991,
    authors: 'Ronald Rivest',
    status: 'deprecated',
    standardBody: 'RFC 1321',
    color: '#f43f5e',
    icon: '💔',
  },
  inputConfig: {
    type: 'hash',
    fields: [
      { name: 'message', label: 'Message', type: 'text', placeholder: 'Enter message to hash...', required: true, defaultValue: 'Hello' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const message = input.message || 'Hello';
    const padded = md5Pad(message);

    const steps: VisualizationStep[] = [];

    steps.push({
      id: 'md5-input', phase: 'Input', label: 'Original Message',
      description: `Input message: "${message}" (${message.length} bytes, ${message.length * 8} bits)`,
      blocks: [
        blk('msg', 'Message', `"${message}"`, 3, 0, '#fb7185', 'data'),
        blk('msgbytes', 'As Bytes', bytesToHex(Array.from(message).map(c => c.charCodeAt(0))), 3, 1.5, '#f43f5e', 'data'),
      ],
      connections: [{ from: 'msg', to: 'msgbytes', animated: true, color: '#fb7185' }],
      operations: [], highlights: ['msg'],
    });

    steps.push({
      id: 'md5-pad', phase: 'Padding', label: 'Message Padding',
      description: `Append bit "1", then zeros until length ≡ 448 mod 512, then append original length as 64-bit little-endian. Padded to ${padded.length} bytes (${padded.length * 8} bits).`,
      blocks: [
        blk('padded', 'Padded Message', bytesToHex(padded.slice(0, 16)) + '...', 3, 0, '#f43f5e', 'intermediate'),
        blk('pad-bit', '0x80 appended', 'Padding bit', 1, 1.5, '#fda4af', 'constant'),
        blk('pad-len', 'Length (LE)', bytesToHex(padded.slice(-8)), 6, 1.5, '#fda4af', 'constant'),
      ],
      connections: [], operations: [{ id: 'op-pad', type: 'pad', label: 'MD5 Padding', x: 3, y: 0, z: 0, color: '#f43f5e' }],
      highlights: ['padded'],
    });

    // Initial hash values
    let a0 = 0x67452301, b0 = 0xEFCDAB89, c0 = 0x98BADCFE, d0 = 0x10325476;

    steps.push({
      id: 'md5-init', phase: 'Initialize', label: 'Initial Hash Values',
      description: 'MD5 uses four 32-bit state variables (A, B, C, D) initialized to specific constants.',
      blocks: [
        blk('a0', 'A₀', '0x' + a0.toString(16).padStart(8, '0'), 0.5, 0, '#fb923c', 'constant'),
        blk('b0', 'B₀', '0x' + b0.toString(16).padStart(8, '0'), 3, 0, '#facc15', 'constant'),
        blk('c0', 'C₀', '0x' + c0.toString(16).padStart(8, '0'), 5.5, 0, '#a3e635', 'constant'),
        blk('d0', 'D₀', '0x' + d0.toString(16).padStart(8, '0'), 8, 0, '#34d399', 'constant'),
      ],
      connections: [], operations: [], highlights: ['a0', 'b0', 'c0', 'd0'],
    });

    // Process each 512-bit block
    for (let blockIdx = 0; blockIdx < padded.length / 64; blockIdx++) {
      const block = padded.slice(blockIdx * 64, (blockIdx + 1) * 64);
      const M: number[] = [];
      for (let i = 0; i < 16; i++) {
        M.push(toU32(block[i*4] | (block[i*4+1] << 8) | (block[i*4+2] << 16) | (block[i*4+3] << 24)));
      }

      let a = a0, b = b0, c = c0, d = d0;

      // Show message schedule
      steps.push({
        id: `md5-schedule-${blockIdx}`, phase: 'Message Words', label: `Block ${blockIdx}: Message Words`,
        description: `Parse 512-bit block into 16 little-endian 32-bit words M[0]..M[15].`,
        blocks: M.slice(0, 8).map((w, i) =>
          blk(`m${blockIdx}-${i}`, `M[${i}]`, '0x' + w.toString(16).padStart(8, '0'), (i % 4) * 2.5, Math.floor(i / 4) * 1.2, '#fda4af', 'constant')
        ),
        connections: [], operations: [], highlights: M.slice(0, 4).map((_, i) => `m${blockIdx}-${i}`),
      });

      // Compression - show key rounds
      const showRounds = [0, 1, 15, 16, 31, 32, 47, 48, 63];
      for (const i of showRounds) {
        let f: number, g: number, fname: string;
        if (i < 16) {
          f = toU32((b & c) | ((~b) & d));
          g = i;
          fname = 'F = (B∧C)∨(¬B∧D)';
        } else if (i < 32) {
          f = toU32((d & b) | ((~d) & c));
          g = (5 * i + 1) % 16;
          fname = 'G = (D∧B)∨(¬D∧C)';
        } else if (i < 48) {
          f = toU32(b ^ c ^ d);
          g = (3 * i + 5) % 16;
          fname = 'H = B⊕C⊕D';
        } else {
          f = toU32(c ^ (b | (~d)));
          g = (7 * i) % 16;
          fname = 'I = C⊕(B∨¬D)';
        }
        const roundName = i < 16 ? 'F' : i < 32 ? 'G' : i < 48 ? 'H' : 'I';
        f = toU32(f + a + T[i] + M[g]);
        a = d; d = c; c = b; b = toU32(b + rotl(f, S[i]));

        steps.push({
          id: `md5-round-${blockIdx}-${i}`, phase: `Round ${i}`, label: `Round ${i} (${roundName} function)`,
          description: `${fname}\nf = f + A + T[${i}] + M[${g}], A=D, D=C, C=B, B = B + ROTL(f, ${S[i]})`,
          blocks: [
            blk(`r${i}-a`, 'A', '0x' + a.toString(16).padStart(8, '0'), 0.5, 0, '#fb923c', 'intermediate'),
            blk(`r${i}-b`, 'B', '0x' + b.toString(16).padStart(8, '0'), 3, 0, '#facc15', 'intermediate'),
            blk(`r${i}-c`, 'C', '0x' + c.toString(16).padStart(8, '0'), 5.5, 0, '#a3e635', 'intermediate'),
            blk(`r${i}-d`, 'D', '0x' + d.toString(16).padStart(8, '0'), 8, 0, '#34d399', 'intermediate'),
            blk(`r${i}-f`, fname, '0x' + f.toString(16).padStart(8, '0'), 3, 2, '#f43f5e', 'operation'),
            blk(`r${i}-t`, `T[${i}]`, '0x' + T[i].toString(16).padStart(8, '0'), 6, 2, '#818cf8', 'constant'),
          ],
          connections: [
            { from: `r${i}-f`, to: `r${i}-b`, animated: true, color: '#f43f5e', label: `ROTL(${S[i]})` },
          ],
          operations: [
            { id: `op-${i}`, type: 'rotate', label: `ROTL by ${S[i]}`, x: 4.5, y: 1, z: 0, color: '#f43f5e' },
          ],
          highlights: [`r${i}-b`],
        });
      }

      // After all 64 rounds
      a0 = toU32(a0 + a); b0 = toU32(b0 + b); c0 = toU32(c0 + c); d0 = toU32(d0 + d);
    }

    const hash = u32ToHexLE(a0) + u32ToHexLE(b0) + u32ToHexLE(c0) + u32ToHexLE(d0);

    steps.push({
      id: 'md5-output', phase: 'Output', label: 'MD5 Hash',
      description: `Final hash: ${hash}\nThe four state variables are concatenated in little-endian order to produce the 128-bit (32 hex character) MD5 digest.`,
      blocks: [
        blk('ha', 'A', '0x' + a0.toString(16).padStart(8, '0'), 0.5, 0, '#fb923c', 'output'),
        blk('hb', 'B', '0x' + b0.toString(16).padStart(8, '0'), 3, 0, '#facc15', 'output'),
        blk('hc', 'C', '0x' + c0.toString(16).padStart(8, '0'), 5.5, 0, '#a3e635', 'output'),
        blk('hd', 'D', '0x' + d0.toString(16).padStart(8, '0'), 8, 0, '#34d399', 'output'),
        blk('hash', 'MD5 Hash', hash, 4, 2, '#f43f5e', 'output'),
      ],
      connections: [
        { from: 'ha', to: 'hash', animated: true, color: '#fb923c' },
        { from: 'hb', to: 'hash', animated: true, color: '#facc15' },
        { from: 'hc', to: 'hash', animated: true, color: '#a3e635' },
        { from: 'hd', to: 'hash', animated: true, color: '#34d399' },
      ],
      operations: [], highlights: ['hash'],
    });

    return steps;
  },
};

export default md5Engine;
