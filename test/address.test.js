/**
 * Tests for address utilities
 */

const {
  AddressType,
  encodeAddress,
  createP2PKHAddress,
  createP2SHAddress,
  createHybridAddress,
  createPQAddress,
  formatAddress,
  createPaymentURI,
  validateAddress,
  shortenAddress,
  groupAddressesByType,
  generateLabel
} = require('../src/utils/address');

const { generateECDSAKeyPair } = require('../src/keys/ecdsa-keys');
const { createHybridECDSAMLDSAScript } = require('../src/scripts/templates');
const { createHybridKeyBundle } = require('../src/keys/pq-keygen');

describe('Address Utilities', () => {
  describe('encodeAddress', () => {
    test('should encode mainnet P2PKH address', () => {
      const hash = Buffer.alloc(20);
      const address = encodeAddress(hash, 'mainnet', 'p2pkh');

      expect(address).toMatch(/^1/);
      expect(address.length).toBeGreaterThan(25);
    });

    test('should encode testnet P2PKH address', () => {
      const hash = Buffer.alloc(20);
      const address = encodeAddress(hash, 'testnet', 'p2pkh');

      expect(address).toMatch(/^[mn]/);
    });

    test('should encode P2SH address', () => {
      const hash = Buffer.alloc(20);
      const address = encodeAddress(hash, 'mainnet', 'p2sh');

      expect(address).toMatch(/^3/);
    });
  });

  describe('createP2PKHAddress', () => {
    test('should create P2PKH address from public key', () => {
      const keys = generateECDSAKeyPair();
      const address = createP2PKHAddress(keys.publicKey);

      expect(address.type).toBe(AddressType.P2PKH);
      expect(address.address).toMatch(/^1/);
      expect(address.scriptPubKey).toBeInstanceOf(Buffer);
      expect(address.hash160).toBeInstanceOf(Buffer);
    });
  });

  describe('createP2SHAddress', () => {
    test('should create P2SH address from script', () => {
      const redeemScript = Buffer.from('test script');
      const address = createP2SHAddress(redeemScript);

      expect(address.type).toBe(AddressType.P2SH);
      expect(address.address).toMatch(/^3/);
      expect(address.scriptPubKey).toBeInstanceOf(Buffer);
      expect(address.redeemScriptHash).toBeInstanceOf(Buffer);
    });
  });

  describe('createHybridAddress', () => {
    test('should create hybrid address', () => {
      const ecdsaKeys = generateECDSAKeyPair();
      const hybridKeys = createHybridKeyBundle(ecdsaKeys, 'ML-DSA-44');
      const hybridScript = createHybridECDSAMLDSAScript(
        ecdsaKeys.publicKey,
        hybridKeys.pq.publicKey
      );

      const address = createHybridAddress(hybridScript);

      expect(address.type).toBe(AddressType.HYBRID);
      expect(address.address).toMatch(/^3/);
      expect(address.algorithms).toContain('ECDSA-secp256k1');
      expect(address.algorithms).toContain('ML-DSA-44');
      expect(address.scriptType).toBe('hybrid-ecdsa-mldsa');
    });
  });

  describe('createPQAddress', () => {
    test('should create pure PQ address', () => {
      const ecdsaKeys = generateECDSAKeyPair();
      const hybridKeys = createHybridKeyBundle(ecdsaKeys, 'ML-DSA-44');

      const address = createPQAddress(hybridKeys.pq.publicKey, 'ML-DSA-44');

      expect(address.type).toBe(AddressType.ML_DSA);
      expect(address.address).toMatch(/^3/);
      expect(address.algorithm).toBe('ML-DSA-44');
    });
  });

  describe('formatAddress', () => {
    test('should format address with label', () => {
      const keys = generateECDSAKeyPair();
      const address = createP2PKHAddress(keys.publicKey);

      const formatted = formatAddress(address, { includeLabel: true });

      expect(formatted).toContain('p2pkh'.toUpperCase()); // Type is displayed uppercase
      expect(formatted).toContain(address.address);
    });

    test('should include QR code marker', () => {
      const keys = generateECDSAKeyPair();
      const address = createP2PKHAddress(keys.publicKey);

      const formatted = formatAddress(address, { includeQR: true });

      expect(formatted).toContain('[QR');
    });

    test('should include network', () => {
      const keys = generateECDSAKeyPair();
      const address = createP2PKHAddress(keys.publicKey);

      const formatted = formatAddress(address, { includeNetwork: true });

      expect(formatted).toContain('mainnet');
    });
  });

  describe('createPaymentURI', () => {
    test('should create payment URI', () => {
      const keys = generateECDSAKeyPair();
      const address = createP2PKHAddress(keys.publicKey);

      const uri = createPaymentURI(address.address);

      expect(uri).toMatch(/^bitcoin:/);
      expect(uri).toContain(address.address);
    });

    test('should include amount', () => {
      const uri = createPaymentURI('1'.repeat(34), { amount: 100000 });

      expect(uri).toContain('amount=0.001');
    });

    test('should include label', () => {
      const uri = createPaymentURI('1'.repeat(34), { label: 'Test Payment' });

      expect(uri).toContain('label=Test%20Payment');
    });
  });

  describe('validateAddress', () => {
    test('should validate correct address', () => {
      const keys = generateECDSAKeyPair();
      const address = createP2PKHAddress(keys.publicKey);

      const result = validateAddress(address.address);

      expect(result.valid).toBe(true);
      expect(result.network).toBe('mainnet');
      expect(result.type).toBe('p2pkh');
    });

    test('should detect invalid address', () => {
      const result = validateAddress('invalid');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('shortenAddress', () => {
    test('should shorten address', () => {
      const address = '1' + 'A'.repeat(33);
      const shortened = shortenAddress(address);

      expect(shortened.length).toBeLessThan(address.length);
      expect(shortened).toContain('...');
    });

    test('should use custom length', () => {
      const address = '1' + 'A'.repeat(33);
      const shortened = shortenAddress(address, 6);

      expect(shortened).toMatch(/^1AAAAA\.\.\.AAAAAA$/);
    });
  });

  describe('groupAddressesByType', () => {
    test('should group addresses by type', () => {
      const keys = generateECDSAKeyPair();
      const addresses = [
        createP2PKHAddress(keys.publicKey),
        createP2PKHAddress(keys.publicKey),
        createP2SHAddress(Buffer.from('script'))
      ];

      const grouped = groupAddressesByType(addresses);

      expect(grouped[AddressType.P2PKH]).toHaveLength(2);
      expect(grouped[AddressType.P2SH]).toHaveLength(1);
    });
  });

  describe('generateLabel', () => {
    test('should generate label for P2PKH', () => {
      const keys = generateECDSAKeyPair();
      const address = createP2PKHAddress(keys.publicKey);

      const label = generateLabel(address, 0);

      expect(label).toContain('ECDSA');
      expect(label).toContain('Address');
    });

    test('should generate label for hybrid', () => {
      const ecdsaKeys = generateECDSAKeyPair();
      const hybridKeys = createHybridKeyBundle(ecdsaKeys, 'ML-DSA-44');
      const hybridScript = createHybridECDSAMLDSAScript(
        ecdsaKeys.publicKey,
        hybridKeys.pq.publicKey
      );

      const address = createHybridAddress(hybridScript);
      const label = generateLabel(address, 0);

      expect(label).toContain('Hybrid');
      expect(label).toContain('ECDSA-secp256k1+ML-DSA-44'); // Full algorithm names with +
    });
  });
});
