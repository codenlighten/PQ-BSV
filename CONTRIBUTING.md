# Contributing to pq-bsv

Thank you for your interest in contributing to pq-bsv! This document provides guidelines and instructions for contributing to this post-quantum cryptography toolkit for Bitcoin SV.

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## How to Contribute

### Reporting Issues

- **Security Issues**: For security-related issues, please email the maintainers directly rather than creating a public issue
- **Bug Reports**: Use the GitHub issue tracker and include:
  - Clear description of the issue
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details (Node.js version, OS, etc.)
  - Relevant code snippets or error messages

- **Feature Requests**: Describe the feature, its use case, and why it would be valuable

### Pull Requests

1. **Fork the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/pq-bsv.git
   cd pq-bsv
   npm install
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

3. **Make Your Changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass: `npm test`
   - Run linting: `npm run lint`

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

   Use clear, descriptive commit messages following this format:
   - `feat: Add ML-DSA-87 support`
   - `fix: Correct signature size calculation`
   - `docs: Update API documentation`
   - `test: Add tests for address utilities`

5. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

   Then create a pull request on GitHub with:
   - Clear title and description
   - Reference to any related issues
   - Description of testing performed

## Development Guidelines

### Code Style

- Use 2 spaces for indentation
- Follow existing naming conventions
- Document all public APIs with JSDoc comments
- Keep functions focused and single-purpose
- Maximum line length: 100 characters

### Testing

- All new features must include tests
- Maintain or improve test coverage
- Test files should be in `test/` directory
- Use descriptive test names that explain what is being tested

```javascript
// Good
test('should generate ML-DSA-44 key pair with correct sizes', () => {
  // test code
});

// Bad
test('keygen test', () => {
  // test code
});
```

### Documentation

- Update README.md if adding user-facing features
- Update docs/api.md for API changes
- Include inline comments for complex logic
- Update examples/ if relevant

### Commit Hygiene

- Make atomic commits (one logical change per commit)
- Write meaningful commit messages
- Squash fixup commits before creating PR
- Rebase on main before submitting PR

## Areas for Contribution

### High Priority

1. **Real PQC Library Integration**
   - Replace placeholder crypto with liboqs or pqcrypto
   - Implement actual ML-DSA and SLH-DSA operations
   - Add comprehensive verification tests

2. **Performance Optimization**
   - Optimize key generation and signature operations
   - Add caching for frequently used operations
   - Profile and improve hot paths

3. **Additional Script Templates**
   - Implement more complex multisig scenarios
   - Add time-locked PQ scripts
   - Create threshold signature templates

### Medium Priority

1. **Enhanced Migration Tools**
   - Better UTXO selection algorithms
   - Batch migration scheduling
   - Cost estimation improvements

2. **Extended CLI Features**
   - Interactive mode
   - Configuration file support
   - Progress indicators for long operations

3. **Documentation**
   - Video tutorials
   - Interactive examples
   - Migration guides from other systems

### Good First Issues

Look for issues tagged with `good-first-issue` on GitHub. These are typically:
- Documentation improvements
- Additional test cases
- Minor bug fixes
- Example code enhancements

## Testing Changes

Before submitting a PR, ensure:

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Run examples to verify functionality
npm run example
npm run example:migration

# Test CLI commands
node bin/pq-bsv.js keygen mldsa-44
node bin/pq-bsv.js benchmark
```

## Questions?

- Open a discussion on GitHub Discussions
- Join our community chat (link TBD)
- Check existing documentation in docs/

## License

By contributing to pq-bsv, you agree that your contributions will be licensed under the MIT License.
