import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function textToBytes(text: string): number[] {
  return Array.from(text).map(c => c.charCodeAt(0) & 0xff);
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function bytesToBin(bytes: number[]): string {
  return bytes.map(b => b.toString(2).padStart(8, '0')).join(' ');
}

const otpEngine: AlgorithmEngine = {
  meta: {
    id: 'otp',
    name: 'One-Time Pad',
    category: 'stream-cipher',
    description: 'The only mathematically proven unbreakable cipher. Requires a truly random key at least as long as the message, used only once. Shannon proved its information-theoretic security in 1949.',
    keySize: 'message length',
    yearIntroduced: 1882,
    authors: 'Frank Miller / Vernam / Mauborgne',
    status: 'theoretical',
    color: '#eab308',
    icon: '🏆',
  },
  inputConfig: {
    type: 'symmetric',
    fields: [
      { name: 'plaintext', label: 'Plaintext', type: 'text', placeholder: 'Enter message...', required: true, defaultValue: 'SECRET' },
      { name: 'key', label: 'Key (random, same length)', type: 'text', placeholder: 'Random key...', required: false, defaultValue: '' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const plaintext = input.plaintext || 'SECRET';
    const ptBytes = textToBytes(plaintext);

    // Generate random key if not provided
    let keyBytes: number[];
    if (input.key && input.key.length >= plaintext.length) {
      keyBytes = textToBytes(input.key).slice(0, ptBytes.length);
    } else {
      keyBytes = ptBytes.map(() => Math.floor(Math.random() * 256));
    }

    const cipherBytes = ptBytes.map((b, i) => b ^ keyBytes[i]);

    const steps: VisualizationStep[] = [];

    steps.push({
      id: 'otp-intro', phase: 'Theory', label: 'One-Time Pad Principle',
      description: 'The OTP is the only cipher with perfect secrecy (proven by Claude Shannon, 1949). Requirements:\n1. Key must be truly random\n2. Key must be at least as long as the message\n3. Key must never be reused\n4. Key must be kept secret',
      blocks: [
        blk('rule1', 'Rule 1', 'Key = truly random', 1, 0, '#fbbf24', 'constant'),
        blk('rule2', 'Rule 2', 'len(key) ≥ len(msg)', 5, 0, '#facc15', 'constant'),
        blk('rule3', 'Rule 3', 'Never reuse key', 1, 1.5, '#eab308', 'constant'),
        blk('rule4', 'Rule 4', 'Key stays secret', 5, 1.5, '#ca8a04', 'constant'),
      ],
      connections: [], operations: [], highlights: ['rule1', 'rule2', 'rule3', 'rule4'],
    });

    steps.push({
      id: 'otp-input', phase: 'Input', label: 'Plaintext & Key',
      description: `Plaintext: "${plaintext}" (${ptBytes.length} bytes)\nKey: ${ptBytes.length} random bytes (one byte per plaintext byte)`,
      blocks: [
        blk('pt', 'Plaintext', `"${plaintext}"`, 2, 0, '#60a5fa', 'data'),
        blk('pt-hex', 'Plaintext (hex)', bytesToHex(ptBytes), 2, 1.5, '#3b82f6', 'data'),
        blk('key', 'Key (random)', bytesToHex(keyBytes), 7, 0, '#fbbf24', 'key'),
        blk('key-bin', 'Key (binary)', bytesToBin(keyBytes.slice(0, 3)) + '...', 7, 1.5, '#eab308', 'key'),
      ],
      connections: [
        { from: 'pt', to: 'pt-hex', color: '#60a5fa' },
        { from: 'key', to: 'key-bin', color: '#fbbf24' },
      ],
      operations: [], highlights: ['pt', 'key'],
    });

    // Show byte-by-byte XOR
    const xorDetails = ptBytes.map((b, i) => ({
      pt: b.toString(16).padStart(2, '0'),
      key: keyBytes[i].toString(16).padStart(2, '0'),
      ct: cipherBytes[i].toString(16).padStart(2, '0'),
      ptBin: b.toString(2).padStart(8, '0'),
      keyBin: keyBytes[i].toString(2).padStart(8, '0'),
      ctBin: cipherBytes[i].toString(2).padStart(8, '0'),
    }));

    const showBytes = Math.min(ptBytes.length, 4);
    for (let i = 0; i < showBytes; i++) {
      const d = xorDetails[i];
      steps.push({
        id: `otp-xor-${i}`, phase: 'XOR', label: `Byte ${i}: '${plaintext[i]}' ⊕ Key`,
        description: `Plaintext byte: 0x${d.pt} (${d.ptBin})\nKey byte:       0x${d.key} (${d.keyBin})\nXOR result:     0x${d.ct} (${d.ctBin})\n\nEach bit of the ciphertext is equally likely to be 0 or 1, regardless of the plaintext.`,
        blocks: [
          blk(`xor-pt-${i}`, `'${plaintext[i]}' (0x${d.pt})`, d.ptBin, 1, 0, '#60a5fa', 'data'),
          blk(`xor-key-${i}`, `Key byte ${i}`, d.keyBin, 6, 0, '#fbbf24', 'key'),
          blk(`xor-op-${i}`, '⊕', 'XOR', 3.5, 1.5, '#a78bfa', 'operation'),
          blk(`xor-ct-${i}`, `Cipher byte ${i}`, d.ctBin, 3.5, 3, '#10b981', 'output'),
        ],
        connections: [
          { from: `xor-pt-${i}`, to: `xor-op-${i}`, animated: true, color: '#60a5fa' },
          { from: `xor-key-${i}`, to: `xor-op-${i}`, animated: true, color: '#fbbf24' },
          { from: `xor-op-${i}`, to: `xor-ct-${i}`, animated: true, color: '#10b981' },
        ],
        operations: [{ id: `op-xor-${i}`, type: 'xor', label: `Byte ${i} XOR`, x: 3.5, y: 1.5, z: 0, color: '#a78bfa' }],
        highlights: [`xor-ct-${i}`],
      });
    }

    steps.push({
      id: 'otp-result', phase: 'Output', label: 'Ciphertext',
      description: `Ciphertext: ${bytesToHex(cipherBytes)}\n\nWithout the key, an attacker sees random bytes. Every possible plaintext of this length is equally likely—this is perfect secrecy.`,
      blocks: [
        blk('ct', 'Ciphertext', bytesToHex(cipherBytes), 3.5, 0, '#10b981', 'output'),
        blk('proof', 'Perfect Secrecy', 'P(M|C) = P(M)', 3.5, 2, '#eab308', 'constant'),
      ],
      connections: [], operations: [], highlights: ['ct', 'proof'],
    });

    // Decryption
    steps.push({
      id: 'otp-decrypt', phase: 'Decryption', label: 'Decryption (same XOR)',
      description: `Decryption is identical: XOR ciphertext with same key.\nC ⊕ K = (P ⊕ K) ⊕ K = P\nResult: "${plaintext}"`,
      blocks: [
        blk('dec-ct', 'Ciphertext', bytesToHex(cipherBytes), 1, 0, '#10b981', 'intermediate'),
        blk('dec-key', 'Same Key', bytesToHex(keyBytes), 6, 0, '#fbbf24', 'key'),
        blk('dec-xor', '⊕', 'XOR', 3.5, 1.5, '#a78bfa', 'operation'),
        blk('dec-pt', 'Plaintext', `"${plaintext}"`, 3.5, 3, '#60a5fa', 'output'),
      ],
      connections: [
        { from: 'dec-ct', to: 'dec-xor', animated: true, color: '#10b981' },
        { from: 'dec-key', to: 'dec-xor', animated: true, color: '#fbbf24' },
        { from: 'dec-xor', to: 'dec-pt', animated: true, color: '#60a5fa' },
      ],
      operations: [{ id: 'op-dec', type: 'xor', label: 'Decrypt XOR', x: 3.5, y: 1.5, z: 0, color: '#a78bfa' }],
      highlights: ['dec-pt'],
    });

    return steps;
  },
};

export default otpEngine;
