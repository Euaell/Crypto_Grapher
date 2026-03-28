import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.8, height: 0.6, color, type };
}

// Simple elliptic curve over small field for demo: y² = x³ + ax + b (mod p)
function modInverse(a: number, m: number): number {
  let [old_r, r] = [a % m, m];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

function pointAdd(P: [number, number] | null, Q: [number, number] | null, a: number, p: number): [number, number] | null {
  if (!P) return Q;
  if (!Q) return P;
  const [x1, y1] = P;
  const [x2, y2] = Q;
  let m: number;
  if (x1 === x2 && y1 === y2) {
    if (y1 === 0) return null;
    m = ((3 * x1 * x1 + a) * modInverse(2 * y1, p)) % p;
  } else {
    if (x1 === x2) return null;
    m = (((y2 - y1) % p + p) * modInverse(((x2 - x1) % p + p) % p, p)) % p;
  }
  m = ((m % p) + p) % p;
  const x3 = ((m * m - x1 - x2) % p + p) % p;
  const y3 = ((m * (x1 - x3) - y1) % p + p) % p;
  return [x3, y3];
}

function scalarMult(k: number, P: [number, number], a: number, p: number): { result: [number, number] | null; steps: { bit: number; doubled: [number, number] | null; added: [number, number] | null }[] } {
  let result: [number, number] | null = null;
  let current: [number, number] | null = P;
  const steps: { bit: number; doubled: [number, number] | null; added: [number, number] | null }[] = [];
  const bits = k.toString(2);
  for (let i = 0; i < bits.length; i++) {
    if (i > 0) current = pointAdd(current, current, a, p);
    const bit = parseInt(bits[i]);
    if (bit === 1) result = pointAdd(result, current, a, p);
    steps.push({ bit, doubled: current, added: result });
  }
  return { result, steps };
}

const eccEngine: AlgorithmEngine = {
  meta: {
    id: 'ecc',
    name: 'ECC (Elliptic Curve)',
    category: 'asymmetric',
    description: 'Elliptic Curve Cryptography uses the algebraic structure of elliptic curves over finite fields. Provides equivalent security to RSA with much smaller key sizes (256-bit ECC ≈ 3072-bit RSA).',
    keySize: '256-521',
    yearIntroduced: 1985,
    authors: 'Miller, Koblitz',
    status: 'standard',
    standardBody: 'NIST / SEC',
    color: '#a855f7',
    icon: '📐',
  },
  inputConfig: {
    type: 'asymmetric',
    fields: [
      { name: 'message', label: 'Message (number)', type: 'text', placeholder: 'Enter a small number...', required: true, defaultValue: '7' },
      { name: 'curve', label: 'Demo Curve', type: 'select', required: true, options: [
        { label: 'y²=x³+2x+3 (mod 97)', value: 'small' },
        { label: 'y²=x³+7 (mod 223) [secp-like]', value: 'medium' },
      ], defaultValue: 'small' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const msgNum = parseInt(input.message || '7') || 7;
    const isSmall = (input.curve || 'small') === 'small';
    const p = isSmall ? 97 : 223;
    const a = isSmall ? 2 : 0;
    const b = isSmall ? 3 : 7;
    const G: [number, number] = isSmall ? [3, 6] : [47, 71];

    // Find order of G (for small curves)
    let order = 1;
    let pt: [number, number] | null = G;
    while (pt !== null && order < p * 2) {
      pt = pointAdd(pt, G, a, p);
      order++;
      if (pt && pt[0] === G[0] && pt[1] === G[1]) break;
    }
    if (order > p) order = isSmall ? 5 : 7; // Fallback

    const privKeyAlice = 3; // Small for demo
    const privKeyBob = 5;

    const steps: VisualizationStep[] = [];

    steps.push({
      id: 'ecc-curve', phase: 'Curve Definition', label: 'Elliptic Curve Parameters',
      description: `Curve: y² = x³ + ${a}x + ${b} (mod ${p})\nBase point G = (${G[0]}, ${G[1]})\nAll arithmetic is performed modulo p=${p}.`,
      blocks: [
        blk('curve-eq', 'Curve Equation', `y² = x³ + ${a}x + ${b}`, 2, 0, '#a855f7', 'constant'),
        blk('field', 'Finite Field', `𝔽_${p} (mod ${p})`, 7, 0, '#c084fc', 'constant'),
        blk('gen', 'Generator G', `(${G[0]}, ${G[1]})`, 4.5, 1.5, '#8b5cf6', 'constant'),
      ],
      connections: [], operations: [], highlights: ['curve-eq', 'gen'],
    });

    // Point addition demo
    const G2 = pointAdd(G, G, a, p);
    steps.push({
      id: 'ecc-point-add', phase: 'Point Operations', label: 'Point Addition: G + G = 2G',
      description: `Point doubling: compute the tangent line at G, find intersection with curve, reflect over x-axis.\n2G = (${G2?.[0]}, ${G2?.[1]})`,
      blocks: [
        blk('pa-g', 'G', `(${G[0]}, ${G[1]})`, 1, 0, '#8b5cf6', 'data'),
        blk('pa-g2', 'G', `(${G[0]}, ${G[1]})`, 5, 0, '#8b5cf6', 'data'),
        blk('pa-op', 'Point Add', 'tangent + reflect', 3, 1.5, '#a855f7', 'operation'),
        blk('pa-res', '2G', `(${G2?.[0]}, ${G2?.[1]})`, 3, 3, '#7c3aed', 'intermediate'),
      ],
      connections: [
        { from: 'pa-g', to: 'pa-op', animated: true, color: '#8b5cf6' },
        { from: 'pa-g2', to: 'pa-op', animated: true, color: '#8b5cf6' },
        { from: 'pa-op', to: 'pa-res', animated: true, color: '#7c3aed' },
      ],
      operations: [{ id: 'op-padd', type: 'add', label: 'EC Point Addition', x: 3, y: 1.5, z: 0, color: '#a855f7' }],
      highlights: ['pa-res'],
    });

    // Alice key gen
    const alicePub = scalarMult(privKeyAlice, G, a, p);
    steps.push({
      id: 'ecc-alice-keygen', phase: 'Key Generation', label: 'Alice: Generate Key Pair',
      description: `Alice chooses private key d_A = ${privKeyAlice}\nPublic key Q_A = d_A × G = ${privKeyAlice} × (${G[0]}, ${G[1]}) = (${alicePub.result?.[0]}, ${alicePub.result?.[1]})`,
      blocks: [
        blk('a-priv', 'Alice Private Key (d_A)', `${privKeyAlice}`, 1, 0, '#ef4444', 'key'),
        blk('a-gen', 'Generator G', `(${G[0]}, ${G[1]})`, 6, 0, '#8b5cf6', 'constant'),
        blk('a-mult', 'Scalar Multiply', `d_A × G`, 3.5, 1.5, '#a855f7', 'operation'),
        blk('a-pub', 'Alice Public Key (Q_A)', `(${alicePub.result?.[0]}, ${alicePub.result?.[1]})`, 3.5, 3, '#22c55e', 'key'),
      ],
      connections: [
        { from: 'a-priv', to: 'a-mult', animated: true, color: '#ef4444' },
        { from: 'a-gen', to: 'a-mult', animated: true, color: '#8b5cf6' },
        { from: 'a-mult', to: 'a-pub', animated: true, color: '#22c55e' },
      ],
      operations: [{ id: 'op-amult', type: 'multiply', label: `${privKeyAlice} × G`, x: 3.5, y: 1.5, z: 0, color: '#a855f7' }],
      highlights: ['a-pub'],
    });

    // Bob key gen
    const bobPub = scalarMult(privKeyBob, G, a, p);
    steps.push({
      id: 'ecc-bob-keygen', phase: 'Key Generation', label: 'Bob: Generate Key Pair',
      description: `Bob chooses private key d_B = ${privKeyBob}\nPublic key Q_B = d_B × G = ${privKeyBob} × (${G[0]}, ${G[1]}) = (${bobPub.result?.[0]}, ${bobPub.result?.[1]})`,
      blocks: [
        blk('b-priv', 'Bob Private Key (d_B)', `${privKeyBob}`, 1, 0, '#3b82f6', 'key'),
        blk('b-gen', 'Generator G', `(${G[0]}, ${G[1]})`, 6, 0, '#8b5cf6', 'constant'),
        blk('b-mult', 'Scalar Multiply', `d_B × G`, 3.5, 1.5, '#a855f7', 'operation'),
        blk('b-pub', 'Bob Public Key (Q_B)', `(${bobPub.result?.[0]}, ${bobPub.result?.[1]})`, 3.5, 3, '#22c55e', 'key'),
      ],
      connections: [
        { from: 'b-priv', to: 'b-mult', animated: true, color: '#3b82f6' },
        { from: 'b-gen', to: 'b-mult', animated: true, color: '#8b5cf6' },
        { from: 'b-mult', to: 'b-pub', animated: true, color: '#22c55e' },
      ],
      operations: [{ id: 'op-bmult', type: 'multiply', label: `${privKeyBob} × G`, x: 3.5, y: 1.5, z: 0, color: '#a855f7' }],
      highlights: ['b-pub'],
    });

    // ECDH shared secret
    const sharedAlice = scalarMult(privKeyAlice, bobPub.result!, a, p);
    const sharedBob = scalarMult(privKeyBob, alicePub.result!, a, p);
    steps.push({
      id: 'ecc-ecdh', phase: 'Key Exchange (ECDH)', label: 'Shared Secret Computation',
      description: `Alice computes: d_A × Q_B = ${privKeyAlice} × (${bobPub.result?.[0]}, ${bobPub.result?.[1]}) = (${sharedAlice.result?.[0]}, ${sharedAlice.result?.[1]})\nBob computes: d_B × Q_A = ${privKeyBob} × (${alicePub.result?.[0]}, ${alicePub.result?.[1]}) = (${sharedBob.result?.[0]}, ${sharedBob.result?.[1]})\nBoth arrive at the same point! This is the ECDH shared secret.`,
      blocks: [
        blk('ecdh-alice', 'Alice computes', `d_A × Q_B`, 1, 0, '#ef4444', 'operation'),
        blk('ecdh-bob', 'Bob computes', `d_B × Q_A`, 7, 0, '#3b82f6', 'operation'),
        blk('ecdh-shared', 'Shared Secret', `(${sharedAlice.result?.[0]}, ${sharedAlice.result?.[1]})`, 4, 2, '#22c55e', 'output'),
      ],
      connections: [
        { from: 'ecdh-alice', to: 'ecdh-shared', animated: true, color: '#ef4444' },
        { from: 'ecdh-bob', to: 'ecdh-shared', animated: true, color: '#3b82f6' },
      ],
      operations: [], highlights: ['ecdh-shared'],
    });

    // ElGamal encryption on ECC
    const k = 2; // ephemeral key
    const C1 = scalarMult(k, G, a, p);
    // Encode message as point (simplified: use (msgNum, _) on curve or nearest)
    let msgPoint: [number, number] = [msgNum % p, 0];
    // Find y for this x on the curve
    const rhs = ((msgPoint[0] ** 3 + a * msgPoint[0] + b) % p + p) % p;
    for (let y = 0; y < p; y++) {
      if ((y * y) % p === rhs) { msgPoint = [msgPoint[0], y]; break; }
    }
    const kQa = scalarMult(k, alicePub.result!, a, p);
    const C2 = pointAdd(msgPoint, kQa.result, a, p);

    steps.push({
      id: 'ecc-encrypt', phase: 'Encryption', label: 'ElGamal EC Encryption',
      description: `Encrypt message point M=(${msgPoint[0]}, ${msgPoint[1]}) for Alice:\nChoose random k=${k}\nC1 = k×G = (${C1.result?.[0]}, ${C1.result?.[1]})\nC2 = M + k×Q_A = (${C2?.[0]}, ${C2?.[1]})`,
      blocks: [
        blk('enc-m', 'Message Point M', `(${msgPoint[0]}, ${msgPoint[1]})`, 1, 0, '#fbbf24', 'data'),
        blk('enc-k', 'Random k', `${k}`, 6, 0, '#ef4444', 'key'),
        blk('enc-c1', 'C1 = k×G', `(${C1.result?.[0]}, ${C1.result?.[1]})`, 2, 2.5, '#a855f7', 'output'),
        blk('enc-c2', 'C2 = M + k×Q_A', `(${C2?.[0]}, ${C2?.[1]})`, 6, 2.5, '#a855f7', 'output'),
      ],
      connections: [
        { from: 'enc-k', to: 'enc-c1', animated: true, color: '#ef4444' },
        { from: 'enc-m', to: 'enc-c2', animated: true, color: '#fbbf24' },
      ],
      operations: [
        { id: 'op-enc1', type: 'multiply', label: 'k × G', x: 2, y: 1.2, z: 0, color: '#a855f7' },
        { id: 'op-enc2', type: 'add', label: 'M + k×Q_A', x: 6, y: 1.2, z: 0, color: '#a855f7' },
      ],
      highlights: ['enc-c1', 'enc-c2'],
    });

    // Decryption
    const dC1 = scalarMult(privKeyAlice, C1.result!, a, p);
    const negDC1: [number, number] | null = dC1.result ? [dC1.result[0], (p - dC1.result[1]) % p] : null;
    const decrypted = pointAdd(C2, negDC1, a, p);

    steps.push({
      id: 'ecc-decrypt', phase: 'Decryption', label: 'ElGamal EC Decryption',
      description: `Alice decrypts using private key d_A=${privKeyAlice}:\nCompute d_A × C1 = (${dC1.result?.[0]}, ${dC1.result?.[1]})\nM = C2 - d_A×C1 = (${decrypted?.[0]}, ${decrypted?.[1]})`,
      blocks: [
        blk('dec-c1', 'C1', `(${C1.result?.[0]}, ${C1.result?.[1]})`, 1, 0, '#a855f7', 'intermediate'),
        blk('dec-priv', 'd_A', `${privKeyAlice}`, 4.5, 0, '#ef4444', 'key'),
        blk('dec-dc1', 'd_A × C1', `(${dC1.result?.[0]}, ${dC1.result?.[1]})`, 2.5, 1.5, '#c084fc', 'intermediate'),
        blk('dec-c2', 'C2', `(${C2?.[0]}, ${C2?.[1]})`, 6.5, 0, '#a855f7', 'intermediate'),
        blk('dec-msg', 'Decrypted M', `(${decrypted?.[0]}, ${decrypted?.[1]})`, 4, 3, '#22c55e', 'output'),
      ],
      connections: [
        { from: 'dec-c1', to: 'dec-dc1', animated: true, color: '#a855f7' },
        { from: 'dec-priv', to: 'dec-dc1', animated: true, color: '#ef4444' },
        { from: 'dec-dc1', to: 'dec-msg', animated: true, label: 'C2 - d_A×C1', color: '#c084fc' },
        { from: 'dec-c2', to: 'dec-msg', animated: true, color: '#a855f7' },
      ],
      operations: [{ id: 'op-dec', type: 'add', label: 'Point Subtraction', x: 4, y: 2, z: 0, color: '#22c55e' }],
      highlights: ['dec-msg'],
    });

    return steps;
  },
};

export default eccEngine;
