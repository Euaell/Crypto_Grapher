import { EncryptionAlgorithm } from "./crypto/encryption-service";

export interface AlgorithmStat {
    algorithm: EncryptionAlgorithm;
    speed: number; // ms to encrypt
    security: number; // 0-100 rating
    complexity: number; // 0-100 implementation complexity
    keySize: number; // in bits
    yearIntroduced: number;
    standardStatus: string;
}

 // Base algorithm stats (these would ideally come from a backend service)
export const baseStats: AlgorithmStat[] = [
    {
      algorithm: EncryptionAlgorithm.AES,
      speed: 5, // Relative speed metric
      security: 95,
      complexity: 80,
      keySize: 256,
      yearIntroduced: 2001,
      standardStatus: 'NIST Standard'
    },
    {
      algorithm: EncryptionAlgorithm.DES,
      speed: 10,
      security: 40, // Considered weak today
      complexity: 65,
      keySize: 56,
      yearIntroduced: 1975,
      standardStatus: 'Deprecated'
    },
    {
      algorithm: EncryptionAlgorithm.TripleDES,
      speed: 15,
      security: 70,
      complexity: 70,
      keySize: 168,
      yearIntroduced: 1995,
      standardStatus: 'Legacy'
    },
    {
      algorithm: EncryptionAlgorithm.RC4,
      speed: 3,
      security: 30, // Considered broken
      complexity: 50,
      keySize: 128,
      yearIntroduced: 1987,
      standardStatus: 'Deprecated'
    },
    {
      algorithm: EncryptionAlgorithm.Rabbit,
      speed: 2,
      security: 75,
      complexity: 60,
      keySize: 128,
      yearIntroduced: 2003,
      standardStatus: 'eSTREAM Portfolio'
    },
    {
      algorithm: EncryptionAlgorithm.OTP,
      speed: 1,
      security: 100, // Theoretically unbreakable if used correctly
      complexity: 30,
      keySize: Infinity, // Key must be as long as the message
      yearIntroduced: 1882,
      standardStatus: 'Theoretical'
    },
    {
      algorithm: EncryptionAlgorithm.BLOWFISH,
      speed: 6,
      security: 70,
      complexity: 65,
      keySize: 448,
      yearIntroduced: 1993,
      standardStatus: 'Public Domain'
    },
    {
      algorithm: EncryptionAlgorithm.ChaCha20,
      speed: 2,
      security: 90,
      complexity: 75,
      keySize: 256,
      yearIntroduced: 2008,
      standardStatus: 'RFC 8439'
    }
];
