const STATUS_STEPS = ['pending', 'picked_up', 'processing', 'out_for_delivery', 'delivered'];
const STATUS_LABELS = {
  pending: 'Confirmed',
  confirmed: 'Confirmed',
  picked_up: 'Picked up',
  processing: 'Processing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  payment_failed: 'Payment failed',
};

document.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(window.location.search);
  const orderCode = params.get('order');

  if (!orderCode) {
    document.getElementById('order-code').textContent = 'No order specified';
    return;
  }

  if (params.get('payment') === 'success') {
    const banner = document.createElement('p');
    banner.textContent = 'Payment received — thank you! Your order is being confirmed.';
    banner.style.cssText = 'background:#E4F3ED;color:#2F8F6F;padding:12px 16px;border-radius:10px;margin-bottom:18px;font-size:.9rem;font-weight:600;';
    document.querySelector('.page').insertBefore(banner, document.querySelector('.page-head'));
  }

  loadOrder(orderCode);

  const contactRider = document.querySelector('#rider-card .btn-ghost');
  if (contactRider) {
    contactRider.addEventListener('click', function () {
      alert('This would open a chat with your assigned rider.');
    });
  }

  const contactSupport = document.querySelector('.help-card .btn-primary');
  if (contactSupport) {
    contactSupport.addEventListener('click', function () {
      alert('This would open a support conversation about order ' + orderCode + '.');
    });
  }
});

async function loadOrder(orderCode) {
  try {
    const order = await apiGet(`/orders/${orderCode}`);
    renderOrder(order);
  } catch (err) {
    console.error('Could not load order:', err);
    document.getElementById('order-code').textContent = 'Order not found';
  }
}

function renderOrder(order) {
  document.getElementById('order-code').textContent = `Order ${order.order_code}`;
  document.getElementById('order-service').textContent = (order.service && order.service.name) || 'Service';
  document.getElementById('order-badge').textContent = STATUS_LABELS[order.status] || order.status;

  document.getElementById('detail-service').textContent = (order.service && order.service.name) || '—';
  document.getElementById('detail-load').textContent = order.load_estimate ? `${order.load_estimate} kg` : '—';
  document.getElementById('detail-rate').textContent = order.service ? `\u20B1${order.service.rate_per_kg} / kg` : '—';
  document.getElementById('detail-address').textContent = order.pickup_address;
  document.getElementById('detail-total').textContent = order.total_amount ? `\u20B1${order.total_amount}` : '—';

  if (order.rider) {
    document.getElementById('rider-name').textContent = order.rider.name;
    document.getElementById('rider-sub').textContent = 'Assigned rider';
    document.getElementById('rider-avatar').textContent = order.rider.name
      .split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  }

  renderStepper(order);
}

function renderStepper(order) {
  const stepper = document.getElementById('order-stepper');
  const items = stepper.querySelectorAll('li');
  const currentIndex = STATUS_STEPS.indexOf(order.status);

  const historyByStatus = {};
  (order.status_history || []).forEach((h) => { historyByStatus[h.status] = h.updated_at; });

  items.forEach((li, i) => {
    li.classList.remove('done', 'current', 'upcoming');
    const timeEl = li.querySelector('.step-time');
    const statusKey = STATUS_STEPS[i];

    if (i < currentIndex) {
      li.classList.add('done');
      timeEl.textContent = historyByStatus[statusKey]
        ? new Date(historyByStatus[statusKey]).toLocaleString()
        : 'Completed';
    } else if (i === currentIndex) {
      li.classList.add('current');
      timeEl.textContent = historyByStatus[statusKey]
        ? 'Started ' + new Date(historyByStatus[statusKey]).toLocaleString()
        : 'In progress';
    } else {
      li.classList.add('upcoming');
      timeEl.textContent = 'Pending';
    }
  });
}
