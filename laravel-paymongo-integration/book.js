document.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'cancelled') {
    const banner = document.createElement('p');
    banner.textContent = 'Payment was cancelled. You can review your order and try again below.';
    banner.style.cssText = 'background:#FBEAE4;color:#B4462E;padding:12px 16px;border-radius:10px;margin-bottom:18px;font-size:.9rem;font-weight:600;';
    document.querySelector('.page').insertBefore(banner, document.querySelector('.page-head'));
  }

  const serviceButtons = document.querySelectorAll('.service-option');
  const loadSlider = document.getElementById('load-slider');
  const loadDisplay = document.getElementById('load-display');
  const sumService = document.getElementById('sum-service');
  const sumLoad = document.getElementById('sum-load');
  const sumRate = document.getElementById('sum-rate');
  const sumTotal = document.getElementById('sum-total');
  const errorBox = document.getElementById('book-error');
  const submitBtn = document.getElementById('submit-booking');

  let currentServiceId = serviceButtons[0].dataset.id;
  let currentPrice = parseFloat(serviceButtons[0].dataset.price);
  let currentLoad = parseFloat(loadSlider.value);

  function updateSummary() {
    sumLoad.textContent = currentLoad.toFixed(1);
    sumRate.textContent = currentPrice.toFixed(0);
    sumTotal.textContent = (currentPrice * currentLoad).toFixed(2);
  }

  serviceButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      serviceButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      currentServiceId = btn.dataset.id;
      currentPrice = parseFloat(btn.dataset.price);
      sumService.textContent = btn.dataset.service;
      updateSummary();
    });
  });

  loadSlider.addEventListener('input', function () {
    currentLoad = parseFloat(loadSlider.value);
    loadDisplay.textContent = currentLoad.toFixed(1);
    updateSummary();
  });

  document.getElementById('booking-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    errorBox.style.display = 'none';

    const address = document.getElementById('address').value;
    const pickupDate = document.getElementById('pickup-date').value;
    const pickupTime = document.getElementById('pickup-time').value;
    const deliveryDate = document.getElementById('delivery-date').value;
    const notes = document.getElementById('notes').value;

    if (!address || !pickupDate || !pickupTime) {
      errorBox.textContent = 'Please fill in the pickup address, date, and time window.';
      errorBox.style.display = 'block';
      return;
    }

    // Combine date + the start of the selected window into an ISO datetime.
    const startTime = pickupTime.split(/[\u2013-]/)[0].trim(); // e.g. "8:00 AM"
    const pickupDateTime = new Date(`${pickupDate} ${startTime}`);

    const payload = {
      service_id: currentServiceId,
      pickup_address: address,
      pickup_schedule: pickupDateTime.toISOString(),
      delivery_schedule: deliveryDate ? new Date(deliveryDate).toISOString() : null,
      load_estimate: currentLoad,
      remarks: notes || null,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const booking = await apiPost('/bookings', payload);

      // Booking is created but unpaid — kick off a real PayMongo Checkout
      // Session and send the customer to PayMongo's hosted payment page.
      submitBtn.textContent = 'Redirecting to payment…';
      const paymentSession = await apiPost(`/orders/${booking.order_id}/pay`, {});
      window.location.href = paymentSession.checkout_url;
    } catch (err) {
      errorBox.textContent = (err.data && err.data.message) || 'Could not submit the booking. Please try again.';
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue to review';
    }
  });

  updateSummary();
});
