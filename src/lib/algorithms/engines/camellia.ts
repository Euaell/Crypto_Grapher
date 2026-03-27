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

function readU32BE(bytes: number[], offset: number): number {
  return toU32((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]);
}

function writeU32BE(val: number): number[] {
  val = toU32(val);
  return [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff];
}

// Camellia S-boxes (first 16 entries of each for demo)
const SBOX1 = [112, 130, 44, 236, 179, 39, 192, 229, 228, 136, 70, 166, 241, 101, 245, 15];
const SBOX2 = [224, 5, 88, 217, 103, 78, 129, 203, 201, 17, 140, 77, 227, 202, 235, 30];
const SBOX3 = [56, 65, 22, 118, 217, 147, 96, 242, 114, 68, 35, 83, 248, 178, 250, 135];
const SBOX4 = [28, 161, 11, 59, 236, 202, 48, 121, 57, 34, 146, 170, 124, 89, 125, 196];

function camelliaSP(x: number): number {
  const b0 = SBOX1[x & 0xf] ^ SBOX2[(x >>> 4) & 0xf];
  const b1 = SBOX3[(x >>> 8) & 0xf] ^ SBOX4[(x >>> 12) & 0xf];
  return toU32((b0 << 16) | b1);
}

// Simplified F function
function camelliaF(x: number, k: number): number {
  const t = toU32(x ^ k);
  const sp = camelliaSP(t & 0xffff) ^ camelliaSP((t >>> 16) & 0xffff);
  // P-function: byte rotation and XOR mixing
  return toU32(sp ^ ((sp << 8) | (sp >>> 24)) ^ ((sp << 16) | (sp >>> 16)));
}

// FL function
function camelliaFL(x: number, k: number): number {
  const rotated = toU32((x & k) << 1) | toU32((x & k) >>> 31);
  const y1 = toU32(x ^ rotated);
  return toU32(y1 | k);
}

// FL-inverse function
function camelliaFLInv(y: number, k: number): number {
  const t = toU32(y | k);
  const rotated = toU32((t << 1) | (t >>> 31));
  return toU32(y ^ rotated);
}

const camelliaEngine: AlgorithmEngine = {
  meta: {
    id: 'camellia',
    name: 'Camellia',
    category: 'block-cipher',
    description: 'Camellia is a 128-bit block cipher jointly developed by Mitsubishi Electric and NTT. It provides security equivalent to AES and is an ISO/IEC international standard. It uses a Feistel structure with FL/FL^-1 layers.',
    keySize: '128-256',
    blockSize: 128,
    yearIntroduced: 2000,
    authors: 'Mitsubishi / NTT',
    status: 'standard',
    standardBody: 'RFC 3713',
    color: '#db2777',
    icon: '🌸',
  },
  inputConfig: {
    type: 'symmetric',
    fields: [
      { name: 'plaintext', label: 'Plaintext', type: 'text', placeholder: 'Enter text...', required: true, defaultValue: 'Camellia' },
      { name: 'key', label: 'Key', type: 'text', placeholder: 'Encryption key', required: true, defaultValue: 'secretkey1234567' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const plaintext = input.plaintext || 'Camellia';
    const key = input.key || 'secretkey1234567';
    const steps: VisualizationStep[] = [];

    const ptBytes = textToBytes(plaintext, 16);
    const keyBytes = textToBytes(key, 16);

    // Generate subkeys (simplified)
    const subkeys: number[] = [];
    for (let i = 0; i < 26; i++) {
      let sk = 0;
      for (let j = 0; j < 4; j++) {
        sk = toU32((sk << 8) | keyBytes[(i * 4 + j) % keyBytes.length]);
      }
      sk = toU32(sk ^ (0x6a09e667 * (i + 1)));
      sk = toU32(Math.imul(sk, 0xbb67ae85) ^ (sk >>> 13));
      subkeys.push(sk);
    }

    // Split plaintext into two 64-bit halves (as pairs of 32-bit words for simplicity)
    let L0 = readU32BE(ptBytes, 0);
    let L1 = readU32BE(ptBytes, 4);
    let R0 = readU32BE(ptBytes, 8);
    let R1 = readU32BE(ptBytes, 12);

    // Pre-whitening
    L0 = toU32(L0 ^ subkeys[0]);
    L1 = toU32(L1 ^ subkeys[1]);

    steps.push({
      id: 'cam-input', phase: 'Input', label: 'Input & Pre-Whitening',
      description: 'The 128-bit plaintext is split into two 64-bit halves (L and R). The left half is XORed with the first two subkeys (pre-whitening) before entering the Feistel rounds.',
      blocks: [
        blk('pt', 'Plaintext (128 bits)', bytesToHex(ptBytes), 3.5, 0, '#38bdf8', 'data'),
        blk('key', 'Key', bytesToHex(keyBytes), 3.5, 1, '#fbbf24', 'key'),
        blk('L', 'Left Half (64 bits)', `0x${L0.toString(16).padStart(8, '0')} ${L1.toString(16).padStart(8, '0')}`, 1.5, 2.5, '#db2777', 'intermediate'),
        blk('R', 'Right Half (64 bits)', `0x${R0.toString(16).padStart(8, '0')} ${R1.toString(16).padStart(8, '0')}`, 6, 2.5, '#db2777', 'intermediate'),
      ],
      connections: [
        { from: 'pt', to: 'L', animated: true, color: '#38bdf8' },
        { from: 'pt', to: 'R', animated: true, color: '#38bdf8' },
        { from: 'key', to: 'L', animated: true, label: 'XOR', color: '#fbbf24' },
      ],
      operations: [
        { id: 'op-prewhiten', type: 'xor', label: 'Pre-Whitening', x: 1.5, y: 1.8, z: 0, color: '#a78bfa' },
      ],
      highlights: ['L', 'R'],
    });

    steps.push({
      id: 'cam-keysched', phase: 'Key Schedule', label: 'Key Schedule',
      description: 'Camellia generates 26 subkeys from the 128-bit key using sigma constants and the Feistel structure. For 128-bit keys, 18 round subkeys plus whitening keys are produced.',
      blocks: [
        blk('ks-key', 'Key (128 bits)', bytesToHex(keyBytes), 3, 0, '#fbbf24', 'key'),
        blk('ks-sigma', 'Sigma Constants', 'Derived from sqrt(2), sqrt(3),...', 3, 1.2, '#818cf8', 'constant'),
        blk('ks-k0', 'K[0]', '0x' + subkeys[0].toString(16).padStart(8, '0'), 0.5, 2.5, '#db2777', 'key'),
        blk('ks-k1', 'K[1]', '0x' + subkeys[1].toString(16).padStart(8, '0'), 2.5, 2.5, '#db2777', 'key'),
        blk('ks-dots', '...', 'K[2]..K[23]', 4.5, 2.5, '#db2777', 'key'),
        blk('ks-k24', 'K[24]', '0x' + subkeys[24].toString(16).padStart(8, '0'), 6.5, 2.5, '#db2777', 'key'),
      ],
      connections: [
        { from: 'ks-key', to: 'ks-sigma', animated: true, color: '#fbbf24' },
        { from: 'ks-sigma', to: 'ks-k0', animated: true, color: '#db2777' },
        { from: 'ks-sigma', to: 'ks-k1', animated: true, color: '#db2777' },
        { from: 'ks-sigma', to: 'ks-k24', animated: true, color: '#db2777' },
      ],
      operations: [],
      highlights: ['ks-k0', 'ks-k1'],
    });

    // 18 rounds in 3 groups of 6 with FL/FL^-1 between
    const roundStates: { l0: number; l1: number; r0: number; r1: number }[] = [{ l0: L0, l1: L1, r0: R0, r1: R1 }];

    for (let round = 0; round < 18; round++) {
      const fResult = camelliaF(L0, subkeys[round + 2]);
      R0 = toU32(R0 ^ fResult);
      R1 = toU32(R1 ^ (fResult >>> 8));

      // Swap halves
      [L0, L1, R0, R1] = [R0, R1, L0, L1];

      // FL/FL^-1 layers after rounds 6 and 12
      if (round === 5 || round === 11) {
        L0 = camelliaFL(L0, subkeys[round + 3]);
        R0 = camelliaFLInv(R0, subkeys[round + 4]);
      }

      roundStates.push({ l0: L0, l1: L1, r0: R0, r1: R1 });
    }

    // Show representative rounds from each group
    const showRounds = [0, 5, 6, 11, 12, 17];
    for (const r of showRounds) {
      const st = roundStates[r];
      const next = roundStates[r + 1];
      const isFlLayer = r === 5 || r === 11;
      const groupNum = r < 6 ? 1 : r < 12 ? 2 : 3;

      steps.push({
        id: `cam-round-${r}`, phase: `Group ${groupNum}, Round ${r + 1}`, label: `Feistel Round ${r + 1}${isFlLayer ? ' + FL Layer' : ''}`,
        description: `Round ${r + 1}: Apply F function with subkey K[${r + 2}], XOR result with right half, swap halves.${isFlLayer ? ` Then apply FL/FL^{-1} layers for additional diffusion between the 6-round groups.` : ''}`,
        blocks: [
          blk(`r${r}-L`, 'L (input)', `0x${st.l0.toString(16).padStart(8, '0')}`, 1, 0, '#db2777', 'intermediate'),
          blk(`r${r}-R`, 'R (input)', `0x${st.r0.toString(16).padStart(8, '0')}`, 6, 0, '#db2777', 'intermediate'),
          blk(`r${r}-f`, `F(L, K[${r + 2}])`, 'S-box + P-function', 3, 1.2, '#a78bfa', 'operation'),
          blk(`r${r}-xor`, 'XOR with R', `⊕`, 5.5, 1.2, '#f472b6', 'operation'),
          ...(isFlLayer ? [
            blk(`r${r}-fl`, 'FL Layer', 'FL(L) / FL⁻¹(R)', 3, 2.5, '#06b6d4', 'operation'),
          ] : []),
          blk(`r${r}-nL`, 'New L', `0x${next.l0.toString(16).padStart(8, '0')}`, 1, isFlLayer ? 3.5 : 2.8, '#34d399', 'intermediate'),
          blk(`r${r}-nR`, 'New R', `0x${next.r0.toString(16).padStart(8, '0')}`, 6, isFlLayer ? 3.5 : 2.8, '#34d399', 'intermediate'),
        ],
        connections: [
          { from: `r${r}-L`, to: `r${r}-f`, animated: true, color: '#db2777' },
          { from: `r${r}-f`, to: `r${r}-xor`, animated: true, color: '#a78bfa' },
          { from: `r${r}-R`, to: `r${r}-xor`, animated: true, color: '#db2777' },
          ...(isFlLayer ? [
            { from: `r${r}-xor`, to: `r${r}-fl`, animated: true, color: '#f472b6' },
            { from: `r${r}-fl`, to: `r${r}-nL`, animated: true, color: '#06b6d4' },
            { from: `r${r}-fl`, to: `r${r}-nR`, animated: true, color: '#06b6d4' },
          ] : [
            { from: `r${r}-xor`, to: `r${r}-nR`, animated: true, label: 'swap', color: '#f472b6' },
            { from: `r${r}-L`, to: `r${r}-nR`, animated: true, label: 'swap', color: '#db2777', dashed: true },
          ]),
        ],
        operations: [
          { id: `op-f-${r}`, type: 'sbox', label: 'F Function', x: 3, y: 1.2, z: 0, color: '#a78bfa' },
          ...(isFlLayer ? [{ id: `op-fl-${r}`, type: 'mix' as const, label: 'FL/FL⁻¹', x: 3, y: 2.5, z: 0, color: '#06b6d4' }] : []),
        ],
        highlights: [`r${r}-nL`, `r${r}-nR`],
      });
    }

    // Post-whitening and output
    const c0 = toU32(R0 ^ subkeys[24]);
    const c1 = toU32(R1 ^ subkeys[25]);
    const cipherBytes = [...writeU32BE(c0), ...writeU32BE(c1), ...writeU32BE(L0), ...writeU32BE(L1)];

    steps.push({
      id: 'cam-output', phase: 'Output', label: 'Post-Whitening & Ciphertext',
      description: 'After 18 rounds (3 groups of 6 with FL layers between), the right half is XORed with the final subkeys (post-whitening) and the halves are concatenated to form the 128-bit ciphertext.',
      blocks: [
        blk('out-L', 'Final L', `0x${L0.toString(16).padStart(8, '0')}`, 1.5, 0, '#db2777', 'intermediate'),
        blk('out-R', 'Final R', `0x${R0.toString(16).padStart(8, '0')}`, 5.5, 0, '#db2777', 'intermediate'),
        blk('post-xor', 'Post-Whitening XOR', `⊕ K[24], K[25]`, 3.5, 1.5, '#a78bfa', 'operation'),
        blk('cipher', 'Ciphertext', bytesToHex(cipherBytes), 3.5, 3, '#db2777', 'output'),
      ],
      connections: [
        { from: 'out-L', to: 'post-xor', animated: true, color: '#db2777' },
        { from: 'out-R', to: 'post-xor', animated: true, color: '#db2777' },
        { from: 'post-xor', to: 'cipher', animated: true, color: '#34d399' },
      ],
      operations: [
        { id: 'op-post', type: 'xor', label: 'Post-Whitening', x: 3.5, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['cipher'],
    });

    return steps;
  },
};

export default camelliaEngine;
