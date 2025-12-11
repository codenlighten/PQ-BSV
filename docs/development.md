# Development Guide

## Getting Started

### Installation

```bash
npm install
```

### Running Examples

```bash
# Basic usage
npm run example

# Hierarchical key derivation
node examples/hierarchical-keys.js
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Linting

```bash
npm run lint
```

---

## Project Structure

```
pq-bsv/
├── src/
│   ├── index.js              # Main entry point
│   ├── keys/
│   │   ├── pq-keygen.js      # PQ key generation (ML-DSA, SLH-DSA)
│   │   └── ecdsa-keys.js     # Classical ECDSA keys
│   └── scripts/
│       └── templates.js      # BSV script templates
├── examples/
│   ├── basic-usage.js        # Basic key generation & scripts
│   └── hierarchical-keys.js  # BIP32-style derivation
├── test/
│   ├── keygen.test.js        # Key generation tests
│   └── scripts.test.js       # Script template tests
├── docs/
│   ├── roadmap.md            # 10-year PQC migration plan
│   └── api.md                # API documentation
└── package.json
```

---

## Development Workflow

### 1. Adding New Features

When adding new PQ algorithms or script templates:

1. Implement in appropriate `src/` file
2. Export from `src/index.js`
3. Add tests in `test/`
4. Update `docs/api.md`
5. Add example usage if needed

### 2. Key Generation

Current implementation uses **placeholder cryptography**:
- Random bytes for demonstration
- NOT cryptographically secure for production

To integrate real PQ implementations:

```javascript
// Replace placeholder in src/keys/pq-keygen.js
function generatePQKeyPair(algorithm, seed) {
  // TODO: Use actual liboqs, pqcrypto, or similar
  // const keypair = liboqs.KeyPair.create(algorithm);
  // return keypair;
}
```

### 3. Testing Strategy

- **Unit tests**: Test individual functions
- **Integration tests**: Test key + script workflows
- **Size verification**: Ensure key/signature sizes match NIST specs

---

## Integration Points

### With BSV Libraries

The project is designed to integrate with:

- `@smartledger/keys` - BSV key management (partial integration)
- BSV Script libraries - For transaction building
- BSV node software - For testnet/regtest deployment

### With PQC Libraries

Recommended libraries for production:

- **liboqs** (C, with Node.js bindings)
- **pqcrypto** (Rust, with WASM)
- **Bouncy Castle** (Java)
- **PQClean** (C)

---

## Roadmap Implementation

### Phase 0 (Current): Foundation
- ✅ Project structure
- ✅ Placeholder key generation
- ✅ Script templates
- ✅ Size estimation tools
- 🔄 Documentation

### Phase 1 (Next 6 months): Real Crypto
- [ ] Integrate actual ML-DSA implementation
- [ ] Integrate actual SLH-DSA implementation
- [ ] Hardware wallet support research
- [ ] Testnet deployment

### Phase 2 (6-12 months): Wallet Integration
- [ ] SPV wallet modifications
- [ ] HD derivation (BIP32-PQ)
- [ ] Migration tools (ECDSA → Hybrid)
- [ ] Address format standards

### Phase 3 (12-24 months): Protocol
- [ ] Propose opcodes to BSV core devs
- [ ] Testnet activation
- [ ] Benchmark verification performance
- [ ] Fee model adjustments

---

## Best Practices

### Key Management

```javascript
// ✅ Good: Derive from secure seed
const seed = crypto.randomBytes(64);
const keys = deriveHierarchicalKeys(seed, derivations);

// ❌ Bad: Reuse keys across algorithms
// Each algorithm should have its own key
```

### Script Creation

```javascript
// ✅ Good: Use hybrid for transition period
const script = createHybridECDSAMLDSAScript(ecdsa, mldsa);

// 🔄 Future: Pure PQ for new deployments
const script = createMLDSAOnlyScript(mldsa);
```

### Transaction Size

Always estimate before broadcasting:

```javascript
const estimate = estimateTransactionSize(inputs, outputs, 'mldsa-44');
console.log(`Fee required: ${estimate.estimatedFee} sats`);
```

---

## Contributing

### Code Style

- Use 2-space indentation
- Follow ESLint rules
- Add JSDoc comments
- Write tests for new features

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Run tests (`npm test`)
4. Commit changes
5. Push and create PR

### Areas Needing Help

- **Cryptography**: Integrate real ML-DSA/SLH-DSA
- **Performance**: Benchmark verification times
- **Documentation**: More examples and tutorials
- **Testing**: Testnet integration tests
- **Hardware**: Hardware wallet support

---

## Security Considerations

### Current Status

⚠️ **This is experimental software**:
- Uses placeholder cryptography
- Not audited
- Not for production use
- Educational/research purposes only

### Before Production

Required steps:

1. ✅ Integrate vetted PQC implementations
2. ✅ Security audit by cryptographers
3. ✅ Extensive testnet testing
4. ✅ Hardware wallet integration
5. ✅ Community review period
6. ✅ Mainnet activation plan

---

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Master seed must be at least 32 bytes"
- **Solution**: Ensure seed is ≥32 bytes

**Issue**: ECDSA key generation returns mock addresses
- **Solution**: This is expected in demo mode. Integrate real BSV key library for production.

**Issue**: Transaction size estimates seem large
- **Solution**: PQ signatures are 30-250x larger than ECDSA. This is expected.

### Getting Help

- Check `docs/api.md` for API reference
- Review examples in `examples/`
- Read `docs/roadmap.md` for context
- Open an issue on GitHub

---

## License

ISC - See LICENSE file
