import type {
  AlgorithmEngine,
  VisualizationStep,
  DataBlock,
  Connection,
  Operation,
} from '@/lib/algorithms/types';

// --- RSA Math Helpers ---

function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

interface ExtGcdResult {
  g: number;
  x: number;
  y: number;
}

function extendedGcd(a: number, b: number): ExtGcdResult {
  if (a === 0) {
    return { g: b, x: 0, y: 1 };
  }
  const { g, x: x1, y: y1 } = extendedGcd(b % a, a);
  return {
    g,
    x: y1 - Math.floor(b / a) * x1,
    y: x1,
  };
}

function modInverse(e: number, phi: number): number {
  const { g, x } = extendedGcd(e % phi, phi);
  if (g !== 1) {
    throw new Error(`Modular inverse does not exist (gcd=${g})`);
  }
  return ((x % phi) + phi) % phi;
}

/** Square-and-multiply modular exponentiation. Returns { result, steps }. */
function modPowWithSteps(
  base: number,
  exp: number,
  mod: number
): { result: number; steps: { bit: number; squared: number; multiplied?: number }[] } {
  const bits = exp.toString(2).split('').map(Number);
  let result = 1;
  const steps: { bit: number; squared: number; multiplied?: number }[] = [];

  for (const bit of bits) {
    const squared = (result * result) % mod;
    result = squared;
    if (bit === 1) {
      const multiplied = (result * base) % mod;
      result = multiplied;
      steps.push({ bit, squared, multiplied });
    } else {
      steps.push({ bit, squared });
    }
  }
  return { result, steps };
}

function findSmallCoprime(phi: number): number {
  // Try common small public exponents
  for (const candidate of [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 65537]) {
    if (candidate < phi && gcd(candidate, phi) === 1) {
      return candidate;
    }
  }
  // Fallback: brute-force search
  for (let e = 3; e < phi; e += 2) {
    if (gcd(e, phi) === 1) return e;
  }
  return 3;
}

/** Extended Euclidean Algorithm trace for visualization. */
function extGcdTrace(
  a: number,
  b: number
): { quotients: { a: number; b: number; q: number; r: number }[]; inverse: number } {
  const quotients: { a: number; b: number; q: number; r: number }[] = [];
  let origA = a;
  let origB = b;
  while (a !== 0) {
    const q = Math.floor(b / a);
    const r = b % a;
    quotients.push({ a, b, q, r });
    [a, b] = [r, a];
  }
  // Compute actual inverse
  const inv = modInverse(origA, origB);
  return { quotients, inverse: inv };
}

// --- Prime sets per key-size ---

interface PrimeSet {
  p: number;
  q: number;
}

function getPrimes(keySize: string): PrimeSet {
  switch (keySize) {
    case '16':
      return { p: 127, q: 131 };
    case '32':
      return { p: 251, q: 257 };
    case '8':
    default:
      return { p: 11, q: 13 };
  }
}

// --- Block / connection / operation helpers ---

function block(
  id: string,
  label: string,
  value: string,
  x: number,
  y: number,
  color: string,
  type: DataBlock['type'],
  opts?: { width?: number; height?: number; group?: string; fontSize?: number; opacity?: number }
): DataBlock {
  return {
    id,
    label,
    value,
    x,
    y,
    z: 0,
    width: opts?.width ?? 2,
    height: opts?.height ?? 1,
    color,
    type,
    group: opts?.group,
    fontSize: opts?.fontSize,
    opacity: opts?.opacity,
  };
}

function conn(from: string, to: string, opts?: Partial<Connection>): Connection {
  return { from, to, ...opts };
}

function op(
  id: string,
  type: Operation['type'],
  label: string,
  x: number,
  y: number,
  color: string
): Operation {
  return { id, type, label, x, y, z: 0, color };
}

// --- Engine ---

const rsaEngine: AlgorithmEngine = {
  meta: {
    id: 'rsa',
    name: 'RSA',
    category: 'asymmetric',
    description:
      'RSA (Rivest-Shamir-Adleman) is one of the first public-key cryptosystems, widely used for secure data transmission. Security relies on the practical difficulty of factoring the product of two large prime numbers.',
    color: '#f59e0b',
    icon: '🔑',
    yearIntroduced: 1977,
    authors: 'Rivest, Shamir, Adleman',
    status: 'standard',
    standardBody: 'PKCS#1',
    keySize: '1024-4096',
    blockSize: undefined,
  },

  inputConfig: {
    type: 'asymmetric',
    fields: [
      {
        name: 'message',
        label: 'Message',
        type: 'text',
        placeholder: 'Enter a short message (e.g. "Hi")',
        required: true,
        maxLength: 64,
      },
      {
        name: 'keySize',
        label: 'Key Size',
        type: 'select',
        required: true,
        defaultValue: '8',
        options: [
          { label: '8-bit demo', value: '8' },
          { label: '16-bit demo', value: '16' },
          { label: '32-bit demo', value: '32' },
        ],
      },
    ],
  },

  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const message = input.message || 'Hi';
    const keySize = input.keySize || '8';

    const { p, q } = getPrimes(keySize);
    const n = p * q;
    const phi = (p - 1) * (q - 1);
    const e = findSmallCoprime(phi);
    const d = modInverse(e, phi);

    // Convert message to numeric values (char codes), keep only those < n
    const charCodes = Array.from(message).map((ch) => ch.charCodeAt(0));
    // For the visualization we process only values < n; clamp or warn
    const mValues = charCodes.map((c) => c % n);

    // Encrypt each value
    const encrypted = mValues.map((m) => modPowWithSteps(m, e, n));
    const cipherValues = encrypted.map((r) => r.result);

    // Decrypt each value
    const decrypted = cipherValues.map((c) => modPowWithSteps(c, d, n));
    const decryptedValues = decrypted.map((r) => r.result);

    // Extended GCD trace for step 6
    const egcdTrace = extGcdTrace(e, phi);

    const steps: VisualizationStep[] = [];

    // ── Step 1: Input message ──
    const step1Blocks: DataBlock[] = [
      block('msg-text', 'Message', `"${message}"`, 1, 0, '#3b82f6', 'data', { width: 3 }),
      ...charCodes.map((code, i) =>
        block(
          `msg-num-${i}`,
          `'${message[i]}'`,
          `${code}`,
          1 + i * 2.5,
          2,
          '#60a5fa',
          'intermediate',
          { group: 'char-codes' }
        )
      ),
    ];
    steps.push({
      id: 'step-1-input',
      phase: 'Input',
      label: 'Message Input',
      description: `Convert message "${message}" to numeric values (ASCII codes): [${charCodes.join(', ')}]. Each value must be < n for RSA to work.`,
      blocks: step1Blocks,
      connections: charCodes.map((_, i) =>
        conn('msg-text', `msg-num-${i}`, { animated: true, color: '#3b82f6', label: 'ASCII' })
      ),
      operations: [],
      highlights: ['msg-text'],
    });

    // ── Step 2: Prime selection ──
    steps.push({
      id: 'step-2-primes',
      phase: 'Key Generation',
      label: 'Prime Selection',
      description: `Select two distinct primes p = ${p} and q = ${q}. In real RSA these would be hundreds of digits long.`,
      blocks: [
        block('prime-p', 'p (prime)', `${p}`, 2, 0, '#f59e0b', 'key'),
        block('prime-q', 'q (prime)', `${q}`, 6, 0, '#f59e0b', 'key'),
      ],
      connections: [],
      operations: [],
      highlights: ['prime-p', 'prime-q'],
    });

    // ── Step 3: Compute n = p * q ──
    steps.push({
      id: 'step-3-modulus',
      phase: 'Key Generation',
      label: 'Compute Modulus n',
      description: `n = p × q = ${p} × ${q} = ${n}. This modulus is part of both the public and private keys.`,
      blocks: [
        block('prime-p2', 'p', `${p}`, 1, 0, '#f59e0b', 'key'),
        block('prime-q2', 'q', `${q}`, 7, 0, '#f59e0b', 'key'),
        block('modulus-n', 'n = p × q', `${n}`, 4, 3, '#22c55e', 'intermediate', { width: 3 }),
      ],
      connections: [
        conn('prime-p2', 'mul-op', { animated: true, color: '#f59e0b' }),
        conn('prime-q2', 'mul-op', { animated: true, color: '#f59e0b' }),
        conn('mul-op', 'modulus-n', { animated: true, color: '#22c55e' }),
      ],
      operations: [op('mul-op', 'multiply', `${p} × ${q}`, 4, 1.5, '#f59e0b')],
      highlights: ['modulus-n'],
    });

    // ── Step 4: Euler's totient ──
    steps.push({
      id: 'step-4-totient',
      phase: 'Key Generation',
      label: "Euler's Totient φ(n)",
      description: `φ(n) = (p−1)(q−1) = ${p - 1} × ${q - 1} = ${phi}. This value is kept secret and used to derive the private exponent.`,
      blocks: [
        block('p-minus-1', 'p − 1', `${p - 1}`, 1, 0, '#f59e0b', 'intermediate'),
        block('q-minus-1', 'q − 1', `${q - 1}`, 7, 0, '#f59e0b', 'intermediate'),
        block('totient', 'φ(n)', `${phi}`, 4, 3, '#a855f7', 'intermediate', { width: 3 }),
      ],
      connections: [
        conn('p-minus-1', 'totient-mul', { animated: true, color: '#f59e0b' }),
        conn('q-minus-1', 'totient-mul', { animated: true, color: '#f59e0b' }),
        conn('totient-mul', 'totient', { animated: true, color: '#a855f7' }),
      ],
      operations: [op('totient-mul', 'multiply', `${p - 1} × ${q - 1}`, 4, 1.5, '#a855f7')],
      highlights: ['totient'],
    });

    // ── Step 5: Choose public exponent e ──
    steps.push({
      id: 'step-5-public-exp',
      phase: 'Key Generation',
      label: 'Choose Public Exponent e',
      description: `Choose e = ${e} such that 1 < e < φ(n) and gcd(e, φ(n)) = 1. Verified: gcd(${e}, ${phi}) = ${gcd(e, phi)}.`,
      blocks: [
        block('totient2', 'φ(n)', `${phi}`, 1, 0, '#a855f7', 'intermediate'),
        block('pub-e', 'e (public exponent)', `${e}`, 5, 0, '#f59e0b', 'key', { width: 3 }),
        block('gcd-check', 'gcd(e, φ(n))', '1 ✓', 3, 2, '#22c55e', 'constant', { width: 3 }),
      ],
      connections: [
        conn('totient2', 'gcd-check', { dashed: true, color: '#a855f7' }),
        conn('pub-e', 'gcd-check', { dashed: true, color: '#f59e0b' }),
      ],
      operations: [],
      highlights: ['pub-e', 'gcd-check'],
    });

    // ── Step 6: Compute d via Extended Euclidean Algorithm ──
    const egcdBlocks: DataBlock[] = [
      block('egcd-e', 'e', `${e}`, 0, 0, '#f59e0b', 'key'),
      block('egcd-phi', 'φ(n)', `${phi}`, 3, 0, '#a855f7', 'intermediate'),
    ];
    const egcdConns: Connection[] = [];
    const egcdOps: Operation[] = [];
    const traceLines: string[] = [];

    egcdTrace.quotients.forEach((row, i) => {
      const yOff = 2 + i * 1.5;
      const rowId = `egcd-row-${i}`;
      egcdBlocks.push(
        block(
          rowId,
          `Step ${i + 1}`,
          `${row.b} = ${row.q} × ${row.a} + ${row.r}`,
          1,
          yOff,
          '#64748b',
          'intermediate',
          { width: 5, fontSize: 12 }
        )
      );
      traceLines.push(`${row.b} = ${row.q} × ${row.a} + ${row.r}`);
      if (i > 0) {
        egcdConns.push(conn(`egcd-row-${i - 1}`, rowId, { color: '#64748b', dashed: true }));
      }
    });

    egcdBlocks.push(
      block(
        'priv-d-preview',
        'd (private exponent)',
        `${d}`,
        3,
        2 + egcdTrace.quotients.length * 1.5 + 1,
        '#ef4444',
        'key',
        { width: 4 }
      )
    );

    steps.push({
      id: 'step-6-private-exp',
      phase: 'Key Generation',
      label: 'Compute Private Exponent d',
      description: `Use Extended Euclidean Algorithm to find d = e⁻¹ mod φ(n).\n${traceLines.join('\n')}\nResult: d = ${d} (verify: e × d mod φ(n) = ${e} × ${d} mod ${phi} = ${(e * d) % phi}).`,
      blocks: egcdBlocks,
      connections: [
        conn('egcd-e', 'egcd-row-0', { animated: true, color: '#f59e0b' }),
        conn('egcd-phi', 'egcd-row-0', { animated: true, color: '#a855f7' }),
        ...egcdConns,
        conn(
          `egcd-row-${egcdTrace.quotients.length - 1}`,
          'priv-d-preview',
          { animated: true, color: '#ef4444', label: 'back-substitute' }
        ),
      ],
      operations: egcdOps,
      highlights: ['priv-d-preview'],
    });

    // ── Step 7: Public & private key ──
    steps.push({
      id: 'step-7-keys',
      phase: 'Key Generation',
      label: 'Key Pair',
      description: `Public key: (n=${n}, e=${e}). Private key: (n=${n}, d=${d}). The public key is shared openly; the private key must remain secret.`,
      blocks: [
        block('pub-key-n', 'n', `${n}`, 1, 0, '#22c55e', 'key'),
        block('pub-key-e', 'e', `${e}`, 3.5, 0, '#f59e0b', 'key'),
        block('pub-key-label', 'Public Key (n, e)', `(${n}, ${e})`, 2, 1.5, '#22c55e', 'output', {
          width: 4,
        }),
        block('priv-key-n', 'n', `${n}`, 1, 4, '#22c55e', 'key'),
        block('priv-key-d', 'd', `${d}`, 3.5, 4, '#ef4444', 'key'),
        block('priv-key-label', 'Private Key (n, d)', `(${n}, ${d})`, 2, 5.5, '#ef4444', 'output', {
          width: 4,
        }),
      ],
      connections: [
        conn('pub-key-n', 'pub-key-label', { color: '#22c55e' }),
        conn('pub-key-e', 'pub-key-label', { color: '#f59e0b' }),
        conn('priv-key-n', 'priv-key-label', { color: '#22c55e' }),
        conn('priv-key-d', 'priv-key-label', { color: '#ef4444' }),
      ],
      operations: [],
      highlights: ['pub-key-label', 'priv-key-label'],
    });

    // ── Step 8: Encryption ──
    const encBlocks: DataBlock[] = [];
    const encConns: Connection[] = [];
    const encOps: Operation[] = [];
    const encDescParts: string[] = [];

    mValues.forEach((m, i) => {
      const xOff = i * 5;
      const mId = `enc-m-${i}`;
      const opId = `enc-modexp-${i}`;
      const cId = `enc-c-${i}`;
      encBlocks.push(block(mId, `m[${i}] = '${message[i]}'`, `${m}`, xOff, 0, '#3b82f6', 'data'));
      encOps.push(op(opId, 'modexp', `${m}^${e} mod ${n}`, xOff + 1, 2, '#f59e0b'));
      encBlocks.push(
        block(cId, `c[${i}]`, `${cipherValues[i]}`, xOff + 1, 4, '#ef4444', 'output')
      );
      encConns.push(conn(mId, opId, { animated: true, color: '#3b82f6' }));
      encConns.push(conn(opId, cId, { animated: true, color: '#ef4444' }));

      // Squaring trace for description
      const trace = encrypted[i].steps;
      const stepsStr = trace
        .map(
          (s, si) =>
            `bit ${si}(${s.bit}): sq→${s.squared}${s.multiplied !== undefined ? ` mul→${s.multiplied}` : ''}`
        )
        .join(', ');
      encDescParts.push(`m=${m}: exp bits=[${e.toString(2)}], ${stepsStr} => c=${cipherValues[i]}`);
    });

    steps.push({
      id: 'step-8-encryption',
      phase: 'Encryption',
      label: 'Modular Exponentiation (Encrypt)',
      description: `c = m^e mod n using square-and-multiply.\n${encDescParts.join('\n')}`,
      blocks: encBlocks,
      connections: encConns,
      operations: encOps,
      highlights: encBlocks.filter((b) => b.type === 'output').map((b) => b.id),
    });

    // ── Step 9: Ciphertext ──
    steps.push({
      id: 'step-9-ciphertext',
      phase: 'Encryption',
      label: 'Ciphertext',
      description: `Encrypted values: [${cipherValues.join(', ')}]. These can only be decrypted with the private key d = ${d}.`,
      blocks: [
        block(
          'ciphertext',
          'Ciphertext',
          `[${cipherValues.join(', ')}]`,
          2,
          0,
          '#ef4444',
          'output',
          { width: 5 }
        ),
        block('pub-used', 'Encrypted with (n, e)', `(${n}, ${e})`, 2, 2, '#f59e0b', 'key', {
          width: 5,
          opacity: 0.7,
        }),
      ],
      connections: [conn('pub-used', 'ciphertext', { dashed: true, color: '#f59e0b' })],
      operations: [],
      highlights: ['ciphertext'],
    });

    // ── Step 10: Decryption ──
    const decBlocks: DataBlock[] = [];
    const decConns: Connection[] = [];
    const decOps: Operation[] = [];
    const decDescParts: string[] = [];

    cipherValues.forEach((c, i) => {
      const xOff = i * 5;
      const cId = `dec-c-${i}`;
      const opId = `dec-modexp-${i}`;
      const mId = `dec-m-${i}`;
      decBlocks.push(block(cId, `c[${i}]`, `${c}`, xOff, 0, '#ef4444', 'data'));
      decOps.push(op(opId, 'modexp', `${c}^${d} mod ${n}`, xOff + 1, 2, '#a855f7'));
      decBlocks.push(
        block(mId, `m[${i}]`, `${decryptedValues[i]}`, xOff + 1, 4, '#22c55e', 'output')
      );
      decConns.push(conn(cId, opId, { animated: true, color: '#ef4444' }));
      decConns.push(conn(opId, mId, { animated: true, color: '#22c55e' }));

      const trace = decrypted[i].steps;
      const stepsStr = trace
        .map(
          (s, si) =>
            `bit ${si}(${s.bit}): sq→${s.squared}${s.multiplied !== undefined ? ` mul→${s.multiplied}` : ''}`
        )
        .join(', ');
      decDescParts.push(
        `c=${c}: exp bits=[${d.toString(2)}], ${stepsStr} => m=${decryptedValues[i]}`
      );
    });

    steps.push({
      id: 'step-10-decryption',
      phase: 'Decryption',
      label: 'Modular Exponentiation (Decrypt)',
      description: `m = c^d mod n using square-and-multiply with private key.\n${decDescParts.join('\n')}`,
      blocks: decBlocks,
      connections: decConns,
      operations: decOps,
      highlights: decBlocks.filter((b) => b.type === 'output').map((b) => b.id),
    });

    // ── Step 11: Verification ──
    const recoveredMessage = decryptedValues.map((v) => String.fromCharCode(v)).join('');
    const match = recoveredMessage === Array.from(message).map((ch) => String.fromCharCode(ch.charCodeAt(0) % n)).map((ch) => ch).join('');

    steps.push({
      id: 'step-11-verify',
      phase: 'Verification',
      label: 'Decrypted Message',
      description: `Decrypted values [${decryptedValues.join(', ')}] converted back to characters: "${recoveredMessage}". ${match ? 'Matches original message!' : 'Note: characters with codes >= n were reduced mod n.'}`,
      blocks: [
        block('orig-msg', 'Original', `"${message}"`, 1, 0, '#3b82f6', 'data', { width: 3 }),
        block('dec-msg', 'Decrypted', `"${recoveredMessage}"`, 6, 0, '#22c55e', 'output', {
          width: 3,
        }),
        block(
          'verify-result',
          'Verification',
          match ? '✓ Match' : '≈ Reduced mod n',
          4,
          2,
          match ? '#22c55e' : '#f59e0b',
          'constant',
          { width: 3 }
        ),
      ],
      connections: [
        conn('orig-msg', 'verify-result', { color: '#3b82f6', dashed: true }),
        conn('dec-msg', 'verify-result', { color: '#22c55e', dashed: true }),
      ],
      operations: [],
      highlights: ['verify-result'],
    });

    return steps;
  },
};

export default rsaEngine;
