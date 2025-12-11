# PQ-BSV API Documentation

## Table of Contents

- [Key Generation](#key-generation)
- [Script Templates](#script-templates)
- [Utilities](#utilities)

---

## Key Generation

### `generateMLDSAKeyPair(securityLevel, seed)`

Generate an ML-DSA (CRYSTALS-Dilithium) key pair.

**Parameters:**
- `securityLevel` (string): Security level - '44', '65', or '87' (default: '44')
- `seed` (Buffer, optional): Seed for deterministic generation

**Returns:** Object with:
- `algorithm` (string): Algorithm identifier
- `publicKey` (Buffer): Public key bytes
- `privateKey` (Buffer): Private key bytes
- `metadata` (Object): Key metadata

**Example:**
```javascript
const keys = generateMLDSAKeyPair('44');
console.log(`Public key size: ${keys.publicKey.length} bytes`);
```

---

### `generateSLHDSAKeyPair(variant, seed)`

Generate an SLH-DSA (SPHINCS+) key pair.

**Parameters:**
- `variant` (string): Variant - '128s', '128f', or '256s' (default: '128s')
- `seed` (Buffer, optional): Seed for deterministic generation

**Returns:** Object with key pair and metadata (same structure as ML-DSA)

**Example:**
```javascript
const keys = generateSLHDSAKeyPair('128s');
```

---

### `generateECDSAKeyPair()`

Generate a standard ECDSA key pair for BSV using secp256k1.

**Returns:** Object with:
- `privateKey` (Buffer): Private key bytes
- `publicKey` (Buffer): Public key bytes (compressed, 33 bytes)
- `privKey` (PrivateKey): @smartledger/keys PrivateKey object
- `pubKey` (PublicKey): @smartledger/keys PublicKey object
- `address` (string): BSV address

**Example:**
```javascript
const keys = generateECDSAKeyPair();
console.log(`Address: ${keys.address}`);
```

---

### `createHybridKeyBundle(ecdsaKeys, pqAlgorithm, seed)`

Create a hybrid key bundle containing both ECDSA and PQ keys.

**Parameters:**
- `ecdsaKeys` (Object): ECDSA key pair from `generateECDSAKeyPair()`
- `pqAlgorithm` (string): PQ algorithm to use (default: 'ML-DSA-44')
- `seed` (Buffer, optional): Seed for PQ key generation

**Returns:** Object with:
- `type` (string): 'hybrid'
- `ecdsa` (Object): ECDSA keys and address
- `pq` (Object): PQ key pair
- `metadata` (Object): Bundle metadata

**Example:**
```javascript
const ecdsaKeys = generateECDSAKeyPair();
const bundle = createHybridKeyBundle(ecdsaKeys, PQAlgorithm.ML_DSA_44);
```

---

### `deriveHierarchicalKeys(masterSeed, derivations)`

Derive multiple PQ key pairs from a single master seed (BIP32-style).

**Parameters:**
- `masterSeed` (Buffer): Master seed (minimum 32 bytes)
- `derivations` (Array): Array of `{path: string, algorithm: string}` objects

**Returns:** Object with derived keys indexed by path

**Example:**
```javascript
const masterSeed = crypto.randomBytes(64);
const derivations = [
  { path: "m/44'/0'/0'/0/0", algorithm: PQAlgorithm.ML_DSA_44 },
  { path: "m/44'/0'/0'/0/1", algorithm: PQAlgorithm.ML_DSA_44 },
];
const keys = deriveHierarchicalKeys(masterSeed, derivations);
```

---

## Script Templates

### `createHybridECDSAMLDSAScript(ecdsaPubKey, mldsaPubKey)`

Create a hybrid locking script that accepts either ECDSA or ML-DSA signatures.

**Parameters:**
- `ecdsaPubKey` (Buffer): ECDSA public key (33 bytes compressed)
- `mldsaPubKey` (Buffer): ML-DSA public key

**Returns:** Object with:
- `type` (string): 'hybrid-ecdsa-mldsa'
- `asm` (string): Human-readable script
- `bytecode` (Buffer): Script bytecode
- `size` (number): Script size in bytes
- `algorithms` (Array): Supported algorithms

**Example:**
```javascript
const script = createHybridECDSAMLDSAScript(
  ecdsaKeys.publicKey,
  mldsaKeys.publicKey
);
console.log(`Script size: ${script.size} bytes`);
```

---

### `createMLDSAOnlyScript(mldsaPubKey)`

Create a pure ML-DSA locking script.

**Parameters:**
- `mldsaPubKey` (Buffer): ML-DSA public key

**Returns:** Script object (same structure as hybrid)

---

### `createSLHDSAOnlyScript(slhdsaPubKey)`

Create a pure SLH-DSA locking script.

**Parameters:**
- `slhdsaPubKey` (Buffer): SLH-DSA public key

**Returns:** Script object (same structure as hybrid)

---

### `createMultiAlgMultisig(threshold, pubKeys)`

Create a multi-algorithm multisig script (k-of-n).

**Parameters:**
- `threshold` (number): Required signatures (k)
- `pubKeys` (Array): Array of `{type: 'ecdsa'|'mldsa'|'slhdsa', key: Buffer}` objects

**Returns:** Script object with multisig configuration

**Example:**
```javascript
const script = createMultiAlgMultisig(2, [
  { type: 'ecdsa', key: ecdsaPubKey },
  { type: 'mldsa', key: mldsaPubKey },
  { type: 'slhdsa', key: slhdsaPubKey }
]);
```

---

## Utilities

### `estimateTransactionSize(inputs, outputs, signatureType)`

Estimate the size and fee of a transaction with PQ signatures.

**Parameters:**
- `inputs` (number): Number of inputs
- `outputs` (number): Number of outputs
- `signatureType` (string): 'ecdsa', 'mldsa-44', 'mldsa-65', 'mldsa-87', 'slhdsa-128s', etc.

**Returns:** Object with:
- `totalBytes` (number): Total transaction size
- `signatureBytes` (number): Total signature size
- `overhead` (number): Non-signature overhead
- `multiplierVsECDSA` (string): Size multiplier vs ECDSA
- `estimatedFee` (number): Estimated fee in satoshis

**Example:**
```javascript
const estimate = estimateTransactionSize(1, 2, 'mldsa-44');
console.log(`Size: ${estimate.totalBytes} bytes`);
console.log(`Fee: ${estimate.estimatedFee} sats`);
console.log(`${estimate.multiplierVsECDSA}x larger than ECDSA`);
```

---

### `exportKey(key, format)`

Export a key to various formats.

**Parameters:**
- `key` (Buffer): Key to export
- `format` (string): 'hex', 'base64', or 'buffer' (default: 'hex')

**Returns:** Key in specified format

---

### `importKey(keyData, format)`

Import a key from various formats.

**Parameters:**
- `keyData` (string|Buffer): Key data
- `format` (string): 'hex', 'base64', or 'buffer' (default: 'hex')

**Returns:** Buffer containing key bytes

---

## Constants

### `PQAlgorithm`

Enum of supported PQ algorithms:
- `ML_DSA_44`: ML-DSA with ~128-bit security
- `ML_DSA_65`: ML-DSA with ~192-bit security
- `ML_DSA_87`: ML-DSA with ~256-bit security
- `SLH_DSA_128S`: SLH-DSA 128-bit, small signature
- `SLH_DSA_128F`: SLH-DSA 128-bit, fast
- `SLH_DSA_256S`: SLH-DSA 256-bit, small signature

### `KeySizes`

Object mapping algorithms to their key and signature sizes:
```javascript
{
  'ML-DSA-44': { publicKey: 1312, privateKey: 2560, signature: 2420 },
  'ML-DSA-65': { publicKey: 1952, privateKey: 4032, signature: 3309 },
  // ... etc
}
```

### `OP`

BSV Script opcodes, including proposed PQ opcodes:
- Standard: `OP_IF`, `OP_ELSE`, `OP_ENDIF`, `OP_CHECKSIG`, etc.
- Proposed PQ: `OP_CHECKSIG_MLDSA`, `OP_CHECKSIG_SLHDSA`, `OP_CHECKSIG_ALG`
