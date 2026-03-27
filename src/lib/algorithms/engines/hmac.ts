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

function xorBytes(a: number[], b: number[]): number[] {
  const len = Math.max(a.length, b.length);
  const result: number[] = [];
  for (let i = 0; i < len; i++) {
    result.push((a[i] || 0) ^ (b[i] || 0));
  }
  return result;
}

// Simplified hash function for demonstration.
// Uses a real Merkle-Damgard-style compression with mixing.
// NOT cryptographically secure - for visualization purposes only.

function simpleHash(data: number[], outputLen: number): number[] {
  // Initialize state
  const state = new Uint32Array(outputLen / 4);
  // IV based on fractional parts of sqrt(2..9)
  const iv = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  for (let i = 0; i < state.length; i++) {
    state[i] = iv[i % iv.length] >>> 0;
  }

  // Process each byte
  for (let i = 0; i < data.length; i++) {
    const idx = i % state.length;
    state[idx] = ((state[idx] + data[i]) * 0x01000193) >>> 0;
    // Mix with next state word
    const next = (idx + 1) % state.length;
    state[next] ^= ((state[idx] >>> 17) | (state[idx] << 15)) >>> 0;
  }

  // Finalization: additional mixing rounds
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < state.length; i++) {
      const prev = (i === 0 ? state.length - 1 : i - 1);
      state[i] = ((state[i] ^ state[prev]) * 0x5bd1e995) >>> 0;
      state[i] ^= (state[i] >>> 13) >>> 0;
      state[i] = (state[i] * 0xc2b2ae35) >>> 0;
      state[i] ^= (state[i] >>> 16) >>> 0;
    }
  }

  // Convert to bytes
  const result: number[] = [];
  for (let i = 0; i < state.length; i++) {
    result.push((state[i] >>> 24) & 0xff);
    result.push((state[i] >>> 16) & 0xff);
    result.push((state[i] >>> 8) & 0xff);
    result.push(state[i] & 0xff);
  }
  return result.slice(0, outputLen);
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

// ── Engine ───────────────────────────────────────────────────────────────────

const meta: AlgorithmMeta = {
  id: 'hmac',
  name: 'HMAC',
  category: 'mac',
  description:
    'HMAC (Hash-based Message Authentication Code) provides both data integrity and authentication. It combines a cryptographic hash function with a secret key, using two passes of hashing with inner and outer padding.',
  color: '#06b6d4',
  icon: '✅',
  yearIntroduced: 1996,
  authors: 'Bellare, Canetti, Krawczyk',
  status: 'standard',
  standardBody: 'RFC 2104',
  keySize: 'variable',
  blockSize: 512,
};

const inputConfig: InputConfig = {
  type: 'mac',
  fields: [
    {
      name: 'message',
      label: 'Message',
      type: 'text',
      placeholder: 'Enter message to authenticate',
      required: true,
      defaultValue: 'Hello HMAC!',
      maxLength: 128,
    },
    {
      name: 'key',
      label: 'Key',
      type: 'text',
      placeholder: 'Enter secret key',
      required: true,
      defaultValue: 'my-secret-key',
      maxLength: 128,
    },
    {
      name: 'hashFunction',
      label: 'Hash Function',
      type: 'select',
      required: true,
      defaultValue: 'SHA-256',
      options: [
        { label: 'SHA-256', value: 'SHA-256' },
        { label: 'MD5', value: 'MD5' },
      ],
    },
  ],
};

function generateSteps(input: Record<string, string>): VisualizationStep[] {
  const message = input.message || 'Hello HMAC!';
  const keyStr = input.key || 'my-secret-key';
  const hashFn = input.hashFunction || 'SHA-256';

  const messageBytes = textToBytes(message);
  let keyBytes = textToBytes(keyStr);

  // Hash parameters based on selected function
  const blockSize = hashFn === 'MD5' ? 64 : 64; // Both use 64-byte blocks
  const hashLen = hashFn === 'MD5' ? 16 : 32;

  const steps: VisualizationStep[] = [];

  // ── Step 1: Input ───────────────────────────────────────────────────────

  steps.push({
    id: 'hmac-step-input',
    phase: 'Input',
    label: 'Input Parameters',
    description: `Message: "${message}" (${messageBytes.length} bytes)\nKey: "${keyStr}" (${keyBytes.length} bytes)\nHash Function: ${hashFn} (block size: ${blockSize} bytes, output: ${hashLen} bytes)`,
    blocks: [
      makeBlock('msg', 'Message', bytesToHex(messageBytes), 1, 0, '#3b82f6', 'data', { width: 6 }),
      makeBlock('key', 'Key', bytesToHex(keyBytes), 1, 1, '#f59e0b', 'key', { width: 6 }),
      makeBlock('hash-fn', 'Hash Function', hashFn, 7, 0.5, '#06b6d4', 'constant', { width: 2.5 }),
    ],
    connections: [],
    operations: [],
    highlights: ['msg', 'key', 'hash-fn'],
  });

  // ── Step 2: Key Preparation ──────────────────────────────────────────

  const originalKeyHex = bytesToHex(keyBytes);
  let keyPrepDesc: string;

  if (keyBytes.length > blockSize) {
    // Key too long: hash it
    keyBytes = simpleHash(keyBytes, hashLen);
    keyPrepDesc = `Key (${textToBytes(keyStr).length} bytes) is longer than block size (${blockSize} bytes), so it is hashed to ${hashLen} bytes.`;
  } else {
    keyPrepDesc = `Key (${keyBytes.length} bytes) is shorter than or equal to block size (${blockSize} bytes), used as-is.`;
  }

  // Pad key to block size
  const paddedKey = keyBytes.slice();
  while (paddedKey.length < blockSize) paddedKey.push(0);

  steps.push({
    id: 'hmac-step-keyprep',
    phase: 'Key Preparation',
    label: 'Key Preparation',
    description: `${keyPrepDesc}\nThen pad with zeros to block size (${blockSize} bytes).\nPadded key: ${bytesToHex(paddedKey).substring(0, 32)}...`,
    blocks: [
      makeBlock('key-orig', 'Original Key', originalKeyHex, 1, 0, '#f59e0b', 'key', { width: 6 }),
      makeBlock('key-padded', `Padded Key (${blockSize}B)`, bytesToHex(paddedKey).substring(0, 32) + '...', 1, 1.5, '#f97316', 'intermediate', { width: 6 }),
    ],
    connections: [
      conn('key-orig', 'key-padded', { animated: true, color: '#f59e0b', label: keyBytes.length > blockSize ? 'hash + pad' : 'zero-pad' }),
    ],
    operations: [
      makeOp('op-keyprep', 'pad', 'Key Preparation', 4, 0.7, '#f59e0b'),
    ],
    highlights: ['key-padded'],
  });

  // ── Step 3: Compute ipad and opad ────────────────────────────────────

  const ipadByte = 0x36;
  const opadByte = 0x5c;
  const ipad = new Array(blockSize).fill(ipadByte);
  const opad = new Array(blockSize).fill(opadByte);

  const keyXorIpad = xorBytes(paddedKey, ipad);
  const keyXorOpad = xorBytes(paddedKey, opad);

  steps.push({
    id: 'hmac-step-pads',
    phase: 'Padding',
    label: 'Inner and Outer Padding',
    description: `Compute:\n- ipad = 0x36 repeated ${blockSize} times\n- opad = 0x5c repeated ${blockSize} times\n- key XOR ipad = ${bytesToHex(keyXorIpad).substring(0, 32)}...\n- key XOR opad = ${bytesToHex(keyXorOpad).substring(0, 32)}...`,
    blocks: [
      makeBlock('padded-key-2', 'Padded Key', bytesToHex(paddedKey).substring(0, 24) + '...', 5, 0, '#f59e0b', 'key', { width: 4 }),
      makeBlock('ipad', 'ipad (0x36...)', bytesToHex(ipad).substring(0, 16) + '...', 0, 1.5, '#06b6d4', 'constant', { width: 4 }),
      makeBlock('opad', 'opad (0x5c...)', bytesToHex(opad).substring(0, 16) + '...', 6, 1.5, '#a855f7', 'constant', { width: 4 }),
      makeBlock('key-xor-ipad', 'Key XOR ipad', bytesToHex(keyXorIpad).substring(0, 24) + '...', 0, 3, '#06b6d4', 'intermediate', { width: 4 }),
      makeBlock('key-xor-opad', 'Key XOR opad', bytesToHex(keyXorOpad).substring(0, 24) + '...', 6, 3, '#a855f7', 'intermediate', { width: 4 }),
    ],
    connections: [
      conn('padded-key-2', 'key-xor-ipad', { animated: true, color: '#f59e0b' }),
      conn('ipad', 'key-xor-ipad', { animated: true, color: '#06b6d4' }),
      conn('padded-key-2', 'key-xor-opad', { animated: true, color: '#f59e0b' }),
      conn('opad', 'key-xor-opad', { animated: true, color: '#a855f7' }),
    ],
    operations: [
      makeOp('op-xor-ipad', 'xor', 'XOR', 2, 2.2, '#06b6d4'),
      makeOp('op-xor-opad', 'xor', 'XOR', 8, 2.2, '#a855f7'),
    ],
    highlights: ['key-xor-ipad', 'key-xor-opad'],
  });

  // ── Step 4: Inner Hash ───────────────────────────────────────────────

  const innerInput = [...keyXorIpad, ...messageBytes];
  const innerHash = simpleHash(innerInput, hashLen);

  steps.push({
    id: 'hmac-step-inner',
    phase: 'Inner Hash',
    label: 'Inner Hash Computation',
    description: `Compute inner hash:\nH(key XOR ipad || message)\n= ${hashFn}(${bytesToHex(keyXorIpad).substring(0, 16)}... || ${bytesToHex(messageBytes)})\n= ${bytesToHex(innerHash)}`,
    blocks: [
      makeBlock('inner-kipad', 'Key XOR ipad', bytesToHex(keyXorIpad).substring(0, 24) + '...', 1, 0, '#06b6d4', 'intermediate', { width: 5 }),
      makeBlock('inner-msg', 'Message', bytesToHex(messageBytes), 7, 0, '#3b82f6', 'data', { width: 3 }),
      makeBlock('inner-concat', 'Concatenated', bytesToHex(innerInput).substring(0, 32) + '...', 3, 1.5, '#94a3b8', 'intermediate', { width: 6 }),
      makeBlock('inner-hash', 'Inner Hash', bytesToHex(innerHash), 3, 3, '#06b6d4', 'intermediate', { width: 6 }),
    ],
    connections: [
      conn('inner-kipad', 'inner-concat', { animated: true, color: '#06b6d4', label: 'concat' }),
      conn('inner-msg', 'inner-concat', { animated: true, color: '#3b82f6', label: '||' }),
      conn('inner-concat', 'inner-hash', { animated: true, color: '#06b6d4' }),
    ],
    operations: [
      makeOp('op-inner-hash', 'hash', `${hashFn}`, 5, 2.2, '#06b6d4'),
    ],
    highlights: ['inner-hash'],
  });

  // ── Step 5: Outer Hash ───────────────────────────────────────────────

  const outerInput = [...keyXorOpad, ...innerHash];
  const hmacResult = simpleHash(outerInput, hashLen);

  steps.push({
    id: 'hmac-step-outer',
    phase: 'Outer Hash',
    label: 'Outer Hash Computation',
    description: `Compute outer hash:\nH(key XOR opad || inner_hash)\n= ${hashFn}(${bytesToHex(keyXorOpad).substring(0, 16)}... || ${bytesToHex(innerHash)})\n= ${bytesToHex(hmacResult)}`,
    blocks: [
      makeBlock('outer-kopad', 'Key XOR opad', bytesToHex(keyXorOpad).substring(0, 24) + '...', 1, 0, '#a855f7', 'intermediate', { width: 5 }),
      makeBlock('outer-inner', 'Inner Hash', bytesToHex(innerHash), 7, 0, '#06b6d4', 'intermediate', { width: 3 }),
      makeBlock('outer-concat', 'Concatenated', bytesToHex(outerInput).substring(0, 32) + '...', 3, 1.5, '#94a3b8', 'intermediate', { width: 6 }),
      makeBlock('outer-hash', 'Outer Hash', bytesToHex(hmacResult), 3, 3, '#a855f7', 'output', { width: 6 }),
    ],
    connections: [
      conn('outer-kopad', 'outer-concat', { animated: true, color: '#a855f7', label: 'concat' }),
      conn('outer-inner', 'outer-concat', { animated: true, color: '#06b6d4', label: '||' }),
      conn('outer-concat', 'outer-hash', { animated: true, color: '#a855f7' }),
    ],
    operations: [
      makeOp('op-outer-hash', 'hash', `${hashFn}`, 5, 2.2, '#a855f7'),
    ],
    highlights: ['outer-hash'],
  });

  // ── Step 6: Final HMAC ───────────────────────────────────────────────

  steps.push({
    id: 'hmac-step-result',
    phase: 'Output',
    label: 'HMAC Result',
    description: `HMAC-${hashFn}("${message}", "${keyStr}") = ${bytesToHex(hmacResult)}\n\nFull formula: HMAC(K, m) = H((K' XOR opad) || H((K' XOR ipad) || m))\nwhere K' is the block-size padded key.\n\nThis ${hashLen * 8}-bit tag can be sent alongside the message. The recipient, knowing the key, recomputes the HMAC and compares.`,
    blocks: [
      makeBlock('final-msg', 'Message', `"${message}"`, 1, 0, '#3b82f6', 'data', { width: 4 }),
      makeBlock('final-key', 'Key', `"${keyStr}"`, 6, 0, '#f59e0b', 'key', { width: 3 }),
      makeBlock('final-hmac', `HMAC-${hashFn}`, bytesToHex(hmacResult), 2, 2, '#22c55e', 'output', { width: 6 }),
      makeBlock('final-bits', 'Tag Length', `${hashLen * 8} bits`, 2, 3.2, '#94a3b8', 'constant', { width: 3 }),
    ],
    connections: [
      conn('final-msg', 'final-hmac', { animated: true, color: '#3b82f6' }),
      conn('final-key', 'final-hmac', { animated: true, color: '#f59e0b' }),
    ],
    operations: [
      makeOp('op-hmac-final', 'hash', 'HMAC', 5, 1, '#22c55e'),
    ],
    highlights: ['final-hmac'],
  });

  return steps;
}

const hmacEngine: AlgorithmEngine = {
  meta,
  inputConfig,
  generateSteps,
};

export default hmacEngine;
