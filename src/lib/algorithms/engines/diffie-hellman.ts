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

function modPow(base: number, exp: number, mod: number): number {
  let result = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp & 1) {
      result = (result * base) % mod;
    }
    exp = exp >> 1;
    base = (base * base) % mod;
  }
  return result;
}

function modPowTrace(base: number, exp: number, mod: number): { result: number; steps: string[] } {
  const traceSteps: string[] = [];
  let result = 1;
  let b = base % mod;
  const bits = exp.toString(2);
  traceSteps.push(`Computing ${base}^${exp} mod ${mod} (binary exp: ${bits})`);

  let tempExp = exp;
  let bitPos = 0;
  while (tempExp > 0) {
    if (tempExp & 1) {
      const prev = result;
      result = (result * b) % mod;
      traceSteps.push(`bit ${bitPos}=1: ${prev} * ${b} mod ${mod} = ${result}`);
    } else {
      traceSteps.push(`bit ${bitPos}=0: square only`);
    }
    tempExp = tempExp >> 1;
    b = (b * b) % mod;
    bitPos++;
  }
  traceSteps.push(`Result: ${result}`);
  return { result, steps: traceSteps };
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
  id: 'diffie-hellman',
  name: 'Diffie-Hellman Key Exchange',
  category: 'key-exchange',
  description:
    'Diffie-Hellman is a method of securely exchanging cryptographic keys over a public channel. It was one of the first public-key protocols, allowing two parties to jointly establish a shared secret without any prior shared information.',
  color: '#ec4899',
  icon: '🤝',
  yearIntroduced: 1976,
  authors: 'Diffie, Hellman',
  status: 'standard',
  keySize: '2048+',
  blockSize: undefined,
};

const inputConfig: InputConfig = {
  type: 'asymmetric',
  fields: [
    {
      name: 'primeSize',
      label: 'Prime Size',
      type: 'select',
      required: true,
      defaultValue: 'small',
      options: [
        { label: 'Small (p=23, g=5)', value: 'small' },
        { label: 'Medium (p=541, g=2)', value: 'medium' },
      ],
    },
  ],
};

function generateSteps(input: Record<string, string>): VisualizationStep[] {
  const primeSize = input.primeSize || 'small';

  let p: number, g: number;
  if (primeSize === 'medium') {
    p = 541; g = 2;
  } else {
    p = 23; g = 5;
  }

  // Choose "random" secrets for Alice and Bob (deterministic for demo)
  const a = primeSize === 'medium' ? 37 : 6; // Alice's secret
  const b = primeSize === 'medium' ? 53 : 15; // Bob's secret

  const steps: VisualizationStep[] = [];

  // ── Step 1: Public Parameters ─────────────────────────────────────────

  steps.push({
    id: 'dh-step-params',
    phase: 'Setup',
    label: 'Public Parameters',
    description: `Alice and Bob agree on public parameters:\n- Prime p = ${p}\n- Generator g = ${g}\nThese values are shared openly and do not need to be secret.`,
    blocks: [
      makeBlock('prime-p', 'Prime p', `${p}`, 3, 0, '#ec4899', 'constant', { width: 2.5 }),
      makeBlock('gen-g', 'Generator g', `${g}`, 6, 0, '#ec4899', 'constant', { width: 2.5 }),
      makeBlock('public-label', 'Public Channel', 'Shared openly', 4, 1.2, '#94a3b8', 'constant', { width: 4 }),
    ],
    connections: [],
    operations: [],
    highlights: ['prime-p', 'gen-g'],
  });

  // ── Step 2: Alice picks secret ────────────────────────────────────────

  steps.push({
    id: 'dh-step-alice-secret',
    phase: 'Key Generation',
    label: 'Alice Chooses Secret',
    description: `Alice randomly selects a secret integer a = ${a} (kept private, never shared).`,
    blocks: [
      makeBlock('alice-label', 'Alice', 'Private', 1, 0, '#3b82f6', 'constant', { width: 3 }),
      makeBlock('alice-secret', `Secret a`, `${a}`, 1, 1, '#3b82f6', 'key', { width: 3 }),
      makeBlock('bob-label', 'Bob', '(waiting)', 7, 0, '#10b981', 'constant', { width: 3 }),
    ],
    connections: [],
    operations: [],
    highlights: ['alice-secret'],
  });

  // ── Step 3: Alice computes A = g^a mod p ──────────────────────────────

  const traceA = modPowTrace(g, a, p);
  const A = traceA.result;

  steps.push({
    id: 'dh-step-alice-public',
    phase: 'Key Generation',
    label: 'Alice Computes Public Value',
    description: `Alice computes A = g^a mod p = ${g}^${a} mod ${p} = ${A}\n\n${traceA.steps.join('\n')}`,
    blocks: [
      makeBlock('alice-g', 'g', `${g}`, 0, 0, '#ec4899', 'constant'),
      makeBlock('alice-a', 'a (secret)', `${a}`, 3, 0, '#3b82f6', 'key'),
      makeBlock('alice-p', 'mod p', `${p}`, 6, 0, '#ec4899', 'constant'),
      makeBlock('alice-A', 'A (public)', `${A}`, 3, 2, '#3b82f6', 'output', { width: 3 }),
    ],
    connections: [
      conn('alice-g', 'alice-A', { animated: true, color: '#ec4899' }),
      conn('alice-a', 'alice-A', { animated: true, color: '#3b82f6' }),
      conn('alice-p', 'alice-A', { dashed: true, color: '#ec4899' }),
    ],
    operations: [
      makeOp('op-modexp-a', 'modexp', `${g}^${a} mod ${p}`, 3, 1, '#3b82f6'),
    ],
    highlights: ['alice-A'],
  });

  // ── Step 4: Bob picks secret and computes B ───────────────────────────

  const traceB = modPowTrace(g, b, p);
  const B = traceB.result;

  steps.push({
    id: 'dh-step-bob-public',
    phase: 'Key Generation',
    label: 'Bob Computes Public Value',
    description: `Bob randomly selects secret b = ${b} and computes B = g^b mod p = ${g}^${b} mod ${p} = ${B}\n\n${traceB.steps.join('\n')}`,
    blocks: [
      makeBlock('bob-g', 'g', `${g}`, 0, 0, '#ec4899', 'constant'),
      makeBlock('bob-b', 'b (secret)', `${b}`, 3, 0, '#10b981', 'key'),
      makeBlock('bob-p', 'mod p', `${p}`, 6, 0, '#ec4899', 'constant'),
      makeBlock('bob-B', 'B (public)', `${B}`, 3, 2, '#10b981', 'output', { width: 3 }),
    ],
    connections: [
      conn('bob-g', 'bob-B', { animated: true, color: '#ec4899' }),
      conn('bob-b', 'bob-B', { animated: true, color: '#10b981' }),
      conn('bob-p', 'bob-B', { dashed: true, color: '#ec4899' }),
    ],
    operations: [
      makeOp('op-modexp-b', 'modexp', `${g}^${b} mod ${p}`, 3, 1, '#10b981'),
    ],
    highlights: ['bob-B'],
  });

  // ── Step 5: Exchange public values ────────────────────────────────────

  steps.push({
    id: 'dh-step-exchange',
    phase: 'Exchange',
    label: 'Exchange Public Values',
    description: `Alice and Bob exchange their public values over the (insecure) public channel.\n- Alice sends A = ${A} to Bob\n- Bob sends B = ${B} to Alice\nAn eavesdropper sees p=${p}, g=${g}, A=${A}, B=${B} but cannot easily compute the shared secret.`,
    blocks: [
      makeBlock('ex-alice', 'Alice', `has a=${a}`, 0, 1, '#3b82f6', 'constant', { width: 3 }),
      makeBlock('ex-A', 'A', `${A}`, 3.5, 0, '#3b82f6', 'output', { width: 2 }),
      makeBlock('ex-B', 'B', `${B}`, 3.5, 2, '#10b981', 'output', { width: 2 }),
      makeBlock('ex-bob', 'Bob', `has b=${b}`, 7, 1, '#10b981', 'constant', { width: 3 }),
      makeBlock('ex-channel', 'Public Channel', `p=${p}, g=${g}`, 3, 3.5, '#94a3b8', 'constant', { width: 4 }),
    ],
    connections: [
      conn('ex-alice', 'ex-A', { animated: true, color: '#3b82f6', label: `A=${A}` }),
      conn('ex-A', 'ex-bob', { animated: true, color: '#3b82f6', label: 'sends A' }),
      conn('ex-bob', 'ex-B', { animated: true, color: '#10b981', label: `B=${B}` }),
      conn('ex-B', 'ex-alice', { animated: true, color: '#10b981', label: 'sends B' }),
    ],
    operations: [],
    highlights: ['ex-A', 'ex-B'],
  });

  // ── Step 6: Alice computes shared secret ──────────────────────────────

  const traceAliceS = modPowTrace(B, a, p);
  const sAlice = traceAliceS.result;

  steps.push({
    id: 'dh-step-alice-shared',
    phase: 'Shared Secret',
    label: 'Alice Computes Shared Secret',
    description: `Alice computes s = B^a mod p = ${B}^${a} mod ${p} = ${sAlice}\n\n${traceAliceS.steps.join('\n')}`,
    blocks: [
      makeBlock('as-B', 'B (from Bob)', `${B}`, 0, 0, '#10b981', 'data'),
      makeBlock('as-a', 'a (Alice secret)', `${a}`, 3, 0, '#3b82f6', 'key'),
      makeBlock('as-p', 'mod p', `${p}`, 6, 0, '#ec4899', 'constant'),
      makeBlock('as-s', 'Shared Secret (Alice)', `${sAlice}`, 3, 2, '#f59e0b', 'output', { width: 4 }),
    ],
    connections: [
      conn('as-B', 'as-s', { animated: true, color: '#10b981' }),
      conn('as-a', 'as-s', { animated: true, color: '#3b82f6' }),
      conn('as-p', 'as-s', { dashed: true, color: '#ec4899' }),
    ],
    operations: [
      makeOp('op-alice-s', 'modexp', `${B}^${a} mod ${p}`, 3, 1, '#f59e0b'),
    ],
    highlights: ['as-s'],
  });

  // ── Step 7: Bob computes shared secret ────────────────────────────────

  const traceBobS = modPowTrace(A, b, p);
  const sBob = traceBobS.result;

  steps.push({
    id: 'dh-step-bob-shared',
    phase: 'Shared Secret',
    label: 'Bob Computes Shared Secret',
    description: `Bob computes s = A^b mod p = ${A}^${b} mod ${p} = ${sBob}\n\n${traceBobS.steps.join('\n')}`,
    blocks: [
      makeBlock('bs-A', 'A (from Alice)', `${A}`, 0, 0, '#3b82f6', 'data'),
      makeBlock('bs-b', 'b (Bob secret)', `${b}`, 3, 0, '#10b981', 'key'),
      makeBlock('bs-p', 'mod p', `${p}`, 6, 0, '#ec4899', 'constant'),
      makeBlock('bs-s', 'Shared Secret (Bob)', `${sBob}`, 3, 2, '#f59e0b', 'output', { width: 4 }),
    ],
    connections: [
      conn('bs-A', 'bs-s', { animated: true, color: '#3b82f6' }),
      conn('bs-b', 'bs-s', { animated: true, color: '#10b981' }),
      conn('bs-p', 'bs-s', { dashed: true, color: '#ec4899' }),
    ],
    operations: [
      makeOp('op-bob-s', 'modexp', `${A}^${b} mod ${p}`, 3, 1, '#f59e0b'),
    ],
    highlights: ['bs-s'],
  });

  // ── Step 8: Verification ──────────────────────────────────────────────

  const match = sAlice === sBob;

  steps.push({
    id: 'dh-step-verify',
    phase: 'Verification',
    label: 'Shared Secret Verification',
    description: `Both parties computed the same shared secret!\n\nAlice: s = B^a mod p = ${B}^${a} mod ${p} = ${sAlice}\nBob:   s = A^b mod p = ${A}^${b} mod ${p} = ${sBob}\n\nMathematically: g^(ab) mod p = ${g}^(${a}*${b}) mod ${p} = ${g}^${a * b} mod ${p} = ${modPow(g, a * b, p)}\n\n${match ? 'Secrets match!' : 'Error: secrets do not match.'}`,
    blocks: [
      makeBlock('v-alice', 'Alice\'s Secret', `s = ${sAlice}`, 1, 0, '#3b82f6', 'output', { width: 3 }),
      makeBlock('v-bob', 'Bob\'s Secret', `s = ${sBob}`, 6, 0, '#10b981', 'output', { width: 3 }),
      makeBlock('v-match', 'Verification', match ? `${sAlice} = ${sBob} ✓` : 'MISMATCH', 3, 2, match ? '#22c55e' : '#ef4444', 'constant', { width: 4 }),
      makeBlock('v-math', 'Mathematical Proof', `g^(ab) mod p = ${g}^${a * b} mod ${p} = ${modPow(g, a * b, p)}`, 2, 3.5, '#f59e0b', 'constant', { width: 6 }),
    ],
    connections: [
      conn('v-alice', 'v-match', { animated: true, color: '#3b82f6' }),
      conn('v-bob', 'v-match', { animated: true, color: '#10b981' }),
    ],
    operations: [],
    highlights: ['v-match', 'v-math'],
  });

  // ── Step 9: Security note ─────────────────────────────────────────────

  steps.push({
    id: 'dh-step-security',
    phase: 'Security',
    label: 'Security Analysis',
    description: `An eavesdropper knows: p=${p}, g=${g}, A=${A}, B=${B}\nTo find the shared secret, they would need to solve the Discrete Logarithm Problem:\nFind a such that ${g}^a mod ${p} = ${A}\nFor small primes this is trivial, but for 2048+ bit primes it is computationally infeasible.`,
    blocks: [
      makeBlock('sec-public', 'Public Information', `p=${p}, g=${g}, A=${A}, B=${B}`, 1, 0, '#94a3b8', 'data', { width: 8 }),
      makeBlock('sec-dlp', 'Discrete Log Problem', `Find a: ${g}^a mod ${p} = ${A}`, 1, 1.5, '#ef4444', 'operation', { width: 8 }),
      makeBlock('sec-secret', 'Shared Secret', `s = ${sAlice} (hidden)`, 3, 3, '#22c55e', 'output', { width: 4 }),
    ],
    connections: [
      conn('sec-public', 'sec-dlp', { animated: true, color: '#ef4444', label: 'hard problem' }),
      conn('sec-dlp', 'sec-secret', { dashed: true, color: '#22c55e', label: 'computationally infeasible' }),
    ],
    operations: [],
    highlights: ['sec-dlp', 'sec-secret'],
  });

  return steps;
}

const dhEngine: AlgorithmEngine = {
  meta,
  inputConfig,
  generateSteps,
};

export default dhEngine;
