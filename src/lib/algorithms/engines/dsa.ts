import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function modPow(base: number, exp: number, mod: number): number {
  let result = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2 === 1) result = (result * base) % mod;
    exp = Math.floor(exp / 2);
    base = (base * base) % mod;
  }
  return result;
}

function modInverse(a: number, m: number): number {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

function simpleHash(msg: string, q: number): number {
  let h = 0;
  for (let i = 0; i < msg.length; i++) {
    h = (h * 31 + msg.charCodeAt(i)) % q;
  }
  return h === 0 ? 1 : h;
}

const dsaEngine: AlgorithmEngine = {
  meta: {
    id: 'dsa',
    name: 'DSA',
    category: 'asymmetric',
    description: 'The Digital Signature Algorithm (DSA) is a Federal Information Processing Standard for digital signatures, based on the mathematical concept of modular exponentiation and the discrete logarithm problem.',
    keySize: '1024-3072',
    yearIntroduced: 1991,
    authors: 'NIST / David Kravitz',
    status: 'legacy',
    standardBody: 'FIPS 186',
    color: '#f43f5e',
    icon: '✍️',
  },
  inputConfig: {
    type: 'asymmetric',
    fields: [
      { name: 'message', label: 'Message', type: 'text', placeholder: 'Message to sign...', required: true, defaultValue: 'Sign me' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const message = input.message || 'Sign me';
    const steps: VisualizationStep[] = [];

    // Small demo primes
    const p = 23;
    const q = 11;
    const g = 4; // g = h^((p-1)/q) mod p where h=2: 2^2 mod 23 = 4

    // Private key x, public key y
    const x = 7; // private key (1 < x < q)
    const y = modPow(g, x, p); // y = g^x mod p = 4^7 mod 23

    steps.push({
      id: 'dsa-params', phase: 'Parameters', label: 'Domain Parameters',
      description: 'DSA requires domain parameters: a prime p, a prime q that divides (p-1), and a generator g of the subgroup of order q in Z*_p.',
      blocks: [
        blk('p', 'Prime p', String(p), 1, 0, '#f43f5e', 'constant'),
        blk('q', 'Prime q (divides p-1)', String(q), 4, 0, '#f43f5e', 'constant'),
        blk('g', 'Generator g', String(g), 7, 0, '#f43f5e', 'constant'),
        blk('verify-pq', 'Verify: (p-1) mod q', `${p - 1} mod ${q} = ${(p - 1) % q}`, 2.5, 1.5, '#a78bfa', 'intermediate'),
      ],
      connections: [
        { from: 'p', to: 'verify-pq', animated: true, color: '#f43f5e' },
        { from: 'q', to: 'verify-pq', animated: true, color: '#f43f5e' },
      ],
      operations: [],
      highlights: ['p', 'q', 'g'],
    });

    steps.push({
      id: 'dsa-keygen', phase: 'Key Generation', label: 'Key Pair Generation',
      description: `Choose private key x = ${x} (random, 1 < x < q). Compute public key y = g^x mod p = ${g}^${x} mod ${p} = ${y}.`,
      blocks: [
        blk('x', 'Private Key x', String(x), 1, 0, '#fbbf24', 'key'),
        blk('g2', 'Generator g', String(g), 4, 0, '#f43f5e', 'constant'),
        blk('modexp', 'g^x mod p', `${g}^${x} mod ${p}`, 4, 1.5, '#a78bfa', 'operation'),
        blk('y', 'Public Key y', String(y), 4, 3, '#34d399', 'key'),
      ],
      connections: [
        { from: 'x', to: 'modexp', animated: true, color: '#fbbf24' },
        { from: 'g2', to: 'modexp', animated: true, color: '#f43f5e' },
        { from: 'modexp', to: 'y', animated: true, color: '#34d399' },
      ],
      operations: [
        { id: 'op-modexp', type: 'modexp', label: 'Modular Exponentiation', x: 4, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['x', 'y'],
    });

    // Signing
    const hash = simpleHash(message, q);
    const k = 3; // random per-message secret (1 < k < q)
    const r = modPow(g, k, p) % q; // r = (g^k mod p) mod q
    const kInv = modInverse(k, q);
    const s = (kInv * ((hash + x * r) % q)) % q;

    steps.push({
      id: 'dsa-hash', phase: 'Signing', label: 'Hash Message',
      description: `Compute hash of message "${message}". H(m) = ${hash} (simplified hash mod q).`,
      blocks: [
        blk('msg', 'Message', `"${message}"`, 2, 0, '#38bdf8', 'data'),
        blk('hashop', 'Hash Function', 'H(m) mod q', 5, 0, '#a78bfa', 'operation'),
        blk('hashval', 'Hash Value', String(hash), 3.5, 1.5, '#34d399', 'intermediate'),
      ],
      connections: [
        { from: 'msg', to: 'hashop', animated: true, color: '#38bdf8' },
        { from: 'hashop', to: 'hashval', animated: true, color: '#a78bfa' },
      ],
      operations: [
        { id: 'op-hash', type: 'hash', label: 'Hash', x: 5, y: 0, z: 0, color: '#a78bfa' },
      ],
      highlights: ['hashval'],
    });

    steps.push({
      id: 'dsa-sign-r', phase: 'Signing', label: 'Compute r',
      description: `Choose random k = ${k}. Compute r = (g^k mod p) mod q = (${g}^${k} mod ${p}) mod ${q} = ${modPow(g, k, p)} mod ${q} = ${r}.`,
      blocks: [
        blk('k', 'Random k', String(k), 1, 0, '#fbbf24', 'key'),
        blk('gk', 'g^k mod p', `${g}^${k} mod ${p} = ${modPow(g, k, p)}`, 4, 0, '#a78bfa', 'operation'),
        blk('rval', 'r = result mod q', `${modPow(g, k, p)} mod ${q} = ${r}`, 4, 1.5, '#34d399', 'intermediate'),
      ],
      connections: [
        { from: 'k', to: 'gk', animated: true, color: '#fbbf24' },
        { from: 'gk', to: 'rval', animated: true, color: '#a78bfa' },
      ],
      operations: [
        { id: 'op-gk', type: 'modexp', label: 'g^k mod p', x: 4, y: 0, z: 0, color: '#a78bfa' },
      ],
      highlights: ['rval'],
    });

    steps.push({
      id: 'dsa-sign-s', phase: 'Signing', label: 'Compute s',
      description: `Compute s = k^{-1} * (hash + x*r) mod q = ${kInv} * (${hash} + ${x}*${r}) mod ${q} = ${s}.`,
      blocks: [
        blk('kinv', 'k^{-1} mod q', `${kInv}`, 1, 0, '#fbbf24', 'intermediate'),
        blk('xr', 'x * r', `${x} * ${r} = ${x * r}`, 4, 0, '#a78bfa', 'intermediate'),
        blk('hxr', 'hash + x*r', `${hash} + ${x * r} = ${hash + x * r}`, 4, 1.2, '#a78bfa', 'intermediate'),
        blk('sval', 'Signature s', String(s), 4, 2.5, '#f43f5e', 'output'),
      ],
      connections: [
        { from: 'kinv', to: 'sval', animated: true, color: '#fbbf24' },
        { from: 'xr', to: 'hxr', animated: true, color: '#a78bfa' },
        { from: 'hxr', to: 'sval', animated: true, color: '#a78bfa' },
      ],
      operations: [
        { id: 'op-mul', type: 'multiply', label: 'Multiply mod q', x: 4, y: 2.5, z: 0, color: '#f43f5e' },
      ],
      highlights: ['sval'],
    });

    steps.push({
      id: 'dsa-sig', phase: 'Signature', label: 'Signature (r, s)',
      description: `The DSA signature is the pair (r, s) = (${r}, ${s}). Both r and s must be non-zero for a valid signature.`,
      blocks: [
        blk('sig-r', 'r', String(r), 2.5, 0, '#f43f5e', 'output'),
        blk('sig-s', 's', String(s), 5.5, 0, '#f43f5e', 'output'),
        blk('sig', 'Signature (r, s)', `(${r}, ${s})`, 4, 1.5, '#34d399', 'output'),
      ],
      connections: [
        { from: 'sig-r', to: 'sig', animated: true, color: '#f43f5e' },
        { from: 'sig-s', to: 'sig', animated: true, color: '#f43f5e' },
      ],
      operations: [],
      highlights: ['sig'],
    });

    // Verification
    const w = modInverse(s, q);
    const u1 = (hash * w) % q;
    const u2 = (r * w) % q;
    const v = (modPow(g, u1, p) * modPow(y, u2, p)) % p % q;

    steps.push({
      id: 'dsa-verify-w', phase: 'Verification', label: 'Compute w, u1, u2',
      description: `Verifier computes w = s^{-1} mod q = ${w}, u1 = hash*w mod q = ${u1}, u2 = r*w mod q = ${u2}.`,
      blocks: [
        blk('w', 'w = s^{-1} mod q', String(w), 1, 0, '#06b6d4', 'intermediate'),
        blk('u1', 'u1 = hash*w mod q', `${hash}*${w} mod ${q} = ${u1}`, 4, 0, '#06b6d4', 'intermediate'),
        blk('u2', 'u2 = r*w mod q', `${r}*${w} mod ${q} = ${u2}`, 7, 0, '#06b6d4', 'intermediate'),
      ],
      connections: [
        { from: 'w', to: 'u1', animated: true, color: '#06b6d4' },
        { from: 'w', to: 'u2', animated: true, color: '#06b6d4' },
      ],
      operations: [
        { id: 'op-inv', type: 'modexp', label: 'Modular Inverse', x: 1, y: 0, z: 0, color: '#06b6d4' },
      ],
      highlights: ['u1', 'u2'],
    });

    steps.push({
      id: 'dsa-verify-v', phase: 'Verification', label: 'Compute v and Verify',
      description: `v = (g^u1 * y^u2 mod p) mod q = (${modPow(g, u1, p)} * ${modPow(y, u2, p)} mod ${p}) mod ${q} = ${v}. Check v == r: ${v} == ${r} => ${v === r ? 'VALID' : 'INVALID'}`,
      blocks: [
        blk('gu1', 'g^u1 mod p', `${g}^${u1} mod ${p} = ${modPow(g, u1, p)}`, 1, 0, '#a78bfa', 'intermediate'),
        blk('yu2', 'y^u2 mod p', `${y}^${u2} mod ${p} = ${modPow(y, u2, p)}`, 5, 0, '#a78bfa', 'intermediate'),
        blk('vval', 'v', String(v), 3, 1.5, '#34d399', 'intermediate'),
        blk('check', 'v == r ?', `${v} == ${r} => ${v === r ? 'VALID ✓' : 'INVALID ✗'}`, 3, 3, v === r ? '#22c55e' : '#ef4444', 'output'),
      ],
      connections: [
        { from: 'gu1', to: 'vval', animated: true, color: '#a78bfa' },
        { from: 'yu2', to: 'vval', animated: true, color: '#a78bfa' },
        { from: 'vval', to: 'check', animated: true, color: '#34d399' },
      ],
      operations: [
        { id: 'op-verify', type: 'modexp', label: 'Verify Signature', x: 3, y: 3, z: 0, color: '#22c55e' },
      ],
      highlights: ['check'],
    });

    return steps;
  },
};

export default dsaEngine;
