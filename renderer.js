const { ipcRenderer } = require('electron');

const toggle = document.getElementById('powerToggle');
const statusText = document.getElementById('statusText');

async function updateUI() {
  try {
    statusText.textContent = 'Checking...';
    const isOn = await ipcRenderer.invoke('get-proxy-status');
    console.log(`UI Update: Proxy status from main process = ${isOn}`);
    toggle.checked = isOn;
    statusText.textContent = isOn ? 'Proxy is ON' : 'Proxy is OFF';
  } catch (error) {
    console.error("Error getting proxy status:", error);
    statusText.textContent = 'Error';
    toggle.checked = false;
  }
}

toggle.addEventListener('change', async () => {
  try {
    statusText.textContent = toggle.checked ? 'Turning ON...' : 'Turning OFF...';
    toggle.disabled = true;
    const newState = await ipcRenderer.invoke('toggle-proxy');
    console.log(`UI: Toggle action finished. New state reported: ${newState}`);
    toggle.checked = newState;
    statusText.textContent = newState ? 'Proxy is ON' : 'Proxy is OFF';
  } catch (error) {
      console.error("Error toggling proxy:", error);
      statusText.textContent = 'Toggle Error';
      await updateUI();
  } finally {
      toggle.disabled = false;
  }
});

window.onload = updateUI;