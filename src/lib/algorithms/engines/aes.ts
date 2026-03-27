import type {
  AlgorithmEngine,
  VisualizationStep,
  DataBlock,
  Connection,
  Operation,
} from '@/lib/algorithms/types';

// ── AES S-box (all 256 values) ──────────────────────────────────────────────

const SBOX: number[] = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
];

// ── AES Rcon (round constants) ──────────────────────────────────────────────

const RCON: number[] = [
  0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36,
];

// ── Galois Field multiplication in GF(2^8) ──────────────────────────────────

function gmul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hiBit = a & 0x80;
    a = (a << 1) & 0xff;
    if (hiBit) a ^= 0x1b; // irreducible polynomial x^8 + x^4 + x^3 + x + 1
    b >>= 1;
  }
  return p;
}

// ── Hex formatting helpers ──────────────────────────────────────────────────

function hex8(n: number): string {
  return (n & 0xff).toString(16).padStart(2, '0');
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(hex8).join('');
}

// ── AES state is a 4x4 matrix stored column-major ──────────────────────────

type State = number[][];

function bytesToState(bytes: number[]): State {
  const s: State = Array.from({ length: 4 }, () => new Array(4).fill(0));
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      s[row][col] = bytes[col * 4 + row];
    }
  }
  return s;
}

function stateToBytes(s: State): number[] {
  const bytes: number[] = [];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      bytes.push(s[row][col]);
    }
  }
  return bytes;
}

function cloneState(s: State): State {
  return s.map(row => [...row]);
}

function stateToHexGrid(s: State): string {
  return s.map(row => row.map(hex8).join(' ')).join('\n');
}

// ── AES core operations ─────────────────────────────────────────────────────

function subBytes(s: State): State {
  const out = cloneState(s);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      out[r][c] = SBOX[s[r][c]];
    }
  }
  return out;
}

function shiftRows(s: State): State {
  const out = cloneState(s);
  // Row 0: no shift
  // Row 1: shift left by 1
  for (let c = 0; c < 4; c++) out[1][c] = s[1][(c + 1) % 4];
  // Row 2: shift left by 2
  for (let c = 0; c < 4; c++) out[2][c] = s[2][(c + 2) % 4];
  // Row 3: shift left by 3
  for (let c = 0; c < 4; c++) out[3][c] = s[3][(c + 3) % 4];
  return out;
}

function mixColumns(s: State): State {
  const out = cloneState(s);
  for (let c = 0; c < 4; c++) {
    const a = [s[0][c], s[1][c], s[2][c], s[3][c]];
    out[0][c] = gmul(a[0], 2) ^ gmul(a[1], 3) ^ a[2] ^ a[3];
    out[1][c] = a[0] ^ gmul(a[1], 2) ^ gmul(a[2], 3) ^ a[3];
    out[2][c] = a[0] ^ a[1] ^ gmul(a[2], 2) ^ gmul(a[3], 3);
    out[3][c] = gmul(a[0], 3) ^ a[1] ^ a[2] ^ gmul(a[3], 2);
  }
  return out;
}

function addRoundKey(s: State, roundKey: State): State {
  const out = cloneState(s);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      out[r][c] = s[r][c] ^ roundKey[r][c];
    }
  }
  return out;
}

// ── AES-128 Key Expansion ───────────────────────────────────────────────────

function keyExpansion(keyBytes: number[]): number[][] {
  // Produces 44 words (4 bytes each) = 11 round keys
  const w: number[][] = [];

  // First 4 words are the key itself
  for (let i = 0; i < 4; i++) {
    w[i] = [keyBytes[4 * i], keyBytes[4 * i + 1], keyBytes[4 * i + 2], keyBytes[4 * i + 3]];
  }

  for (let i = 4; i < 44; i++) {
    let temp = [...w[i - 1]];
    if (i % 4 === 0) {
      // RotWord
      temp = [temp[1], temp[2], temp[3], temp[0]];
      // SubWord
      temp = temp.map(b => SBOX[b]);
      // XOR with Rcon
      temp[0] ^= RCON[i / 4 - 1];
    }
    w[i] = w[i - 4].map((b, j) => b ^ temp[j]);
  }

  return w;
}

function getRoundKey(words: number[][], round: number): State {
  const s: State = Array.from({ length: 4 }, () => new Array(4).fill(0));
  for (let col = 0; col < 4; col++) {
    const word = words[round * 4 + col];
    for (let row = 0; row < 4; row++) {
      s[row][col] = word[row];
    }
  }
  return s;
}

// ── UTF-8 encoding helper ───────────────────────────────────────────────────

function textToBytes(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

// ── PKCS7 pad to 16 bytes ───────────────────────────────────────────────────

function pkcs7Pad(bytes: number[]): number[] {
  const padLen = 16 - (bytes.length % 16);
  // If already multiple of 16, still add a full block of padding
  const result = [...bytes];
  for (let i = 0; i < padLen; i++) result.push(padLen);
  return result.slice(0, 16); // For visualization we only encrypt the first block
}

// ── Prepare key: pad/truncate to 16 bytes ───────────────────────────────────

function prepareKey(text: string): number[] {
  const bytes = textToBytes(text);
  if (bytes.length >= 16) return bytes.slice(0, 16);
  const result = new Array(16).fill(0);
  for (let i = 0; i < bytes.length; i++) result[i] = bytes[i];
  return result;
}

// ── Visualization helpers ───────────────────────────────────────────────────

const BLUE = '#3b82f6';
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const RED = '#ef4444';
const PURPLE = '#8b5cf6';
const CYAN = '#06b6d4';
const PINK = '#ec4899';

function makeStateBlocks(
  state: State,
  idPrefix: string,
  label: string,
  x: number,
  y: number,
  color: string,
  type: DataBlock['type'],
  group?: string,
): DataBlock[] {
  const blocks: DataBlock[] = [];
  // Create a single block showing the 4x4 grid
  blocks.push({
    id: `${idPrefix}-grid`,
    label,
    value: stateToHexGrid(state),
    x,
    y,
    z: 0,
    width: 3,
    height: 2,
    color,
    type,
    group: group ?? idPrefix,
    fontSize: 12,
  });
  // Individual cell blocks for detailed visualization
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      blocks.push({
        id: `${idPrefix}-${r}-${c}`,
        label: `[${r},${c}]`,
        value: hex8(state[r][c]),
        x: x + c * 0.7,
        y: y + 2.5 + r * 0.5,
        z: 0,
        width: 0.6,
        height: 0.4,
        color,
        type,
        group: group ?? idPrefix,
        fontSize: 10,
        opacity: 0.85,
      });
    }
  }
  return blocks;
}

function makeRoundKeyBlocks(
  roundKey: State,
  round: number,
  x: number,
  y: number,
): DataBlock[] {
  return makeStateBlocks(roundKey, `rk${round}`, `Round Key ${round}`, x, y, AMBER, 'key', `round-key-${round}`);
}

// ── The AES Engine ──────────────────────────────────────────────────────────

const aesEngine: AlgorithmEngine = {
  meta: {
    id: 'aes',
    name: 'AES (Advanced Encryption Standard)',
    category: 'block-cipher',
    description:
      'AES-128 is a symmetric block cipher that encrypts 128-bit blocks using a 128-bit key through 10 rounds of substitution-permutation transformations. Adopted as a federal standard (FIPS 197) in 2001, it replaced DES and remains the most widely used encryption algorithm worldwide.',
    keySize: 128,
    blockSize: 128,
    yearIntroduced: 2001,
    authors: 'Joan Daemen, Vincent Rijmen',
    status: 'standard',
    standardBody: 'NIST',
    color: '#3b82f6',
    icon: '🔐',
  },

  inputConfig: {
    type: 'symmetric',
    fields: [
      {
        name: 'plaintext',
        label: 'Plaintext',
        type: 'text',
        placeholder: 'Enter plaintext (up to 16 bytes)...',
        required: true,
        defaultValue: 'Hello, AES-128!',
        maxLength: 64,
      },
      {
        name: 'key',
        label: 'Key',
        type: 'text',
        placeholder: 'Enter key (16 characters for AES-128)...',
        required: true,
        defaultValue: 'MySecretKey12345',
        maxLength: 64,
      },
      {
        name: 'mode',
        label: 'Mode of Operation',
        type: 'select',
        required: true,
        defaultValue: 'ECB',
        options: [
          { label: 'ECB (Electronic Codebook)', value: 'ECB' },
          { label: 'CBC (Cipher Block Chaining)', value: 'CBC' },
          { label: 'CTR (Counter)', value: 'CTR' },
        ],
      },
    ],
  },

  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const plaintext = input.plaintext || 'Hello, AES-128!';
    const keyText = input.key || 'MySecretKey12345';

    // Prepare plaintext bytes (UTF-8 + PKCS7 padding to 16 bytes)
    const ptBytes = pkcs7Pad(textToBytes(plaintext));
    const keyBytes = prepareKey(keyText);

    // Build state matrices
    let state = bytesToState(ptBytes);
    const keyState = bytesToState(keyBytes);

    // Key expansion
    const expandedKey = keyExpansion(keyBytes);

    const steps: VisualizationStep[] = [];

    // ── Step 1: Plaintext State Matrix ────────────────────────────────────
    steps.push({
      id: 'step-1-plaintext',
      phase: 'input',
      label: 'Plaintext Input',
      description: `The plaintext "${plaintext}" is converted to bytes using UTF-8 encoding and padded with PKCS7 to fill a 16-byte (128-bit) block. The bytes are arranged column-major into a 4x4 state matrix.`,
      blocks: [
        {
          id: 'pt-raw',
          label: 'Raw Plaintext',
          value: plaintext,
          x: 0, y: 0, z: 0,
          width: 4, height: 1,
          color: BLUE,
          type: 'data',
          group: 'plaintext',
        },
        {
          id: 'pt-hex',
          label: 'Hex Bytes',
          value: bytesToHex(ptBytes),
          x: 5, y: 0, z: 0,
          width: 4, height: 1,
          color: BLUE,
          type: 'data',
          group: 'plaintext',
        },
        ...makeStateBlocks(state, 'pt-state', 'Plaintext State Matrix', 2, 2, BLUE, 'data', 'pt-matrix'),
      ],
      connections: [
        { from: 'pt-raw', to: 'pt-hex', color: BLUE, animated: true, label: 'UTF-8 + PKCS7' },
        { from: 'pt-hex', to: 'pt-state-grid', color: BLUE, animated: true, label: 'Column-major' },
      ],
      operations: [
        { id: 'op-encode', type: 'pad', label: 'UTF-8 Encode + PKCS7 Pad', x: 2.5, y: 1, z: 0, color: BLUE },
      ],
      highlights: ['pt-state-grid'],
    });

    // ── Step 2: Key State Matrix ──────────────────────────────────────────
    steps.push({
      id: 'step-2-key',
      phase: 'input',
      label: 'Key Input',
      description: `The key "${keyText}" is converted to 16 bytes. If shorter, it is zero-padded; if longer, truncated to 128 bits. The bytes form a 4x4 key state matrix.`,
      blocks: [
        {
          id: 'key-raw',
          label: 'Raw Key',
          value: keyText,
          x: 0, y: 0, z: 0,
          width: 4, height: 1,
          color: AMBER,
          type: 'key',
          group: 'key-input',
        },
        {
          id: 'key-hex',
          label: 'Key Hex Bytes',
          value: bytesToHex(keyBytes),
          x: 5, y: 0, z: 0,
          width: 4, height: 1,
          color: AMBER,
          type: 'key',
          group: 'key-input',
        },
        ...makeStateBlocks(keyState, 'key-state', 'Key State Matrix', 2, 2, AMBER, 'key', 'key-matrix'),
      ],
      connections: [
        { from: 'key-raw', to: 'key-hex', color: AMBER, animated: true, label: 'UTF-8' },
        { from: 'key-hex', to: 'key-state-grid', color: AMBER, animated: true, label: 'Column-major' },
      ],
      operations: [
        { id: 'op-key-prep', type: 'pad', label: 'Prepare 128-bit Key', x: 2.5, y: 1, z: 0, color: AMBER },
      ],
      highlights: ['key-state-grid'],
    });

    // ── Step 3: Key Expansion ─────────────────────────────────────────────
    {
      const keBlocks: DataBlock[] = [];
      const keConnections: Connection[] = [];

      // Show first round key (original key)
      const rk0 = getRoundKey(expandedKey, 0);
      keBlocks.push(...makeStateBlocks(rk0, 'ke-rk0', 'Round Key 0 (Original)', 0, 0, AMBER, 'key', 'ke-rk0'));

      // Show a sampling of expanded round keys
      const sampleRounds = [1, 5, 10];
      sampleRounds.forEach((round, idx) => {
        const rk = getRoundKey(expandedKey, round);
        const xPos = (idx + 1) * 3;
        keBlocks.push(...makeStateBlocks(rk, `ke-rk${round}`, `Round Key ${round}`, xPos, 0, PURPLE, 'key', `ke-rk${round}`));
        keConnections.push({
          from: 'ke-rk0-grid',
          to: `ke-rk${round}-grid`,
          color: PURPLE,
          animated: true,
          label: `Expand`,
          dashed: true,
        });
      });

      // Show key schedule detail: Rcon values used
      keBlocks.push({
        id: 'ke-rcon',
        label: 'Rcon Values',
        value: RCON.map(hex8).join(' '),
        x: 1, y: 6, z: 0,
        width: 8, height: 0.8,
        color: RED,
        type: 'constant',
        group: 'key-schedule',
        fontSize: 11,
      });

      // Show S-box usage note
      keBlocks.push({
        id: 'ke-sbox-note',
        label: 'S-box (SubWord)',
        value: 'Used in RotWord -> SubWord -> XOR Rcon for each round key',
        x: 1, y: 7.2, z: 0,
        width: 8, height: 0.8,
        color: GREEN,
        type: 'constant',
        group: 'key-schedule',
        fontSize: 11,
      });

      steps.push({
        id: 'step-3-key-expansion',
        phase: 'key-schedule',
        label: 'Key Expansion',
        description: 'AES-128 expands the 128-bit key into 11 round keys (176 bytes / 44 words). Each new word W[i] = W[i-4] XOR T, where T is derived by applying RotWord, SubWord (S-box), and XOR with Rcon to W[i-1] when i is a multiple of 4.',
        blocks: keBlocks,
        connections: keConnections,
        operations: [
          { id: 'op-rotword', type: 'rotate', label: 'RotWord', x: 1, y: 5, z: 0, color: CYAN },
          { id: 'op-subword', type: 'sbox', label: 'SubWord (S-box)', x: 4, y: 5, z: 0, color: GREEN },
          { id: 'op-xor-rcon', type: 'xor', label: 'XOR Rcon', x: 7, y: 5, z: 0, color: RED },
        ],
        highlights: ['ke-rk0-grid', 'ke-rk10-grid'],
      });
    }

    // ── Step 4: Initial AddRoundKey ───────────────────────────────────────
    {
      const rk0 = getRoundKey(expandedKey, 0);
      const stateAfter = addRoundKey(state, rk0);

      steps.push({
        id: 'step-4-initial-ark',
        phase: 'initial-round',
        label: 'Initial AddRoundKey',
        description: 'Before the main rounds begin, the plaintext state is XORed with Round Key 0 (the original key). This is the only transformation in the initial round.',
        blocks: [
          ...makeStateBlocks(state, 'ark0-in', 'State (Before)', 0, 0, BLUE, 'data', 'ark0-input'),
          ...makeStateBlocks(rk0, 'ark0-key', 'Round Key 0', 3.5, 0, AMBER, 'key', 'ark0-key'),
          ...makeStateBlocks(stateAfter, 'ark0-out', 'State (After XOR)', 7, 0, GREEN, 'intermediate', 'ark0-output'),
        ],
        connections: [
          { from: 'ark0-in-grid', to: 'ark0-out-grid', color: BLUE, animated: true, label: 'XOR' },
          { from: 'ark0-key-grid', to: 'ark0-out-grid', color: AMBER, animated: true, label: 'XOR' },
        ],
        operations: [
          { id: 'op-ark0', type: 'xor', label: 'AddRoundKey (XOR)', x: 5.5, y: 1, z: 0, color: GREEN },
        ],
        highlights: ['ark0-out-grid'],
      });

      state = stateAfter;
    }

    // ── Steps 5-13: Rounds 1-9 ───────────────────────────────────────────
    for (let round = 1; round <= 9; round++) {
      const stepNum = 4 + round; // steps 5-13
      const stateIn = cloneState(state);

      // SubBytes
      const afterSub = subBytes(state);

      // ShiftRows
      const afterShift = shiftRows(afterSub);

      // MixColumns
      const afterMix = mixColumns(afterShift);

      // AddRoundKey
      const rk = getRoundKey(expandedKey, round);
      const afterArk = addRoundKey(afterMix, rk);

      const yBase = 0;

      steps.push({
        id: `step-${stepNum}-round-${round}`,
        phase: `round-${round}`,
        label: `Round ${round}`,
        description: `Round ${round} of 10: SubBytes applies the S-box to each byte, ShiftRows cyclically shifts rows, MixColumns multiplies each column in GF(2^8), and AddRoundKey XORs with Round Key ${round}.`,
        blocks: [
          ...makeStateBlocks(stateIn, `r${round}-in`, 'State Input', 0, yBase, BLUE, 'intermediate', `r${round}-in`),
          ...makeStateBlocks(afterSub, `r${round}-sub`, 'After SubBytes', 0, yBase + 5, PURPLE, 'intermediate', `r${round}-sub`),
          ...makeStateBlocks(afterShift, `r${round}-shift`, 'After ShiftRows', 3.5, yBase + 5, CYAN, 'intermediate', `r${round}-shift`),
          ...makeStateBlocks(afterMix, `r${round}-mix`, 'After MixColumns', 7, yBase + 5, PINK, 'intermediate', `r${round}-mix`),
          ...makeStateBlocks(rk, `r${round}-rk`, `Round Key ${round}`, 3.5, yBase, AMBER, 'key', `r${round}-rk`),
          ...makeStateBlocks(afterArk, `r${round}-out`, 'Round Output', 7, yBase, GREEN, 'intermediate', `r${round}-out`),
        ],
        connections: [
          { from: `r${round}-in-grid`, to: `r${round}-sub-grid`, color: PURPLE, animated: true, label: 'SubBytes' },
          { from: `r${round}-sub-grid`, to: `r${round}-shift-grid`, color: CYAN, animated: true, label: 'ShiftRows' },
          { from: `r${round}-shift-grid`, to: `r${round}-mix-grid`, color: PINK, animated: true, label: 'MixColumns' },
          { from: `r${round}-mix-grid`, to: `r${round}-out-grid`, color: GREEN, animated: true, label: 'AddRoundKey' },
          { from: `r${round}-rk-grid`, to: `r${round}-out-grid`, color: AMBER, animated: true, label: 'XOR' },
        ],
        operations: [
          { id: `op-r${round}-sub`, type: 'sbox', label: 'SubBytes (S-box)', x: 0, y: yBase + 4, z: 0, color: PURPLE },
          { id: `op-r${round}-shift`, type: 'shift', label: 'ShiftRows', x: 3.5, y: yBase + 4, z: 0, color: CYAN },
          { id: `op-r${round}-mix`, type: 'mix', label: 'MixColumns (GF multiply)', x: 7, y: yBase + 4, z: 0, color: PINK },
          { id: `op-r${round}-ark`, type: 'xor', label: `AddRoundKey ${round}`, x: 5.5, y: yBase + 1, z: 0, color: GREEN },
        ],
        highlights: [`r${round}-out-grid`],
      });

      state = afterArk;
    }

    // ── Step 14: Final Round (Round 10) ───────────────────────────────────
    {
      const stateIn = cloneState(state);

      // SubBytes
      const afterSub = subBytes(state);

      // ShiftRows
      const afterShift = shiftRows(afterSub);

      // AddRoundKey (no MixColumns in final round)
      const rk = getRoundKey(expandedKey, 10);
      const afterArk = addRoundKey(afterShift, rk);

      const yBase = 0;

      steps.push({
        id: 'step-14-round-10',
        phase: 'final-round',
        label: 'Round 10 (Final)',
        description: 'The final round omits MixColumns. Only SubBytes, ShiftRows, and AddRoundKey are applied with Round Key 10. This produces the final ciphertext.',
        blocks: [
          ...makeStateBlocks(stateIn, 'r10-in', 'State Input', 0, yBase, BLUE, 'intermediate', 'r10-in'),
          ...makeStateBlocks(afterSub, 'r10-sub', 'After SubBytes', 0, yBase + 5, PURPLE, 'intermediate', 'r10-sub'),
          ...makeStateBlocks(afterShift, 'r10-shift', 'After ShiftRows', 3.5, yBase + 5, CYAN, 'intermediate', 'r10-shift'),
          ...makeStateBlocks(rk, 'r10-rk', 'Round Key 10', 3.5, yBase, AMBER, 'key', 'r10-rk'),
          ...makeStateBlocks(afterArk, 'r10-out', 'Ciphertext State', 7, yBase, RED, 'output', 'r10-out'),
        ],
        connections: [
          { from: 'r10-in-grid', to: 'r10-sub-grid', color: PURPLE, animated: true, label: 'SubBytes' },
          { from: 'r10-sub-grid', to: 'r10-shift-grid', color: CYAN, animated: true, label: 'ShiftRows' },
          { from: 'r10-shift-grid', to: 'r10-out-grid', color: RED, animated: true, label: 'AddRoundKey' },
          { from: 'r10-rk-grid', to: 'r10-out-grid', color: AMBER, animated: true, label: 'XOR' },
        ],
        operations: [
          { id: 'op-r10-sub', type: 'sbox', label: 'SubBytes (S-box)', x: 0, y: yBase + 4, z: 0, color: PURPLE },
          { id: 'op-r10-shift', type: 'shift', label: 'ShiftRows', x: 3.5, y: yBase + 4, z: 0, color: CYAN },
          { id: 'op-r10-ark', type: 'xor', label: 'AddRoundKey 10 (Final)', x: 5.5, y: yBase + 1, z: 0, color: RED },
        ],
        highlights: ['r10-out-grid'],
      });

      state = afterArk;
    }

    // ── Step 15: Final Ciphertext ─────────────────────────────────────────
    {
      const cipherBytes = stateToBytes(state);

      steps.push({
        id: 'step-15-ciphertext',
        phase: 'output',
        label: 'Ciphertext Output',
        description: `After 10 rounds of AES-128 encryption, the final state matrix is read out column-major to produce the 128-bit (16-byte) ciphertext: ${bytesToHex(cipherBytes)}`,
        blocks: [
          ...makeStateBlocks(state, 'ct-state', 'Final State Matrix', 0, 0, RED, 'output', 'ct-matrix'),
          {
            id: 'ct-hex',
            label: 'Ciphertext (Hex)',
            value: bytesToHex(cipherBytes),
            x: 5, y: 0, z: 0,
            width: 5, height: 1,
            color: RED,
            type: 'output',
            group: 'ciphertext',
          },
          {
            id: 'ct-summary',
            label: 'Encryption Summary',
            value: `AES-128 ECB\nPlaintext: ${bytesToHex(ptBytes)}\nKey: ${bytesToHex(keyBytes)}\nCiphertext: ${bytesToHex(cipherBytes)}`,
            x: 5, y: 2, z: 0,
            width: 5, height: 2.5,
            color: GREEN,
            type: 'output',
            group: 'summary',
            fontSize: 11,
          },
        ],
        connections: [
          { from: 'ct-state-grid', to: 'ct-hex', color: RED, animated: true, label: 'Column-major readout' },
        ],
        operations: [
          { id: 'op-readout', type: 'permutation', label: 'Column-major Readout', x: 3, y: 0.5, z: 0, color: RED },
        ],
        highlights: ['ct-hex', 'ct-summary'],
      });
    }

    return steps;
  },
};

export default aesEngine;
