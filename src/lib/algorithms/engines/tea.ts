import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function toHex32(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

function textToUint32Pair(text: string): [number, number] {
  const bytes: number[] = [];
  for (let i = 0; i < 8; i++) {
    bytes.push(i < text.length ? text.charCodeAt(i) & 0xff : 0);
  }
  const v0 = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  const v1 = (bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7];
  return [v0 >>> 0, v1 >>> 0];
}

function textToUint32x4(text: string): [number, number, number, number] {
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(i < text.length ? text.charCodeAt(i) & 0xff : 0);
  }
  const w = (o: number) => ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
  return [w(0), w(4), w(8), w(12)];
}

// ── Engine ─────────────────────────────────────────────────────────────────────

const meta: AlgorithmEngine['meta'] = {
  id: 'tea',
  name: 'TEA',
  category: 'block-cipher',
  description:
    'Tiny Encryption Algorithm -- a simple 64-round Feistel cipher with a 128-bit key and 64-bit block, designed for simplicity and minimal code size. Deprecated due to related-key and equivalent-key weaknesses.',
  keySize: 128,
  blockSize: 64,
  yearIntroduced: 1994,
  authors: 'Wheeler, Needham',
  status: 'deprecated',
  color: '#78716c',
  icon: '🍵',
};

const inputConfig: AlgorithmEngine['inputConfig'] = {
  type: 'symmetric',
  fields: [
    {
      name: 'plaintext',
      label: 'Plaintext',
      type: 'text',
      placeholder: 'Enter up to 8 characters',
      required: true,
      defaultValue: 'TEAtest!',
      maxLength: 8,
    },
    {
      name: 'key',
      label: 'Key',
      type: 'text',
      placeholder: 'Enter 16-character key',
      required: true,
      defaultValue: 'my-128-bit-key!!',
      maxLength: 16,
    },
  ],
};

function generateSteps(input: Record<string, string>): VisualizationStep[] {
  const plaintext = input.plaintext || 'TEAtest!';
  const key = input.key || 'my-128-bit-key!!';

  const [v0Init, v1Init] = textToUint32Pair(plaintext);
  const [k0, k1, k2, k3] = textToUint32x4(key);
  const DELTA = 0x9E3779B9;

  const steps: VisualizationStep[] = [];
  let stepIdx = 0;

  // Step 0 -- Input
  steps.push({
    id: `tea-step-${stepIdx++}`,
    phase: 'input',
    label: 'Input',
    description: `Plaintext "${plaintext}" converted to two 32-bit halves. Key "${key}" converted to four 32-bit words.`,
    blocks: [
      blk('pt', 'Plaintext', plaintext, 1, 0, '#3b82f6', 'data'),
      blk('v0', 'v0', toHex32(v0Init), 1, 1.2, '#6366f1', 'data'),
      blk('v1', 'v1', toHex32(v1Init), 4.5, 1.2, '#6366f1', 'data'),
      blk('key', 'Key', key, 8, 0, '#f59e0b', 'key'),
      blk('k0', 'k0', toHex32(k0), 7, 1.2, '#f97316', 'key'),
      blk('k1', 'k1', toHex32(k1), 10, 1.2, '#f97316', 'key'),
      blk('k2', 'k2', toHex32(k2), 7, 2, '#f97316', 'key'),
      blk('k3', 'k3', toHex32(k3), 10, 2, '#f97316', 'key'),
    ],
    connections: [
      { from: 'pt', to: 'v0', animated: true, label: 'Hi 32 bits' },
      { from: 'pt', to: 'v1', animated: true, label: 'Lo 32 bits' },
      { from: 'key', to: 'k0', label: 'Word 0' },
      { from: 'key', to: 'k1', label: 'Word 1' },
      { from: 'key', to: 'k2', label: 'Word 2' },
      { from: 'key', to: 'k3', label: 'Word 3' },
    ],
    operations: [],
    highlights: ['v0', 'v1', 'k0', 'k1', 'k2', 'k3'],
  });

  // Step 1 -- Delta constant
  steps.push({
    id: `tea-step-${stepIdx++}`,
    phase: 'constants',
    label: 'Delta Constant',
    description: `TEA uses delta = 0x9E3779B9 (derived from the golden ratio). In each round sum += delta; the sum is used to prevent simple slide attacks.`,
    blocks: [
      blk('delta', 'delta', toHex32(DELTA), 4, 0, '#ef4444', 'constant'),
      blk('sum-init', 'sum (initial)', '00000000', 4, 1.2, '#ec4899'),
    ],
    connections: [{ from: 'delta', to: 'sum-init', animated: true, label: 'sum += delta each round' }],
    operations: [{ id: 'op-add-delta', type: 'add', label: 'Accumulate', x: 4, y: 0.6, z: 0, color: '#ef4444' }],
    highlights: ['delta'],
  });

  // Run all 64 rounds, capturing intermediates at selected rounds
  let v0 = v0Init;
  let v1 = v1Init;
  let sum = 0;

  const showRounds = [1, 2, 16, 32, 48, 63, 64];

  for (let round = 1; round <= 64; round++) {
    sum = (sum + DELTA) >>> 0;
    const oldV0 = v0;
    const oldV1 = v1;

    // v0 += ((v1 << 4) + k0) ^ (v1 + sum) ^ ((v1 >>> 5) + k1)
    const a1 = (((v1 << 4) >>> 0) + k0) >>> 0;
    const a2 = ((v1 + sum) >>> 0);
    const a3 = (((v1 >>> 5) + k1) >>> 0);
    v0 = (v0 + ((a1 ^ a2 ^ a3) >>> 0)) >>> 0;

    // v1 += ((v0 << 4) + k2) ^ (v0 + sum) ^ ((v0 >>> 5) + k3)
    const b1 = (((v0 << 4) >>> 0) + k2) >>> 0;
    const b2 = ((v0 + sum) >>> 0);
    const b3 = (((v0 >>> 5) + k3) >>> 0);
    v1 = (v1 + ((b1 ^ b2 ^ b3) >>> 0)) >>> 0;

    if (showRounds.includes(round)) {
      const y = 0;
      steps.push({
        id: `tea-step-${stepIdx++}`,
        phase: `round-${round}`,
        label: `Round ${round}`,
        description: `Round ${round}: sum = 0x${toHex32(sum)}. ` +
          `v0: 0x${toHex32(oldV0)} -> 0x${toHex32(v0)} via ((v1<<4)+k0) XOR (v1+sum) XOR ((v1>>5)+k1). ` +
          `v1: 0x${toHex32(oldV1)} -> 0x${toHex32(v1)} via ((v0<<4)+k2) XOR (v0+sum) XOR ((v0>>5)+k3).`,
        blocks: [
          blk(`r${round}-sum`, 'sum', toHex32(sum), 4, y, '#ec4899', 'constant'),
          blk(`r${round}-v0-old`, `v0 (before)`, toHex32(oldV0), 0.5, y + 1, '#94a3b8'),
          blk(`r${round}-v1-old`, `v1 (before)`, toHex32(oldV1), 7, y + 1, '#94a3b8'),
          blk(`r${round}-a1`, '(v1<<4)+k0', toHex32(a1), 1, y + 2, '#8b5cf6'),
          blk(`r${round}-a2`, 'v1+sum', toHex32(a2), 4, y + 2, '#8b5cf6'),
          blk(`r${round}-a3`, '(v1>>5)+k1', toHex32(a3), 7, y + 2, '#8b5cf6'),
          blk(`r${round}-v0-new`, `v0 (after)`, toHex32(v0), 0.5, y + 3.2, '#3b82f6'),
          blk(`r${round}-b1`, '(v0<<4)+k2', toHex32(b1), 1, y + 4.2, '#10b981'),
          blk(`r${round}-b2`, 'v0+sum', toHex32(b2), 4, y + 4.2, '#10b981'),
          blk(`r${round}-b3`, '(v0>>5)+k3', toHex32(b3), 7, y + 4.2, '#10b981'),
          blk(`r${round}-v1-new`, `v1 (after)`, toHex32(v1), 7, y + 5.4, '#3b82f6'),
        ],
        connections: [
          { from: `r${round}-a1`, to: `r${round}-v0-new`, label: 'XOR' },
          { from: `r${round}-a2`, to: `r${round}-v0-new`, label: 'XOR' },
          { from: `r${round}-a3`, to: `r${round}-v0-new`, label: 'XOR' },
          { from: `r${round}-v0-old`, to: `r${round}-v0-new`, animated: true, label: '+=' },
          { from: `r${round}-b1`, to: `r${round}-v1-new`, label: 'XOR' },
          { from: `r${round}-b2`, to: `r${round}-v1-new`, label: 'XOR' },
          { from: `r${round}-b3`, to: `r${round}-v1-new`, label: 'XOR' },
          { from: `r${round}-v1-old`, to: `r${round}-v1-new`, animated: true, label: '+=' },
        ],
        operations: [
          { id: `r${round}-op-xor1`, type: 'xor', label: 'XOR + Add', x: 3, y: y + 2.6, z: 0, color: '#8b5cf6' },
          { id: `r${round}-op-xor2`, type: 'xor', label: 'XOR + Add', x: 5, y: y + 4.8, z: 0, color: '#10b981' },
          { id: `r${round}-op-shift1`, type: 'shift', label: '<<4, >>5', x: 0.5, y: y + 1.5, z: 0, color: '#78716c' },
          { id: `r${round}-op-shift2`, type: 'shift', label: '<<4, >>5', x: 8, y: y + 3.7, z: 0, color: '#78716c' },
        ],
        highlights: [`r${round}-v0-new`, `r${round}-v1-new`],
      });
    }
  }

  // Final output
  const cipherHex = toHex32(v0) + toHex32(v1);
  steps.push({
    id: `tea-step-${stepIdx++}`,
    phase: 'output',
    label: 'Ciphertext',
    description: `After 64 rounds the final ciphertext is v0||v1 = 0x${cipherHex}.`,
    blocks: [
      blk('final-v0', 'v0 (final)', toHex32(v0), 1, 0, '#3b82f6'),
      blk('final-v1', 'v1 (final)', toHex32(v1), 5, 0, '#3b82f6'),
      blk('cipher', 'Ciphertext', cipherHex, 3, 1.5, '#ef4444', 'output'),
    ],
    connections: [
      { from: 'final-v0', to: 'cipher', animated: true, label: 'Hi 32 bits' },
      { from: 'final-v1', to: 'cipher', animated: true, label: 'Lo 32 bits' },
    ],
    operations: [],
    highlights: ['cipher'],
  });

  return steps;
}

const teaEngine: AlgorithmEngine = {
  meta,
  inputConfig,
  generateSteps,
};

export default teaEngine;
