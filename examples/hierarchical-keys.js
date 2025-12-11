/**
 * Advanced Example - Hierarchical Key Derivation
 * 
 * Demonstrates deriving multiple PQ keys from a single master seed
 * (BSV's answer to PQ-aware BIP32)
 */

const crypto = require('crypto');
const {
  deriveHierarchicalKeys,
  PQAlgorithm,
  exportKey
} = require('../src/index');

console.log('=== Hierarchical PQ Key Derivation Example ===\n');

// Generate a master seed (in production, this would come from a secure source)
const masterSeed = crypto.randomBytes(64);
console.log('Master Seed (hex):');
console.log(masterSeed.toString('hex').substring(0, 64) + '...\n');

// Define derivation paths and algorithms
const derivations = [
  { path: "m/44'/0'/0'/0/0", algorithm: PQAlgorithm.ML_DSA_44 },  // First receive address
  { path: "m/44'/0'/0'/0/1", algorithm: PQAlgorithm.ML_DSA_44 },  // Second receive address
  { path: "m/44'/0'/0'/1/0", algorithm: PQAlgorithm.ML_DSA_44 },  // First change address
  { path: "m/84'/0'/0'/0/0", algorithm: PQAlgorithm.SLH_DSA_128S }, // High-security cold storage
  { path: "m/84'/0'/0'/0/1", algorithm: PQAlgorithm.ML_DSA_65 },  // Enhanced security
];

console.log('Deriving keys for the following paths:\n');
derivations.forEach(d => {
  console.log(`  ${d.path} -> ${d.algorithm}`);
});

console.log('\nDeriving keys...\n');
const derivedKeys = deriveHierarchicalKeys(masterSeed, derivations);

// Display derived keys
Object.entries(derivedKeys).forEach(([path, keyPair]) => {
  console.log(`Path: ${path}`);
  console.log(`  Algorithm: ${keyPair.algorithm}`);
  console.log(`  Public Key: ${exportKey(keyPair.publicKey, 'hex').substring(0, 40)}...`);
  console.log(`  Public Key Size: ${keyPair.publicKey.length} bytes`);
  console.log(`  Private Key Size: ${keyPair.privateKey.length} bytes`);
  console.log();
});

console.log('=== Hierarchical Derivation Complete ===\n');
console.log('Key Points:');
console.log('  • Single master seed derives all PQ keys');
console.log('  • Different algorithms can be used per derivation path');
console.log('  • Deterministic: same seed + path = same keys');
console.log('  • Enables backup and recovery of entire wallet from one seed');
console.log('  • Compatible with hardware wallet implementations\n');
