/**
 * Basic Usage Example - PQ-BSV Toolkit
 * 
 * Demonstrates key generation and hybrid script creation
 */

const {
  generateECDSAKeyPair,
  generateMLDSAKeyPair,
  generateSLHDSAKeyPair,
  createHybridKeyBundle,
  createHybridECDSAMLDSAScript,
  createMLDSAOnlyScript,
  estimateTransactionSize,
  PQAlgorithm,
  KeySizes
} = require('../src/index');

async function main() {
  console.log('=== PQ-BSV Basic Usage Example ===\n');

  // 1. Generate classical ECDSA keys
  console.log('1. Generating ECDSA key pair...');
  const ecdsaKeys = generateECDSAKeyPair();
  console.log(`   Address: ${ecdsaKeys.address}`);
  console.log(`   Public key: ${ecdsaKeys.publicKey.toString('hex').substring(0, 40)}...`);
  console.log(`   Key size: ${ecdsaKeys.publicKey.length} bytes\n`);

// 2. Generate post-quantum ML-DSA keys
console.log('2. Generating ML-DSA-44 key pair (post-quantum)...');
const mldsaKeys = generateMLDSAKeyPair('44');
console.log(`   Algorithm: ${mldsaKeys.algorithm}`);
console.log(`   Public key: ${mldsaKeys.publicKey.toString('hex').substring(0, 40)}...`);
console.log(`   Public key size: ${mldsaKeys.publicKey.length} bytes`);
console.log(`   Signature size: ${KeySizes[mldsaKeys.algorithm].signature} bytes`);
console.log(`   ⚠️  ${mldsaKeys.metadata.warning}\n`);

// 3. Generate SLH-DSA keys (hash-based backup)
console.log('3. Generating SLH-DSA-128s key pair (hash-based)...');
const slhdsaKeys = generateSLHDSAKeyPair('128s');
console.log(`   Algorithm: ${slhdsaKeys.algorithm}`);
console.log(`   Public key size: ${slhdsaKeys.publicKey.length} bytes`);
console.log(`   Signature size: ${KeySizes[slhdsaKeys.algorithm].signature} bytes\n`);

// 4. Create hybrid key bundle
console.log('4. Creating hybrid ECDSA + ML-DSA key bundle...');
const hybridKeys = createHybridKeyBundle(ecdsaKeys, PQAlgorithm.ML_DSA_44);
console.log(`   Type: ${hybridKeys.type}`);
console.log(`   ECDSA address: ${hybridKeys.ecdsa.address}`);
console.log(`   PQ algorithm: ${hybridKeys.pq.algorithm}\n`);

// 5. Create hybrid locking script
console.log('5. Creating hybrid ECDSA/ML-DSA locking script...');
const hybridScript = createHybridECDSAMLDSAScript(
  ecdsaKeys.publicKey,
  mldsaKeys.publicKey
);
console.log(`   Script type: ${hybridScript.type}`);
console.log(`   Script size: ${hybridScript.size} bytes`);
console.log(`   Algorithms: ${hybridScript.algorithms.join(' + ')}`);
console.log(`   ASM (excerpt): ${hybridScript.asm.substring(0, 80)}...\n`);

// 6. Create pure PQ script
console.log('6. Creating pure ML-DSA locking script...');
const pqOnlyScript = createMLDSAOnlyScript(mldsaKeys.publicKey);
console.log(`   Script type: ${pqOnlyScript.type}`);
console.log(`   Script size: ${pqOnlyScript.size} bytes\n`);

// 7. Transaction size estimation
console.log('7. Transaction size comparison:');
console.log('   Standard ECDSA transaction (1 input, 2 outputs):');
const ecdsaTx = estimateTransactionSize(1, 2, 'ecdsa');
console.log(`   - Size: ${ecdsaTx.totalBytes} bytes`);
console.log(`   - Est. fee: ${ecdsaTx.estimatedFee} satoshis\n`);

console.log('   ML-DSA-44 transaction (1 input, 2 outputs):');
const mldsaTx = estimateTransactionSize(1, 2, 'mldsa-44');
console.log(`   - Size: ${mldsaTx.totalBytes} bytes`);
console.log(`   - Signature size: ${mldsaTx.signatureBytes} bytes`);
console.log(`   - Est. fee: ${mldsaTx.estimatedFee} satoshis`);
console.log(`   - Size multiplier vs ECDSA: ${mldsaTx.multiplierVsECDSA}x\n`);

console.log('   SLH-DSA-128s transaction (1 input, 2 outputs):');
const slhdsaTx = estimateTransactionSize(1, 2, 'slhdsa-128s');
console.log(`   - Size: ${slhdsaTx.totalBytes} bytes`);
console.log(`   - Signature size: ${slhdsaTx.signatureBytes} bytes`);
console.log(`   - Est. fee: ${slhdsaTx.estimatedFee} satoshis`);
console.log(`   - Size multiplier vs ECDSA: ${slhdsaTx.multiplierVsECDSA}x\n`);

// 8. Available algorithms
console.log('8. Supported PQ Algorithms:');
Object.entries(PQAlgorithm).forEach(([name, value]) => {
  const sizes = KeySizes[value];
  if (sizes) {
    console.log(`   - ${value}: ${sizes.signature} byte signatures`);
  }
});

console.log('\n=== Example Complete ===');
console.log('\nNOTE: This is a demonstration with placeholder cryptography.');
console.log('Production use requires integration with actual ML-DSA/SLH-DSA implementations.');
console.log('See docs/roadmap.md for the full BSV PQC migration plan.\n');
}

main().catch(console.error);
