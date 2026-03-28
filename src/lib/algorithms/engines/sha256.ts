import type {
  AlgorithmEngine,
  VisualizationStep,
  DataBlock,
  Connection,
  Operation,
} from '@/lib/algorithms/types';

// ── SHA-256 constants ────────────────────────────────────────────────────────

const K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const H_INIT: number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

// ── Bit-manipulation helpers (all mod 2^32) ──────────────────────────────────

function mod32(x: number): number {
  return x >>> 0;
}

function rotr(x: number, n: number): number {
  return mod32((x >>> n) | (x << (32 - n)));
}

function shr(x: number, n: number): number {
  return x >>> n;
}

function ch(x: number, y: number, z: number): number {
  return mod32((x & y) ^ (~x & z));
}

function maj(x: number, y: number, z: number): number {
  return mod32((x & y) ^ (x & z) ^ (y & z));
}

function bigSigma0(x: number): number {
  return mod32(rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22));
}

function bigSigma1(x: number): number {
  return mod32(rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25));
}

function smallSigma0(x: number): number {
  return mod32(rotr(x, 7) ^ rotr(x, 18) ^ shr(x, 3));
}

function smallSigma1(x: number): number {
  return mod32(rotr(x, 17) ^ rotr(x, 19) ^ shr(x, 10));
}

function add32(...vals: number[]): number {
  let s = 0;
  for (const v of vals) s = mod32(s + v);
  return s;
}

function hex(n: number): string {
  return mod32(n).toString(16).padStart(8, '0');
}

// ── Message pre-processing ───────────────────────────────────────────────────

function messageToBytes(msg: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < msg.length; i++) {
    const code = msg.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

function padMessage(bytes: number[]): number[] {
  const bitLen = bytes.length * 8;
  const padded = [...bytes];
  padded.push(0x80);
  while ((padded.length % 64) !== 56) {
    padded.push(0x00);
  }
  // append 64-bit big-endian length
  for (let i = 56; i >= 0; i -= 8) {
    padded.push((bitLen / Math.pow(2, i)) & 0xff);
  }
  return padded;
}

function bytesToWords(bytes: number[]): number[] {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(mod32((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]));
  }
  return words;
}

// ── Visualization helpers ────────────────────────────────────────────────────

function makeBlock(
  id: string, label: string, value: string,
  x: number, y: number,
  color: string, type: DataBlock['type'],
  opts: Partial<DataBlock> = {},
): DataBlock {
  return {
    id, label, value, x, y, z: 0,
    width: opts.width ?? 2, height: opts.height ?? 0.6,
    color, type,
    ...opts,
  };
}

function makeOp(
  id: string, type: Operation['type'], label: string,
  x: number, y: number, color: string,
): Operation {
  return { id, type, label, x, y, z: 0, color };
}

function conn(from: string, to: string, extra: Partial<Connection> = {}): Connection {
  return { from, to, ...extra };
}

// ── Engine ───────────────────────────────────────────────────────────────────

const sha256Engine: AlgorithmEngine = {
  meta: {
    id: 'sha-256',
    name: 'SHA-256',
    category: 'hash-function',
    description:
      'SHA-256 is a cryptographic hash function from the SHA-2 family, producing a 256-bit (32-byte) digest. It is widely used for data integrity, digital signatures, and blockchain applications.',
    color: '#10b981',
    icon: '\u{1F512}',
    yearIntroduced: 2001,
    authors: 'NSA',
    status: 'standard',
    standardBody: 'NIST FIPS 180-4',
    keySize: 'N/A',
    blockSize: 512,
  },

  inputConfig: {
    type: 'hash',
    fields: [
      {
        name: 'message',
        label: 'Message',
        type: 'text',
        placeholder: 'Enter message to hash...',
        required: true,
        defaultValue: 'abc',
      },
    ],
  },

  generateSteps(input: Record<string, string>): VisualizationStep[] {
    const message = input.message ?? '';
    const steps: VisualizationStep[] = [];

    // ── Pre-processing ─────────────────────────────────────────────────────

    const msgBytes = messageToBytes(message);
    const paddedBytes = padMessage(msgBytes);
    const totalWords = bytesToWords(paddedBytes);
    const numBlocks = paddedBytes.length / 64;

    // ── Step 1 – Original message ──────────────────────────────────────────

    const msgHex = msgBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
    steps.push({
      id: 'step-1-message',
      phase: 'Input',
      label: 'Original Message',
      description: `The input message "${message}" is encoded as ${msgBytes.length} byte(s) using UTF-8.`,
      blocks: [
        makeBlock('msg-text', 'Message (text)', message, 2, 0, '#10b981', 'data', { width: 6 }),
        makeBlock('msg-hex', 'Message (hex)', msgHex, 2, 1, '#34d399', 'data', { width: 6 }),
      ],
      connections: [conn('msg-text', 'msg-hex', { animated: true, label: 'UTF-8 encode' })],
      operations: [],
      highlights: ['msg-text', 'msg-hex'],
    });

    // ── Step 2 – Padding ───────────────────────────────────────────────────

    const paddedHex = paddedBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
    const bitLen = msgBytes.length * 8;
    steps.push({
      id: 'step-2-padding',
      phase: 'Pre-processing',
      label: 'Message Padding',
      description: `Append bit "1" (0x80), then zeros until length \u2261 448 mod 512, then the 64-bit big-endian message length (${bitLen} bits). Padded to ${paddedBytes.length} bytes (${paddedBytes.length * 8} bits).`,
      blocks: [
        makeBlock('msg-hex-pre', 'Original bytes', msgHex, 1, 0, '#10b981', 'data', { width: 8 }),
        makeBlock('pad-op', 'Padding', '0x80 + zeros + length', 1, 1.2, '#f59e0b', 'operation', { width: 8 }),
        makeBlock('padded', 'Padded message', paddedHex, 1, 2.4, '#3b82f6', 'intermediate', { width: 8, height: 0.8 }),
      ],
      connections: [
        conn('msg-hex-pre', 'pad-op', { animated: true }),
        conn('pad-op', 'padded', { animated: true }),
      ],
      operations: [makeOp('op-pad', 'pad', 'SHA-256 Padding', 5, 1.2, '#f59e0b')],
      highlights: ['padded'],
    });

    // ── Step 3 – Parse into 512-bit blocks ─────────────────────────────────

    const parseBlocks: DataBlock[] = [];
    const parseConns: Connection[] = [];
    for (let b = 0; b < numBlocks; b++) {
      const blockWords = totalWords.slice(b * 16, (b + 1) * 16);
      const blockHex = blockWords.map(w => hex(w)).join(' ');
      parseBlocks.push(
        makeBlock(`block-${b}`, `Block ${b}`, blockHex, 1, b * 1.4, '#6366f1', 'intermediate', { width: 8, height: 0.8 }),
      );
      parseConns.push(conn('padded-ref', `block-${b}`, { dashed: true }));
    }
    parseBlocks.unshift(
      makeBlock('padded-ref', 'Padded message', `${paddedBytes.length * 8} bits`, 1, -1, '#3b82f6', 'data', { width: 8 }),
    );
    steps.push({
      id: 'step-3-parse',
      phase: 'Pre-processing',
      label: 'Parse into 512-bit Blocks',
      description: `The padded message is split into ${numBlocks} block(s) of 512 bits (16 \u00d7 32-bit words each).`,
      blocks: parseBlocks,
      connections: parseConns,
      operations: [],
      highlights: parseBlocks.map(b => b.id),
    });

    // ── Process each 512-bit block ─────────────────────────────────────────

    let H = [...H_INIT];

    for (let blkIdx = 0; blkIdx < numBlocks; blkIdx++) {
      const M = totalWords.slice(blkIdx * 16, (blkIdx + 1) * 16);

      // ── Step 4 – Message schedule ──────────────────────────────────────

      const W: number[] = [...M];
      for (let t = 16; t < 64; t++) {
        W[t] = add32(smallSigma1(W[t - 2]), W[t - 7], smallSigma0(W[t - 15]), W[t - 16]);
      }

      // Show W[0..15]
      const wInitBlocks: DataBlock[] = M.map((w, i) =>
        makeBlock(`w-init-${i}`, `W[${i}]`, hex(w), (i % 4) * 2.5, Math.floor(i / 4) * 0.8, '#10b981', 'data', { width: 2 }),
      );
      steps.push({
        id: `step-4a-schedule-init-blk${blkIdx}`,
        phase: 'Message Schedule',
        label: `W[0..15] from Block ${blkIdx}`,
        description: `The first 16 words of the message schedule are copied directly from block ${blkIdx}.`,
        blocks: wInitBlocks,
        connections: [],
        operations: [],
        highlights: wInitBlocks.map(b => b.id),
      });

      // Show W[16..63] computation (summarised in groups)
      const wExtBlocks: DataBlock[] = [];
      const wExtConns: Connection[] = [];
      const wExtOps: Operation[] = [];
      for (let t = 16; t < 64; t += 8) {
        const end = Math.min(t + 8, 64);
        const row = (t - 16) / 8;
        const vals = W.slice(t, end).map(w => hex(w)).join(' ');
        const bId = `w-ext-${t}-${end}`;
        wExtBlocks.push(
          makeBlock(bId, `W[${t}..${end - 1}]`, vals, 1, row * 0.8, '#34d399', 'intermediate', { width: 8 }),
        );
        const opId = `op-sigma-${t}`;
        wExtOps.push(makeOp(opId, 'rotate', `\u03c3\u2080/\u03c3\u2081`, 0, row * 0.8, '#f59e0b'));
        wExtConns.push(conn(opId, bId, { animated: true, label: '\u03c3\u2081(W[t-2]) + W[t-7] + \u03c3\u2080(W[t-15]) + W[t-16]' }));
      }
      steps.push({
        id: `step-4b-schedule-ext-blk${blkIdx}`,
        phase: 'Message Schedule',
        label: `W[16..63] Expansion (Block ${blkIdx})`,
        description: 'Remaining schedule words are computed: W[t] = \u03c3\u2081(W[t-2]) + W[t-7] + \u03c3\u2080(W[t-15]) + W[t-16], all mod 2\u00b3\u00b2.',
        blocks: wExtBlocks,
        connections: wExtConns,
        operations: wExtOps,
        highlights: wExtBlocks.map(b => b.id),
      });

      // ── Step 5 – Initialize working variables ─────────────────────────

      let [a, b, c, d, e, f, g, h] = H;

      const initBlocks: DataBlock[] = [
        makeBlock('wv-a', 'a', hex(a), 0, 0, '#3b82f6', 'intermediate'),
        makeBlock('wv-b', 'b', hex(b), 2.5, 0, '#3b82f6', 'intermediate'),
        makeBlock('wv-c', 'c', hex(c), 5, 0, '#3b82f6', 'intermediate'),
        makeBlock('wv-d', 'd', hex(d), 7.5, 0, '#3b82f6', 'intermediate'),
        makeBlock('wv-e', 'e', hex(e), 0, 1, '#6366f1', 'intermediate'),
        makeBlock('wv-f', 'f', hex(f), 2.5, 1, '#6366f1', 'intermediate'),
        makeBlock('wv-g', 'g', hex(g), 5, 1, '#6366f1', 'intermediate'),
        makeBlock('wv-h', 'h', hex(h), 7.5, 1, '#6366f1', 'intermediate'),
      ];
      const hBlocks: DataBlock[] = H.map((hv, i) =>
        makeBlock(`h-init-${i}`, `H${i}`, hex(hv), i * 1.2, -1.2, '#10b981', 'constant'),
      );
      steps.push({
        id: `step-5-init-wv-blk${blkIdx}`,
        phase: 'Initialization',
        label: `Initialize Working Variables (Block ${blkIdx})`,
        description: 'Working variables a\u2013h are initialized from the current hash values H0\u2013H7.',
        blocks: [...hBlocks, ...initBlocks],
        connections: H.map((_, i) => conn(`h-init-${i}`, `wv-${'abcdefgh'[i]}`, { animated: true })),
        operations: [],
        highlights: initBlocks.map(b => b.id),
      });

      // ── Steps 6-9 – Compression rounds (4 groups of 16) ───────────────

      const roundGroupNames = ['Rounds 0\u201315', 'Rounds 16\u201331', 'Rounds 32\u201347', 'Rounds 48\u201363'];

      for (let grp = 0; grp < 4; grp++) {
        const start = grp * 16;
        const end = start + 16;

        // Run the 16 rounds
        const roundDetails: string[] = [];
        for (let t = start; t < end; t++) {
          const T1 = add32(h, bigSigma1(e), ch(e, f, g), K[t], W[t]);
          const T2 = add32(bigSigma0(a), maj(a, b, c));
          h = g;
          g = f;
          f = e;
          e = add32(d, T1);
          d = c;
          c = b;
          b = a;
          a = add32(T1, T2);

          if (t === start || t === end - 1) {
            roundDetails.push(
              `Round ${t}: a=${hex(a)} e=${hex(e)} | T1=${hex(T1)} T2=${hex(T2)}`,
            );
          }
        }

        const wvAfter = [a, b, c, d, e, f, g, h];
        const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        const roundBlocks: DataBlock[] = wvAfter.map((v, i) =>
          makeBlock(`rnd-${grp}-${labels[i]}`, labels[i], hex(v), (i % 4) * 2.5, Math.floor(i / 4) * 1, '#8b5cf6', 'intermediate'),
        );

        // Show a few K constants and W values for context
        const kBlock = makeBlock(
          `k-grp-${grp}`, `K[${start}..${end - 1}]`,
          K.slice(start, start + 4).map(k => hex(k)).join(' ') + ' ...',
          0, 2.5, '#f59e0b', 'constant', { width: 8 },
        );
        const wBlock = makeBlock(
          `w-grp-${grp}`, `W[${start}..${end - 1}]`,
          W.slice(start, start + 4).map(w => hex(w)).join(' ') + ' ...',
          0, 3.3, '#34d399', 'constant', { width: 8 },
        );

        const roundOps: Operation[] = [
          makeOp(`op-sigma1-${grp}`, 'rotate', '\u03a3\u2081(e)', 1, -0.8, '#ef4444'),
          makeOp(`op-ch-${grp}`, 'compress', 'Ch(e,f,g)', 3.5, -0.8, '#ef4444'),
          makeOp(`op-sigma0-${grp}`, 'rotate', '\u03a3\u2080(a)', 6, -0.8, '#3b82f6'),
          makeOp(`op-maj-${grp}`, 'compress', 'Maj(a,b,c)', 8.5, -0.8, '#3b82f6'),
        ];

        steps.push({
          id: `step-${6 + grp}-rounds-${start}-${end - 1}-blk${blkIdx}`,
          phase: 'Compression',
          label: `${roundGroupNames[grp]} (Block ${blkIdx})`,
          description: `Each round computes T1 = h + \u03a3\u2081(e) + Ch(e,f,g) + K[t] + W[t] and T2 = \u03a3\u2080(a) + Maj(a,b,c), then shifts the working variables.\n\n${roundDetails.join('\n')}`,
          blocks: [...roundBlocks, kBlock, wBlock],
          connections: [
            conn(`k-grp-${grp}`, `rnd-${grp}-a`, { animated: true, label: 'K[t]' }),
            conn(`w-grp-${grp}`, `rnd-${grp}-e`, { animated: true, label: 'W[t]' }),
          ],
          operations: roundOps,
          highlights: roundBlocks.map(b => b.id),
        });
      }

      // ── Step 10 – Add compressed chunk to hash ─────────────────────────

      const compressed = [a, b, c, d, e, f, g, h];
      const newH = H.map((hv, i) => add32(hv, compressed[i]));

      const addBlocks: DataBlock[] = [
        ...H.map((hv, i) =>
          makeBlock(`h-old-${i}`, `H${i} (prev)`, hex(hv), i * 1.2, 0, '#10b981', 'intermediate'),
        ),
        ...compressed.map((cv, i) =>
          makeBlock(`comp-${i}`, `${'abcdefgh'[i]} (final)`, hex(cv), i * 1.2, 1, '#8b5cf6', 'intermediate'),
        ),
        ...newH.map((nv, i) =>
          makeBlock(`h-new-${i}`, `H${i} (new)`, hex(nv), i * 1.2, 2.5, '#059669', 'intermediate'),
        ),
      ];
      const addConns: Connection[] = newH.flatMap((_, i) => [
        conn(`h-old-${i}`, `h-new-${i}`, { animated: true }),
        conn(`comp-${i}`, `h-new-${i}`, { animated: true }),
      ]);
      const addOps = newH.map((_, i) =>
        makeOp(`op-add-h${i}`, 'add', `+ mod 2\u00b3\u00b2`, i * 1.2, 1.8, '#f59e0b'),
      );

      steps.push({
        id: `step-10-add-blk${blkIdx}`,
        phase: 'Finalization',
        label: `Update Hash Values (Block ${blkIdx})`,
        description: 'Add the compressed working variables to the running hash values: H\u1d62 = H\u1d62 + (working var), all mod 2\u00b3\u00b2.',
        blocks: addBlocks,
        connections: addConns,
        operations: addOps,
        highlights: newH.map((_, i) => `h-new-${i}`),
      });

      H = newH;
    }

    // ── Step 11 – Final hash ────────────────────────────────────────────────

    const digest = H.map(hv => hex(hv)).join('');
    const finalBlocks: DataBlock[] = [
      ...H.map((hv, i) =>
        makeBlock(`h-final-${i}`, `H${i}`, hex(hv), i * 1.2, 0, '#10b981', 'intermediate'),
      ),
      makeBlock('digest', 'SHA-256 Digest', digest, 1, 1.5, '#10b981', 'output', { width: 8, height: 0.8 }),
    ];
    const finalConns: Connection[] = H.map((_, i) =>
      conn(`h-final-${i}`, 'digest', { animated: true, color: '#10b981' }),
    );

    steps.push({
      id: 'step-11-digest',
      phase: 'Output',
      label: 'Final Hash Digest',
      description: `Concatenate H0\u2013H7 to produce the 256-bit digest:\n${digest}`,
      blocks: finalBlocks,
      connections: finalConns,
      operations: [makeOp('op-concat', 'hash', 'Concatenate', 5, 0.8, '#10b981')],
      highlights: ['digest'],
    });

    return steps;
  },
};

export default sha256Engine;
