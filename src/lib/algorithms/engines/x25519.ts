import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate deterministic pseudo-random bytes from a seed string
function pseudoRandomBytes(seed: string, len: number): number[] {
  const bytes: number[] = [];
  let h = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  for (let i = 0; i < len; i++) {
    h = Math.imul(h ^ (i + 1), 0x5bd1e995);
    h ^= h >>> 13;
    bytes.push((h >>> 0) & 0xff);
  }
  return bytes;
}

// Clamp a 32-byte scalar for X25519
function clampScalar(scalar: number[]): number[] {
  const clamped = [...scalar];
  clamped[0] &= 248;
  clamped[31] &= 127;
  clamped[31] |= 64;
  return clamped;
}

const x25519Engine: AlgorithmEngine = {
  meta: {
    id: 'x25519',
    name: 'X25519',
    category: 'key-exchange',
    description: 'X25519 is an elliptic curve Diffie-Hellman key exchange using Curve25519. It provides 128-bit security with 32-byte keys, using the Montgomery ladder for constant-time scalar multiplication.',
    keySize: 256,
    yearIntroduced: 2006,
    authors: 'Daniel J. Bernstein',
    status: 'standard',
    standardBody: 'RFC 7748',
    color: '#06b6d4',
    icon: '🔗',
  },
  inputConfig: {
    type: 'asymmetric',
    fields: [],
  },
  generateSteps(): VisualizationStep[] {
    const steps: VisualizationStep[] = [];

    steps.push({
      id: 'x-curve', phase: 'Parameters', label: 'Curve25519 Parameters',
      description: 'X25519 operates on the Montgomery curve y² = x³ + 486662x² + x over the prime field GF(2²⁵⁵ - 19). Only the x-coordinate is used, enabling efficient computation.',
      blocks: [
        blk('curve', 'Curve Equation', 'y² = x³ + 486662x² + x', 2, 0, '#06b6d4', 'constant'),
        blk('prime', 'Prime p', '2²⁵⁵ - 19', 6, 0, '#06b6d4', 'constant'),
        blk('base', 'Base Point (u)', 'u = 9', 2, 1.5, '#fbbf24', 'constant'),
        blk('a24', 'Constant a24', '(486662 - 2) / 4 = 121665', 6, 1.5, '#818cf8', 'constant'),
      ],
      connections: [],
      operations: [],
      highlights: ['curve', 'prime', 'base'],
    });

    // Alice's key generation
    const alicePrivRaw = pseudoRandomBytes('alice-secret', 32);
    const alicePriv = clampScalar(alicePrivRaw);
    // Simulated public key (would be scalar_mult(alicePriv, 9) on real curve)
    const alicePub = pseudoRandomBytes('alice-pub-deterministic', 32);

    steps.push({
      id: 'x-alice-keygen', phase: 'Alice Key Generation', label: 'Alice Generates Key Pair',
      description: 'Alice generates a random 32-byte private key and clamps it (clear bits 0,1,2 of first byte; clear bit 255 and set bit 254 of last byte). Her public key is computed as A = scalar_mult(a, 9) on the curve.',
      blocks: [
        blk('a-priv-raw', 'Alice Private (raw)', bytesToHex(alicePrivRaw.slice(0, 8)) + '...', 1, 0, '#fbbf24', 'key'),
        blk('a-clamp', 'Clamp Scalar', 'bits[0,1,2]=0, bit[255]=0, bit[254]=1', 4.5, 0, '#a78bfa', 'operation'),
        blk('a-priv', 'Alice Private (clamped)', bytesToHex(alicePriv.slice(0, 8)) + '...', 1, 1.5, '#fbbf24', 'key'),
        blk('a-scalar', 'scalar_mult(a, 9)', 'Montgomery ladder', 4.5, 1.5, '#a78bfa', 'operation'),
        blk('a-pub', 'Alice Public Key A', bytesToHex(alicePub.slice(0, 12)) + '...', 3, 3, '#34d399', 'key'),
      ],
      connections: [
        { from: 'a-priv-raw', to: 'a-clamp', animated: true, color: '#fbbf24' },
        { from: 'a-clamp', to: 'a-priv', animated: true, color: '#fbbf24' },
        { from: 'a-priv', to: 'a-scalar', animated: true, color: '#fbbf24' },
        { from: 'a-scalar', to: 'a-pub', animated: true, color: '#34d399' },
      ],
      operations: [
        { id: 'op-a-clamp', type: 'shift', label: 'Clamp', x: 4.5, y: 0, z: 0, color: '#a78bfa' },
        { id: 'op-a-mul', type: 'multiply', label: 'Scalar Multiply', x: 4.5, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['a-pub'],
    });

    // Bob's key generation
    const bobPrivRaw = pseudoRandomBytes('bob-secret', 32);
    const bobPriv = clampScalar(bobPrivRaw);
    const bobPub = pseudoRandomBytes('bob-pub-deterministic', 32);

    steps.push({
      id: 'x-bob-keygen', phase: 'Bob Key Generation', label: 'Bob Generates Key Pair',
      description: 'Bob independently generates his own 32-byte private key, clamps it, and computes B = scalar_mult(b, 9). He sends his public key B to Alice.',
      blocks: [
        blk('b-priv-raw', 'Bob Private (raw)', bytesToHex(bobPrivRaw.slice(0, 8)) + '...', 1, 0, '#fbbf24', 'key'),
        blk('b-clamp', 'Clamp Scalar', 'bits[0,1,2]=0, bit[255]=0, bit[254]=1', 4.5, 0, '#a78bfa', 'operation'),
        blk('b-priv', 'Bob Private (clamped)', bytesToHex(bobPriv.slice(0, 8)) + '...', 1, 1.5, '#fbbf24', 'key'),
        blk('b-scalar', 'scalar_mult(b, 9)', 'Montgomery ladder', 4.5, 1.5, '#a78bfa', 'operation'),
        blk('b-pub', 'Bob Public Key B', bytesToHex(bobPub.slice(0, 12)) + '...', 3, 3, '#34d399', 'key'),
      ],
      connections: [
        { from: 'b-priv-raw', to: 'b-clamp', animated: true, color: '#fbbf24' },
        { from: 'b-clamp', to: 'b-priv', animated: true, color: '#fbbf24' },
        { from: 'b-priv', to: 'b-scalar', animated: true, color: '#fbbf24' },
        { from: 'b-scalar', to: 'b-pub', animated: true, color: '#34d399' },
      ],
      operations: [
        { id: 'op-b-clamp', type: 'shift', label: 'Clamp', x: 4.5, y: 0, z: 0, color: '#a78bfa' },
        { id: 'op-b-mul', type: 'multiply', label: 'Scalar Multiply', x: 4.5, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['b-pub'],
    });

    steps.push({
      id: 'x-montgomery', phase: 'Montgomery Ladder', label: 'Montgomery Ladder Concept',
      description: 'The Montgomery ladder performs scalar multiplication in constant time by processing each bit of the scalar identically: a conditional swap followed by a differential addition and doubling step. This prevents timing side-channel attacks.',
      blocks: [
        blk('ml-init', 'Initialize', 'R0 = base_point, R1 = double(base)', 1, 0, '#06b6d4', 'intermediate'),
        blk('ml-bit', 'For each bit of scalar', 'Process high to low', 4.5, 0, '#818cf8', 'operation'),
        blk('ml-swap', 'Conditional Swap', 'if bit=1: swap(R0, R1)', 1, 1.5, '#f472b6', 'operation'),
        blk('ml-dadd', 'Differential Add', 'R1 = R0 + R1', 4.5, 1.5, '#a78bfa', 'operation'),
        blk('ml-dbl', 'Double', 'R0 = 2*R0', 7, 1.5, '#a78bfa', 'operation'),
        blk('ml-result', 'Result = R0', 'x-coordinate only', 3.5, 3, '#34d399', 'output'),
      ],
      connections: [
        { from: 'ml-init', to: 'ml-swap', animated: true, color: '#06b6d4' },
        { from: 'ml-bit', to: 'ml-swap', animated: true, color: '#818cf8', dashed: true },
        { from: 'ml-swap', to: 'ml-dadd', animated: true, color: '#f472b6' },
        { from: 'ml-swap', to: 'ml-dbl', animated: true, color: '#f472b6' },
        { from: 'ml-dadd', to: 'ml-result', animated: true, color: '#a78bfa' },
        { from: 'ml-dbl', to: 'ml-result', animated: true, color: '#a78bfa' },
      ],
      operations: [
        { id: 'op-cswap', type: 'permutation', label: 'Conditional Swap', x: 1, y: 1.5, z: 0, color: '#f472b6' },
        { id: 'op-dadd', type: 'add', label: 'Diff. Addition', x: 4.5, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['ml-swap', 'ml-dadd', 'ml-dbl'],
    });

    // Shared secret computation
    const sharedSecret = pseudoRandomBytes('shared-secret-deterministic', 32);

    steps.push({
      id: 'x-alice-shared', phase: 'Shared Secret', label: 'Alice Computes Shared Secret',
      description: 'Alice computes the shared secret as scalar_mult(a, B) = scalar_mult(a, scalar_mult(b, 9)). By the commutativity of scalar multiplication, this equals scalar_mult(a*b, 9).',
      blocks: [
        blk('a-priv2', 'Alice Private a', bytesToHex(alicePriv.slice(0, 6)) + '...', 1, 0, '#fbbf24', 'key'),
        blk('b-pub2', 'Bob Public B', bytesToHex(bobPub.slice(0, 6)) + '...', 5, 0, '#34d399', 'key'),
        blk('a-compute', 'scalar_mult(a, B)', 'Montgomery ladder', 3, 1.5, '#a78bfa', 'operation'),
        blk('shared-a', 'Shared Secret (Alice)', bytesToHex(sharedSecret.slice(0, 12)) + '...', 3, 3, '#06b6d4', 'output'),
      ],
      connections: [
        { from: 'a-priv2', to: 'a-compute', animated: true, color: '#fbbf24' },
        { from: 'b-pub2', to: 'a-compute', animated: true, color: '#34d399' },
        { from: 'a-compute', to: 'shared-a', animated: true, color: '#06b6d4' },
      ],
      operations: [
        { id: 'op-a-shared', type: 'multiply', label: 'Scalar Multiply', x: 3, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['shared-a'],
    });

    steps.push({
      id: 'x-bob-shared', phase: 'Shared Secret', label: 'Bob Computes Shared Secret',
      description: 'Bob computes the same shared secret as scalar_mult(b, A) = scalar_mult(b, scalar_mult(a, 9)) = scalar_mult(a*b, 9). Both parties arrive at the same 32-byte shared secret without revealing their private keys.',
      blocks: [
        blk('b-priv2', 'Bob Private b', bytesToHex(bobPriv.slice(0, 6)) + '...', 1, 0, '#fbbf24', 'key'),
        blk('a-pub2', 'Alice Public A', bytesToHex(alicePub.slice(0, 6)) + '...', 5, 0, '#34d399', 'key'),
        blk('b-compute', 'scalar_mult(b, A)', 'Montgomery ladder', 3, 1.5, '#a78bfa', 'operation'),
        blk('shared-b', 'Shared Secret (Bob)', bytesToHex(sharedSecret.slice(0, 12)) + '...', 3, 3, '#06b6d4', 'output'),
      ],
      connections: [
        { from: 'b-priv2', to: 'b-compute', animated: true, color: '#fbbf24' },
        { from: 'a-pub2', to: 'b-compute', animated: true, color: '#34d399' },
        { from: 'b-compute', to: 'shared-b', animated: true, color: '#06b6d4' },
      ],
      operations: [
        { id: 'op-b-shared', type: 'multiply', label: 'Scalar Multiply', x: 3, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['shared-b'],
    });

    steps.push({
      id: 'x-result', phase: 'Result', label: 'Key Exchange Complete',
      description: 'Both Alice and Bob now share the same 32-byte secret, which can be used to derive encryption keys (e.g., via HKDF). An eavesdropper who sees only the public keys A and B cannot compute the shared secret due to the hardness of the elliptic curve discrete logarithm problem.',
      blocks: [
        blk('alice-label', 'Alice', 'scalar_mult(a, B)', 1, 0, '#f472b6', 'intermediate'),
        blk('eq', '=', 'Same result!', 4, 0, '#22c55e', 'operation'),
        blk('bob-label', 'Bob', 'scalar_mult(b, A)', 7, 0, '#38bdf8', 'intermediate'),
        blk('final-secret', 'Shared Secret (32 bytes)', bytesToHex(sharedSecret), 4, 1.8, '#06b6d4', 'output'),
      ],
      connections: [
        { from: 'alice-label', to: 'eq', animated: true, color: '#f472b6' },
        { from: 'bob-label', to: 'eq', animated: true, color: '#38bdf8' },
        { from: 'eq', to: 'final-secret', animated: true, color: '#22c55e' },
      ],
      operations: [],
      highlights: ['final-secret'],
    });

    return steps;
  },
};

export default x25519Engine;
