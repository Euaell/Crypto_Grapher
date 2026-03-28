import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function toU32(n: number): number { return n >>> 0; }
function rotl(x: number, n: number): number { return toU32((x << n) | (x >>> (32 - n))); }

function textToBytes(text: string): number[] {
  return Array.from(text).map(c => c.charCodeAt(0) & 0xff);
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function littleEndian(b: number[]): number {
  return toU32(b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24));
}

const salsa20Engine: AlgorithmEngine = {
  meta: {
    id: 'salsa20',
    name: 'Salsa20',
    category: 'stream-cipher',
    description: 'A stream cipher by Daniel Bernstein using add-rotate-XOR (ARX) operations on a 4×4 matrix of 32-bit words. Predecessor to ChaCha20, selected for eSTREAM portfolio.',
    keySize: 256,
    blockSize: 512,
    yearIntroduced: 2005,
    authors: 'Daniel J. Bernstein',
    status: 'recommended',
    standardBody: 'eSTREAM Portfolio',
    color: '#e879f9',
    icon: '💃',
  },
  inputConfig: {
    type: 'symmetric',
    fields: [
      { name: 'plaintext', label: 'Plaintext', type: 'text', placeholder: 'Enter text...', required: true, defaultValue: 'Salsa20!' },
      { name: 'key', label: 'Key (256-bit)', type: 'text', placeholder: '32-char key', required: true, defaultValue: 'this-is-a-32-byte-key-for-salsa' },
      { name: 'nonce', label: 'Nonce (64-bit)', type: 'text', placeholder: '8-char nonce', required: true, defaultValue: 'nonce123' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const plaintext = input.plaintext || 'Salsa20!';
    const key = input.key || 'this-is-a-32-byte-key-for-salsa';
    const nonce = input.nonce || 'nonce123';

    const ptBytes = textToBytes(plaintext);
    const keyBytes = textToBytes(key);
    while (keyBytes.length < 32) keyBytes.push(0);
    const nonceBytes = textToBytes(nonce);
    while (nonceBytes.length < 8) nonceBytes.push(0);

    const steps: VisualizationStep[] = [];

    // Constants: "expand 32-byte k"
    const sigma = [
      littleEndian(textToBytes('expa')),
      littleEndian(textToBytes('nd 3')),
      littleEndian(textToBytes('2-by')),
      littleEndian(textToBytes('te k')),
    ];

    // Build initial state
    const k: number[] = [];
    for (let i = 0; i < 8; i++) k.push(littleEndian(keyBytes.slice(i*4, i*4+4)));
    const n: number[] = [littleEndian(nonceBytes.slice(0, 4)), littleEndian(nonceBytes.slice(4, 8))];

    const state = [
      sigma[0], k[0], k[1], k[2],
      k[3], sigma[1], n[0], n[1],
      0, 0, sigma[2], k[4],
      k[5], k[6], k[7], sigma[3],
    ];

    steps.push({
      id: 'salsa-input', phase: 'Input', label: 'Input Data',
      description: `Plaintext: "${plaintext}"\nKey: 256-bit, Nonce: 64-bit, Counter: 0`,
      blocks: [
        blk('pt', 'Plaintext', bytesToHex(ptBytes), 2, 0, '#f0abfc', 'data'),
        blk('key', 'Key (256-bit)', bytesToHex(keyBytes.slice(0, 8)) + '...', 7, 0, '#fbbf24', 'key'),
      ],
      connections: [], operations: [], highlights: ['pt', 'key'],
    });

    // Show initial state matrix
    steps.push({
      id: 'salsa-state', phase: 'State Init', label: 'Initial 4×4 State Matrix',
      description: 'Salsa20 state is a 4×4 matrix of 32-bit words:\nRow 0: σ₀, k₀, k₁, k₂\nRow 1: k₃, σ₁, n₀, n₁\nRow 2: ctr₀, ctr₁, σ₂, k₄\nRow 3: k₅, k₆, k₇, σ₃\n"σ" values spell "expand 32-byte k"',
      blocks: state.map((v, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const labels = ['σ₀','k₀','k₁','k₂','k₃','σ₁','n₀','n₁','ctr₀','ctr₁','σ₂','k₄','k₅','k₆','k₇','σ₃'];
        return blk(`s${i}`, labels[i], '0x' + v.toString(16).padStart(8, '0'), col * 2.5, row * 1.2,
          [0,5,10,15].includes(i) ? '#e879f9' : [1,2,3,4,11,12,13,14].includes(i) ? '#fbbf24' : '#a78bfa',
          [0,5,10,15].includes(i) ? 'constant' : 'key');
      }),
      connections: [], operations: [], highlights: ['s0', 's5', 's10', 's15'],
    });

    // Quarter round demo
    function quarterRound(a: number, b: number, c: number, d: number): [number, number, number, number] {
      b = toU32(b ^ rotl(toU32(a + d), 7));
      c = toU32(c ^ rotl(toU32(b + a), 9));
      d = toU32(d ^ rotl(toU32(c + b), 13));
      a = toU32(a ^ rotl(toU32(d + c), 18));
      return [a, b, c, d];
    }

    const [qa, qb, qc, qd] = quarterRound(state[0], state[4], state[8], state[12]);
    steps.push({
      id: 'salsa-qr', phase: 'Quarter Round', label: 'Quarter Round Operation',
      description: 'Core operation applied to 4 words:\nb ^= (a+d) <<< 7\nc ^= (b+a) <<< 9\nd ^= (c+b) <<< 13\na ^= (d+c) <<< 18\nEach addition is mod 2³², each rotation is left-rotate.',
      blocks: [
        blk('qr-a', 'a (before)', '0x' + state[0].toString(16).padStart(8, '0'), 0.5, 0, '#e879f9', 'data'),
        blk('qr-b', 'b (before)', '0x' + state[4].toString(16).padStart(8, '0'), 3, 0, '#fbbf24', 'data'),
        blk('qr-c', 'c (before)', '0x' + state[8].toString(16).padStart(8, '0'), 5.5, 0, '#a78bfa', 'data'),
        blk('qr-d', 'd (before)', '0x' + state[12].toString(16).padStart(8, '0'), 8, 0, '#38bdf8', 'data'),
        blk('qr-na', 'a (after)', '0x' + qa.toString(16).padStart(8, '0'), 0.5, 3, '#d946ef', 'output'),
        blk('qr-nb', 'b (after)', '0x' + qb.toString(16).padStart(8, '0'), 3, 3, '#eab308', 'output'),
        blk('qr-nc', 'c (after)', '0x' + qc.toString(16).padStart(8, '0'), 5.5, 3, '#8b5cf6', 'output'),
        blk('qr-nd', 'd (after)', '0x' + qd.toString(16).padStart(8, '0'), 8, 3, '#0ea5e9', 'output'),
      ],
      connections: [
        { from: 'qr-a', to: 'qr-nb', animated: true, label: '<<<7', color: '#e879f9' },
        { from: 'qr-b', to: 'qr-nc', animated: true, label: '<<<9', color: '#fbbf24' },
        { from: 'qr-c', to: 'qr-nd', animated: true, label: '<<<13', color: '#a78bfa' },
        { from: 'qr-d', to: 'qr-na', animated: true, label: '<<<18', color: '#38bdf8' },
      ],
      operations: [
        { id: 'op-qr1', type: 'rotate', label: 'Add + Rotate + XOR', x: 4, y: 1.5, z: 0, color: '#e879f9' },
      ],
      highlights: ['qr-na', 'qr-nb', 'qr-nc', 'qr-nd'],
    });

    // Full 20 rounds
    const working = [...state];
    for (let round = 0; round < 10; round++) {
      // Column rounds
      [working[0],working[4],working[8],working[12]] = quarterRound(working[0],working[4],working[8],working[12]);
      [working[5],working[9],working[13],working[1]] = quarterRound(working[5],working[9],working[13],working[1]);
      [working[10],working[14],working[2],working[6]] = quarterRound(working[10],working[14],working[2],working[6]);
      [working[15],working[3],working[7],working[11]] = quarterRound(working[15],working[3],working[7],working[11]);
      // Row rounds
      [working[0],working[1],working[2],working[3]] = quarterRound(working[0],working[1],working[2],working[3]);
      [working[5],working[6],working[7],working[4]] = quarterRound(working[5],working[6],working[7],working[4]);
      [working[10],working[11],working[8],working[9]] = quarterRound(working[10],working[11],working[8],working[9]);
      [working[15],working[12],working[13],working[14]] = quarterRound(working[15],working[12],working[13],working[14]);
    }

    steps.push({
      id: 'salsa-rounds', phase: '20 Rounds', label: '10 Double Rounds (20 total)',
      description: 'Salsa20 performs 10 double rounds:\n- Column round: quarter round on each column\n- Row round: quarter round on each row\nTotal: 20 quarter-round applications per double round × 10 = 200 quarter-rounds',
      blocks: working.map((v, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        return blk(`w${i}`, `State[${i}]`, '0x' + v.toString(16).padStart(8, '0'), col * 2.5, row * 1.2, '#d946ef', 'intermediate');
      }),
      connections: [], operations: [], highlights: working.map((_, i) => `w${i}`),
    });

    // Add original state
    const keystream: number[] = [];
    for (let i = 0; i < 16; i++) {
      const sum = toU32(working[i] + state[i]);
      keystream.push(sum & 0xff, (sum >> 8) & 0xff, (sum >> 16) & 0xff, (sum >> 24) & 0xff);
    }

    steps.push({
      id: 'salsa-add', phase: 'Final Addition', label: 'Add Original State',
      description: 'Add the original state to the working state (mod 2³²). This prevents reversibility of the hash-like core function.',
      blocks: [
        blk('ks', 'Keystream (first 8 bytes)', bytesToHex(keystream.slice(0, 8)), 3, 0, '#e879f9', 'intermediate'),
      ],
      connections: [],
      operations: [{ id: 'op-add', type: 'add', label: 'State + Original', x: 3, y: 0, z: 0, color: '#e879f9' }],
      highlights: ['ks'],
    });

    const cipherBytes = ptBytes.map((b, i) => b ^ (keystream[i] || 0));
    steps.push({
      id: 'salsa-encrypt', phase: 'Encryption', label: 'XOR with Plaintext',
      description: `Ciphertext = Plaintext ⊕ Keystream\nResult: ${bytesToHex(cipherBytes)}`,
      blocks: [
        blk('enc-pt', 'Plaintext', bytesToHex(ptBytes), 1, 0, '#f0abfc', 'data'),
        blk('enc-ks', 'Keystream', bytesToHex(keystream.slice(0, ptBytes.length)), 6, 0, '#e879f9', 'key'),
        blk('enc-xor', '⊕', 'XOR', 3.5, 1.5, '#fbbf24', 'operation'),
        blk('enc-ct', 'Ciphertext', bytesToHex(cipherBytes), 3.5, 3, '#d946ef', 'output'),
      ],
      connections: [
        { from: 'enc-pt', to: 'enc-xor', animated: true, color: '#f0abfc' },
        { from: 'enc-ks', to: 'enc-xor', animated: true, color: '#e879f9' },
        { from: 'enc-xor', to: 'enc-ct', animated: true, color: '#d946ef' },
      ],
      operations: [{ id: 'op-xor', type: 'xor', label: 'Encrypt', x: 3.5, y: 1.5, z: 0, color: '#fbbf24' }],
      highlights: ['enc-ct'],
    });

    return steps;
  },
};

export default salsa20Engine;
