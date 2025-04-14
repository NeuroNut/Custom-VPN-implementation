const { ipcRenderer } = require('electron');

// Correct the ID here!
const toggle = document.getElementById('powerToggle');
const statusText = document.getElementById('statusText');

async function updateUI() {
  try {
    statusText.textContent = 'Checking...'; // Indicate loading
    const isOn = await ipcRenderer.invoke('get-proxy-status');
    console.log(`UI Update: Proxy status from main process = ${isOn}`);
    toggle.checked = isOn;
    statusText.textContent = isOn ? 'Proxy is ON' : 'Proxy is OFF';
  } catch (error) {
    console.error("Error getting proxy status:", error);
    statusText.textContent = 'Error';
    toggle.checked = false; // Assume off on error
  }
}

toggle.addEventListener('change', async () => {
  try {
    statusText.textContent = toggle.checked ? 'Turning ON...' : 'Turning OFF...';
    toggle.disabled = true; // Disable toggle during operation
    const newState = await ipcRenderer.invoke('toggle-proxy');
    console.log(`UI: Toggle action finished. New state reported: ${newState}`);
    // Update UI based on the actual reported state AFTER the toggle attempt
    toggle.checked = newState;
    statusText.textContent = newState ? 'Proxy is ON' : 'Proxy is OFF';
  } catch (error) {
      console.error("Error toggling proxy:", error);
      statusText.textContent = 'Toggle Error';
      // Attempt to refresh UI state in case of error
      await updateUI();
  } finally {
      toggle.disabled = false; // Re-enable toggle
  }
});

// Initial UI state update when the window loads
window.onload = updateUI;