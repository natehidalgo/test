const STATUS_LABELS = {
  pending: 'Pending', confirmed: 'Confirmed', picked_up: 'Picked up',
  processing: 'Processing', out_for_delivery: 'Out for delivery',
  delivered: 'Delivered', payment_failed: 'Payment failed', cancelled: 'Cancelled',
};

let allOrders = [];

document.addEventListener('DOMContentLoaded', function () {
  loadOrders();

  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      renderOrders(chip.dataset.filter);
    });
  });
});

async function loadOrders() {
  const list = document.getElementById('order-list');
  try {
    allOrders = await apiGet('/orders');
    renderOrders('all');
  } catch (err) {
    console.error('Could not load orders:', err);
    list.innerHTML = '<p class="empty-state">Could not load your orders right now.</p>';
  }
}

function renderOrders(filter) {
  const list = document.getElementById('order-list');
  list.innerHTML = '';

  const filtered = allOrders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['delivered', 'cancelled'].includes(o.status);
    if (filter === 'completed') return o.status === 'delivered';
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = '<p class="empty-state">No orders match this filter yet.</p>';
    return;
  }

  filtered.forEach((order) => {
    const isActive = !['delivered', 'cancelled'].includes(order.status);
    const badgeClass = isActive ? 'badge-progress' : 'badge-done';
    const row = document.createElement('div');
    row.className = 'order-row';
    row.innerHTML = `
      <div class="order-main">
        <span class="eyebrow">${order.order_code}</span>
        <p class="order-service">${(order.service && order.service.name) || 'Service'} &middot; ${order.load_estimate || '—'} kg</p>
        <p class="order-date">Booked ${new Date(order.created_at).toLocaleDateString()}</p>
      </div>
      <span class="badge ${badgeClass}">${STATUS_LABELS[order.status] || order.status}</span>
      <span class="order-price">\u20B1${order.total_amount || '0.00'}</span>
      <a class="link-arrow" href="track.html?order=${order.order_code}">${isActive ? 'View' : 'View receipt'} &rarr;</a>
    `;
    list.appendChild(row);
  });
}
