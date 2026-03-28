import { AlgorithmEngine, AlgorithmCategory } from './types';

// Dynamic imports to avoid large bundle
const engineLoaders: Record<string, () => Promise<{ default: AlgorithmEngine }>> = {
  'aes': () => import('./engines/aes'),
  'des': () => import('./engines/des'),
  'triple-des': () => import('./engines/triple-des'),
  'blowfish': () => import('./engines/blowfish'),
  'twofish': () => import('./engines/twofish'),
  'camellia': () => import('./engines/camellia'),
  'serpent': () => import('./engines/serpent'),
  'tea': () => import('./engines/tea'),
  'rc4': () => import('./engines/rc4'),
  'chacha20': () => import('./engines/chacha20'),
  'salsa20': () => import('./engines/salsa20'),
  'rabbit': () => import('./engines/rabbit'),
  'otp': () => import('./engines/otp'),
  'sha-256': () => import('./engines/sha256'),
  'sha-1': () => import('./engines/sha1'),
  'sha-3': () => import('./engines/sha3'),
  'md5': () => import('./engines/md5'),
  'blake2': () => import('./engines/blake2'),
  'rsa': () => import('./engines/rsa'),
  'ecc': () => import('./engines/ecc'),
  'dsa': () => import('./engines/dsa'),
  'diffie-hellman': () => import('./engines/diffie-hellman'),
  'x25519': () => import('./engines/x25519'),
  'hmac': () => import('./engines/hmac'),
  'poly1305': () => import('./engines/poly1305'),
  'pbkdf2': () => import('./engines/pbkdf2'),
  'scrypt': () => import('./engines/scrypt'),
  'argon2': () => import('./engines/argon2'),
  'hkdf': () => import('./engines/hkdf'),
};

// Static metadata for catalog display (avoids loading all engines)
export interface AlgorithmCatalogEntry {
  id: string;
  name: string;
  category: AlgorithmCategory;
  description: string;
  keySize: number | string;
  blockSize?: number;
  yearIntroduced: number;
  authors: string;
  status: 'standard' | 'recommended' | 'legacy' | 'deprecated' | 'theoretical';
  standardBody?: string;
  color: string;
  icon: string;
}

export const algorithmCatalog: AlgorithmCatalogEntry[] = [
  // Block Ciphers
  { id: 'aes', name: 'AES', category: 'block-cipher', description: 'Advanced Encryption Standard. The most widely used symmetric encryption algorithm. Selected by NIST in 2001 after a 5-year competition.', keySize: 128, blockSize: 128, yearIntroduced: 2001, authors: 'Daemen, Rijmen', status: 'standard', standardBody: 'NIST FIPS 197', color: '#3b82f6', icon: '🛡️' },
  { id: 'des', name: 'DES', category: 'block-cipher', description: 'Data Encryption Standard. Once the dominant encryption algorithm, now deprecated due to 56-bit key vulnerability to brute force.', keySize: 56, blockSize: 64, yearIntroduced: 1975, authors: 'IBM / NSA', status: 'deprecated', standardBody: 'FIPS 46-3', color: '#ef4444', icon: '🏛️' },
  { id: 'triple-des', name: 'Triple DES (3DES)', category: 'block-cipher', description: 'Applies DES three times with different keys (EDE mode). Provides 112-bit effective security.', keySize: 168, blockSize: 64, yearIntroduced: 1995, authors: 'IBM', status: 'legacy', standardBody: 'NIST SP 800-67', color: '#f97316', icon: '🔐' },
  { id: 'blowfish', name: 'Blowfish', category: 'block-cipher', description: 'Symmetric cipher with key-dependent S-boxes and 16-round Feistel network. Fast and unpatented.', keySize: '32-448', blockSize: 64, yearIntroduced: 1993, authors: 'Bruce Schneier', status: 'legacy', color: '#0ea5e9', icon: '🐡' },
  { id: 'twofish', name: 'Twofish', category: 'block-cipher', description: 'AES finalist using key-dependent S-boxes, MDS matrix, and PHT. Schneier\'s successor to Blowfish.', keySize: '128-256', blockSize: 128, yearIntroduced: 1998, authors: 'Schneier, et al.', status: 'recommended', color: '#059669', icon: '🐠' },
  { id: 'camellia', name: 'Camellia', category: 'block-cipher', description: 'Japanese block cipher with security comparable to AES. Approved by ISO/IEC, NESSIE, and CRYPTREC.', keySize: '128-256', blockSize: 128, yearIntroduced: 2000, authors: 'Mitsubishi / NTT', status: 'standard', standardBody: 'RFC 3713', color: '#db2777', icon: '🌸' },
  { id: 'serpent', name: 'Serpent', category: 'block-cipher', description: 'AES finalist with 32 rounds for maximum security. Conservative design prioritizing security over speed.', keySize: '128-256', blockSize: 128, yearIntroduced: 1998, authors: 'Anderson, Biham, Knudsen', status: 'recommended', color: '#15803d', icon: '🐍' },
  { id: 'tea', name: 'TEA', category: 'block-cipher', description: 'Tiny Encryption Algorithm. Extremely simple (few lines of code) with 64 Feistel rounds using the golden ratio.', keySize: 128, blockSize: 64, yearIntroduced: 1994, authors: 'Wheeler, Needham', status: 'deprecated', color: '#78716c', icon: '🍵' },

  // Stream Ciphers
  { id: 'chacha20', name: 'ChaCha20', category: 'stream-cipher', description: 'Modern stream cipher used in TLS 1.3. ARX design with 20 rounds of quarter-round operations on 4×4 state matrix.', keySize: 256, blockSize: 512, yearIntroduced: 2008, authors: 'Daniel J. Bernstein', status: 'standard', standardBody: 'RFC 8439', color: '#8b5cf6', icon: '🌊' },
  { id: 'salsa20', name: 'Salsa20', category: 'stream-cipher', description: 'Predecessor to ChaCha20. ARX cipher selected for eSTREAM portfolio. Uses column and row quarter rounds.', keySize: 256, blockSize: 512, yearIntroduced: 2005, authors: 'Daniel J. Bernstein', status: 'recommended', standardBody: 'eSTREAM', color: '#e879f9', icon: '💃' },
  { id: 'rc4', name: 'RC4', category: 'stream-cipher', description: 'Once the most popular stream cipher (used in WEP, SSL). Now broken due to biases in keystream output.', keySize: '40-2048', yearIntroduced: 1987, authors: 'Ron Rivest', status: 'deprecated', color: '#6366f1', icon: '🔄' },
  { id: 'rabbit', name: 'Rabbit', category: 'stream-cipher', description: 'High-speed stream cipher using 8 coupled oscillators. Selected for eSTREAM software portfolio.', keySize: 128, yearIntroduced: 2003, authors: 'Boesgaard, et al.', status: 'recommended', standardBody: 'RFC 4503', color: '#14b8a6', icon: '🐇' },
  { id: 'otp', name: 'One-Time Pad', category: 'stream-cipher', description: 'The only mathematically proven unbreakable cipher. Requires truly random key as long as the message, used once.', keySize: 'message length', yearIntroduced: 1882, authors: 'Miller / Vernam', status: 'theoretical', color: '#eab308', icon: '🏆' },

  // Hash Functions
  { id: 'sha-256', name: 'SHA-256', category: 'hash-function', description: 'SHA-2 family member producing 256-bit digest. The backbone of Bitcoin and most digital signature schemes.', keySize: 'N/A', blockSize: 512, yearIntroduced: 2001, authors: 'NSA', status: 'standard', standardBody: 'FIPS 180-4', color: '#10b981', icon: '🔒' },
  { id: 'sha-1', name: 'SHA-1', category: 'hash-function', description: 'Produces 160-bit hash. Deprecated due to collision attacks (SHAttered, 2017). Still found in legacy systems.', keySize: 'N/A', blockSize: 512, yearIntroduced: 1995, authors: 'NSA', status: 'deprecated', standardBody: 'FIPS 180-1', color: '#f59e0b', icon: '⚠️' },
  { id: 'sha-3', name: 'SHA-3 (Keccak)', category: 'hash-function', description: 'Based on the Keccak sponge construction, fundamentally different from SHA-1/2. Uses 5×5 state matrix with 24 rounds.', keySize: 'N/A', blockSize: 1088, yearIntroduced: 2012, authors: 'Bertoni, Daemen, et al.', status: 'standard', standardBody: 'FIPS 202', color: '#22c55e', icon: '🧽' },
  { id: 'md5', name: 'MD5', category: 'hash-function', description: '128-bit hash function. Cryptographically broken since 2004 (collision attacks). Still used for non-security checksums.', keySize: 'N/A', blockSize: 512, yearIntroduced: 1991, authors: 'Ronald Rivest', status: 'deprecated', standardBody: 'RFC 1321', color: '#f43f5e', icon: '💔' },
  { id: 'blake2', name: 'BLAKE2', category: 'hash-function', description: 'Faster than MD5 yet secure as SHA-3. Based on ChaCha stream cipher core. Used in WireGuard, libsodium.', keySize: 'N/A', blockSize: 512, yearIntroduced: 2012, authors: 'Aumasson, et al.', status: 'recommended', standardBody: 'RFC 7693', color: '#6366f1', icon: '⚡' },

  // Asymmetric
  { id: 'rsa', name: 'RSA', category: 'asymmetric', description: 'The first practical public-key cryptosystem. Based on the difficulty of factoring large numbers. Foundation of internet security.', keySize: '1024-4096', yearIntroduced: 1977, authors: 'Rivest, Shamir, Adleman', status: 'standard', standardBody: 'PKCS#1', color: '#f59e0b', icon: '🔑' },
  { id: 'ecc', name: 'ECC (Elliptic Curve)', category: 'asymmetric', description: 'Uses elliptic curves over finite fields. 256-bit ECC key = 3072-bit RSA key. Used in TLS, Bitcoin, Signal.', keySize: '256-521', yearIntroduced: 1985, authors: 'Miller, Koblitz', status: 'standard', standardBody: 'NIST / SEC', color: '#a855f7', icon: '📐' },
  { id: 'dsa', name: 'DSA', category: 'asymmetric', description: 'Digital Signature Algorithm. NIST standard for digital signatures based on discrete logarithm problem.', keySize: '1024-3072', yearIntroduced: 1991, authors: 'NIST / David Kravitz', status: 'legacy', standardBody: 'FIPS 186', color: '#f43f5e', icon: '✍️' },

  // Key Exchange
  { id: 'diffie-hellman', name: 'Diffie-Hellman', category: 'key-exchange', description: 'The first published key exchange protocol. Allows two parties to establish a shared secret over an insecure channel.', keySize: '2048+', yearIntroduced: 1976, authors: 'Diffie, Hellman', status: 'standard', color: '#ec4899', icon: '🤝' },
  { id: 'x25519', name: 'X25519', category: 'key-exchange', description: 'Elliptic curve Diffie-Hellman using Curve25519. Used in Signal, TLS 1.3, WireGuard, SSH.', keySize: 256, yearIntroduced: 2006, authors: 'Daniel J. Bernstein', status: 'standard', standardBody: 'RFC 7748', color: '#06b6d4', icon: '🔗' },

  // MAC
  { id: 'hmac', name: 'HMAC', category: 'mac', description: 'Hash-based Message Authentication Code. Combines a hash function with a secret key for message integrity and authentication.', keySize: 'variable', yearIntroduced: 1996, authors: 'Bellare, Canetti, Krawczyk', status: 'standard', standardBody: 'RFC 2104', color: '#06b6d4', icon: '✅' },
  { id: 'poly1305', name: 'Poly1305', category: 'mac', description: 'One-time authenticator using polynomial evaluation over GF(2^130-5). Paired with ChaCha20 in TLS 1.3.', keySize: 256, yearIntroduced: 2005, authors: 'Daniel J. Bernstein', status: 'standard', standardBody: 'RFC 8439', color: '#14b8a6', icon: '🔏' },

  // Key Derivation
  { id: 'pbkdf2', name: 'PBKDF2', category: 'key-derivation', description: 'Password-Based Key Derivation Function 2. Applies HMAC iteratively to derive cryptographic keys from passwords.', keySize: 'variable', yearIntroduced: 2000, authors: 'RSA Laboratories', status: 'standard', standardBody: 'RFC 2898', color: '#ef4444', icon: '⚙️' },
  { id: 'scrypt', name: 'scrypt', category: 'key-derivation', description: 'Memory-hard KDF designed to resist hardware attacks. Used in Litecoin and many password storage systems.', keySize: 'variable', yearIntroduced: 2009, authors: 'Colin Percival', status: 'recommended', standardBody: 'RFC 7914', color: '#f97316', icon: '🧱' },
  { id: 'argon2', name: 'Argon2', category: 'key-derivation', description: 'Winner of the Password Hashing Competition. Three variants (d/i/id) with configurable memory, time, parallelism.', keySize: 'variable', yearIntroduced: 2015, authors: 'Biryukov, et al.', status: 'standard', standardBody: 'RFC 9106', color: '#8b5cf6', icon: '🏅' },
  { id: 'hkdf', name: 'HKDF', category: 'key-derivation', description: 'HMAC-based Extract-and-Expand KDF. Used in TLS 1.3 for deriving multiple keys from a shared secret.', keySize: 'variable', yearIntroduced: 2010, authors: 'Hugo Krawczyk', status: 'standard', standardBody: 'RFC 5869', color: '#0ea5e9', icon: '🔑' },
];

const engineCache = new Map<string, AlgorithmEngine>();

export async function loadEngine(id: string): Promise<AlgorithmEngine | null> {
  if (engineCache.has(id)) return engineCache.get(id)!;
  const loader = engineLoaders[id];
  if (!loader) return null;
  try {
    const module = await loader();
    engineCache.set(id, module.default);
    return module.default;
  } catch (e) {
    console.error(`Failed to load engine for ${id}:`, e);
    return null;
  }
}

export function getAlgorithmsByCategory(category?: AlgorithmCategory): AlgorithmCatalogEntry[] {
  if (!category) return algorithmCatalog;
  return algorithmCatalog.filter(a => a.category === category);
}

export function getAlgorithmById(id: string): AlgorithmCatalogEntry | undefined {
  return algorithmCatalog.find(a => a.id === id);
}
