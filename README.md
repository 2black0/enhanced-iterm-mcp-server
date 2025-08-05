# 🚀 Enhanced iTerm MCP Server

[![npm version](https://badge.fury.io/js/enhanced-iterm-mcp-server.svg)](https://badge.fury.io/js/enhanced-iterm-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://www.apple.com/macos/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/python-%3E%3D3.8.0-blue.svg)](https://www.python.org/)

**Advanced iTerm2 automation with Python API integration** - The ultimate terminal control solution for AI assistants.

> ⚡ **Now with native Python API** - Direct iTerm2 integration for maximum reliability and performance

## ⚡ **Quick Start**

### 1. **Installation**

#### **Via NPM (Recommended) - Now Available!**
```bash
npm install -g enhanced-iterm-mcp-server
```

> 🎉 **Just Published!** The package is now available on NPM registry for easy installation.

#### **From Source**
```bash
git clone https://github.com/2black0/enhanced-iterm-mcp-server.git
cd enhanced-iterm-mcp-server
npm install
./setup-python-api.sh
npm run build
```

### 2. **Enable iTerm2 Python API**
1. Open iTerm2 → Preferences (⌘,)
2. Go to **General → Magic**
3. Check **"Enable Python API"**
4. Restart iTerm2

### 3. **Add to MCP Configuration**
```json
{
  "mcpServers": {
    "enhanced-iterm": {
      "command": "node",
      "args": ["/path/to/enhanced-iterm-mcp-server/dist/index-python-api.js"],
      "type": "stdio"
    }
  }
}
```

### 4. **Test Setup**
```bash
# If installed globally
enhanced-iterm-mcp test

# If installed from source
npm test
```

## 📦 **Installation Methods**

### **Global Installation (NPM)**
```bash
# Install globally
npm install -g enhanced-iterm-mcp-server

# Use anywhere
enhanced-iterm-mcp --help

# Configuration path for Claude Desktop
# ~/.npm/lib/node_modules/enhanced-iterm-mcp-server/dist/index-python-api.js
```

> ✅ **Package is now live on NPM!** Install with `npm install -g enhanced-iterm-mcp-server`

### **Local Project Installation**
```bash
# Install in project
npm install enhanced-iterm-mcp-server

# Use with npx
npx enhanced-iterm-mcp --help

# Configuration for Claude Desktop
# /path/to/project/node_modules/enhanced-iterm-mcp-server/dist/index-python-api.js
```

### **Direct Usage (NPX)**
```bash
# Use without installation
npx enhanced-iterm-mcp-server --help

# Claude Desktop configuration
{
  "mcpServers": {
    "enhanced-iterm": {
      "command": "npx",
      "args": ["enhanced-iterm-mcp-server"],
      "type": "stdio"
    }
  }
}
```

> 🚀 **Live on NPM Registry:** https://www.npmjs.com/package/enhanced-iterm-mcp-server

## 🛠 **Available Tools**

### **Terminal Management**
- `open-terminal` - Create new terminals with profiles and commands
- `list-all-sessions` - Complete overview of all iTerm2 windows/tabs/sessions

### **Advanced Pane Operations**
- `split-terminal-horizontal` / `split-terminal-vertical` - Split panes with profile support
- `execute-command-in-pane` - Execute commands in specific panes
- `broadcast-input` - Send commands to multiple panes simultaneously

### **Real-time Information**
- `get-session-info` - Basic session information and status
- `get-session-details` - Comprehensive session details with all variables
- `monitor-session` - Monitor session changes over time

### **Visual Customization**
- `set-tab-color` - Set tab colors (named colors or hex codes)

### **Legacy Compatibility**
- `list-panes` - List tracked panes
- `get-terminal-state` - Terminal state overview

## 🎯 **Key Features**

### **🐍 Python API Integration**
- Direct access to iTerm2's native Python API
- Real-time session variable monitoring
- Robust error handling with automatic retries
- No AppleScript limitations

### **📊 Advanced Automation**
- **Multi-pane broadcasting** for simultaneous commands
- **Profile-based terminal creation** with custom configurations
- **Real-time session monitoring** with 10+ variables
- **Visual customization** with tab coloring

### **🔧 Production Ready**
- Comprehensive error handling and logging
- Timeout protection for all operations  
- Virtual environment isolation
- Clean TypeScript implementation

## 📖 **Usage Examples**

### **Create and Split Terminals**
```javascript
// Open new terminal
await callTool("open-terminal", {
  command: "htop",
  workingDirectory: "/Users/username/projects"
})

// Split horizontally with profile
await callTool("split-terminal-horizontal", {
  profile: "Development",
  command: "npm run dev"
})
```

### **Multi-pane Operations**
```javascript
// Broadcast command to multiple panes
await callTool("broadcast-input", {
  paneIds: ["session-1", "session-2", "session-3"],
  command: "git status"
})

// Monitor session changes
await callTool("monitor-session", {
  paneId: "session-1",
  duration: 30
})
```

### **Real-time Information**
```javascript
// Get comprehensive session details
await callTool("get-session-details", {
  sessionId: "213D676B-19F7-42A4-9E34-B2B81D40105B"
})

// List all active sessions
await callTool("list-all-sessions", {})
```

## 🔧 **Development**

### **Build & Run**
```bash
npm run build    # Build TypeScript
npm start        # Run production
npm run dev      # Development mode
```

### **Testing**
```bash
npm test         # Test tool listing
npm run test-sessions  # Test session access
```

## 🚨 **Troubleshooting**

### **"Python API not enabled"**
- Enable in iTerm2 Preferences → General → Magic → Python API
- Restart iTerm2 after enabling

### **"Connection error"**
- Ensure iTerm2 is running
- Check Python virtual environment: `source iterm_env/bin/activate`
- Verify iterm2 package: `pip list | grep iterm2`

### **"Session not found"**
- Use `list-all-sessions` to get valid session IDs
- Session IDs change when sessions are closed/reopened

## 📄 **License**

ISC License

## 🙏 **Built With**

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [iTerm2 Python API](https://iterm2.com/python-api/)
- TypeScript + Node.js

---

**🎯 The Ultimate iTerm2 Automation Solution for AI Assistants**

## 🤝 **Contributing**

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### **Quick Start for Contributors**
```bash
git clone https://github.com/2black0/enhanced-iterm-mcp-server.git
cd enhanced-iterm-mcp-server
npm install
./setup-python-api.sh
npm run dev
```

## 📜 **Changelog**

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## 🙏 **Acknowledgments**

- [Model Context Protocol](https://github.com/modelcontextprotocol) by Anthropic
- [iTerm2 Python API](https://iterm2.com/python-api/) by George Nachman
- TypeScript community for excellent tooling

## ⭐ **Support**

If this project helps you, please consider:
- ⭐ Starring the repository
- 🐛 Reporting issues
- 🔧 Contributing improvements
- 📢 Sharing with others

---

*Built with ❤️ for the AI automation community*
