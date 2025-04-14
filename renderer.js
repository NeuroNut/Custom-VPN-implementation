const { ipcRenderer } = require('electron');

const toggle = document.getElementById('Proxy Toggle');
const statusText = document.getElementById('statusText');

async function updateUI() {
  const isOn = await ipcRenderer.invoke('get-proxy-status');
  toggle.checked = isOn;
  statusText.textContent = isOn ? 'Proxy is ON' : 'Proxy is OFF';
}

toggle.addEventListener('change', async () => {
  await ipcRenderer.invoke('toggle-proxy');
  updateUI();
});

window.onload = updateUI;
