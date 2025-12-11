/**
 * Address Format Utilities
 * 
 * Utilities for encoding and displaying PQ-compatible addresses
 */

const crypto = require('crypto');

/**
 * Address types for PQ-BSV
 */
const AddressType = {
  P2PKH: 'p2pkh',           // Standard ECDSA pay-to-pubkey-hash
  P2SH: 'p2sh',             // Pay-to-script-hash (for hybrid scripts)
  HYBRID: 'hybrid',         // Hybrid ECDSA + PQ
  ML_DSA: 'mldsa',          // Pure ML-DSA
  SLH_DSA: 'slhdsa'         // Pure SLH-DSA
};

/**
 * Encode an address with BSV-style base58check
 * Simplified version - production should use proper base58 library
 */
function encodeAddress(payload, network = 'mainnet', type = 'p2pkh') {
  // Determine version byte
  let version;
  if (network === 'mainnet') {
    version = type === 'p2sh' ? 0x05 : 0x00;
  } else {
    version = type === 'p2sh' ? 0xc4 : 0x6f;
  }
  
  const versionPayload = Buffer.concat([
    Buffer.from([version]),
    payload
  ]);
  
  // Double SHA-256 checksum
  const hash1 = crypto.createHash('sha256').update(versionPayload).digest();
  const hash2 = crypto.createHash('sha256').update(hash1).digest();
  const checksum = hash2.slice(0, 4);
  
  const fullPayload = Buffer.concat([versionPayload, checksum]);
  
  // Simplified base58-like encoding (in production, use proper base58)
  const prefix = network === 'mainnet' ? (type === 'p2sh' ? '3' : '1') : (type === 'p2sh' ? '2' : 'm');
  return prefix + fullPayload.toString('base64').replace(/[=/+]/g, '').substring(0, 33);
}

/**
 * Create P2PKH address from public key
 */
function createP2PKHAddress(publicKey, network = 'mainnet') {
  // Hash160 = RIPEMD160(SHA256(pubkey))
  const sha256 = crypto.createHash('sha256').update(publicKey).digest();
  const hash160 = crypto.createHash('ripemd160').update(sha256).digest();
  
  // Create scriptPubKey: OP_DUP OP_HASH160 <hash160> OP_EQUALVERIFY OP_CHECKSIG
  const scriptPubKey = Buffer.concat([
    Buffer.from([0x76, 0xa9, 0x14]), // OP_DUP OP_HASH160 PUSH20
    hash160,
    Buffer.from([0x88, 0xac]) // OP_EQUALVERIFY OP_CHECKSIG
  ]);
  
  return {
    type: AddressType.P2PKH,
    address: encodeAddress(hash160, network, 'p2pkh'),
    hash160,
    scriptPubKey,
    publicKey: publicKey.toString('hex')
  };
}

/**
 * Create P2SH address from script
 */
function createP2SHAddress(script, network = 'mainnet') {
  // Hash160 of the script
  const sha256 = crypto.createHash('sha256').update(script).digest();
  const hash160 = crypto.createHash('ripemd160').update(sha256).digest();
  
  // Create scriptPubKey: OP_HASH160 <hash160> OP_EQUAL
  const scriptPubKey = Buffer.concat([
    Buffer.from([0xa9, 0x14]), // OP_HASH160 PUSH20
    hash160,
    Buffer.from([0x87]) // OP_EQUAL
  ]);
  
  return {
    type: AddressType.P2SH,
    address: encodeAddress(hash160, network, 'p2sh'),
    hash160,
    scriptPubKey,
    redeemScriptHash: hash160,
    scriptSize: script.length
  };
}

/**
 * Create hybrid address (P2SH wrapping hybrid script)
 */
function createHybridAddress(hybridScript) {
  const p2sh = createP2SHAddress(hybridScript.bytecode);
  
  return {
    ...p2sh,
    type: AddressType.HYBRID,
    algorithms: hybridScript.algorithms,
    scriptType: hybridScript.type,
    label: 'Hybrid ECDSA+PQ'
  };
}

/**
 * Create PQ-only address
 */
function createPQAddress(pqPublicKey, algorithm, network = 'mainnet') {
  // Create simple script: OP_0 <pubkey> OP_CHECKSIG_MLDSA (or similar)
  const script = Buffer.concat([
    Buffer.from([0x00]), // OP_0
    Buffer.from([pqPublicKey.length]), // Length
    pqPublicKey
  ]);
  
  const p2sh = createP2SHAddress(script, network);
  
  return {
    ...p2sh,
    type: algorithm.startsWith('ML-DSA') ? AddressType.ML_DSA : AddressType.SLH_DSA,
    algorithm,
    label: `Pure ${algorithm}`
  };
}

/**
 * Format address for display with metadata
 */
function formatAddress(addressInfo, options = {}) {
  const { 
    includeLabel = false,
    includeQR = false,
    includeNetwork = false,
    includeMetadata = true, 
    compact = false 
  } = options;
  
  if (compact) {
    return addressInfo.address;
  }
  
  const lines = [
    `Address: ${addressInfo.address}`,
    `Type:    ${addressInfo.type.toUpperCase()}`
  ];
  
  if (includeLabel && addressInfo.label) {
    lines.push(`Label:   ${addressInfo.label}`);
  }
  
  if (includeQR) {
    lines.push(`[QR Code Available]`);
  }
  
  if (includeNetwork) {
    lines.push(`Network: mainnet`);
  }
  
  if (includeMetadata) {
    if (addressInfo.algorithms) {
      lines.push(`Algorithms: ${addressInfo.algorithms.join(' + ')}`);
    }
    if (addressInfo.algorithm) {
      lines.push(`Algorithm: ${addressInfo.algorithm}`);
    }
    if (addressInfo.scriptSize) {
      lines.push(`Script Size: ${addressInfo.scriptSize} bytes`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Create QR code data for address
 * Returns URI format for QR encoding
 */
function createPaymentURI(address, options = {}) {
  const {
    amount,
    label,
    message,
    requirePQ = false
  } = options;
  
  let uri = `bitcoin:${address}`;
  const params = [];
  
  if (amount) {
    params.push(`amount=${amount / 100000000}`); // Convert to BSV
  }
  if (label) {
    params.push(`label=${encodeURIComponent(label)}`);
  }
  if (message) {
    params.push(`message=${encodeURIComponent(message)}`);
  }
  if (requirePQ) {
    params.push('req-pq=1'); // Custom parameter
  }
  
  if (params.length > 0) {
    uri += '?' + params.join('&');
  }
  
  return uri;
}

/**
 * Validate address format
 */
function validateAddress(address) {
  const errors = [];
  
  // Basic validation
  if (typeof address !== 'string') {
    errors.push('Address must be a string');
    return { valid: false, errors };
  }
  
  if (address.length < 26 || address.length > 35) {
    errors.push('Invalid address length');
    return { valid: false, errors };
  }
  
  if (!address.match(/^[123mn][a-zA-Z0-9]+$/)) {
    errors.push('Invalid address format');
    return { valid: false, errors };
  }
  
  // Simplified checksum validation
  // In production, would decode base58 and verify checksum properly
  
  return {
    valid: true,
    type: address[0] === '1' ? 'p2pkh' : 'p2sh',
    network: address[0] === '1' || address[0] === '3' ? 'mainnet' : 'testnet'
  };
}

/**
 * Compare two addresses
 */
function compareAddresses(addr1, addr2) {
  return addr1 === addr2;
}

/**
 * Shorten address for display
 */
function shortenAddress(address, chars = 8) {
  if (address.length <= chars * 2 + 3) {
    return address;
  }
  
  const startChars = chars;
  const endChars = chars;
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

/**
 * Group addresses by type
 */
function groupAddressesByType(addresses) {
  const groups = {
    [AddressType.P2PKH]: [],
    [AddressType.P2SH]: [],
    [AddressType.HYBRID]: [],
    [AddressType.ML_DSA]: [],
    [AddressType.SLH_DSA]: []
  };
  
  for (const addr of addresses) {
    const type = addr.type || AddressType.P2PKH;
    if (groups[type]) {
      groups[type].push(addr);
    }
  }
  
  return groups;
}

/**
 * Generate address label
 */
function generateLabel(addressInfo, index = 0) {
  const typeLabels = {
    [AddressType.P2PKH]: 'ECDSA',
    [AddressType.P2SH]: 'P2SH',
    [AddressType.HYBRID]: 'Hybrid',
    [AddressType.ML_DSA]: 'ML-DSA',
    [AddressType.SLH_DSA]: 'SLH-DSA'
  };
  
  const typeLabel = typeLabels[addressInfo.type] || 'Unknown';
  
  // Include algorithm info if available
  if (addressInfo.algorithms) {
    return `${typeLabel} ${addressInfo.algorithms.join('+')} Address #${index + 1}`;
  }
  
  return `${typeLabel} Address #${index + 1}`;
}

module.exports = {
  AddressType,
  encodeAddress,
  createP2PKHAddress,
  createP2SHAddress,
  createHybridAddress,
  createPQAddress,
  formatAddress,
  createPaymentURI,
  validateAddress,
  compareAddresses,
  shortenAddress,
  groupAddressesByType,
  generateLabel
};
