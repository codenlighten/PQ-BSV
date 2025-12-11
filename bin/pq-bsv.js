#!/usr/bin/env node

/**
 * PQ-BSV CLI Tool
 * 
 * Command-line interface for post-quantum cryptography operations
 */

const {
  generateMLDSAKeyPair,
  generateSLHDSAKeyPair,
  generateECDSAKeyPair,
  exportKey
} = require('../src/index');

const { runFullBenchmark } = require('../src/utils/benchmark');
const { estimateMigrationCost } = require('../src/migration/sweep');

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
PQ-BSV CLI - Post-Quantum Cryptography for Bitcoin SV

Usage: pq-bsv <command> [options]

Commands:
  keygen <algorithm>        Generate a key pair
                           Algorithms: mldsa-44, mldsa-65, mldsa-87,
                                      slhdsa-128s, slhdsa-128f, slhdsa-256s,
                                      ecdsa
  
  benchmark                 Run performance benchmarks
  
  estimate-migration        Estimate migration cost
    --utxos <count>        Number of UTXOs to migrate
    --amount <sats>        Average UTXO amount in satoshis
    --fee-rate <rate>      Fee rate (sat/byte, default: 0.5)
  
  help                      Show this help message

Examples:
  pq-bsv keygen mldsa-44
  pq-bsv benchmark
  pq-bsv estimate-migration --utxos 100 --amount 10000
`);
}

async function handleKeygen() {
  const algorithm = args[1];
  
  if (!algorithm) {
    console.error('Error: Algorithm required');
    console.log('Usage: pq-bsv keygen <algorithm>');
    console.log('Algorithms: mldsa-44, mldsa-65, mldsa-87, slhdsa-128s, slhdsa-128f, slhdsa-256s, ecdsa');
    process.exit(1);
  }
  
  console.log(`Generating ${algorithm} key pair...\n`);
  
  let keys;
  try {
    if (algorithm === 'ecdsa') {
      keys = generateECDSAKeyPair();
      console.log('ECDSA Key Pair Generated:');
      console.log('------------------------');
      console.log(`Address:     ${keys.address}`);
      console.log(`Private Key: ${keys.privateKeyHex}`);
      console.log(`Public Key:  ${keys.publicKeyHex}`);
      console.log(`\nKey Size: ${keys.publicKey.length} bytes`);
    } else if (algorithm.startsWith('mldsa-')) {
      const level = algorithm.split('-')[1];
      keys = generateMLDSAKeyPair(level);
      console.log(`ML-DSA-${level} Key Pair Generated:`);
      console.log('------------------------');
      console.log(`Algorithm:   ${keys.algorithm}`);
      console.log(`Public Key:  ${exportKey(keys.publicKey, 'hex').substring(0, 60)}...`);
      console.log(`Private Key: ${exportKey(keys.privateKey, 'hex').substring(0, 60)}...`);
      console.log(`\nPublic Key Size:  ${keys.publicKey.length} bytes`);
      console.log(`Private Key Size: ${keys.privateKey.length} bytes`);
      console.log(`Signature Size:   ${keys.metadata.keySize.signature} bytes`);
    } else if (algorithm.startsWith('slhdsa-')) {
      const variant = algorithm.split('-')[1];
      keys = generateSLHDSAKeyPair(variant);
      console.log(`SLH-DSA-${variant} Key Pair Generated:`);
      console.log('------------------------');
      console.log(`Algorithm:   ${keys.algorithm}`);
      console.log(`Public Key:  ${exportKey(keys.publicKey, 'hex')}`);
      console.log(`Private Key: ${exportKey(keys.privateKey, 'hex').substring(0, 60)}...`);
      console.log(`\nPublic Key Size:  ${keys.publicKey.length} bytes`);
      console.log(`Private Key Size: ${keys.privateKey.length} bytes`);
      console.log(`Signature Size:   ${keys.metadata.keySize.signature} bytes`);
    } else {
      console.error(`Error: Unknown algorithm '${algorithm}'`);
      process.exit(1);
    }
    
    console.log(`\n⚠️  ${keys.metadata?.warning || 'PLACEHOLDER IMPLEMENTATION - NOT FOR PRODUCTION USE'}`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function handleBenchmark() {
  runFullBenchmark();
}

function handleEstimateMigration() {
  const utxos = parseInt(getArg('--utxos')) || 100;
  const amount = parseInt(getArg('--amount')) || 10000;
  const feeRate = parseFloat(getArg('--fee-rate')) || 0.5;
  
  console.log('\n=== Migration Cost Estimation ===\n');
  console.log(`UTXOs to migrate: ${utxos}`);
  console.log(`Average amount:   ${amount} satoshis`);
  console.log(`Fee rate:         ${feeRate} sat/byte\n`);
  
  const estimate = estimateMigrationCost(utxos, amount, { feeRate });
  
  console.log('Migration Overview:');
  console.log('------------------');
  console.log(`Total value:      ${estimate.totalValue.toLocaleString()} sats`);
  console.log(`Number of batches: ${estimate.batchCount}`);
  console.log();
  
  console.log('Phase 1 - Sweep to Hybrid Addresses (ECDSA → Hybrid):');
  console.log(`  ${estimate.phase1.description}`);
  console.log(`  Total fees:     ${estimate.phase1.totalFees.toLocaleString()} sats`);
  console.log(`  Percentage:     ${estimate.phase1.percentOfValue}`);
  console.log();
  
  console.log('Phase 2 - Future Spending (Hybrid → PQ):');
  console.log(`  ${estimate.phase2.description}`);
  console.log(`  Total fees:     ${estimate.phase2.totalFees.toLocaleString()} sats`);
  console.log(`  Percentage:     ${estimate.phase2.percentOfValue}`);
  console.log();
  
  console.log('Total Migration Cost:');
  console.log(`  Combined fees:  ${estimate.total.fees.toLocaleString()} sats`);
  console.log(`  Percentage:     ${estimate.total.percentOfValue}`);
  console.log();
  
  if (estimate.batches.length <= 10) {
    console.log('Batch Breakdown:');
    estimate.batches.forEach(batch => {
      console.log(`  Batch ${batch.batch}: ${batch.utxos} UTXOs, Phase 1: ${batch.phase1Fee} sats, Phase 2: ${batch.phase2Fee} sats`);
    });
  }
}

function getArg(flag) {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
}

// Main
(async function main() {
  if (!command || command === 'help') {
    printHelp();
    return;
  }
  
  switch (command) {
    case 'keygen':
      await handleKeygen();
      break;
    case 'benchmark':
      handleBenchmark();
      break;
    case 'estimate-migration':
      handleEstimateMigration();
      break;
    default:
      console.error(`Error: Unknown command '${command}'`);
      console.log('Run "pq-bsv help" for usage information');
      process.exit(1);
  }
})().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
