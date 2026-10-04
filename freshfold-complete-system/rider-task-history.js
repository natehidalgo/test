let allHistory = [];

document.addEventListener('DOMContentLoaded', function () {
  loadHistory();

  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      render(chip.dataset.filter);
    });
  });
});

async function loadHistory() {
  const list = document.getElementById('task-list');
  try {
    allHistory = await apiGet('/rider/tasks/history');
    renderStats();
    render('all');
  } catch (err) {
    console.error('Could not load task history:', err);
    list.innerHTML = '<p class="empty-state">Could not load your task history right now.</p>';
  }
}

function renderStats() {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const completed = allHistory.filter((t) => t.status === 'delivered');
  const thisWeek = completed.filter((t) => new Date(t.delivery_schedule || t.pickup_schedule) >= weekAgo);
  const issues = allHistory.filter((t) => t.remarks && /issue|not home|complaint/i.test(t.remarks));

  document.getElementById('stat-total').textContent = completed.length;
  document.getElementById('stat-week').textContent = thisWeek.length;
  document.getElementById('stat-issues').textContent = issues.length;
}

function render(filter) {
  const list = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  list.innerHTML = '';

  const filtered = allHistory.filter((t) => {
    const hasIssue = t.remarks && /issue|not home|complaint/i.test(t.remarks);
    if (filter === 'all') return true;
    if (filter === 'issue') return hasIssue;
    return t.type === filter && !hasIssue;
  });

  if (!filtered.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  filtered.forEach((task) => {
    const hasIssue = task.remarks && /issue|not home|complaint/i.test(task.remarks);
    const iconClass = hasIssue ? 'icon-issue' : 'icon-done';
    const icon = hasIssue ? '&#9888;' : '&#10003;';
    const badgeClass = hasIssue ? 'badge-issue' : 'badge-done';
    const badgeText = hasIssue ? 'Issue reported' : 'Completed';
    const timeSource = task.delivery_schedule || task.pickup_schedule;

    const row = document.createElement('div');
    row.className = 'task-row';
    row.innerHTML = `
      <span class="task-icon ${iconClass}">${icon}</span>
      <div class="task-main">
        <span class="eyebrow">${task.order_id} &middot; ${task.type === 'pickup' ? 'Pickup' : 'Delivery'}</span>
        <p class="task-address">${task.address}</p>
        <p class="task-time">${timeSource ? new Date(timeSource).toLocaleString() : ''}${hasIssue ? ' &middot; ' + task.remarks : ''}</p>
      </div>
      <span class="badge ${badgeClass}">${badgeText}</span>
    `;
    list.appendChild(row);
  });
}
