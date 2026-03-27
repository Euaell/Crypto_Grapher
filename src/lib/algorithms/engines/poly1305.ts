import { AlgorithmEngine, VisualizationStep, DataBlock } from '@/lib/algorithms/types';

function blk(id: string, label: string, value: string, x: number, y: number, color: string, type: DataBlock['type'] = 'intermediate'): DataBlock {
  return { id, label, value, x, y, z: 0, width: 2.5, height: 0.6, color, type };
}

function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xff);
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function clampR(r: number[]): number[] {
  const clamped = [...r];
  clamped[3] &= 15;
  clamped[7] &= 15;
  clamped[11] &= 15;
  clamped[15] &= 15;
  clamped[4] &= 252;
  clamped[8] &= 252;
  clamped[12] &= 252;
  return clamped;
}

// Simple big number as array of digits for demonstration
function bytesToBigNum(bytes: number[]): number {
  // For demo purposes, use a simplified mod operation on small values
  let val = 0;
  for (let i = bytes.length - 1; i >= 0; i--) {
    val = (val * 256 + bytes[i]) % (2 ** 32);
  }
  return val >>> 0;
}

const poly1305Engine: AlgorithmEngine = {
  meta: {
    id: 'poly1305',
    name: 'Poly1305',
    category: 'mac',
    description: 'Poly1305 is a cryptographic message authentication code (MAC) designed by Daniel J. Bernstein. It computes a 128-bit tag using polynomial evaluation modulo the prime 2^130 - 5.',
    keySize: 256,
    yearIntroduced: 2005,
    authors: 'Daniel J. Bernstein',
    status: 'standard',
    standardBody: 'RFC 8439',
    color: '#14b8a6',
    icon: '🔏',
  },
  inputConfig: {
    type: 'mac',
    fields: [
      { name: 'message', label: 'Message', type: 'text', placeholder: 'Message to authenticate...', required: true, defaultValue: 'authenticate this' },
      { name: 'key', label: 'Key (32 bytes)', type: 'text', placeholder: '32-byte key', required: true, defaultValue: '32-byte-key-for-poly1305-mac!!' },
    ],
  },
  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const message = input.message || 'authenticate this';
    const key = input.key || '32-byte-key-for-poly1305-mac!!';
    const steps: VisualizationStep[] = [];

    const keyBytes = textToBytes(key);
    while (keyBytes.length < 32) keyBytes.push(0);
    const rBytes = keyBytes.slice(0, 16);
    const sBytes = keyBytes.slice(16, 32);
    const clampedR = clampR([...rBytes]);

    steps.push({
      id: 'poly-input', phase: 'Input', label: 'Input Setup',
      description: `Poly1305 takes a 256-bit key and a variable-length message. The key is split into two 128-bit halves: r (used for polynomial evaluation) and s (added to final result).`,
      blocks: [
        blk('msg', 'Message', `"${message}" (${message.length} bytes)`, 2, 0, '#38bdf8', 'data'),
        blk('key', 'Key (256 bits)', bytesToHex(keyBytes.slice(0, 16)) + '...', 6, 0, '#fbbf24', 'key'),
      ],
      connections: [],
      operations: [],
      highlights: ['msg', 'key'],
    });

    steps.push({
      id: 'poly-keysplit', phase: 'Key Setup', label: 'Split and Clamp Key',
      description: 'The 256-bit key is split into r (first 128 bits) and s (last 128 bits). r is then "clamped": certain bits are cleared to ensure the value has a specific algebraic structure that aids security.',
      blocks: [
        blk('r-raw', 'r (raw)', bytesToHex(rBytes), 1, 0, '#fbbf24', 'key'),
        blk('clamp-op', 'Clamp r', 'Clear bits 4,8,12,16 top nibbles; clear bits 4,8,12 low 2 bits', 4, 0, '#a78bfa', 'operation'),
        blk('r-clamped', 'r (clamped)', bytesToHex(clampedR), 1, 1.5, '#14b8a6', 'key'),
        blk('s-val', 's', bytesToHex(sBytes), 5.5, 1.5, '#fbbf24', 'key'),
      ],
      connections: [
        { from: 'r-raw', to: 'clamp-op', animated: true, color: '#fbbf24' },
        { from: 'clamp-op', to: 'r-clamped', animated: true, color: '#14b8a6' },
      ],
      operations: [],
      highlights: ['r-clamped', 's-val'],
    });

    // Divide message into 16-byte blocks
    const msgBytes = textToBytes(message);
    const blocks: number[][] = [];
    for (let i = 0; i < msgBytes.length; i += 16) {
      blocks.push(msgBytes.slice(i, i + 16));
    }

    const blockLabels = blocks.map((b, i) => ({
      hex: bytesToHex(b),
      text: message.slice(i * 16, i * 16 + b.length),
      len: b.length,
    }));

    steps.push({
      id: 'poly-blocks', phase: 'Block Division', label: 'Divide Into 16-Byte Blocks',
      description: `The ${msgBytes.length}-byte message is divided into ${blocks.length} block(s) of up to 16 bytes each. Each block will be processed as a number with a high bit appended.`,
      blocks: blocks.map((b, i) => blk(
        `blk${i}`, `Block ${i + 1} (${b.length} bytes)`,
        `"${blockLabels[i].text}" = ${blockLabels[i].hex}`,
        2 + (i % 2) * 4, Math.floor(i / 2) * 1.3, '#38bdf8', 'data'
      )),
      connections: [],
      operations: [],
      highlights: blocks.map((_, i) => `blk${i}`),
    });

    // Process blocks with accumulator
    const P = (2 ** 130) - 5; // We'll show symbolically
    const rNum = bytesToBigNum(clampedR);
    const sNum = bytesToBigNum(sBytes);

    let acc = 0;
    const accStates: number[] = [0];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      // Add high bit: append 0x01 byte
      const withHighBit = [...block, 0x01];
      const blockNum = bytesToBigNum(withHighBit);

      // Simplified accumulation (real poly1305 uses 130-bit arithmetic)
      acc = ((acc + blockNum) >>> 0);
      const accPlusBlock = acc;
      acc = Math.imul(acc, rNum & 0xffff) >>> 0; // simplified mod

      accStates.push(acc);

      if (i < 3 || i === blocks.length - 1) {
        steps.push({
          id: `poly-acc-${i}`, phase: 'Accumulation', label: `Process Block ${i + 1}`,
          description: `Convert block ${i + 1} to number and add high bit (0x01 appended). Then accumulate: acc = (acc + block_num) * r mod p, where p = 2^130 - 5.`,
          blocks: [
            blk(`acc-in-${i}`, 'Accumulator', `0x${accStates[i].toString(16)}`, 1, 0, '#14b8a6', 'intermediate'),
            blk(`bn-${i}`, `Block ${i + 1} as number`, `0x${blockNum.toString(16)} (with high bit)`, 4.5, 0, '#38bdf8', 'data'),
            blk(`add-${i}`, 'acc + block', `0x${accPlusBlock.toString(16)}`, 3, 1.3, '#a78bfa', 'operation'),
            blk(`mul-${i}`, '* r mod p', `* 0x${(rNum & 0xffff).toString(16)} mod (2^130-5)`, 3, 2.5, '#f472b6', 'operation'),
            blk(`acc-out-${i}`, 'New Accumulator', `0x${acc.toString(16)}`, 3, 3.7, '#34d399', 'intermediate'),
          ],
          connections: [
            { from: `acc-in-${i}`, to: `add-${i}`, animated: true, color: '#14b8a6' },
            { from: `bn-${i}`, to: `add-${i}`, animated: true, color: '#38bdf8' },
            { from: `add-${i}`, to: `mul-${i}`, animated: true, color: '#a78bfa' },
            { from: `mul-${i}`, to: `acc-out-${i}`, animated: true, color: '#f472b6' },
          ],
          operations: [
            { id: `op-add-${i}`, type: 'add', label: 'Add block', x: 3, y: 1.3, z: 0, color: '#a78bfa' },
            { id: `op-mul-${i}`, type: 'multiply', label: 'Multiply by r mod p', x: 3, y: 2.5, z: 0, color: '#f472b6' },
          ],
          highlights: [`acc-out-${i}`],
        });
      }
    }

    // Final: tag = (acc + s) mod 2^128
    const tag = (acc + sNum) >>> 0;
    const tagBytes: number[] = [];
    let tmp = tag;
    for (let i = 0; i < 16; i++) {
      tagBytes.push(tmp & 0xff);
      tmp = Math.floor(tmp / 256);
    }

    steps.push({
      id: 'poly-final', phase: 'Finalization', label: 'Compute Tag',
      description: 'After processing all blocks, the final tag is computed by adding s to the accumulator modulo 2^128. This one-time addition of s prevents forgery attacks.',
      blocks: [
        blk('final-acc', 'Final Accumulator', `0x${acc.toString(16)}`, 1, 0, '#14b8a6', 'intermediate'),
        blk('s-final', 's', `0x${sNum.toString(16)}`, 5, 0, '#fbbf24', 'key'),
        blk('add-s', 'acc + s', `mod 2^128`, 3, 1.5, '#a78bfa', 'operation'),
        blk('tag', 'MAC Tag (128 bits)', bytesToHex(tagBytes), 3, 3, '#14b8a6', 'output'),
      ],
      connections: [
        { from: 'final-acc', to: 'add-s', animated: true, color: '#14b8a6' },
        { from: 's-final', to: 'add-s', animated: true, color: '#fbbf24' },
        { from: 'add-s', to: 'tag', animated: true, color: '#34d399' },
      ],
      operations: [
        { id: 'op-final-add', type: 'add', label: 'Final Addition', x: 3, y: 1.5, z: 0, color: '#a78bfa' },
      ],
      highlights: ['tag'],
    });

    return steps;
  },
};

export default poly1305Engine;
