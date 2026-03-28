import type {
  AlgorithmEngine,
  VisualizationStep,
  DataBlock,
  Connection,
  Operation,
  AlgorithmMeta,
  InputConfig,
} from '@/lib/algorithms/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) & 0xff);
  }
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => (b & 0xff).toString(16).padStart(2, '0')).join('');
}

function makeBlock(
  id: string, label: string, value: string,
  x: number, y: number,
  color: string, type: DataBlock['type'],
  opts: Partial<DataBlock> = {},
): DataBlock {
  return {
    id, label, value, x, y, z: 0,
    width: opts.width ?? 2, height: opts.height ?? 0.8,
    color, type,
    ...opts,
  };
}

function makeOp(
  id: string, type: Operation['type'], label: string,
  x: number, y: number, color: string,
): Operation {
  return { id, type, label, x, y, z: 0, color };
}

function conn(from: string, to: string, extra: Partial<Connection> = {}): Connection {
  return { from, to, ...extra };
}

function sboxSnippet(S: number[], start: number, count: number): string {
  return S.slice(start, start + count).map(v => v.toString(16).padStart(2, '0')).join(' ');
}

// ── Engine ───────────────────────────────────────────────────────────────────

const meta: AlgorithmMeta = {
  id: 'rc4',
  name: 'RC4',
  category: 'stream-cipher',
  description:
    'RC4 (Rivest Cipher 4) is a stream cipher designed by Ron Rivest in 1987. It generates a pseudorandom keystream using a variable-length key (40-2048 bits). Once widely used in WEP and early TLS, it is now deprecated due to statistical biases.',
  color: '#6366f1',
  icon: '🔄',
  yearIntroduced: 1987,
  authors: 'Ron Rivest',
  status: 'deprecated',
  keySize: '40-2048',
  blockSize: undefined,
};

const inputConfig: InputConfig = {
  type: 'symmetric',
  fields: [
    {
      name: 'plaintext',
      label: 'Plaintext',
      type: 'text',
      placeholder: 'Enter plaintext message',
      required: true,
      defaultValue: 'Hello RC4!',
      maxLength: 64,
    },
    {
      name: 'key',
      label: 'Key',
      type: 'text',
      placeholder: 'Enter key (5-256 characters)',
      required: true,
      defaultValue: 'SecretKey',
      maxLength: 256,
    },
  ],
};

function generateSteps(input: Record<string, string>): VisualizationStep[] {
  const plaintext = input.plaintext || 'Hello RC4!';
  const keyStr = input.key || 'SecretKey';

  const ptBytes = textToBytes(plaintext);
  const keyBytes = textToBytes(keyStr);

  const steps: VisualizationStep[] = [];

  // ── Step 1: Input ───────────────────────────────────────────────────────

  steps.push({
    id: 'rc4-step-input',
    phase: 'Input',
    label: 'Input Parameters',
    description: `Plaintext: "${plaintext}" (${ptBytes.length} bytes)\nKey: "${keyStr}" (${keyBytes.length} bytes = ${keyBytes.length * 8} bits)`,
    blocks: [
      makeBlock('pt', 'Plaintext', bytesToHex(ptBytes), 1, 0, '#3b82f6', 'data', { width: 6 }),
      makeBlock('key', `Key (${keyBytes.length * 8}-bit)`, bytesToHex(keyBytes), 1, 1, '#f59e0b', 'key', { width: 6 }),
    ],
    connections: [],
    operations: [],
    highlights: ['pt', 'key'],
  });

  // ── Step 2: KSA - S-box Initialization ────────────────────────────────

  const S = new Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;

  steps.push({
    id: 'rc4-step-ksa-init',
    phase: 'KSA',
    label: 'S-Box Initialization',
    description: `Initialize the 256-byte permutation array S[0..255] = identity permutation (0, 1, 2, ..., 255).\nFirst 16 bytes: ${sboxSnippet(S, 0, 16)} ...\nLast 16 bytes: ... ${sboxSnippet(S, 240, 16)}`,
    blocks: [
      makeBlock('s-init-start', 'S[0..15]', sboxSnippet(S, 0, 16), 1, 0, '#6366f1', 'intermediate', { width: 8 }),
      makeBlock('s-init-mid', 'S[16..31]', sboxSnippet(S, 16, 16), 1, 1, '#6366f1', 'intermediate', { width: 8, opacity: 0.7 }),
      makeBlock('s-init-end', 'S[240..255]', sboxSnippet(S, 240, 16), 1, 2, '#6366f1', 'intermediate', { width: 8 }),
      makeBlock('s-init-label', 'Identity Permutation', '0, 1, 2, ..., 255', 1, 3, '#a855f7', 'constant', { width: 5 }),
    ],
    connections: [],
    operations: [],
    highlights: ['s-init-start', 's-init-end'],
  });

  // ── Step 3: KSA - Key Scheduling ──────────────────────────────────────

  let j = 0;
  const ksaSwaps: { i: number; j: number; si: number; sj: number }[] = [];

  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + keyBytes[i % keyBytes.length]) & 0xff;
    // swap
    const tmp = S[i]; S[i] = S[j]; S[j] = tmp;
    // Record select swaps for visualization
    if (i < 8 || i === 127 || i === 255) {
      ksaSwaps.push({ i, j, si: S[i], sj: S[j] });
    }
  }

  const ksaBlocks: DataBlock[] = [];
  const ksaConns: Connection[] = [];
  ksaSwaps.forEach((swap, idx) => {
    const yOff = idx * 1;
    const swapId = `ksa-swap-${idx}`;
    ksaBlocks.push(
      makeBlock(`${swapId}-i`, `i=${swap.i}`, `S[${swap.i}]=${swap.si}`, 1, yOff, '#3b82f6', 'intermediate', { width: 3 }),
    );
    ksaBlocks.push(
      makeBlock(`${swapId}-j`, `j=${swap.j}`, `S[${swap.j}]=${swap.sj}`, 6, yOff, '#ef4444', 'intermediate', { width: 3 }),
    );
    ksaConns.push(conn(`${swapId}-i`, `${swapId}-j`, { animated: true, label: 'swap', color: '#f59e0b' }));
  });

  const ksaSwapDesc = ksaSwaps
    .map(s => `i=${s.i}, j=${s.j}: swap S[${s.i}]<->S[${s.j}]`)
    .join('\n');

  steps.push({
    id: 'rc4-step-ksa-permute',
    phase: 'KSA',
    label: 'Key-Scheduling Algorithm',
    description: `For i = 0 to 255: j = (j + S[i] + key[i mod keyLen]) mod 256, then swap S[i] and S[j].\nSelected swaps:\n${ksaSwapDesc}`,
    blocks: ksaBlocks,
    connections: ksaConns,
    operations: [
      makeOp('op-ksa', 'substitute', 'KSA Permutation', 4, ksaSwaps.length * 0.5, '#f59e0b'),
    ],
    highlights: ksaBlocks.map(b => b.id),
  });

  // ── Step 4: KSA result ────────────────────────────────────────────────

  steps.push({
    id: 'rc4-step-ksa-result',
    phase: 'KSA',
    label: 'Permuted S-Box',
    description: `After KSA, the S-box is a key-dependent permutation of 0-255.\nS[0..15]: ${sboxSnippet(S, 0, 16)}\nS[16..31]: ${sboxSnippet(S, 16, 16)}\nS[240..255]: ${sboxSnippet(S, 240, 16)}`,
    blocks: [
      makeBlock('s-ksa-0', 'S[0..15]', sboxSnippet(S, 0, 16), 1, 0, '#22c55e', 'intermediate', { width: 8 }),
      makeBlock('s-ksa-1', 'S[16..31]', sboxSnippet(S, 16, 16), 1, 1, '#22c55e', 'intermediate', { width: 8, opacity: 0.7 }),
      makeBlock('s-ksa-last', 'S[240..255]', sboxSnippet(S, 240, 16), 1, 2, '#22c55e', 'intermediate', { width: 8 }),
    ],
    connections: [],
    operations: [],
    highlights: ['s-ksa-0', 's-ksa-last'],
  });

  // ── Step 5-N: PRGA - Keystream Generation ─────────────────────────────

  let pi = 0;
  let pj = 0;
  const keystreamBytes: number[] = [];
  const prgaDetails: { i: number; j: number; si: number; sj: number; k: number; t: number }[] = [];

  for (let n = 0; n < ptBytes.length; n++) {
    pi = (pi + 1) & 0xff;
    pj = (pj + S[pi]) & 0xff;
    // swap
    const tmp = S[pi]; S[pi] = S[pj]; S[pj] = tmp;
    const t = (S[pi] + S[pj]) & 0xff;
    const k = S[t];
    keystreamBytes.push(k);
    prgaDetails.push({ i: pi, j: pj, si: S[pi], sj: S[pj], k, t });
  }

  // Show PRGA steps in groups
  const prgaGroupSize = Math.min(ptBytes.length, 8);
  const prgaGroups = Math.ceil(ptBytes.length / prgaGroupSize);

  for (let g = 0; g < prgaGroups; g++) {
    const start = g * prgaGroupSize;
    const end = Math.min(start + prgaGroupSize, ptBytes.length);
    const groupDetails = prgaDetails.slice(start, end);

    const prgaBlocks: DataBlock[] = [];
    const prgaConns: Connection[] = [];

    groupDetails.forEach((detail, idx) => {
      const byteIdx = start + idx;
      const yOff = idx * 1.2;
      const prefix = `prga-${byteIdx}`;
      prgaBlocks.push(
        makeBlock(`${prefix}-i`, `i=${detail.i}`, `S[${detail.i}]=${detail.si}`, 0, yOff, '#3b82f6', 'intermediate', { width: 2.5 }),
      );
      prgaBlocks.push(
        makeBlock(`${prefix}-j`, `j=${detail.j}`, `S[${detail.j}]=${detail.sj}`, 3.5, yOff, '#ef4444', 'intermediate', { width: 2.5 }),
      );
      prgaBlocks.push(
        makeBlock(`${prefix}-k`, `K[${byteIdx}]`, `S[${detail.t}] = ${detail.k.toString(16).padStart(2, '0')}`, 7, yOff, '#22c55e', 'output', { width: 2.5 }),
      );
      prgaConns.push(conn(`${prefix}-i`, `${prefix}-k`, { animated: true, color: '#3b82f6', label: 'swap+index' }));
      prgaConns.push(conn(`${prefix}-j`, `${prefix}-k`, { animated: true, color: '#ef4444' }));
    });

    const detailDesc = groupDetails
      .map((d, idx) => `Byte ${start + idx}: i=${d.i}, j=${d.j}, swap, t=S[${d.i}]+S[${d.j}]=${d.t}, K=${d.k.toString(16).padStart(2, '0')}`)
      .join('\n');

    steps.push({
      id: `rc4-step-prga-${g}`,
      phase: 'PRGA',
      label: `Keystream Bytes ${start}-${end - 1}`,
      description: `PRGA: i=(i+1)mod256, j=(j+S[i])mod256, swap S[i],S[j], output S[(S[i]+S[j])mod256].\n${detailDesc}`,
      blocks: prgaBlocks,
      connections: prgaConns,
      operations: [
        makeOp(`op-prga-${g}`, 'substitute', 'PRGA Output', 5.5, groupDetails.length * 0.6, '#22c55e'),
      ],
      highlights: prgaBlocks.filter(b => b.type === 'output').map(b => b.id),
    });
  }

  // ── Keystream Summary ────────────────────────────────────────────────

  const keystreamHex = bytesToHex(keystreamBytes);

  steps.push({
    id: 'rc4-step-keystream',
    phase: 'PRGA',
    label: 'Complete Keystream',
    description: `Generated ${keystreamBytes.length} keystream bytes: ${keystreamHex}`,
    blocks: [
      makeBlock('ks', 'Keystream', keystreamHex, 1, 0, '#22c55e', 'intermediate', { width: 8 }),
    ],
    connections: [],
    operations: [],
    highlights: ['ks'],
  });

  // ── XOR with plaintext ────────────────────────────────────────────────

  const ciphertextBytes: number[] = [];
  for (let i = 0; i < ptBytes.length; i++) {
    ciphertextBytes.push(ptBytes[i] ^ keystreamBytes[i]);
  }
  const ciphertextHex = bytesToHex(ciphertextBytes);

  steps.push({
    id: 'rc4-step-xor',
    phase: 'Encryption',
    label: 'XOR Plaintext with Keystream',
    description: `Each plaintext byte is XORed with the corresponding keystream byte.\nPlaintext:  ${bytesToHex(ptBytes)}\nKeystream:  ${keystreamHex}\nCiphertext: ${ciphertextHex}`,
    blocks: [
      makeBlock('pt-final', 'Plaintext', bytesToHex(ptBytes), 1, 0, '#3b82f6', 'data', { width: 8 }),
      makeBlock('ks-final', 'Keystream', keystreamHex, 1, 1.5, '#22c55e', 'key', { width: 8 }),
      makeBlock('ct-final', 'Ciphertext', ciphertextHex, 1, 3, '#ef4444', 'output', { width: 8 }),
    ],
    connections: [
      conn('pt-final', 'ct-final', { animated: true, color: '#3b82f6' }),
      conn('ks-final', 'ct-final', { animated: true, color: '#22c55e' }),
    ],
    operations: [
      makeOp('op-xor', 'xor', 'XOR', 5, 2.2, '#f59e0b'),
    ],
    highlights: ['ct-final'],
  });

  return steps;
}

const rc4Engine: AlgorithmEngine = {
  meta,
  inputConfig,
  generateSteps,
};

export default rc4Engine;
