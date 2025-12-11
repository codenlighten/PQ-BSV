/**
 * Main entry point for pq-bsv
 */

// Key generation
const {
  PQAlgorithm,
  KeySizes,
  generatePQKeyPair,
  generateMLDSAKeyPair,
  generateSLHDSAKeyPair,
  deriveHierarchicalKeys,
  createHybridKeyBundle,
  exportKey,
  importKey
} = require('./keys/pq-keygen');

const {
  generateECDSAKeyPair,
  importECDSAPrivateKey,
  exportECDSAPrivateKeyHex
} = require('./keys/ecdsa-keys');

// Script templates
const {
  OP,
  createHybridECDSAMLDSAScript,
  createMLDSAOnlyScript,
  createSLHDSAOnlyScript,
  createMultiAlgMultisig,
  createHybridUnlockingScript,
  estimateTransactionSize
} = require('./scripts/templates');

// Signatures
const {
  signMLDSA,
  verifyMLDSA,
  signSLHDSA,
  verifySLHDSA,
  signECDSA,
  verifyECDSA,
  signHybrid,
  verifyHybrid,
  batchSign,
  batchVerify
} = require('./signatures/signing');

// Migration tools
const {
  planUTXOSweep,
  generateHybridAddresses,
  estimateMigrationCost,
  createMigrationTimeline,
  validateMigrationReadiness
} = require('./migration/sweep');

module.exports = {
  // Constants
  PQAlgorithm,
  KeySizes,
  OP,
  
  // Key generation
  generatePQKeyPair,
  generateMLDSAKeyPair,
  generateSLHDSAKeyPair,
  generateECDSAKeyPair,
  createHybridKeyBundle,
  deriveHierarchicalKeys,
  
  // Key import/export
  importKey,
  exportKey,
  importECDSAPrivateKey,
  exportECDSAPrivateKeyHex,
  
  // Script templates
  createHybridECDSAMLDSAScript,
  createMLDSAOnlyScript,
  createSLHDSAOnlyScript,
  createMultiAlgMultisig,
  createHybridUnlockingScript,
  
  // Signatures
  signMLDSA,
  verifyMLDSA,
  signSLHDSA,
  verifySLHDSA,
  signECDSA,
  verifyECDSA,
  signHybrid,
  verifyHybrid,
  batchSign,
  batchVerify,
  
  // Migration
  planUTXOSweep,
  generateHybridAddresses,
  estimateMigrationCost,
  createMigrationTimeline,
  validateMigrationReadiness,
  
  // Utilities
  estimateTransactionSize
};
