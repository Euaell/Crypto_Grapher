import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xff);
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simplified HMAC simulation for visualization
function simpleHMAC(key: number[], data: number[]): number[] {
  const blockSize = 64;
  let k = [...key];
  if (k.length > blockSize) {
    k = simpleHash(k);
  }
  while (k.length < blockSize) k.push(0);

  const ipad = k.map((b, i) => b ^ 0x36);
  const opad = k.map((b, i) => b ^ 0x5c);

  const inner = simpleHash([...ipad, ...data]);
  const outer = simpleHash([...opad, ...inner]);
  return outer;
}

function simpleHash(data: number[]): number[] {
  // Simplified hash producing 32 bytes for demonstration
  const result: number[] = new Array(32).fill(0);
  for (let i = 0; i < data.length; i++) {
    result[i % 32] = (result[i % 32] + data[i] * 31 + i * 17) & 0xff;
    result[(i + 7) % 32] ^= (data[i] * 13 + result[i % 32]) & 0xff;
  }
  // Extra mixing
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < 32; i++) {
      result[i] = (result[i] + result[(i + 1) % 32] * 7 + round) & 0xff;
    }
  }
  return result;
}

const hkdfEngine: AlgorithmEngine = {
  meta: {
    id: 'hkdf',
    name: 'HKDF',
    category: 'key-derivation',
    description: 'HMAC-based Key Derivation Function (HKDF) is a simple and efficient KDF based on HMAC. It follows an extract-then-expand paradigm to derive cryptographically strong keying material from input key material.',
    keySize: 'variable',
    yearIntroduced: 2010,
    authors: 'Hugo Krawczyk',
    status: 'standard',
    standardBody: 'RFC 5869',
    color: '#0ea5e9',
    icon: '🔑',
  },
  inputConfig: {
    type: 'kdf',
    fields: [
      { name: 'ikm', label: 'Input Key Material', type: 'text', placeholder: 'Input key material...', required: true, defaultValue: 'shared-secret' },
      { name: 'salt', label: 'Salt', type: 'text', placeholder: 'Optional salt', required: false, defaultValue: 'salt-value' },
      { name: 'info', label: 'Context info', type: 'text', placeholder: 'Context and application info', required: false, defaultValue: 'app-context' },
      { name: 'length', label: 'Output Length (bytes)', type: 'number', placeholder: '32', required: true, defaultValue: '32' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const ikm = input.ikm || 'shared-secret';
    const salt = input.salt || 'salt-value';
    const info = input.info || 'app-context';
    const length = Math.min(Math.max(parseInt(input.length) || 32, 1), 255 * 32);
    const steps: VisualizationStep[] = [];

    const ikmBytes = textToBytes(ikm);
    const saltBytes = textToBytes(salt);
    const infoBytes = textToBytes(info);

    steps.push({
      id: 'hkdf-input', phase: 'Input', label: 'HKDF Inputs',
      description: 'HKDF takes four inputs: Input Key Material (IKM) which may not be uniformly random, an optional salt, context info for domain separation, and the desired output length.',
      blocks: [
        blk('ikm', 'IKM', `"${ikm}" (${ikmBytes.length} bytes)`, 1, 0, '#38bdf8', 'data'),
        blk('salt', 'Salt', `"${salt}" (${saltBytes.length} bytes)`, 4.5, 0, '#fbbf24', 'key'),
        blk('info', 'Info', `"${info}"`, 1, 1.5, '#a78bfa', 'data'),
        blk('len', 'Length', `${length} bytes`, 4.5, 1.5, '#818cf8', 'constant'),
      ],
      connections: [],
      operations: [],
      highlights: ['ikm', 'salt', 'info', 'len'],
    });

    // Extract phase: PRK = HMAC-Hash(salt, IKM)
    const prk = simpleHMAC(saltBytes, ikmBytes);

    steps.push({
      id: 'hkdf-extract', phase: 'Extract', label: 'Extract: PRK = HMAC(salt, IKM)',
      description: 'The Extract step uses HMAC with the salt as key and IKM as data to produce a pseudorandom key (PRK). This "extracts" the randomness from the IKM into a fixed-length, uniformly distributed key.',
      blocks: [
        blk('ext-salt', 'Salt (HMAC key)', `"${salt}"`, 1, 0, '#fbbf24', 'key'),
        blk('ext-ikm', 'IKM (HMAC data)', `"${ikm}"`, 5, 0, '#38bdf8', 'data'),
        blk('ext-hmac', 'HMAC-SHA256', 'HMAC(salt, IKM)', 3, 1.5, '#a78bfa', 'operation'),
        blk('prk', 'PRK (Pseudorandom Key)', bytesToHex(prk), 3, 3, '#0ea5e9', 'key'),
      ],
      connections: [
        { from: 'ext-salt', to: 'ext-hmac', animated: true, color: '#fbbf24' },
        { from: 'ext-ikm', to: 'ext-hmac', animated: true, color: '#38bdf8' },
        { from: 'ext-hmac', to: 'prk', animated: true, color: '#0ea5e9' },
      ],
      operations: [
        { id: 'op-extract', type: 'hash', label: 'HMAC-SHA256', x: 3, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['prk'],
    });

    // Expand phase
    const hashLen = 32; // SHA-256 output length
    const n = Math.ceil(length / hashLen);

    steps.push({
      id: 'hkdf-expand-setup', phase: 'Expand', label: 'Expand Setup',
      description: `The Expand step generates the output key material (OKM) by computing N = ceil(L/HashLen) = ceil(${length}/${hashLen}) = ${n} HMAC iterations. T(0) is empty, and each T(i) = HMAC(PRK, T(i-1) || info || i).`,
      blocks: [
        blk('prk2', 'PRK', bytesToHex(prk.slice(0, 8)) + '...', 3, 0, '#0ea5e9', 'key'),
        blk('n-val', 'N iterations', String(n), 1, 1.5, '#818cf8', 'constant'),
        blk('t0', 'T(0)', 'empty string ""', 5, 1.5, '#a78bfa', 'intermediate'),
        blk('formula', 'T(i) = HMAC(PRK, T(i-1) || info || i)', 'Expand formula', 3, 3, '#14b8a6', 'operation'),
      ],
      connections: [
        { from: 'prk2', to: 'formula', animated: true, color: '#0ea5e9' },
        { from: 't0', to: 'formula', animated: true, color: '#a78bfa' },
      ],
      operations: [],
      highlights: ['formula'],
    });

    // Compute T(1)..T(n)
    let prevT: number[] = [];
    const allT: number[][] = [];

    for (let i = 1; i <= Math.min(n, 4); i++) {
      const hmacInput = [...prevT, ...infoBytes, i];
      const ti = simpleHMAC(prk, hmacInput);
      allT.push(ti);

      steps.push({
        id: `hkdf-t${i}`, phase: 'Expand', label: `Expand: Compute T(${i})`,
        description: `T(${i}) = HMAC(PRK, ${i === 1 ? '""' : `T(${i - 1})`} || info || ${i}). The info string provides domain separation so the same PRK can derive different keys for different purposes.`,
        blocks: [
          blk(`prev-t${i}`, i === 1 ? 'T(0) = ""' : `T(${i - 1})`, i === 1 ? '(empty)' : bytesToHex(prevT.slice(0, 8)) + '...', 1, 0, '#a78bfa', 'intermediate'),
          blk(`info-${i}`, 'info', `"${info}"`, 4, 0, '#818cf8', 'data'),
          blk(`counter-${i}`, 'Counter', String(i), 7, 0, '#f472b6', 'constant'),
          blk(`concat-${i}`, 'Concatenate', `T(${i - 1}) || info || ${i}`, 3.5, 1.3, '#a78bfa', 'operation'),
          blk(`hmac-${i}`, 'HMAC(PRK, ...)', 'HMAC-SHA256', 3.5, 2.5, '#0ea5e9', 'operation'),
          blk(`t${i}`, `T(${i})`, bytesToHex(ti), 3.5, 3.7, '#34d399', 'intermediate'),
        ],
        connections: [
          { from: `prev-t${i}`, to: `concat-${i}`, animated: true, color: '#a78bfa' },
          { from: `info-${i}`, to: `concat-${i}`, animated: true, color: '#818cf8' },
          { from: `counter-${i}`, to: `concat-${i}`, animated: true, color: '#f472b6' },
          { from: `concat-${i}`, to: `hmac-${i}`, animated: true, color: '#a78bfa' },
          { from: `hmac-${i}`, to: `t${i}`, animated: true, color: '#0ea5e9' },
        ],
        operations: [
          { id: `op-hmac-${i}`, type: 'hash', label: 'HMAC', x: 3.5, y: 2.5, z: 0, color: '#0ea5e9' },
        ],
        highlights: [`t${i}`],
      });

      prevT = ti;
    }

    // Output: OKM = first L bytes of T(1) || T(2) || ...
    const okm: number[] = [];
    for (const t of allT) okm.push(...t);
    const okmTruncated = okm.slice(0, length);

    steps.push({
      id: 'hkdf-output', phase: 'Output', label: 'Output Key Material (OKM)',
      description: `The OKM is the first ${length} bytes of T(1) || T(2) || ... || T(${n}). This derived key material is suitable for use as cryptographic keys.`,
      blocks: [
        ...allT.slice(0, Math.min(4, n)).map((t, i) =>
          blk(`out-t${i + 1}`, `T(${i + 1})`, bytesToHex(t.slice(0, 8)) + '...', 1 + i * 2.2, 0, '#a78bfa', 'intermediate')
        ),
        blk('concat', 'Concatenate & Truncate', `First ${length} bytes`, 3.5, 1.5, '#0ea5e9', 'operation'),
        blk('okm', `OKM (${length} bytes)`, bytesToHex(okmTruncated.slice(0, 16)) + (length > 16 ? '...' : ''), 3.5, 3, '#0ea5e9', 'output'),
      ],
      connections: [
        ...allT.slice(0, Math.min(4, n)).map((_, i) => ({
          from: `out-t${i + 1}`, to: 'concat', animated: true, color: '#a78bfa',
        })),
        { from: 'concat', to: 'okm', animated: true, color: '#0ea5e9' },
      ],
      operations: [],
      highlights: ['okm'],
    });

    return steps;
  },
};

export default hkdfEngine;
