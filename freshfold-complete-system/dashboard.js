const STATUS_STEPS = ['pending', 'picked_up', 'processing', 'out_for_delivery', 'delivered'];
const STATUS_LABELS = {
  pending: 'Booked',
  confirmed: 'Booked',
  picked_up: 'Picked up',
  processing: 'Processing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

document.addEventListener('DOMContentLoaded', function () {
  const user = getCurrentUser();
  if (user) {
    document.getElementById('greeting-name').textContent = `Good day, ${user.name.split(' ')[0]}`;
  }

  document.querySelector('.greeting .btn-primary').addEventListener('click', function () {
    window.location.href = 'book.html';
  });

  loadDashboard();
});

async function loadDashboard() {
  try {
    const orders = await apiGet('/orders');
    renderStats(orders);
    renderActiveOrder(orders);
  } catch (err) {
    console.error('Falling back to placeholder dashboard data:', err);
    document.getElementById('greeting-sub').textContent =
      'Could not load your orders right now — showing placeholder data.';
  }

  try {
    const notifications = await apiGet('/notifications');
    renderActivity(notifications);
  } catch (err) {
    console.error('Could not load recent activity:', err);
  }
}

function renderStats(orders) {
  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const completedThisMonth = orders.filter((o) => {
    if (o.status !== 'delivered') return false;
    const updated = new Date(o.updated_at);
    const now = new Date();
    return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear();
  });
  const spentThisMonth = completedThisMonth.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  document.getElementById('stat-active').textContent = active.length;
  document.getElementById('stat-completed').textContent = completedThisMonth.length;
  document.getElementById('stat-spent').textContent = `₱${spentThisMonth.toLocaleString()}`;
  document.getElementById('greeting-sub').textContent =
    `You have ${active.length} order${active.length === 1 ? '' : 's'} on the way and ` +
    `${completedThisMonth.length} completed this month.`;
}

function renderActiveOrder(orders) {
  const order = orders.find((o) => !['delivered', 'cancelled'].includes(o.status));
  const card = document.getElementById('order-card');

  if (!order) {
    document.getElementById('order-code').textContent = 'No active order';
    document.getElementById('order-service').textContent = 'Book a service to get started';
    document.getElementById('order-badge').style.display = 'none';
    document.getElementById('track-link').style.display = 'none';
    return;
  }

  document.getElementById('order-code').textContent = `Order ${order.order_code}`;
  document.getElementById('order-service').textContent = (order.service && order.service.name) || 'Service';
  document.getElementById('order-badge').textContent = STATUS_LABELS[order.status] || order.status;
  document.getElementById('order-rider').textContent = (order.rider && order.rider.name) || 'Not yet assigned';
  document.getElementById('order-delivery').textContent = order.delivery_schedule
    ? new Date(order.delivery_schedule).toLocaleString()
    : 'To be scheduled';
  document.getElementById('track-link').href = `track.html?order=${order.order_code}`;

  const currentIndex = STATUS_STEPS.indexOf(order.status);
  const stepperItems = card.querySelectorAll('.stepper li');
  stepperItems.forEach((li, i) => {
    li.classList.remove('done', 'current');
    if (i < currentIndex) li.classList.add('done');
    if (i === currentIndex) li.classList.add('current');
  });
}

function renderActivity(notifications) {
  const list = document.getElementById('activity-list');
  list.innerHTML = '';

  if (!notifications.length) {
    list.innerHTML = '<li><p class="activity-title">No recent activity yet.</p></li>';
    return;
  }

  notifications.slice(0, 6).forEach((n) => {
    const li = document.createElement('li');
    const dotClass = n.status === 'failed' ? 'dot-muted' : 'dot-success';
    li.innerHTML = `
      <span class="activity-dot ${dotClass}"></span>
      <div>
        <p class="activity-title">${n.event.replace(/_/g, ' ')}</p>
        <p class="activity-time">${n.sent_at ? new Date(n.sent_at).toLocaleString() : ''}</p>
      </div>
    `;
    list.appendChild(li);
  });
}
