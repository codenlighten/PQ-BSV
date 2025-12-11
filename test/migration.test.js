/**
 * Tests for migration tools
 */

const {
  planUTXOSweep,
  generateHybridAddresses,
  estimateMigrationCost,
  validateMigrationReadiness
} = require('../src/migration/sweep');

const { generateECDSAKeyPair } = require('../src/keys/ecdsa-keys');

describe('Migration Tools', () => {
  describe('planUTXOSweep', () => {
    test('should plan UTXO sweep in batches', () => {
      const utxos = Array.from({ length: 25 }, (_, i) => ({
        txid: `${'0'.repeat(60)}${i.toString().padStart(4, '0')}`,
        vout: 0,
        amount: 10000 + i * 1000,
        privKey: Buffer.alloc(32)
      }));

      const plan = planUTXOSweep(utxos, { batchSize: 10, feeRate: 0.5 });

      expect(plan.totalUTXOs).toBe(25);
      expect(plan.batches).toBe(3);
      expect(plan.targetAlgorithm).toBe('ML-DSA-44');
      expect(plan.details).toHaveLength(3);
      expect(plan.details[0].inputCount).toBe(10);
      expect(plan.details[2].inputCount).toBe(5);
    });

    test('should calculate fees correctly', () => {
      const utxos = Array.from({ length: 10 }, () => ({
        txid: '0'.repeat(64),
        vout: 0,
        amount: 10000,
        privKey: Buffer.alloc(32)
      }));

      const plan = planUTXOSweep(utxos, { batchSize: 10, feeRate: 0.5 });

      expect(plan.totalFees).toBeGreaterThan(0);
      expect(plan.details[0].estimatedFee).toBeGreaterThan(0);
      expect(plan.details[0].outputAmount).toBe(
        plan.details[0].totalInput - plan.details[0].estimatedFee
      );
    });
  });

  describe('generateHybridAddresses', () => {
    test('should generate hybrid addresses', () => {
      const ecdsaKeys = Array.from({ length: 3 }, () => generateECDSAKeyPair());
      
      const addresses = generateHybridAddresses(ecdsaKeys, 'ML-DSA-44');

      expect(addresses).toHaveLength(3);
      expect(addresses[0].hybridScript.type).toBe('hybrid-ecdsa-mldsa');
      expect(addresses[0].pqKeys.algorithm).toBe('ML-DSA-44');
      expect(addresses[0].scriptSize).toBeGreaterThan(1000);
    });

    test('should use different PQ keys for each address', () => {
      const ecdsaKeys = Array.from({ length: 2 }, () => generateECDSAKeyPair());
      
      const addresses = generateHybridAddresses(ecdsaKeys);

      expect(addresses[0].pqKeys.publicKey.equals(addresses[1].pqKeys.publicKey)).toBe(false);
    });
  });

  describe('estimateMigrationCost', () => {
    test('should estimate migration cost', () => {
      const estimate = estimateMigrationCost(50, 20000, { feeRate: 0.5 });

      expect(estimate.utxoCount).toBe(50);
      expect(estimate.batchCount).toBe(5);
      expect(estimate.totalValue).toBe(1000000);
      expect(estimate.phase1.totalFees).toBeGreaterThan(0);
      expect(estimate.phase2.totalFees).toBeGreaterThan(0);
      expect(estimate.total.fees).toBe(
        estimate.phase1.totalFees + estimate.phase2.totalFees
      );
    });

    test('should show percentage of value', () => {
      const estimate = estimateMigrationCost(100, 10000);

      expect(estimate.phase1.percentOfValue).toMatch(/%$/);
      expect(estimate.total.percentOfValue).toMatch(/%$/);
      expect(parseFloat(estimate.total.percentOfValue)).toBeLessThan(5);
    });
  });

  describe('validateMigrationReadiness', () => {
    test('should validate ready migration', () => {
      const utxos = Array.from({ length: 10 }, () => ({
        txid: '0'.repeat(64),
        vout: 0,
        amount: 50000,
        privKey: Buffer.alloc(32)
      }));

      const validation = validateMigrationReadiness(utxos);

      expect(validation.ready).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.stats.totalUTXOs).toBe(10);
      expect(validation.stats.worthMigrating).toBe(true);
    });

    test('should detect missing private keys', () => {
      const utxos = [
        { txid: '0'.repeat(64), vout: 0, amount: 10000 }, // Missing privKey
        { txid: '0'.repeat(64), vout: 0, amount: 10000, privKey: Buffer.alloc(32) }
      ];

      const validation = validateMigrationReadiness(utxos);

      expect(validation.ready).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('missing private keys');
    });

    test('should warn about dust UTXOs', () => {
      const utxos = [
        { txid: '0'.repeat(64), vout: 0, amount: 500, privKey: Buffer.alloc(32) },
        { txid: '0'.repeat(64), vout: 0, amount: 50000, privKey: Buffer.alloc(32) }
      ];

      const validation = validateMigrationReadiness(utxos, { minUTXOAmount: 1000 });

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('dust');
    });
  });
});
