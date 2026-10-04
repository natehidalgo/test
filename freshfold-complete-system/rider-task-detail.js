let currentTask = null;

document.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(window.location.search);
  const orderCode = params.get('order');

  if (!orderCode) {
    document.getElementById('order-eyebrow').textContent = 'No task specified';
    return;
  }

  loadTask(orderCode);

  document.getElementById('call-btn').addEventListener('click', function () {
    alert('This would call ' + (currentTask?.customer?.phone || 'the customer') + '.');
  });

  document.getElementById('mark-picked-up').addEventListener('click', async function () {
    if (!currentTask) return;
    const nextStatus = currentTask.type === 'pickup' ? 'picked_up' : 'delivered';
    await submitStatus(orderCode, nextStatus);
  });

  document.getElementById('report-issue').addEventListener('click', async function () {
    if (!currentTask) return;
    await submitStatus(orderCode, 'issue_reported');
  });
});

async function loadTask(orderCode) {
  try {
    currentTask = await apiGet(`/rider/tasks/${orderCode}`);
    renderTask(currentTask);
  } catch (err) {
    console.error('Could not load task:', err);
    document.getElementById('order-eyebrow').textContent = 'Task not found';
  }
}

function renderTask(task) {
  const typeLabel = task.type === 'pickup' ? 'Pickup' : 'Delivery';
  document.getElementById('order-eyebrow').textContent = `${task.order_id} \u00B7 ${typeLabel}`;
  document.getElementById('order-address').textContent = task.address;
  document.getElementById('details-heading').textContent = `${typeLabel} details`;

  document.getElementById('detail-address').textContent = task.address;
  document.getElementById('detail-window').textContent = task.pickup_schedule
    ? new Date(task.pickup_schedule).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '—';
  document.getElementById('detail-service').textContent = task.service || '—';
  document.getElementById('detail-load').textContent = task.load_estimate ? `${task.load_estimate} kg` : '—';
  document.getElementById('detail-instructions').textContent = task.remarks || 'None provided';

  if (task.customer) {
    document.getElementById('cust-name').textContent = task.customer.name || '—';
    document.getElementById('cust-phone').textContent = task.customer.phone || '';
    document.getElementById('cust-avatar').textContent = (task.customer.name || '??')
      .split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  }

  const markBtn = document.getElementById('mark-picked-up');
  markBtn.textContent = task.type === 'pickup' ? 'Mark as picked up' : 'Mark as delivered';

  if (task.status === 'delivered') {
    document.getElementById('order-badge').textContent = 'Completed';
    document.getElementById('order-badge').className = 'badge badge-done';
    markBtn.disabled = true;
    markBtn.textContent = 'Task completed';
  }
}

async function submitStatus(orderCode, statusUpdate) {
  const remarks = document.getElementById('remarks').value || null;
  const markBtn = document.getElementById('mark-picked-up');
  const reportBtn = document.getElementById('report-issue');

  markBtn.disabled = true;
  reportBtn.disabled = true;

  try {
    await apiPatch(`/rider/tasks/${orderCode}/status`, {
      status_update: statusUpdate,
      remarks,
    });

    if (statusUpdate === 'issue_reported') {
      alert('Issue reported. The admin has been notified.');
      reportBtn.disabled = false;
      markBtn.disabled = false;
    } else {
      document.getElementById('order-badge').textContent = 'Completed';
      document.getElementById('order-badge').className = 'badge badge-done';
      markBtn.textContent = 'Marked as ' + statusUpdate.replace('_', ' ');
    }
  } catch (err) {
    alert((err.data && err.data.message) || 'Could not update this task. Please try again.');
    markBtn.disabled = false;
    reportBtn.disabled = false;
  }
}
