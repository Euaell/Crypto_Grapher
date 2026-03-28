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
  const result: number[] = [];
  for (let i = 0; i < a.length; i++) {
    result.push((a[i] || 0) ^ (b[i] || 0));
  }
  return result;
}

function int32ToBytes(n: number): number[] {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ];
}

// Simplified HMAC for demonstration. Uses a mixing hash internally.
// NOT cryptographically secure - for visualization purposes only.

function simpleHash(data: number[], outputLen: number): number[] {
  const state = new Uint32Array(outputLen / 4);
  const iv = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  for (let i = 0; i < state.length; i++) {
    state[i] = iv[i % iv.length] >>> 0;
  }

  for (let i = 0; i < data.length; i++) {
    const idx = i % state.length;
    state[idx] = ((state[idx] + data[i]) * 0x01000193) >>> 0;
    const next = (idx + 1) % state.length;
    state[next] ^= ((state[idx] >>> 17) | (state[idx] << 15)) >>> 0;
  }

  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < state.length; i++) {
      const prev = (i === 0 ? state.length - 1 : i - 1);
      state[i] = ((state[i] ^ state[prev]) * 0x5bd1e995) >>> 0;
      state[i] ^= (state[i] >>> 13) >>> 0;
      state[i] = (state[i] * 0xc2b2ae35) >>> 0;
      state[i] ^= (state[i] >>> 16) >>> 0;
    }
  }

  const result: number[] = [];
  for (let i = 0; i < state.length; i++) {
    result.push((state[i] >>> 24) & 0xff);
    result.push((state[i] >>> 16) & 0xff);
    result.push((state[i] >>> 8) & 0xff);
    result.push(state[i] & 0xff);
  }
  return result.slice(0, outputLen);
}

function simpleHMAC(key: number[], data: number[], hashLen: number): number[] {
  const blockSize = 64;
  let paddedKey = key.slice();

  // If key is longer than block size, hash it
  if (paddedKey.length > blockSize) {
    paddedKey = simpleHash(paddedKey, hashLen);
  }
  // Pad to block size
  while (paddedKey.length < blockSize) paddedKey.push(0);

  const ipad = new Array(blockSize).fill(0x36);
  const opad = new Array(blockSize).fill(0x5c);

  const innerKey = xorBytes(paddedKey, ipad);
  const innerHash = simpleHash([...innerKey, ...data], hashLen);

  const outerKey = xorBytes(paddedKey, opad);
  return simpleHash([...outerKey, ...innerHash], hashLen);
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
  id: 'pbkdf2',
  name: 'PBKDF2',
  category: 'key-derivation',
  description:
    'PBKDF2 (Password-Based Key Derivation Function 2) derives cryptographic keys from passwords. It applies a pseudorandom function (typically HMAC-SHA256) iteratively to make brute-force attacks computationally expensive.',
  color: '#ef4444',
  icon: '⚙️',
  yearIntroduced: 2000,
  authors: 'RSA Laboratories',
  status: 'standard',
  standardBody: 'RFC 2898',
  keySize: 'variable',
  blockSize: undefined,
};

const inputConfig: InputConfig = {
  type: 'kdf',
  fields: [
    {
      name: 'password',
      label: 'Password',
      type: 'text',
      placeholder: 'Enter password',
      required: true,
      defaultValue: 'mysecretpassword',
      maxLength: 64,
    },
    {
      name: 'salt',
      label: 'Salt',
      type: 'text',
      placeholder: 'Enter salt value',
      required: true,
      defaultValue: 'randomsalt',
      maxLength: 32,
    },
    {
      name: 'iterations',
      label: 'Iterations',
      type: 'number',
      placeholder: 'Number of iterations (1-16)',
      required: true,
      defaultValue: '4',
    },
    {
      name: 'keyLength',
      label: 'Key Length (bytes)',
      type: 'number',
      placeholder: 'Derived key length in bytes',
      required: true,
      defaultValue: '32',
    },
  ],
};

function generateSteps(input: Record<string, string>): VisualizationStep[] {
  const password = input.password || 'mysecretpassword';
  const salt = input.salt || 'randomsalt';
  const iterations = Math.max(1, Math.min(16, parseInt(input.iterations || '4', 10)));
  const keyLength = Math.max(1, Math.min(64, parseInt(input.keyLength || '32', 10)));

  const passwordBytes = textToBytes(password);
  const saltBytes = textToBytes(salt);
  const hashLen = 32; // Using SHA-256-like output size

  const steps: VisualizationStep[] = [];

  // ── Step 1: Input ───────────────────────────────────────────────────────

  steps.push({
    id: 'pbkdf2-step-input',
    phase: 'Input',
    label: 'Input Parameters',
    description: `Password: "${password}" (${passwordBytes.length} bytes)\nSalt: "${salt}" (${saltBytes.length} bytes)\nIterations: ${iterations}\nDesired Key Length: ${keyLength} bytes (${keyLength * 8} bits)`,
    blocks: [
      makeBlock('password', 'Password', bytesToHex(passwordBytes), 1, 0, '#ef4444', 'key', { width: 6 }),
      makeBlock('salt', 'Salt', bytesToHex(saltBytes), 1, 1, '#f59e0b', 'data', { width: 6 }),
      makeBlock('iters', 'Iterations', `${iterations}`, 8, 0, '#8b5cf6', 'constant', { width: 2 }),
      makeBlock('keylen', 'Key Length', `${keyLength} bytes`, 8, 1, '#3b82f6', 'constant', { width: 2 }),
    ],
    connections: [],
    operations: [],
    highlights: ['password', 'salt', 'iters', 'keylen'],
  });

  // ── Step 2: Block count calculation ──────────────────────────────────

  const numBlocks = Math.ceil(keyLength / hashLen);

  steps.push({
    id: 'pbkdf2-step-blocks',
    phase: 'Setup',
    label: 'Block Count Calculation',
    description: `The derived key needs ${keyLength} bytes. Each HMAC block produces ${hashLen} bytes.\nBlocks needed: ceil(${keyLength} / ${hashLen}) = ${numBlocks}\nWe will compute T_1${numBlocks > 1 ? ` through T_${numBlocks}` : ''} and concatenate.`,
    blocks: [
      makeBlock('keylen-2', 'Key Length', `${keyLength} bytes`, 1, 0, '#3b82f6', 'constant', { width: 3 }),
      makeBlock('hashlen', 'HMAC Output', `${hashLen} bytes`, 5, 0, '#06b6d4', 'constant', { width: 3 }),
      makeBlock('nblocks', 'Blocks Needed', `${numBlocks}`, 3, 1.5, '#ef4444', 'intermediate', { width: 3 }),
    ],
    connections: [
      conn('keylen-2', 'nblocks', { animated: true, color: '#3b82f6' }),
      conn('hashlen', 'nblocks', { animated: true, color: '#06b6d4', label: 'ceil(keyLen/hLen)' }),
    ],
    operations: [],
    highlights: ['nblocks'],
  });

  // ── Steps 3+: Process each block ─────────────────────────────────────

  const derivedKeyParts: number[][] = [];

  for (let blockIdx = 1; blockIdx <= numBlocks; blockIdx++) {
    // U_1 = HMAC(password, salt || INT(blockIdx))
    const saltPlusInt = [...saltBytes, ...int32ToBytes(blockIdx)];

    const uValues: number[][] = [];
    let u = simpleHMAC(passwordBytes, saltPlusInt, hashLen);
    uValues.push(u);

    // First iteration step
    steps.push({
      id: `pbkdf2-step-block${blockIdx}-u1`,
      phase: `Block ${blockIdx}`,
      label: `Block ${blockIdx}: First Iteration (U_1)`,
      description: `U_1 = HMAC(password, salt || INT(${blockIdx}))\n= HMAC(password, ${bytesToHex(saltPlusInt)})\n= ${bytesToHex(u)}\n\nINT(${blockIdx}) = ${bytesToHex(int32ToBytes(blockIdx))} (4-byte big-endian encoding)`,
      blocks: [
        makeBlock(`b${blockIdx}-password`, 'Password', bytesToHex(passwordBytes), 1, 0, '#ef4444', 'key', { width: 4 }),
        makeBlock(`b${blockIdx}-salt-int`, `Salt || INT(${blockIdx})`, bytesToHex(saltPlusInt), 6, 0, '#f59e0b', 'data', { width: 4 }),
        makeBlock(`b${blockIdx}-u1`, 'U_1', bytesToHex(u), 3, 2, '#06b6d4', 'intermediate', { width: 6 }),
      ],
      connections: [
        conn(`b${blockIdx}-password`, `b${blockIdx}-u1`, { animated: true, color: '#ef4444' }),
        conn(`b${blockIdx}-salt-int`, `b${blockIdx}-u1`, { animated: true, color: '#f59e0b' }),
      ],
      operations: [
        makeOp(`op-hmac-b${blockIdx}-u1`, 'hash', 'HMAC', 5, 1, '#06b6d4'),
      ],
      highlights: [`b${blockIdx}-u1`],
    });

    // Subsequent iterations
    let xorAccum = u.slice();

    for (let iter = 2; iter <= iterations; iter++) {
      const prevU = u;
      u = simpleHMAC(passwordBytes, prevU, hashLen);
      uValues.push(u);
      xorAccum = xorBytes(xorAccum, u);

      steps.push({
        id: `pbkdf2-step-block${blockIdx}-u${iter}`,
        phase: `Block ${blockIdx}`,
        label: `Block ${blockIdx}: Iteration ${iter} (U_${iter})`,
        description: `U_${iter} = HMAC(password, U_${iter - 1})\n= HMAC(password, ${bytesToHex(prevU)})\n= ${bytesToHex(u)}\n\nRunning XOR: T_${blockIdx} = U_1 XOR U_2 XOR ... XOR U_${iter}\n= ${bytesToHex(xorAccum)}`,
        blocks: [
          makeBlock(`b${blockIdx}-pw-${iter}`, 'Password', bytesToHex(passwordBytes), 1, 0, '#ef4444', 'key', { width: 4 }),
          makeBlock(`b${blockIdx}-prev-u${iter}`, `U_${iter - 1}`, bytesToHex(prevU), 6, 0, '#06b6d4', 'data', { width: 4 }),
          makeBlock(`b${blockIdx}-u${iter}`, `U_${iter}`, bytesToHex(u), 3, 1.5, '#8b5cf6', 'intermediate', { width: 6 }),
          makeBlock(`b${blockIdx}-xor-${iter}`, `T_${blockIdx} (XOR accum)`, bytesToHex(xorAccum), 3, 3, '#22c55e', 'intermediate', { width: 6 }),
        ],
        connections: [
          conn(`b${blockIdx}-pw-${iter}`, `b${blockIdx}-u${iter}`, { animated: true, color: '#ef4444' }),
          conn(`b${blockIdx}-prev-u${iter}`, `b${blockIdx}-u${iter}`, { animated: true, color: '#06b6d4' }),
          conn(`b${blockIdx}-u${iter}`, `b${blockIdx}-xor-${iter}`, { animated: true, color: '#8b5cf6', label: 'XOR' }),
        ],
        operations: [
          makeOp(`op-hmac-b${blockIdx}-u${iter}`, 'hash', 'HMAC', 5, 0.7, '#8b5cf6'),
          makeOp(`op-xor-b${blockIdx}-${iter}`, 'xor', 'XOR accumulate', 5, 2.2, '#22c55e'),
        ],
        highlights: [`b${blockIdx}-xor-${iter}`],
      });
    }

    // Block result
    const blockResult = xorAccum;
    derivedKeyParts.push(blockResult);

    const uValuesDesc = uValues.map((uv, i) => `U_${i + 1} = ${bytesToHex(uv)}`).join('\n');

    steps.push({
      id: `pbkdf2-step-block${blockIdx}-result`,
      phase: `Block ${blockIdx}`,
      label: `Block ${blockIdx}: T_${blockIdx} Result`,
      description: `T_${blockIdx} = U_1 XOR U_2 XOR ... XOR U_${iterations}\n\n${uValuesDesc}\n\nT_${blockIdx} = ${bytesToHex(blockResult)}`,
      blocks: [
        ...uValues.map((uv, i) =>
          makeBlock(`b${blockIdx}-ufinal-${i}`, `U_${i + 1}`, bytesToHex(uv), (i % 2) * 5, Math.floor(i / 2) * 0.9, '#06b6d4', 'intermediate', { width: 4.5 }),
        ),
        makeBlock(`b${blockIdx}-T`, `T_${blockIdx}`, bytesToHex(blockResult), 2, uValues.length * 0.5 + 1, '#22c55e', 'output', { width: 6 }),
      ],
      connections: uValues.map((_, i) =>
        conn(`b${blockIdx}-ufinal-${i}`, `b${blockIdx}-T`, { animated: true, color: '#06b6d4', label: 'XOR' }),
      ),
      operations: [
        makeOp(`op-xor-final-b${blockIdx}`, 'xor', `XOR all U values`, 5, uValues.length * 0.5 + 0.3, '#22c55e'),
      ],
      highlights: [`b${blockIdx}-T`],
    });
  }

  // ── Final: Concatenate and truncate ──────────────────────────────────

  const fullKey = derivedKeyParts.flat();
  const derivedKey = fullKey.slice(0, keyLength);

  const partBlocks: DataBlock[] = derivedKeyParts.map((part, i) =>
    makeBlock(`dk-part-${i}`, `T_${i + 1}`, bytesToHex(part), 1, i * 1, '#22c55e', 'intermediate', { width: 8 }),
  );
  const partConns: Connection[] = derivedKeyParts.map((_, i) =>
    conn(`dk-part-${i}`, 'dk-final', { animated: true, color: '#22c55e' }),
  );

  steps.push({
    id: 'pbkdf2-step-result',
    phase: 'Output',
    label: 'Derived Key',
    description: `Concatenate T_1${numBlocks > 1 ? ` through T_${numBlocks}` : ''} and take the first ${keyLength} bytes.\n\nDerived Key (${keyLength} bytes, ${keyLength * 8} bits):\n${bytesToHex(derivedKey)}\n\nThis key was derived from password "${password}" using ${iterations} iterations of HMAC with salt "${salt}".`,
    blocks: [
      ...partBlocks,
      makeBlock('dk-final', 'Derived Key', bytesToHex(derivedKey), 1, derivedKeyParts.length * 1 + 0.5, '#ef4444', 'output', { width: 8 }),
      makeBlock('dk-info', 'Parameters', `iterations=${iterations}, salt="${salt}", keyLen=${keyLength}`, 1, derivedKeyParts.length * 1 + 1.8, '#94a3b8', 'constant', { width: 8 }),
    ],
    connections: partConns,
    operations: [
      makeOp('op-concat-trunc', 'hash', `Concat + Truncate to ${keyLength}B`, 5, derivedKeyParts.length * 1, '#ef4444'),
    ],
    highlights: ['dk-final'],
  });

  return steps;
}

const pbkdf2Engine: AlgorithmEngine = {
  meta,
  inputConfig,
  generateSteps,
};

export default pbkdf2Engine;
