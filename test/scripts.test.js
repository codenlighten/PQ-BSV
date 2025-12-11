/**
 * Tests for script templates
 */

const {
  createHybridECDSAMLDSAScript,
  createMLDSAOnlyScript,
  createSLHDSAOnlyScript,
  estimateTransactionSize,
  OP
} = require('../src/scripts/templates');

const { generateMLDSAKeyPair } = require('../src/keys/pq-keygen');

describe('Script Templates', () => {
  let ecdsaPubKey;
  let mldsaPubKey;
  let slhdsaPubKey;

  beforeAll(() => {
    // Mock ECDSA public key (33 bytes compressed)
    ecdsaPubKey = Buffer.concat([
      Buffer.from([0x02]), // Compressed prefix
      Buffer.alloc(32, 0xaa) // Mock key data
    ]);

    // Generate actual-size PQ keys
    const mldsaKeys = generateMLDSAKeyPair('44');
    mldsaPubKey = mldsaKeys.publicKey;

    const slhdsaKeys = generateMLDSAKeyPair('44'); // Using ML-DSA as mock for size
    slhdsaPubKey = slhdsaKeys.publicKey.slice(0, 32); // SLH-DSA-128 is 32 bytes
  });

  describe('createHybridECDSAMLDSAScript', () => {
    test('should create hybrid script with correct structure', () => {
      const script = createHybridECDSAMLDSAScript(ecdsaPubKey, mldsaPubKey);

      expect(script.type).toBe('hybrid-ecdsa-mldsa');
      expect(script.bytecode).toBeInstanceOf(Buffer);
      expect(script.asm).toContain('OP_IF');
      expect(script.asm).toContain('OP_CHECKSIG');
      expect(script.asm).toContain('OP_ELSE');
      expect(script.asm).toContain('OP_CHECKSIG_MLDSA');
      expect(script.asm).toContain('OP_ENDIF');
      expect(script.algorithms).toContain('ECDSA-secp256k1');
    });

    test('should throw error for invalid ECDSA key length', () => {
      const invalidKey = Buffer.alloc(32); // Should be 33 bytes
      expect(() => createHybridECDSAMLDSAScript(invalidKey, mldsaPubKey)).toThrow();
    });

    test('should have reasonable script size', () => {
      const script = createHybridECDSAMLDSAScript(ecdsaPubKey, mldsaPubKey);
      
      // Script should be larger than just the keys due to opcodes
      expect(script.size).toBeGreaterThan(ecdsaPubKey.length + mldsaPubKey.length);
      expect(script.size).toBeLessThan(ecdsaPubKey.length + mldsaPubKey.length + 50);
    });
  });

  describe('createMLDSAOnlyScript', () => {
    test('should create ML-DSA only script', () => {
      const script = createMLDSAOnlyScript(mldsaPubKey);

      expect(script.type).toBe('mldsa-only');
      expect(script.bytecode).toBeInstanceOf(Buffer);
      expect(script.asm).toContain('OP_CHECKSIG_MLDSA');
      expect(script.algorithms).toContain('ML-DSA');
    });

    test('should have script size close to pubkey size', () => {
      const script = createMLDSAOnlyScript(mldsaPubKey);
      
      // Script size = pubkey + length encoding + opcode
      expect(script.size).toBeGreaterThan(mldsaPubKey.length);
      expect(script.size).toBeLessThan(mldsaPubKey.length + 10);
    });
  });

  describe('createSLHDSAOnlyScript', () => {
    test('should create SLH-DSA only script', () => {
      const script = createSLHDSAOnlyScript(slhdsaPubKey);

      expect(script.type).toBe('slhdsa-only');
      expect(script.bytecode).toBeInstanceOf(Buffer);
      expect(script.asm).toContain('OP_CHECKSIG_SLHDSA');
      expect(script.algorithms).toContain('SLH-DSA');
    });
  });

  describe('estimateTransactionSize', () => {
    test('should estimate ECDSA transaction size', () => {
      const estimate = estimateTransactionSize(1, 2, 'ecdsa');

      expect(estimate.totalBytes).toBeGreaterThan(0);
      expect(estimate.signatureBytes).toBe(72); // ECDSA signature size
      expect(estimate.multiplierVsECDSA).toBe('1.00');
    });

    test('should estimate ML-DSA-44 transaction size', () => {
      const estimate = estimateTransactionSize(1, 2, 'mldsa-44');

      expect(estimate.totalBytes).toBeGreaterThan(0);
      expect(estimate.signatureBytes).toBe(2420); // ML-DSA-44 signature size
      expect(parseFloat(estimate.multiplierVsECDSA)).toBeGreaterThan(1);
    });

    test('should show ML-DSA is larger than ECDSA', () => {
      const ecdsaEst = estimateTransactionSize(1, 2, 'ecdsa');
      const mldsaEst = estimateTransactionSize(1, 2, 'mldsa-44');

      expect(mldsaEst.totalBytes).toBeGreaterThan(ecdsaEst.totalBytes);
      expect(mldsaEst.estimatedFee).toBeGreaterThan(ecdsaEst.estimatedFee);
    });

    test('should scale with number of inputs', () => {
      const tx1 = estimateTransactionSize(1, 2, 'mldsa-44');
      const tx2 = estimateTransactionSize(2, 2, 'mldsa-44');

      expect(tx2.totalBytes).toBeGreaterThan(tx1.totalBytes);
      expect(tx2.signatureBytes).toBe(tx1.signatureBytes * 2);
    });

    test('should handle different PQ algorithms', () => {
      const mldsa44 = estimateTransactionSize(1, 1, 'mldsa-44');
      const mldsa65 = estimateTransactionSize(1, 1, 'mldsa-65');
      const slhdsa = estimateTransactionSize(1, 1, 'slhdsa-128s');

      expect(mldsa65.totalBytes).toBeGreaterThan(mldsa44.totalBytes);
      expect(slhdsa.totalBytes).toBeGreaterThan(mldsa65.totalBytes);
    });
  });

  describe('Opcodes', () => {
    test('should have standard opcodes defined', () => {
      expect(OP.OP_IF).toBe(0x63);
      expect(OP.OP_ELSE).toBe(0x67);
      expect(OP.OP_ENDIF).toBe(0x68);
      expect(OP.OP_CHECKSIG).toBe(0xac);
    });

    test('should have proposed PQ opcodes', () => {
      expect(OP.OP_CHECKSIG_MLDSA).toBeDefined();
      expect(OP.OP_CHECKSIG_SLHDSA).toBeDefined();
      expect(OP.OP_CHECKSIG_ALG).toBeDefined();
    });
  });
});
