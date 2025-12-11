/**
 * Migration Demo - UTXO Sweep Example
 * 
 * Demonstrates planning and executing a migration from ECDSA to hybrid addresses
 */

const {
  generateECDSAKeyPair,
  planUTXOSweep,
  generateHybridAddresses,
  estimateMigrationCost,
  createMigrationTimeline,
  validateMigrationReadiness
} = require('../src/index');

console.log('=== PQ-BSV Migration Demo ===\n');

// 1. Simulate existing ECDSA UTXOs
console.log('1. Setting up scenario: User has 25 ECDSA UTXOs to migrate\n');

const utxos = [];
for (let i = 0; i < 25; i++) {
  const keys = generateECDSAKeyPair();
  utxos.push({
    txid: `${'0'.repeat(60)}${i.toString().padStart(4, '0')}`,
    vout: 0,
    amount: 5000 + Math.floor(Math.random() * 20000), // 5k-25k sats
    address: keys.address,
    privKey: keys.privateKey
  });
}

const totalValue = utxos.reduce((sum, u) => sum + u.amount, 0);
console.log(`Created ${utxos.length} UTXOs with total value: ${totalValue.toLocaleString()} satoshis\n`);

// 2. Validate migration readiness
console.log('2. Validating migration readiness...\n');
const validation = validateMigrationReadiness(utxos, {
  minUTXOAmount: 1000,
  feeRate: 0.5
});

console.log(`Ready: ${validation.ready ? '✓' : '✗'}`);
console.log(`Total UTXOs: ${validation.stats.totalUTXOs}`);
console.log(`Total value: ${validation.stats.totalValue.toLocaleString()} sats`);
console.log(`Estimated fees: ${validation.stats.estimatedFees.toLocaleString()} sats`);
console.log(`Net value: ${validation.stats.netValue.toLocaleString()} sats`);
console.log(`Worth migrating: ${validation.stats.worthMigrating ? 'Yes' : 'No'}\n`);

if (validation.warnings.length > 0) {
  console.log('Warnings:');
  validation.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  console.log();
}

if (!validation.ready) {
  console.log('Issues found:');
  validation.issues.forEach(i => console.log(`  ❌ ${i}`));
  console.log();
  return;
}

// 3. Plan UTXO sweep
console.log('3. Planning UTXO sweep in batches...\n');
const sweepPlan = planUTXOSweep(utxos, {
  targetAlgorithm: 'ML-DSA-44',
  batchSize: 10,
  feeRate: 0.5
});

console.log(`Total UTXOs: ${sweepPlan.totalUTXOs}`);
console.log(`Number of batches: ${sweepPlan.batches}`);
console.log(`Total input: ${sweepPlan.totalInput.toLocaleString()} sats`);
console.log(`Total fees: ${sweepPlan.totalFees.toLocaleString()} sats`);
console.log(`Target algorithm: ${sweepPlan.targetAlgorithm}\n`);

console.log('Batch details:');
sweepPlan.details.forEach((batch, i) => {
  console.log(`  Batch ${i + 1}: ${batch.inputCount} inputs, ${batch.totalInput.toLocaleString()} sats → ${batch.outputAmount.toLocaleString()} sats (fee: ${batch.estimatedFee} sats, ${batch.estimatedSize} bytes)`);
});
console.log();

// 4. Generate hybrid addresses
console.log('4. Generating hybrid addresses for migration...\n');
const ecdsaKeysForHybrid = [];
for (let i = 0; i < 3; i++) {
  const keys = generateECDSAKeyPair();
  ecdsaKeysForHybrid.push({
    publicKey: keys.publicKey,
    address: keys.address
  });
}

const hybridAddresses = generateHybridAddresses(ecdsaKeysForHybrid, 'ML-DSA-44');

console.log(`Generated ${hybridAddresses.length} hybrid addresses:\n`);
hybridAddresses.forEach((addr, i) => {
  console.log(`  Address ${i + 1}:`);
  console.log(`    Original ECDSA: ${addr.ecdsaAddress}`);
  console.log(`    Script type:    ${addr.hybridScript.type}`);
  console.log(`    Script size:    ${addr.scriptSize} bytes`);
  console.log(`    PQ algorithm:   ${addr.pqKeys.algorithm}`);
  console.log();
});

// 5. Create migration timeline
console.log('5. Creating migration timeline...\n');
const timeline = createMigrationTimeline(utxos.length, {
  batchSize: 10,
  blocksPerBatch: 6,
  startBlock: 800000
});

console.log(`Total batches: ${timeline.totalBatches}`);
console.log(`Total duration: ${timeline.totalHours} hours (~${(timeline.totalHours / 24).toFixed(1)} days)\n`);

console.log('Timeline:');
timeline.timeline.forEach(phase => {
  console.log(`  Phase ${phase.phase}: Block ${phase.blockHeight} (+${phase.estimatedHours}h) - ${phase.action}`);
  console.log(`    UTXOs to migrate: ${phase.utxosToMigrate}, Remaining: ${Math.max(0, phase.remainingUTXOs)}`);
});
console.log();

// 6. Cost estimation
console.log('6. Detailed cost estimation...\n');
const costEstimate = estimateMigrationCost(utxos.length, 10000, {
  feeRate: 0.5,
  batchSize: 10,
  targetAlgorithm: 'ML-DSA-44'
});

console.log('Migration Cost Breakdown:');
console.log('------------------------');
console.log(`Total value: ${costEstimate.totalValue.toLocaleString()} sats\n`);

console.log('Phase 1 - Sweep to Hybrid (using ECDSA signatures):');
console.log(`  Fees: ${costEstimate.phase1.totalFees.toLocaleString()} sats (${costEstimate.phase1.percentOfValue})`);
console.log();

console.log('Phase 2 - Future spending with PQ signatures:');
console.log(`  Fees: ${costEstimate.phase2.totalFees.toLocaleString()} sats (${costEstimate.phase2.percentOfValue})`);
console.log();

console.log('Total migration cost:');
console.log(`  ${costEstimate.total.fees.toLocaleString()} sats (${costEstimate.total.percentOfValue} of total value)`);
console.log();

// 7. Summary
console.log('7. Migration Summary\n');
console.log('='.repeat(60));
console.log('Current State:');
console.log(`  • ${utxos.length} UTXOs on ECDSA-only addresses`);
console.log(`  • Total value: ${totalValue.toLocaleString()} satoshis`);
console.log(`  • Vulnerable to quantum attacks (when they arrive)\n`);

console.log('After Migration:');
console.log(`  • ${sweepPlan.batches} hybrid address outputs`);
console.log(`  • Can be spent with ECDSA OR ML-DSA-44 signatures`);
console.log(`  • Quantum-safe escape hatch available`);
console.log(`  • Cost: ${sweepPlan.totalFees.toLocaleString()} sats (${((sweepPlan.totalFees / totalValue) * 100).toFixed(2)}%)\n`);

console.log('Next Steps:');
console.log('  1. Review migration plan');
console.log('  2. Test on regtest/testnet');
console.log('  3. Execute Phase 1 (sweep to hybrid)');
console.log('  4. Future: Spend using PQ signatures when needed');
console.log('='.repeat(60));

console.log('\n=== Migration Demo Complete ===\n');
console.log('This demonstrates the planning tools for ECDSA → Hybrid migration.');
console.log('Actual migration would require transaction building and signing.\n');
