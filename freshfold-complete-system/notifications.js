const EVENT_ICONS = {
  booking_created: { icon: '&#9989;', cls: 'icon-muted' },
  payment_confirmed: { icon: '&#8369;', cls: 'icon-success' },
  'payment.success': { icon: '&#8369;', cls: 'icon-success' },
  order_status_changed: { icon: '&#9203;', cls: 'icon-progress' },
  order_delivered: { icon: '&#128230;', cls: 'icon-success' },
};

let allNotifications = [];

document.addEventListener('DOMContentLoaded', function () {
  loadNotifications();

  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      render(chip.dataset.filter);
    });
  });

  document.getElementById('mark-all').addEventListener('click', async function () {
    const unread = allNotifications.filter((n) => n.status !== 'read');
    await Promise.all(unread.map((n) => apiPatch(`/notifications/${n.id}/read`).catch(() => {})));
    allNotifications.forEach((n) => { n.status = 'read'; });
    render(document.querySelector('.filter-chip.selected').dataset.filter);
  });
});

async function loadNotifications() {
  const container = document.getElementById('notif-container');
  try {
    allNotifications = await apiGet('/notifications');
    render('all');
  } catch (err) {
    console.error('Could not load notifications:', err);
    container.innerHTML = '<p class="empty-state">Could not load notifications right now.</p>';
  }
}

function render(filter) {
  const container = document.getElementById('notif-container');
  const emptyState = document.getElementById('empty-state');
  container.innerHTML = '';

  const filtered = allNotifications.filter((n) => filter === 'all' || n.status !== 'read');

  if (!filtered.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const today = new Date().toDateString();
  const todayItems = filtered.filter((n) => n.sent_at && new Date(n.sent_at).toDateString() === today);
  const earlierItems = filtered.filter((n) => !todayItems.includes(n));

  if (todayItems.length) container.appendChild(buildGroup('Today', todayItems));
  if (earlierItems.length) container.appendChild(buildGroup('Earlier', earlierItems));
}

function buildGroup(label, items) {
  const group = document.createElement('div');
  group.className = 'notif-group';
  group.innerHTML = `<p class="group-label">${label}</p><div class="notif-list"></div>`;
  const list = group.querySelector('.notif-list');

  items.forEach((n) => {
    const meta = EVENT_ICONS[n.event] || { icon: '&#128276;', cls: 'icon-muted' };
    const isUnread = n.status !== 'read';
    const row = document.createElement('div');
    row.className = 'notif-row' + (isUnread ? ' unread' : '');
    row.innerHTML = `
      <span class="notif-icon ${meta.cls}">${meta.icon}</span>
      <div class="notif-body">
        <p class="notif-title">${n.event.replace(/[._]/g, ' ')}</p>
        <p class="notif-desc">${(n.order && n.order.order_code) || ''}</p>
        <p class="notif-time">${n.sent_at ? new Date(n.sent_at).toLocaleString() : ''}</p>
      </div>
      ${isUnread ? '<span class="unread-dot" aria-hidden="true"></span>' : ''}
    `;
    row.addEventListener('click', async function () {
      if (!isUnread) return;
      await apiPatch(`/notifications/${n.id}/read`).catch(() => {});
      n.status = 'read';
      render(document.querySelector('.filter-chip.selected').dataset.filter);
    });
    list.appendChild(row);
  });

  return group;
}
