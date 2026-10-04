let allTasks = [];

document.addEventListener('DOMContentLoaded', function () {
  loadTasks();

  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      render(chip.dataset.filter);
    });
  });
});

async function loadTasks() {
  const list = document.getElementById('task-list');
  try {
    allTasks = await apiGet('/rider/tasks');
    renderStats();
    render('all');
  } catch (err) {
    console.error('Could not load tasks:', err);
    list.innerHTML = '<p class="empty-state">Could not load today\u2019s tasks right now.</p>';
  }
}

function renderStats() {
  const pickups = allTasks.filter((t) => t.type === 'pickup' && t.status !== 'delivered').length;
  const deliveries = allTasks.filter((t) => t.type === 'delivery' && t.status !== 'delivered').length;
  const completed = allTasks.filter((t) => t.status === 'delivered').length;

  document.getElementById('stat-pickups').textContent = pickups;
  document.getElementById('stat-deliveries').textContent = deliveries;
  document.getElementById('stat-completed').textContent = completed;
}

function render(filter) {
  const list = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  list.innerHTML = '';

  const filtered = allTasks.filter((t) => filter === 'all' || t.type === filter);

  if (!filtered.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  filtered.forEach((task) => {
    const isDone = task.status === 'delivered';
    const iconClass = isDone ? 'icon-done' : (task.type === 'pickup' ? 'icon-pickup' : 'icon-delivery');
    const icon = isDone ? '&#10003;' : (task.type === 'pickup' ? '&#8593;' : '&#8595;');
    const windowLabel = task.pickup_schedule
      ? new Date(task.pickup_schedule).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '—';

    const row = document.createElement(isDone ? 'div' : 'a');
    row.className = 'task-row' + (isDone ? ' done' : '');
    if (!isDone) row.href = `rider-task-detail.html?order=${task.order_id}`;
    row.innerHTML = `
      <span class="task-icon ${iconClass}">${icon}</span>
      <div class="task-main">
        <span class="eyebrow">${task.order_id} &middot; ${task.type === 'pickup' ? 'Pickup' : 'Delivery'}</span>
        <p class="task-address">${task.address}</p>
        <p class="task-window">${isDone ? 'Completed' : 'Window: ' + windowLabel}</p>
      </div>
      <span class="badge ${isDone ? 'badge-done' : 'badge-pending'}">${isDone ? 'Completed' : 'Pending'}</span>
    `;
    list.appendChild(row);
  });
}
