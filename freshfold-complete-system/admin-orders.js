const STATUS_MAP = {
  pending:            { label: 'Pending',            cls: 'badge-pending'  },
  confirmed:          { label: 'Confirmed',           cls: 'badge-progress' },
  picked_up:          { label: 'Picked up',           cls: 'badge-progress' },
  processing:         { label: 'Processing',          cls: 'badge-progress' },
  out_for_delivery:   { label: 'Out for delivery',    cls: 'badge-delivery' },
  delivered:          { label: 'Delivered',           cls: 'badge-done'     },
  payment_failed:     { label: 'Payment failed',      cls: 'badge-failed'   },
  cancelled:          { label: 'Cancelled',           cls: 'badge-failed'   },
};

// Maps the UI's filter chip values to actual backend status values.
const FILTER_TO_STATUS = {
  all: 'all',
  pending: 'pending',
  processing: 'processing',
  delivery: 'out_for_delivery',
  delivered: 'delivered',
  failed: 'payment_failed',
};

let activeFilter = 'all';
let searchTimer = null;

document.addEventListener('DOMContentLoaded', function () {
  loadOrders();

  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      activeFilter = chip.dataset.filter;
      loadOrders();
    });
  });

  document.getElementById('search').addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadOrders, 300);
  });
});

async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  const emptyState = document.getElementById('empty-state');
  const search = document.getElementById('search').value.trim();
  const status = FILTER_TO_STATUS[activeFilter] || 'all';

  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (search) params.set('search', search);

  try {
    const result = await apiGet(`/admin/orders?${params.toString()}`);
    const orders = result.data || result;
    renderOrders(orders);
    emptyState.hidden = orders.length !== 0;
  } catch (err) {
    console.error('Could not load orders:', err);
    tbody.innerHTML = '<tr><td colspan="7">Could not load orders right now.</td></tr>';
  }
}

function renderOrders(orders) {
  const tbody = document.getElementById('orders-tbody');
  tbody.innerHTML = '';

  orders.forEach((order) => {
    const meta = STATUS_MAP[order.status] || { label: order.status, cls: 'badge-pending' };
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${order.order_code}</td>
      <td>${(order.customer && order.customer.name) || '—'}</td>
      <td>${(order.service && order.service.name) || '—'}</td>
      <td>${(order.rider && order.rider.name) || '—'}</td>
      <td><span class="badge ${meta.cls}">${meta.label}</span></td>
      <td>\u20B1${order.total_amount || '0.00'}</td>
      <td><button class="btn-ghost small" data-order="${order.order_code}">View</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-ghost').forEach((btn) => {
    btn.addEventListener('click', function () {
      // No dedicated order-detail admin page has been built yet — swap this
      // for a real link once one exists (e.g. admin-order-detail.html).
      alert(`This would open full detail for ${btn.dataset.order}.`);
    });
  });
}
