import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.8, height: 0.6, color, type };
}

const argon2Engine: AlgorithmEngine = {
  meta: {
    id: 'argon2',
    name: 'Argon2',
    category: 'key-derivation',
    description: 'Winner of the Password Hashing Competition (2015). Memory-hard with configurable time/memory/parallelism. Three variants: Argon2d (data-dependent), Argon2i (data-independent), Argon2id (hybrid).',
    keySize: 'variable',
    yearIntroduced: 2015,
    authors: 'Biryukov, Dinu, Khovratovich',
    status: 'standard',
    standardBody: 'RFC 9106',
    color: '#8b5cf6',
    icon: '🏅',
  },
  inputConfig: {
    type: 'kdf',
    fields: [
      { name: 'password', label: 'Password', type: 'text', placeholder: 'Enter password...', required: true, defaultValue: 'mypassword' },
      { name: 'salt', label: 'Salt', type: 'text', placeholder: 'Salt value', required: true, defaultValue: 'somesalt' },
      { name: 'variant', label: 'Variant', type: 'select', required: true, options: [
        { label: 'Argon2d (data-dependent)', value: 'd' },
        { label: 'Argon2i (data-independent)', value: 'i' },
        { label: 'Argon2id (hybrid, recommended)', value: 'id' },
      ], defaultValue: 'id' },
      { name: 'memory', label: 'Memory (KB)', type: 'select', required: true, options: [
        { label: '32 KB (demo)', value: '32' },
        { label: '65536 KB (64 MB)', value: '65536' },
      ], defaultValue: '32' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const password = input.password || 'mypassword';
    const salt = input.salt || 'somesalt';
    const variant = input.variant || 'id';
    const memory = parseInt(input.memory || '32');
    const timeCost = 3;
    const parallelism = 1;
    const tagLen = 32;
    const variantNames: Record<string, string> = { d: 'Argon2d', i: 'Argon2i', id: 'Argon2id' };

    const steps: VisualizationStep[] = [];

    steps.push({
      id: 'argon2-params', phase: 'Parameters', label: `${variantNames[variant]} Parameters`,
      description: `Variant: ${variantNames[variant]}\nPassword: "${password}"\nSalt: "${salt}"\nMemory: ${memory} KB (${Math.floor(memory / 1024)} blocks of 1 KB)\nTime cost: ${timeCost} iterations\nParallelism: ${parallelism} lane(s)\nTag length: ${tagLen} bytes`,
      blocks: [
        blk('pass', 'Password', `"${password}"`, 1, 0, '#a78bfa', 'data'),
        blk('salt', 'Salt', `"${salt}"`, 5, 0, '#fbbf24', 'data'),
        blk('var', 'Variant', variantNames[variant], 1, 1.5, '#8b5cf6', 'constant'),
        blk('mem', 'Memory', `${memory} KB`, 4, 1.5, '#7c3aed', 'constant'),
        blk('time', 'Iterations', `${timeCost}`, 7, 1.5, '#6d28d9', 'constant'),
      ],
      connections: [], operations: [], highlights: ['pass', 'salt', 'var'],
    });

    // Step 1: Initial hashing
    steps.push({
      id: 'argon2-init-hash', phase: 'Initial Hash', label: 'H₀ = BLAKE2b(params || password || salt)',
      description: 'Compute initial 64-byte hash H₀ from all parameters:\nH₀ = BLAKE2b(parallelism ∥ tagLen ∥ memory ∥ timeCost ∥ version ∥ type ∥ password ∥ salt)\nThis binds all parameters to the computation.',
      blocks: [
        blk('h-params', 'Parameters', 'p ∥ τ ∥ m ∥ t ∥ v ∥ y', 1, 0, '#a78bfa', 'data'),
        blk('h-pass', 'Password', `"${password}"`, 5, 0, '#c084fc', 'data'),
        blk('h-salt', 'Salt', `"${salt}"`, 8, 0, '#fbbf24', 'data'),
        blk('h-blake2', 'BLAKE2b', '64-byte hash', 4, 1.5, '#8b5cf6', 'operation'),
        blk('h-h0', 'H₀', '64 bytes', 4, 3, '#7c3aed', 'intermediate'),
      ],
      connections: [
        { from: 'h-params', to: 'h-blake2', animated: true, color: '#a78bfa' },
        { from: 'h-pass', to: 'h-blake2', animated: true, color: '#c084fc' },
        { from: 'h-salt', to: 'h-blake2', animated: true, color: '#fbbf24' },
        { from: 'h-blake2', to: 'h-h0', animated: true, color: '#7c3aed' },
      ],
      operations: [{ id: 'op-blake2', type: 'hash', label: 'BLAKE2b-512', x: 4, y: 1.5, z: 0, color: '#8b5cf6' }],
      highlights: ['h-h0'],
    });

    // Step 2: Fill memory matrix
    const numBlocks = Math.floor(memory); // each block = 1 KB
    const cols = Math.floor(numBlocks / parallelism);
    steps.push({
      id: 'argon2-memory', phase: 'Memory Allocation', label: 'Allocate Memory Matrix',
      description: `Create ${parallelism} lane(s) × ${cols} columns = ${numBlocks} blocks of 1 KB each.\nTotal memory: ${memory} KB\n\nEach block is 1024 bytes (128 × 8-byte words).`,
      blocks: [
        blk('mem-matrix', 'Memory Matrix', `${parallelism} × ${cols} blocks`, 3, 0, '#8b5cf6', 'intermediate'),
        blk('mem-size', 'Block Size', '1 KB (1024 bytes)', 7, 0, '#a78bfa', 'constant'),
      ],
      connections: [], operations: [], highlights: ['mem-matrix'],
    });

    // Step 3: Initial block filling
    steps.push({
      id: 'argon2-fill-init', phase: 'Initial Fill', label: 'Initialize First Two Blocks Per Lane',
      description: `For each lane i:\n  B[i][0] = H\'(H₀ ∥ 0 ∥ i)  (variable-length BLAKE2b)\n  B[i][1] = H\'(H₀ ∥ 1 ∥ i)\n\nH\' is a variable-length hash function built from BLAKE2b.`,
      blocks: [
        blk('b00', 'B[0][0]', "H'(H₀ ∥ 0 ∥ 0)", 1, 0, '#a78bfa', 'intermediate'),
        blk('b01', 'B[0][1]', "H'(H₀ ∥ 1 ∥ 0)", 4, 0, '#a78bfa', 'intermediate'),
        blk('b0dots', '...', `B[0][2..${cols-1}]`, 7, 0, '#c084fc', 'intermediate'),
      ],
      connections: [
        { from: 'b00', to: 'b01', animated: true, color: '#a78bfa' },
        { from: 'b01', to: 'b0dots', animated: true, color: '#c084fc' },
      ],
      operations: [{ id: 'op-hprime', type: 'hash', label: "H' (BLAKE2b)", x: 2.5, y: 1, z: 0, color: '#8b5cf6' }],
      highlights: ['b00', 'b01'],
    });

    // Step 4: Compression function
    steps.push({
      id: 'argon2-compress', phase: 'Compression', label: 'Argon2 Compression Function G',
      description: 'Core mixing: G(X, Y) uses two BLAKE2b rounds on 8×16 matrix:\n1. Apply BLAKE2b round to each row (8 rows × 16 words)\n2. Apply BLAKE2b round to each column\n3. XOR the result with the input\n\nThis is applied to fill each memory block from two reference blocks.',
      blocks: [
        blk('g-x', 'Block X', '1 KB', 1, 0, '#a78bfa', 'data'),
        blk('g-y', 'Block Y (ref)', '1 KB', 6, 0, '#c084fc', 'data'),
        blk('g-mix', 'G(X, Y)', 'BLAKE2b rounds', 3.5, 1.5, '#8b5cf6', 'operation'),
        blk('g-out', 'New Block', '1 KB', 3.5, 3, '#7c3aed', 'output'),
      ],
      connections: [
        { from: 'g-x', to: 'g-mix', animated: true, color: '#a78bfa' },
        { from: 'g-y', to: 'g-mix', animated: true, color: '#c084fc' },
        { from: 'g-mix', to: 'g-out', animated: true, color: '#7c3aed' },
      ],
      operations: [{ id: 'op-G', type: 'compress', label: 'G compression', x: 3.5, y: 1.5, z: 0, color: '#8b5cf6' }],
      highlights: ['g-out'],
    });

    // Variant differences
    const variantDesc = variant === 'd'
      ? 'Argon2d: Reference block index depends on PREVIOUS block values (data-dependent). Faster but vulnerable to side-channel attacks. Best for cryptocurrency mining.'
      : variant === 'i'
      ? 'Argon2i: Reference block index is computed from position only (data-independent). Resistant to side-channel attacks but slightly weaker against GPU attacks.'
      : 'Argon2id: HYBRID - uses Argon2i for first half of first pass (side-channel resistant), then Argon2d for rest (GPU resistant). RECOMMENDED for password hashing.';

    steps.push({
      id: 'argon2-variant', phase: 'Variant Behavior', label: `${variantNames[variant]} Indexing`,
      description: variantDesc,
      blocks: [
        blk('idx-method', 'Index Method', variant === 'd' ? 'Data-dependent' : variant === 'i' ? 'Data-independent' : 'Hybrid', 3, 0, variant === 'id' ? '#22c55e' : '#a78bfa', 'operation'),
        blk('idx-ref', 'Reference Block', 'B[lane][col]', 7, 0, '#c084fc', 'intermediate'),
      ],
      connections: [{ from: 'idx-method', to: 'idx-ref', animated: true, color: '#8b5cf6' }],
      operations: [], highlights: ['idx-method'],
    });

    // Multi-pass
    steps.push({
      id: 'argon2-passes', phase: 'Multiple Passes', label: `${timeCost} Passes Over Memory`,
      description: `Repeat the filling process ${timeCost} times over the entire memory.\nEach pass overwrites blocks using XOR with the compression result.\nThis increases computational cost without increasing memory.`,
      blocks: [
        blk('pass1', 'Pass 1', 'Fill all blocks', 1, 0, '#a78bfa', 'operation'),
        blk('pass2', 'Pass 2', 'Overwrite (XOR)', 4, 0, '#8b5cf6', 'operation'),
        blk('pass3', 'Pass 3', 'Overwrite (XOR)', 7, 0, '#7c3aed', 'operation'),
      ],
      connections: [
        { from: 'pass1', to: 'pass2', animated: true, label: '→', color: '#8b5cf6' },
        { from: 'pass2', to: 'pass3', animated: true, label: '→', color: '#7c3aed' },
      ],
      operations: [], highlights: ['pass1', 'pass2', 'pass3'],
    });

    // Final output
    const simHash: number[] = [];
    for (let i = 0; i < tagLen; i++) {
      simHash.push(((password.charCodeAt(i % password.length) * 37 + salt.charCodeAt(i % salt.length) * 13 + i * 7 + memory) ^ 0xBE) & 0xff);
    }

    steps.push({
      id: 'argon2-finalize', phase: 'Finalize', label: 'Extract Tag',
      description: `XOR the last block from each lane, then apply H\' to get ${tagLen}-byte tag.\nTag = H\'(B[0][q-1] ⊕ B[1][q-1] ⊕ ... ⊕ B[p-1][q-1])\n\nOutput: ${simHash.map(b => b.toString(16).padStart(2, '0')).join('')}`,
      blocks: [
        blk('fin-xor', 'XOR last blocks', 'All lanes', 2, 0, '#a78bfa', 'operation'),
        blk('fin-hash', "H'", 'Variable-length BLAKE2b', 5, 0, '#8b5cf6', 'operation'),
        blk('fin-tag', 'Derived Key', simHash.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32) + '...', 3.5, 2, '#22c55e', 'output'),
      ],
      connections: [
        { from: 'fin-xor', to: 'fin-hash', animated: true, color: '#a78bfa' },
        { from: 'fin-hash', to: 'fin-tag', animated: true, color: '#22c55e' },
      ],
      operations: [{ id: 'op-final', type: 'hash', label: "H' finalize", x: 3.5, y: 1, z: 0, color: '#8b5cf6' }],
      highlights: ['fin-tag'],
    });

    return steps;
  },
};

export default argon2Engine;
