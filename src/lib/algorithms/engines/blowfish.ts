import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function textToBytes(text: string, len: number): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xff);
  while (bytes.length < len) bytes.push(0);
  return bytes.slice(0, len);
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function toU32(n: number): number { return n >>> 0; }

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

// Simplified Blowfish P-array and S-boxes initialization (using pi digits)
function initP(): number[] {
  return [
    0x243F6A88, 0x85A308D3, 0x13198A2E, 0x03707344,
    0xA4093822, 0x299F31D0, 0x082EFA98, 0xEC4E6C89,
    0x452821E6, 0x38D01377, 0xBE5466CF, 0x34E90C6C,
    0xC0AC29B7, 0xC97C50DD, 0x3F84D5B5, 0xB5470917,
    0x9216D5D9, 0x8979FB1B,
  ];
}

const blowfishEngine: AlgorithmEngine = {
  meta: {
    id: 'blowfish',
    name: 'Blowfish',
    category: 'block-cipher',
    description: 'A symmetric block cipher designed by Bruce Schneier in 1993. Features a 64-bit block size and variable key length (32-448 bits). Known for its key-dependent S-boxes and 16-round Feistel network.',
    keySize: '32-448',
    blockSize: 64,
    yearIntroduced: 1993,
    authors: 'Bruce Schneier',
    status: 'legacy',
    color: '#0ea5e9',
    icon: '🐡',
  },
  inputConfig: {
    type: 'symmetric',
    fields: [
      { name: 'plaintext', label: 'Plaintext', type: 'text', placeholder: 'Enter text...', required: true, defaultValue: 'Blowfish' },
      { name: 'key', label: 'Key', type: 'text', placeholder: 'Encryption key', required: true, defaultValue: 'secretkey' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const plaintext = input.plaintext || 'Blowfish';
    const key = input.key || 'secretkey';

    const ptBytes = textToBytes(plaintext, 8);
    const keyBytes = textToBytes(key, 56);
    const P = initP();

    // XOR P-array with key bytes
    for (let i = 0; i < 18; i++) {
      let keyWord = 0;
      for (let j = 0; j < 4; j++) {
        keyWord = (keyWord << 8) | keyBytes[(i * 4 + j) % keyBytes.length];
      }
      P[i] = toU32(P[i] ^ keyWord);
    }

    // Split plaintext into two 32-bit halves
    let xL = toU32((ptBytes[0] << 24) | (ptBytes[1] << 16) | (ptBytes[2] << 8) | ptBytes[3]);
    let xR = toU32((ptBytes[4] << 24) | (ptBytes[5] << 16) | (ptBytes[6] << 8) | ptBytes[7]);

    const steps: VisualizationStep[] = [];

    steps.push({
      id: 'bf-input', phase: 'Input', label: 'Input Preparation',
      description: 'Blowfish takes a 64-bit plaintext block and splits it into two 32-bit halves (L and R) for the Feistel network.',
      blocks: [
        blk('pt', 'Plaintext (64 bits)', bytesToHex(ptBytes), 2, 0, '#38bdf8', 'data'),
        blk('key', 'Key', bytesToHex(keyBytes.slice(0, 8)) + '...', 7, 0, '#fbbf24', 'key'),
        blk('xL', 'Left Half (xL)', '0x' + xL.toString(16).padStart(8, '0'), 1.5, 2, '#60a5fa', 'intermediate'),
        blk('xR', 'Right Half (xR)', '0x' + xR.toString(16).padStart(8, '0'), 5.5, 2, '#60a5fa', 'intermediate'),
      ],
      connections: [
        { from: 'pt', to: 'xL', animated: true, color: '#38bdf8' },
        { from: 'pt', to: 'xR', animated: true, color: '#38bdf8' },
      ],
      operations: [], highlights: ['pt', 'xL', 'xR'],
    });

    steps.push({
      id: 'bf-parray', phase: 'Key Schedule', label: 'P-Array Initialization',
      description: 'The 18-entry P-array is initialized with digits of pi, then XORed with the key bytes cyclically. This makes the cipher key-dependent from the start.',
      blocks: [
        blk('p0', 'P[0]', '0x' + P[0].toString(16).padStart(8, '0'), 0.5, 0, '#818cf8', 'constant'),
        blk('p1', 'P[1]', '0x' + P[1].toString(16).padStart(8, '0'), 2.5, 0, '#818cf8', 'constant'),
        blk('p2', 'P[2]', '0x' + P[2].toString(16).padStart(8, '0'), 4.5, 0, '#818cf8', 'constant'),
        blk('pdots', '...', 'P[3]..P[15]', 6.5, 0, '#818cf8', 'constant'),
        blk('p16', 'P[16]', '0x' + P[16].toString(16).padStart(8, '0'), 0.5, 1.2, '#818cf8', 'constant'),
        blk('p17', 'P[17]', '0x' + P[17].toString(16).padStart(8, '0'), 2.5, 1.2, '#818cf8', 'constant'),
      ],
      connections: [], operations: [], highlights: ['p0', 'p1', 'p16', 'p17'],
    });

    // Simulate Feistel rounds (simplified F function)
    const roundStates: { l: number; r: number }[] = [{ l: xL, r: xR }];
    for (let i = 0; i < 16; i++) {
      xL = toU32(xL ^ P[i]);
      // Simplified F function: rotate and mix
      const f = toU32(((xL >>> 8) ^ (xL << 5) ^ P[i]) + (xL >>> 16));
      xR = toU32(xR ^ f);
      // Swap
      [xL, xR] = [xR, xL];
      roundStates.push({ l: xL, r: xR });
    }
    // Final swap back and XOR with P[16], P[17]
    [xL, xR] = [xR, xL];
    xR = toU32(xR ^ P[16]);
    xL = toU32(xL ^ P[17]);

    // Show a few key rounds
    const showRounds = [0, 1, 2, 7, 8, 14, 15];
    for (const r of showRounds) {
      const st = roundStates[r];
      const next = roundStates[r + 1];
      steps.push({
        id: `bf-round-${r}`, phase: `Round ${r + 1}`, label: `Feistel Round ${r + 1}`,
        description: `Round ${r + 1}: XOR left half with P[${r}], apply F function (S-box lookups + addition/XOR), XOR result with right half, then swap halves.`,
        blocks: [
          blk(`r${r}-l`, `L (input)`, '0x' + st.l.toString(16).padStart(8, '0'), 1, 0, '#60a5fa', 'intermediate'),
          blk(`r${r}-r`, `R (input)`, '0x' + st.r.toString(16).padStart(8, '0'), 6, 0, '#60a5fa', 'intermediate'),
          blk(`r${r}-p`, `P[${r}]`, '0x' + P[r].toString(16).padStart(8, '0'), 1, 1.5, '#fbbf24', 'key'),
          blk(`r${r}-xor`, `L ⊕ P[${r}]`, 'XOR', 3, 1.5, '#a78bfa', 'operation'),
          blk(`r${r}-f`, `F(L⊕P)`, 'S-box + Mix', 5, 1.5, '#f472b6', 'operation'),
          blk(`r${r}-nl`, `New L`, '0x' + next.l.toString(16).padStart(8, '0'), 1, 3, '#34d399', 'intermediate'),
          blk(`r${r}-nr`, `New R`, '0x' + next.r.toString(16).padStart(8, '0'), 6, 3, '#34d399', 'intermediate'),
        ],
        connections: [
          { from: `r${r}-l`, to: `r${r}-xor`, animated: true, color: '#60a5fa' },
          { from: `r${r}-p`, to: `r${r}-xor`, animated: true, color: '#fbbf24' },
          { from: `r${r}-xor`, to: `r${r}-f`, animated: true, color: '#a78bfa' },
          { from: `r${r}-f`, to: `r${r}-nr`, animated: true, label: '⊕ R', color: '#f472b6' },
          { from: `r${r}-r`, to: `r${r}-nl`, animated: true, label: 'swap', color: '#60a5fa', dashed: true },
        ],
        operations: [
          { id: `op-xor-${r}`, type: 'xor', label: `XOR with P[${r}]`, x: 3, y: 1.5, z: 0, color: '#a78bfa' },
          { id: `op-f-${r}`, type: 'sbox', label: 'F Function', x: 5, y: 1.5, z: 0, color: '#f472b6' },
        ],
        highlights: [`r${r}-nl`, `r${r}-nr`],
      });
    }

    const cipherBytes = [
      (xL >>> 24) & 0xff, (xL >>> 16) & 0xff, (xL >>> 8) & 0xff, xL & 0xff,
      (xR >>> 24) & 0xff, (xR >>> 16) & 0xff, (xR >>> 8) & 0xff, xR & 0xff,
    ];

    steps.push({
      id: 'bf-output', phase: 'Output', label: 'Ciphertext',
      description: 'After 16 Feistel rounds, a final swap and XOR with P[16] and P[17] produces the 64-bit ciphertext.',
      blocks: [
        blk('out-l', 'Final L', '0x' + xL.toString(16).padStart(8, '0'), 1.5, 0, '#34d399', 'intermediate'),
        blk('out-r', 'Final R', '0x' + xR.toString(16).padStart(8, '0'), 5.5, 0, '#34d399', 'intermediate'),
        blk('cipher', 'Ciphertext', bytesToHex(cipherBytes), 3.5, 2, '#0ea5e9', 'output'),
      ],
      connections: [
        { from: 'out-l', to: 'cipher', animated: true, color: '#34d399' },
        { from: 'out-r', to: 'cipher', animated: true, color: '#34d399' },
      ],
      operations: [], highlights: ['cipher'],
    });

    return steps;
  },
};

export default blowfishEngine;
