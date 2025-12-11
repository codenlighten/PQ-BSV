/**
 * Performance Benchmarking
 * 
 * Benchmark key generation, signing, and verification operations
 */

const {
  generateMLDSAKeyPair,
  generateSLHDSAKeyPair,
  PQAlgorithm
} = require('../keys/pq-keygen');

const {
  signMLDSA,
  verifyMLDSA,
  signSLHDSA,
  verifySLHDSA,
  signECDSA,
  verifyECDSA
} = require('../signatures/signing');

const { generateECDSAKeyPair } = require('../keys/ecdsa-keys');

/**
 * Benchmark a function execution
 * @param {Function} fn - Function to benchmark
 * @param {number} iterations - Number of iterations
 * @returns {Object} Benchmark results
 */
function benchmark(fn, iterations = 100) {
  const times = [];
  
  // Warm-up
  for (let i = 0; i < 3; i++) {
    fn();
  }
  
  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // Convert to milliseconds
  }
  
  times.sort((a, b) => a - b);
  
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const median = times[Math.floor(times.length / 2)];
  const min = times[0];
  const max = times[times.length - 1];
  
  return {
    iterations,
    avgMs: avg.toFixed(3),
    medianMs: median.toFixed(3),
    minMs: min.toFixed(3),
    maxMs: max.toFixed(3),
    totalMs: sum.toFixed(3),
    opsPerSec: (1000 / avg).toFixed(2)
  };
}

/**
 * Benchmark key generation
 * @returns {Object} Results for all algorithms
 */
function benchmarkKeyGeneration(iterations = 10) {
  console.log(`\n=== Key Generation Benchmark (${iterations} iterations) ===\n`);
  
  const results = {};
  
  // ECDSA
  console.log('Benchmarking ECDSA key generation...');
  results.ecdsa = benchmark(() => generateECDSAKeyPair(), iterations);
  console.log(`  ${results.ecdsa.avgMs}ms avg, ${results.ecdsa.opsPerSec} ops/sec\n`);
  
  // ML-DSA variants
  const mldsaLevels = ['44', '65', '87'];
  for (const level of mldsaLevels) {
    console.log(`Benchmarking ML-DSA-${level} key generation...`);
    results[`mldsa-${level}`] = benchmark(() => generateMLDSAKeyPair(level), iterations);
    console.log(`  ${results[`mldsa-${level}`].avgMs}ms avg, ${results[`mldsa-${level}`].opsPerSec} ops/sec\n`);
  }
  
  // SLH-DSA variants
  const slhdsaVariants = ['128s', '128f', '256s'];
  for (const variant of slhdsaVariants) {
    console.log(`Benchmarking SLH-DSA-${variant} key generation...`);
    results[`slhdsa-${variant}`] = benchmark(() => generateSLHDSAKeyPair(variant), iterations);
    console.log(`  ${results[`slhdsa-${variant}`].avgMs}ms avg, ${results[`slhdsa-${variant}`].opsPerSec} ops/sec\n`);
  }
  
  return results;
}

/**
 * Benchmark signing operations
 * @returns {Object} Results for all algorithms
 */
function benchmarkSigning(iterations = 100) {
  console.log(`\n=== Signing Benchmark (${iterations} iterations) ===\n`);
  
  const message = Buffer.from('Test message for signing benchmark');
  const results = {};
  
  // ECDSA
  console.log('Benchmarking ECDSA signing...');
  const ecdsaKeys = generateECDSAKeyPair();
  results.ecdsa = benchmark(() => signECDSA(message, ecdsaKeys.privateKey), iterations);
  console.log(`  ${results.ecdsa.avgMs}ms avg, ${results.ecdsa.opsPerSec} ops/sec\n`);
  
  // ML-DSA
  console.log('Benchmarking ML-DSA-44 signing...');
  const mldsaKeys = generateMLDSAKeyPair('44');
  results['mldsa-44'] = benchmark(() => signMLDSA(message, mldsaKeys), iterations);
  console.log(`  ${results['mldsa-44'].avgMs}ms avg, ${results['mldsa-44'].opsPerSec} ops/sec\n`);
  
  // SLH-DSA
  console.log('Benchmarking SLH-DSA-128s signing...');
  const slhdsaKeys = generateSLHDSAKeyPair('128s');
  results['slhdsa-128s'] = benchmark(() => signSLHDSA(message, slhdsaKeys), iterations);
  console.log(`  ${results['slhdsa-128s'].avgMs}ms avg, ${results['slhdsa-128s'].opsPerSec} ops/sec\n`);
  
  return results;
}

/**
 * Benchmark verification operations
 * @returns {Object} Results for all algorithms
 */
function benchmarkVerification(iterations = 100) {
  console.log(`\n=== Verification Benchmark (${iterations} iterations) ===\n`);
  
  const message = Buffer.from('Test message for verification benchmark');
  const results = {};
  
  // ECDSA
  console.log('Benchmarking ECDSA verification...');
  const ecdsaKeys = generateECDSAKeyPair();
  const ecdsaSig = signECDSA(message, ecdsaKeys.privateKey);
  results.ecdsa = benchmark(() => verifyECDSA(message, ecdsaSig, ecdsaKeys.publicKey), iterations);
  console.log(`  ${results.ecdsa.avgMs}ms avg, ${results.ecdsa.opsPerSec} ops/sec\n`);
  
  // ML-DSA
  console.log('Benchmarking ML-DSA-44 verification...');
  const mldsaKeys = generateMLDSAKeyPair('44');
  const mldsaSig = signMLDSA(message, mldsaKeys);
  results['mldsa-44'] = benchmark(() => verifyMLDSA(message, mldsaSig, mldsaKeys.publicKey, 'ML-DSA-44'), iterations);
  console.log(`  ${results['mldsa-44'].avgMs}ms avg, ${results['mldsa-44'].opsPerSec} ops/sec\n`);
  
  // SLH-DSA
  console.log('Benchmarking SLH-DSA-128s verification...');
  const slhdsaKeys = generateSLHDSAKeyPair('128s');
  const slhdsaSig = signSLHDSA(message, slhdsaKeys);
  results['slhdsa-128s'] = benchmark(() => verifySLHDSA(message, slhdsaSig, slhdsaKeys.publicKey, 'SLH-DSA-128s'), iterations);
  console.log(`  ${results['slhdsa-128s'].avgMs}ms avg, ${results['slhdsa-128s'].opsPerSec} ops/sec\n`);
  
  return results;
}

/**
 * Run comprehensive benchmark suite
 */
function runFullBenchmark() {
  console.log('='.repeat(60));
  console.log('PQ-BSV Performance Benchmark Suite');
  console.log('='.repeat(60));
  console.log('\nNOTE: These are placeholder implementations.');
  console.log('Real PQ algorithms will have different performance characteristics.\n');
  
  const keyGenResults = benchmarkKeyGeneration(10);
  const signingResults = benchmarkSigning(100);
  const verificationResults = benchmarkVerification(100);
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  
  console.log('\nKey Generation (avg ms):');
  Object.entries(keyGenResults).forEach(([alg, result]) => {
    console.log(`  ${alg.padEnd(15)}: ${result.avgMs.padStart(8)}ms`);
  });
  
  console.log('\nSigning (avg ms):');
  Object.entries(signingResults).forEach(([alg, result]) => {
    console.log(`  ${alg.padEnd(15)}: ${result.avgMs.padStart(8)}ms`);
  });
  
  console.log('\nVerification (avg ms):');
  Object.entries(verificationResults).forEach(([alg, result]) => {
    console.log(`  ${alg.padEnd(15)}: ${result.avgMs.padStart(8)}ms`);
  });
  
  return {
    keyGeneration: keyGenResults,
    signing: signingResults,
    verification: verificationResults
  };
}

module.exports = {
  benchmark,
  benchmarkKeyGeneration,
  benchmarkSigning,
  benchmarkVerification,
  runFullBenchmark
};
