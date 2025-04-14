const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process'); // Use spawn for long-running processes
const { isAppProxyEnabled, enableAppProxy, disableAppProxy } = require('./toggleProxy');

let pythonProcess = null; // Variable to hold the python child process

function createWindow() {
    const win = new BrowserWindow({
      width: 300,
      height: 600,
      resizable: false,
      webPreferences: {
        // Preload script should be separate from renderer code usually
        // preload: path.join(__dirname, 'preload.js'), // Example if you had a preload.js
        preload: path.join(__dirname, 'renderer.js'), // Using renderer.js as preload as per your setup
        contextIsolation: false, // Be aware of security implications
        nodeIntegration: true,   // Be aware of security implications
      },
    });

    win.loadFile('index.html');

    // Optional: Open DevTools for debugging
    // win.webContents.openDevTools();
}

function startPythonProxy() {
  // Ensure only one instance runs
  if (pythonProcess) {
    console.log('Python proxy already running.');
    return;
  }

  const scriptPath = path.join(__dirname, 'client.py'); // Assumes client.py is in the same folder
  console.log(`Attempting to start Python script: ${scriptPath}`);

  // Use 'python' or 'python3' depending on your system setup
  // If python isn't in PATH, you might need the full path to the executable
  try {
    pythonProcess = spawn('python', [scriptPath]); // Or 'python3'

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Python Proxy STDOUT]: ${data.toString().trim()}`);
      // You could potentially send status updates to the renderer here if needed
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Python Proxy STDERR]: ${data.toString().trim()}`);
      // Handle errors - maybe show an error in the UI
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python proxy process exited with code ${code}`);
      pythonProcess = null; // Reset the variable when the process stops
      // If it stops unexpectedly, you might want to disable the system proxy
      if (isAppProxyEnabled()) {
        console.log("Python script stopped unexpectedly, disabling system proxy.");
        disableAppProxy();
        // TODO: Update UI from main process? (More complex)
        // For now, the user would need to manually toggle off or restart the app.
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python proxy process:', err);
      pythonProcess = null;
      // Maybe notify the user in the UI
    });

    console.log('Python proxy process initiated.');
  } catch (error) {
      console.error('Error spawning Python process:', error);
      pythonProcess = null;
  }
}

function stopPythonProxy() {
  if (pythonProcess) {
    console.log('Attempting to stop Python proxy process...');
    pythonProcess.kill('SIGTERM'); // Send termination signal
    // Force kill if it doesn't terminate gracefully after a delay (optional)
    setTimeout(() => {
        if (pythonProcess) {
            console.log('Forcing Python proxy process kill...');
            pythonProcess.kill('SIGKILL');
            pythonProcess = null;
        }
    }, 2000); // 2 seconds grace period
  } else {
    console.log('Python proxy process not running.');
  }
}

// --- IPC Handlers ---

ipcMain.handle('toggle-proxy', async () => {
  const currentState = isAppProxyEnabled();
  console.log(`Toggle requested. Current state (isAppProxyEnabled): ${currentState}`);

  if (currentState) {
    // Currently ON -> Turn OFF
    console.log("Turning proxy OFF...");
    stopPythonProxy();
    const success = disableAppProxy();
    return !success; // Return the new state (should be OFF)
  } else {
    // Currently OFF -> Turn ON
    console.log("Turning proxy ON...");
    startPythonProxy(); // Start python first
    const success = enableAppProxy();
    // Check if python process actually started
    if (!pythonProcess) {
        console.error("Failed to start Python process, rolling back proxy settings.");
        disableAppProxy(); // Attempt to disable registry setting if python failed
        return false; // Return OFF state
    }
    return success; // Return the new state (should be ON if successful)
  }
});

ipcMain.handle('get-proxy-status', async () => {
  // Use the refined check
  return isAppProxyEnabled();
});

// --- App Lifecycle ---

app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Ensure Python script and proxy settings are cleaned up on exit
app.on('will-quit', () => {
  console.log('App quitting. Cleaning up...');
  stopPythonProxy();
  // Optionally, ensure proxy is disabled on quit, regardless of state
  // This prevents leaving the system proxy enabled if the app crashes
  if (isAppProxyEnabled()) {
      console.log("Disabling system proxy on quit.");
      disableAppProxy();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});