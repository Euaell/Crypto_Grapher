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

function readU32LE(bytes: number[], offset: number): number {
  return toU32(bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24));
}

function writeU32LE(val: number): number[] {
  val = toU32(val);
  return [val & 0xff, (val >>> 8) & 0xff, (val >>> 16) & 0xff, (val >>> 24) & 0xff];
}

// Simplified MDS matrix multiply (one column)
function mdsMultiply(x: number): number {
  // Simplified: rotate and XOR to simulate MDS mixing
  return toU32(((x << 1) ^ (x >>> 7) ^ (x << 5) ^ (x >>> 3)) & 0xffffffff);
}

// Simplified q-permutation (Twofish uses two 4-bit permutations composed)
function qPerm(x: number, which: number): number {
  const q0 = [0x8, 0x1, 0x7, 0xD, 0x6, 0xF, 0x3, 0x2, 0x0, 0xB, 0x5, 0x9, 0xE, 0xC, 0xA, 0x4];
  const q1 = [0x2, 0x8, 0xB, 0xD, 0xF, 0x7, 0x6, 0xE, 0x3, 0x1, 0x9, 0x4, 0x0, 0xA, 0xC, 0x5];
  const q = which === 0 ? q0 : q1;
  return (q[(x >>> 4) & 0xf] << 4) | q[x & 0xf];
}

// Simplified S-box (key-dependent)
function sBox(x: number, keyByte: number): number {
  return qPerm(x ^ keyByte, 0) ^ qPerm(x ^ (keyByte >>> 1), 1);
}

// Simplified F function
function fFunction(x0: number, x1: number, subkeys: number[], round: number, keyBytes: number[]): [number, number] {
  // g function on x0 and x1 through key-dependent S-boxes
  const t0Bytes = [
    sBox(x0 & 0xff, keyBytes[0]),
    sBox((x0 >>> 8) & 0xff, keyBytes[1]),
    sBox((x0 >>> 16) & 0xff, keyBytes[2]),
    sBox((x0 >>> 24) & 0xff, keyBytes[3]),
  ];
  const t1Bytes = [
    sBox(x1 & 0xff, keyBytes[4]),
    sBox((x1 >>> 8) & 0xff, keyBytes[5]),
    sBox((x1 >>> 16) & 0xff, keyBytes[6]),
    sBox((x1 >>> 24) & 0xff, keyBytes[7]),
  ];

  // MDS matrix multiply (simplified)
  let t0 = toU32(t0Bytes[0] | (t0Bytes[1] << 8) | (t0Bytes[2] << 16) | (t0Bytes[3] << 24));
  let t1 = toU32(t1Bytes[0] | (t1Bytes[1] << 8) | (t1Bytes[2] << 16) | (t1Bytes[3] << 24));
  t0 = mdsMultiply(t0);
  t1 = mdsMultiply(t1);

  // PHT (Pseudo-Hadamard Transform) + subkey addition
  const f0 = toU32(t0 + t1 + subkeys[round * 2]);
  const f1 = toU32(t0 + 2 * t1 + subkeys[round * 2 + 1]);

  return [f0, f1];
}

const twofishEngine: AlgorithmEngine = {
  meta: {
    id: 'twofish',
    name: 'Twofish',
    category: 'block-cipher',
    description: 'Twofish is a 128-bit block cipher with key sizes up to 256 bits. An AES finalist designed by Bruce Schneier et al., it uses key-dependent S-boxes, an MDS matrix, a Pseudo-Hadamard Transform, and 16 Feistel rounds.',
    keySize: '128-256',
    blockSize: 128,
    yearIntroduced: 1998,
    authors: 'Bruce Schneier, et al.',
    status: 'recommended',
    color: '#059669',
    icon: '🐠',
  },
  inputConfig: {
    type: 'symmetric',
    fields: [
      { name: 'plaintext', label: 'Plaintext', type: 'text', placeholder: 'Enter text...', required: true, defaultValue: 'Twofish!' },
      { name: 'key', label: 'Key', type: 'text', placeholder: 'Encryption key', required: true, defaultValue: 'secretkey1234567' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const plaintext = input.plaintext || 'Twofish!';
    const key = input.key || 'secretkey1234567';
    const steps: VisualizationStep[] = [];

    const ptBytes = textToBytes(plaintext, 16);
    const keyBytes = textToBytes(key, 16);

    // Generate subkeys (simplified: derive from key via mixing)
    const subkeys: number[] = [];
    for (let i = 0; i < 40; i++) {
      let sk = 0x01010101 * i;
      for (let j = 0; j < keyBytes.length; j++) {
        sk = toU32(sk ^ (keyBytes[j] << ((j % 4) * 8)));
        sk = toU32(Math.imul(sk, 0x5bd1e995) ^ (sk >>> 15));
      }
      subkeys.push(sk);
    }

    // Input whitening
    let w0 = toU32(readU32LE(ptBytes, 0) ^ subkeys[0]);
    let w1 = toU32(readU32LE(ptBytes, 4) ^ subkeys[1]);
    let w2 = toU32(readU32LE(ptBytes, 8) ^ subkeys[2]);
    let w3 = toU32(readU32LE(ptBytes, 12) ^ subkeys[3]);

    steps.push({
      id: 'tf-input', phase: 'Input', label: 'Input & Whitening',
      description: 'The 128-bit plaintext is split into four 32-bit words and XORed with the first four subkeys (input whitening). This provides an initial key-dependent transformation.',
      blocks: [
        blk('pt', 'Plaintext (128 bits)', bytesToHex(ptBytes), 3.5, 0, '#38bdf8', 'data'),
        blk('key-in', 'Key', bytesToHex(keyBytes), 3.5, 1, '#fbbf24', 'key'),
        blk('w0', 'Word 0', '0x' + w0.toString(16).padStart(8, '0'), 0.5, 2.5, '#059669', 'intermediate'),
        blk('w1', 'Word 1', '0x' + w1.toString(16).padStart(8, '0'), 3, 2.5, '#059669', 'intermediate'),
        blk('w2', 'Word 2', '0x' + w2.toString(16).padStart(8, '0'), 5.5, 2.5, '#059669', 'intermediate'),
        blk('w3', 'Word 3', '0x' + w3.toString(16).padStart(8, '0'), 8, 2.5, '#059669', 'intermediate'),
      ],
      connections: [
        { from: 'pt', to: 'w0', animated: true, color: '#38bdf8' },
        { from: 'pt', to: 'w1', animated: true, color: '#38bdf8' },
        { from: 'pt', to: 'w2', animated: true, color: '#38bdf8' },
        { from: 'pt', to: 'w3', animated: true, color: '#38bdf8' },
      ],
      operations: [
        { id: 'op-whiten', type: 'xor', label: 'Input Whitening', x: 3.5, y: 1.8, z: 0, color: '#a78bfa' },
      ],
      highlights: ['w0', 'w1', 'w2', 'w3'],
    });

    steps.push({
      id: 'tf-keysched', phase: 'Key Schedule', label: 'Key Schedule',
      description: 'Twofish derives 40 subkeys and key-dependent S-boxes from the cipher key. The key is processed through a Reed-Solomon code to generate S-box keys, and pairs of subkeys are generated using the h function and PHT.',
      blocks: [
        blk('ks-key', 'Cipher Key', bytesToHex(keyBytes), 3, 0, '#fbbf24', 'key'),
        blk('ks-rs', 'Reed-Solomon', 'Generate S-box keys', 1, 1.5, '#a78bfa', 'operation'),
        blk('ks-sbox', 'Key-Dependent S-boxes', `S-key: 0x${subkeys[4].toString(16).padStart(8, '0')}...`, 1, 3, '#059669', 'intermediate'),
        blk('ks-h', 'h Function', 'Generate subkey pairs', 5.5, 1.5, '#f472b6', 'operation'),
        blk('ks-sub', 'Subkeys (K0..K39)', `K0=0x${subkeys[0].toString(16).padStart(8, '0')}, K1=0x${subkeys[1].toString(16).padStart(8, '0')}...`, 5.5, 3, '#059669', 'intermediate'),
      ],
      connections: [
        { from: 'ks-key', to: 'ks-rs', animated: true, color: '#fbbf24' },
        { from: 'ks-key', to: 'ks-h', animated: true, color: '#fbbf24' },
        { from: 'ks-rs', to: 'ks-sbox', animated: true, color: '#a78bfa' },
        { from: 'ks-h', to: 'ks-sub', animated: true, color: '#f472b6' },
      ],
      operations: [
        { id: 'op-rs', type: 'mix', label: 'Reed-Solomon', x: 1, y: 1.5, z: 0, color: '#a78bfa' },
        { id: 'op-h', type: 'expand', label: 'h Function', x: 5.5, y: 1.5, z: 0, color: '#f472b6' },
      ],
      highlights: ['ks-sbox', 'ks-sub'],
    });

    // 16 Feistel rounds (show select rounds)
    const showRounds = [0, 1, 7, 15];
    for (const r of showRounds) {
      // Compute round for all rounds up to this one
      if (r === showRounds[0]) {
        // Initial state already set
      }

      const [f0, f1] = fFunction(w0, w1, subkeys.slice(8), r, keyBytes);

      const newW2 = toU32((w2 ^ f0) >>> 0);
      const rotW2 = toU32(((newW2 >>> 1) | (newW2 << 31)));
      const newW3 = toU32(((w3 << 1) | (w3 >>> 31)) ^ f1);

      steps.push({
        id: `tf-round-${r}`, phase: `Round ${r + 1}`, label: `Feistel Round ${r + 1}`,
        description: `Round ${r + 1}: Words 0,1 go through the F function (S-boxes, MDS, PHT, subkey add). F outputs are XORed with words 2,3 (with rotations), then halves swap.`,
        blocks: [
          blk(`r${r}-w0`, 'Word 0', '0x' + w0.toString(16).padStart(8, '0'), 0.5, 0, '#059669', 'intermediate'),
          blk(`r${r}-w1`, 'Word 1', '0x' + w1.toString(16).padStart(8, '0'), 3, 0, '#059669', 'intermediate'),
          blk(`r${r}-sbox`, 'S-boxes', 'Key-dependent', 1.5, 1.2, '#f472b6', 'operation'),
          blk(`r${r}-mds`, 'MDS Matrix', '4x4 over GF(2^8)', 4, 1.2, '#a78bfa', 'operation'),
          blk(`r${r}-pht`, 'PHT + K', `+ K[${8 + r * 2}], K[${9 + r * 2}]`, 3, 2.3, '#818cf8', 'operation'),
          blk(`r${r}-f0`, 'F0', '0x' + f0.toString(16).padStart(8, '0'), 1, 3.3, '#34d399', 'intermediate'),
          blk(`r${r}-f1`, 'F1', '0x' + f1.toString(16).padStart(8, '0'), 4.5, 3.3, '#34d399', 'intermediate'),
          blk(`r${r}-nw2`, 'New W2 (ROR 1)', '0x' + rotW2.toString(16).padStart(8, '0'), 6, 3.3, '#059669', 'intermediate'),
          blk(`r${r}-nw3`, 'New W3 (ROL 1)', '0x' + newW3.toString(16).padStart(8, '0'), 8, 3.3, '#059669', 'intermediate'),
        ],
        connections: [
          { from: `r${r}-w0`, to: `r${r}-sbox`, animated: true, color: '#059669' },
          { from: `r${r}-w1`, to: `r${r}-sbox`, animated: true, color: '#059669' },
          { from: `r${r}-sbox`, to: `r${r}-mds`, animated: true, color: '#f472b6' },
          { from: `r${r}-mds`, to: `r${r}-pht`, animated: true, color: '#a78bfa' },
          { from: `r${r}-pht`, to: `r${r}-f0`, animated: true, color: '#818cf8' },
          { from: `r${r}-pht`, to: `r${r}-f1`, animated: true, color: '#818cf8' },
        ],
        operations: [
          { id: `op-sbox-${r}`, type: 'sbox', label: 'S-boxes', x: 1.5, y: 1.2, z: 0, color: '#f472b6' },
          { id: `op-mds-${r}`, type: 'mix', label: 'MDS', x: 4, y: 1.2, z: 0, color: '#a78bfa' },
          { id: `op-pht-${r}`, type: 'add', label: 'PHT', x: 3, y: 2.3, z: 0, color: '#818cf8' },
        ],
        highlights: [`r${r}-f0`, `r${r}-f1`, `r${r}-nw2`, `r${r}-nw3`],
      });

      // Swap for next round
      const tmpW0 = w0, tmpW1 = w1;
      w0 = rotW2;
      w1 = newW3;
      w2 = tmpW0;
      w3 = tmpW1;
    }

    // Output whitening
    const c0 = toU32(w0 ^ subkeys[4]);
    const c1 = toU32(w1 ^ subkeys[5]);
    const c2 = toU32(w2 ^ subkeys[6]);
    const c3 = toU32(w3 ^ subkeys[7]);

    const cipherBytes = [...writeU32LE(c0), ...writeU32LE(c1), ...writeU32LE(c2), ...writeU32LE(c3)];

    steps.push({
      id: 'tf-output-whiten', phase: 'Output Whitening', label: 'Output Whitening',
      description: 'After 16 rounds, the four words are XORed with subkeys K4..K7 (output whitening), undoing the initial structure to produce the final ciphertext.',
      blocks: [
        blk('ow-w0', 'Word 0', '0x' + w0.toString(16).padStart(8, '0'), 0.5, 0, '#059669', 'intermediate'),
        blk('ow-w1', 'Word 1', '0x' + w1.toString(16).padStart(8, '0'), 3, 0, '#059669', 'intermediate'),
        blk('ow-w2', 'Word 2', '0x' + w2.toString(16).padStart(8, '0'), 5.5, 0, '#059669', 'intermediate'),
        blk('ow-w3', 'Word 3', '0x' + w3.toString(16).padStart(8, '0'), 8, 0, '#059669', 'intermediate'),
        blk('ow-xor', 'XOR with K4..K7', 'Output whitening', 4, 1.5, '#a78bfa', 'operation'),
        blk('cipher', 'Ciphertext', bytesToHex(cipherBytes), 4, 3, '#059669', 'output'),
      ],
      connections: [
        { from: 'ow-w0', to: 'ow-xor', animated: true, color: '#059669' },
        { from: 'ow-w1', to: 'ow-xor', animated: true, color: '#059669' },
        { from: 'ow-w2', to: 'ow-xor', animated: true, color: '#059669' },
        { from: 'ow-w3', to: 'ow-xor', animated: true, color: '#059669' },
        { from: 'ow-xor', to: 'cipher', animated: true, color: '#34d399' },
      ],
      operations: [
        { id: 'op-out-whiten', type: 'xor', label: 'Output XOR', x: 4, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['cipher'],
    });

    return steps;
  },
};

export default twofishEngine;
