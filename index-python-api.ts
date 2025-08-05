#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn, exec, ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced data structures for window/tab/pane hierarchy
interface PaneInfo {
  id: string;
  sessionId: string;
  process: ChildProcess | null;
  output: string[];
  windowId: string;
  tabId: string;
  position: { x: number; y: number };
  isActive: boolean;
  title?: string;
  workingDirectory?: string;
  foregroundJob?: string;
}

interface TabInfo {
  id: string;
  windowId: string;
  panes: Map<string, PaneInfo>;
  activePaneId?: string;
  title?: string;
  color?: string;
}

interface WindowInfo {
  id: string;
  tabs: Map<string, TabInfo>;
  activeTabId?: string;
  title?: string;
  isFullScreen?: boolean;
  frame?: { x: number; y: number; width: number; height: number };
}

// Global state management
const windows = new Map<string, WindowInfo>();
const tabs = new Map<string, TabInfo>();
const panes = new Map<string, PaneInfo>();
let windowCounter = 0;
let tabCounter = 0;
let paneCounter = 0;

// Python script directory
const pythonScriptsDir = join(__dirname, 'python_scripts');

// Ensure python scripts directory exists
if (!existsSync(pythonScriptsDir)) {
  mkdirSync(pythonScriptsDir, { recursive: true });
}

// Clean up old temporary scripts on startup
function cleanupOldScripts() {
  try {
    const files = readdirSync(pythonScriptsDir);
    const now = Date.now();
    
    for (const file of files) {
      if (file.startsWith('iterm_script_') && file.endsWith('.py')) {
        const filePath = join(pythonScriptsDir, file);
        const stats = statSync(filePath);
        
        // Delete files older than 5 minutes (300000 ms)
        if (now - stats.mtime.getTime() > 300000) {
          unlinkSync(filePath);
        }
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Clean up old scripts on startup
cleanupOldScripts();

// Helper function to execute Python scripts for iTerm2 API
async function executeITermPythonScript(scriptContent: string): Promise<string> {
  const execPromise = promisify(exec);
  
  // Create a temporary Python script
  const scriptPath = join(pythonScriptsDir, `iterm_script_${Date.now()}.py`);
  
  const fullScript = `#!/usr/bin/env python3
import iterm2
import asyncio
import json
import sys
import traceback

async def main(connection):
    try:
${scriptContent.split('\n').map(line => '        ' + line).join('\n')}
    except Exception as e:
        error_details = {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "error_type": type(e).__name__
        }
        print(json.dumps(error_details))
        sys.exit(1)

# Run the script with better connection handling
try:
    iterm2.run_until_complete(main, retry=False)
except Exception as conn_error:
    print(json.dumps({"error": f"Connection error: {str(conn_error)}"}))
    sys.exit(1)
`;

  writeFileSync(scriptPath, fullScript);

  try {
    const { stdout, stderr } = await execPromise(`source "${join(__dirname, '../iterm_env/bin/activate')}" && timeout 30 python3 "${scriptPath}"`, {
      timeout: 35000  // 35 second timeout
    });
    
    if (stderr && !stderr.includes('Warning')) {
      console.error("Python script stderr:", stderr);
    }
    
    return stdout.trim();
  } catch (error: any) {
    console.error("Python script error:", error);
    throw new Error(`Python execution failed: ${error.message}`);
  } finally {
    // Clean up temporary script
    try {
      unlinkSync(scriptPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

// Helper function to create background process for output collection
function createBackgroundProcess(paneId: string): ChildProcess {
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";
  const terminal = spawn(shell, [], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });

  const pane = panes.get(paneId);
  if (!pane) return terminal;

  terminal.stdout?.on("data", (data: Buffer) => {
    pane.output.push(data.toString());
  });

  terminal.stderr?.on("data", (data: Buffer) => {
    pane.output.push(data.toString());
  });

  return terminal;
}

// Create server instance
const server = new McpServer({
  name: "enhanced-iterm-python-mcp",
  version: "2.0.0",
});

// ENHANCED TOOLS WITH PYTHON API

// 1. Open new terminal window
server.registerTool(
  "open-terminal",
  {
    title: "Open New Terminal",
    description: "Open a new iTerm terminal window using Python API",
    inputSchema: {
      profile: z.string().describe("Profile name to use").optional(),
      command: z.string().describe("Initial command to run").optional(),
      workingDirectory: z.string().describe("Working directory").optional()
    }
  },
  async ({ profile, command, workingDirectory }: { profile?: string; command?: string; workingDirectory?: string }) => {
    const windowId = `window-${windowCounter++}`;
    const tabId = `tab-${tabCounter++}`;
    const paneId = `pane-${paneCounter++}`;

    const scriptContent = `
app = await iterm2.async_get_app(connection)

# Create new window
window = await iterm2.Window.async_create(connection${profile ? `, profile="${profile}"` : ''})
session = window.current_tab.current_session

# Set working directory if provided
${workingDirectory ? `await session.async_send_text("cd \\"${workingDirectory}\\"\\n")` : ''}

# Run initial command if provided
${command ? `await session.async_send_text("${command}\\n")` : ''}

# Get session info
session_id = session.session_id
window_id = window.window_id
tab_id = window.current_tab.tab_id

result = {
    "success": True,
    "windowId": f"${windowId}",
    "tabId": f"${tabId}",
    "paneId": f"${paneId}",
    "sessionId": session_id,
    "realWindowId": window_id,
    "realTabId": tab_id
}

print(json.dumps(result))
`;

    try {
      const result = await executeITermPythonScript(scriptContent);
      const data = JSON.parse(result);
      
      // Create data structures
      const pane: PaneInfo = {
        id: paneId,
        sessionId: data.sessionId,
        process: createBackgroundProcess(paneId),
        output: [],
        windowId,
        tabId,
        position: { x: 0, y: 0 },
        isActive: true,
        workingDirectory
      };

      const tab: TabInfo = {
        id: tabId,
        windowId,
        panes: new Map([[paneId, pane]]),
        activePaneId: paneId
      };

      const window: WindowInfo = {
        id: windowId,
        tabs: new Map([[tabId, tab]]),
        activeTabId: tabId
      };

      // Store in global maps
      panes.set(paneId, pane);
      tabs.set(tabId, tab);
      windows.set(windowId, window);

      return {
        content: [{
          type: "text",
          text: `Terminal opened - Window: ${windowId}, Tab: ${tabId}, Pane: ${paneId}, Session: ${data.sessionId}`
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to create terminal: ${error.message}`);
    }
  }
);

// 2. Split terminal horizontally
server.registerTool(
  "split-terminal-horizontal",
  {
    title: "Split Terminal Horizontal",
    description: "Split the current or specified terminal pane horizontally using Python API",
    inputSchema: {
      paneId: z.string().describe("ID of the pane to split").optional(),
      profile: z.string().describe("Profile for new pane").optional(),
      command: z.string().describe("Command to run in new pane").optional()
    }
  },
  async ({ paneId, profile, command }: { paneId?: string; profile?: string; command?: string }) => {
    let targetPane: PaneInfo;
    
    if (paneId) {
      const pane = panes.get(paneId);
      if (!pane) {
        return {
          content: [{
            type: "text",
            text: `Pane ${paneId} not found`
          }]
        };
      }
      targetPane = pane;
    } else {
      // Find the active pane
      const activePanes = Array.from(panes.values()).filter(p => p.isActive);
      if (activePanes.length === 0) {
        return {
          content: [{
            type: "text", 
            text: "No active pane found"
          }]
        };
      }
      targetPane = activePanes[0];
    }

    const newPaneId = `pane-${paneCounter++}`;
    
    const scriptContent = `
app = await iterm2.async_get_app(connection)

# Find the session by session_id
target_session = None
for window in app.windows:
    for tab in window.tabs:
        for session in tab.sessions:
            if session.session_id == "${targetPane.sessionId}":
                target_session = session
                break

if target_session:
    # Split horizontally
    new_session = await target_session.async_split_pane(vertical=False${profile ? `, profile="${profile}"` : ''})
    
    # Run command if provided
    ${command ? `await new_session.async_send_text("${command}\\n")` : ''}
    
    result = {
        "success": True,
        "newPaneId": "${newPaneId}",
        "newSessionId": new_session.session_id
    }
    print(json.dumps(result))
else:
    result = {"error": "Target session not found"}
    print(json.dumps(result))
`;

    try {
      const result = await executeITermPythonScript(scriptContent);
      const data = JSON.parse(result);
      
      if (data.error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${data.error}`
          }]
        };
      }

      // Create new pane data structure
      const newPane: PaneInfo = {
        id: newPaneId,
        sessionId: data.newSessionId,
        process: createBackgroundProcess(newPaneId),
        output: [],
        windowId: targetPane.windowId,
        tabId: targetPane.tabId,
        position: { x: targetPane.position.x, y: targetPane.position.y + 1 },
        isActive: true
      };

      // Add to tab's panes
      const tab = tabs.get(targetPane.tabId)!;
      tab.panes.set(newPaneId, newPane);
      panes.set(newPaneId, newPane);

      // Set old pane as inactive
      targetPane.isActive = false;

      return {
        content: [{
          type: "text",
          text: `Pane split horizontally - New pane: ${newPaneId}, Session: ${data.newSessionId}`
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to split pane horizontally: ${error.message}`);
    }
  }
);

// 3. Split terminal vertically
server.registerTool(
  "split-terminal-vertical",
  {
    title: "Split Terminal Vertical",
    description: "Split the current or specified terminal pane vertically using Python API",
    inputSchema: {
      paneId: z.string().describe("ID of the pane to split").optional(),
      profile: z.string().describe("Profile for new pane").optional(),
      command: z.string().describe("Command to run in new pane").optional()
    }
  },
  async ({ paneId, profile, command }: { paneId?: string; profile?: string; command?: string }) => {
    let targetPane: PaneInfo;
    
    if (paneId) {
      const pane = panes.get(paneId);
      if (!pane) {
        return {
          content: [{
            type: "text",
            text: `Pane ${paneId} not found`
          }]
        };
      }
      targetPane = pane;
    } else {
      // Find the active pane
      const activePanes = Array.from(panes.values()).filter(p => p.isActive);
      if (activePanes.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No active pane found"
          }]
        };
      }
      targetPane = activePanes[0];
    }

    const newPaneId = `pane-${paneCounter++}`;
    
    const scriptContent = `
app = await iterm2.async_get_app(connection)

# Find the session by session_id
target_session = None
for window in app.windows:
    for tab in window.tabs:
        for session in tab.sessions:
            if session.session_id == "${targetPane.sessionId}":
                target_session = session
                break

if target_session:
    # Split vertically
    new_session = await target_session.async_split_pane(vertical=True${profile ? `, profile="${profile}"` : ''})
    
    # Run command if provided
    ${command ? `await new_session.async_send_text("${command}\\n")` : ''}
    
    result = {
        "success": True,
        "newPaneId": "${newPaneId}",
        "newSessionId": new_session.session_id
    }
    print(json.dumps(result))
else:
    result = {"error": "Target session not found"}
    print(json.dumps(result))
`;

    try {
      const result = await executeITermPythonScript(scriptContent);
      const data = JSON.parse(result);
      
      if (data.error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${data.error}`
          }]
        };
      }

      // Create new pane data structure
      const newPane: PaneInfo = {
        id: newPaneId,
        sessionId: data.newSessionId,
        process: createBackgroundProcess(newPaneId),
        output: [],
        windowId: targetPane.windowId,
        tabId: targetPane.tabId,
        position: { x: targetPane.position.x + 1, y: targetPane.position.y },
        isActive: true
      };

      // Add to tab's panes
      const tab = tabs.get(targetPane.tabId)!;
      tab.panes.set(newPaneId, newPane);
      panes.set(newPaneId, newPane);

      // Set old pane as inactive  
      targetPane.isActive = false;

      return {
        content: [{
          type: "text",
          text: `Pane split vertically - New pane: ${newPaneId}, Session: ${data.newSessionId}`
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to split pane vertically: ${error.message}`);
    }
  }
);

// 4. Execute command in specific pane
server.registerTool(
  "execute-command-in-pane",
  {
    title: "Execute Command in Pane",
    description: "Execute a command in a specific pane using Python API",
    inputSchema: {
      paneId: z.string().describe("ID of the pane to execute command in"),
      command: z.string().describe("Command to execute")
    }
  },
  async ({ paneId, command }: { paneId: string; command: string }) => {
    const pane = panes.get(paneId);
    if (!pane) {
      return {
        content: [{
          type: "text",
          text: `Pane ${paneId} not found`
        }]
      };
    }

    const scriptContent = `
app = await iterm2.async_get_app(connection)

# Find the session by session_id
target_session = None
for window in app.windows:
    for tab in window.tabs:
        for session in tab.sessions:
            if session.session_id == "${pane.sessionId}":
                target_session = session
                break

if target_session:
    # Execute command
    await target_session.async_send_text("${command.replace(/"/g, '\\"')}\\n")
    
    result = {
        "success": True,
        "command": "${command.replace(/"/g, '\\"')}"
    }
    print(json.dumps(result))
else:
    result = {"error": "Target session not found"}
    print(json.dumps(result))
`;

    try {
      const result = await executeITermPythonScript(scriptContent);
      const data = JSON.parse(result);
      
      if (data.error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${data.error}`
          }]
        };
      }

      // Also execute in background process
      if (pane.process && pane.process.stdin) {
        pane.process.stdin.write(command + "\n");
      }

      return {
        content: [{
          type: "text",
          text: `Command executed in pane ${paneId}: ${command}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Failed to execute command in pane ${paneId}: ${error.message}`
        }]
      };
    }
  }
);

// 5. Get real-time session information
server.registerTool(
  "get-session-info",
  {
    title: "Get Session Information",
    description: "Get detailed real-time information about a session using Python API",
    inputSchema: {
      paneId: z.string().describe("ID of the pane to get session info for")
    }
  },
  async ({ paneId }: { paneId: string }) => {
    const pane = panes.get(paneId);
    if (!pane) {
      return {
        content: [{
          type: "text",
          text: `Pane ${paneId} not found`
        }]
      };
    }

    const scriptContent = `
app = await iterm2.async_get_app(connection)

# Find the session by session_id
target_session = None
for window in app.windows:
    for tab in window.tabs:
        for session in tab.sessions:
            if session.session_id == "${pane.sessionId}":
                target_session = session
                break

if target_session:
    # Get session information
    info = {
        "success": True,
        "session_id": target_session.session_id,
        "name": await target_session.async_get_variable("session.name"),
        "working_directory": await target_session.async_get_variable("session.path"),
        "foreground_job": await target_session.async_get_variable("session.foregroundJob"),
        "title": await target_session.async_get_variable("session.title"),
        "columns": target_session.preferred_size.width,
        "rows": target_session.preferred_size.height,
        "is_at_shell_prompt": await target_session.async_get_variable("session.isAtShellPrompt"),
        "tty": await target_session.async_get_variable("session.tty")
    }
    print(json.dumps(info))
else:
    result = {"error": "Target session not found"}
    print(json.dumps(result))
`;

    try {
      const result = await executeITermPythonScript(scriptContent);
      const data = JSON.parse(result);
      
      if (data.error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${data.error}`
          }]
        };
      }

      // Update pane info
      pane.title = data.title;
      pane.workingDirectory = data.working_directory;
      pane.foregroundJob = data.foreground_job;

      return {
        content: [{
          type: "text",
          text: `Session Information for ${paneId}:\n${JSON.stringify(data, null, 2)}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Failed to get session info: ${error.message}`
        }]
      };
    }
  }
);

// 6. Get detailed session information by session ID
server.registerTool(
  "get-session-details",
  {
    title: "Get Session Details",
    description: "Get detailed information about a session using session ID",
    inputSchema: {
      sessionId: z.string().describe("Session ID of the session to get details for")
    }
  },
  async ({ sessionId }: { sessionId: string }) => {
    const scriptContent = `
try:
    app = await iterm2.async_get_app(connection)

    # Find the session by session_id directly
    target_session = None
    for window in app.windows:
        for tab in window.tabs:
            for session in tab.sessions:
                if session.session_id == "${sessionId}":
                    target_session = session
                    break
            if target_session:
                break
        if target_session:
            break

    if target_session:
        try:
            session_details = {
                "success": True,
                "session_id": target_session.session_id,
                "columns": target_session.columns if hasattr(target_session, 'columns') else 'Unknown',
                "rows": target_session.rows if hasattr(target_session, 'rows') else 'Unknown'
            }
            
            # Get comprehensive session variables
            variables_to_get = [
                "session.path",
                "session.foregroundJob", 
                "session.name",
                "session.isAtShellPrompt",
                "session.title", 
                "session.tty",
                "session.hostname",
                "session.username",
                "session.lastCommand"
            ]
            
            for var_name in variables_to_get:
                try:
                    value = await target_session.async_get_variable(var_name)
                    session_details[var_name.replace("session.", "")] = value
                except:
                    session_details[var_name.replace("session.", "")] = "Unknown"
            
            result = session_details
            print(json.dumps(result))
            
        except Exception as session_error:
            result = {"error": f"Session access error: {str(session_error)}"}
            print(json.dumps(result))
    else:
        result = {"error": "Target session not found"}
        print(json.dumps(result))
        
except Exception as e:
    result = {"error": f"General error: {str(e)}"}
    print(json.dumps(result))
`;

    try {
      const result = await executeITermPythonScript(scriptContent);
      const data = JSON.parse(result);
      
      if (data.error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${data.error}`
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: `Detailed Session Information (${sessionId}):\n` +
                `Session ID: ${data.session_id}\n` +
                `Working Directory: ${data.path}\n` +
                `Foreground Job: ${data.foregroundJob}\n` +
                `Session Name: ${data.name}\n` +
                `Session Title: ${data.title}\n` +
                `TTY: ${data.tty}\n` +
                `Hostname: ${data.hostname}\n` +
                `Username: ${data.username}\n` +
                `Last Command: ${data.lastCommand}\n` +
                `At Shell Prompt: ${data.isAtShellPrompt}\n` +
                `Terminal Size: ${data.columns}x${data.rows} (cols x rows)`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Failed to read session content: ${error.message}`
        }]
      };
    }
  }
);

// 7. Set tab color
server.registerTool(
  "set-tab-color",
  {
    title: "Set Tab Color",
    description: "Set the color of a tab using Python API",
    inputSchema: {
      paneId: z.string().describe("ID of a pane in the tab"),
      color: z.string().describe("Color name or hex code (red, blue, green, #FF0000, etc.)")
    }
  },
  async ({ paneId, color }: { paneId: string; color: string }) => {
    const pane = panes.get(paneId);
    if (!pane) {
      return {
        content: [{
          type: "text",
          text: `Pane ${paneId} not found`
        }]
      };
    }

    const scriptContent = `
import iterm2

app = await iterm2.async_get_app(connection)

# Find the session by session_id
target_session = None
for window in app.windows:
    for tab in window.tabs:
        for session in tab.sessions:
            if session.session_id == "${pane.sessionId}":
                target_session = session
                target_tab = tab
                break

if target_session:
    # Set tab color
    color_value = "${color}"
    if color_value.startswith("#"):
        # Hex color
        hex_color = color_value[1:]
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0
        color_obj = iterm2.Color(r, g, b)
    else:
        # Named color
        color_map = {
            "red": iterm2.Color(1, 0, 0),
            "green": iterm2.Color(0, 1, 0),
            "blue": iterm2.Color(0, 0, 1),
            "yellow": iterm2.Color(1, 1, 0),
            "purple": iterm2.Color(1, 0, 1),
            "cyan": iterm2.Color(0, 1, 1),
            "orange": iterm2.Color(1, 0.5, 0),
            "pink": iterm2.Color(1, 0.7, 0.8)
        }
        color_obj = color_map.get(color_value.lower(), iterm2.Color(0.5, 0.5, 0.5))
    
    await target_tab.async_set_variable("user.tab_color", color_obj)
    change = iterm2.LocalWriteOnlyProfile()
    change.set_tab_color(color_obj)
    await target_session.async_set_profile_properties(change)
    
    result = {
        "success": True,
        "color": color_value
    }
    print(json.dumps(result))
else:
    result = {"error": "Target session not found"}
    print(json.dumps(result))
`;

    try {
      const result = await executeITermPythonScript(scriptContent);
      const data = JSON.parse(result);
      
      if (data.error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${data.error}`
          }]
        };
      }

      // Update tab info
      const tab = tabs.get(pane.tabId)!;
      tab.color = color;

      return {
        content: [{
          type: "text",
          text: `Tab color set to ${color} for pane ${paneId}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Failed to set tab color: ${error.message}`
        }]
      };
    }
  }
);

// 8. List all windows and sessions
server.registerTool(
  "list-all-sessions",
  {
    title: "List All Sessions",
    description: "List all iTerm2 windows, tabs, and sessions using Python API",
    inputSchema: {}
  },
  async () => {
    const scriptContent = `
app = await iterm2.async_get_app(connection)

windows_info = []
for window in app.windows:
    window_info = {
        "window_id": window.window_id,
        "frame": {"x": window.frame.origin.x, "y": window.frame.origin.y, 
                 "width": window.frame.size.width, "height": window.frame.size.height},
        "tabs": []
    }
    
    for tab in window.tabs:
        # Get tab title from first session if available
        tab_title = "Tab"
        if tab.sessions:
            try:
                tab_title = await tab.sessions[0].async_get_variable("session.title") or f"Tab {tab.tab_id}"
            except:
                tab_title = f"Tab {tab.tab_id}"
        
        tab_info = {
            "tab_id": tab.tab_id, 
            "title": tab_title,
            "sessions": []
        }
        
        for session in tab.sessions:
            session_info = {
                "session_id": session.session_id,
                "name": await session.async_get_variable("session.name") or "Unknown",
                "working_directory": await session.async_get_variable("session.path") or "Unknown",
                "foreground_job": await session.async_get_variable("session.foregroundJob") or "Unknown",
                "is_at_shell_prompt": await session.async_get_variable("session.isAtShellPrompt"),
                "columns": session.preferred_size.width,
                "rows": session.preferred_size.height
            }
            tab_info["sessions"].append(session_info)
        
        window_info["tabs"].append(tab_info)
    
    windows_info.append(window_info)

result = {
    "success": True,
    "windows": windows_info,
    "total_windows": len(windows_info),
    "total_sessions": sum(len(tab["sessions"]) for window in windows_info for tab in window["tabs"])
}
print(json.dumps(result))
`;

    try {
      const result = await executeITermPythonScript(scriptContent);
      const data = JSON.parse(result);
      
      if (data.error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${data.error}`
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: `iTerm2 Sessions Overview:\n${JSON.stringify(data, null, 2)}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Failed to list sessions: ${error.message}`
        }]
      };
    }
  }
);

// 9. Monitor session for changes
server.registerTool(
  "monitor-session",
  {
    title: "Monitor Session Changes", 
    description: "Monitor a session for changes in working directory, foreground job, etc.",
    inputSchema: {
      paneId: z.string().describe("ID of the pane to monitor"),
      duration: z.number().describe("Duration to monitor in seconds").optional().default(10)
    }
  },
  async ({ paneId, duration }: { paneId: string; duration?: number }) => {
    const pane = panes.get(paneId);
    if (!pane) {
      return {
        content: [{
          type: "text",
          text: `Pane ${paneId} not found`
        }]
      };
    }

    const scriptContent = `
import time

app = await iterm2.async_get_app(connection)

# Find the session by session_id
target_session = None
for window in app.windows:
    for tab in window.tabs:
        for session in tab.sessions:
            if session.session_id == "${pane.sessionId}":
                target_session = session
                break

if target_session:
    changes = []
    start_time = time.time()
    duration = ${duration || 10}
    
    # Initial state
    prev_working_dir = await target_session.async_get_variable("session.path")
    prev_foreground_job = await target_session.async_get_variable("session.foregroundJob")
    prev_at_shell_prompt = await target_session.async_get_variable("session.isAtShellPrompt")
    
    changes.append({
        "timestamp": start_time,
        "event": "monitoring_started",
        "working_directory": prev_working_dir,
        "foreground_job": prev_foreground_job,
        "at_shell_prompt": prev_at_shell_prompt
    })
    
    # Monitor for changes
    while time.time() - start_time < duration:
        await asyncio.sleep(1)
        
        curr_working_dir = await target_session.async_get_variable("session.path")
        curr_foreground_job = await target_session.async_get_variable("session.foregroundJob")
        curr_at_shell_prompt = await target_session.async_get_variable("session.isAtShellPrompt")
        
        if (curr_working_dir != prev_working_dir or 
            curr_foreground_job != prev_foreground_job or
            curr_at_shell_prompt != prev_at_shell_prompt):
            
            changes.append({
                "timestamp": time.time(),
                "event": "change_detected",
                "working_directory": curr_working_dir,
                "foreground_job": curr_foreground_job,
                "at_shell_prompt": curr_at_shell_prompt
            })
            
            prev_working_dir = curr_working_dir
            prev_foreground_job = curr_foreground_job
            prev_at_shell_prompt = curr_at_shell_prompt
    
    result = {
        "success": True,
        "changes": changes,
        "monitoring_duration": duration
    }
    print(json.dumps(result))
else:
    result = {"error": "Target session not found"}
    print(json.dumps(result))
`;

    try {
      const result = await executeITermPythonScript(scriptContent);
      const data = JSON.parse(result);
      
      if (data.error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${data.error}`
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: `Session Monitoring Results for ${paneId}:\n${JSON.stringify(data, null, 2)}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Failed to monitor session: ${error.message}`
        }]
      };
    }
  }
);

// 10. Advanced: Broadcast input to multiple panes
server.registerTool(
  "broadcast-input",
  {
    title: "Broadcast Input",
    description: "Send input to multiple panes simultaneously",
    inputSchema: {
      paneIds: z.array(z.string()).describe("Array of pane IDs to broadcast to"),
      command: z.string().describe("Command to broadcast")
    }
  },
  async ({ paneIds, command }: { paneIds: string[]; command: string }) => {
    const validPanes = paneIds.filter(id => panes.has(id));
    if (validPanes.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No valid panes found"
        }]
      };
    }

    const sessionIds = validPanes.map(id => panes.get(id)!.sessionId);

    const scriptContent = `
app = await iterm2.async_get_app(connection)

target_sessions = []
session_ids = ${JSON.stringify(sessionIds)}

# Find all target sessions
for window in app.windows:
    for tab in window.tabs:
        for session in tab.sessions:
            if session.session_id in session_ids:
                target_sessions.append(session)

# Broadcast command to all sessions
results = []
for session in target_sessions:
    try:
        await session.async_send_text("${command.replace(/"/g, '\\"')}\\n")
        results.append({"session_id": session.session_id, "success": True})
    except Exception as e:
        results.append({"session_id": session.session_id, "success": False, "error": str(e)})

result = {
    "success": True,
    "broadcast_results": results,
    "total_panes": len(results)
}
print(json.dumps(result))
`;

    try {
      const result = await executeITermPythonScript(scriptContent);
      const data = JSON.parse(result);

      return {
        content: [{
          type: "text",
          text: `Broadcast Results:\nCommand "${command}" sent to ${data.total_panes} panes\n${JSON.stringify(data.broadcast_results, null, 2)}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Failed to broadcast input: ${error.message}`
        }]
      };
    }
  }
);

// Legacy compatibility tools
server.registerTool(
  "list-panes",
  {
    title: "List All Panes",
    description: "List all tracked panes with their information",
    inputSchema: {}
  },
  async () => {
    const paneList = Array.from(panes.entries()).map(([id, pane]) => {
      return `${id}: Window=${pane.windowId}, Tab=${pane.tabId}, Session=${pane.sessionId}, Position=(${pane.position.x},${pane.position.y}), Active=${pane.isActive}`;
    });

    return {
      content: [{
        type: "text",
        text: `Total panes: ${panes.size}\n${paneList.join('\n') || 'No panes found'}`
      }]
    };
  }
);

server.registerTool(
  "get-terminal-state",
  {
    title: "Get Terminal State",
    description: "Get complete overview of all windows, tabs, and panes",
    inputSchema: {}
  },
  async () => {
    const state = {
      windows: windows.size,
      tabs: tabs.size,
      panes: panes.size,
      details: Array.from(windows.entries()).map(([windowId, window]) => ({
        windowId,
        activeTabId: window.activeTabId,
        tabs: Array.from(window.tabs.entries()).map(([tabId, tab]) => ({
          tabId,
          activePaneId: tab.activePaneId,
          panes: Array.from(tab.panes.keys())
        }))
      }))
    };

    return {
      content: [{
        type: "text",
        text: `Terminal State Overview:\n${JSON.stringify(state, null, 2)}`
      }]
    };
  }
);

// Main function to start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Enhanced iTerm MCP Server with Python API running on stdio");
  console.error("Features: Split terminals, pane management, Python API integration, real-time monitoring");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
