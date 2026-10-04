let allStaff = [];
let activeFilter = 'all';
let searchTimer = null;

document.addEventListener('DOMContentLoaded', function () {
  loadStaff();

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

  document.getElementById('add-team-member-btn')?.addEventListener('click', function () {
    alert('This would open a form to add a new staff member or rider.');
  });
});

async function loadStaff() {
  const tbody = document.getElementById('staff-tbody');
  try {
    const [riders, staff] = await Promise.all([
      apiGet('/admin/users?role=rider'),
      apiGet('/admin/users?role=staff'),
    ]);
    allStaff = [...riders, ...staff];
    render();
  } catch (err) {
    console.error('Could not load team members:', err);
    tbody.innerHTML = '<tr><td colspan="6">Could not load team members right now.</td></tr>';
  }
}

function render() {
  const tbody = document.getElementById('staff-tbody');
  const emptyState = document.getElementById('empty-state');
  const query = document.getElementById('search').value.trim().toLowerCase();

  const filtered = allStaff.filter((p) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'suspended' && p.status === 'suspended') ||
      (activeFilter !== 'suspended' && p.role === activeFilter);
    const matchesSearch = !query ||
      p.name.toLowerCase().includes(query) ||
      (p.phone || '').toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  emptyState.hidden = filtered.length !== 0;
  tbody.innerHTML = '';

  filtered.forEach((p) => {
    const { label, cls } = statusMeta(p);
    const roleLabel = p.role === 'rider' ? 'Rider' : 'Facility staff';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="person-cell"><span class="avatar">${initials(p.name)}</span><span>${p.name}</span></div></td>
      <td>${roleLabel}</td>
      <td>${p.phone || '—'}</td>
      <td>${p.active_tasks_count || 0}</td>
      <td><span class="badge ${cls}">${label}</span></td>
      <td><button class="btn-ghost small">View</button></td>
    `;
    tr.querySelector('button').addEventListener('click', () => openDetail(p));
    tbody.appendChild(tr);
  });
}

function statusMeta(p) {
  if (p.status === 'suspended') return { label: 'Suspended', cls: 'badge-suspended' };
  if ((p.active_tasks_count || 0) > 0) return { label: 'On shift', cls: 'badge-active' };
  return { label: 'Available', cls: 'badge-idle' };
}

function openDetail(person) {
  const { label } = statusMeta(person);
  document.getElementById('detail-name').textContent = person.name;
  document.getElementById('detail-role').textContent = person.role === 'rider' ? 'Rider' : 'Facility staff';
  document.getElementById('detail-contact').textContent = person.phone || '—';
  document.getElementById('detail-tasks').textContent = person.active_tasks_count || 0;
  document.getElementById('detail-status').textContent = label;

  const toggleBtn = document.getElementById('toggle-status');
  toggleBtn.textContent = person.status === 'suspended' ? 'Reactivate account' : 'Suspend account';
  toggleBtn.onclick = async function () {
    const newStatus = person.status === 'suspended' ? 'active' : 'suspended';
    try {
      await apiPatch(`/admin/users/${person.id}/status`, { status: newStatus });
      person.status = newStatus;
      const meta = statusMeta(person);
      document.getElementById('detail-status').textContent = meta.label;
      toggleBtn.textContent = newStatus === 'suspended' ? 'Reactivate account' : 'Suspend account';
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
