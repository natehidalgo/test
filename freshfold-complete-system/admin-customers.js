let allCustomers = [];
let activeFilter = 'all';
let searchTimer = null;

document.addEventListener('DOMContentLoaded', function () {
  loadCustomers();

  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      activeFilter = chip.dataset.filter;
      render();
    });
  });

  document.getElementById('search').addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 250);
  });

  document.getElementById('close-panel').addEventListener('click', function () {
    document.getElementById('overlay').hidden = true;
  });
  document.getElementById('overlay').addEventListener('click', function (e) {
    if (e.target === document.getElementById('overlay')) document.getElementById('overlay').hidden = true;
  });
});

async function loadCustomers() {
  const tbody = document.getElementById('customers-tbody');
  try {
    allCustomers = await apiGet('/admin/users?role=customer');
    render();
  } catch (err) {
    console.error('Could not load customers:', err);
    tbody.innerHTML = '<tr><td colspan="6">Could not load customers right now.</td></tr>';
  }
}

function render() {
  const tbody = document.getElementById('customers-tbody');
  const emptyState = document.getElementById('empty-state');
  const query = document.getElementById('search').value.trim().toLowerCase();

  const filtered = allCustomers.filter((c) => {
    const matchesStatus = activeFilter === 'all' || c.status === activeFilter;
    const matchesSearch = !query ||
      c.name.toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query) ||
      (c.phone || '').toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  emptyState.hidden = filtered.length !== 0;
  tbody.innerHTML = '';

  filtered.forEach((c) => {
    const badgeClass = c.status === 'active' ? 'badge-active' : 'badge-suspended';
    const badgeLabel = c.status === 'active' ? 'Active' : 'Suspended';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="customer-cell"><span class="avatar">${initials(c.name)}</span><span>${c.name}</span></div></td>
      <td><p class="contact-line">${c.email}</p><p class="contact-line muted">${c.phone || ''}</p></td>
      <td>${c.orders_count || 0}</td>
      <td>\u20B1${Number(c.total_spent || 0).toLocaleString()}</td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      <td><button class="btn-ghost small" data-id="${c.id}">View</button></td>
    `;
    tr.querySelector('button').addEventListener('click', () => openDetail(c));
    tbody.appendChild(tr);
  });
}

function openDetail(customer) {
  document.getElementById('detail-name').textContent = customer.name;
  document.getElementById('detail-email').textContent = customer.email;
  document.getElementById('detail-phone').textContent = customer.phone || '—';
  document.getElementById('detail-orders').textContent = customer.orders_count || 0;
  document.getElementById('detail-spent').textContent = `\u20B1${Number(customer.total_spent || 0).toLocaleString()}`;
  document.getElementById('detail-status').textContent = customer.status === 'active' ? 'Active' : 'Suspended';

  const toggleBtn = document.getElementById('toggle-status');
  toggleBtn.textContent = customer.status === 'active' ? 'Suspend account' : 'Reactivate account';
  toggleBtn.onclick = async function () {
    const newStatus = customer.status === 'active' ? 'suspended' : 'active';
    try {
      await apiPatch(`/admin/users/${customer.id}/status`, { status: newStatus });
      customer.status = newStatus;
      document.getElementById('detail-status').textContent = newStatus === 'active' ? 'Active' : 'Suspended';
      toggleBtn.textContent = newStatus === 'active' ? 'Suspend account' : 'Reactivate account';
      render();
    } catch (err) {
      alert((err.data && err.data.message) || 'Could not update this account.');
    }
  };

  document.getElementById('overlay').hidden = false;
}

function initials(name) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}
