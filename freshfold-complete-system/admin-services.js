let allServices = [];

document.addEventListener('DOMContentLoaded', function () {
  const overlay = document.getElementById('overlay');
  const modalTitle = document.getElementById('modal-title');
  const nameInput = document.getElementById('svc-name-input');
  const rateInput = document.getElementById('svc-rate-input');
  const cancelBtn = document.getElementById('cancel-modal');
  const saveBtn = document.getElementById('save-modal');
  const addBtn = document.getElementById('add-service');

  let editingService = null;

  function openModal(service) {
    editingService = service;
    modalTitle.textContent = service ? 'Edit service' : 'Add service';
    nameInput.value = service ? service.name : '';
    rateInput.value = service ? service.rate_per_kg : '';
    overlay.hidden = false;
    nameInput.focus();
  }
  function closeModal() { overlay.hidden = true; editingService = null; }

  addBtn.addEventListener('click', () => openModal(null));
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  saveBtn.addEventListener('click', async function () {
    const name = nameInput.value.trim();
    const rate = rateInput.value.trim();
    if (!name || !rate) return;

    saveBtn.disabled = true;
    try {
      if (editingService) {
        await apiPatch(`/admin/services/${editingService.id}`, { name, rate_per_kg: rate });
      } else {
        await apiPost('/admin/services', { name, rate_per_kg: rate });
      }
      closeModal();
      await loadServices();
    } catch (err) {
      alert((err.data && err.data.message) || 'Could not save this service.');
    } finally {
      saveBtn.disabled = false;
    }
  });

  window.openServiceModal = openModal;

  loadServices();
});

async function loadServices() {
  const tbody = document.getElementById('services-tbody');
  try {
    allServices = await apiGet('/admin/services');
    render();
  } catch (err) {
    console.error('Could not load services:', err);
    tbody.innerHTML = '<tr><td colspan="4">Could not load services right now.</td></tr>';
  }
}

function render() {
  const tbody = document.getElementById('services-tbody');
  tbody.innerHTML = '';

  allServices.forEach((svc) => {
    const badgeClass = svc.is_active ? 'badge-active' : 'badge-inactive';
    const badgeLabel = svc.is_active ? 'Active' : 'Inactive';
    const toggleLabel = svc.is_active ? 'Deactivate' : 'Activate';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="svc-name">${svc.name}</td>
      <td class="svc-rate">\u20B1${svc.rate_per_kg} / kg</td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      <td class="row-actions">
        <button class="btn-ghost small" data-action="edit">Edit</button>
        <button class="btn-ghost small" data-action="toggle">${toggleLabel}</button>
      </td>
    `;
    tr.querySelector('[data-action="edit"]').addEventListener('click', () => window.openServiceModal(svc));
    tr.querySelector('[data-action="toggle"]').addEventListener('click', async function () {
      try {
        await apiPatch(`/admin/services/${svc.id}`, { is_active: !svc.is_active });
        await loadServices();
      } catch (err) {
        alert((err.data && err.data.message) || 'Could not update this service.');
      }
    });
    tbody.appendChild(tr);
  });
}
