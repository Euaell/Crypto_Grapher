import { AlgorithmEngine, VisualizationStep, DataBlock, Connection, Operation } from '@/lib/algorithms/types';

function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xff);
  while (bytes.length < 8) bytes.push(8 - (bytes.length % 8));
  return bytes.slice(0, 8);
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function xorBytes(a: number[], b: number[]): number[] {
  return a.map((v, i) => v ^ (b[i] || 0));
}

function makeBlocks(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

const tripleDESEngine: AlgorithmEngine = {
  meta: {
    id: 'triple-des',
    name: 'Triple DES (3DES)',
    category: 'block-cipher',
    description: 'Applies DES three times with two or three different keys (EDE mode). Provides 112-bit effective security. Superseded by AES but still used in legacy financial systems.',
    keySize: 168,
    blockSize: 64,
    yearIntroduced: 1995,
    authors: 'IBM',
    status: 'legacy',
    standardBody: 'NIST SP 800-67',
    color: '#f97316',
    icon: '🔐',
  },
  inputConfig: {
    type: 'symmetric',
    fields: [
      { name: 'plaintext', label: 'Plaintext', type: 'text', placeholder: 'Enter text to encrypt...', required: true, defaultValue: 'Hello!' },
      { name: 'key1', label: 'Key 1', type: 'text', placeholder: 'First DES key', required: true, defaultValue: 'secret01' },
      { name: 'key2', label: 'Key 2', type: 'text', placeholder: 'Second DES key', required: true, defaultValue: 'secret02' },
      { name: 'key3', label: 'Key 3', type: 'text', placeholder: 'Third DES key (optional)', required: false, defaultValue: 'secret03' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const plaintext = input.plaintext || 'Hello!';
    const key1 = input.key1 || 'secret01';
    const key2 = input.key2 || 'secret02';
    const key3 = input.key3 || key1;

    const ptBytes = textToBytes(plaintext);
    const k1Bytes = textToBytes(key1);
    const k2Bytes = textToBytes(key2);
    const k3Bytes = textToBytes(key3);

    // Simplified DES-like transform for visualization
    function simpleDESEncrypt(data: number[], key: number[]): number[] {
      let result = [...data];
      for (let round = 0; round < 16; round++) {
        const left = result.slice(0, 4);
        const right = result.slice(4, 8);
        const f = right.map((b, i) => ((b ^ key[i % key.length]) + round * 17 + key[(i + round) % key.length]) & 0xff);
        const newRight = xorBytes(left, f);
        result = [...right, ...newRight];
      }
      return result;
    }

    function simpleDESDecrypt(data: number[], key: number[]): number[] {
      let result = [...data];
      for (let round = 15; round >= 0; round--) {
        const left = result.slice(0, 4);
        const right = result.slice(4, 8);
        const f = left.map((b, i) => ((b ^ key[i % key.length]) + round * 17 + key[(i + round) % key.length]) & 0xff);
        const newLeft = xorBytes(right, f);
        result = [...newLeft, ...left];
      }
      return result;
    }

    const afterE1 = simpleDESEncrypt(ptBytes, k1Bytes);
    const afterD2 = simpleDESDecrypt(afterE1, k2Bytes);
    const afterE3 = simpleDESEncrypt(afterD2, k3Bytes);

    const steps: VisualizationStep[] = [];

    steps.push({
      id: '3des-input', phase: 'Input', label: 'Input Data',
      description: 'The plaintext and three DES keys are prepared. 3DES uses EDE mode: Encrypt-Decrypt-Encrypt with different keys.',
      blocks: [
        makeBlocks('pt', 'Plaintext', bytesToHex(ptBytes), 2, 0, '#60a5fa', 'data'),
        makeBlocks('k1', 'Key 1 (K1)', bytesToHex(k1Bytes), 6, -1, '#fbbf24', 'key'),
        makeBlocks('k2', 'Key 2 (K2)', bytesToHex(k2Bytes), 6, 0, '#f59e0b', 'key'),
        makeBlocks('k3', 'Key 3 (K3)', bytesToHex(k3Bytes), 6, 1, '#d97706', 'key'),
      ],
      connections: [], operations: [], highlights: ['pt', 'k1', 'k2', 'k3'],
    });

    steps.push({
      id: '3des-encrypt1', phase: 'Encrypt (K1)', label: 'First DES Encryption',
      description: `First pass: Encrypt plaintext with Key 1 using standard DES (16 Feistel rounds).`,
      blocks: [
        makeBlocks('pt1', 'Plaintext', bytesToHex(ptBytes), 1, 0, '#60a5fa', 'data'),
        makeBlocks('k1a', 'Key 1', bytesToHex(k1Bytes), 5, 0, '#fbbf24', 'key'),
        makeBlocks('des1-op', 'DES Encrypt', 'E_{K1}', 3, 1.5, '#3b82f6', 'operation'),
        makeBlocks('e1-out', 'After E(K1)', bytesToHex(afterE1), 3, 3, '#818cf8', 'intermediate'),
      ],
      connections: [
        { from: 'pt1', to: 'des1-op', animated: true, color: '#60a5fa' },
        { from: 'k1a', to: 'des1-op', animated: true, color: '#fbbf24' },
        { from: 'des1-op', to: 'e1-out', animated: true, color: '#818cf8' },
      ],
      operations: [{ id: 'op-e1', type: 'substitute', label: 'DES Encrypt (16 rounds)', x: 3, y: 1.5, z: 0, color: '#3b82f6' }],
      highlights: ['des1-op', 'e1-out'],
    });

    steps.push({
      id: '3des-decrypt2', phase: 'Decrypt (K2)', label: 'DES Decryption with K2',
      description: `Second pass: Decrypt the result with Key 2. This is the "D" in EDE mode. Using decryption with a different key further scrambles the data.`,
      blocks: [
        makeBlocks('e1-in', 'From Step 1', bytesToHex(afterE1), 1, 0, '#818cf8', 'intermediate'),
        makeBlocks('k2a', 'Key 2', bytesToHex(k2Bytes), 5, 0, '#f59e0b', 'key'),
        makeBlocks('des2-op', 'DES Decrypt', 'D_{K2}', 3, 1.5, '#8b5cf6', 'operation'),
        makeBlocks('d2-out', 'After D(K2)', bytesToHex(afterD2), 3, 3, '#a78bfa', 'intermediate'),
      ],
      connections: [
        { from: 'e1-in', to: 'des2-op', animated: true, color: '#818cf8' },
        { from: 'k2a', to: 'des2-op', animated: true, color: '#f59e0b' },
        { from: 'des2-op', to: 'd2-out', animated: true, color: '#a78bfa' },
      ],
      operations: [{ id: 'op-d2', type: 'substitute', label: 'DES Decrypt (16 rounds)', x: 3, y: 1.5, z: 0, color: '#8b5cf6' }],
      highlights: ['des2-op', 'd2-out'],
    });

    steps.push({
      id: '3des-encrypt3', phase: 'Encrypt (K3)', label: 'Final DES Encryption',
      description: `Third pass: Encrypt again with Key 3. This completes the EDE triple encryption.`,
      blocks: [
        makeBlocks('d2-in', 'From Step 2', bytesToHex(afterD2), 1, 0, '#a78bfa', 'intermediate'),
        makeBlocks('k3a', 'Key 3', bytesToHex(k3Bytes), 5, 0, '#d97706', 'key'),
        makeBlocks('des3-op', 'DES Encrypt', 'E_{K3}', 3, 1.5, '#f97316', 'operation'),
        makeBlocks('e3-out', 'Final Ciphertext', bytesToHex(afterE3), 3, 3, '#fb923c', 'output'),
      ],
      connections: [
        { from: 'd2-in', to: 'des3-op', animated: true, color: '#a78bfa' },
        { from: 'k3a', to: 'des3-op', animated: true, color: '#d97706' },
        { from: 'des3-op', to: 'e3-out', animated: true, color: '#fb923c' },
      ],
      operations: [{ id: 'op-e3', type: 'substitute', label: 'DES Encrypt (16 rounds)', x: 3, y: 1.5, z: 0, color: '#f97316' }],
      highlights: ['des3-op', 'e3-out'],
    });

    steps.push({
      id: '3des-summary', phase: 'Summary', label: 'Triple DES Complete',
      description: `3DES encryption complete. The plaintext was encrypted three times using EDE mode: E(K1) → D(K2) → E(K3). Effective key length: 112 bits (with 2 unique keys) or 168 bits (with 3 unique keys).`,
      blocks: [
        makeBlocks('sum-pt', 'Plaintext', bytesToHex(ptBytes), 1, 0, '#60a5fa', 'data'),
        makeBlocks('sum-e1', 'E(K1)', bytesToHex(afterE1), 3.5, 0, '#3b82f6', 'intermediate'),
        makeBlocks('sum-d2', 'D(K2)', bytesToHex(afterD2), 6, 0, '#8b5cf6', 'intermediate'),
        makeBlocks('sum-ct', 'Ciphertext', bytesToHex(afterE3), 8.5, 0, '#f97316', 'output'),
      ],
      connections: [
        { from: 'sum-pt', to: 'sum-e1', animated: true, label: 'K1', color: '#fbbf24' },
        { from: 'sum-e1', to: 'sum-d2', animated: true, label: 'K2', color: '#f59e0b' },
        { from: 'sum-d2', to: 'sum-ct', animated: true, label: 'K3', color: '#d97706' },
      ],
      operations: [],
      highlights: ['sum-ct'],
    });

    return steps;
  },
};

export default tripleDESEngine;
