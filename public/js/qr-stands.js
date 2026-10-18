// Acrylic QR Stand Generator Logic
document.addEventListener('DOMContentLoaded', async () => {
  let serverInfo = { localIp: 'localhost', port: 3000, localBaseUrl: 'http://localhost:3000', browserBaseUrl: window.location.origin };
  let tables = [];
  let selectedTableId = 3; // Default to Table 3 matching illustration
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  let useNetworkIp = isLocalHost;

  const tableChipsContainer = document.getElementById('tableChipsContainer');
  const qrImageEl = document.getElementById('standQrImg');
  const standTableNumEl = document.getElementById('standTableNum');
  const targetUrlTextEl = document.getElementById('targetUrlText');
  const networkIpToggle = document.getElementById('networkIpToggle');
  const hostInfoBadge = document.getElementById('hostInfoBadge');

  if (networkIpToggle) {
    networkIpToggle.checked = useNetworkIp;
  }

  // Fetch server info
  try {
    const res = await fetch('/api/info');
    serverInfo = await res.json();
    if (hostInfoBadge) {
      hostInfoBadge.textContent = `Wi-Fi IP: ${serverInfo.localIp}:${serverInfo.port}`;
    }
  } catch (err) {
    console.error('Failed to load server info', err);
  }

  // Network IP toggle
  if (networkIpToggle) {
    networkIpToggle.addEventListener('change', (e) => {
      useNetworkIp = e.target.checked;
      loadQrForTable(selectedTableId);
    });
  }

  // Fetch Tables
  try {
    const res = await fetch('/api/tables');
    tables = await res.json();
    renderTableChips();
    loadQrForTable(selectedTableId);
  } catch (err) {
    console.error('Failed to load tables', err);
  }

  function renderTableChips() {
    if (!tableChipsContainer) return;
    tableChipsContainer.innerHTML = tables.map(table => {
      const isActive = table.id === selectedTableId;
      return `
        <button class="table-select-chip ${isActive ? 'active' : ''}" onclick="selectStandTable(${table.id})">
          <div>${table.name}</div>
          <span style="font-size:10px; opacity:0.8;">${table.capacity} Seats</span>
        </button>
      `;
    }).join('');
  }

  window.selectStandTable = function(tableId) {
    selectedTableId = tableId;
    renderTableChips();
    loadQrForTable(tableId);
  };

  async function loadQrForTable(tableId) {
    const table = tables.find(t => t.id === tableId) || { id: tableId, name: `Table ${tableId}` };
    
    if (standTableNumEl) {
      standTableNumEl.textContent = table.name.toUpperCase();
    }

    const hostToUse = useNetworkIp && serverInfo.localIp !== 'localhost' 
      ? `${serverInfo.localIp}:${serverInfo.port}` 
      : window.location.host;

    try {
      const res = await fetch(`/api/qrcode/${tableId}?host=${encodeURIComponent(hostToUse)}`);
      const data = await res.json();

      if (qrImageEl) {
        qrImageEl.src = data.qrDataUrl;
      }
      if (targetUrlTextEl) {
        targetUrlTextEl.textContent = data.targetUrl;
        targetUrlTextEl.href = data.targetUrl;
      }
      currentStandTargetUrl = data.targetUrl;
    } catch (err) {
      console.error('Failed to generate QR:', err);
    }
  }

  let currentStandTargetUrl = '';

  // Action buttons
  window.printCurrentStand = function() {
    window.print();
  };

  window.simulateScan = function() {
    if (currentStandTargetUrl) {
      window.open(currentStandTargetUrl, '_blank');
    } else {
      window.open(`/?table=${selectedTableId}`, '_blank');
    }
  };
});
