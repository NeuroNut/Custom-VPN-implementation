const { execSync } = require('child_process');

// Proxy settings point to the LOCAL Python script
const LOCAL_PROXY_ADDRESS = "127.0.0.1";
const LOCAL_PROXY_PORT = 8080;
const LOCAL_PROXY_SERVER_STRING = `${LOCAL_PROXY_ADDRESS}:${LOCAL_PROXY_PORT}`;

// Function to check if *our specific* proxy is enabled
function isAppProxyEnabled() {
  try {
    const enableResult = execSync(`reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable`, { encoding: 'utf-8' });
    const serverResult = execSync(`reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer`, { encoding: 'utf-8' });

    const isEnabled = enableResult.includes("0x1");
    // Check if the ProxyServer value matches our local proxy exactly
    const isCorrectServer = serverResult.includes(LOCAL_PROXY_SERVER_STRING);

    console.log(`isAppProxyEnabled Check: Enabled=${isEnabled}, CorrectServer=${isCorrectServer}`);
    return isEnabled && isCorrectServer;
  } catch (error) {
    // Ignore errors if the key/value doesn't exist (means it's definitely not set correctly)
    if (error.message.includes('Cannot find the registry key or value specified')) {
        console.log("isAppProxyEnabled Check: Registry key/value not found (Proxy likely off).");
        return false;
    }
    console.error("Error checking proxy status:", error.message);
    return false; // Assume disabled on error
  }
}

// Function to enable the system proxy and set it to our local script
function enableAppProxy() {
  try {
    console.log(`Enabling proxy: ${LOCAL_PROXY_SERVER_STRING}`);
    execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`);
    execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d ${LOCAL_PROXY_SERVER_STRING} /f`);
    // Important: Force settings refresh (might not always work immediately for all apps)
    // execSync('ipconfig /flushdns'); // Optional: flush DNS cache
    console.log("Proxy enabled in registry.");
    return true;
  } catch (error) {
    console.error("Failed to enable proxy:", error);
    return false;
  }
}

// Function to disable the system proxy
function disableAppProxy() {
  try {
    console.log("Disabling proxy.");
    execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`);
    // We don't need to clear ProxyServer, just disable it.
    // execSync('ipconfig /flushdns'); // Optional: flush DNS cache
    console.log("Proxy disabled in registry.");
    return true;
  } catch (error) {
    console.error("Failed to disable proxy:", error);
    return false;
  }
}

module.exports = { isAppProxyEnabled, enableAppProxy, disableAppProxy };