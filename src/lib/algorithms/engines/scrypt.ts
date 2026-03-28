import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.8, height: 0.6, color, type };
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

const scryptEngine: AlgorithmEngine = {
  meta: {
    id: 'scrypt',
    name: 'scrypt',
    category: 'key-derivation',
    description: 'A memory-hard key derivation function designed to be costly to perform large-scale hardware attacks. Used by Litecoin and many password hashing systems. Requires significant memory to compute.',
    keySize: 'variable',
    yearIntroduced: 2009,
    authors: 'Colin Percival',
    status: 'recommended',
    standardBody: 'RFC 7914',
    color: '#f97316',
    icon: '🧱',
  },
  inputConfig: {
    type: 'kdf',
    fields: [
      { name: 'password', label: 'Password', type: 'text', placeholder: 'Enter password...', required: true, defaultValue: 'password123' },
      { name: 'salt', label: 'Salt', type: 'text', placeholder: 'Salt value', required: true, defaultValue: 'NaCl' },
      { name: 'N', label: 'N (CPU/memory cost)', type: 'select', required: true, options: [
        { label: '4 (demo)', value: '4' },
        { label: '8 (demo)', value: '8' },
        { label: '16384 (typical)', value: '16384' },
      ], defaultValue: '4' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const password = input.password || 'password123';
    const salt = input.salt || 'NaCl';
    const N = parseInt(input.N || '4');
    const r = 1; // block size factor
    const p = 1; // parallelization
    const dkLen = 32;

    const steps: VisualizationStep[] = [];

    steps.push({
      id: 'scrypt-params', phase: 'Parameters', label: 'scrypt Parameters',
      description: `Password: "${password}"\nSalt: "${salt}"\nN=${N} (CPU/memory cost - must be power of 2)\nr=${r} (block size factor)\np=${p} (parallelization factor)\nMemory required: ${N * 128 * r} bytes\nOutput: ${dkLen} bytes`,
      blocks: [
        blk('pass', 'Password', `"${password}"`, 1, 0, '#fb923c', 'data'),
        blk('salt', 'Salt', `"${salt}"`, 5, 0, '#fbbf24', 'data'),
        blk('n-param', 'N', `${N}`, 1, 1.5, '#f97316', 'constant'),
        blk('r-param', 'r', `${r}`, 3.5, 1.5, '#f97316', 'constant'),
        blk('p-param', 'p', `${p}`, 6, 1.5, '#f97316', 'constant'),
        blk('mem', 'Memory', `${N * 128 * r} bytes`, 8, 1.5, '#ef4444', 'constant'),
      ],
      connections: [], operations: [], highlights: ['pass', 'salt', 'n-param'],
    });

    // Step 1: PBKDF2 to generate initial data
    const B_len = 128 * r * p;
    steps.push({
      id: 'scrypt-pbkdf2-1', phase: 'Step 1: PBKDF2', label: 'Generate Initial Blocks with PBKDF2',
      description: `B = PBKDF2-HMAC-SHA256(password, salt, 1, ${B_len})\nThis generates ${p} blocks of ${128 * r} bytes each.\nPBKDF2 with just 1 iteration is used as a PRF, not for hardness (scrypt provides its own hardness).`,
      blocks: [
        blk('pb-pass', 'Password', `"${password}"`, 1, 0, '#fb923c', 'data'),
        blk('pb-salt', 'Salt', `"${salt}"`, 5, 0, '#fbbf24', 'data'),
        blk('pb-op', 'PBKDF2-SHA256', '1 iteration', 3, 1.5, '#f97316', 'operation'),
        blk('pb-b', 'B (initial blocks)', `${B_len} bytes`, 3, 3, '#ea580c', 'intermediate'),
      ],
      connections: [
        { from: 'pb-pass', to: 'pb-op', animated: true, color: '#fb923c' },
        { from: 'pb-salt', to: 'pb-op', animated: true, color: '#fbbf24' },
        { from: 'pb-op', to: 'pb-b', animated: true, color: '#f97316' },
      ],
      operations: [{ id: 'op-pbkdf2', type: 'hash', label: 'PBKDF2', x: 3, y: 1.5, z: 0, color: '#f97316' }],
      highlights: ['pb-b'],
    });

    // Step 2: ROMix - the memory-hard core
    steps.push({
      id: 'scrypt-romix-overview', phase: 'Step 2: ROMix', label: 'ROMix (Memory-Hard Core)',
      description: `The heart of scrypt's memory hardness.\nPhase A: Fill memory array V[0..${N-1}] sequentially\nPhase B: Mix randomly using memory-dependent indices\n\nThis forces an attacker to either:\n- Use ${N * 128 * r} bytes of memory (expensive in hardware)\n- Or recompute values (expensive in time)`,
      blocks: [
        blk('rm-b', 'Block B', 'Input', 2, 0, '#ea580c', 'intermediate'),
        blk('rm-v', `V[0..${N-1}]`, `${N} × ${128*r} bytes`, 7, 0, '#dc2626', 'intermediate'),
        blk('rm-phase-a', 'Phase A', 'Sequential fill', 2, 2, '#f97316', 'operation'),
        blk('rm-phase-b', 'Phase B', 'Random mixing', 7, 2, '#ef4444', 'operation'),
      ],
      connections: [
        { from: 'rm-b', to: 'rm-phase-a', animated: true, color: '#ea580c' },
        { from: 'rm-phase-a', to: 'rm-v', animated: true, color: '#f97316' },
        { from: 'rm-v', to: 'rm-phase-b', animated: true, color: '#dc2626' },
      ],
      operations: [{ id: 'op-romix', type: 'hash', label: 'ROMix', x: 4.5, y: 1, z: 0, color: '#f97316' }],
      highlights: ['rm-v'],
    });

    // ROMix Phase A: Sequential fill
    const demoN = Math.min(N, 8);
    const simV: string[] = [];
    let simBlock = 0xABCD;
    for (let i = 0; i < demoN; i++) {
      simV.push((simBlock & 0xFFFF).toString(16).padStart(4, '0'));
      simBlock = ((simBlock * 6364136223846793005 + 1) >>> 0) & 0xFFFF;
    }

    steps.push({
      id: 'scrypt-romix-a', phase: 'ROMix Phase A', label: 'Fill Memory Array V',
      description: `for i = 0 to ${N-1}:\n  V[i] = X\n  X = BlockMix(X)\n\nBlockMix applies Salsa20/8 core to mix the block.\nThis fills the entire memory array sequentially.`,
      blocks: simV.slice(0, Math.min(4, demoN)).map((v, i) =>
        blk(`v${i}`, `V[${i}]`, `0x${v}...`, i * 2.5, 0, '#f97316', 'intermediate')
      ),
      connections: simV.slice(0, Math.min(3, demoN)).map((_, i) => ({
        from: `v${i}`, to: `v${i+1}`, animated: true, label: 'BlockMix', color: '#f97316',
      })),
      operations: [{ id: 'op-fill', type: 'hash', label: 'Salsa20/8 core', x: 4, y: 1.5, z: 0, color: '#f97316' }],
      highlights: simV.slice(0, Math.min(4, demoN)).map((_, i) => `v${i}`),
    });

    // ROMix Phase B: Random access mixing
    steps.push({
      id: 'scrypt-romix-b', phase: 'ROMix Phase B', label: 'Memory-Dependent Mixing',
      description: `for i = 0 to ${N-1}:\n  j = Integerify(X) mod N   ← random index from current state\n  X = BlockMix(X ⊕ V[j])    ← XOR with memory, then mix\n\nThe index j depends on X, which depends on previous iterations. This creates memory-dependent access patterns that defeat time-memory tradeoffs.`,
      blocks: [
        blk('rmb-x', 'X (current)', '...', 1, 0, '#ea580c', 'intermediate'),
        blk('rmb-j', 'j = X mod N', 'random index', 4, 0, '#f97316', 'operation'),
        blk('rmb-vj', 'V[j]', 'memory lookup', 7, 0, '#dc2626', 'intermediate'),
        blk('rmb-xor', 'X ⊕ V[j]', 'XOR', 4, 1.5, '#fbbf24', 'operation'),
        blk('rmb-mix', 'BlockMix', 'Salsa20/8', 4, 3, '#f97316', 'operation'),
      ],
      connections: [
        { from: 'rmb-x', to: 'rmb-j', animated: true, color: '#ea580c' },
        { from: 'rmb-j', to: 'rmb-vj', animated: true, color: '#f97316', label: 'lookup' },
        { from: 'rmb-vj', to: 'rmb-xor', animated: true, color: '#dc2626' },
        { from: 'rmb-x', to: 'rmb-xor', animated: true, color: '#ea580c' },
        { from: 'rmb-xor', to: 'rmb-mix', animated: true, color: '#fbbf24' },
      ],
      operations: [
        { id: 'op-integerify', type: 'hash', label: 'Integerify', x: 4, y: 0, z: 0, color: '#f97316' },
        { id: 'op-blockmix', type: 'hash', label: 'BlockMix (Salsa20/8)', x: 4, y: 3, z: 0, color: '#f97316' },
      ],
      highlights: ['rmb-vj', 'rmb-mix'],
    });

    // Step 3: Final PBKDF2
    const simHash: number[] = [];
    for (let i = 0; i < dkLen; i++) {
      simHash.push(((password.charCodeAt(i % password.length) * 31 + salt.charCodeAt(i % salt.length) * 17 + i * N) ^ 0x5A) & 0xff);
    }

    steps.push({
      id: 'scrypt-final', phase: 'Step 3: Final PBKDF2', label: 'Derive Final Key',
      description: `DK = PBKDF2-HMAC-SHA256(password, B', 1, ${dkLen})\nThe memory-hardened block B' is used as the salt for a final PBKDF2 pass.\n\nDerived key: ${bytesToHex(simHash)}`,
      blocks: [
        blk('f-pass', 'Password', `"${password}"`, 1, 0, '#fb923c', 'data'),
        blk('f-b', "B' (hardened)", 'From ROMix', 5, 0, '#ea580c', 'intermediate'),
        blk('f-pbkdf2', 'PBKDF2-SHA256', '1 iteration', 3, 1.5, '#f97316', 'operation'),
        blk('f-dk', 'Derived Key', bytesToHex(simHash), 3, 3, '#22c55e', 'output'),
      ],
      connections: [
        { from: 'f-pass', to: 'f-pbkdf2', animated: true, color: '#fb923c' },
        { from: 'f-b', to: 'f-pbkdf2', animated: true, color: '#ea580c' },
        { from: 'f-pbkdf2', to: 'f-dk', animated: true, color: '#22c55e' },
      ],
      operations: [{ id: 'op-final', type: 'hash', label: 'PBKDF2 (final)', x: 3, y: 1.5, z: 0, color: '#f97316' }],
      highlights: ['f-dk'],
    });

    return steps;
  },
};

export default scryptEngine;
