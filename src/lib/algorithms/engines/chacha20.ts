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

function mod32(x: number): number {
  return x >>> 0;
}

function rotl32(v: number, n: number): number {
  return mod32((v << n) | (v >>> (32 - n)));
}

function hex8(n: number): string {
  return mod32(n).toString(16).padStart(8, '0');
}

function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) & 0xff);
  }
  return bytes;
}

function hexToBytes(hexStr: string): number[] {
  const clean = hexStr.replace(/\s+/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substring(i, i + 2), 16) || 0);
  }
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => (b & 0xff).toString(16).padStart(2, '0')).join('');
}

function padOrTruncate(bytes: number[], len: number): number[] {
  const result = bytes.slice(0, len);
  while (result.length < len) result.push(0);
  return result;
}

function littleEndianWord(bytes: number[], offset: number): number {
  return mod32(
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  );
}

// ── ChaCha20 Quarter Round ──────────────────────────────────────────────────

function quarterRound(state: Uint32Array, a: number, b: number, c: number, d: number): void {
  state[a] = mod32(state[a] + state[b]); state[d] ^= state[a]; state[d] = rotl32(state[d], 16);
  state[c] = mod32(state[c] + state[d]); state[b] ^= state[c]; state[b] = rotl32(state[b], 12);
  state[a] = mod32(state[a] + state[b]); state[d] ^= state[a]; state[d] = rotl32(state[d], 8);
  state[c] = mod32(state[c] + state[d]); state[b] ^= state[c]; state[b] = rotl32(state[b], 7);
}

// ── Visualization helpers ───────────────────────────────────────────────────

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

function stateMatrixBlocks(prefix: string, state: Uint32Array | number[], y: number, color: string): DataBlock[] {
  const blocks: DataBlock[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const idx = row * 4 + col;
      blocks.push(
        makeBlock(
          `${prefix}-${idx}`, `[${row},${col}]`, hex8(Number(state[idx])),
          col * 2.5, y + row * 0.9, color, 'intermediate',
          { width: 2, height: 0.7 },
        ),
      );
    }
  }
  return blocks;
}

// ── Engine ───────────────────────────────────────────────────────────────────

const meta: AlgorithmMeta = {
  id: 'chacha20',
  name: 'ChaCha20',
  category: 'stream-cipher',
  description:
    'ChaCha20 is a stream cipher designed by Daniel J. Bernstein as a refinement of Salsa20. It uses a 256-bit key and 96-bit nonce, generating a keystream via 20 rounds of quarter-round operations on a 4x4 matrix of 32-bit words.',
  color: '#8b5cf6',
  icon: '🌊',
  yearIntroduced: 2008,
  authors: 'Daniel J. Bernstein',
  status: 'standard',
  standardBody: 'RFC 8439',
  keySize: 256,
  blockSize: 512,
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
      defaultValue: 'Hello ChaCha20!',
      maxLength: 64,
    },
    {
      name: 'key',
      label: 'Key',
      type: 'text',
      placeholder: 'Enter key (will be padded/truncated to 32 bytes)',
      required: true,
      defaultValue: 'my-secret-key-for-chacha20!!!!!',
      maxLength: 32,
    },
    {
      name: 'nonce',
      label: 'Nonce (hex)',
      type: 'text',
      placeholder: '12-byte nonce in hex',
      required: true,
      defaultValue: '000000000000000000000001',
      maxLength: 24,
    },
  ],
};

function generateSteps(input: Record<string, string>): VisualizationStep[] {
  const plaintext = input.plaintext || 'Hello ChaCha20!';
  const keyStr = input.key || 'my-secret-key-for-chacha20!!!!!';
  const nonceHex = input.nonce || '000000000000000000000001';

  const ptBytes = textToBytes(plaintext);
  const keyBytes = padOrTruncate(textToBytes(keyStr), 32);
  const nonceBytes = padOrTruncate(hexToBytes(nonceHex), 12);

  const steps: VisualizationStep[] = [];

  // ── Step 1: Input ───────────────────────────────────────────────────────

  steps.push({
    id: 'chacha-step-input',
    phase: 'Input',
    label: 'Input Parameters',
    description: `Plaintext: "${plaintext}" (${ptBytes.length} bytes), Key: ${bytesToHex(keyBytes)} (32 bytes), Nonce: ${bytesToHex(nonceBytes)} (12 bytes).`,
    blocks: [
      makeBlock('pt', 'Plaintext', bytesToHex(ptBytes), 1, 0, '#3b82f6', 'data', { width: 6 }),
      makeBlock('key', 'Key (256-bit)', bytesToHex(keyBytes), 1, 1, '#f59e0b', 'key', { width: 6 }),
      makeBlock('nonce', 'Nonce (96-bit)', bytesToHex(nonceBytes), 1, 2, '#8b5cf6', 'key', { width: 4 }),
    ],
    connections: [],
    operations: [],
    highlights: ['pt', 'key', 'nonce'],
  });

  // ── Step 2: State Matrix Initialization ────────────────────────────────

  // ChaCha20 constants: "expand 32-byte k"
  const constants = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];

  const keyWords: number[] = [];
  for (let i = 0; i < 8; i++) {
    keyWords.push(littleEndianWord(keyBytes, i * 4));
  }

  const counter = 1;
  const nonceWords: number[] = [];
  for (let i = 0; i < 3; i++) {
    nonceWords.push(littleEndianWord(nonceBytes, i * 4));
  }

  // Initial state: constants[0..3] | key[0..7] | counter | nonce[0..2]
  const initialState = new Uint32Array([
    ...constants,
    ...keyWords,
    counter,
    ...nonceWords,
  ]);

  const constBlocks: DataBlock[] = constants.map((c, i) =>
    makeBlock(`const-${i}`, `const[${i}]`, hex8(c), i * 2.5, 0, '#22c55e', 'constant', { width: 2, height: 0.7 }),
  );
  const keyWordBlocks: DataBlock[] = keyWords.map((k, i) =>
    makeBlock(`kw-${i}`, `key[${i}]`, hex8(k), (i % 4) * 2.5, 0.9 + Math.floor(i / 4) * 0.9, '#f59e0b', 'key', { width: 2, height: 0.7 }),
  );
  const ctrBlock = makeBlock('ctr', 'counter', hex8(counter), 0, 2.7, '#ec4899', 'intermediate', { width: 2, height: 0.7 });
  const nonceWordBlocks: DataBlock[] = nonceWords.map((n, i) =>
    makeBlock(`nw-${i}`, `nonce[${i}]`, hex8(n), (i + 1) * 2.5, 2.7, '#8b5cf6', 'key', { width: 2, height: 0.7 }),
  );

  steps.push({
    id: 'chacha-step-init',
    phase: 'Initialization',
    label: '4x4 State Matrix Setup',
    description: `The 4x4 state matrix (16 x 32-bit words) is initialized:\n- Row 0: Constants "expand 32-byte k" = [${constants.map(hex8).join(', ')}]\n- Row 1-2: Key words [${keyWords.map(hex8).join(', ')}]\n- Row 3: Counter (${counter}) + Nonce [${nonceWords.map(hex8).join(', ')}]`,
    blocks: [...constBlocks, ...keyWordBlocks, ctrBlock, ...nonceWordBlocks],
    connections: [],
    operations: [],
    highlights: [...constBlocks.map(b => b.id), ...keyWordBlocks.map(b => b.id), 'ctr', ...nonceWordBlocks.map(b => b.id)],
  });

  // ── Step 3: Show initial state as matrix ──────────────────────────────

  steps.push({
    id: 'chacha-step-matrix',
    phase: 'Initialization',
    label: 'Initial State Matrix',
    description: `The 4x4 state matrix before any rounds:\n[${Array.from(initialState).map(hex8).join(', ')}]`,
    blocks: stateMatrixBlocks('init', initialState, 0, '#6366f1'),
    connections: [],
    operations: [],
    highlights: Array.from({ length: 16 }, (_, i) => `init-${i}`),
  });

  // ── Steps 4-7: Quarter Rounds (show 4 representative double-rounds) ───

  const workingState = new Uint32Array(initialState);

  // 20 rounds = 10 double-rounds. Show rounds 1-2, 3-4, 9-10, 19-20
  const showRounds = [0, 1, 4, 9];

  for (let dr = 0; dr < 10; dr++) {
    // Column rounds
    quarterRound(workingState, 0, 4, 8, 12);
    quarterRound(workingState, 1, 5, 9, 13);
    quarterRound(workingState, 2, 6, 10, 14);
    quarterRound(workingState, 3, 7, 11, 15);

    if (showRounds.includes(dr)) {
      const afterCol = new Uint32Array(workingState);

      steps.push({
        id: `chacha-step-colround-${dr}`,
        phase: 'Rounds',
        label: `Double-Round ${dr + 1}: Column Rounds`,
        description: `Column quarter-rounds applied to columns (0,4,8,12), (1,5,9,13), (2,6,10,14), (3,7,11,15).\nEach QR: a+=b; d^=a; d<<<16; c+=d; b^=c; b<<<12; a+=b; d^=a; d<<<8; c+=d; b^=c; b<<<7`,
        blocks: stateMatrixBlocks(`col-${dr}`, afterCol, 0, '#3b82f6'),
        connections: [
          conn(`col-${dr}-0`, `col-${dr}-4`, { animated: true, color: '#3b82f6', label: 'QR col 0' }),
          conn(`col-${dr}-1`, `col-${dr}-5`, { animated: true, color: '#10b981', label: 'QR col 1' }),
          conn(`col-${dr}-2`, `col-${dr}-6`, { animated: true, color: '#f59e0b', label: 'QR col 2' }),
          conn(`col-${dr}-3`, `col-${dr}-7`, { animated: true, color: '#ef4444', label: 'QR col 3' }),
        ],
        operations: [
          makeOp(`op-qr-col-${dr}-0`, 'add', 'QR(0,4,8,12)', 0, 4, '#3b82f6'),
          makeOp(`op-qr-col-${dr}-1`, 'add', 'QR(1,5,9,13)', 2.5, 4, '#10b981'),
          makeOp(`op-qr-col-${dr}-2`, 'add', 'QR(2,6,10,14)', 5, 4, '#f59e0b'),
          makeOp(`op-qr-col-${dr}-3`, 'add', 'QR(3,7,11,15)', 7.5, 4, '#ef4444'),
        ],
        highlights: Array.from({ length: 16 }, (_, i) => `col-${dr}-${i}`),
      });
    }

    // Diagonal rounds
    quarterRound(workingState, 0, 5, 10, 15);
    quarterRound(workingState, 1, 6, 11, 12);
    quarterRound(workingState, 2, 7, 8, 13);
    quarterRound(workingState, 3, 4, 9, 14);

    if (showRounds.includes(dr)) {
      const afterDiag = new Uint32Array(workingState);

      steps.push({
        id: `chacha-step-diaground-${dr}`,
        phase: 'Rounds',
        label: `Double-Round ${dr + 1}: Diagonal Rounds`,
        description: `Diagonal quarter-rounds applied to diagonals (0,5,10,15), (1,6,11,12), (2,7,8,13), (3,4,9,14).`,
        blocks: stateMatrixBlocks(`diag-${dr}`, afterDiag, 0, '#8b5cf6'),
        connections: [
          conn(`diag-${dr}-0`, `diag-${dr}-5`, { animated: true, color: '#8b5cf6', label: 'QR diag 0' }),
          conn(`diag-${dr}-1`, `diag-${dr}-6`, { animated: true, color: '#ec4899', label: 'QR diag 1' }),
          conn(`diag-${dr}-2`, `diag-${dr}-7`, { animated: true, color: '#06b6d4', label: 'QR diag 2' }),
          conn(`diag-${dr}-3`, `diag-${dr}-4`, { animated: true, color: '#f97316', label: 'QR diag 3' }),
        ],
        operations: [
          makeOp(`op-qr-diag-${dr}-0`, 'add', 'QR(0,5,10,15)', 0, 4, '#8b5cf6'),
          makeOp(`op-qr-diag-${dr}-1`, 'add', 'QR(1,6,11,12)', 2.5, 4, '#ec4899'),
          makeOp(`op-qr-diag-${dr}-2`, 'add', 'QR(2,7,8,13)', 5, 4, '#06b6d4'),
          makeOp(`op-qr-diag-${dr}-3`, 'add', 'QR(3,4,9,14)', 7.5, 4, '#f97316'),
        ],
        highlights: Array.from({ length: 16 }, (_, i) => `diag-${dr}-${i}`),
      });
    }
  }

  // ── Step 8: Final state addition ──────────────────────────────────────

  const finalState = new Uint32Array(16);
  for (let i = 0; i < 16; i++) {
    finalState[i] = mod32(workingState[i] + initialState[i]);
  }

  const addBlocks: DataBlock[] = [
    ...stateMatrixBlocks('ws', workingState, 0, '#8b5cf6'),
    ...stateMatrixBlocks('is', initialState, 4.5, '#6366f1'),
    ...stateMatrixBlocks('fs', finalState, 9, '#22c55e'),
  ];

  steps.push({
    id: 'chacha-step-add',
    phase: 'Finalization',
    label: 'State Addition',
    description: `After 20 rounds, the working state is added element-wise (mod 2^32) to the original initial state to produce the keystream block.`,
    blocks: addBlocks,
    connections: Array.from({ length: 16 }, (_, i) => conn(`ws-${i}`, `fs-${i}`, { animated: true, color: '#22c55e' })),
    operations: Array.from({ length: 4 }, (_, i) =>
      makeOp(`op-add-${i}`, 'add', '+ mod 2^32', i * 2.5, 7.5, '#f59e0b'),
    ),
    highlights: Array.from({ length: 16 }, (_, i) => `fs-${i}`),
  });

  // ── Step 9: Serialize keystream ───────────────────────────────────────

  const keystreamBytes: number[] = [];
  for (let i = 0; i < 16; i++) {
    const w = finalState[i];
    keystreamBytes.push(w & 0xff, (w >>> 8) & 0xff, (w >>> 16) & 0xff, (w >>> 24) & 0xff);
  }

  const keystreamHex = bytesToHex(keystreamBytes.slice(0, ptBytes.length));

  steps.push({
    id: 'chacha-step-keystream',
    phase: 'Keystream',
    label: 'Keystream Generation',
    description: `The final state is serialized in little-endian byte order to produce 64 bytes of keystream. Using first ${ptBytes.length} bytes: ${keystreamHex}`,
    blocks: [
      makeBlock('ks-full', 'Keystream (64 bytes)', bytesToHex(keystreamBytes), 1, 0, '#22c55e', 'intermediate', { width: 8 }),
      makeBlock('ks-used', `Keystream (${ptBytes.length} bytes)`, keystreamHex, 1, 1.2, '#10b981', 'intermediate', { width: 8 }),
    ],
    connections: [conn('ks-full', 'ks-used', { animated: true, label: `first ${ptBytes.length} bytes` })],
    operations: [],
    highlights: ['ks-used'],
  });

  // ── Step 10: XOR with plaintext ───────────────────────────────────────

  const ciphertextBytes: number[] = [];
  for (let i = 0; i < ptBytes.length; i++) {
    ciphertextBytes.push(ptBytes[i] ^ keystreamBytes[i]);
  }
  const ciphertextHex = bytesToHex(ciphertextBytes);

  steps.push({
    id: 'chacha-step-xor',
    phase: 'Encryption',
    label: 'XOR Plaintext with Keystream',
    description: `Each plaintext byte is XORed with the corresponding keystream byte to produce ciphertext.\nPlaintext:  ${bytesToHex(ptBytes)}\nKeystream:  ${keystreamHex}\nCiphertext: ${ciphertextHex}`,
    blocks: [
      makeBlock('pt-final', 'Plaintext', bytesToHex(ptBytes), 1, 0, '#3b82f6', 'data', { width: 8 }),
      makeBlock('ks-final', 'Keystream', keystreamHex, 1, 1.5, '#10b981', 'key', { width: 8 }),
      makeBlock('ct-final', 'Ciphertext', ciphertextHex, 1, 3, '#ef4444', 'output', { width: 8 }),
    ],
    connections: [
      conn('pt-final', 'ct-final', { animated: true, color: '#3b82f6' }),
      conn('ks-final', 'ct-final', { animated: true, color: '#10b981' }),
    ],
    operations: [
      makeOp('op-xor-final', 'xor', 'XOR', 5, 2.2, '#f59e0b'),
    ],
    highlights: ['ct-final'],
  });

  return steps;
}

const chacha20Engine: AlgorithmEngine = {
  meta,
  inputConfig,
  generateSteps,
};

export default chacha20Engine;
