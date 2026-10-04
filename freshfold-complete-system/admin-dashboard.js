document.addEventListener('DOMContentLoaded', function () {
  loadStats();
  loadAssignmentQueue();
  loadFlaggedRecords();

  const newBookingBtn = document.querySelector('.page-head .btn-primary');
  if (newBookingBtn) {
    newBookingBtn.addEventListener('click', function () {
      alert('This would open a manual booking form for a walk-in or phone order.');
    });
  }
});

async function loadStats() {
  try {
    const [ordersToday, pending, payments] = await Promise.all([
      apiGet('/admin/orders'),
      apiGet('/admin/orders?status=pending'),
      apiGet('/admin/payments'),
    ]);

    const todayList = (ordersToday.data || ordersToday);
    const todaysOrders = todayList.filter((o) => isToday(o.created_at));
    const revenueToday = todaysOrders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    document.getElementById('stat-orders-today').textContent = todaysOrders.length;
    document.getElementById('stat-revenue-today').textContent = `\u20B1${revenueToday.toLocaleString()}`;
    document.getElementById('stat-pending').textContent = (pending.data || pending).length;
    document.getElementById('stat-failed').textContent = payments.summary.failed_count;
  } catch (err) {
    console.error('Could not load dashboard stats:', err);
  }
}

async function loadAssignmentQueue() {
  const tbody = document.getElementById('assignment-tbody');
  try {
    const data = await apiGet('/admin/assignment');
    const orders = data.unassigned_orders.slice(0, 3);

    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="4">All orders are assigned.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    orders.forEach((order) => {
      const windowLabel = order.pickup_schedule
        ? new Date(order.pickup_schedule).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${order.order_code}</td>
        <td>${(order.service && order.service.name) || '—'}</td>
        <td>${windowLabel}</td>
        <td><button class="btn-ghost small">Assign</button></td>
      `;
      tr.querySelector('button').addEventListener('click', function () {
        window.location.href = 'admin-assignment.html';
      });
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Could not load assignment queue:', err);
    tbody.innerHTML = '<tr><td colspan="4">Could not load right now.</td></tr>';
  }
}

async function loadFlaggedRecords() {
  const list = document.getElementById('flag-list');
  try {
    const failedLogs = await apiGet('/admin/logs?status=failed');
    const logs = (failedLogs.data || failedLogs).slice(0, 3);

    if (!logs.length) {
      list.innerHTML = '<li><p class="flag-title">No flagged records right now.</p></li>';
      return;
    }

    list.innerHTML = '';
    logs.forEach((log) => {
      const dotClass = log.integration_type === 'Webhook' ? 'dot-danger' : 'dot-warn';
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="flag-dot ${dotClass}"></span>
        <div>
          <p class="flag-title">${log.event.replace(/[._]/g, ' ')}</p>
          <p class="flag-sub">${log.reference_id || ''} &middot; ${log.message || ''}</p>
        </div>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error('Could not load flagged records:', err);
    list.innerHTML = '<li><p class="flag-title">Could not load right now.</p></li>';
  }
}

function isToday(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}
