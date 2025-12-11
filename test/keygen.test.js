/**
 * Tests for PQ key generation
 */

const {
  generateMLDSAKeyPair,
  generateSLHDSAKeyPair,
  generatePQKeyPair,
  PQAlgorithm,
  KeySizes,
  deriveHierarchicalKeys,
  exportKey,
  importKey
} = require('../src/keys/pq-keygen');

describe('PQ Key Generation', () => {
  describe('generateMLDSAKeyPair', () => {
    test('should generate ML-DSA-44 key pair with correct sizes', () => {
      const keys = generateMLDSAKeyPair('44');
      
      expect(keys.algorithm).toBe('ML-DSA-44');
      expect(keys.publicKey).toBeInstanceOf(Buffer);
      expect(keys.privateKey).toBeInstanceOf(Buffer);
      expect(keys.publicKey.length).toBe(KeySizes['ML-DSA-44'].publicKey);
      expect(keys.privateKey.length).toBe(KeySizes['ML-DSA-44'].privateKey);
    });

    test('should generate ML-DSA-65 key pair with correct sizes', () => {
      const keys = generateMLDSAKeyPair('65');
      
      expect(keys.algorithm).toBe('ML-DSA-65');
      expect(keys.publicKey.length).toBe(KeySizes['ML-DSA-65'].publicKey);
      expect(keys.privateKey.length).toBe(KeySizes['ML-DSA-65'].privateKey);
    });

    test('should generate ML-DSA-87 key pair with correct sizes', () => {
      const keys = generateMLDSAKeyPair('87');
      
      expect(keys.algorithm).toBe('ML-DSA-87');
      expect(keys.publicKey.length).toBe(KeySizes['ML-DSA-87'].publicKey);
      expect(keys.privateKey.length).toBe(KeySizes['ML-DSA-87'].privateKey);
    });

    test('should throw error for invalid security level', () => {
      expect(() => generateMLDSAKeyPair('99')).toThrow();
    });

    test('should generate deterministic keys from seed', () => {
      const seed = Buffer.from('test-seed-12345');
      const keys1 = generateMLDSAKeyPair('44', seed);
      const keys2 = generateMLDSAKeyPair('44', seed);
      
      expect(keys1.publicKey.equals(keys2.publicKey)).toBe(true);
      expect(keys1.privateKey.equals(keys2.privateKey)).toBe(true);
    });
  });

  describe('generateSLHDSAKeyPair', () => {
    test('should generate SLH-DSA-128s key pair', () => {
      const keys = generateSLHDSAKeyPair('128s');
      
      expect(keys.algorithm).toBe('SLH-DSA-128s');
      expect(keys.publicKey.length).toBe(KeySizes['SLH-DSA-128s'].publicKey);
      expect(keys.privateKey.length).toBe(KeySizes['SLH-DSA-128s'].privateKey);
    });

    test('should generate SLH-DSA-128f key pair', () => {
      const keys = generateSLHDSAKeyPair('128f');
      
      expect(keys.algorithm).toBe('SLH-DSA-128f');
      expect(keys.publicKey.length).toBe(KeySizes['SLH-DSA-128f'].publicKey);
    });

    test('should throw error for invalid variant', () => {
      expect(() => generateSLHDSAKeyPair('invalid')).toThrow();
    });
  });

  describe('deriveHierarchicalKeys', () => {
    test('should derive multiple keys from master seed', () => {
      const masterSeed = Buffer.from('master-seed-for-testing-hierarchical-derivation');
      const derivations = [
        { path: "m/44'/0'/0'/0/0", algorithm: PQAlgorithm.ML_DSA_44 },
        { path: "m/44'/0'/0'/0/1", algorithm: PQAlgorithm.ML_DSA_44 },
      ];

      const derived = deriveHierarchicalKeys(masterSeed, derivations);

      expect(Object.keys(derived)).toHaveLength(2);
      expect(derived["m/44'/0'/0'/0/0"]).toBeDefined();
      expect(derived["m/44'/0'/0'/0/1"]).toBeDefined();
      expect(derived["m/44'/0'/0'/0/0"].algorithm).toBe('ML-DSA-44');
    });

    test('should derive different keys for different paths', () => {
      const masterSeed = Buffer.alloc(32, 'master-seed-unique-paths-with-enough-length');
      const derivations = [
        { path: "m/0", algorithm: PQAlgorithm.ML_DSA_44 },
        { path: "m/1", algorithm: PQAlgorithm.ML_DSA_44 },
      ];

      const derived = deriveHierarchicalKeys(masterSeed, derivations);

      expect(derived["m/0"].publicKey.equals(derived["m/1"].publicKey)).toBe(false);
    });

    test('should throw error for short master seed', () => {
      const shortSeed = Buffer.from('short');
      const derivations = [{ path: "m/0", algorithm: PQAlgorithm.ML_DSA_44 }];

      expect(() => deriveHierarchicalKeys(shortSeed, derivations)).toThrow();
    });
  });

  describe('Key Import/Export', () => {
    test('should export key to hex', () => {
      const key = Buffer.from('test-key');
      const exported = exportKey(key, 'hex');
      
      expect(typeof exported).toBe('string');
      expect(exported).toBe(key.toString('hex'));
    });

    test('should export key to base64', () => {
      const key = Buffer.from('test-key');
      const exported = exportKey(key, 'base64');
      
      expect(typeof exported).toBe('string');
      expect(exported).toBe(key.toString('base64'));
    });

    test('should import key from hex', () => {
      const original = Buffer.from('test-key');
      const hex = original.toString('hex');
      const imported = importKey(hex, 'hex');
      
      expect(imported.equals(original)).toBe(true);
    });

    test('should import key from base64', () => {
      const original = Buffer.from('test-key');
      const b64 = original.toString('base64');
      const imported = importKey(b64, 'base64');
      
      expect(imported.equals(original)).toBe(true);
    });

    test('should round-trip export/import', () => {
      const keys = generateMLDSAKeyPair('44');
      const exported = exportKey(keys.publicKey, 'hex');
      const imported = importKey(exported, 'hex');
      
      expect(imported.equals(keys.publicKey)).toBe(true);
    });
  });
});
