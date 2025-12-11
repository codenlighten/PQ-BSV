/**
 * BSV Script Templates for Post-Quantum Cryptography
 * 
 * Implements hybrid and PQ-only locking scripts that can be used
 * in BSV transactions for quantum-resistant security.
 */

/**
 * Opcodes (BSV Script)
 * Note: PQ-specific opcodes are proposed/theoretical
 */
const OP = {
  // Standard opcodes
  OP_DUP: 0x76,
  OP_HASH160: 0xa9,
  OP_EQUALVERIFY: 0x88,
  OP_CHECKSIG: 0xac,
  OP_IF: 0x63,
  OP_ELSE: 0x67,
  OP_ENDIF: 0x68,
  OP_PUSH: 0x01, // Variable push
  
  // Proposed PQ opcodes (these would need to be added to BSV protocol)
  OP_CHECKSIG_MLDSA: 0xba,    // Verify ML-DSA signature
  OP_CHECKSIG_SLHDSA: 0xbb,   // Verify SLH-DSA signature
  OP_CHECKSIG_ALG: 0xbc,      // Generic algorithm-specific signature check
};

/**
 * Create a hybrid ECDSA + ML-DSA locking script
 * 
 * Script logic:
 *   OP_IF
 *     <ecdsa_pubkey> OP_CHECKSIG
 *   OP_ELSE
 *     <mldsa_pubkey> OP_CHECKSIG_MLDSA
 *   OP_ENDIF
 * 
 * @param {Buffer} ecdsaPubKey - ECDSA public key (33 bytes compressed)
 * @param {Buffer} mldsaPubKey - ML-DSA public key (~1312-2592 bytes)
 * @returns {Object} Script template with bytecode and ASM
 */
function createHybridECDSAMLDSAScript(ecdsaPubKey, mldsaPubKey) {
  if (!ecdsaPubKey || ecdsaPubKey.length !== 33) {
    throw new Error('ECDSA public key must be 33 bytes (compressed)');
  }

  // ASM representation (human-readable)
  const asm = [
    'OP_IF',
    `PUSH ${ecdsaPubKey.toString('hex')}`,
    'OP_CHECKSIG',
    'OP_ELSE',
    `PUSH ${mldsaPubKey.toString('hex')}`,
    'OP_CHECKSIG_MLDSA',
    'OP_ENDIF'
  ];

  // Pseudo-bytecode (actual implementation would use BSV Script class)
  const scriptBytes = Buffer.concat([
    Buffer.from([OP.OP_IF]),
    Buffer.from([ecdsaPubKey.length]),
    ecdsaPubKey,
    Buffer.from([OP.OP_CHECKSIG]),
    Buffer.from([OP.OP_ELSE]),
    // ML-DSA pubkey requires multi-byte push
    _pushData(mldsaPubKey),
    Buffer.from([OP.OP_CHECKSIG_MLDSA]),
    Buffer.from([OP.OP_ENDIF])
  ]);

  return {
    type: 'hybrid-ecdsa-mldsa',
    asm: asm.join(' '),
    bytecode: scriptBytes,
    size: scriptBytes.length,
    algorithms: ['ECDSA-secp256k1', mldsaPubKey.length <= 1312 ? 'ML-DSA-44' : 'ML-DSA-65']
  };
}

/**
 * Create a pure ML-DSA locking script
 * 
 * Script: <mldsa_pubkey> OP_CHECKSIG_MLDSA
 * 
 * @param {Buffer} mldsaPubKey - ML-DSA public key
 */
function createMLDSAOnlyScript(mldsaPubKey) {
  const asm = [
    `PUSH ${mldsaPubKey.toString('hex')}`,
    'OP_CHECKSIG_MLDSA'
  ];

  const scriptBytes = Buffer.concat([
    _pushData(mldsaPubKey),
    Buffer.from([OP.OP_CHECKSIG_MLDSA])
  ]);

  return {
    type: 'mldsa-only',
    asm: asm.join(' '),
    bytecode: scriptBytes,
    size: scriptBytes.length,
    algorithms: ['ML-DSA']
  };
}

/**
 * Create a pure SLH-DSA locking script
 * 
 * Script: <slhdsa_pubkey> OP_CHECKSIG_SLHDSA
 * 
 * @param {Buffer} slhdsaPubKey - SLH-DSA public key
 */
function createSLHDSAOnlyScript(slhdsaPubKey) {
  const asm = [
    `PUSH ${slhdsaPubKey.toString('hex')}`,
    'OP_CHECKSIG_SLHDSA'
  ];

  const scriptBytes = Buffer.concat([
    _pushData(slhdsaPubKey),
    Buffer.from([OP.OP_CHECKSIG_SLHDSA])
  ]);

  return {
    type: 'slhdsa-only',
    asm: asm.join(' '),
    bytecode: scriptBytes,
    size: scriptBytes.length,
    algorithms: ['SLH-DSA']
  };
}

/**
 * Create multi-algorithm multisig script (k-of-n)
 * 
 * Supports mixed ECDSA + ML-DSA + SLH-DSA keys
 * 
 * @param {number} threshold - Required signatures (k)
 * @param {Array<Object>} pubKeys - [{type: 'ecdsa'|'mldsa'|'slhdsa', key: Buffer}]
 */
function createMultiAlgMultisig(threshold, pubKeys) {
  if (threshold > pubKeys.length) {
    throw new Error('Threshold cannot exceed number of public keys');
  }

  // Simplified multi-sig logic (actual implementation more complex)
  const asm = [
    `PUSH ${threshold}`,
    ...pubKeys.map(pk => {
      const opcode = pk.type === 'ecdsa' ? 'OP_CHECKSIG' :
                     pk.type === 'mldsa' ? 'OP_CHECKSIG_MLDSA' :
                     'OP_CHECKSIG_SLHDSA';
      return `PUSH ${pk.key.toString('hex')} ${opcode}`;
    }),
    `PUSH ${pubKeys.length}`,
    'OP_CHECKMULTISIG_HYBRID'
  ];

  return {
    type: 'multi-alg-multisig',
    threshold,
    totalKeys: pubKeys.length,
    asm: asm.join(' '),
    algorithms: pubKeys.map(pk => pk.type),
    warning: 'Requires new OP_CHECKMULTISIG_HYBRID opcode'
  };
}

/**
 * Create an unlocking script for hybrid ECDSA/ML-DSA
 * 
 * @param {Buffer} signature - ECDSA or ML-DSA signature
 * @param {boolean} useECDSA - true for ECDSA path, false for ML-DSA path
 */
function createHybridUnlockingScript(signature, useECDSA = true) {
  const flag = useECDSA ? Buffer.from([0x01]) : Buffer.from([0x00]);
  
  return {
    type: 'unlocking',
    asm: `PUSH ${signature.toString('hex')} PUSH ${flag.toString('hex')}`,
    bytecode: Buffer.concat([
      _pushData(signature),
      flag
    ]),
    path: useECDSA ? 'ECDSA' : 'ML-DSA'
  };
}

/**
 * Estimate transaction size with PQ signatures
 * 
 * @param {number} inputs - Number of inputs
 * @param {number} outputs - Number of outputs
 * @param {string} signatureType - 'ecdsa', 'mldsa-44', 'mldsa-65', 'mldsa-87', 'slhdsa-128s', etc.
 */
function estimateTransactionSize(inputs, outputs, signatureType = 'ecdsa') {
  const baseTxSize = 10; // Version + locktime
  const inputBaseSize = 40; // Outpoint + sequence
  const outputSize = 34; // Value + script pubkey (P2PKH)
  
  const signatureSizes = {
    'ecdsa': 72,
    'mldsa-44': 2420,
    'mldsa-65': 3309,
    'mldsa-87': 4627,
    'slhdsa-128s': 7856,
    'slhdsa-128f': 17088,
    'slhdsa-256s': 29792
  };

  const sigSize = signatureSizes[signatureType] || 72;
  const scriptSigSize = sigSize + 106; // sig + pubkey + script overhead

  const totalSize = baseTxSize + 
                    (inputs * (inputBaseSize + scriptSigSize)) +
                    (outputs * outputSize);

  return {
    totalBytes: totalSize,
    signatureBytes: sigSize * inputs,
    overhead: totalSize - (sigSize * inputs),
    multiplierVsECDSA: (totalSize / (baseTxSize + inputs * (inputBaseSize + 72 + 106) + outputs * outputSize)).toFixed(2),
    estimatedFee: Math.ceil(totalSize * 0.5) // Assuming 0.5 sat/byte
  };
}

/**
 * Helper: Push data with correct length encoding
 */
function _pushData(data) {
  if (data.length < 76) {
    return Buffer.concat([Buffer.from([data.length]), data]);
  } else if (data.length < 256) {
    return Buffer.concat([Buffer.from([0x4c, data.length]), data]);
  } else if (data.length < 65536) {
    const len = Buffer.allocUnsafe(2);
    len.writeUInt16LE(data.length);
    return Buffer.concat([Buffer.from([0x4d]), len, data]);
  } else {
    const len = Buffer.allocUnsafe(4);
    len.writeUInt32LE(data.length);
    return Buffer.concat([Buffer.from([0x4e]), len, data]);
  }
}

module.exports = {
  OP,
  createHybridECDSAMLDSAScript,
  createMLDSAOnlyScript,
  createSLHDSAOnlyScript,
  createMultiAlgMultisig,
  createHybridUnlockingScript,
  estimateTransactionSize
};
