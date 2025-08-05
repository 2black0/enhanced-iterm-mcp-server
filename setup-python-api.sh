#!/bin/bash

echo "🚀 Enhanced iTerm MCP Server - Python API Setup"
echo "================================================"

# Check if iTerm2 is running
if ! pgrep -f "iTerm" > /dev/null; then
    echo "❌ iTerm2 is not running. Please start iTerm2 first."
    exit 1
fi

echo "✅ iTerm2 is running"

# Check Node.js version
node_version=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $node_version"

# Check Python version  
python_version=$(python3 --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Python3 not found. Please install Python 3.8+ first."
    exit 1
fi

echo "✅ Python version: $python_version"

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install npm dependencies"
    exit 1
fi

# Setup Python virtual environment
echo "🐍 Setting up Python virtual environment..."
if [ ! -d "iterm_env" ]; then
    python3 -m venv iterm_env
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment and install iterm2
source iterm_env/bin/activate
pip install iterm2
if [ $? -ne 0 ]; then
    echo "❌ Failed to install iterm2 package"
    exit 1
fi

echo "✅ Python environment setup complete"

# Build the project
echo "🔨 Building project..."
npm run build-python
if [ $? -ne 0 ]; then
    echo "❌ Failed to build project"
    exit 1
fi

echo "✅ Project built successfully"

# Check iTerm2 Python API status
echo "🔍 Checking iTerm2 Python API configuration..."

# Use AppleScript to check if Python API is enabled
api_enabled=$(osascript -e '
tell application "System Events"
    tell process "iTerm2"
        try
            click menu item "Preferences…" of menu "iTerm2" of menu bar 1
            delay 1
            click button "General" of toolbar 1 of window "Preferences"
            delay 0.5
            click button "Magic" of group 1 of window "Preferences"
            delay 0.5
            set api_status to value of checkbox "Enable Python API" of group 1 of window "Preferences"
            click button 1 of window "Preferences"
            return api_status
        on error
            return false
        end try
    end tell
end tell' 2>/dev/null)

if [ "$api_enabled" = "true" ] || [ "$api_enabled" = "1" ]; then
    echo "✅ Python API is enabled in iTerm2"
else
    echo "⚠️  Python API might not be enabled in iTerm2"
    echo ""
    echo "🔧 To enable Python API manually:"
    echo "   1. Open iTerm2 → Preferences (⌘,)"
    echo "   2. Go to General → Magic"
    echo "   3. Check 'Enable Python API'"
    echo "   4. Restart iTerm2"
    echo ""
    
    # Try to enable it automatically
    echo "🔄 Attempting to enable Python API automatically..."
    osascript -e '
    tell application "System Events"
        tell process "iTerm2"
            try
                click menu item "Preferences…" of menu "iTerm2" of menu bar 1
                delay 1
                click button "General" of toolbar 1 of window "Preferences"
                delay 0.5
                click button "Magic" of group 1 of window "Preferences"
                delay 0.5
                set checkbox_value to value of checkbox "Enable Python API" of group 1 of window "Preferences"
                if checkbox_value is false then
                    click checkbox "Enable Python API" of group 1 of window "Preferences"
                    delay 0.5
                    display notification "Python API enabled! Please restart iTerm2." with title "Enhanced iTerm MCP"
                end if
                click button 1 of window "Preferences"
            end try
        end tell
    end tell' 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Python API enabled automatically"
        echo "⚠️  Please restart iTerm2 for changes to take effect"
    else
        echo "⚠️  Could not enable automatically. Please enable manually."
    fi
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 Next steps:"
echo "   1. If not done automatically, enable Python API in iTerm2 preferences"
echo "   2. Restart iTerm2 if you just enabled the Python API"
echo "   3. Add to your MCP configuration:"
echo "      {"
echo "        \"mcpServers\": {"
echo "          \"enhanced-iterm-python\": {"
echo "            \"command\": \"node\","
echo "            \"args\": [\"$(pwd)/dist/index-python-api.js\"],"
echo "            \"type\": \"stdio\""
echo "          }"
echo "        }"
echo "      }"
echo ""
echo "🧪 Test the setup:"
echo "   npm run test-python"
echo ""
echo "📚 View documentation:"
echo "   cat README-PYTHON-API.md"
