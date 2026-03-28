import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function toU64(hi: number, lo: number): { hi: number; lo: number } {
  return { hi: hi >>> 0, lo: lo >>> 0 };
}

function textToBytes(text: string): number[] {
  return Array.from(text).map(c => c.charCodeAt(0) & 0xff);
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// SHA-3 uses the Keccak sponge construction
const sha3Engine: AlgorithmEngine = {
  meta: {
    id: 'sha-3',
    name: 'SHA-3 (Keccak)',
    category: 'hash-function',
    description: 'SHA-3 is based on the Keccak sponge construction, fundamentally different from SHA-1/SHA-2. Uses a 5×5 matrix of 64-bit lanes processed through 24 rounds of θ, ρ, π, χ, ι operations.',
    keySize: 'N/A',
    blockSize: 1088,
    yearIntroduced: 2012,
    authors: 'Bertoni, Daemen, Peeters, Van Assche',
    status: 'standard',
    standardBody: 'NIST FIPS 202',
    color: '#22c55e',
    icon: '🧽',
  },
  inputConfig: {
    type: 'hash',
    fields: [
      { name: 'message', label: 'Message', type: 'text', placeholder: 'Enter message...', required: true, defaultValue: 'Hello' },
      { name: 'variant', label: 'Variant', type: 'select', required: true, options: [
        { label: 'SHA3-256', value: '256' },
        { label: 'SHA3-512', value: '512' },
      ], defaultValue: '256' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const message = input.message || 'Hello';
    const variant = parseInt(input.variant || '256');
    const rate = variant === 256 ? 1088 : 576; // bits
    const capacity = 1600 - rate;
    const msgBytes = textToBytes(message);

    const steps: VisualizationStep[] = [];

    steps.push({
      id: 'sha3-intro', phase: 'Overview', label: 'Keccak Sponge Construction',
      description: `SHA3-${variant} uses Keccak with:\n- State: 1600 bits (5×5 matrix of 64-bit lanes)\n- Rate: ${rate} bits (absorb/squeeze ${rate/8} bytes at a time)\n- Capacity: ${capacity} bits (security parameter)\n- Rounds: 24 permutation rounds`,
      blocks: [
        blk('sponge', 'Sponge Construction', `Rate=${rate}b, Cap=${capacity}b`, 3, 0, '#22c55e', 'constant'),
        blk('state', 'State Size', '1600 bits = 5×5×64', 7, 0, '#4ade80', 'constant'),
      ],
      connections: [], operations: [], highlights: ['sponge', 'state'],
    });

    // Padding
    const padded = [...msgBytes];
    padded.push(0x06); // SHA-3 domain separation
    while ((padded.length * 8) % rate !== rate - 8) padded.push(0x00);
    padded[padded.length - 1] |= 0x80;

    steps.push({
      id: 'sha3-pad', phase: 'Padding', label: 'SHA-3 Padding (pad10*1)',
      description: `Append domain separator 0x06, then zeros, then 0x80.\nPadded message: ${padded.length} bytes (${padded.length * 8} bits)\nBlock size: ${rate/8} bytes`,
      blocks: [
        blk('msg', 'Message', `"${message}"`, 2, 0, '#4ade80', 'data'),
        blk('pad', 'Padded', bytesToHex(padded.slice(0, 8)) + '...', 7, 0, '#22c55e', 'intermediate'),
      ],
      connections: [{ from: 'msg', to: 'pad', animated: true, color: '#4ade80' }],
      operations: [{ id: 'op-pad', type: 'pad', label: 'pad10*1', x: 4.5, y: 0, z: 0, color: '#22c55e' }],
      highlights: ['pad'],
    });

    // Initialize 5x5 state
    const state: { hi: number; lo: number }[][] = [];
    for (let x = 0; x < 5; x++) {
      state.push([]);
      for (let y = 0; y < 5; y++) {
        state[x].push(toU64(0, 0));
      }
    }

    steps.push({
      id: 'sha3-state-init', phase: 'State Init', label: '5×5 State Matrix (all zeros)',
      description: 'Initialize 1600-bit state as 5×5 matrix of 64-bit "lanes", all zeros.',
      blocks: Array.from({ length: 25 }, (_, i) => {
        const x = i % 5;
        const y = Math.floor(i / 5);
        return blk(`lane-${x}-${y}`, `[${x},${y}]`, '0x0000000000000000', x * 2, y * 0.8, '#86efac', 'intermediate');
      }),
      connections: [], operations: [], highlights: ['lane-0-0', 'lane-1-1', 'lane-2-2'],
    });

    // Absorb phase
    steps.push({
      id: 'sha3-absorb', phase: 'Absorb', label: 'Absorbing Message Blocks',
      description: `XOR each ${rate/8}-byte message block into the rate portion of the state, then apply the Keccak-f[1600] permutation.\nFor short messages, this is done once. For longer messages, repeat for each block.`,
      blocks: [
        blk('abs-msg', 'Message Block', bytesToHex(padded.slice(0, 8)) + '...', 1, 0, '#4ade80', 'data'),
        blk('abs-state', 'State (rate portion)', `First ${rate/8} bytes`, 6, 0, '#86efac', 'intermediate'),
        blk('abs-xor', '⊕', 'XOR into state', 3.5, 1.5, '#fbbf24', 'operation'),
        blk('abs-perm', 'Keccak-f[1600]', '24 rounds', 3.5, 3, '#22c55e', 'operation'),
      ],
      connections: [
        { from: 'abs-msg', to: 'abs-xor', animated: true, color: '#4ade80' },
        { from: 'abs-state', to: 'abs-xor', animated: true, color: '#86efac' },
        { from: 'abs-xor', to: 'abs-perm', animated: true, color: '#22c55e' },
      ],
      operations: [
        { id: 'op-absorb', type: 'xor', label: 'XOR message into state', x: 3.5, y: 1.5, z: 0, color: '#fbbf24' },
      ],
      highlights: ['abs-perm'],
    });

    // Show the 5 Keccak-f steps
    const keccakSteps = [
      { name: 'θ (Theta)', desc: 'Column parity: XOR each lane with parity of two neighboring columns.\nC[x] = A[x,0] ⊕ A[x,1] ⊕ A[x,2] ⊕ A[x,3] ⊕ A[x,4]\nD[x] = C[x-1] ⊕ ROT(C[x+1], 1)\nA\'[x,y] = A[x,y] ⊕ D[x]', color: '#10b981' },
      { name: 'ρ (Rho)', desc: 'Bitwise rotation: Each lane is rotated by a different fixed offset (0 to 63 bits).\nA\'[x,y] = ROT(A[x,y], r[x,y])\nRotation offsets form a specific pattern derived from the lane position.', color: '#059669' },
      { name: 'π (Pi)', desc: 'Lane permutation: Rearrange lanes within the 5×5 matrix.\nA\'[y, 2x+3y mod 5] = A[x,y]\nThis provides diffusion across the matrix positions.', color: '#047857' },
      { name: 'χ (Chi)', desc: 'Non-linear step: The only non-linear operation in Keccak.\nA\'[x,y] = A[x,y] ⊕ (NOT(A[x+1,y]) AND A[x+2,y])\nProvides confusion (similar role to S-boxes in AES).', color: '#065f46' },
      { name: 'ι (Iota)', desc: 'Round constant: XOR a round-dependent constant into lane [0,0].\nA[0,0] = A[0,0] ⊕ RC[round]\nBreaks symmetry between rounds. 24 different constants for 24 rounds.', color: '#064e3b' },
    ];

    for (const [i, step] of keccakSteps.entries()) {
      steps.push({
        id: `sha3-keccak-${i}`, phase: 'Keccak-f', label: `Step ${i + 1}: ${step.name}`,
        description: step.desc,
        blocks: [
          blk(`kf-${i}-in`, 'State Input', '5×5×64 bits', 1, 0, step.color, 'intermediate'),
          blk(`kf-${i}-op`, step.name, 'Transform', 4, 1.2, step.color, 'operation'),
          blk(`kf-${i}-out`, 'State Output', '5×5×64 bits', 7, 0, step.color, 'intermediate'),
        ],
        connections: [
          { from: `kf-${i}-in`, to: `kf-${i}-op`, animated: true, color: step.color },
          { from: `kf-${i}-op`, to: `kf-${i}-out`, animated: true, color: step.color },
        ],
        operations: [{
          id: `op-kf-${i}`,
          type: i === 3 ? 'substitute' : i === 1 ? 'rotate' : i === 2 ? 'permutation' : 'xor',
          label: step.name, x: 4, y: 1.2, z: 0, color: step.color,
        }],
        highlights: [`kf-${i}-op`],
      });
    }

    // Squeeze phase
    // Simulate a simple hash output
    const simHash: number[] = [];
    for (let i = 0; i < variant / 8; i++) {
      simHash.push(((padded[i % padded.length] * 31 + i * 17 + 0xAB) ^ (padded[(i + 3) % padded.length] * 7)) & 0xff);
    }

    steps.push({
      id: 'sha3-squeeze', phase: 'Squeeze', label: 'Squeeze Phase: Extract Hash',
      description: `Read ${variant/8} bytes from the rate portion of the state.\nFor SHA3-256: read 32 bytes\nFor SHA3-512: read 64 bytes\nIf more output is needed, apply Keccak-f again and read more.`,
      blocks: [
        blk('sq-state', 'Final State', '1600 bits', 2, 0, '#22c55e', 'intermediate'),
        blk('sq-rate', 'Rate Portion', `${rate/8} bytes available`, 7, 0, '#4ade80', 'intermediate'),
        blk('sq-hash', `SHA3-${variant} Hash`, bytesToHex(simHash.slice(0, 16)) + '...', 4, 2, '#15803d', 'output'),
      ],
      connections: [
        { from: 'sq-state', to: 'sq-rate', animated: true, color: '#22c55e' },
        { from: 'sq-rate', to: 'sq-hash', animated: true, color: '#4ade80' },
      ],
      operations: [{ id: 'op-squeeze', type: 'compress', label: 'Extract hash bytes', x: 4, y: 1, z: 0, color: '#22c55e' }],
      highlights: ['sq-hash'],
    });

    return steps;
  },
};

export default sha3Engine;
