let riders = [];

document.addEventListener('DOMContentLoaded', function () {
  loadAssignmentData();
});

async function loadAssignmentData() {
  const listEl = document.getElementById('assign-list');
  const riderListEl = document.getElementById('rider-list');

  try {
    const data = await apiGet('/admin/assignment');
    riders = data.riders;
    renderRiders(riders);
    renderUnassignedOrders(data.unassigned_orders);
  } catch (err) {
    console.error('Could not load assignment data:', err);
    listEl.innerHTML = '<h2 class="section-title">Unassigned orders</h2><p class="empty-state">Could not load right now.</p>';
    riderListEl.innerHTML = '<p class="rider-name">Could not load.</p>';
  }
}

function renderRiders(riders) {
  const riderListEl = document.getElementById('rider-list');
  riderListEl.innerHTML = '';

  riders.forEach((rider) => {
    const isFree = rider.active_tasks_count === 0;
    const row = document.createElement('div');
    row.className = 'rider-row';
    row.innerHTML = `
      <span class="avatar">${initials(rider.name)}</span>
      <div class="rider-info">
        <p class="rider-name">${rider.name}</p>
        <p class="rider-sub">${isFree ? 'Available' : rider.active_tasks_count + ' active task' + (rider.active_tasks_count === 1 ? '' : 's')}</p>
      </div>
      <span class="status-dot ${isFree ? 'dot-free' : 'dot-busy'}"></span>
    `;
    riderListEl.appendChild(row);
  });
}

function renderUnassignedOrders(orders) {
  const listEl = document.getElementById('assign-list');
  listEl.innerHTML = '<h2 class="section-title">Unassigned orders</h2>';

  if (!orders.length) {
    listEl.innerHTML += '<p class="empty-state">All orders have been assigned.</p>';
    return;
  }

  const riderOptions = riders
    .map((r) => `<option value="${r.id}">${r.name} — ${r.active_tasks_count === 0 ? 'Available' : r.active_tasks_count + ' active tasks'}</option>`)
    .join('');

  orders.forEach((order) => {
    const windowLabel = order.pickup_schedule
      ? new Date(order.pickup_schedule).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '—';

    const card = document.createElement('div');
    card.className = 'assign-card';
    card.innerHTML = `
      <div class="assign-main">
        <span class="eyebrow">${order.order_code}</span>
        <p class="assign-line">${(order.service && order.service.name) || 'Service'} &middot; ${order.pickup_address}</p>
        <p class="assign-line muted">Pickup window: ${windowLabel}</p>
      </div>
      <div class="assign-action">
        <select class="rider-select">
          <option value="">Select a rider</option>
          ${riderOptions}
        </select>
        <button class="btn-primary small" type="button">Assign</button>
      </div>
    `;

    const select = card.querySelector('.rider-select');
    const btn = card.querySelector('.btn-primary');

    btn.addEventListener('click', async function () {
      if (!select.value) { select.focus(); return; }
      btn.disabled = true;
      btn.textContent = 'Assigning…';

      try {
        await apiPatch(`/admin/orders/${order.order_code}/assign`, { rider_id: select.value });
        card.classList.add('assigned');
        const riderName = select.options[select.selectedIndex].text.split(' — ')[0];
        btn.textContent = 'Assigned to ' + riderName;
        select.disabled = true;
        loadAssignmentData(); // refresh rider workload counts
      } catch (err) {
        alert((err.data && err.data.message) || 'Could not assign this order.');
        btn.disabled = false;
        btn.textContent = 'Assign';
      }
    });

    listEl.appendChild(card);
  });
}

function initials(name) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}
