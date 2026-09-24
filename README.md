# PQ-BSV: Post-Quantum Cryptography for Bitcoin SV

A toolkit for implementing post-quantum cryptographic primitives on Bitcoin SV, focusing on NIST-standardized algorithms (ML-DSA, SLH-DSA) and hybrid classical/PQ approaches.

## Overview

This project implements the groundwork for migrating BSV to post-quantum security, addressing the "harvest now, decrypt later" threat from quantum computers. It provides:

- **PQ Key Generation**: ML-DSA (Dilithium) and SLH-DSA (SPHINCS+) key pair generation
- **Hybrid Scripts**: ECDSA + PQ signature schemes in BSV Script
- **Migration Tools**: Utilities for transitioning from classical to post-quantum security
- **Standards Compliance**: Aligned with NIST FIPS 203-205 standards

## Installation

```bash
npm install pq-bsv
```

## Quick Start

```javascript
const { generateMLDSAKeyPair, createHybridScript } = require('pq-bsv');

// Generate a post-quantum key pair
const pqKeys = await generateMLDSAKeyPair();

// Create a hybrid ECDSA + PQ script
const hybridScript = createHybridScript(ecdsaPubKey, pqKeys.publicKey);
```

## Features

### Key Generation
- ML-DSA (CRYSTALS-Dilithium) key pairs
- SLH-DSA (SPHINCS+) key pairs
- Hybrid derivation from single seed
- Compatible with existing BSV key infrastructure

### Script Templates
- Hybrid ECDSA/PQ scripts (`OP_IF` branching)
- Pure PQ scripts (ML-DSA, SLH-DSA)
- Multi-algorithm multisig
- Crypto-agile patterns

### Migration Tools
- Sweep legacy UTXOs to hybrid addresses
- Key rotation utilities
- Transaction size estimators for PQ signatures

## Architecture

```
src/
├── keys/           # Key generation and derivation
├── scripts/        # Script template builders
├── signatures/     # Signature creation and verification
├── transactions/   # Transaction building utilities
└── utils/          # Helper functions
```

## Roadmap

See [docs/roadmap.md](./docs/roadmap.md) for the complete 10-year PQC migration plan for BSV.

**Current Phase**: Phase 0-1 (Foundation & Script-level crypto agility)

## Security Considerations

- This is experimental software for research and testing
- PQ algorithms have larger signature sizes (2-4KB vs 64-72 bytes for ECDSA)
- Hybrid approaches provide defense-in-depth during transition
- Always test on testnet/regtest first

## Standards & References

- [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) - ML-DSA
- [NIST FIPS 205](https://csrc.nist.gov/pubs/fips/205/final) - SLH-DSA
- [NIST FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) - ML-KEM

## Contributing

Contributions welcome! This project is part of the BSV PQC Working Group initiative.

## License

[MIT](LICENSE)

## Disclaimer

This software is provided for research and development purposes. Post-quantum cryptography is an evolving field. Always conduct thorough security audits before production use.
