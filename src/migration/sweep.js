/**
 * Migration Tools - UTXO Sweep and Key Transition
 * 
 * Tools to help users migrate from ECDSA-only to hybrid or PQ-only addresses
 */

const { generateMLDSAKeyPair } = require('../keys/pq-keygen');
const { createHybridECDSAMLDSAScript } = require('../scripts/templates');
const { estimateTransactionSize } = require('../scripts/templates');

/**
 * Plan a UTXO sweep from ECDSA addresses to hybrid addresses
 * 
 * @param {Array<Object>} utxos - Array of {txid, vout, amount, address, privKey}
 * @param {Object} options - Migration options
 * @returns {Object} Migration plan
 */
function planUTXOSweep(utxos, options = {}) {
  const {
    targetAlgorithm = 'ML-DSA-44',
    batchSize = 10,
    feeRate = 0.5 // sat/byte
  } = options;

  if (!Array.isArray(utxos) || utxos.length === 0) {
    throw new Error('No UTXOs provided');
  }

  // Group UTXOs into batches
  const batches = [];
  for (let i = 0; i < utxos.length; i += batchSize) {
    const batch = utxos.slice(i, i + batchSize);
    
    // Estimate transaction size
    const estimate = estimateTransactionSize(
      batch.length,
      1, // Single output (sweep to one hybrid address)
      'ecdsa' // Current UTXOs are ECDSA
    );

    const totalInput = batch.reduce((sum, utxo) => sum + utxo.amount, 0);
    const fee = Math.ceil(estimate.totalBytes * feeRate);
    const outputAmount = totalInput - fee;

    batches.push({
      utxos: batch,
      inputCount: batch.length,
      totalInput,
      estimatedSize: estimate.totalBytes,
      estimatedFee: fee,
      outputAmount,
      efficient: outputAmount > 0
    });
  }

  return {
    totalUTXOs: utxos.length,
    batches: batches.length,
    details: batches,
    totalInput: utxos.reduce((sum, u) => sum + u.amount, 0),
    totalFees: batches.reduce((sum, b) => sum + b.estimatedFee, 0),
    targetAlgorithm
  };
}

/**
 * Generate hybrid addresses for migration
 * 
 * @param {Array<Object>} ecdsaKeys - Array of ECDSA key pairs
 * @param {string} pqAlgorithm - PQ algorithm to use
 * @returns {Array<Object>} Hybrid addresses
 */
function generateHybridAddresses(ecdsaKeys, pqAlgorithm = 'ML-DSA-44') {
  if (!Array.isArray(ecdsaKeys) || ecdsaKeys.length === 0) {
    throw new Error('No ECDSA keys provided');
  }

  return ecdsaKeys.map((ecdsaKey, index) => {
    // Generate new PQ key
    const securityLevel = pqAlgorithm.split('-')[2];
    const pqKeys = generateMLDSAKeyPair(securityLevel);

    // Create hybrid script
    const script = createHybridECDSAMLDSAScript(
      ecdsaKey.publicKey,
      pqKeys.publicKey
    );

    return {
      index,
      ecdsaAddress: ecdsaKey.address,
      hybridScript: script,
      pqKeys: {
        publicKey: pqKeys.publicKey,
        privateKey: pqKeys.privateKey,
        algorithm: pqKeys.algorithm
      },
      scriptSize: script.size
    };
  });
}

/**
 * Estimate migration cost
 * 
 * @param {number} utxoCount - Number of UTXOs to migrate
 * @param {number} averageAmount - Average UTXO amount in satoshis
 * @param {Object} options - Cost estimation options
 * @returns {Object} Cost breakdown
 */
function estimateMigrationCost(utxoCount, averageAmount, options = {}) {
  const {
    feeRate = 0.5,
    batchSize = 10,
    targetAlgorithm = 'ML-DSA-44'
  } = options;

  const batchCount = Math.ceil(utxoCount / batchSize);
  const costs = [];

  for (let i = 0; i < batchCount; i++) {
    const utxosInBatch = Math.min(batchSize, utxoCount - (i * batchSize));
    
    // Phase 1: Sweep to hybrid (ECDSA sigs)
    const phase1Estimate = estimateTransactionSize(utxosInBatch, 1, 'ecdsa');
    const phase1Fee = Math.ceil(phase1Estimate.totalBytes * feeRate);

    // Future Phase 2: Spend from hybrid using PQ (optional)
    const phase2Estimate = estimateTransactionSize(1, 1, targetAlgorithm.toLowerCase());
    const phase2Fee = Math.ceil(phase2Estimate.totalBytes * feeRate);

    costs.push({
      batch: i + 1,
      utxos: utxosInBatch,
      phase1Fee,
      phase2Fee,
      totalFee: phase1Fee + phase2Fee
    });
  }

  const totalPhase1Fees = costs.reduce((sum, c) => sum + c.phase1Fee, 0);
  const totalPhase2Fees = costs.reduce((sum, c) => sum + c.phase2Fee, 0);
  const totalValue = utxoCount * averageAmount;

  return {
    utxoCount,
    batchCount,
    averageAmount,
    totalValue,
    phase1: {
      description: 'Sweep ECDSA UTXOs to hybrid addresses',
      totalFees: totalPhase1Fees,
      percentOfValue: ((totalPhase1Fees / totalValue) * 100).toFixed(2) + '%'
    },
    phase2: {
      description: 'Future: Spend from hybrid using PQ signatures',
      totalFees: totalPhase2Fees,
      percentOfValue: ((totalPhase2Fees / totalValue) * 100).toFixed(2) + '%'
    },
    total: {
      fees: totalPhase1Fees + totalPhase2Fees,
      percentOfValue: (((totalPhase1Fees + totalPhase2Fees) / totalValue) * 100).toFixed(2) + '%'
    },
    batches: costs
  };
}

/**
 * Create a migration timeline
 * 
 * @param {number} utxoCount - Number of UTXOs
 * @param {Object} options - Timeline options
 * @returns {Object} Migration timeline
 */
function createMigrationTimeline(utxoCount, options = {}) {
  const {
    batchSize = 10,
    blocksPerBatch = 6, // ~1 hour between batches
    startBlock = 0
  } = options;

  const batchCount = Math.ceil(utxoCount / batchSize);
  const timeline = [];

  for (let i = 0; i < batchCount; i++) {
    const utxosInBatch = Math.min(batchSize, utxoCount - (i * batchSize));
    const blockHeight = startBlock + (i * blocksPerBatch);
    const estimatedHours = (i * blocksPerBatch) / 6;

    timeline.push({
      phase: i + 1,
      blockHeight,
      estimatedHours: estimatedHours.toFixed(1),
      utxosToMigrate: utxosInBatch,
      remainingUTXOs: utxoCount - ((i + 1) * batchSize),
      action: 'Sweep batch to hybrid addresses'
    });
  }

  return {
    totalBatches: batchCount,
    totalBlocks: batchCount * blocksPerBatch,
    totalHours: ((batchCount * blocksPerBatch) / 6).toFixed(1),
    timeline
  };
}

/**
 * Validate migration readiness
 * 
 * @param {Array<Object>} utxos - UTXOs to migrate
 * @param {Object} options - Validation options
 * @returns {Object} Readiness report
 */
function validateMigrationReadiness(utxos, options = {}) {
  const {
    minUTXOAmount = 1000, // Minimum satoshis to make migration worthwhile
    feeRate = 0.5
  } = options;

  const issues = [];
  const warnings = [];
  
  // Check for dust UTXOs
  const dustUTXOs = utxos.filter(u => u.amount < minUTXOAmount);
  if (dustUTXOs.length > 0) {
    warnings.push(`${dustUTXOs.length} dust UTXOs below ${minUTXOAmount} sats may not be worth migrating`);
  }

  // Check for missing private keys
  const missingKeys = utxos.filter(u => !u.privKey);
  if (missingKeys.length > 0) {
    issues.push(`${missingKeys.length} UTXOs missing private keys`);
  }

  // Estimate if migration is profitable
  const totalValue = utxos.reduce((sum, u) => sum + u.amount, 0);
  const estimatedFees = estimateTransactionSize(utxos.length, 1, 'ecdsa').estimatedFee;
  
  if (estimatedFees > totalValue * 0.1) {
    warnings.push(`Migration fees (~${estimatedFees} sats) exceed 10% of total value`);
  }

  return {
    ready: issues.length === 0,
    issues,
    warnings,
    stats: {
      totalUTXOs: utxos.length,
      totalValue,
      estimatedFees,
      netValue: totalValue - estimatedFees,
      worthMigrating: totalValue > estimatedFees * 2
    }
  };
}

module.exports = {
  planUTXOSweep,
  generateHybridAddresses,
  estimateMigrationCost,
  createMigrationTimeline,
  validateMigrationReadiness
};
