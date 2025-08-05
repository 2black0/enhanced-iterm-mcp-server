# Changelog

All notable changes to Enhanced iTerm MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-08-05

### Added
- 🐍 **Python API Integration** - Complete rewrite using iTerm2 native Python API
- 🎯 **Advanced Terminal Operations**
  - Multi-pane broadcasting for simultaneous commands
  - Profile-based terminal creation with custom configurations
  - Real-time session monitoring with 10+ variables
  - Visual customization with tab coloring support
- 📊 **12 Comprehensive Tools**
  - `open-terminal` - Create terminals with profiles and commands
  - `split-terminal-horizontal` / `split-terminal-vertical` - Advanced pane splitting
  - `execute-command-in-pane` - Execute commands in specific panes
  - `broadcast-input` - Send commands to multiple panes simultaneously
  - `get-session-info` / `get-session-details` - Real-time session information
  - `monitor-session` - Monitor session changes over time
  - `set-tab-color` - Visual customization with colors
  - `list-all-sessions` - Complete iTerm2 overview
  - `list-panes` / `get-terminal-state` - Legacy compatibility
- 🔧 **Production Features**
  - Comprehensive error handling and logging
  - Timeout protection for all operations (30s default)
  - Virtual environment isolation for Python dependencies
  - Automatic cleanup of temporary Python scripts
  - Clean TypeScript implementation with full type safety

### Changed
- 🚀 **Complete Architecture Overhaul** - Migrated from AppleScript to Python API
- 📈 **Significant Performance Improvements** - Direct API access vs script execution
- 🛡️ **Enhanced Reliability** - Robust error handling with automatic retries
- 📖 **Streamlined Documentation** - Single comprehensive README

### Removed
- ❌ **AppleScript Version** - Deprecated due to limitations and reliability issues
- ❌ **Legacy Documentation** - Consolidated into single README
- ❌ **Temporary Files** - Cleaned up development artifacts

### Fixed
- 🐛 **Connection Stability** - Resolved websocket timeout issues
- 🔄 **Session Tracking** - Improved session ID resolution
- 🧹 **Memory Management** - Automatic cleanup of temporary resources

## [1.0.0] - Initial Release

### Added
- Basic AppleScript-based iTerm2 automation
- Terminal splitting capabilities
- Command execution in panes
- Basic session management

---

## Migration Guide: 1.x → 2.0

### For Users
1. **Update package.json** - Remove old binary references
2. **Enable Python API** - iTerm2 Preferences → General → Magic → Python API
3. **Update MCP configuration** - Use new binary path
4. **Test functionality** - Run `npm test` to verify

### For Developers
1. **Python Environment** - Run `./setup-python-api.sh`
2. **Dependencies Update** - All tools now use Python API
3. **Error Handling** - Enhanced with timeout protection
4. **Tool Parameters** - Some tool signatures have changed for better usability

### Breaking Changes
- AppleScript version completely removed
- Some tool parameter names changed for consistency
- Python API must be enabled in iTerm2
- Minimum requirements: Node.js 18+, Python 3.8+

---

**🎯 Version 2.0 represents a complete transformation into a production-ready, enterprise-grade terminal automation solution for AI assistants.**
