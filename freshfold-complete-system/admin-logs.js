let activeFilter = 'all';
let searchTimer = null;

document.addEventListener('DOMContentLoaded', function () {
  loadLogs();

  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      activeFilter = chip.dataset.filter;
      loadLogs();
    });
  });

  document.getElementById('search').addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadLogs, 300);
  });
});

async function loadLogs() {
  const tbody = document.getElementById('logs-tbody');
  const emptyState = document.getElementById('empty-state');
  const search = document.getElementById('search').value.trim();

  const params = new URLSearchParams();
  if (activeFilter === 'success' || activeFilter === 'failed') {
    params.set('status', activeFilter);
  } else if (activeFilter === 'API' || activeFilter === 'Webhook' || activeFilter === 'Messaging') {
    params.set('type', activeFilter);
  }
  if (search) params.set('search', search);

  try {
    const result = await apiGet(`/admin/logs?${params.toString()}`);
    const logs = result.data || result;
    renderLogs(logs);
    emptyState.hidden = logs.length !== 0;
  } catch (err) {
    console.error('Could not load logs:', err);
    tbody.innerHTML = '<tr><td colspan="8">Could not load logs right now.</td></tr>';
  }
}

function renderLogs(logs) {
  const tbody = document.getElementById('logs-tbody');
  tbody.innerHTML = '';

  logs.forEach((log) => {
    const badgeClass = log.status === 'success' ? 'badge-success' : 'badge-failed';
    const badgeLabel = log.status === 'success' ? 'Success' : 'Failed';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${log.log_code}</td>
      <td>${new Date(log.created_at).toLocaleString()}</td>
      <td>${log.integration_type}</td>
      <td>${log.source}</td>
      <td>${log.event}</td>
      <td>${log.reference_id || '—'}</td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      <td>${log.message || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}
