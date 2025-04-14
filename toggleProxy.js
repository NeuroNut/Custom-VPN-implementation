const { execSync } = require('child_process');

// Your proxy IP and port
const proxy = "192.168.1.100:8080";

function isProxyEnabled() {
  try {
    const result = execSync(`reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable`, { encoding: 'utf-8' });
    const enabled = result.includes("0x1");
    return enabled;
  } catch (error) {
    console.error("Error checking proxy:", error);
    return false;
  }
}

function toggleProxy() {
  try {
    const enabled = isProxyEnabled();

    if (enabled) {
      // Disable proxy
      execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`);
    } else {
      // Enable and set proxy
      execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`);
      execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d ${proxy} /f`);
    }

    return !enabled;
  } catch (error) {
    console.error("Failed to toggle proxy:", error);
    return false;
  }
}

module.exports = { toggleProxy, isProxyEnabled };
