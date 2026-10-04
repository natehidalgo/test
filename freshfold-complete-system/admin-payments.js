let activeFilter = 'all';
let searchTimer = null;

document.addEventListener('DOMContentLoaded', function () {
  loadPayments();

  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      activeFilter = chip.dataset.filter;
      loadPayments();
    });
  });

  document.getElementById('search').addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadPayments, 300);
  });
});

async function loadPayments() {
  const tbody = document.getElementById('payments-tbody');
  const emptyState = document.getElementById('empty-state');
  const search = document.getElementById('search').value.trim();

  const params = new URLSearchParams();
  if (activeFilter !== 'all') params.set('status', activeFilter);
  if (search) params.set('search', search);

  try {
    const result = await apiGet(`/admin/payments?${params.toString()}`);
    const payments = result.payments.data || result.payments;

    document.getElementById('stat-collected').textContent = `\u20B1${Number(result.summary.collected_today || 0).toLocaleString()}`;
    document.getElementById('stat-paid').textContent = result.summary.paid_count;
    document.getElementById('stat-failed').textContent = result.summary.failed_count;
    document.getElementById('stat-refunded').textContent = `\u20B1${Number(result.summary.refunded_amount || 0).toLocaleString()}`;

    renderPayments(payments);
    emptyState.hidden = payments.length !== 0;
  } catch (err) {
    console.error('Could not load payments:', err);
    tbody.innerHTML = '<tr><td colspan="7">Could not load transactions right now.</td></tr>';
  }
}

function renderPayments(payments) {
  const tbody = document.getElementById('payments-tbody');
  const badgeMap = { paid: 'badge-paid', failed: 'badge-failed', refunded: 'badge-refunded', pending: 'badge-paid' };
  tbody.innerHTML = '';

  payments.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.reference_id}</td>
      <td>${(p.order && p.order.order_code) || '—'}</td>
      <td>${(p.order && p.order.customer && p.order.customer.name) || '—'}</td>
      <td>${p.payment_method || '—'}</td>
      <td>\u20B1${p.amount_paid}</td>
      <td><span class="badge ${badgeMap[p.payment_status] || 'badge-paid'}">${capitalize(p.payment_status)}</span></td>
      <td>${p.paid_at ? new Date(p.paid_at).toLocaleString() : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
