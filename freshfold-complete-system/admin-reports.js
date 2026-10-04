const RANGE_MAP = { 'Last 7 days': '7', 'Last 30 days': '30', 'This month': 'month' };

document.addEventListener('DOMContentLoaded', function () {
  loadReport('7');

  document.getElementById('range-select').addEventListener('change', function (e) {
    loadReport(RANGE_MAP[e.target.value] || '7');
  });

  document.getElementById('export-btn').addEventListener('click', function () {
    alert('This would export the current report range as a CSV file.');
  });
});

async function loadReport(range) {
  try {
    const data = await apiGet(`/admin/reports?range=${range}`);
    renderSummary(data.summary);
    renderChart(data.revenue_by_day);
    renderServiceBreakdown(data.revenue_by_service);
    renderTopCustomers(data.top_customers);
  } catch (err) {
    console.error('Could not load report:', err);
  }
}

function renderSummary(summary) {
  document.getElementById('stat-orders').textContent = summary.total_orders;
  document.getElementById('stat-revenue').textContent = `\u20B1${Number(summary.total_revenue).toLocaleString()}`;
  document.getElementById('stat-avg').textContent = `\u20B1${Number(summary.avg_order_value).toLocaleString()}`;
  document.getElementById('stat-completed').textContent = summary.completed_orders;
  document.getElementById('stat-completion-rate').textContent = `${summary.completion_rate}% completion rate`;
}

function renderChart(revenueByDay) {
  const chart = document.getElementById('bar-chart');
  chart.innerHTML = '';

  if (!revenueByDay.length) {
    chart.innerHTML = '<span class="bar-label">No revenue in this range yet.</span>';
    return;
  }

  const max = Math.max(...revenueByDay.map((d) => Number(d.revenue)), 1);

  revenueByDay.forEach((d, i) => {
    const heightPct = Math.round((Number(d.revenue) / max) * 100);
    const label = new Date(d.day).toLocaleDateString(undefined, { weekday: 'short' });
    const col = document.createElement('div');
    col.className = 'bar-col';
    col.innerHTML = `<div class="bar${i === revenueByDay.length - 1 ? ' highlight' : ''}" style="--h:${heightPct}%"></div><span class="bar-label">${label}</span>`;
    chart.appendChild(col);
  });
}

function renderServiceBreakdown(revenueByService) {
  const list = document.getElementById('service-breakdown');
  list.innerHTML = '';

  if (!revenueByService.length) {
    list.innerHTML = '<li><div class="svc-row"><span>No data in this range yet.</span></div></li>';
    return;
  }

  const max = Math.max(...revenueByService.map((s) => Number(s.revenue)), 1);

  revenueByService.forEach((s) => {
    const pct = Math.round((Number(s.revenue) / max) * 100);
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="svc-row"><span>${s.name}</span><span>\u20B1${Number(s.revenue).toLocaleString()}</span></div>
      <div class="progress-track"><div class="progress-fill" style="--w:${pct}%"></div></div>
    `;
    list.appendChild(li);
  });
}

function renderTopCustomers(topCustomers) {
  const tbody = document.getElementById('top-customers-tbody');
  tbody.innerHTML = '';

  if (!topCustomers.length) {
    tbody.innerHTML = '<tr><td colspan="3">No orders in this range yet.</td></tr>';
    return;
  }

  topCustomers.forEach((c) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.name}</td><td>${c.orders_count}</td><td>\u20B1${Number(c.total_spent).toLocaleString()}</td>`;
    tbody.appendChild(tr);
  });
}
