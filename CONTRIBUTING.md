# Contributing to Enhanced iTerm MCP Server

Thank you for your interest in contributing to Enhanced iTerm MCP Server! This document provides guidelines for contributing to this project.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- macOS (required for iTerm2)
- iTerm2 with Python API enabled

### Setup Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/2black0/enhanced-iterm-mcp-server.git
   cd enhanced-iterm-mcp-server
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ./setup-python-api.sh
   ```

3. **Build and Test**
   ```bash
   npm run build
   npm test
   ```

## 🛠 Development Workflow

### Making Changes

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Edit TypeScript files in `src/`
   - Update documentation if needed
   - Add tests for new features

3. **Test Your Changes**
   ```bash
   npm run build
   npm test
   npm run test-sessions
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Commit Message Format
Follow conventional commits:
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

## 📋 Pull Request Process

1. **Update Documentation**
   - Update README.md if adding new features
   - Add JSDoc comments to new functions
   - Update CHANGELOG.md

2. **Ensure Tests Pass**
   ```bash
   npm run build
   npm test
   ```

3. **Create Pull Request**
   - Use descriptive title
   - Reference related issues
   - Include summary of changes
   - Add screenshots if UI changes

## 🧪 Testing

### Test Commands
```bash
npm test              # Test tool listing
npm run test-sessions # Test session functionality
```

### Manual Testing
1. Enable iTerm2 Python API
2. Test with Claude Desktop configuration
3. Verify all tools work correctly

## 📝 Code Style

- Use TypeScript for all source code
- Follow existing code formatting
- Use meaningful variable names
- Add JSDoc comments for public functions
- Handle errors gracefully

## 🐛 Bug Reports

When reporting bugs, include:
- iTerm2 version
- macOS version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

## 💡 Feature Requests

For new features:
- Describe the use case
- Explain why it would be useful
- Consider backwards compatibility
- Provide implementation ideas if possible

## 📖 Documentation

- Keep README.md up to date
- Document all configuration options
- Provide usage examples
- Include troubleshooting tips

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- GitHub contributors list
- CHANGELOG.md for significant contributions
- README.md acknowledgments

---

Thank you for contributing to Enhanced iTerm MCP Server! 🎉
